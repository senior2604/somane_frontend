// src/features/comptabilité/pages/PiecesComptables/Create.jsx
// VERSION 15.2 — CORRECTION TOTALE DES ERREURS JSX

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  FiPlus, FiTrash2, FiCheck, FiPaperclip, FiUpload,
  FiCopy, FiRotateCcw, FiX, FiAlertCircle, FiBriefcase,
  FiUploadCloud, FiSettings, FiInfo, FiZap, FiBookOpen, FiClock, FiPrinter, FiDownload
} from 'react-icons/fi';
import { useEntity } from '../../../../context/EntityContext';
import { piecesService } from "../../services";
import UnifiedFormPage from '../../../../components/UnifiedFormPage';

// =============================================================================
// IMPORT DU HELPER POUR LA LOGIQUE DYNAMIQUE
// =============================================================================
import { 
  getAccountNature as getAccountNatureDynamic,
  resolveCounterpartAccount,
  suggestJournalByNature
} from '../../services/accountHelper';

// =============================================================================
// CONSTANTES DE FALLBACK
// =============================================================================
const ACCOUNT_NATURE_FALLBACK = { charge: ['6'], produit: ['7'], tiers: ['4'] };
const JOURNAL_CODE_BY_NATURE_FALLBACK = { charge: 'ACH', produit: 'VEN', default: 'OD' };

const normalizeMoveState = (state) => {
  const value = String(state || 'draft').trim().toLowerCase();
  if (['posted', 'post', 'valid', 'valide', 'validee', 'validated'].includes(value) || value.includes('comptabilis')) return 'posted';
  if (['cancel', 'cancelled', 'canceled', 'annule', 'annulee'].includes(value)) return 'cancel';
  if (['deleted', 'delete', 'supprime', 'supprimee'].includes(value)) return 'deleted';
  return 'draft';
};

// =============================================================================
// TOOLTIP
// =============================================================================
const Tooltip = ({ children, text, position = 'bottom' }) => {
  const [show, setShow] = useState(false);
  return (
    <div className="relative inline-block">
      <div onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>{children}</div>
      {show && (
        <div className={`absolute z-[35] px-2 py-1 text-xs text-white bg-gray-800 rounded whitespace-nowrap ${
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

// =============================================================================
// AUTOCOMPLETE INPUT
// =============================================================================
const AutocompleteInput = ({ value, selectedId, onChange, onSelect, options, getOptionLabel, placeholder = "", className = "", disabled = false, required = false, onKeyDown, onCreateOption, createOptionLabel = "Créer", title = "", displayValue = "" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value || '');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);
  const [dropdownStyle, setDropdownStyle] = useState({});

  useEffect(() => { if (value !== undefined) setInputValue(value); }, [value]);
  const normalizedInput = inputValue.trim().toLowerCase();
  const filteredOptions = options.filter(option => getOptionLabel(option).toLowerCase().includes(normalizedInput));
  const canCreate = !!onCreateOption && inputValue.trim() && !filteredOptions.some(option => getOptionLabel(option).trim().toLowerCase() === normalizedInput);

  const updateDropdownPosition = useCallback(() => {
    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      // The form header is the upper stacking layer. Keep suggestions above
      // the table but below the header actions so they never cover the menu.
      setDropdownStyle({ position: 'fixed', top: `${rect.bottom}px`, left: `${rect.left}px`, width: `${rect.width}px`, zIndex: 30, maxHeight: '220px', overflowY: 'auto' });
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      updateDropdownPosition();
      const handleScroll = () => updateDropdownPosition();
      const handleResize = () => updateDropdownPosition();
      window.addEventListener('scroll', handleScroll, true);
      window.addEventListener('resize', handleResize);
      return () => { window.removeEventListener('scroll', handleScroll, true); window.removeEventListener('resize', handleResize); };
    }
  }, [isOpen, updateDropdownPosition]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target) && inputRef.current && !inputRef.current.contains(e.target)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e) => { if (disabled) return; setInputValue(e.target.value); setIsOpen(true); setHighlightedIndex(0); onChange(e.target.value); if (selectedId) onSelect(null, ''); };
  const handleSelectOption = (option) => { if (disabled) return; const label = getOptionLabel(option); setInputValue(label); setIsOpen(false); onSelect(option.id, label); };
  const handleCreateOption = () => { if (disabled || !canCreate) return; const query = inputValue.trim(); setIsOpen(false); onCreateOption(query); };
  const handleKeyDown = (e) => {
    if (disabled) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setIsOpen(true); setHighlightedIndex(prev => prev < filteredOptions.length - 1 ? prev + 1 : prev); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlightedIndex(prev => prev > 0 ? prev - 1 : 0); }
    else if (e.key === 'Enter' && isOpen && filteredOptions.length > 0) { e.preventDefault(); handleSelectOption(filteredOptions[highlightedIndex]); }
    else if (e.key === 'Enter' && isOpen && filteredOptions.length === 0 && canCreate) { e.preventDefault(); handleCreateOption(); }
    else if (e.key === 'Escape') setIsOpen(false);
    else if (e.key === 'Tab') {
      if (isOpen && filteredOptions.length > 0) {
        e.preventDefault();
        handleSelectOption(filteredOptions[highlightedIndex]);
        setTimeout(() => {
          const nextInput = inputRef.current?.closest('td')?.nextElementSibling?.querySelector('input:not([disabled]), select:not([disabled]), textarea:not([disabled])') ||
                            inputRef.current?.closest('tr')?.nextElementSibling?.querySelector('input:not([disabled]), select:not([disabled]), textarea:not([disabled])');
          if (nextInput) nextInput.focus();
        }, 50);
      }
    }
    if (onKeyDown) onKeyDown(e);
  };

  useEffect(() => { if (isOpen && dropdownRef.current && filteredOptions.length > 0) { const el = dropdownRef.current.children[highlightedIndex]; if (el) el.scrollIntoView({ block: 'nearest' }); } }, [highlightedIndex, isOpen, filteredOptions.length]);

  return (
    <>
      <input ref={inputRef} type="text" value={!isOpen && displayValue ? displayValue : inputValue} title={title || inputValue || placeholder} onChange={handleInputChange} onKeyDown={handleKeyDown} onFocus={() => { if(!disabled) { setIsOpen(true); updateDropdownPosition(); } }} placeholder={placeholder} disabled={disabled} required={required} className={`w-full px-2 py-1 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none ${className} ${disabled ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : ''}`} style={{ height: '26px', border: 'none', backgroundColor: 'transparent' }} autoComplete="off" />
      {isOpen && !disabled && (filteredOptions.length > 0 || canCreate) && (
        <div ref={dropdownRef} className="bg-white border border-gray-300 shadow-lg" style={dropdownStyle}>
          {filteredOptions.map((option, index) => (
            <div key={option.id} className={`px-2 py-1 text-xs cursor-pointer ${index === highlightedIndex ? 'bg-blue-100 text-blue-700' : 'hover:bg-blue-50'} ${option.id === selectedId ? 'bg-blue-50' : ''}`} onClick={() => handleSelectOption(option)} onMouseEnter={() => setHighlightedIndex(index)}>{getOptionLabel(option)}</div>
          ))}
          {canCreate && (
            <button type="button" onClick={handleCreateOption} className="flex w-full items-center gap-1 border-t border-gray-200 px-2 py-1.5 text-left text-xs font-medium text-purple-700 hover:bg-purple-50">
              <span>+</span><span>{createOptionLabel} "{inputValue.trim()}"</span>
            </button>
          )}
        </div>
      )}
    </>
  );
};
// =============================================================================
// AMOUNT INPUT
// =============================================================================
const AmountInput = ({ value, onChange, placeholder = "0", className = "", disabled = false, onKeyDown }) => {
  const [displayValue, setDisplayValue] = useState('');
  const formatNumberWithSpace = (num) => {
    if (num === '' || num === null || num === undefined) return '';
    const number = typeof num === 'string' ? parseFloat(num.replace(/\s/g, '')) : num;
    if (isNaN(number)) return '';
    return Math.round(number).toLocaleString('fr-FR');
  };
  useEffect(() => { if (value !== '' && value !== null && value !== undefined) setDisplayValue(formatNumberWithSpace(value)); else setDisplayValue(''); }, [value]);
  const handleChange = (e) => {
    let rawValue = e.target.value;
    let cleanValue = rawValue.replace(/\s/g, '').replace(/[^\d,.-]/g, '').replace(',', '.');
    const numberMatch = cleanValue.match(/[\d.-]+/);
    if (numberMatch) { const number = parseFloat(numberMatch[0]); if (!isNaN(number)) { setDisplayValue(formatNumberWithSpace(number)); onChange(number); return; } }
    setDisplayValue(''); onChange('');
  };
  return (
    <input type="text" value={displayValue} title={displayValue || placeholder} onChange={handleChange} onBlur={() => { if (value !== '' && value !== null && value !== undefined) setDisplayValue(formatNumberWithSpace(value)); }} onFocus={(e) => { if (value !== '' && value !== null && value !== undefined) e.target.value = value.toString(); }} onKeyDown={onKeyDown} disabled={disabled} className={`w-full px-2 py-1 border-0 text-xs text-right focus:ring-1 focus:ring-blue-500 ${className} ${disabled ? 'bg-gray-50 text-gray-500' : ''}`} style={{ height: '26px' }} placeholder={placeholder} />
  );
};

// =============================================================================
// FONCTION UTILITAIRE
// =============================================================================
const generateDraftName = () => {
  const now = new Date();
  const time = now.toTimeString().slice(0, 5).replace(':', '');
  const rand = Math.random().toString(36).substring(2, 4).toUpperCase();
  return `BRO-${time}-${rand}`;
};

const roundAmount = (value) => {
  const number = Number(value) || 0;
  return Math.round(number);
};

const formatRateOptionLabel = (option) => {
  if (!option) return '';
  const name = option.name || option.label || '';
  const rate = option.amount ?? option.rate ?? option.percentage;
  if (rate === null || rate === undefined || rate === '') return name;
  const numericRate = Number(rate);
  const displayedRate = Number.isFinite(numericRate)
    ? numericRate.toLocaleString('fr-FR', { maximumFractionDigits: 4 })
    : String(rate);
  return `${displayedRate} %${name ? ` - ${name}` : ''}`;
};

const formatCompactRateLabel = (label, kind) => {
  const text = String(label || '').trim();
  if (!text) return '';
  const rateMatch = text.match(/(-?\d+(?:[\s.,]\d+)*)\s*%/);
  const rate = rateMatch ? `${rateMatch[1].trim()} % - ` : '';
  return `${rate}${kind === 'withholding' ? 'Retenue...' : 'TVA...'}`;
};

// Une repartition peut contenir des pourcentages mal saisis. Les lignes
// generees doivent toutefois toujours totaliser exactement la taxe/retenue.
const distributeAmountByFactors = (totalAmount, repartitions) => {
  const total = roundAmount(totalAmount);
  const weightedRepartitions = repartitions
    .map((repartition) => ({
      repartition,
      factor: Number(repartition?.factor_percent) || 0,
    }))
    .filter(({ factor }) => factor > 0);
  const totalFactor = weightedRepartitions.reduce((sum, { factor }) => sum + factor, 0);

  if (!total || !weightedRepartitions.length || !totalFactor) return [];

  let allocated = 0;
  return weightedRepartitions.map(({ repartition, factor }, index) => {
    const amount = index === weightedRepartitions.length - 1
      ? total - allocated
      : roundAmount((total * factor) / totalFactor);
    allocated += amount;
    return { repartition, factor, amount };
  }).filter(({ amount }) => amount > 0);
};

const normalizeLoadedTaxDistribution = (lines) => {
  const taxLinesByParent = new Map();
  const deTaxLinesByParent = new Map();

  lines.forEach((line) => {
    if (!line.is_tax_line || !line.parent_line_id) return;
    const parentKey = String(line.parent_line_id);
    const amount = Math.abs(Number(line.debit) || Number(line.credit) || 0);
    if (/^de la taxe\b/i.test(line.name || '')) {
      deTaxLinesByParent.set(parentKey, [...(deTaxLinesByParent.get(parentKey) || []), line]);
    } else if (/^tva\b/i.test(line.name || '')) {
      taxLinesByParent.set(parentKey, (taxLinesByParent.get(parentKey) || 0) + amount);
    }
  });

  return lines.map((line) => {
    if (!line.is_tax_line || !/^de la taxe\b/i.test(line.name || '') || !line.parent_line_id) return line;
    const parentKey = String(line.parent_line_id);
    const deTaxLines = deTaxLinesByParent.get(parentKey) || [];
    const totalTax = taxLinesByParent.get(parentKey) || 0;
    if (!totalTax || !deTaxLines.length) return line;

    const distributed = distributeAmountByFactors(totalTax, deTaxLines.map((item) => ({
      factor_percent: Math.abs(Number(item.debit) || Number(item.credit) || 0),
    })));
    const index = deTaxLines.findIndex((item) => item.id === line.id);
    const amount = distributed[index]?.amount;
    if (!amount) return line;

    return {
      ...line,
      debit: Number(line.debit) ? amount : '',
      credit: Number(line.credit) ? amount : '',
    };
  });
};

const getDocumentRepartitions = (repartitions, documentType = 'invoice') => {
  const expectedType = String(documentType).toLowerCase();
  const typed = repartitions.filter((line) => String(line?.document_type || '').toLowerCase() === expectedType);
  // Les anciennes reponses sans document_type restent prises en charge, sans
  // jamais melanger une ligne explicitement renseignee comme "avoir".
  const source = typed.length > 0
    ? typed
    : repartitions.filter((line) => !line?.document_type);
  const seen = new Set();

  return source.filter((line) => {
    const accountId = line.account_id || line.account?.id || line.account || line.account_id_write || '';
    const key = [line.repartition_type, accountId, Number(line.factor_percent) || 0].join('|');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};
const PIECE_CONTEXT_DRAFT_KEY = 'somane_piece_context_draft';

const getCreatedRecordId = (record) => {
  if (!record) return '';
  if (typeof record === 'string' || typeof record === 'number') return record;
  return record.id || record.pk || record.value || '';
};

const getCreatedRecordLabel = (field, record, fallback = '') => {
  if (!record || typeof record !== 'object') return fallback;
  if (field === 'journal') return [record.code, record.name].filter(Boolean).join(' - ') || record.display_name || fallback;
  if (field === 'account') return [record.code, record.name].filter(Boolean).join(' - ') || record.display_name || fallback;
  if (field === 'partner') return record.nom || record.name || record.raison_sociale || record.display_name || fallback;
  if (field === 'tax') return record.name ? `${record.name}${record.amount ? ` (${record.amount}%)` : ''}` : record.display_name || fallback;
  if (field === 'withholding') return record.name ? `${record.name}${record.amount ? ` (${record.amount}%)` : ''}` : record.display_name || fallback;
  return record.display_name || record.name || fallback;
};

const getContextCreateRoute = (field) => ({
  journal: '/comptabilite/journaux/create',
  account: '/comptabilite/accounts/new',
  partner: '/partners/create',
  tax: '/comptabilite/taux-fiscaux/create',
  withholding: '/comptabilite/withholding-taxes/create',
}[field] || '');

const OPTIONAL_COLUMNS = [
  { key: 'tax', label: 'Taxe' },
  { key: 'withholding', label: 'Retenue' },
  { key: 'date_maturity', label: 'Date échéance' },
  { key: 'discount_amount', label: 'Montant remise' },
  { key: 'discount_percentage', label: '% remise' },
  { key: 'discount_date', label: 'Date remise' },
];
const DEFAULT_VISIBLE_OPTIONAL_COLUMNS = OPTIONAL_COLUMNS.reduce((acc, column) => ({ ...acc, [column.key]: true }), {});
const COLUMN_STORAGE_KEY = 'accountMoveCreateVisibleColumns';
const LINE_COLUMN_WIDTHS_STORAGE_KEY = 'accountMoveCreateLineColumnWidths';
const DEFAULT_LINE_COLUMN_WIDTHS = {
  account: 230,
  invoice_number: 150,
  partner: 180,
  name: 230,
  debit: 135,
  credit: 135,
  tax: 160,
  withholding: 160,
  date_maturity: 145,
  discount_amount: 145,
  discount_percentage: 110,
  discount_date: 145,
  actions: 44,
};

// Cache module-level: it survives page unmounts while the React application
// stays open. Large account and partner lists are therefore fetched once per
// entity instead of again on every Create/Show navigation.
const PIECE_REFERENCE_CACHE = new Map();
const PIECE_REFERENCE_REQUESTS = new Map();

// =============================================================================
// COMPOSANT PRINCIPAL
// =============================================================================
export default function PieceForm({ mode = 'create' }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { id: routeId } = useParams();
  const { activeEntity } = useEntity();
  const isShowMode = mode === 'show';
  const [loading, setLoading] = useState(false);
  const [optionsLoaded, setOptionsLoaded] = useState(false);
  const [journals, setJournals] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [partners, setPartners] = useState([]);
  const [devises, setDevises] = useState([]);
  const [taxes, setTaxes] = useState([]);
  const [withholdingTaxes, setWithholdingTaxes] = useState([]);
  const [taxRepartitionsCache, setTaxRepartitionsCache] = useState({});
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [activeTab, setActiveTab] = useState('ecritures');
  const [isPrinting, setIsPrinting] = useState(false);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [actionsMenuStyle, setActionsMenuStyle] = useState({});
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [unsavedPieceAction, setUnsavedPieceAction] = useState(null);
  const [pendingPieceAction, setPendingPieceAction] = useState(null);
  const [treasuryWarningDialog, setTreasuryWarningDialog] = useState(null);
  const [pieceId, setPieceId] = useState(isShowMode ? (routeId || null) : null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [attachmentsList, setAttachmentsList] = useState([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [fiscalPositions, setFiscalPositions] = useState([]);
  const [showTraceabilityPanel, setShowTraceabilityPanel] = useState(true);
  const [traceabilityLogs, setTraceabilityLogs] = useState([]);
  const [traceabilityLoading, setTraceabilityLoading] = useState(false);
  const [showColumnsMenu, setShowColumnsMenu] = useState(false);
  const [columnsMenuStyle, setColumnsMenuStyle] = useState({});
  const [visibleColumns, setVisibleColumns] = useState(() => {
    try {
      const saved = localStorage.getItem(COLUMN_STORAGE_KEY);
      return saved ? { ...DEFAULT_VISIBLE_OPTIONAL_COLUMNS, ...JSON.parse(saved) } : DEFAULT_VISIBLE_OPTIONAL_COLUMNS;
    } catch {
      return DEFAULT_VISIBLE_OPTIONAL_COLUMNS;
    }
  });
  const [lineColumnWidths, setLineColumnWidths] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(LINE_COLUMN_WIDTHS_STORAGE_KEY) || '{}');
      return { ...DEFAULT_LINE_COLUMN_WIDTHS, ...saved };
    } catch (_) {
      return DEFAULT_LINE_COLUMN_WIDTHS;
    }
  });
  const today = new Date().toISOString().split('T')[0];
  const tableContainerRef = useRef(null);
  const actionsMenuRef = useRef(null);
  const actionsMenuButtonRef = useRef(null);
  const columnsMenuRef = useRef(null);
  const columnsMenuButtonRef = useRef(null);
  const columnsMenuPopupRef = useRef(null);
  const returnedContextKeyRef = useRef('');
  const loadedPieceKeyRef = useRef('');
  const optionsEntityRef = useRef('');
  const lineColumnResizeRef = useRef(null);

  // Refs pour accéder aux données dans les callbacks
  const taxesRef = useRef([]);
  const partnersRef = useRef([]);
  const accountsRef = useRef([]);
  const withholdingTaxesRef = useRef([]);

  // Mise à jour des refs
  useEffect(() => { taxesRef.current = taxes; }, [taxes]);
  useEffect(() => { partnersRef.current = partners; }, [partners]);
  useEffect(() => { accountsRef.current = accounts; }, [accounts]);
  useEffect(() => { withholdingTaxesRef.current = withholdingTaxes; }, [withholdingTaxes]);

  // =========================================================================
  // HELPERS AVEC useCallback
  // =========================================================================

  const getAccountNature = useCallback((accountCode) => {
    if (!accountCode || typeof accountCode !== 'string') return 'other';
    const dynamicNature = getAccountNatureDynamic(accountCode, accountsRef.current);
    if (dynamicNature !== 'other') return dynamicNature;
    const firstChar = accountCode.trim().charAt(0);
    if (ACCOUNT_NATURE_FALLBACK.charge.includes(firstChar)) return 'charge';
    if (ACCOUNT_NATURE_FALLBACK.produit.includes(firstChar)) return 'produit';
    if (ACCOUNT_NATURE_FALLBACK.tiers.includes(firstChar)) return 'tiers';
    return 'other';
  }, []);

  const getSuggestedJournal = useCallback((journalsList, accountCode) => {
    if (!journalsList || !journalsList.length) return null;
    if (!accountCode) return null;
    const nature = getAccountNature(accountCode);
    const dynamicJournal = suggestJournalByNature(nature, journalsList);
    if (dynamicJournal) return dynamicJournal;
    const suggestedCode = JOURNAL_CODE_BY_NATURE_FALLBACK[nature] || JOURNAL_CODE_BY_NATURE_FALLBACK.default;
    return journalsList.find(j => j.code === suggestedCode) || null;
  }, [getAccountNature]);

  const getJournalTypeText = useCallback((journal) => {
    if (!journal) return '';
    const type = journal.type || {};
    return [
      journal.code,
      journal.name,
      journal.type_code,
      journal.type_name,
      type.code,
      type.name,
    ].filter(Boolean).join(' ').toLowerCase();
  }, []);

  const isTreasuryJournal = useCallback((journal) => {
    const text = getJournalTypeText(journal);
    return (
      text.includes('banque') ||
      text.includes('bank') ||
      text.includes('caisse') ||
      text.includes('cash') ||
      text.includes('cai') ||
      text.includes('ban')
    );
  }, [getJournalTypeText]);

  const getJournalTreasuryAccount = useCallback((journal) => {
    if (!journal) return null;
    const account = journal.default_account || journal.default_account_id;
    if (account && typeof account === 'object') {
      return {
        id: account.id,
        code: account.code || journal.default_account_code || '',
        name: account.name || account.label || '',
      };
    }
    const id = journal.default_account_id || journal.default_account;
    if (!id) return null;
    const found = accountsRef.current.find(acc => String(acc.id) === String(id));
    return found || {
      id,
      code: journal.default_account_code || '',
      name: journal.default_account_name || 'Compte de tresorerie',
    };
  }, []);

  const emptyLine = useCallback((overrides = {}) => ({
    id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substr(2, 9),
    name: '', account_id: '', account_label: '', account_code: '', invoice_number: '', partner_id: '', partner_label: '',
    debit: '', credit: '', tax_id: '', tax_label: '', tax_repartition_line_id: null, tax_base_amount: '',
    withholding_tax_id: '', withholding_tax_label: '', withholding_amount: '',
    date_maturity: '', discount_amount_currency: '', discount_percentage: '', discount_date: '',
    is_counterpart: false, is_tax_line: false, is_withholding_counterpart: false, is_treasury_counterpart: false, parent_line_id: null,
    ...overrides
  }), []);

  const initialFormData = useMemo(() => ({
    name: '', state: 'draft', move_type: 'entry', auto_post: 'manual', date: today, registration_date: today, ref: '',
    currency_id: '', currency_label: '', journal_id: '', journal_label: '', partner_id: '', partner_label: '',
    invoice_date: today, invoice_date_due: '', invoice_user_id: '', invoice_user_label: '', invoice_origin: '',
    fiscal_position_id: '', fiscal_position_label: '', payment_reference: '', lines: [emptyLine()], notes: '',
  }), [emptyLine, today]);

  const [formData, setFormData] = useState(initialFormData);
  const journalParams = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const state = location.state || {};
    const stateLabel = state.journal_label || (
      state.journal_code && state.journal_name
        ? `${state.journal_code} - ${state.journal_name}`
        : ''
    );
    return {
      id:
        params.get('journal_id') ||
        params.get('journal') ||
        params.get('default_journal_id') ||
        state.journal_id ||
        state.journal ||
        '',
      label:
        params.get('journal_label') ||
        params.get('journalLabel') ||
        stateLabel ||
        '',
    };
  }, [location.search, location.state]);

  const loadOptions = useCallback(async () => {
    if (!activeEntity) return;
    const entityKey = String(activeEntity.id);
    const normalize = (data) => {
      if (!data) return [];
      if (Array.isArray(data)) return data;
      if (Array.isArray(data.results)) return data.results;
      return [];
    };
    const normalizeAccounts = (data) => normalize(data).filter(acc => {
      const accountCompanyId = acc.company && typeof acc.company === 'object'
        ? acc.company.id
        : acc.company;
      return accountCompanyId === null
        || accountCompanyId === undefined
        || String(accountCompanyId) === entityKey;
    });
    const applyCoreOptions = (core) => {
      if (!core || optionsEntityRef.current !== entityKey) return;
      setJournals(core.journals);
      setAccounts(core.accounts);
      setPartners(core.partners);
      setOptionsLoaded(true);
    };
    const applySecondaryOptions = (secondary) => {
      if (!secondary || optionsEntityRef.current !== entityKey) return;
      setDevises(secondary.devises);
      setTaxes(secondary.taxes);
      setWithholdingTaxes(secondary.withholdingTaxes);
      setFiscalPositions(secondary.fiscalPositions);
      if (secondary.devises.length > 0) {
        const defaultCurrency = secondary.devises.find(d => d.code === 'XOF') || secondary.devises[0];
        setFormData(prev => prev.currency_id ? prev : ({
          ...prev,
          currency_id: defaultCurrency.id,
          currency_label: `${defaultCurrency.code}${defaultCurrency.symbole ? ` (${defaultCurrency.symbole})` : ''}`,
        }));
      }
    };

    const cached = PIECE_REFERENCE_CACHE.get(entityKey);
    if (cached?.core) {
      applyCoreOptions(cached.core);
      if (cached.secondary) {
        applySecondaryOptions(cached.secondary);
        return;
      }
    } else {
      setOptionsLoaded(false);
    }

    try {
      if (!cached?.core) {
        const coreRequestKey = `${entityKey}:core`;
        let coreRequest = PIECE_REFERENCE_REQUESTS.get(coreRequestKey);
        if (!coreRequest) {
          coreRequest = Promise.all([
            piecesService.getJournals(activeEntity.id),
            piecesService.getOperationalAccounts
              ? piecesService.getOperationalAccounts(activeEntity.id)
              : piecesService.getAccounts(activeEntity.id),
            piecesService.getPartners(activeEntity.id),
          ]).then(([journalsData, accountsData, partnersData]) => ({
            journals: normalize(journalsData),
            accounts: normalizeAccounts(accountsData),
            partners: normalize(partnersData),
          }));
          PIECE_REFERENCE_REQUESTS.set(coreRequestKey, coreRequest);
        }
        const core = await coreRequest;
        PIECE_REFERENCE_REQUESTS.delete(coreRequestKey);
        PIECE_REFERENCE_CACHE.set(entityKey, {
          ...(PIECE_REFERENCE_CACHE.get(entityKey) || {}),
          core,
        });
        applyCoreOptions(core);
      }

      const currentCache = PIECE_REFERENCE_CACHE.get(entityKey);
      if (currentCache?.secondary) {
        applySecondaryOptions(currentCache.secondary);
        return;
      }

      const secondaryRequestKey = `${entityKey}:secondary`;
      let secondaryRequest = PIECE_REFERENCE_REQUESTS.get(secondaryRequestKey);
      if (!secondaryRequest) {
        secondaryRequest = Promise.all([
          piecesService.getDevises(activeEntity.id),
          piecesService.getTaxes?.(activeEntity.id) || Promise.resolve([]),
          piecesService.getWithholdingTaxes?.(activeEntity.id) || Promise.resolve([]),
          piecesService.getFiscalPositions?.(activeEntity.id) || Promise.resolve([]),
        ]).then(([devisesData, taxesData, withholdingData, fiscalData]) => ({
          devises: normalize(devisesData),
          taxes: normalize(taxesData),
          withholdingTaxes: normalize(withholdingData),
          fiscalPositions: normalize(fiscalData),
        }));
        PIECE_REFERENCE_REQUESTS.set(secondaryRequestKey, secondaryRequest);
      }
      void secondaryRequest.then((secondary) => {
        PIECE_REFERENCE_REQUESTS.delete(secondaryRequestKey);
        PIECE_REFERENCE_CACHE.set(entityKey, {
          ...(PIECE_REFERENCE_CACHE.get(entityKey) || {}),
          secondary,
        });
        applySecondaryOptions(secondary);
      }).catch(() => {
        PIECE_REFERENCE_REQUESTS.delete(secondaryRequestKey);
      });
    } catch (err) {
      PIECE_REFERENCE_REQUESTS.delete(`${entityKey}:core`);
      setOptionsLoaded(true);
      setError('Erreur chargement donnees');
    }
  }, [activeEntity]);

  useEffect(() => {
    if (!activeEntity) return;
    const entityKey = String(activeEntity.id);
    if (optionsEntityRef.current === entityKey) return;
    optionsEntityRef.current = entityKey;
    void loadOptions();
  }, [activeEntity, optionsLoaded, loadOptions]);

  const loadPieceData = useCallback(async () => {
    if (!isShowMode || !routeId || !activeEntity?.id) return;
    const pieceKey = `${activeEntity.id}:${routeId}`;
    if (loadedPieceKeyRef.current === pieceKey) return;
    loadedPieceKeyRef.current = pieceKey;
    setLoading(true);
    setError(null);
    try {
      const data = await piecesService.getById(routeId, activeEntity.id);
      const getId = (value) => (value && typeof value === 'object' ? value.id : value);
      const getAccount = (value) => (value && typeof value === 'object' ? value : null);
      const getAccountLabel = (accountId, accountValue, fallback = '') => {
        const account = getAccount(accountValue) || accountsRef.current.find(item => String(item.id) === String(accountId));
        const code = account?.code || '';
        const name = account?.name || account?.label || '';
        const fallbackText = String(fallback || '').trim();
        if (!code) return name || fallbackText;
        const displayName = name || fallbackText.replace(new RegExp(`^${String(code).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*-?\\s*`), '').trim();
        return displayName ? `${code} - ${displayName}` : code;
      };
      const getPartnerLabel = (partnerId, partnerValue, fallback = '') => {
        const partner = (partnerValue && typeof partnerValue === 'object' ? partnerValue : null) || partnersRef.current.find(item => String(item.id) === String(partnerId));
        return fallback || partner?.display_name || partner?.nom || partner?.name || partner?.raison_sociale || '';
      };
      const rawLines = data.lines || data.line_ids || data.lines_write || [];
      const loadedLines = rawLines.map(line => {
        const accountValue = line.account
          || line.account_id
          || line.compte
          || line.account_detail
          || line.account_details;
        const partnerValue = line.partner || line.partner_id || line.partenaire || line.partenaire_id;
        const taxRelations = line.tax_ids || line.taxes || line.tax_details || [];
        const taxValue = line.tax_id
          || line.tax
          || (Array.isArray(taxRelations) ? taxRelations[0] : taxRelations);
        const withholdingValue = line.withholding_tax_id || line.withholding_tax;
        const taxNameFromApi = Array.isArray(line.tax_names)
          ? line.tax_names[0]
          : (typeof line.tax_names === 'string' ? line.tax_names : '');
        const accountObject = getAccount(accountValue);
        const accountCode = line.account_code || line.account_number || accountObject?.code || '';
        const accountName = line.account_name || line.account_display || accountObject?.name || accountObject?.label || '';
        const resolvedAccount = accountsRef.current
          .filter((account) => (
            (accountCode && String(account.code) === String(accountCode))
            || (
              accountName
              && String(account.name || account.label) === String(accountName)
              && (!accountCode || String(account.code || '').startsWith(String(accountCode)))
            )
          ))
          .sort((first, second) => String(second.code || '').length - String(first.code || '').length)[0]
          || accountObject;
        const resolvedAccountCode = resolvedAccount?.code || accountCode;
        const rawAccountId = getId(accountValue);
        const accountId = /^\d+$/.test(String(rawAccountId || '').trim())
          ? rawAccountId
          : (resolvedAccount?.id || '');
        const partnerId = getId(partnerValue) || '';
        const lineName = line.name || line.libelle || line.label || '';
        // Une ligne de base peut porter une taxe ou une retenue. Cela ne doit pas
        // la transformer en ligne automatique et la faire sortir de la validation.
        const isWithholding = Boolean(
          line.is_withholding_counterpart || /^(retenue|de la retenue)/i.test(lineName),
        );
        const isTax = Boolean(
          line.is_tax_line || /^(tva|de la taxe)/i.test(lineName),
        );
        const isCounterpart = Boolean(
          line.is_counterpart || line.is_partner_counterpart || /^contrepartie\b/i.test(lineName),
        );
        return {
          ...line,
          id: line.id || (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)),
          account_id: accountId ? String(accountId) : '',
          account_code: resolvedAccountCode,
          account_label: getAccountLabel(accountId, resolvedAccount || accountValue, line.account_label || accountName || ''),
          invoice_number: line.invoice_number || line.invoice_ref || '',
          partner_id: partnerId ? String(partnerId) : '',
          partner_label: getPartnerLabel(partnerId, partnerValue, line.partner_label || line.partner_name || line.partenaire_label || line.partenaire_name || ''),
          debit: line.debit || '',
          credit: line.credit || '',
          tax_id: getId(taxValue) || '',
          tax_label: line.tax_label
            || line.tax_name
            || (taxValue && typeof taxValue === 'object' ? formatRateOptionLabel(taxValue) : '')
            || (typeof taxValue === 'string' ? taxValue : '')
            || taxNameFromApi,
          withholding_tax_id: getId(withholdingValue) || '',
          withholding_tax_label: line.withholding_tax_label
            || line.withholding_tax_name
            || (withholdingValue && typeof withholdingValue === 'object' ? formatRateOptionLabel(withholdingValue) : ''),
          withholding_amount: line.withholding_amount || '',
          date_maturity: line.date_maturity || '',
          discount_amount_currency: line.discount_amount_currency || '',
          discount_percentage: line.discount_percentage || '',
          discount_date: line.discount_date || '',
          is_counterpart: isCounterpart,
          is_tax_line: isTax && !isWithholding,
          is_withholding_counterpart: isWithholding,
          parent_line_id: line.parent_line_id || line.parent_line_ref || null,
        };
      });
      const inheritedRateLines = loadedLines.map((line) => {
        if (line.is_counterpart || line.is_tax_line || line.is_withholding_counterpart) return line;

        const sameParent = (candidate) => (
          candidate.parent_line_id
          && String(candidate.parent_line_id) === String(line.id)
        );
        const samePartner = (candidate) => (
          !candidate.parent_line_id
          && line.partner_id
          && String(candidate.partner_id || '') === String(line.partner_id)
        );
        const generatedTax = loadedLines.find((candidate) => (
          candidate.is_tax_line && (sameParent(candidate) || samePartner(candidate))
        ));
        const generatedWithholding = loadedLines.find((candidate) => (
          candidate.is_withholding_counterpart && (sameParent(candidate) || samePartner(candidate))
        ));

        return {
          ...line,
          tax_label: line.tax_label || (
            generatedTax?.name
              ? String(generatedTax.name).replace(/^TVA\s+/i, '').trim()
              : ''
          ),
          withholding_tax_label: line.withholding_tax_label || (
            generatedWithholding?.name
              ? String(generatedWithholding.name).replace(/^Retenue\s+/i, '').trim()
              : ''
          ),
        };
      });
      const lines = normalizeLoadedTaxDistribution(inheritedRateLines);
      const journalValue = data.journal || data.journal_id;
      const partnerValue = data.partner || data.partner_id || data.partenaire || data.partenaire_id;
      const journalId = getId(journalValue) || '';
      const partnerId = getId(partnerValue) || '';
      const journal = getAccount(journalValue) || journals.find(item => String(item.id) === String(journalId));
      setPieceId(data.id || routeId);
      setFormData({
        ...initialFormData,
        name: data.name || '',
        state: normalizeMoveState(data.state),
        move_type: data.move_type || 'entry',
        auto_post: data.auto_post || 'manual',
        date: data.date || today,
        registration_date: getRegistrationDate(data) || data.registration_date || today,
        ref: data.ref || '',
        currency_id: getId(data.currency || data.currency_id) || '',
        currency_label: data.currency_label || data.currency_code || '',
        journal_id: journalId ? String(journalId) : '',
        journal_label: data.journal_label || (journal ? `${journal.code || ''}${journal.code && journal.name ? ' - ' : ''}${journal.name || ''}` : data.journal_name || ''),
        partner_id: partnerId ? String(partnerId) : '',
        partner_label: getPartnerLabel(partnerId, partnerValue, data.partner_label || data.partner_name || data.partenaire_label || data.partenaire_name || ''),
        invoice_date: data.invoice_date || today,
        invoice_date_due: data.invoice_date_due || '',
        invoice_user_id: data.invoice_user_id || '',
        invoice_user_label: data.invoice_user_name || '',
        invoice_origin: data.invoice_origin || '',
        fiscal_position_id: getId(data.fiscal_position || data.fiscal_position_id) || '',
        fiscal_position_label: data.fiscal_position_label || data.fiscal_position_name || '',
        payment_reference: data.payment_reference || '',
        lines: lines.length > 0 ? lines : [emptyLine()],
        notes: data.notes || data.note || '',
      });
      setAttachmentsList(Array.isArray(data.attachments) ? data.attachments : []);
      setHasUnsavedChanges(false);
    } catch (err) {
      loadedPieceKeyRef.current = '';
      const message = err?.response?.data?.detail || err?.data?.detail || err?.message || 'Impossible de charger la pièce.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [isShowMode, routeId, activeEntity?.id, initialFormData, today, emptyLine, journals]);

  useEffect(() => {
    void loadPieceData();
  }, [loadPieceData]);

  useEffect(() => {
    if (!accounts.length) return;
    setFormData((previous) => {
      let changed = false;
      const lines = previous.lines.map((line) => {
        const lineAccountName = String(line.account_label || '').replace(/^\s*[^-]+\s*-\s*/, '').trim();
        const account = accounts.filter((item) => (
          (line.account_id && String(item.id) === String(line.account_id))
          ||
          (line.account_code && String(item.code) === String(line.account_code))
          || (line.account_label && String(item.name || item.label) === String(line.account_label))
          || (
            line.account_code
            && String(item.code || '').startsWith(String(line.account_code))
            && lineAccountName
            && String(item.name || item.label) === lineAccountName
          )
        )).sort((first, second) => String(second.code || '').length - String(first.code || '').length)[0];
        if (!account) return line;
        const accountCode = account.code || line.account_code || '';
        const accountName = account.name || account.label || '';
        const accountLabel = `${accountCode}${accountCode && accountName ? ' - ' : ''}${accountName}`;
        if (
          String(line.account_id || '') === String(account.id || '')
          && String(line.account_code || '') === String(accountCode)
          && String(line.account_label || '') === String(accountLabel)
        ) return line;
        changed = true;
        return {
          ...line,
          account_id: String(account.id),
          account_code: accountCode,
          account_label: accountLabel,
        };
      });
      return changed ? { ...previous, lines } : previous;
    });
  }, [accounts]);

  useEffect(() => {
    if (!taxes.length && !withholdingTaxes.length) return;
    setFormData((previous) => {
      let changed = false;
      const lines = previous.lines.map((line) => {
        const tax = line.tax_id
          ? taxes.find(item => String(item.id) === String(line.tax_id))
          : null;
        const withholding = line.withholding_tax_id
          ? withholdingTaxes.find(item => String(item.id) === String(line.withholding_tax_id))
          : null;
        const taxLabel = tax ? formatRateOptionLabel(tax) : line.tax_label;
        const withholdingLabel = withholding ? formatRateOptionLabel(withholding) : line.withholding_tax_label;

        if (taxLabel === line.tax_label && withholdingLabel === line.withholding_tax_label) return line;
        changed = true;
        return {
          ...line,
          tax_label: taxLabel || '',
          withholding_tax_label: withholdingLabel || '',
        };
      });
      return changed ? { ...previous, lines } : previous;
    });
  }, [taxes, withholdingTaxes]);

  useEffect(() => {
    if (!journalParams.id) return;
    setFormData(prev => {
      const selectedJournal = journals.find(journal => String(journal.id) === String(journalParams.id));
      if (!selectedJournal && !journalParams.label) return prev;
      const nextLabel = selectedJournal
        ? `${selectedJournal.code} - ${selectedJournal.name}`
        : journalParams.label;
      if (
        prev.journal_id &&
        String(prev.journal_id) === String(journalParams.id) &&
        prev.journal_label === nextLabel
      ) {
        return prev;
      }
      return {
        ...prev,
        journal_id: journalParams.id,
        journal_label: nextLabel,
      };
    });
  }, [journalParams, journals]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (actionsMenuRef.current && !actionsMenuRef.current.contains(e.target)) setShowActionsMenu(false);
      if (
        columnsMenuRef.current &&
        !columnsMenuRef.current.contains(e.target) &&
        columnsMenuPopupRef.current &&
        !columnsMenuPopupRef.current.contains(e.target)
      ) setShowColumnsMenu(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    localStorage.setItem(COLUMN_STORAGE_KEY, JSON.stringify(visibleColumns));
  }, [visibleColumns]);

  const markAsModified = useCallback(() => setHasUnsavedChanges(true), []);
  const handleChange = useCallback((field, value) => { setFormData(prev => ({ ...prev, [field]: value })); markAsModified(); }, [markAsModified]);
  const buildContextReturnState = useCallback((field, query = '', lineId = null) => ({
    returnTo: `${location.pathname}${location.search || ''}`,
    returnField: field,
    returnLineId: lineId,
    returnQuery: query,
    suggestedValue: query,
    fromPiece: true,
    restorePieceDraft: {
      formData,
      activeTab,
      visibleColumns,
      pieceId,
    },
  }), [location.pathname, location.search, formData, activeTab, visibleColumns, pieceId]);

  const navigateToContextCreate = useCallback((field, query = '', lineId = null) => {
    const route = getContextCreateRoute(field);
    if (!route) return;
    const returnState = buildContextReturnState(field, query, lineId);
    try {
      sessionStorage.setItem(PIECE_CONTEXT_DRAFT_KEY, JSON.stringify(returnState));
    } catch (storageError) {
      console.warn('Impossible de sauvegarder le brouillon de la pièce', storageError);
    }
    navigate(route, { state: returnState });
  }, [buildContextReturnState, navigate]);

  const fetchTaxRepartitions = useCallback(async (taxId) => {
    const cacheKey = `tax-v2-${taxId}`;
    if (taxRepartitionsCache[cacheKey]) return taxRepartitionsCache[cacheKey];
    try {
      // Cette requete doit etre faite directement: certaines anciennes versions
      // du service renvoyaient les repartitions de toutes les taxes de l'entite.
      const { apiClient } = await import('../../services');
      const query = new URLSearchParams({ tax: String(taxId) });
      if (activeEntity?.id) query.set('company', String(activeEntity.id));
      const res = await apiClient.get(`compta/tax-repartition-lines/?${query.toString()}`);
      const data = Array.isArray(res) ? res : (res?.results || []);
      const responseExposesTaxId = data.some((line) => (
        line.tax_id !== undefined || line.tax !== undefined
      ));
      const repartitions = responseExposesTaxId
        ? data.filter((line) => {
            const lineTaxId = line.tax_id || line.tax?.id || line.tax;
            return String(lineTaxId) === String(taxId);
          })
        : data;
      setTaxRepartitionsCache(prev => ({ ...prev, [cacheKey]: repartitions }));
      return repartitions;
    } catch (e) { return []; }
  }, [taxRepartitionsCache, activeEntity]);

  const loadPieceTraceability = useCallback(async (recordId = pieceId) => {
    if (!recordId || !activeEntity?.id) {
      setTraceabilityLogs([]);
      return;
    }

    setTraceabilityLoading(true);
    try {
      const { apiClient } = await import('../../services');
      const response = await apiClient.get('compta/module-traceability/', {
        params: { move: recordId, move_id: recordId, company: activeEntity.id },
      });
      const data = Array.isArray(response) ? response : (response?.results || response?.data?.results || response?.data || []);
      const logs = Array.isArray(data) ? data : [];
      setTraceabilityLogs(logs.filter(log => {
        const moveId = log?.move?.id
          || log?.move_id
          || log?.account_move?.id
          || log?.account_move_id
          || log?.metadata?.move_id
          || log?.metadata?.piece_id;
        return moveId != null && String(moveId) === String(recordId);
      }));
    } catch {
      setTraceabilityLogs([]);
    } finally {
      setTraceabilityLoading(false);
    }
  }, [activeEntity?.id, pieceId]);

  useEffect(() => {
    void loadPieceTraceability();
  }, [loadPieceTraceability]);

  const calculateWithholdingAmount = useCallback((withholding, line, taxesList) => {
    if (!withholding) return 0;
    const baseAmount = parseFloat(line.debit) || parseFloat(line.credit) || 0;
    const rate = parseFloat(withholding.amount) || 0;
    const taxObj = line.tax_id ? taxesList.find(t => String(t.id) === String(line.tax_id)) : null;
    const taxAmount = taxObj ? roundAmount(baseAmount * ((parseFloat(taxObj.amount) || 0) / 100)) : 0;
    if (withholding.withholding_scope === 'percent') return roundAmount(baseAmount * (rate / 100));
    if (withholding.withholding_scope === 'fixed') return roundAmount(rate);
    if (withholding.withholding_scope === 'on_tax') {
      if (!withholding.tax_id || !line.tax_id) return 0;
      if (!taxObj || String(taxObj.id) !== String(withholding.tax_id)) return 0;
      return roundAmount(taxAmount * (rate / 100));
    }
    if (['on_total', 'on_ttc', 'gross', 'gross_amount'].includes(withholding.withholding_scope)) {
      return roundAmount((baseAmount + taxAmount) * (rate / 100));
    }
    return 0;
  }, []);

  const buildCounterpartLine = useCallback((motherLine, partnersList, accountsList) => {
    const nature = getAccountNature(motherLine.account_code);
    if (!['charge', 'produit'].includes(nature)) return null;
    if (!motherLine.partner_id) return null;
    const partner = partnersList.find(p => parseInt(p.id) === parseInt(motherLine.partner_id));
    if (!partner) return null;
    const candidate = resolveCounterpartAccount({ motherLine, partner, accountsList });
    if (!candidate) return null;
    const baseAmount = parseFloat(motherLine.debit) || parseFloat(motherLine.credit) || 0;
    if (baseAmount === 0) return null;
    return {
      id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substr(2, 9),
      name: `Contrepartie ${motherLine.partner_label || ''}`.trim(),
      account_id: String(candidate.id), 
      account_label: `${candidate.code} - ${candidate.name}`,
      partner_id: motherLine.partner_id, 
      partner_label: motherLine.partner_label,
      debit: '', 
      credit: '',
      is_counterpart: true, 
      parent_line_id: motherLine.id,
      account_code: candidate.code, 
      tax_id: '', 
      tax_label: '', 
      tax_repartition_line_id: null, 
      tax_base_amount: '',
      date_maturity: '', 
      discount_amount_currency: '', 
      discount_percentage: '', 
      discount_date: '',
      is_tax_line: false, 
      is_withholding_counterpart: false,
      withholding_tax_id: '',
      withholding_tax_label: '',
      withholding_amount: '',
    };
  }, [getAccountNature]);

  const buildTreasuryCounterpartLine = useCallback((motherLine, journal) => {
    const treasuryAccount = getJournalTreasuryAccount(journal);
    if (!treasuryAccount?.id) return null;
    const baseAmount = parseFloat(motherLine.debit) || parseFloat(motherLine.credit) || 0;
    if (baseAmount === 0) return null;
    const accountLabel = treasuryAccount.code
      ? `${treasuryAccount.code} - ${treasuryAccount.name || 'Compte de tresorerie'}`
      : (treasuryAccount.name || 'Compte de tresorerie');
    return {
      id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substr(2, 9),
      name: `Contrepartie tresorerie ${motherLine.name || motherLine.partner_label || ''}`.trim(),
      account_id: String(treasuryAccount.id),
      account_label: accountLabel,
      partner_id: motherLine.partner_id || '',
      partner_label: motherLine.partner_label || '',
      debit: '',
      credit: '',
      is_counterpart: true,
      is_treasury_counterpart: true,
      parent_line_id: motherLine.id,
      account_code: treasuryAccount.code || '',
      tax_id: '',
      tax_label: '',
      tax_repartition_line_id: null,
      tax_base_amount: '',
      date_maturity: '',
      discount_amount_currency: '',
      discount_percentage: '',
      discount_date: '',
      is_tax_line: false,
      is_withholding_counterpart: false,
      withholding_tax_id: '',
      withholding_tax_label: '',
      withholding_amount: '',
    };
  }, [getJournalTreasuryAccount]);

  const buildWithholdingCounterpartLine = useCallback((motherLine, withholdingObj, taxesList) => {
    if (!motherLine.withholding_tax_id || !withholdingObj) return null;
    const withholdingAmount = calculateWithholdingAmount(withholdingObj, motherLine, taxesList);
    if (withholdingAmount <= 0.01) return null;
    const isMotherDebit = parseFloat(motherLine.debit) > 0;

    const buildLine = (accountToUse, labelToUse, amount, role = 'tax', repartitionLineId = null, suffix = '') => ({
      id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substr(2, 9),
      name: `${role === 'delatax' ? 'De la retenue' : 'Retenue'} ${withholdingObj.name || ''}${suffix} - ${motherLine.partner_label || ''}`.trim(),
      account_id: String(accountToUse), account_label: labelToUse,
      partner_id: motherLine.partner_id || '', partner_label: motherLine.partner_label || '',
      debit: role === 'delatax' ? (isMotherDebit ? amount : '') : (!isMotherDebit ? amount : ''),
      credit: role === 'delatax' ? (!isMotherDebit ? amount : '') : (isMotherDebit ? amount : ''),
      is_withholding_counterpart: true, parent_line_id: motherLine.id,
      withholding_distribution_role: role,
      withholding_tax_id: motherLine.withholding_tax_id,
      withholding_tax_label: motherLine.withholding_tax_label,
      withholding_amount: amount,
      account_code: '', tax_id: '', tax_label: '', tax_repartition_line_id: repartitionLineId, tax_base_amount: '',
      date_maturity: '', discount_amount_currency: '', discount_percentage: '', discount_date: '',
      is_counterpart: false, is_tax_line: false,
    });

    const repartitions = getDocumentRepartitions(
      withholdingObj.repartition_lines || withholdingObj.invoice_repartition_decoded || [],
      'invoice'
    );
    const invoiceReps = repartitions.filter(r =>
      (r.account_id || r.account || r.account_id_write) &&
      (parseFloat(r.factor_percent) || 0) > 0 &&
      r.repartition_type !== 'base'
    );
    const taxReps = invoiceReps.filter(r => r.repartition_type === 'tax');
    const deTaxReps = invoiceReps.filter(r => r.repartition_type === 'delatax');
    const makeDistributedLines = (reps, role) => {
      return distributeAmountByFactors(withholdingAmount, reps).map(({ repartition: rep, factor, amount }) => {
      const accountToUse = rep.account_id || rep.account_id_write || (typeof rep.account === 'object' ? rep.account.id : rep.account);
      const accountCode = rep.account_code || rep.account?.code || '';
      const accountName = rep.account_name || rep.account?.name || '';
      const labelToUse = accountCode && accountName ? `${accountCode} - ${accountName}` : (rep.account_label || accountName || accountCode);
      return buildLine(accountToUse, labelToUse, amount, role, rep.id || null, reps.length > 1 ? ` ${factor}%` : '');
      });
    };

    const taxLines = taxReps.length > 0 ? makeDistributedLines(taxReps, 'tax') : [];
    if (taxLines.length === 0 && withholdingObj.account_id) {
      const accountToUse = typeof withholdingObj.account_id === 'object' ? withholdingObj.account_id.id : withholdingObj.account_id;
      const accountCode = withholdingObj.account_code || withholdingObj.account_id?.code || withholdingObj.account_label || '';
      const accountName = withholdingObj.account_name || withholdingObj.account_id?.name || '';
      const labelToUse = accountName && accountCode ? `${accountCode} - ${accountName}` : (withholdingObj.account_label || accountCode || accountName);
      taxLines.push(buildLine(accountToUse, labelToUse, withholdingAmount));
    }

    const deTaxLines = deTaxReps.length > 0 ? makeDistributedLines(deTaxReps, 'delatax') : [];
    const lines = [...taxLines, ...deTaxLines];
    return lines.length > 0 ? lines : null;
  }, [calculateWithholdingAmount]);

  const regenerateAllLines = async (
    motherLines, existingAutoLines, fetchTaxFn,
    buildCounterFn, buildWithholdingFn,
    taxesList, partnersList, accountsList, withholdingList, journal
  ) => {
    const result = [];
    const processedTVAKeys = new Set();
    const taxAggregates = {};
    const useTreasuryCounterpart = isTreasuryJournal(journal) && [true, 'true', 1, '1'].includes(journal?.counterpart_per_line);

    motherLines.forEach(mother => {
      if (mother.tax_id && (parseFloat(mother.debit) > 0 || parseFloat(mother.credit) > 0)) {
        const isDebit = parseFloat(mother.debit) > 0;
        const key = `${mother.tax_id}__${mother.partner_id || 'null'}__${isDebit ? 'D' : 'C'}`;
        if (!taxAggregates[key]) {
          taxAggregates[key] = {
            taxId: mother.tax_id, taxLabel: mother.tax_label,
            partnerId: mother.partner_id, partnerLabel: mother.partner_label || 'Divers',
            baseAmount: 0, isDebit, firstMotherId: mother.id
          };
        }
        taxAggregates[key].baseAmount += parseFloat(mother.debit) || parseFloat(mother.credit) || 0;
      }
    });

    for (const mother of motherLines) {
      const blockStartIndex = result.length;
      result.push(mother);
      const withholdingObj = withholdingList.find(wt => String(wt.id) === String(mother.withholding_tax_id));
      const withholdingAmount = withholdingObj ? calculateWithholdingAmount(withholdingObj, mother, taxesList) : 0;

      if (mother.tax_id && (parseFloat(mother.debit) > 0 || parseFloat(mother.credit) > 0)) {
        const isDebit = parseFloat(mother.debit) > 0;
        const key = `${mother.tax_id}__${mother.partner_id || 'null'}__${isDebit ? 'D' : 'C'}`;
        if (!processedTVAKeys.has(key) && taxAggregates[key]) {
          processedTVAKeys.add(key);
          const agg = taxAggregates[key];
          const reps = getDocumentRepartitions(await fetchTaxFn(agg.taxId), 'invoice');
          const taxObj = taxesList.find(t => String(t.id) === String(agg.taxId));
          if (taxObj && reps.length > 0) {
            const taxRate = parseFloat(taxObj.amount || 0);
            const totalTax = roundAmount(agg.baseAmount * (taxRate / 100));
            if (totalTax > 0) {
              const rep = reps.find(item => (
                item.repartition_type === 'tax' &&
                (item.account_id || item.account || item.account_id_write)
              ));
              if (rep) {
                const accountId = rep.account_id || rep.account?.id || rep.account || rep.account_id_write;
                const accountCode = rep.account_code || rep.account?.code || '';
                const accountName = rep.account_name || rep.account?.name || 'Compte TVA';
                const existingTax = existingAutoLines.find(line => (
                  line.is_tax_line &&
                  !line.tax_distribution_role &&
                  String(line.parent_line_id) === String(agg.firstMotherId) &&
                  String(line.partner_id || '') === String(agg.partnerId || '')
                ));
                result.push({
                  id: existingTax ? existingTax.id : (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substr(2, 9)),
                  name: `TVA ${agg.taxLabel || ''} (${agg.partnerLabel})`.trim(),
                  account_id: existingTax?.account_id || String(accountId),
                  account_label: existingTax?.account_label || (accountCode ? `${accountCode} - ${accountName}` : accountName),
                  partner_id: agg.partnerId || '', partner_label: agg.partnerLabel,
                  debit: agg.isDebit ? totalTax : '', credit: !agg.isDebit ? totalTax : '',
                  tax_repartition_line_id: rep.id || null, tax_base_amount: agg.baseAmount,
                  is_tax_line: true, parent_line_id: agg.firstMotherId,
                  account_code: existingTax?.account_code || accountCode, tax_id: '', tax_label: '',
                  date_maturity: '', discount_amount_currency: '', discount_percentage: '', discount_date: '',
                  is_counterpart: false, is_withholding_counterpart: false,
                  withholding_tax_id: '', withholding_tax_label: '', withholding_amount: '',
                });

                // "De la taxe" est la contre-ecriture de la TVA. Les lignes de
                // repartition finale ne sont pas generees ici.
                const deTaxReps = reps.filter(item => (
                  item.repartition_type === 'delatax' &&
                  (parseFloat(item.factor_percent) || 0) > 0 &&
                  (item.account_id || item.account || item.account_id_write)
                ));
                distributeAmountByFactors(totalTax, deTaxReps).forEach(({ repartition: deTaxRep, amount }) => {

                  const deTaxAccountId = deTaxRep.account_id || deTaxRep.account?.id || deTaxRep.account || deTaxRep.account_id_write;
                  const deTaxAccountCode = deTaxRep.account_code || deTaxRep.account?.code || '';
                  const deTaxAccountName = deTaxRep.account_name || deTaxRep.account?.name || 'Compte TVA';
                  const existingDeTax = existingAutoLines.find(line => (
                    line.is_tax_line &&
                    line.tax_distribution_role === 'tax-source-delatax' &&
                    String(line.tax_repartition_line_id || '') === String(deTaxRep.id || '') &&
                    String(line.parent_line_id) === String(agg.firstMotherId) &&
                    String(line.partner_id || '') === String(agg.partnerId || '')
                  ));

                  result.push({
                    id: existingDeTax ? existingDeTax.id : (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substr(2, 9)),
                    name: `De la taxe ${agg.taxLabel || ''} (${agg.partnerLabel})`.trim(),
                    account_id: existingDeTax?.account_id || String(deTaxAccountId),
                    account_label: existingDeTax?.account_label || (deTaxAccountCode ? `${deTaxAccountCode} - ${deTaxAccountName}` : deTaxAccountName),
                    partner_id: agg.partnerId || '', partner_label: agg.partnerLabel,
                    debit: !agg.isDebit ? amount : '', credit: agg.isDebit ? amount : '',
                    tax_repartition_line_id: deTaxRep.id || null, tax_base_amount: agg.baseAmount,
                    tax_distribution_role: 'tax-source-delatax',
                    is_tax_line: true, parent_line_id: agg.firstMotherId,
                    account_code: existingDeTax?.account_code || deTaxAccountCode, tax_id: '', tax_label: '',
                    date_maturity: '', discount_amount_currency: '', discount_percentage: '', discount_date: '',
                    is_counterpart: false, is_withholding_counterpart: false,
                    withholding_tax_id: '', withholding_tax_label: '', withholding_amount: '',
                  });
                });
              }
            }
          }
        }
      }

      if (withholdingAmount > 0.01 && withholdingObj) {
        const retenueLine = buildWithholdingFn({ ...mother, withholding_amount: withholdingAmount }, withholdingObj, taxesList);
        if (retenueLine) {
          const lines = Array.isArray(retenueLine) ? retenueLine : [retenueLine];
          lines.forEach(line => {
            const existingRet = existingAutoLines.find(existing => (
              existing.is_withholding_counterpart &&
              String(existing.parent_line_id) === String(mother.id) &&
              String(existing.withholding_distribution_role || 'tax') === String(line.withholding_distribution_role || 'tax') &&
              String(existing.tax_repartition_line_id || '') === String(line.tax_repartition_line_id || '')
            ));
            result.push({
              ...line,
              id: existingRet ? existingRet.id : line.id,
              account_id: line.account_id,
              account_label: line.account_label,
            });
          });
        }
      }

      const freshCounterpart = useTreasuryCounterpart
        ? buildTreasuryCounterpartLine(mother, journal)
        : buildCounterFn(mother, partnersList, accountsList, taxesList);
      if (freshCounterpart) {
        const existingCounter = existingAutoLines.find(l => l.is_counterpart && l.parent_line_id === mother.id);
        const blockLines = result.slice(blockStartIndex);
        const blockDebit = blockLines.reduce((sum, line) => sum + (Number(line.debit) || 0), 0);
        const blockCredit = blockLines.reduce((sum, line) => sum + (Number(line.credit) || 0), 0);
        const gap = roundAmount(Math.abs(blockDebit - blockCredit));
        const counterDebit = blockCredit > blockDebit ? gap : 0;
        const counterCredit = blockDebit > blockCredit ? gap : 0;
        if (gap <= 0.01) continue;
        result.push({
          ...freshCounterpart,
          id: existingCounter ? existingCounter.id : freshCounterpart.id,
          account_id: existingCounter?.account_id || freshCounterpart.account_id,
          account_label: existingCounter?.account_label || freshCounterpart.account_label,
          account_code: existingCounter?.account_code || freshCounterpart.account_code,
          is_treasury_counterpart: !!freshCounterpart.is_treasury_counterpart,
          debit: counterDebit > 0.01 ? counterDebit : '',
          credit: counterCredit > 0.01 ? counterCredit : '',
          withholding_tax_id: '',
          withholding_tax_label: '',
          withholding_amount: '',
        });
      }
    }
    return result;
  };

  const applyLineChange = useCallback(async (lineId, patch) => {
    try {
      markAsModified();
      const currentLines = formData.lines;
      const motherLines = currentLines
        .filter(l => !l.is_counterpart && !l.is_tax_line && !l.is_withholding_counterpart)
        .map(l => l.id === lineId ? { ...l, ...patch } : l);
      const autoLines = currentLines
        .filter(l => l.is_counterpart || l.is_tax_line || l.is_withholding_counterpart);
      const selectedJournal = journals.find(j => String(j.id) === String(formData.journal_id));
      const newLines = await regenerateAllLines(
        motherLines, autoLines, fetchTaxRepartitions,
        buildCounterpartLine, buildWithholdingCounterpartLine,
        taxesRef.current, partnersRef.current, accountsRef.current, withholdingTaxesRef.current,
        selectedJournal
      );
      setFormData(prev => ({ ...prev, lines: newLines }));
    } catch (err) {
      setError('Erreur lors de la régénération des lignes');
    }
  }, [formData.lines, formData.journal_id, journals, fetchTaxRepartitions, buildCounterpartLine, buildWithholdingCounterpartLine, markAsModified]);

  const handleWithholdingSelection = useCallback(async (lineId, withholdingId, withholdingLabel) => {
    const line = formData.lines.find(l => l.id === lineId);
    if (!line || line.is_counterpart || line.is_tax_line || line.is_withholding_counterpart) return;
    await applyLineChange(lineId, { withholding_tax_id: withholdingId, withholding_tax_label: withholdingLabel });
  }, [formData.lines, applyLineChange]);

  const handleTaxSelection = useCallback(async (lineId, taxId, taxLabel) => {
    const line = formData.lines.find(l => l.id === lineId);
    if (!line || line.is_counterpart || line.is_tax_line) return;
    await applyLineChange(lineId, { tax_id: taxId, tax_label: taxLabel });
  }, [formData.lines, applyLineChange]);

  const handlePartnerSelection = useCallback(async (lineId, partnerId, partnerLabel) => {
    const line = formData.lines.find(l => l.id === lineId);
    if (!line || line.is_counterpart || line.is_tax_line) return;
    await applyLineChange(lineId, { partner_id: partnerId, partner_label: partnerLabel });
  }, [formData.lines, applyLineChange]);

  const handleAccountSelection = useCallback(async (lineId, accountId, accountLabel) => {
    const line = formData.lines.find(l => l.id === lineId);
    const account = accountsRef.current.find(a => String(a.id) === String(accountId));
    if (line?.is_counterpart || line?.is_tax_line || line?.is_withholding_counterpart) {
      setFormData(prev => ({ ...prev, lines: prev.lines.map(l => l.id === lineId ? { ...l, account_id: accountId, account_label: accountLabel, account_code: account?.code } : l) }));
      markAsModified(); return;
    }
    const selectedJournal = journals.find(j => String(j.id) === String(formData.journal_id));
    const treasuryAccount = getJournalTreasuryAccount(selectedJournal);
    if (
      selectedJournal &&
      isTreasuryJournal(selectedJournal) &&
      treasuryAccount?.id &&
      String(accountId) === String(treasuryAccount.id)
    ) {
      const treasuryLabel = treasuryAccount.code
        ? `${treasuryAccount.code} - ${treasuryAccount.name || 'Compte de tresorerie'}`
        : (treasuryAccount.name || 'Compte de tresorerie');
      setFormData(prev => ({
        ...prev,
        lines: prev.lines.map(l => l.id === lineId
          ? { ...l, account_id: accountId, account_label: accountLabel, account_code: account?.code }
          : l
        )
      }));
      setTreasuryWarningDialog({
        message: `Le compte de tresorerie ${treasuryLabel} ne peut pas etre utilise directement dans ce journal.`,
        lineId,
      });
      return;
    }
    await applyLineChange(lineId, { account_id: accountId, account_label: accountLabel, account_code: account?.code });
    if (account?.code && !formData.journal_id && journals.length > 0) {
      const suggested = getSuggestedJournal(journals, account.code);
      if (suggested) { setFormData(prev => ({ ...prev, journal_id: suggested.id, journal_label: `${suggested.code} - ${suggested.name}` })); markAsModified(); }
    }
  }, [formData.lines, formData.journal_id, journals, applyLineChange, markAsModified, getSuggestedJournal, getJournalTreasuryAccount, isTreasuryJournal]);

  const handleJournalSelection = useCallback(async (journalId, journalLabel) => {
    const selectedJournal = journals.find(j => String(j.id) === String(journalId));
    markAsModified();
    const treasuryAccount = getJournalTreasuryAccount(selectedJournal);
    const motherLines = formData.lines
      .filter(l => !l.is_counterpart && !l.is_tax_line && !l.is_withholding_counterpart)
      .map(line => {
        if (
          selectedJournal &&
          isTreasuryJournal(selectedJournal) &&
          treasuryAccount?.id &&
          String(line.account_id) === String(treasuryAccount.id)
        ) {
          return { ...line, account_id: '', account_label: '', account_code: '' };
        }
        return line;
      });
    const hadTreasuryAccount = formData.lines.some(line =>
      !line.is_counterpart &&
      !line.is_tax_line &&
      !line.is_withholding_counterpart &&
      treasuryAccount?.id &&
      String(line.account_id) === String(treasuryAccount.id)
    );
    if (hadTreasuryAccount) {
      const treasuryLabel = treasuryAccount.code
        ? `${treasuryAccount.code} - ${treasuryAccount.name || 'Compte de tresorerie'}`
        : (treasuryAccount.name || 'Compte de tresorerie');
      setError(`Le compte de tresorerie ${treasuryLabel} ne peut pas etre utilise directement dans ce journal.`);
    }
    const autoLines = formData.lines.filter(l =>
      (l.is_counterpart || l.is_tax_line || l.is_withholding_counterpart) && !l.is_treasury_counterpart
    );
    const newLines = await regenerateAllLines(
      motherLines, autoLines, fetchTaxRepartitions,
      buildCounterpartLine, buildWithholdingCounterpartLine,
      taxesRef.current, partnersRef.current, accountsRef.current, withholdingTaxesRef.current,
      selectedJournal
    );
    setFormData(prev => ({
      ...prev,
      journal_id: journalId,
      journal_label: journalLabel,
      lines: newLines,
    }));
  }, [formData.lines, journals, fetchTaxRepartitions, buildCounterpartLine, buildWithholdingCounterpartLine, markAsModified, getJournalTreasuryAccount, isTreasuryJournal]);
  const applyReturnedContextRecord = useCallback(async (field, record, lineId, fallbackLabel = '') => {
    const createdId = getCreatedRecordId(record);
    const createdLabel = getCreatedRecordLabel(field, record, fallbackLabel);
    if (!createdId || !createdLabel) return;

    if (field === 'journal') {
      const exists = journals.some(item => String(item.id) === String(createdId));
      if (!exists && record && typeof record === 'object') setJournals(prev => [...prev, record]);
      await handleJournalSelection(createdId, createdLabel);
      return;
    }

    if (!lineId) return;
    if (field === 'account') {
      const exists = accountsRef.current.some(item => String(item.id) === String(createdId));
      if (!exists && record && typeof record === 'object') setAccounts(prev => [...prev, record]);
      await handleAccountSelection(lineId, createdId, createdLabel);
    } else if (field === 'partner') {
      const exists = partnersRef.current.some(item => String(item.id) === String(createdId));
      if (!exists && record && typeof record === 'object') setPartners(prev => [...prev, record]);
      await handlePartnerSelection(lineId, createdId, createdLabel);
    } else if (field === 'tax') {
      const exists = taxesRef.current.some(item => String(item.id) === String(createdId));
      if (!exists && record && typeof record === 'object') setTaxes(prev => [...prev, record]);
      await handleTaxSelection(lineId, createdId, createdLabel);
    } else if (field === 'withholding') {
      const exists = withholdingTaxesRef.current.some(item => String(item.id) === String(createdId));
      if (!exists && record && typeof record === 'object') setWithholdingTaxes(prev => [...prev, record]);
      await handleWithholdingSelection(lineId, createdId, createdLabel);
    }
  }, [journals, handleJournalSelection, handleAccountSelection, handlePartnerSelection, handleTaxSelection, handleWithholdingSelection]);

  useEffect(() => {
    let savedContext = null;
    try {
      const rawSavedContext = sessionStorage.getItem(PIECE_CONTEXT_DRAFT_KEY);
      savedContext = rawSavedContext ? JSON.parse(rawSavedContext) : null;
    } catch {
      savedContext = null;
    }

    const state = {
      ...(savedContext || {}),
      ...(location.state || {}),
    };
    const createdRecord = state.createdRecord || state.created_record || state.selectedRecord || state.record || state.created || null;
    const returnField = state.returnField || state.selectedField || '';
    const returnLineId = state.returnLineId || null;
    const restoreDraft = state.restorePieceDraft || null;

    if (!createdRecord && !restoreDraft) return;

    const contextKey = [
      returnField,
      returnLineId || '',
      createdRecord?.id || createdRecord?.pk || '',
      state.returnQuery || state.suggestedValue || '',
      restoreDraft?.pieceId || '',
    ].join('|');
    if (contextKey && returnedContextKeyRef.current === contextKey) return;
    returnedContextKeyRef.current = contextKey;

    if (createdRecord && returnField === 'journal' && restoreDraft?.formData) {
      const applyJournalToRestoredDraft = async () => {
        const createdId = getCreatedRecordId(createdRecord);
        const createdLabel = getCreatedRecordLabel('journal', createdRecord, state.returnQuery || state.suggestedValue || '');
        if (!createdId || !createdLabel) return;

        const selectedJournal = createdRecord && typeof createdRecord === 'object'
          ? createdRecord
          : journals.find(j => String(j.id) === String(createdId));
        const restoredLines = Array.isArray(restoreDraft.formData.lines) ? restoreDraft.formData.lines : [];
        let newLines = restoredLines;
        if (optionsLoaded) {
          const treasuryAccount = getJournalTreasuryAccount(selectedJournal);
          const motherLines = restoredLines
            .filter(l => !l.is_counterpart && !l.is_tax_line && !l.is_withholding_counterpart)
            .map(line => {
              if (
                selectedJournal &&
                isTreasuryJournal(selectedJournal) &&
                treasuryAccount?.id &&
                String(line.account_id) === String(treasuryAccount.id)
              ) {
                return { ...line, account_id: '', account_label: '', account_code: '' };
              }
              return line;
            });
          const autoLines = restoredLines.filter(l =>
            (l.is_counterpart || l.is_tax_line || l.is_withholding_counterpart) && !l.is_treasury_counterpart
          );
          newLines = await regenerateAllLines(
            motherLines, autoLines, fetchTaxRepartitions,
            buildCounterpartLine, buildWithholdingCounterpartLine,
            taxesRef.current, partnersRef.current, accountsRef.current, withholdingTaxesRef.current,
            selectedJournal
          );
        }

        const exists = journals.some(item => String(item.id) === String(createdId));
        if (!exists && createdRecord && typeof createdRecord === 'object') setJournals(prev => [...prev, createdRecord]);
        setFormData({
          ...restoreDraft.formData,
          journal_id: createdId,
          journal_label: createdLabel,
          lines: newLines,
        });
        if (restoreDraft.activeTab) setActiveTab(restoreDraft.activeTab);
        if (restoreDraft.visibleColumns) setVisibleColumns(prev => ({ ...prev, ...restoreDraft.visibleColumns }));
        if (restoreDraft.pieceId) setPieceId(restoreDraft.pieceId);
        markAsModified();
        setSuccess('Element cree et ajoute a la piece.');
        try { sessionStorage.removeItem(PIECE_CONTEXT_DRAFT_KEY); } catch {}
        navigate(`${location.pathname}${location.search || ''}`, { replace: true, state: {} });
      };
      applyJournalToRestoredDraft();
      return;
    }

    if (restoreDraft?.formData) setFormData(restoreDraft.formData);
    if (restoreDraft?.activeTab) setActiveTab(restoreDraft.activeTab);
    if (restoreDraft?.visibleColumns) setVisibleColumns(prev => ({ ...prev, ...restoreDraft.visibleColumns }));
    if (restoreDraft?.pieceId) setPieceId(restoreDraft.pieceId);

    if (createdRecord && returnField) {
      applyReturnedContextRecord(returnField, createdRecord, returnLineId, state.returnQuery || state.suggestedValue || '');
      setSuccess('Element cree et ajoute a la piece.');
      try { sessionStorage.removeItem(PIECE_CONTEXT_DRAFT_KEY); } catch {}
    }
    navigate(`${location.pathname}${location.search || ''}`, { replace: true, state: {} });
  }, [
    location.pathname,
    location.search,
    location.state,
    navigate,
    applyReturnedContextRecord,
    optionsLoaded,
    accounts.length,
    partners.length,
    taxes.length,
    withholdingTaxes.length,
    journals,
    fetchTaxRepartitions,
    buildCounterpartLine,
    buildWithholdingCounterpartLine,
    getJournalTreasuryAccount,
    isTreasuryJournal,
    markAsModified,
  ]);
  const handleAmountChange = useCallback(async (lineId, type, value) => {
    const isAutoLine = formData.lines.find(l => l.id === lineId && (l.is_counterpart || l.is_tax_line || l.is_withholding_counterpart));
    if (isAutoLine) {
      setFormData(prev => ({ ...prev, lines: prev.lines.map(l => { if (l.id !== lineId) return l; const other = type === 'debit' ? 'credit' : 'debit'; return { ...l, [type]: value, [other]: '' }; }) }));
      markAsModified(); return;
    }
    const line = formData.lines.find(l => l.id === lineId);
    if (!line) return;
    await applyLineChange(lineId, { [type]: value, [type === 'debit' ? 'credit' : 'debit']: '' });
  }, [formData.lines, applyLineChange, markAsModified]);

  const handleLineChange = useCallback((lineId, field, value) => {
    setFormData(prev => ({ ...prev, lines: prev.lines.map(l => l.id === lineId ? { ...l, [field]: value } : l) }));
    markAsModified();
  }, [markAsModified]);

  const addLine = useCallback(() => {
    const firstName = formData.lines[0]?.name || '';
    setFormData(prev => ({ ...prev, lines: [...prev.lines, emptyLine({ name: firstName })] }));
    markAsModified();
    setTimeout(() => { if (tableContainerRef.current) tableContainerRef.current.scrollTop = tableContainerRef.current.scrollHeight; }, 10);
  }, [formData.lines, emptyLine, markAsModified]);

  const removeLine = useCallback(async (lineId) => {
    const line = formData.lines.find(l => l.id === lineId);
    if (!line) return;
    const allMotherLines = formData.lines.filter(l => !l.is_counterpart && !l.is_tax_line && !l.is_withholding_counterpart);
    if (line.is_counterpart || line.is_tax_line || line.is_withholding_counterpart) {
      setFormData(prev => ({ ...prev, lines: prev.lines.filter(l => l.id !== lineId) }));
      markAsModified(); return;
    }
    if (allMotherLines.length <= 1) {
      setError('Une pièce doit avoir au moins une ligne');
      return;
    }
    const updatedMothers = allMotherLines.filter(l => l.id !== lineId);
    const existingAutoLines = formData.lines.filter(
      l => (l.is_counterpart || l.is_tax_line || l.is_withholding_counterpart) && l.parent_line_id !== lineId
    );
    const selectedJournal = journals.find(j => String(j.id) === String(formData.journal_id));
    const allLines = await regenerateAllLines(
      updatedMothers, existingAutoLines, fetchTaxRepartitions,
      buildCounterpartLine, buildWithholdingCounterpartLine,
      taxesRef.current, partnersRef.current, accountsRef.current, withholdingTaxesRef.current,
      selectedJournal
    );
    setFormData(prev => ({ ...prev, lines: allLines }));
    markAsModified();
  }, [formData.lines, formData.journal_id, journals, fetchTaxRepartitions, buildCounterpartLine, buildWithholdingCounterpartLine, markAsModified]);

  const handleLastFieldTab = useCallback((e, lineId) => {
    if (e.key === 'Tab' && !e.shiftKey) {
      const lastLine = formData.lines[formData.lines.length - 1];
      if (lastLine?.id === lineId) {
        e.preventDefault();
        const firstName = formData.lines[0]?.name || '';
        const newLine = emptyLine({ name: firstName });
        setFormData(prev => ({ ...prev, lines: [...prev.lines, newLine] }));
        markAsModified();
        setTimeout(() => {
          const newRow = document.querySelector(`tr[data-line-id="${newLine.id}"] input:not([disabled])`);
          if (newRow) newRow.focus();
        }, 50);
      }
    }
  }, [formData.lines, emptyLine, markAsModified]);

  const getLastTabColumnKey = useCallback((line) => {
    const isAutoLine = line?.is_counterpart || line?.is_tax_line || line?.is_withholding_counterpart;
    const tabColumns = ['credit'];

    if (!isAutoLine) {
      OPTIONAL_COLUMNS.forEach(column => {
        if (visibleColumns[column.key]) tabColumns.push(column.key);
      });
    } else if (visibleColumns.date_maturity) {
      tabColumns.push('date_maturity');
    }

    return tabColumns[tabColumns.length - 1];
  }, [visibleColumns]);

  const handleColumnTab = useCallback((e, line, columnKey) => {
    if (columnKey === getLastTabColumnKey(line)) handleLastFieldTab(e, line.id);
  }, [getLastTabColumnKey, handleLastFieldTab]);

  const toggleOptionalColumn = useCallback((columnKey) => {
    setVisibleColumns(prev => ({ ...prev, [columnKey]: !prev[columnKey] }));
  }, []);

  useEffect(() => {
    localStorage.setItem(LINE_COLUMN_WIDTHS_STORAGE_KEY, JSON.stringify(lineColumnWidths));
  }, [lineColumnWidths]);

  const startLineColumnResize = useCallback((event, columnKey) => {
    event.preventDefault();
    event.stopPropagation();
    const startX = event.clientX;
    const startWidth = lineColumnWidths[columnKey] || DEFAULT_LINE_COLUMN_WIDTHS[columnKey] || 120;
    const minWidth = columnKey === 'actions' ? 36 : 90;

    const onMouseMove = (moveEvent) => {
      const nextWidth = Math.max(minWidth, startWidth + moveEvent.clientX - startX);
      setLineColumnWidths(prev => ({ ...prev, [columnKey]: nextWidth }));
    };
    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      lineColumnResizeRef.current = null;
    };

    lineColumnResizeRef.current = { onMouseMove, onMouseUp };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, [lineColumnWidths]);

  useEffect(() => () => {
    const resize = lineColumnResizeRef.current;
    if (resize) {
      document.removeEventListener('mousemove', resize.onMouseMove);
      document.removeEventListener('mouseup', resize.onMouseUp);
    }
  }, []);

  const toggleColumnsMenu = useCallback(() => {
    const anchor = columnsMenuButtonRef.current || columnsMenuRef.current;
    if (anchor) {
      const rect = anchor.getBoundingClientRect();
      const menuWidth = 176;
      const viewportPadding = 8;
      const left = Math.min(
        Math.max(viewportPadding, rect.left),
        window.innerWidth - menuWidth - viewportPadding
      );
      setColumnsMenuStyle({
        position: 'fixed',
        top: `${rect.bottom}px`,
        left: `${left}px`,
        zIndex: 35,
      });
    }
    setShowColumnsMenu(prev => !prev);
  }, []);

  const toggleActionsMenu = useCallback(() => {
    const anchor = actionsMenuButtonRef.current;
    if (anchor) {
      const rect = anchor.getBoundingClientRect();
      const menuWidth = 192;
      const menuHeight = 180;
      const viewportPadding = 8;
      const left = Math.min(
        Math.max(viewportPadding, rect.right - menuWidth),
        Math.max(viewportPadding, window.innerWidth - menuWidth - viewportPadding),
      );
      const top = Math.min(
        rect.bottom + 4,
        Math.max(viewportPadding, window.innerHeight - menuHeight - viewportPadding),
      );
      setActionsMenuStyle({
        position: 'fixed',
        top: `${top}px`,
        left: `${left}px`,
        width: `${menuWidth}px`,
        zIndex: 35,
      });
    }
    setShowActionsMenu(previous => !previous);
  }, []);

  const handleAttachmentsChange = async (files) => {
    if (!files || files.length === 0) return;
    const validFiles = Array.from(files).filter(file => {
      if (file.size > 10 * 1024 * 1024) { setError(`${file.name} dépasse 10MB`); return false; }
      const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (!allowed.includes(file.type)) { setError(`Format non supporté : ${file.name}`); return false; }
      return true;
    });
    if (validFiles.length === 0) return;

    if (!pieceId) {
      setAttachmentsList(prev => [...prev, ...validFiles]);
      markAsModified();
      return;
    }

    setUploadingFiles(true);
    setError(null);
    try {
      const formData = new FormData();
      validFiles.forEach(file => formData.append('attachments', file));
      await piecesService.uploadAttachments(pieceId, formData, activeEntity?.id);
      const refreshedAttachments = await piecesService.getAttachments(pieceId, activeEntity?.id);
      setAttachmentsList(Array.isArray(refreshedAttachments) ? refreshedAttachments : []);
      setSuccess(`${validFiles.length} pièce(s) jointe(s) ajoutée(s).`);
    } catch (err) {
      const detail = err?.response?.data?.detail || err?.data?.detail || err?.message;
      setError(detail || "Impossible d'ajouter les pièces jointes.");
    } finally {
      setUploadingFiles(false);
    }
  };

  const downloadAttachmentFile = async (attachment) => {
    if (!attachment) return;
    setError(null);
    try {
      const isLocalFile = typeof File !== 'undefined' && attachment instanceof File;
      let blob;

      if (isLocalFile) {
        blob = attachment;
      } else {
        const attachmentId = attachment.id || attachment.attachment_id;
        if (!attachmentId) throw new Error('Identifiant de la pièce jointe introuvable.');
        blob = await piecesService.downloadAttachment(attachmentId, activeEntity?.id);
      }

      const fileName = attachment.name || attachment.file_name || attachment.filename || 'piece-jointe';
      const objectUrl = URL.createObjectURL(blob);
      const downloadLink = document.createElement('a');
      downloadLink.href = objectUrl;
      downloadLink.download = fileName;
      downloadLink.style.display = 'none';
      document.body.appendChild(downloadLink);
      downloadLink.click();
      downloadLink.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch (err) {
      const detail = err?.response?.data?.detail || err?.data?.detail || err?.message;
      setError(detail || "Impossible de télécharger la pièce jointe.");
    }
  };

  const removeAttachment = async (index) => {
    const attachment = attachmentsList[index];
    if (!attachment) return;

    if (pieceId && attachment.id) {
      setUploadingFiles(true);
      setError(null);
      try {
        await piecesService.deleteAttachment(pieceId, attachment.id, activeEntity?.id);
        setAttachmentsList(prev => prev.filter((_, itemIndex) => itemIndex !== index));
        setSuccess('Pièce jointe supprimée.');
      } catch (err) {
        const detail = err?.response?.data?.detail || err?.data?.detail || err?.message;
        setError(detail || "Impossible de supprimer la pièce jointe.");
      } finally {
        setUploadingFiles(false);
      }
      return;
    }

    setAttachmentsList(prev => prev.filter((_, itemIndex) => itemIndex !== index));
    markAsModified();
  };

  const calculateTotals = useCallback(() =>
    formData.lines.reduce((acc, line) => ({
      debit: acc.debit + roundAmount(parseFloat(line.debit) || 0),
      credit: acc.credit + roundAmount(parseFloat(line.credit) || 0)
    }), { debit: 0, credit: 0 }),
  [formData.lines]);

  const formatDateForDisplay = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const getRegistrationDate = (record) => (
    record?.write_date || record?.updated_at || record?.create_date || record?.created_at || ''
  );
  const formatAmount = (amount) => {
    if (!amount && amount !== 0) return '0';
    return Math.round(amount).toLocaleString('fr-FR');
  };

  const getMissingRequiredFields = useCallback(() => {
    const missing = [];
    const motherLines = formData.lines.filter(line => (
      !line.is_counterpart && !line.is_tax_line && !line.is_withholding_counterpart
    ));

    if (!formData.date) missing.push('date comptable');
    if (!formData.journal_id) missing.push('journal');
    const hasAccount = (line) => line.account_id || accounts.some((account) => (
      (line.account_code && String(account.code) === String(line.account_code))
      || (line.account_label && String(account.name || account.label) === String(line.account_label))
    ));
    if (motherLines.length === 0 || motherLines.some(line => !hasAccount(line))) missing.push('compte');
    if (motherLines.length === 0 || motherLines.some(line => !line.name?.trim())) missing.push('libelle');
    if (!motherLines.some(line => (parseFloat(line.debit) || 0) > 0 || (parseFloat(line.credit) || 0) > 0)) missing.push('montant');

    return missing;
  }, [accounts, formData.date, formData.journal_id, formData.lines]);

  const showMissingRequiredFields = useCallback(() => {
    const missing = getMissingRequiredFields();
    if (missing.length === 0) return false;
    setError(`Completez ${missing.join(', ')}.`);
    return true;
  }, [getMissingRequiredFields]);

  const isReadyForValidation = useCallback(() => {
    if (getMissingRequiredFields().length > 0) return false;
    return !formData.lines.some(line => (
      (parseFloat(line.debit) || 0) > 0 && (parseFloat(line.credit) || 0) > 0
    ));
  }, [formData.lines, getMissingRequiredFields]);

  const validateExclusiveDebitCredit = useCallback(() => {
    const invalidLine = formData.lines.findIndex(line => (parseFloat(line.debit) || 0) > 0 && (parseFloat(line.credit) || 0) > 0);
    return invalidLine === -1 ? null : `Ligne ${invalidLine + 1} : débit et crédit ne peuvent pas être renseignés en même temps`;
  }, [formData.lines]);

  const prepareDataForApi = useCallback(() => {
    const toNumber = (v) => { if (!v || v === '') return 0; const clean = typeof v === 'string' ? v.replace(/\s/g, '').replace(',', '.') : v; return roundAmount(parseFloat(clean) || 0); };
    const toPercent = (v) => { if (!v || v === '') return 0; const clean = typeof v === 'string' ? v.replace(/\s/g, '').replace(',', '.') : v; return Math.round((parseFloat(clean) || 0) * 100) / 100; };
    const toInt = (v) => (!v || v === '') ? null : parseInt(v) || null;
    const resolveLineAccountId = (line) => {
      if (/^\d+$/.test(String(line.account_id || '').trim())) return line.account_id;
      const account = accounts.find((item) => (
        (line.account_code && String(item.code) === String(line.account_code))
        || (line.account_label && String(item.name || item.label) === String(line.account_label))
      ));
      return account?.id || null;
    };
    const mainPartner = formData.partner_id ||
      formData.lines.find(l => l.partner_id && !l.is_counterpart && !l.is_tax_line && !l.is_withholding_counterpart)?.partner_id || null;
    return {
      name: formData.name || '', move_type: formData.move_type || 'entry',
      auto_post: formData.auto_post || 'manual', state: formData.state,
      journal_id: toInt(formData.journal_id), date: formData.date, ref: formData.ref || '',
      partner_id: mainPartner, company_id: activeEntity?.id || null, currency_id: toInt(formData.currency_id),
      invoice_date: formData.invoice_date || formData.date, invoice_date_due: formData.invoice_date_due || null,
      invoice_user_id: toInt(formData.invoice_user_id), invoice_origin: formData.invoice_origin || '',
      fiscal_position_id: toInt(formData.fiscal_position_id), payment_reference: formData.payment_reference || '',
      notes: formData.notes || '',
      lines_write: formData.lines.map((line, index) => {
        const payloadLine = {
          name: line.name?.trim() || `Ligne ${index + 1}`, date: formData.date,
          account_id: toInt(resolveLineAccountId(line)), partner_id: toInt(line.partner_id || mainPartner),
          journal_id: toInt(formData.journal_id), company_id: activeEntity?.id || null,
          currency_id: toInt(formData.currency_id),
          tax_ids: line.tax_id && !line.is_counterpart && !line.is_tax_line && !line.is_withholding_counterpart ? [toInt(line.tax_id)] : [],
          tax_repartition_line_id: toInt(line.tax_repartition_line_id),
          tax_base_amount: toNumber(line.tax_base_amount),
          debit: toNumber(line.debit), credit: toNumber(line.credit),
          date_maturity: line.date_maturity || null,
          discount_amount_currency: toNumber(line.discount_amount_currency),
          discount_percentage: toPercent(line.discount_percentage) || null,
          discount_date: line.discount_date || null,
          is_auto_generated: !!(line.is_counterpart || line.is_tax_line || line.is_withholding_counterpart),
          is_partner_counterpart: !!(line.is_counterpart && !line.is_treasury_counterpart),
          is_withholding_counterpart: !!line.is_withholding_counterpart,
          parent_line_ref: line.parent_line_id || null,
        };
        if (line.is_withholding_counterpart) {
          payloadLine.withholding_tax_id = toInt(line.withholding_tax_id);
          payloadLine.withholding_amount = toNumber(line.withholding_amount);
        }
        return payloadLine;
      }),
    };
  }, [formData, activeEntity, accounts]);

  const debugAccountingPayload = useCallback((apiData, action) => {
    if (typeof console === 'undefined') return;
    const lines = apiData?.lines_write || [];
    console.group(`[Piece comptable] Payload avant ${action}`);
    console.table(lines.map((line, index) => ({
      ligne: index + 1,
      compte: line.account_id,
      libelle: line.name,
      debit: line.debit,
      credit: line.credit,
      taxe: line.tax_ids?.join(',') || null,
      is_tax_line: line.is_tax_line,
      is_partner_counterpart: line.is_partner_counterpart,
      is_withholding_counterpart: line.is_withholding_counterpart,
      withholding_tax_id: line.withholding_tax_id,
      withholding_amount: line.withholding_amount,
    })));
    console.log('Payload complet:', apiData);
    console.groupEnd();
  }, []);

  useEffect(() => {
    const handleBeforeUnload = (e) => { if (hasUnsavedChanges) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const handleSave = async (silent = false) => {
    if (!activeEntity) { setError('Vous devez sélectionner une entité'); return false; }
    if (pieceId && formData.state === 'posted') { setError('Impossible de modifier une pièce comptabilisée'); return false; }
    if (showMissingRequiredFields()) return false;
    const exclusiveError = validateExclusiveDebitCredit();
    if (exclusiveError) { setError(exclusiveError); return false; }
    const totals = calculateTotals();
    if ((totals.debit > 0 || totals.credit > 0) && Math.abs(totals.debit - totals.credit) > 0.01) { setError(`Pièce déséquilibrée ! Écart: ${formatAmount(Math.abs(totals.debit - totals.credit))}`); return false; }
    let finalName = formData.name;
    if (!finalName && formData.state === 'draft') { finalName = generateDraftName(); setFormData(prev => ({ ...prev, name: finalName })); }
    setLoading(true); if (!silent) setError(null);
    try {
      const apiData = prepareDataForApi(); apiData.name = finalName;
      debugAccountingPayload(apiData, pieceId ? 'modification' : 'creation');
      let result = pieceId ? await piecesService.update(pieceId, apiData, activeEntity.id) : await piecesService.create(apiData, activeEntity.id);
      if (!result?.id) throw new Error('La création de la pièce a échoué');
      setPieceId(result.id);
      setFormData(prev => ({
        ...prev,
        name: result.name || prev.name,
        registration_date: getRegistrationDate(result) || prev.registration_date,
      }));
      const pendingAttachments = attachmentsList.filter(file => typeof File !== 'undefined' && file instanceof File);
      if (pendingAttachments.length > 0) {
        setUploadingFiles(true);
        const fd = new FormData();
        pendingAttachments.forEach(file => fd.append('attachments', file));
        await piecesService.uploadAttachments(result.id, fd, activeEntity.id);
        const refreshedAttachments = await piecesService.getAttachments(result.id, activeEntity.id);
        setAttachmentsList(Array.isArray(refreshedAttachments) ? refreshedAttachments : []);
      }
      if (!silent) setSuccess('Piece enregistree.');
      setHasUnsavedChanges(false);
      await loadPieceTraceability(result.id);
      return result;
    } catch (err) {
      const msg = err.response?.data || err.data || err.message || 'Erreur inconnue';
      setError(`Échec : ${typeof msg === 'string' ? msg : JSON.stringify(msg)}`); return false;
    } finally { setLoading(false); setUploadingFiles(false); }
  };

  const handleToggleState = async () => {
    if (!activeEntity) { setError('Vous devez sélectionner une entité'); return; }
    const isPosting = formData.state === 'draft';
    if (isPosting && showMissingRequiredFields()) return;
    if (isPosting && !isReadyForValidation()) { setError('Completez les informations requises avant de comptabiliser.'); return; }
    const exclusiveError = validateExclusiveDebitCredit();
    if (exclusiveError) { setError(exclusiveError); return; }
    const totals = calculateTotals();
    if (isPosting && Math.abs(totals.debit - totals.credit) > 0.01) { setError(`Pièce déséquilibrée. Écart: ${formatAmount(Math.abs(totals.debit - totals.credit))}`); return; }
    setLoading(true); setError(null); setSuccess(null);
    try {
      const { apiClient } = await import('../../services');

      if (isPosting) {
        const apiData = { ...prepareDataForApi(), state: 'draft' };
        if (/^BRO-/i.test(String(apiData.name || ''))) apiData.name = '';
        debugAccountingPayload(apiData, 'sauvegarde avant comptabilisation');

        const saved = pieceId
          ? await piecesService.update(pieceId, apiData, activeEntity.id)
          : await piecesService.create(apiData, activeEntity.id);
        if (!saved?.id) throw new Error('Échec sauvegarde avant comptabilisation');

        setPieceId(saved.id);
        const posted = await apiClient.post(`compta/moves/${saved.id}/post/`, {});
        const fresh = await piecesService.getById(saved.id, activeEntity.id);
        setFormData(prev => ({
          ...prev,
          name: fresh?.name || posted?.name || saved.name || prev.name,
          state: fresh?.state || posted?.state || 'posted',
          registration_date: getRegistrationDate(fresh) || getRegistrationDate(posted) || getRegistrationDate(saved) || prev.registration_date,
        }));
      } else {
        const targetId = pieceId;
        if (!targetId) throw new Error('Pièce introuvable');

        const drafted = await apiClient.post(`compta/moves/${targetId}/draft/`, {});
        const fresh = await piecesService.getById(targetId, activeEntity.id);
        setFormData(prev => ({
          ...prev,
          name: fresh?.name || drafted?.name || prev.name,
          state: fresh?.state || drafted?.state || 'draft',
          registration_date: getRegistrationDate(fresh) || getRegistrationDate(drafted) || prev.registration_date,
        }));
      }
      setHasUnsavedChanges(false);
    } catch (err) {
      const msg = err.response?.data || err.data || err.message || 'Erreur inconnue';
      setError(`Échec : ${typeof msg === 'string' ? msg : JSON.stringify(msg)}`);
    } finally { setLoading(false); }
  };

  const confirmDiscardChanges = () => {
    setFormData(initialFormData); setPieceId(null); setHasUnsavedChanges(false);
    setAttachmentsList([]); setShowConfirmDialog(false); navigate('/comptabilite/pieces');
  };

  const confirmTreasuryWarning = () => {
    if (!treasuryWarningDialog) return;

    if (treasuryWarningDialog.lineId) {
      setFormData(prev => ({
        ...prev,
        lines: prev.lines.map(l => l.id === treasuryWarningDialog.lineId
          ? { ...l, account_id: '', account_label: '', account_code: '' }
          : l
        )
      }));
      markAsModified();
    }
    setTreasuryWarningDialog(null);
  };

  const getActionErrorMessage = (err, fallback) => {
    const detail = err?.response?.data?.detail || err?.data?.detail || err?.message;
    return detail || fallback;
  };

  const requireSavedPiece = (actionLabel) => {
    setShowActionsMenu(false);
    if (pieceId) return true;
    setUnsavedPieceAction(actionLabel);
    return false;
  };

  const requestPieceAction = (action, label) => {
    setShowActionsMenu(false);
    if (!pieceId) {
      setUnsavedPieceAction(label.toLowerCase());
      return;
    }
    setPendingPieceAction({ action, label });
  };

  const handleDuplicatePiece = async () => {
    if (!requireSavedPiece('dupliquer cette pièce')) return;
    setLoading(true);
    setError(null);
    try {
      const result = await piecesService.duplicate(pieceId, activeEntity?.id);
      setSuccess(result?.detail || 'Pièce dupliquée avec succès.');
      if (result?.id) navigate(`/comptabilite/pieces/${result.id}`);
    } catch (err) {
      setError(getActionErrorMessage(err, 'Impossible de dupliquer la pièce.'));
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePiece = async () => {
    if (!requireSavedPiece('supprimer cette pièce')) return;
    setLoading(true);
    setError(null);
    try {
      await piecesService.delete(pieceId, activeEntity?.id);
      setHasUnsavedChanges(false);
      setSuccess('Pièce supprimée.');
      navigate('/comptabilite/pieces');
    } catch (err) {
      setError(getActionErrorMessage(err, 'Impossible de supprimer la pièce.'));
    } finally {
      setLoading(false);
    }
  };

  const handleCancelPiece = async () => {
    if (!requireSavedPiece('annuler cette écriture')) return;
    setLoading(true);
    setError(null);
    try {
      const result = await piecesService.cancel(pieceId, activeEntity?.id);
      setFormData(prev => ({
        ...prev,
        state: result?.state || 'cancel',
        registration_date: getRegistrationDate(result) || prev.registration_date,
      }));
      setHasUnsavedChanges(false);
      setSuccess(result?.detail || 'Pièce annulée avec succès.');
      await loadPieceTraceability(pieceId);
    } catch (err) {
      setError(getActionErrorMessage(err, "Impossible d'annuler l'écriture."));
    } finally {
      setLoading(false);
    }
  };

  const handleReturnToDraft = async () => {
    if (!requireSavedPiece('remettre cette pièce en brouillon')) return;
    await handleToggleState();
    await loadPieceTraceability(pieceId);
  };

  const handleReversePiece = async () => {
    if (!requireSavedPiece('extourner cette écriture')) return;
    setLoading(true);
    setError(null);
    try {
      const result = await piecesService.reverse(pieceId, activeEntity?.id);
      setSuccess(result?.detail || 'Extourne créée avec succès.');
      await loadPieceTraceability(pieceId);
      if (result?.id) navigate(`/comptabilite/pieces/${result.id}`);
    } catch (err) {
      setError(getActionErrorMessage(err, "Impossible d'extourner l'écriture."));
    } finally {
      setLoading(false);
    }
  };

  const handlePrintPiece = () => {
    if (!requireSavedPiece('imprimer cette pièce')) return;
    const previousTab = activeTab;
    const traceabilityWasOpen = showTraceabilityPanel;
    let restored = false;
    const restoreScreen = () => {
      if (restored) return;
      restored = true;
      window.removeEventListener('afterprint', restoreScreen);
      setIsPrinting(false);
      setActiveTab(previousTab);
      setShowTraceabilityPanel(traceabilityWasOpen);
    };

    setShowActionsMenu(false);
    setShowColumnsMenu(false);
    setShowTraceabilityPanel(false);
    setActiveTab('ecritures');
    setIsPrinting(true);
    window.addEventListener('afterprint', restoreScreen);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        try {
          window.print();
        } finally {
          window.setTimeout(restoreScreen, 500);
        }
      });
    });
  };

  const isDraft = formData.state === 'draft';
  const totals = calculateTotals();
  const difference = Math.abs(totals.debit - totals.credit).toFixed(2);
  const isBalanced = difference === '0.00' || difference === '0';
  const readyForValidation = isReadyForValidation();
  const lineTableColumns = [
    { key: 'account', label: 'Compte *' },
    { key: 'invoice_number', label: 'Numéro de facture' },
    { key: 'partner', label: 'Partenaire' },
    { key: 'name', label: 'Libellé *' },
    { key: 'debit', label: 'Débit *' },
    { key: 'credit', label: 'Crédit *' },
    ...(visibleColumns.tax ? [{ key: 'tax', label: 'Taxe' }] : []),
    ...(visibleColumns.withholding ? [{ key: 'withholding', label: 'Retenue' }] : []),
    ...(visibleColumns.date_maturity ? [{ key: 'date_maturity', label: 'Date echeance' }] : []),
    ...(visibleColumns.discount_amount ? [{ key: 'discount_amount', label: 'Montant remise' }] : []),
    ...(visibleColumns.discount_percentage ? [{ key: 'discount_percentage', label: '% remise' }] : []),
    ...(visibleColumns.discount_date ? [{ key: 'discount_date', label: 'Date remise' }] : []),
    { key: 'actions', label: '' },
  ];
  const lineColumnStyle = (key) => ({
    width: `${lineColumnWidths[key] || DEFAULT_LINE_COLUMN_WIDTHS[key]}px`,
    minWidth: `${lineColumnWidths[key] || DEFAULT_LINE_COLUMN_WIDTHS[key]}px`,
  });
  
  if (!activeEntity) return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto bg-white border border-gray-300 p-8">
        <div className="bg-yellow-50 border border-yellow-200 rounded p-6 text-center">
          <FiAlertCircle className="text-yellow-600 mx-auto mb-3" size={32} />
          <p className="text-yellow-800 font-medium text-lg mb-3">Aucune entité sélectionnée</p>
        </div>
      </div>
    </div>
  );

  const feedback = (isShowMode && !isDraft && /^Completez\b/i.test(String(error || '')))
    ? null
    : error
    ? { type: 'error', message: error }
    : success
      ? { type: 'success', message: success }
      : null;

  const closeFeedback = () => {
    setError(null);
    setSuccess(null);
  };

  const actionsMenu = (
    <div className="relative z-[90] pointer-events-auto" ref={actionsMenuRef} onMouseDown={(event) => event.stopPropagation()}>
      <Tooltip text="Menu des actions">
        <button ref={actionsMenuButtonRef} type="button" onClick={toggleActionsMenu} className="flex h-8 items-center gap-1 border border-gray-300 px-3 text-xs text-gray-700 transition-all duration-200 hover:scale-105 hover:bg-gray-50 hover:shadow-md active:scale-95">
          <FiSettings size={12} /><span>Actions</span>
        </button>
      </Tooltip>
      {showActionsMenu && (
        <div style={actionsMenuStyle} className="fixed border border-gray-300 bg-white shadow-lg">
          {isDraft ? (
            <>
              <button type="button" onClick={() => requestPieceAction('duplicate', 'Dupliquer la pièce')} disabled={loading} className="flex w-full items-center gap-2 border-b border-gray-100 px-3 py-2 text-left text-xs transition-all duration-200 hover:bg-gray-50 hover:pl-4 disabled:cursor-not-allowed disabled:opacity-50"><FiCopy size={12} /> Dupliquer</button>
              <button type="button" onClick={() => requestPieceAction('delete', 'Supprimer la pièce')} disabled={loading} className="flex w-full items-center gap-2 border-b border-gray-100 px-3 py-2 text-left text-xs text-red-700 transition-all duration-200 hover:bg-red-50 hover:pl-4 disabled:cursor-not-allowed disabled:opacity-50"><FiTrash2 size={12} /> Supprimer</button>
            </>
          ) : formData.state === 'posted' ? (
            <>
              <button type="button" onClick={() => requestPieceAction('cancel', "Annuler l'écriture")} disabled={loading} className="flex w-full items-center gap-2 border-b border-gray-100 px-3 py-2 text-left text-xs text-red-700 transition-all duration-200 hover:bg-red-50 hover:pl-4 disabled:cursor-not-allowed disabled:opacity-50"><FiX size={12} /> Annuler l'écriture</button>
              <button type="button" onClick={() => requestPieceAction('draft', 'Remettre en brouillon')} disabled={loading} className="flex w-full items-center gap-2 border-b border-gray-100 px-3 py-2 text-left text-xs transition-all duration-200 hover:bg-gray-50 hover:pl-4 disabled:cursor-not-allowed disabled:opacity-50"><FiRotateCcw size={12} /> Remettre en brouillon</button>
              <button type="button" onClick={() => requestPieceAction('reverse', "Extourner l'écriture")} disabled={loading} className="flex w-full items-center gap-2 border-b border-gray-100 px-3 py-2 text-left text-xs transition-all duration-200 hover:bg-gray-50 hover:pl-4 disabled:cursor-not-allowed disabled:opacity-50"><FiRotateCcw size={12} /> Extourner l'écriture</button>
            </>
          ) : null}
          <button type="button" onClick={handlePrintPiece} disabled={loading} className="flex w-full items-center gap-2 border-b border-gray-100 px-3 py-2 text-left text-xs transition-all duration-200 hover:bg-gray-50 hover:pl-4 disabled:cursor-not-allowed disabled:opacity-50"><FiPrinter size={12} /> Imprimer</button>
          <button type="button" onClick={() => { setShowTraceabilityPanel(previous => !previous); setShowActionsMenu(false); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition-all duration-200 hover:bg-gray-50 hover:pl-4"><FiInfo size={12} /> {showTraceabilityPanel ? 'Masquer la tracabilite' : 'Afficher la tracabilite'}</button>
        </div>
      )}
    </div>
  );

  const process = (
    <div className="border-b border-gray-300 px-4 py-3">
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          {isDraft ? (
            <Tooltip text={!readyForValidation ? 'Remplissez journal, compte, libellé et montant' : 'Valider la pièce'}>
              <button type="button" onClick={handleToggleState} disabled={loading} className={`h-8 px-3 text-xs font-medium border transition-all flex items-center ${readyForValidation ? 'bg-purple-600 text-white border-purple-600 hover:bg-purple-700 cursor-pointer' : 'bg-gray-100 text-gray-600 border-gray-300 hover:border-purple-400 hover:bg-purple-50 hover:text-purple-700 cursor-pointer'}`}>
                Comptabiliser
              </button>
            </Tooltip>
          ) : (
            <Tooltip text="Remettre cette pièce en brouillon">
              <button type="button" onClick={() => requestPieceAction('draft', 'Remettre en brouillon')} disabled={loading} className="h-8 px-3 text-xs font-medium border border-purple-600 bg-white text-purple-700 transition-all hover:bg-purple-50 disabled:cursor-not-allowed disabled:opacity-50">
                Remettre en brouillon
              </button>
            </Tooltip>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <div className={`h-8 px-3 text-xs font-medium border flex items-center ${isDraft ? 'bg-yellow-100 text-yellow-700 border-yellow-300' : 'bg-gray-100 text-gray-500 border-gray-300'}`}>Brouillon</div>
          <div className={`h-8 px-3 text-xs font-medium border flex items-center ${!isDraft ? 'bg-green-100 text-green-700 border-green-300' : 'bg-gray-100 text-gray-500 border-gray-300'}`}>Comptabilisé</div>
        </div>
      </div>
    </div>
  );

  const traceabilityContent = (
    <div className="px-4 py-3">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-medium text-gray-700">Activité liée à la pièce</span>
        <span className="text-[11px] text-gray-500">{traceabilityLogs.length} événement(s)</span>
      </div>
      {traceabilityLoading ? <div className="border border-gray-200 bg-white px-3 py-4 text-center text-xs text-gray-500">Chargement de la traçabilité...</div> : traceabilityLogs.length > 0 ? (
        <div className="space-y-2 pr-1">
          {traceabilityLogs.map((log, index) => (
            <div key={log.id || index} className="border border-gray-200 bg-white px-3 py-2">
              <div className="text-xs font-medium text-gray-900">{log.action || 'Modification'}</div>
              <div className="mt-1 text-[11px] text-gray-500">{[log.object_label || log.move_name || log.name, log.description].filter(Boolean).join(' - ')}</div>
              <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-gray-500"><span className="truncate">Par {log.user_label || log.user_name || log.user?.username || 'Utilisateur'}</span><span className="whitespace-nowrap">{log.created_at || log.date || ''}</span></div>
            </div>
          ))}
        </div>
      ) : <div className="border border-gray-200 bg-white px-3 py-5 text-center"><FiClock className="mx-auto mb-2 h-7 w-7 text-gray-400" /><div className="text-xs text-gray-600">Aucune traçabilité disponible</div><div className="mt-1 text-[11px] text-gray-500">Les actions sur cette pièce apparaîtront ici.</div></div>}
    </div>
  );

  return (
    <>
      <style>{`
        @media print {
          @page { size: A4 landscape; margin: 8mm; }

          html, body, #root {
            height: auto !important;
            min-height: 0 !important;
            overflow: visible !important;
            background: #fff !important;
          }

          body * { visibility: hidden !important; }
          .piece-print-root, .piece-print-root * { visibility: visible !important; }

          .piece-print-root {
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            height: auto !important;
            min-height: 0 !important;
            margin: 0 !important;
            overflow: visible !important;
            background: #fff !important;
          }

          .piece-print-root > section,
          .piece-print-root section,
          .piece-print-root main,
          .piece-print-root .unified-form-scroll {
            height: auto !important;
            min-height: 0 !important;
            max-height: none !important;
            overflow: visible !important;
          }

          .piece-print-root .grid {
            grid-template-columns: minmax(0, 1fr) !important;
          }

          .piece-print-root aside,
          .piece-print-root header > div > div:last-child,
          .piece-print-root .piece-print-hide {
            display: none !important;
          }

          .piece-print-root header {
            position: static !important;
            padding: 2mm 0 3mm !important;
          }

          .piece-print-root .piece-lines-scroll {
            max-height: none !important;
            height: auto !important;
            overflow: visible !important;
            margin: 0 !important;
          }

          .piece-print-root .piece-lines-scroll table {
            width: 100% !important;
            min-width: 0 !important;
            table-layout: fixed !important;
          }

          .piece-print-root .piece-lines-scroll col {
            width: auto !important;
            min-width: 0 !important;
            max-width: none !important;
          }

          .piece-print-root .piece-lines-scroll thead {
            display: table-header-group !important;
            position: static !important;
          }

          .piece-print-root .piece-lines-scroll tfoot {
            display: table-row-group !important;
          }

          .piece-print-root .piece-lines-scroll tr {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }

          .piece-print-root .piece-lines-scroll th,
          .piece-print-root .piece-lines-scroll td {
            padding: 1.2mm 0.8mm !important;
            font-size: 7pt !important;
            line-height: 1.2 !important;
            white-space: normal !important;
            overflow: visible !important;
            text-overflow: clip !important;
            overflow-wrap: anywhere !important;
            word-break: break-word !important;
          }

          .piece-print-root .piece-lines-scroll input,
          .piece-print-root .piece-lines-scroll select,
          .piece-print-root .piece-lines-scroll textarea {
            width: 100% !important;
            height: auto !important;
            min-height: 0 !important;
            padding: 0 !important;
            border: 0 !important;
            color: #111827 !important;
            background: transparent !important;
            box-shadow: none !important;
            opacity: 1 !important;
            font-size: 7pt !important;
            line-height: 1.2 !important;
          }

          .piece-print-root .piece-lines-scroll th:last-child,
          .piece-print-root .piece-lines-scroll td:last-child {
            display: none !important;
          }
        }
      `}</style>
      {treasuryWarningDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-[10000]">
          <div className="bg-white border border-gray-300 shadow-xl rounded-sm w-full max-w-md mx-4">
            <div className="px-4 py-3 border-b border-gray-200 flex items-center gap-2">
              <FiAlertCircle className="text-yellow-600" size={18} />
              <h3 className="text-sm font-semibold text-gray-900">Compte non autorise</h3>
            </div>
            <div className="px-4 py-4">
              <p className="text-sm text-gray-700">{treasuryWarningDialog.message}</p>
            </div>
            <div className="px-4 py-3 border-t border-gray-200 flex justify-end">
              <button
                type="button"
                onClick={confirmTreasuryWarning}
                className="h-8 px-4 bg-purple-600 text-white text-xs font-medium hover:bg-purple-700"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
      <UnifiedFormPage
        className="piece-print-root"
        title="Pièces comptables"
        recordLabel={formData.name || (isDraft ? 'Brouillon' : 'Comptabilisée')}
        pageLabel={isShowMode ? 'Détail de la pièce comptable' : "Création d'une pièce comptable"}
        mode={isShowMode ? 'show' : 'create'}
        fallbackPath="/comptabilite/pieces"
        primaryAction={isPrinting ? null : { label: 'Nouveau', icon: <FiPlus size={12} />, path: '/comptabilite/pieces/create', state: { newPiece: Date.now() } }}
        headerActions={isPrinting ? [] : [{
          id: 'entries',
          label: 'Ecritures comptables',
          icon: <FiBookOpen size={12} />,
          path: pieceId ? `/comptabilite/ecritures?move_id=${encodeURIComponent(pieceId)}` : undefined,
          disabled: !pieceId,
          title: pieceId ? 'Voir les écritures de cette pièce' : "Enregistrez d'abord la pièce pour consulter ses écritures",
        }]}
        actionsMenu={isPrinting ? null : actionsMenu}
        onSave={isPrinting ? undefined : () => handleSave(false)}
        saveLabel="Enregistrer"
        saving={loading}
        saveDisabled={!isDraft}
        autoReturnAfterSave
        hasUnsavedChanges={hasUnsavedChanges}
        exitSaveLabel="Enregistrer"
        rememberForm={false}
        feedback={isPrinting ? null : feedback}
        onDismissFeedback={closeFeedback}
        messageDuration={15000}
        process={isPrinting ? null : process}
        traceability={isPrinting ? undefined : { open: showTraceabilityPanel, onOpen: () => setShowTraceabilityPanel(true), onClose: () => setShowTraceabilityPanel(false), title: 'Traçabilité', content: traceabilityContent }}
      >

        {/* Ancien en-tete conserve uniquement pour compatibilite, le modele commun rend le nouvel en-tete. */}
        <div className="hidden border-b border-gray-300 px-4 py-3">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-start gap-3">
              <Tooltip text="Créer une nouvelle pièce">
                <button onClick={() => { if (hasUnsavedChanges) setShowConfirmDialog(true); else navigate('/comptabilite/pieces/create'); }} className="h-12 px-4 bg-purple-600 text-white text-sm hover:bg-purple-700 transition-all flex items-center gap-1 font-medium">
                  <FiPlus size={16} /><span>Nouveau</span>
                </button>
              </Tooltip>
              <div className="flex flex-col h-12 justify-center">
                <div className="text-lg font-bold text-gray-900 cursor-pointer hover:text-purple-600 transition-colors" onClick={() => { if (hasUnsavedChanges) setShowConfirmDialog(true); else navigate('/comptabilite/pieces'); }}>Pièces comptables</div>
                <span className={`px-2 py-0.5 text-xs font-medium w-fit ${isDraft ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>{isDraft ? 'Brouillon' : 'Comptabilisé'}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative" ref={actionsMenuRef}>
                <Tooltip text="Menu des actions">
                  <button onClick={() => setShowActionsMenu(!showActionsMenu)} className="h-8 px-3 border border-gray-300 text-gray-700 text-xs hover:bg-gray-50 flex items-center gap-1">
                    <FiSettings size={12} /><span>Actions</span>
                  </button>
                </Tooltip>
                {showActionsMenu && (
                  <div className="absolute right-0 mt-1 w-48 bg-white border border-gray-300 shadow-lg rounded-sm z-50">
                    <button onClick={() => setShowActionsMenu(false)} className="w-full px-3 py-2 text-xs text-left hover:bg-gray-50 flex items-center gap-2 border-b border-gray-100"><FiCopy size={12} /> Dupliquer</button>
                    <button onClick={() => setShowActionsMenu(false)} className="w-full px-3 py-2 text-xs text-left hover:bg-gray-50 flex items-center gap-2 border-b border-gray-100"><FiTrash2 size={12} /> Supprimer</button>
                    <button onClick={() => setShowActionsMenu(false)} className="w-full px-3 py-2 text-xs text-left hover:bg-gray-50 flex items-center gap-2"><FiRotateCcw size={12} /> Extourné</button>
                  </div>
                )}
              </div>
              <Tooltip text="Enregistrer">
                <button onClick={() => handleSave().then(ok => { if (ok) navigate('/comptabilite/pieces'); })} disabled={loading || !isDraft} className="w-8 h-8 rounded-full bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center">
                  <FiUploadCloud size={16} />
                </button>
              </Tooltip>
              <Tooltip text="Annuler">
                <button onClick={() => setShowConfirmDialog(true)} className="w-8 h-8 rounded-full bg-black text-white hover:bg-gray-800 flex items-center justify-center">
                  <FiX size={16} />
                </button>
              </Tooltip>
            </div>
          </div>
        </div>

        {/* Ancienne barre conservee hors affichage, le processus est rendu par UnifiedFormPage. */}
        <div className="hidden border-b border-gray-300 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Tooltip text={!readyForValidation ? "Remplissez journal, compte, libellé et montant" : isDraft ? "Valider la pièce" : "Déjà comptabilisé"}>
                <button type="button" onClick={handleToggleState} disabled={loading || !isDraft || !readyForValidation} className={`h-8 px-3 text-xs font-medium border transition-all flex items-center ${isDraft && readyForValidation ? 'bg-purple-600 text-white border-purple-600 hover:bg-purple-700 cursor-pointer' : 'bg-gray-100 text-gray-500 border-gray-300 cursor-not-allowed'}`}>
                  Comptabiliser
                </button>
              </Tooltip>
              {error ? (<div className="flex items-center gap-1 text-xs text-red-600"><FiAlertCircle size={14} /><span>{error}</span></div>)
               : success ? (<div className="flex items-center gap-1 text-xs text-green-600"><FiCheck size={14} /><span>{success}</span></div>)
               : !readyForValidation && isDraft ? (<div className="flex items-center gap-1 text-xs text-amber-600"><FiInfo size={14} /><span>Complétez journal, compte, libellé et montant</span></div>)
               : null}
            </div>
            <div className="flex items-center gap-2">
              <div className={`h-8 px-3 text-xs font-medium border flex items-center ${isDraft ? 'bg-yellow-100 text-yellow-700 border-yellow-300' : 'bg-gray-100 text-gray-500 border-gray-300'}`}>Brouillon</div>
              <div className={`h-8 px-3 text-xs font-medium border flex items-center ${!isDraft ? 'bg-green-100 text-green-700 border-green-300' : 'bg-gray-100 text-gray-500 border-gray-300'}`}>Comptabilisé</div>
            </div>
          </div>
          <div className="mt-2 ml-1">
            <span className="text-xs text-gray-600 font-medium">N° {formData.name || (formData.journal_id ? 'Sera généré au passage en comptabilisé' : 'Sélectionnez un journal')}</span>
          </div>
        </div>

        {hasUnsavedChanges && <div className="hidden px-4 py-1 bg-blue-50 text-blue-700 text-xs border-b border-blue-200">Modifications non sauvegardées</div>}

        {/* CHAMPS ENTÊTE */}
        <div className="px-4 py-3 border-b border-gray-300">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center" style={{ height: '26px' }}>
                <label className="text-xs text-gray-700 min-w-[140px] font-medium">Date comptable *</label>
                <input type="date" value={formData.date} onChange={(e) => handleChange('date', e.target.value)} disabled={!isDraft} required className="flex-1 px-2 py-1 border border-gray-300 text-xs ml-2" style={{ height: '26px' }} />
              </div>
              <div className="flex items-center" style={{ height: '26px' }}>
                <label className="text-xs text-gray-700 min-w-[140px] font-medium">Référence</label>
                <input type="text" value={formData.ref} onChange={(e) => handleChange('ref', e.target.value)} disabled={!isDraft} className="flex-1 px-2 py-1 border border-gray-300 text-xs ml-2" style={{ height: '26px' }} placeholder="SCMI/002/2026" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center" style={{ height: '26px' }}>
                <label className="text-xs text-gray-700 min-w-[140px] font-medium">Date enregistrement</label>
                <div className="flex-1 px-2 py-1 border border-gray-300 bg-gray-50 text-xs text-gray-900 ml-2 flex items-center" style={{ height: '26px' }}>{formatDateForDisplay(formData.registration_date)}</div>
              </div>
              <div className="flex items-center" style={{ height: '26px' }}>
                <label className="text-xs text-gray-700 min-w-[140px] font-medium">Journal *</label>
                <div className="flex-1 ml-2 border border-gray-300">
                  <AutocompleteInput value={formData.journal_label} selectedId={formData.journal_id} onChange={(text) => handleChange('journal_label', text)} onSelect={handleJournalSelection} options={journals} getOptionLabel={(o) => `${o.code} - ${o.name}`} placeholder="Sélectionner un journal" required={true} disabled={!isDraft} onCreateOption={(query) => navigateToContextCreate('journal', query)} createOptionLabel="Créer le journal" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ONGLETS */}
        <div className="piece-print-hide border-b border-gray-300">
          <div className="px-4 flex">
            {['ecritures', 'notes', 'pieces-jointes'].map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 text-xs font-medium border-b-2 transition-all ${activeTab === tab ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                {tab === 'ecritures' ? 'Écritures comptables' : tab === 'notes' ? 'Notes' : 'Pièces jointes'}
              </button>
            ))}
          </div>
        </div>

        <div className="p-4">

          {/* ONGLET ÉCRITURES */}
          {activeTab === 'ecritures' && (
            <>
              <style>{`
                .piece-lines-scroll { scrollbar-width: thin; scrollbar-color: #e2e8f0 transparent; }
                .piece-lines-scroll::-webkit-scrollbar { width: 1px; height: 1px; }
                .piece-lines-scroll::-webkit-scrollbar-track { background: transparent; }
                .piece-lines-scroll::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 999px; }
                .piece-lines-scroll::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
              `}</style>
              <div className="piece-lines-scroll mb-3 max-h-[52vh] overflow-auto" ref={tableContainerRef}>
                <table className="table-fixed border-collapse" style={{ minWidth: `${lineTableColumns.reduce((sum, column) => sum + (lineColumnWidths[column.key] || DEFAULT_LINE_COLUMN_WIDTHS[column.key]), 0)}px` }}>
                  <colgroup>
                    {lineTableColumns.map(column => <col key={column.key} style={lineColumnStyle(column.key)} />)}
                  </colgroup>
                  <thead className="sticky top-0 z-10">
                    {false && <tr className="bg-gray-100">
                      {['Compte *', 'Numero de facture', 'Partenaire', 'Libellé *', 'Débit', 'Crédit'].map((h, i) => (
                        <th key={i} className="border border-gray-300 px-2 py-1.5 text-xs font-medium text-gray-700 text-left">{h}</th>
                      ))}
                      {visibleColumns.tax && <th className="border border-gray-300 px-2 py-1.5 text-xs font-medium text-gray-700 text-left">Taxe</th>}
                      {visibleColumns.withholding && <th className="border border-gray-300 px-2 py-1.5 text-xs font-medium text-gray-700 text-left">Retenue</th>}
                      {visibleColumns.date_maturity && <th className="border border-gray-300 px-2 py-1.5 text-xs font-medium text-gray-700 text-left">Date échéance</th>}
                      {visibleColumns.discount_amount && <th className="border border-gray-300 px-2 py-1.5 text-xs font-medium text-gray-700 text-left">Montant remise</th>}
                      {visibleColumns.discount_percentage && <th className="border border-gray-300 px-2 py-1.5 text-xs font-medium text-gray-700 text-left">% remise</th>}
                      {visibleColumns.discount_date && <th className="border border-gray-300 px-2 py-1.5 text-xs font-medium text-gray-700 text-left">Date remise</th>}
                      <th className="border border-gray-300 px-2 py-1.5 text-xs font-medium text-gray-700 text-left w-[40px]" ref={columnsMenuRef}>
                        <button ref={columnsMenuButtonRef} type="button" onClick={toggleColumnsMenu} className="w-full text-left hover:text-purple-600">•••</button>
                      </th>
                    </tr>}
                    <tr className="bg-gray-100">
                      {lineTableColumns.map(column => (
                        <th key={column.key} ref={column.key === 'actions' ? columnsMenuRef : undefined} className="relative border border-gray-300 px-2 py-1.5 text-left text-xs font-medium text-gray-700">
                          {column.key === 'actions' ? (
                            <button ref={columnsMenuButtonRef} type="button" onClick={toggleColumnsMenu} className="w-full text-left hover:text-purple-600">...</button>
                          ) : column.label}
                          <span
                            role="separator"
                            aria-label={`Redimensionner ${column.label}`}
                            onMouseDown={(event) => startLineColumnResize(event, column.key)}
                            className="absolute right-0 top-0 z-20 h-full w-1 cursor-col-resize select-none hover:bg-purple-400"
                          />
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {formData.lines.map((line) => {
                      const isAutoLine = line.is_counterpart || line.is_tax_line || line.is_withholding_counterpart;
                      const rowBg = line.is_counterpart ? 'bg-purple-50' : line.is_tax_line ? 'bg-blue-50' : line.is_withholding_counterpart ? 'bg-orange-50' : '';
                      const accountNature = getAccountNature(line.account_code);
                      const autoLineLabel = line.is_treasury_counterpart
                        ? 'Contrepartie tresorerie'
                        : line.is_counterpart
                          ? 'Contrepartie partenaire'
                          : line.is_tax_line
                            ? (line.tax_distribution_role?.startsWith('tax-source-') ? 'De la taxe' : line.tax_distribution_role?.startsWith('tax-distribution-') ? 'Repartition de la taxe' : 'TVA auto')
                            : 'Contrepartie retenue';
                      return (
                        <tr key={line.id} data-line-id={line.id} className={`hover:bg-gray-50 ${rowBg}`}>
                          <td className="border border-gray-300 p-1" style={lineColumnStyle('account')}>
                            <div className="flex items-center">
                              <AutocompleteInput 
                                value={line.account_label} 
                                selectedId={line.account_id} 
                                onChange={(text) => handleLineChange(line.id, 'account_label', text)} 
                                onSelect={(id, label) => handleAccountSelection(line.id, id, label)} 
                                options={accounts} 
                                getOptionLabel={(o) => `${o.code || o.account_code || o.number || ''}${(o.code || o.account_code || o.number) && (o.name || o.label) ? ' - ' : ''}${o.name || o.label || ''}`} 
                                title={line.account_label}
                                placeholder="Compte" 
                                required={true} 
                                disabled={!isDraft} 
                                onCreateOption={(query) => navigateToContextCreate('account', query, line.id)}
                                createOptionLabel="Créer le compte"
                              />
                              {line.account_code && accountNature !== 'other' && (
                                <span className="ml-1 text-sm" title={accountNature === 'charge' ? 'Compte de Charge' : 'Compte de Produit'}>
                                  {accountNature === 'charge' ? '⬇️' : '⬆️'}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="border border-gray-300 p-1" style={lineColumnStyle('invoice_number')}>
                            <input
                              type="text"
                              value={line.invoice_number || ''}
                              onChange={(e) => handleLineChange(line.id, 'invoice_number', e.target.value)}
                              className="w-full px-2 py-1 border-0 text-xs focus:ring-1 focus:ring-purple-500"
                               style={{ height: '26px' }}
                               title={line.invoice_number || ''}
                               placeholder="Numero de facture"
                              disabled={isAutoLine || !isDraft}
                            />
                          </td>
                          <td className="border border-gray-300 p-1" style={lineColumnStyle('partner')}>
                            <AutocompleteInput 
                              value={line.partner_label} 
                              selectedId={line.partner_id} 
                              onChange={(text) => handleLineChange(line.id, 'partner_label', text)} 
                              onSelect={(id, label) => handlePartnerSelection(line.id, id, label)} 
                               options={partners} 
                               getOptionLabel={(o) => o.nom || o.name || o.raison_sociale || ''} 
                               title={line.partner_label}
                               placeholder="Partenaire" 
                              disabled={isAutoLine || !isDraft} 
                              onCreateOption={(query) => navigateToContextCreate('partner', query, line.id)}
                              createOptionLabel="Créer le partenaire"
                            />
                          </td>
                          <td className="border border-gray-300 p-1" style={lineColumnStyle('name')}>
                            <input 
                              type="text" 
                              value={line.name} 
                              onChange={(e) => handleLineChange(line.id, 'name', e.target.value)} 
                              className="w-full px-2 py-1 border-0 text-xs focus:ring-1 focus:ring-blue-500" 
                               style={{ height: '26px' }} 
                               title={line.name || ''}
                               placeholder="Libellé" 
                              required
                              disabled={!isDraft} 
                            />
                          </td>
                          <td className="border border-gray-300 p-1" style={lineColumnStyle('debit')}>
                            <AmountInput 
                              value={line.debit} 
                              onChange={(v) => handleAmountChange(line.id, 'debit', v)} 
                              placeholder="0" 
                              disabled={!isDraft} 
                            />
                          </td>
                          <td className="border border-gray-300 p-1" style={lineColumnStyle('credit')}>
                            <AmountInput 
                              value={line.credit} 
                              onChange={(v) => handleAmountChange(line.id, 'credit', v)} 
                              onKeyDown={(e) => handleColumnTab(e, line, 'credit')}
                              placeholder="0" 
                              disabled={!isDraft} 
                            />
                          </td>
                          {visibleColumns.tax && <td className="border border-gray-300 p-1" style={lineColumnStyle('tax')}>
                            {!isAutoLine ? (
                              <AutocompleteInput 
                                value={line.tax_label} 
                                selectedId={line.tax_id} 
                                onChange={(text) => handleLineChange(line.id, 'tax_label', text)} 
                                onSelect={(id, label) => handleTaxSelection(line.id, id, label)} 
                                options={taxes} 
                                getOptionLabel={formatRateOptionLabel}
                                displayValue={formatCompactRateLabel(line.tax_label, 'tax')}
                                title={line.tax_label || ''}
                                placeholder="TVA..." 
                                onKeyDown={(e) => handleColumnTab(e, line, 'tax')}
                                disabled={!isDraft} 
                                onCreateOption={(query) => navigateToContextCreate('tax', query, line.id)}
                                createOptionLabel="Créer la taxe"
                              />
                            ) : (
                              <div className="px-2 text-xs text-gray-400 italic flex items-center truncate" title={autoLineLabel} style={{ height: '26px' }}>
                                {line.is_tax_line
                                  ? (line.tax_distribution_role?.startsWith('tax-source-') ? 'De la taxe' : line.tax_distribution_role?.startsWith('tax-distribution-') ? 'Répartition de la taxe' : 'TVA auto')
                                  : line.is_withholding_counterpart ? '—' : line.is_treasury_counterpart ? 'Trésorerie auto' : 'Contrepartie'}
                              </div>
                            )}
                          </td>}
                          {visibleColumns.withholding && <td className="border border-gray-300 p-1" style={lineColumnStyle('withholding')}>
                            {!isAutoLine ? (
                              <AutocompleteInput 
                                value={line.withholding_tax_label || ''} 
                                selectedId={line.withholding_tax_id} 
                                onChange={(text) => handleLineChange(line.id, 'withholding_tax_label', text)} 
                                onSelect={(id, label) => handleWithholdingSelection(line.id, id, label)} 
                                options={withholdingTaxes.filter(wt => !line.partner_id || !wt.partner_ids?.length || wt.partner_ids.some(p => p.id === line.partner_id))} 
                                getOptionLabel={formatRateOptionLabel}
                                displayValue={formatCompactRateLabel(line.withholding_tax_label, 'withholding')}
                                title={line.withholding_tax_label || ''}
                                placeholder="Retenue..." 
                                onKeyDown={(e) => handleColumnTab(e, line, 'withholding')}
                                disabled={!isDraft} 
                                onCreateOption={(query) => navigateToContextCreate('withholding', query, line.id)}
                                createOptionLabel="Créer la retenue"
                              />
                            ) : (
                              <div className="px-2 text-xs text-gray-400 italic flex items-center truncate" title={line.is_withholding_counterpart ? 'Retenue auto' : ''} style={{ height: '26px' }}>
                                {line.is_withholding_counterpart ? 'Retenue auto' : '—'}
                              </div>
                            )}
                          </td>}
                          {visibleColumns.date_maturity && <td className="border border-gray-300 p-1" style={lineColumnStyle('date_maturity')}>
                            <input 
                               type="date" 
                               value={line.date_maturity} 
                               title={line.date_maturity || ''}
                              onChange={(e) => handleLineChange(line.id, 'date_maturity', e.target.value)} 
                              onKeyDown={(e) => handleColumnTab(e, line, 'date_maturity')}
                              className="w-full px-2 py-1 border-0 text-xs focus:ring-1 focus:ring-blue-500" 
                              style={{ height: '26px' }} 
                              disabled={!isDraft} 
                            />
                          </td>}
                          {visibleColumns.discount_amount && <td className="border border-gray-300 p-1" style={lineColumnStyle('discount_amount')}>
                            <AmountInput 
                              value={line.discount_amount_currency} 
                              onChange={(v) => handleLineChange(line.id, 'discount_amount_currency', v)} 
                              onKeyDown={(e) => handleColumnTab(e, line, 'discount_amount')}
                              placeholder="0" 
                              disabled={isAutoLine || !isDraft} 
                            />
                          </td>}
                          {visibleColumns.discount_percentage && <td className="border border-gray-300 p-1" style={lineColumnStyle('discount_percentage')}>
                            <input 
                               type="number" 
                              step="0.01" 
                              min="0" 
                              max="100" 
                               value={line.discount_percentage || ''} 
                               title={line.discount_percentage ? `${line.discount_percentage}%` : ''}
                              onChange={(e) => handleLineChange(line.id, 'discount_percentage', e.target.value)} 
                              onKeyDown={(e) => handleColumnTab(e, line, 'discount_percentage')}
                              className="w-full px-2 py-1 border-0 text-xs text-right focus:ring-1 focus:ring-blue-500" 
                              style={{ height: '26px' }} 
                              placeholder="0" 
                              disabled={isAutoLine || !isDraft} 
                            />
                          </td>}
                          {visibleColumns.discount_date && <td className="border border-gray-300 p-1" style={lineColumnStyle('discount_date')}>
                            <input 
                               type="date" 
                               value={line.discount_date || ''} 
                               title={line.discount_date || ''}
                              onChange={(e) => handleLineChange(line.id, 'discount_date', e.target.value)} 
                              onKeyDown={(e) => handleColumnTab(e, line, 'discount_date')} 
                              className="w-full px-2 py-1 border-0 text-xs focus:ring-1 focus:ring-blue-500" 
                              style={{ height: '26px' }} 
                              disabled={isAutoLine || !isDraft} 
                            />
                          </td>}
                          <td className="border border-gray-300 p-1" style={lineColumnStyle('actions')}>
                            {isAutoLine ? (
                              <div className="flex items-center justify-center gap-1">
                                <Tooltip text={autoLineLabel} position="left">
                                  <FiZap size={14} className={line.is_counterpart ? 'text-purple-400' : line.is_tax_line ? 'text-blue-400' : 'text-orange-400'} />
                                </Tooltip>
                                <button 
                                  onClick={() => removeLine(line.id)} 
                                  tabIndex="-1" 
                                  disabled={!isDraft} 
                                  className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-red-600 transition-colors disabled:opacity-30"
                                >
                                  <FiTrash2 size={12} />
                                </button>
                              </div>
                            ) : (
                              <button 
                                onClick={() => removeLine(line.id)} 
                                tabIndex="-1" 
                                disabled={!isDraft} 
                                className="w-full flex items-center justify-center p-1 text-gray-400 hover:text-red-600 transition-colors disabled:opacity-30" 
                                style={{ height: '26px' }}
                              >
                                <FiTrash2 size={14} />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="border-0 bg-transparent">
                    <tr>
                      <td colSpan={4} />
                      <td className="px-2 py-2 text-right text-sm font-semibold text-gray-900 whitespace-nowrap">
                        {formatAmount(totals.debit)} XOF
                      </td>
                      <td className="px-2 py-2 text-right text-sm font-semibold text-gray-900 whitespace-nowrap">
                        {formatAmount(totals.credit)} XOF
                      </td>
                      {visibleColumns.tax && <td />}
                      {visibleColumns.withholding && <td />}
                      {visibleColumns.date_maturity && <td />}
                      {visibleColumns.discount_amount && <td />}
                      {visibleColumns.discount_percentage && <td />}
                      {visibleColumns.discount_date && <td />}
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
              {showColumnsMenu && (
                <div ref={columnsMenuPopupRef} className="w-44 bg-white border border-gray-300 shadow-lg border-t-0" style={columnsMenuStyle}>
                  {OPTIONAL_COLUMNS.map(column => (
                    <label key={column.key} className="flex items-center gap-2 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 cursor-pointer">
                      <input type="checkbox" checked={!!visibleColumns[column.key]} onChange={() => toggleOptionalColumn(column.key)} className="h-3 w-3" />
                      <span>{column.label}</span>
                    </label>
                  ))}
                </div>
              )}

              <div className="piece-print-hide mb-3 flex items-center gap-4">
                <Tooltip text="Ajouter une ligne d'écriture">
                  <button onClick={addLine} disabled={!isDraft} className="h-8 px-3 bg-purple-600 text-white text-xs hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-1">
                    <FiPlus size={12} /><span>Ajouter une ligne</span>
                  </button>
                </Tooltip>
                {!isBalanced && totals.debit > 0 && (
                  <div className="text-xs text-yellow-700 bg-yellow-50 px-3 py-1 rounded flex items-center gap-1 border border-yellow-200">
                    <FiAlertCircle size={12} />⚠ Différence de {formatAmount(difference)} XOF
                  </div>
                )}
                {isBalanced && totals.debit > 0 && (
                  <div className="text-xs text-green-700 bg-green-50 px-3 py-1 rounded flex items-center gap-1 border border-green-200">
                    <FiCheck size={12} />✓ Écriture équilibrée
                  </div>
                )}
              </div>

            </>
          )}

          {/* ONGLET NOTES */}
          {activeTab === 'notes' && (
            <div className="border border-gray-300">
              <div className="grid grid-cols-4 bg-gray-100 border-b border-gray-300">
                {['Devise', 'Position fiscale', 'Mode de comptabilisation', 'Entité'].map((h, i) => (
                  <div key={i} className={`${i < 3 ? 'border-r border-gray-300' : ''} px-2 py-1.5 text-xs font-medium text-gray-700`}>{h}</div>
                ))}
              </div>
              <div className="grid grid-cols-4 border-b border-gray-300">
                <div className="border-r border-gray-300 p-1">
                  <AutocompleteInput value={formData.currency_label} selectedId={formData.currency_id} onChange={(text) => handleChange('currency_label', text)} onSelect={(id, label) => { setFormData(prev => ({ ...prev, currency_id: id, currency_label: label })); markAsModified(); }} options={devises} getOptionLabel={(o) => `${o.code}${o.symbole ? ` (${o.symbole})` : ''}`} placeholder="Devise" disabled={!isDraft} />
                </div>
                <div className="border-r border-gray-300 p-1">
                  <AutocompleteInput value={formData.fiscal_position_label} selectedId={formData.fiscal_position_id} onChange={(text) => handleChange('fiscal_position_label', text)} onSelect={(id, label) => { setFormData(prev => ({ ...prev, fiscal_position_id: id, fiscal_position_label: label })); markAsModified(); }} options={fiscalPositions} getOptionLabel={(f) => f.name} placeholder="Position fiscale" disabled={!isDraft} />
                </div>
                <div className="border-r border-gray-300 p-1">
                  <select
                    value={formData.auto_post || 'manual'}
                    onChange={(event) => handleChange('auto_post', event.target.value)}
                    disabled={!isDraft}
                    className="w-full px-2 py-1 border-0 bg-white text-xs text-gray-700 focus:ring-1 focus:ring-purple-500 disabled:bg-gray-50"
                    style={{ height: '26px' }}
                  >
                    <option value="manual">Manuel</option>
                    <option value="at_date">À la date</option>
                    <option value="monthly">Mensuel</option>
                    <option value="quarterly">Trimestriel</option>
                    <option value="yearly">Annuel</option>
                  </select>
                </div>
                <div className="p-1">
                  <div className="w-full px-2 py-1 text-xs text-gray-700 flex items-center" style={{ height: '26px' }}>
                    <FiBriefcase className="mr-1 text-purple-600 flex-shrink-0" size={12} />
                    <span className="truncate">{activeEntity?.nom || activeEntity?.name || activeEntity?.raison_sociale || 'Entité'}</span>
                  </div>
                </div>
              </div>
              <textarea value={formData.notes} onChange={(e) => handleChange('notes', e.target.value)} disabled={!isDraft} className="w-full h-48 px-3 py-2 border-0 text-xs focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50" placeholder="Notes complémentaires..." />
            </div>
          )}

          {/* ONGLET PIÈCES JOINTES */}
          {activeTab === 'pieces-jointes' && (
            <div className="border border-gray-300 p-6 rounded">
              {isDraft && (
                <div className="mb-6">
                  <input type="file" id="attachments" className="hidden" multiple onChange={(e) => { void handleAttachmentsChange(e.target.files); e.target.value = ''; }} disabled={uploadingFiles} />
                  <label htmlFor="attachments" className={`inline-flex items-center gap-2 h-8 px-3 text-white text-xs rounded ${uploadingFiles ? 'bg-gray-400 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-700 cursor-pointer'}`}>
                    <FiUpload size={12} /><span>{uploadingFiles ? 'Envoi en cours...' : 'Ajouter des fichiers'}</span>
                  </label>
                  <p className="text-xs text-gray-500 mt-2">Formats acceptés : PDF, JPG, PNG, DOC (max 10MB)</p>
                </div>
              )}
              {attachmentsList.length > 0 ? (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {attachmentsList.map((file, index) => (
                    <div key={file.id || `${file.name || file.file_name || 'attachment'}-${index}`} className="flex items-center justify-between p-2 bg-gray-50 border border-gray-200 rounded">
                      <button type="button" onClick={() => void downloadAttachmentFile(file)} className="group flex min-w-0 flex-1 items-center gap-2 text-left" title="Télécharger la pièce jointe">
                        <FiPaperclip className="text-gray-500 flex-shrink-0" size={14} />
                        <span className="truncate text-xs text-gray-700 group-hover:text-purple-700 group-hover:underline">{file.name || file.file_name || file.filename || 'Pièce jointe'}</span>
                        {Number(file.size) > 0 && <span className="text-xs text-gray-500">{(Number(file.size) / 1024).toFixed(1)} KB</span>}
                        <FiDownload className="shrink-0 text-gray-400 group-hover:text-purple-600" size={13} />
                      </button>
                      {isDraft && <button type="button" onClick={() => void removeAttachment(index)} disabled={uploadingFiles} className="ml-2 text-red-600 hover:text-red-800 disabled:cursor-not-allowed disabled:opacity-40" title="Supprimer la pièce jointe"><FiTrash2 size={14} /></button>}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <FiPaperclip className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                  <div className="text-gray-500 text-xs">Aucune pièce jointe</div>
                </div>
              )}
            </div>
          )}
        </div>
      </UnifiedFormPage>

      {/* DIALOG CONFIRMATION */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-sm shadow-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-gray-900 mb-3">Modifications non sauvegardées</h3>
            <p className="text-sm text-gray-600 mb-6">Voulez-vous enregistrer les modifications avant de quitter ?</p>
            <div className="flex justify-end gap-3">
              <button onClick={async () => { setShowConfirmDialog(false); const ok = await handleSave(true); if (ok) navigate('/comptabilite/pieces'); }} className="px-4 py-2 bg-purple-600 text-white text-sm hover:bg-purple-700 transition-all">Enregistrer</button>
              <button onClick={confirmDiscardChanges} className="px-4 py-2 bg-red-600 text-white text-sm hover:bg-red-700 transition-all">Ne pas enregistrer</button>
              <button onClick={() => setShowConfirmDialog(false)} className="px-4 py-2 border border-gray-300 text-gray-700 text-sm hover:bg-gray-50 transition-all">Annuler</button>
            </div>
          </div>
        </div>
      )}

      {unsavedPieceAction && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50">
          <div className="mx-4 w-full max-w-md border border-gray-300 bg-white p-6 shadow-lg">
            <div className="mb-3 flex items-center gap-2 text-gray-900">
              <FiAlertCircle className="text-amber-600" size={20} />
              <h3 className="text-lg font-bold">Pièce non enregistrée</h3>
            </div>
            <p className="mb-6 text-sm text-gray-600">
              Enregistrez d'abord la pièce avant de {unsavedPieceAction}.
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={async () => {
                  const saved = await handleSave(false);
                  if (saved) setUnsavedPieceAction(null);
                }}
                disabled={loading}
                className="bg-purple-600 px-4 py-2 text-sm text-white transition-all hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Enregistrer
              </button>
              <button type="button" onClick={() => setUnsavedPieceAction(null)} className="border border-gray-300 px-4 py-2 text-sm text-gray-700 transition-all hover:bg-gray-50">
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {pendingPieceAction && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black bg-opacity-50">
          <div className="mx-4 w-full max-w-md border border-gray-300 bg-white p-6 shadow-lg">
            <div className="mb-3 flex items-center gap-2 text-gray-900">
              <FiAlertCircle className={pendingPieceAction.action === 'delete' ? 'text-red-600' : 'text-amber-600'} size={20} />
              <h3 className="text-lg font-bold">Confirmer l'action</h3>
            </div>
            <p className="mb-6 text-sm text-gray-600">
              Voulez-vous vraiment effectuer l'action : <strong>{pendingPieceAction.label}</strong> ?
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                disabled={loading}
                onClick={async () => {
                  const action = pendingPieceAction.action;
                  setPendingPieceAction(null);
                  if (action === 'duplicate') await handleDuplicatePiece();
                  if (action === 'delete') await handleDeletePiece();
                  if (action === 'cancel') await handleCancelPiece();
                  if (action === 'draft') await handleReturnToDraft();
                  if (action === 'reverse') await handleReversePiece();
                }}
                className={`px-4 py-2 text-sm text-white transition-all disabled:cursor-not-allowed disabled:opacity-50 ${pendingPieceAction.action === 'delete' ? 'bg-red-600 hover:bg-red-700' : 'bg-purple-600 hover:bg-purple-700'}`}
              >
                Confirmer
              </button>
              <button type="button" disabled={loading} onClick={() => setPendingPieceAction(null)} className="border border-gray-300 px-4 py-2 text-sm text-gray-700 transition-all hover:bg-gray-50">
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}




