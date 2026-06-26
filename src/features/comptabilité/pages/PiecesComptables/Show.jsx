﻿// src/features/comptabilité/pages/PiecesComptables/Show.jsx
// VERSION 15.2 — Show aligné sur Create.jsx

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  FiPlus, FiTrash2, FiCheck, FiPaperclip, FiUpload,
  FiCopy, FiRotateCcw, FiX, FiAlertCircle, FiBriefcase,
  FiUploadCloud, FiSettings, FiInfo, FiZap
} from 'react-icons/fi';
import { useEntity } from '../../../../context/EntityContext';
import { piecesService } from "../../services";

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
  const value = String(state || 'draft')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  if (['posted', 'post', 'valid', 'valide', 'validee', 'validated'].includes(value) || value.includes('comptabilis')) {
    return 'posted';
  }
  if (['cancel', 'cancelled', 'canceled', 'annule', 'annulee'].includes(value)) {
    return 'cancel';
  }
  if (['deleted', 'delete', 'supprime', 'supprimee'].includes(value)) {
    return 'deleted';
  }
  if (['draft', 'brouillon'].includes(value)) {
    return 'draft';
  }
  return value || 'draft';
};

const normalizeTraceabilityLogs = (data) => {
  const getUserLabel = (value, fallback = 'Utilisateur') => {
    if (!value) return fallback;
    if (typeof value === 'string') return value;
    if (typeof value === 'number') return `Utilisateur #${value}`;
    return (
      value.display_name ||
      value.name ||
      value.username ||
      value.email ||
      value.label ||
      fallback
    );
  };

  const rawLogs =
    data?.traceability ||
    data?.module_traceability ||
    data?.moduleTraceability ||
    data?.traçabilité ||
    data?.audit_logs ||
    data?.auditLogs ||
    data?.history ||
    data?.histories ||
    data?.messages ||
    data?.activity_logs ||
    data?.activityLogs ||
    data?.logs ||
    [];
  const logs = Array.isArray(rawLogs) ? rawLogs : (rawLogs?.results || []);
  const normalizedLogs = logs.map((log, index) => {
    const userObj = log.user_detail || log.user || log.author || log.create_uid || log.created_by || log.utilisateur || {};
    const action = log.action || log.event || log.type || log.label || log.subject || log.title || 'Action';
    const actionKey = String(action || '').toLowerCase();
    const displayAction = actionKey === 'creation' || actionKey === 'created' || actionKey === 'create'
      ? 'Création de la pièce'
      : action;
    const target = log.object_label || log.objectLabel || log.move_name || log.moveName || '';
    const modelName = log.model_name || log.modelName || '';
    const description = log.description || log.message || log.body || log.details || log.note || '';
    const date = log.date || log.created_at || log.createdAt || log.timestamp || log.write_date || log.create_date || '';
    const createdBy = log.created_by_name || log.createdByName || log.user_name || log.author_name || '';
    const user = createdBy || (typeof userObj === 'string'
      ? userObj
      : getUserLabel(userObj));
    return {
      id: log.id || `${date}-${index}`,
      action: displayAction,
      description,
      target,
      modelName,
      date,
      user,
      createdBy: createdBy || user,
    };
  });

  const createDate = data?.create_date || data?.created_at || data?.date_creation || data?.dateCreation || '';
  const creator =
    data?.create_uid_name ||
    data?.create_uid_label ||
    data?.created_by_name ||
    data?.createdByName ||
    getUserLabel(data?.create_uid, '');
  const hasCreationLog = normalizedLogs.some(log => {
    const action = String(log.action || '').toLowerCase();
    return action.includes('création') || action.includes('creation') || action === 'created' || action === 'create';
  });

  if ((createDate || creator) && !hasCreationLog) {
    const pieceLabel = data?.name || data?.display_name || data?.ref || '';
    normalizedLogs.push({
      id: `piece-creation-${data?.id || pieceLabel || 'current'}`,
      action: 'Création de la pièce',
      description: pieceLabel ? `Pièce ${pieceLabel}` : 'Pièce comptable créée',
      target: pieceLabel,
      modelName: 'AccountMove',
      date: createDate,
      user: creator || 'Utilisateur',
      createdBy: creator || 'Utilisateur',
      isSyntheticCreation: true,
    });
  }

  return normalizedLogs.sort((a, b) => {
    const dateA = a.date ? new Date(a.date).getTime() : 0;
    const dateB = b.date ? new Date(b.date).getTime() : 0;
    return dateB - dateA;
  });
};

// =============================================================================
// TOOLTIP
// =============================================================================
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

// =============================================================================
// AUTOCOMPLETE INPUT
// =============================================================================
const AutocompleteInput = ({ value, selectedId, onChange, onSelect, options, getOptionLabel, placeholder = "", className = "", disabled = false, required = false, onKeyDown }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value || '');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);
  const [dropdownStyle, setDropdownStyle] = useState({});

  useEffect(() => { if (value !== undefined) setInputValue(value); }, [value]);
  const filteredOptions = options.filter(option => getOptionLabel(option).toLowerCase().includes(inputValue.toLowerCase()));

  const updateDropdownPosition = useCallback(() => {
    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      setDropdownStyle({ position: 'fixed', top: `${rect.bottom}px`, left: `${rect.left}px`, width: `${rect.width}px`, zIndex: 9999, maxHeight: '200px', overflowY: 'auto' });
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
  const handleKeyDown = (e) => {
    if (disabled) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setIsOpen(true); setHighlightedIndex(prev => prev < filteredOptions.length - 1 ? prev + 1 : prev); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlightedIndex(prev => prev > 0 ? prev - 1 : 0); }
    else if (e.key === 'Enter' && isOpen && filteredOptions.length > 0) { e.preventDefault(); handleSelectOption(filteredOptions[highlightedIndex]); }
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
      <input ref={inputRef} type="text" value={inputValue} onChange={handleInputChange} onKeyDown={handleKeyDown} onFocus={() => { if(!disabled) { setIsOpen(true); updateDropdownPosition(); } }} placeholder={placeholder} disabled={disabled} required={required} className={`w-full px-2 py-1 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none ${className} ${disabled ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : ''}`} style={{ height: '26px', border: 'none', backgroundColor: 'transparent' }} autoComplete="off" />
      {isOpen && !disabled && filteredOptions.length > 0 && (
        <div ref={dropdownRef} className="bg-white border border-gray-300 shadow-lg" style={dropdownStyle}>
          {filteredOptions.map((option, index) => (
            <div key={option.id} className={`px-2 py-1 text-xs cursor-pointer ${index === highlightedIndex ? 'bg-blue-100 text-blue-700' : 'hover:bg-blue-50'} ${option.id === selectedId ? 'bg-blue-50' : ''}`} onClick={() => handleSelectOption(option)} onMouseEnter={() => setHighlightedIndex(index)}>{getOptionLabel(option)}</div>
          ))}
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
    <input type="text" value={displayValue} onChange={handleChange} onBlur={() => { if (value !== '' && value !== null && value !== undefined) setDisplayValue(formatNumberWithSpace(value)); }} onFocus={(e) => { if (value !== '' && value !== null && value !== undefined) e.target.value = value.toString(); }} onKeyDown={onKeyDown} disabled={disabled} className={`w-full px-2 py-1 border-0 text-xs text-right focus:ring-1 focus:ring-blue-500 ${className} ${disabled ? 'bg-gray-50 text-gray-500' : ''}`} style={{ height: '26px' }} placeholder={placeholder} />
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

const OPTIONAL_COLUMNS = [
  { key: 'tax', label: 'Taxe' },
  { key: 'withholding', label: 'Retenue' },
  { key: 'date_maturity', label: 'Date d’échéance' },
  { key: 'discount_amount', label: 'Montant de remise' },
  { key: 'discount_percentage', label: '% de remise' },
  { key: 'discount_date', label: 'Date de remise' },
];
const DEFAULT_VISIBLE_OPTIONAL_COLUMNS = OPTIONAL_COLUMNS.reduce((acc, column) => ({ ...acc, [column.key]: true }), {});
const COLUMN_STORAGE_KEY = 'accountMoveCreateVisibleColumns';

// =============================================================================
// COMPOSANT PRINCIPAL
// =============================================================================
export default function Show() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { activeEntity } = useEntity();
  const [loading, setLoading] = useState(false);
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
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [treasuryWarningDialog, setTreasuryWarningDialog] = useState(null);
  const [pieceId, setPieceId] = useState(id || null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [attachmentsList, setAttachmentsList] = useState([]);
  const [traceabilityLogs, setTraceabilityLogs] = useState([]);
  const [showTraceabilityPanel, setShowTraceabilityPanel] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [fiscalPositions, setFiscalPositions] = useState([]);
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
  const today = new Date().toISOString().split('T')[0];
  const tableContainerRef = useRef(null);
  const actionsMenuRef = useRef(null);
  const columnsMenuRef = useRef(null);
  const columnsMenuButtonRef = useRef(null);
  const columnsMenuPopupRef = useRef(null);

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
    const accountId = journal.default_account_id || journal.default_account;
    if (!accountId) return null;
    const found = accountsRef.current.find(acc => String(acc.id) === String(accountId));
    return found || {
      id: accountId,
      code: journal.default_account_code || '',
      name: journal.default_account_name || 'Compte de tresorerie',
    };
  }, []);

  const emptyLine = useCallback((overrides = {}) => ({
    id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substr(2, 9),
    name: '', account_id: '', account_label: '', account_code: '', partner_id: '', partner_label: '',
    debit: '', credit: '', tax_id: '', tax_label: '', tax_repartition_line_id: null, tax_base_amount: '',
    withholding_tax_id: '', withholding_tax_label: '', withholding_amount: '',
    date_maturity: '', discount_amount_currency: '', discount_percentage: '', discount_date: '',
    is_counterpart: false, is_tax_line: false, is_withholding_counterpart: false, parent_line_id: null,
    ...overrides
  }), []);

  const initialFormData = useMemo(() => ({
    name: '', state: 'draft', move_type: 'entry', date: today, registration_date: today, ref: '',
    currency_id: '', currency_label: '', journal_id: '', journal_label: '', partner_id: '', partner_label: '',
    invoice_date: today, invoice_date_due: '', invoice_user_id: '', invoice_user_label: '', invoice_origin: '',
    fiscal_position_id: '', fiscal_position_label: '', payment_reference: '', lines: [emptyLine()], notes: '',
  }), [emptyLine, today]);

  const [formData, setFormData] = useState(initialFormData);

  const loadOptions = useCallback(async () => {
    if (!activeEntity) return;
    try {
      const [journalsData, accountsData, partnersData, devisesData, taxesData, withholdingData, fiscalData] = await Promise.all([
        piecesService.getJournals(activeEntity.id), piecesService.getAccounts(activeEntity.id),
        piecesService.getPartners(activeEntity.id), piecesService.getDevises(activeEntity.id),
        piecesService.getTaxes?.(activeEntity.id) || Promise.resolve([]),
        piecesService.getWithholdingTaxes?.(activeEntity.id) || Promise.resolve([]),
        piecesService.getFiscalPositions?.(activeEntity.id) || Promise.resolve([]),
      ]);
      const normalize = (data) => { if (!data) return []; if (Array.isArray(data)) return data; if (Array.isArray(data.results)) return data.results; return []; };
      const normAccounts = normalize(accountsData).filter(acc => {
        if (acc.company && acc.company !== activeEntity.id) return false;
        if (acc.company === null && acc.company !== undefined) return false;
        return true;
      });
      setJournals(normalize(journalsData));
      setAccounts(normAccounts);
      setPartners(normalize(partnersData));
      setDevises(normalize(devisesData));
      setTaxes(normalize(taxesData));
      setWithholdingTaxes(normalize(withholdingData));
      setFiscalPositions(normalize(fiscalData));
      const normDevises = normalize(devisesData);
      if (normDevises.length > 0) {
        const defaultCurrency = normDevises.find(d => d.code === 'XOF') || normDevises[0];
        setFormData(prev => ({ ...prev, currency_id: defaultCurrency.id, currency_label: `${defaultCurrency.code}${defaultCurrency.symbole ? ` (${defaultCurrency.symbole})` : ''}` }));
      }
    } catch (err) { setError('Erreur chargement données'); }
  }, [activeEntity]);

  useEffect(() => { if (activeEntity) loadOptions(); }, [activeEntity, loadOptions]);

  const loadPieceData = useCallback(async () => {
    if (!id || !activeEntity) return;
    setLoading(true);
    try {
      const data = await piecesService.getById(id, activeEntity.id);
      const getId = (value) => value && typeof value === 'object' ? value.id : value;
      const getLabel = (...values) => values.find(value => typeof value === 'string' && value.trim()) || '';
      const getPartnerLabel = (partnerId, partnerObj, fallback = '') => {
        const partner = partnerObj && typeof partnerObj === 'object'
          ? partnerObj
          : partnersRef.current.find(p => String(p.id) === String(partnerId));
        return getLabel(
          fallback,
          partner?.display_name,
          partner?.nom,
          partner?.name,
          partner?.raison_sociale,
          partner?.full_name
        );
      };
      const getAccountLabel = (accountId, accountObj, fallback = '') => {
        const account = accountObj && typeof accountObj === 'object'
          ? accountObj
          : accountsRef.current.find(acc => String(acc.id) === String(accountId));
        const code = account?.code || '';
        const name = account?.name || account?.label || '';
        return getLabel(fallback, code && name ? `${code} - ${name}` : '', name, code);
      };
      const getAccountCode = (accountId, accountObj, fallback = '') => {
        const account = accountObj && typeof accountObj === 'object'
          ? accountObj
          : accountsRef.current.find(acc => String(acc.id) === String(accountId));
        return fallback || account?.code || '';
      };
      setPieceId(data.id || id);
      const rawLines = data.lines || data.line_ids || data.lines_write || [];
      const mappedLines = rawLines.map(line => {
        const accountId = getId(line.account_id || line.account || line.compte) || '';
        const partnerObj = line.partner || line.partner_id || line.partenaire || line.partenaire_id || line.partner_detail || line.partenaire_detail || line.partenaire_data;
        const partnerId = getId(partnerObj) || '';
        const accountCode = getAccountCode(accountId, line.account || line.account_id, line.account_code || line.compte_code || '');
        const accountName = line.account_name || line.account?.name || line.compte_name || '';
        const partnerName = getPartnerLabel(
          partnerId,
          partnerObj,
          line.partner_label || line.partner_name || line.partner_display || line.partner_raison_sociale ||
          line.partenaire_label || line.partenaire_name || line.partenaire_nom || line.partenaire_raison_sociale || ''
        );
        const lineName = line.name || line.libelle || line.label || '';
        const isPartnerCounterpart = !!(line.is_counterpart || line.is_partner_counterpart || line.is_auto_generated && /^contrepartie/i.test(lineName));
        const isTaxLine = !!(line.is_tax_line || line.tax_repartition_line_id || /^tva\b/i.test(lineName));
        const isWithholdingCounterpart = !!(line.is_withholding_counterpart || line.withholding_amount && /^retenue/i.test(lineName));
        const taxId = getId(line.tax_id || line.tax) || '';
        const withholdingTaxId = getId(line.withholding_tax_id || line.withholding_tax) || '';
        return {
          ...line,
          id: line.id || (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substr(2, 9)),
          account_id: accountId ? String(accountId) : '',
          account_code: accountCode,
          account_label: getAccountLabel(accountId, line.account || line.account_id, line.account_label || (accountCode && accountName ? `${accountCode} - ${accountName}` : accountName)),
          partner_id: partnerId ? String(partnerId) : '',
          partner_label: partnerName,
          tax_id: taxId ? String(taxId) : '',
          tax_label: line.tax_label || (line.tax_name ? `${line.tax_name}${line.tax_amount ? ` (${line.tax_amount}%)` : ''}` : ''),
          withholding_tax_id: withholdingTaxId ? String(withholdingTaxId) : '',
          withholding_tax_label: line.withholding_tax_label || (line.withholding_tax_name ? `${line.withholding_tax_name}${line.withholding_tax_amount ? ` (${line.withholding_tax_amount}%)` : ''}` : ''),
          withholding_amount: line.withholding_amount || '',
          debit: line.debit || '',
          credit: line.credit || '',
          date_maturity: line.date_maturity || '',
          discount_amount_currency: line.discount_amount_currency || '',
          discount_percentage: line.discount_percentage || '',
          discount_date: line.discount_date || '',
          is_counterpart: isPartnerCounterpart,
          is_tax_line: isTaxLine && !isWithholdingCounterpart,
          is_withholding_counterpart: isWithholdingCounterpart,
          parent_line_id: line.parent_line_id || line.parent_line_ref || null,
        };
      });
      const fallbackPartnerObj = data.partner || data.partner_id || data.partenaire || data.partenaire_id || data.partner_detail || data.partenaire_detail || data.partenaire_data;
      const fallbackPartnerId = getId(fallbackPartnerObj) || '';
      const fallbackPartnerLabel = getPartnerLabel(
        fallbackPartnerId,
        fallbackPartnerObj,
        data.partner_label || data.partner_name || data.partner_display || data.partner_raison_sociale ||
        data.partenaire_label || data.partenaire_name || data.partenaire_nom || data.partenaire_raison_sociale || ''
      );
      const completedLines = mappedLines.map(line => {
        const parent = line.parent_line_id ? mappedLines.find(item => String(item.id) === String(line.parent_line_id)) : null;
        const shouldFillPartner = line.is_tax_line || line.is_counterpart || line.is_withholding_counterpart;
        return {
          ...line,
          partner_id: line.partner_id || (shouldFillPartner ? String(parent?.partner_id || fallbackPartnerId || '') : ''),
          partner_label: line.partner_label || (shouldFillPartner ? (parent?.partner_label || fallbackPartnerLabel) : ''),
        };
      });
      setFormData({
        ...initialFormData,
        name: data.name || '',
        state: normalizeMoveState(data.state),
        move_type: data.move_type || 'entry',
        date: data.date || today,
        registration_date: data.registration_date || today,
        ref: data.ref || '',
        currency_id: getId(data.currency_id || data.currency) || '',
        currency_label: data.currency_code ? `${data.currency_code}${data.currency_symbole ? ` (${data.currency_symbole})` : ''}` : (data.currency_label || ''),
        journal_id: getId(data.journal_id || data.journal) || '',
        journal_label: data.journal_code ? `${data.journal_code} - ${data.journal_name || ''}`.trim() : (data.journal_label || data.journal_name || ''),
        partner_id: fallbackPartnerId,
        partner_label: fallbackPartnerLabel,
        invoice_date: data.invoice_date || today,
        invoice_date_due: data.invoice_date_due || '',
        invoice_user_id: data.invoice_user_id || '',
        invoice_user_label: data.invoice_user_name || '',
        invoice_origin: data.invoice_origin || '',
        fiscal_position_id: getId(data.fiscal_position_id || data.fiscal_position) || '',
        fiscal_position_label: data.fiscal_position_label || data.fiscal_position_name || '',
        payment_reference: data.payment_reference || '',
        lines: completedLines.length > 0 ? completedLines : [emptyLine()],
        notes: data.notes || '',
      });
      if (data.attachments) setAttachmentsList(data.attachments);
      setTraceabilityLogs(normalizeTraceabilityLogs(data));
      setHasUnsavedChanges(false);
    } catch (err) {
      const msg = err.response?.data || err.data || err.message || 'Erreur chargement pièce';
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setLoading(false);
    }
  }, [id, activeEntity, initialFormData, today, emptyLine]);

  useEffect(() => {
    if (id && activeEntity && journals.length > 0) loadPieceData();
  }, [id, activeEntity, journals.length, loadPieceData]);

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

  const fetchTaxRepartitions = useCallback(async (taxId) => {
    if (taxRepartitionsCache[taxId]) return taxRepartitionsCache[taxId];
    try {
      let repartitions = [];
      if (piecesService.getTaxRepartitionLines) {
        const res = await piecesService.getTaxRepartitionLines(taxId, activeEntity?.id);
        repartitions = Array.isArray(res) ? res : (res?.results || []);
      } else {
        const { apiClient } = await import('../../services');
        const res = await apiClient.get(`compta/tax-repartition-lines/`, { params: { tax: taxId, company: activeEntity?.id } });
        repartitions = Array.isArray(res) ? res : (res?.results || []);
      }
      setTaxRepartitionsCache(prev => ({ ...prev, [taxId]: repartitions }));
      return repartitions;
    } catch (e) { return []; }
  }, [taxRepartitionsCache, activeEntity]);

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

  const buildWithholdingCounterpartLine = useCallback((motherLine, withholdingObj, taxesList) => {
    if (!motherLine.withholding_tax_id || !withholdingObj) return null;
    const withholdingAmount = calculateWithholdingAmount(withholdingObj, motherLine, taxesList);
    if (withholdingAmount <= 0.01) return null;
    const isMotherDebit = parseFloat(motherLine.debit) > 0;

    const buildLine = (accountToUse, labelToUse, amount, suffix = '') => ({
      id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substr(2, 9),
      name: `Retenue ${withholdingObj.name || ''}${suffix} - ${motherLine.partner_label || ''}`.trim(),
      account_id: String(accountToUse), account_label: labelToUse,
      partner_id: motherLine.partner_id || '', partner_label: motherLine.partner_label || '',
      debit: !isMotherDebit ? amount : '', credit: isMotherDebit ? amount : '',
      is_withholding_counterpart: true, parent_line_id: motherLine.id,
      withholding_tax_id: motherLine.withholding_tax_id,
      withholding_tax_label: motherLine.withholding_tax_label,
      withholding_amount: amount,
      account_code: '', tax_id: '', tax_label: '', tax_repartition_line_id: null, tax_base_amount: '',
      date_maturity: '', discount_amount_currency: '', discount_percentage: '', discount_date: '',
      is_counterpart: false, is_tax_line: false,
    });

    if (withholdingObj.account_id) {
      const accountToUse = typeof withholdingObj.account_id === 'object' ? withholdingObj.account_id.id : withholdingObj.account_id;
      const accountCode = withholdingObj.account_code || withholdingObj.account_id?.code || withholdingObj.account_label || '';
      const accountName = withholdingObj.account_name || withholdingObj.account_id?.name || '';
      const labelToUse = accountName && accountCode ? `${accountCode} - ${accountName}` : (withholdingObj.account_label || accountCode || accountName);
      return buildLine(accountToUse, labelToUse, withholdingAmount);
    }

    const repartitions = withholdingObj.repartition_lines || withholdingObj.invoice_repartition_decoded || [];
    const invoiceReps = repartitions.filter(r =>
      (r.account_id || r.account || r.account_id_write) &&
      (parseFloat(r.factor_percent) || 0) > 0 &&
      (!r.document_type || r.document_type === 'invoice') &&
      r.repartition_type !== 'base'
    );
    const taxReps = invoiceReps.filter(r => r.repartition_type === 'tax');
    const selectedReps = taxReps.length > 0 ? taxReps : invoiceReps.filter(r => r.repartition_type === 'delatax');
    if (selectedReps.length === 0) return null;

    let allocatedAmount = 0;
    return selectedReps.map((rep, index) => {
      const accountToUse = rep.account_id || rep.account_id_write || (typeof rep.account === 'object' ? rep.account.id : rep.account);
      const accountCode = rep.account_code || rep.account?.code || '';
      const accountName = rep.account_name || rep.account?.name || '';
      const labelToUse = accountCode && accountName ? `${accountCode} - ${accountName}` : (rep.account_label || accountName || accountCode);
      const factor = parseFloat(rep.factor_percent) || 100;
      const amount = index === selectedReps.length - 1
        ? roundAmount(withholdingAmount - allocatedAmount)
        : roundAmount(withholdingAmount * factor / 100);
      allocatedAmount += amount;
      return buildLine(accountToUse, labelToUse, amount, selectedReps.length > 1 ? ` ${factor}%` : '');
    }).filter(line => (Number(line.debit) || Number(line.credit) || 0) > 0.01);
  }, [calculateWithholdingAmount]);

  const regenerateAllLines = async (
    motherLines, existingAutoLines, fetchTaxFn,
    buildCounterFn, buildWithholdingFn,
    taxesList, partnersList, accountsList, withholdingList
  ) => {
    const result = [];
    const processedTVAKeys = new Set();
    const taxAggregates = {};

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
          const reps = await fetchTaxFn(agg.taxId);
          const taxObj = taxesList.find(t => String(t.id) === String(agg.taxId));
          if (taxObj && reps.length > 0) {
            const taxRate = parseFloat(taxObj.amount || 0);
            const totalTax = roundAmount(agg.baseAmount * (taxRate / 100));
            if (totalTax > 0) {
              const rep = reps.find(r => r.document_type === 'invoice' && r.repartition_type === 'tax' && (r.account_id || r.account));
              if (rep) {
                const accountId = rep.account_id || rep.account?.id || rep.account;
                const accountCode = rep.account_code || rep.account?.code || '';
                const accountName = rep.account_name || rep.account?.name || 'Compte TVA';
                const existingTax = existingAutoLines.find(l => l.is_tax_line && l.parent_line_id === agg.firstMotherId && l.partner_id === agg.partnerId);
                result.push({
                  id: existingTax ? existingTax.id : (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substr(2, 9)),
                  name: `TVA ${agg.taxLabel || ''} (${agg.partnerLabel})`.trim(),
                  account_id: String(accountId),
                  account_label: accountCode ? `${accountCode} - ${accountName}` : accountName,
                  partner_id: agg.partnerId || '', partner_label: agg.partnerLabel,
                  debit: agg.isDebit ? totalTax : '', credit: !agg.isDebit ? totalTax : '',
                  tax_repartition_line_id: rep.id || null, tax_base_amount: agg.baseAmount,
                  is_tax_line: true, parent_line_id: agg.firstMotherId,
                  account_code: '', tax_id: '', tax_label: '',
                  date_maturity: '', discount_amount_currency: '', discount_percentage: '', discount_date: '',
                  is_counterpart: false, is_withholding_counterpart: false,
                  withholding_tax_id: '',
                  withholding_tax_label: '',
                  withholding_amount: '',
                });
              }
            }
          }
        }
      }

      if (withholdingAmount > 0.01 && withholdingObj) {
        const retenueLine = buildWithholdingFn({ ...mother, withholding_amount: withholdingAmount }, withholdingObj, taxesList);
        if (retenueLine) {
          const existingRet = existingAutoLines.find(l => l.is_withholding_counterpart && l.parent_line_id === mother.id);
          const lines = Array.isArray(retenueLine) ? retenueLine : [retenueLine];
          lines.forEach(line => result.push({
            ...line,
            id: existingRet ? existingRet.id : line.id,
            account_id: line.account_id,
            account_label: line.account_label,
          }));
        }
      }

      const freshCounterpart = buildCounterFn(mother, partnersList, accountsList, taxesList);
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
          account_id: freshCounterpart.account_id,
          account_label: freshCounterpart.account_label,
          account_code: freshCounterpart.account_code,
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
      const newLines = await regenerateAllLines(
        motherLines, autoLines, fetchTaxRepartitions,
        buildCounterpartLine, buildWithholdingCounterpartLine,
        taxesRef.current, partnersRef.current, accountsRef.current, withholdingTaxesRef.current
      );
      setFormData(prev => ({ ...prev, lines: newLines }));
    } catch (err) {
      setError('Erreur lors de la régénération des lignes');
    }
  }, [formData.lines, fetchTaxRepartitions, buildCounterpartLine, buildWithholdingCounterpartLine, markAsModified]);

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
      setTimeout(() => setError(null), 3000); return;
    }
    const updatedMothers = allMotherLines.filter(l => l.id !== lineId);
    const existingAutoLines = formData.lines.filter(
      l => (l.is_counterpart || l.is_tax_line || l.is_withholding_counterpart) && l.parent_line_id !== lineId
    );
    const allLines = await regenerateAllLines(
      updatedMothers, existingAutoLines, fetchTaxRepartitions,
      buildCounterpartLine, buildWithholdingCounterpartLine,
      taxesRef.current, partnersRef.current, accountsRef.current, withholdingTaxesRef.current
    );
    setFormData(prev => ({ ...prev, lines: allLines }));
    markAsModified();
  }, [formData.lines, fetchTaxRepartitions, buildCounterpartLine, buildWithholdingCounterpartLine, markAsModified]);

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
        zIndex: 9999,
      });
    }
    setShowColumnsMenu(prev => !prev);
  }, []);

  const handleAttachmentsChange = (files) => {
    if (!files || files.length === 0) return;
    const validFiles = Array.from(files).filter(file => {
      if (file.size > 10 * 1024 * 1024) { setError(`${file.name} dépasse 10MB`); return false; }
      const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (!allowed.includes(file.type)) { setError(`Format non supporté : ${file.name}`); return false; }
      return true;
    });
    if (validFiles.length > 0) { setAttachmentsList(prev => [...prev, ...validFiles]); markAsModified(); }
  };
  const removeAttachment = (index) => { setAttachmentsList(prev => prev.filter((_, i) => i !== index)); markAsModified(); };

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
  const formatAmount = (amount) => {
    if (!amount && amount !== 0) return '0';
    return Math.round(amount).toLocaleString('fr-FR');
  };

  const isReadyForValidation = useCallback(() => {
    if (!formData.journal_id) return false;
    const motherLines = formData.lines.filter(l => !l.is_counterpart && !l.is_tax_line && !l.is_withholding_counterpart);
    if (motherLines.length === 0) return false;
    if (!motherLines.every(line => line.account_id && line.name?.trim() !== '')) return false;
    if (formData.lines.some(line => (parseFloat(line.debit) || 0) > 0 && (parseFloat(line.credit) || 0) > 0)) return false;
    return formData.lines.some(line => (parseFloat(line.debit) || 0) > 0 || (parseFloat(line.credit) || 0) > 0);
  }, [formData.journal_id, formData.lines]);

  const validateExclusiveDebitCredit = useCallback(() => {
    const invalidLine = formData.lines.findIndex(line => (parseFloat(line.debit) || 0) > 0 && (parseFloat(line.credit) || 0) > 0);
    return invalidLine === -1 ? null : `Ligne ${invalidLine + 1} : débit et crédit ne peuvent pas être renseignés en même temps`;
  }, [formData.lines]);

  const prepareDataForApi = useCallback(() => {
    const toNumber = (v) => { if (!v || v === '') return 0; const clean = typeof v === 'string' ? v.replace(/\s/g, '').replace(',', '.') : v; return roundAmount(parseFloat(clean) || 0); };
    const toPercent = (v) => { if (!v || v === '') return 0; const clean = typeof v === 'string' ? v.replace(/\s/g, '').replace(',', '.') : v; return Math.round((parseFloat(clean) || 0) * 100) / 100; };
    const toInt = (v) => (!v || v === '') ? null : parseInt(v) || null;
    const mainPartner = formData.partner_id ||
      formData.lines.find(l => l.partner_id && !l.is_counterpart && !l.is_tax_line && !l.is_withholding_counterpart)?.partner_id || null;
    return {
      name: formData.name || '', move_type: formData.move_type || 'entry', state: formData.state,
      journal_id: toInt(formData.journal_id), date: formData.date, ref: formData.ref || '',
      partner_id: mainPartner, company_id: activeEntity?.id || null, currency_id: toInt(formData.currency_id),
      invoice_date: formData.invoice_date || formData.date, invoice_date_due: formData.invoice_date_due || null,
      invoice_user_id: toInt(formData.invoice_user_id), invoice_origin: formData.invoice_origin || '',
      fiscal_position_id: toInt(formData.fiscal_position_id), payment_reference: formData.payment_reference || '',
      notes: formData.notes || '',
      lines_write: formData.lines.map((line, index) => {
        const payloadLine = {
          name: line.name?.trim() || `Ligne ${index + 1}`, date: formData.date,
          account_id: toInt(line.account_id), partner_id: toInt(line.partner_id || mainPartner),
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
          is_partner_counterpart: !!line.is_counterpart,
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
  }, [formData, activeEntity]);

  const debugAccountingPayload = useCallback((apiData, action) => {
    if (typeof console === 'undefined') return;
    const lines = apiData?.lines_write || [];
    console.group(`[Pièce comptable] Payload avant ${action}`);
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
    if (!formData.journal_id) { setError('Le journal est obligatoire'); return false; }
    if (pieceId && normalizeMoveState(formData.state) === 'posted') { setError('Impossible de modifier une pièce comptabilisée'); return false; }
    const exclusiveError = validateExclusiveDebitCredit();
    if (exclusiveError) { setError(exclusiveError); return false; }
    const lignesSansCompte = formData.lines.filter(l => !l.account_id);
    if (lignesSansCompte.length > 0) { setError(`${lignesSansCompte.length} ligne(s) sans compte comptable`); return false; }
    const totals = calculateTotals();
    if ((totals.debit > 0 || totals.credit > 0) && Math.abs(totals.debit - totals.credit) > 0.01) { setError(`Pièce déséquilibrée ! Écart: ${formatAmount(Math.abs(totals.debit - totals.credit))}`); return false; }
    let finalName = formData.name;
    if (!finalName && normalizeMoveState(formData.state) === 'draft') { finalName = generateDraftName(); setFormData(prev => ({ ...prev, name: finalName })); }
    setLoading(true); if (!silent) setError(null);
    try {
      const apiData = prepareDataForApi(); apiData.name = finalName;
      debugAccountingPayload(apiData, pieceId ? 'modification' : 'creation');
      let result = pieceId ? await piecesService.update(pieceId, apiData, activeEntity.id) : await piecesService.create(apiData, activeEntity.id);
      setTraceabilityLogs(normalizeTraceabilityLogs(result));
      if (!result?.id) throw new Error('La création de la pièce a échoué');
      setPieceId(result.id); if (result.name) setFormData(prev => ({ ...prev, name: result.name }));
      if (attachmentsList.length > 0) {
        setUploadingFiles(true);
        const fd = new FormData();
        attachmentsList.forEach(file => fd.append('attachments', file));
        await piecesService.uploadAttachments(result.id, fd, activeEntity.id);
        setAttachmentsList([]);
      }
      if (!silent) { setSuccess('Pièce enregistrée !'); setTimeout(() => setSuccess(null), 3000); }
      setHasUnsavedChanges(false); return true;
    } catch (err) {
      const msg = err.response?.data || err.data || err.message || 'Erreur inconnue';
      setError(`Échec : ${typeof msg === 'string' ? msg : JSON.stringify(msg)}`); return false;
    } finally { setLoading(false); setUploadingFiles(false); }
  };

  const handleToggleState = async () => {
    if (!activeEntity) { setError('Vous devez sélectionner une entité'); return; }
    const currentState = normalizeMoveState(formData.state);
    if (currentState === 'deleted') {
      setError('Une pièce supprimée ne peut pas être remise en brouillon');
      return;
    }
    const isPosting = currentState === 'draft';
    if (isPosting && !isReadyForValidation()) { setError('Champs obligatoires manquants'); return; }
    const exclusiveError = validateExclusiveDebitCredit();
    if (isPosting && exclusiveError) { setError(exclusiveError); return; }
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
        setTraceabilityLogs(normalizeTraceabilityLogs(fresh));
        setFormData(prev => ({
          ...prev,
          name: fresh?.name || posted?.name || saved.name || prev.name,
          state: normalizeMoveState(fresh?.state || posted?.state || 'posted'),
        }));
        setSuccess(null);
        await loadPieceData();
      } else {
        const targetId = pieceId || id;
        if (!targetId) throw new Error('Pièce introuvable');

        const drafted = await apiClient.post(`compta/moves/${targetId}/draft/`, {});
        const fresh = await piecesService.getById(targetId, activeEntity.id);
        setTraceabilityLogs(normalizeTraceabilityLogs(fresh));
        setFormData(prev => ({
          ...prev,
          name: fresh?.name || drafted?.name || prev.name,
          state: normalizeMoveState(fresh?.state || drafted?.state || 'draft'),
        }));
        setSuccess(null);
        await loadPieceData();
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

  const handleDuplicatePiece = async () => {
    const targetId = pieceId || id;
    if (!targetId) { setError('Pièce introuvable'); return; }
    if (normalizeMoveState(formData.state) === 'deleted') {
      setError('Une pièce supprimée ne peut pas être dupliquée');
      return;
    }
    if (hasUnsavedChanges && !window.confirm('Des modifications ne sont pas sauvegardees. Continuer la duplication ?')) return;
    setActionLoading('duplicate');
    setError(null);
    setShowActionsMenu(false);
    try {
      const { apiClient } = await import('../../services');
      const duplicated = await apiClient.post(`compta/moves/${targetId}/duplicate/`, {});
      setSuccess('Pièce dupliquée');
      setTimeout(() => setSuccess(null), 2500);
      if (duplicated?.id) navigate(`/comptabilite/pieces/${duplicated.id}`);
      else await loadPieceData();
    } catch (err) {
      const msg = err.response?.data || err.data || err.message || 'Erreur duplication';
      setError(`Échec duplication : ${typeof msg === 'string' ? msg : JSON.stringify(msg)}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeletePiece = async () => {
    const targetId = pieceId || id;
    if (!targetId) { setError('Pièce introuvable'); return; }
    if (normalizeMoveState(formData.state) === 'deleted') {
      setError('Cette pièce est déjà supprimée');
      return;
    }
    if (!window.confirm('Supprimer cette pièce ? Elle restera consultable dans les pièces supprimées.')) return;
    setActionLoading('delete');
    setError(null);
    setShowActionsMenu(false);
    try {
      const { apiClient } = await import('../../services');
      await apiClient.delete(`compta/moves/${targetId}/`);
      navigate('/comptabilite/pieces');
    } catch (err) {
      const msg = err.response?.data || err.data || err.message || 'Erreur suppression';
      setError(`Échec suppression : ${typeof msg === 'string' ? msg : JSON.stringify(msg)}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReversePiece = async () => {
    const targetId = pieceId || id;
    if (!targetId) { setError('Pièce introuvable'); return; }
    if (normalizeMoveState(formData.state) !== 'posted') {
      setError('Seules les pièces comptabilisées peuvent être extournées');
      return;
    }
    const reason = window.prompt('Motif de l’extourne', `Extourne de ${formData.name || 'la pièce'}`);
    if (reason === null) return;
    setActionLoading('reverse');
    setError(null);
    setShowActionsMenu(false);
    try {
      const { apiClient } = await import('../../services');
      const reversed = await apiClient.post(`compta/moves/${targetId}/reverse/`, { reason });
      setSuccess('Extourne créée');
      setTimeout(() => setSuccess(null), 2500);
      if (reversed?.id) navigate(`/comptabilite/pieces/${reversed.id}`);
      else await loadPieceData();
    } catch (err) {
      const msg = err.response?.data || err.data || err.message || 'Erreur extourne';
      setError(`Échec extourne : ${typeof msg === 'string' ? msg : JSON.stringify(msg)}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancelPiece = async () => {
    const targetId = pieceId || id;
    if (!targetId) { setError('Pièce introuvable'); return; }
    const currentState = normalizeMoveState(formData.state);
    if (!['draft', 'posted'].includes(currentState)) {
      setError('Seules les pièces brouillon ou comptabilisées peuvent être annulées');
      return;
    }
    if (!window.confirm('Annuler cette pièce comptable ?')) return;
    setActionLoading('cancel');
    setError(null);
    setShowActionsMenu(false);
    try {
      const { apiClient } = await import('../../services');
      const cancelled = await apiClient.post(`compta/moves/${targetId}/cancel/`, {});
      const fresh = await piecesService.getById(targetId, activeEntity.id);
      setTraceabilityLogs(normalizeTraceabilityLogs(fresh));
      setFormData(prev => ({
        ...prev,
        name: fresh?.name || cancelled?.name || prev.name,
        state: normalizeMoveState(fresh?.state || cancelled?.state || 'cancel'),
      }));
      setHasUnsavedChanges(false);
      setSuccess('Pièce annulée');
      setTimeout(() => setSuccess(null), 2500);
      await loadPieceData();
    } catch (err) {
      const msg = err.response?.data || err.data || err.message || 'Erreur annulation';
      setError(`Échec annulation : ${typeof msg === 'string' ? msg : JSON.stringify(msg)}`);
    } finally {
      setActionLoading(null);
    }
  };

  const normalizedState = normalizeMoveState(formData.state);
  const isDraft = normalizedState === 'draft';
  const isPosted = normalizedState === 'posted';
  const isCancelled = normalizedState === 'cancel';
  const isDeleted = normalizedState === 'deleted';
  const totals = calculateTotals();
  const difference = Math.abs(totals.debit - totals.credit).toFixed(2);
  const isBalanced = difference === '0.00' || difference === '0';
  const readyForValidation = isReadyForValidation();
  
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

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      {treasuryWarningDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-[10000]">
          <div className="bg-white border border-gray-300 shadow-xl rounded-sm w-full max-w-md mx-4">
            <div className="px-4 py-3 border-b border-gray-200 flex items-center gap-2">
              <FiAlertCircle className="text-yellow-600" size={18} />
              <h3 className="text-sm font-semibold text-gray-900">Compte non autorisé</h3>
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
      <div className="max-w-7xl mx-auto bg-white border border-gray-300">

        {/* HEADER */}
        <div className="border-b border-gray-300 px-4 py-3">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-start gap-3">
              <Tooltip text="Créer une nouvelle pièce">
                <button onClick={() => { if (hasUnsavedChanges) setShowConfirmDialog(true); else navigate('/comptabilite/pieces/create'); }} className="h-12 px-4 bg-purple-600 text-white text-sm hover:bg-purple-700 transition-all flex items-center gap-1 font-medium">
                  <FiPlus size={16} /><span>Nouveau</span>
                </button>
              </Tooltip>
              <div className="flex flex-col h-12 justify-center">
                <div className="text-lg font-bold text-gray-900 cursor-pointer hover:text-purple-600 transition-colors" onClick={() => { if (hasUnsavedChanges) setShowConfirmDialog(true); else navigate('/comptabilite/pieces'); }}>Pièces comptables</div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-gray-600 font-medium">N° {formData.name || (formData.journal_id ? 'Sera généré lors de la comptabilisation' : 'Sélectionnez un journal')}</span>
                </div>
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
                    <button onClick={handleDuplicatePiece} disabled={!!actionLoading || isDeleted} className="w-full px-3 py-2 text-xs text-left hover:bg-gray-50 flex items-center gap-2 border-b border-gray-100 disabled:opacity-50"><FiCopy size={12} /> Dupliquer</button>
                    <button onClick={handleDeletePiece} disabled={!!actionLoading || isDeleted} className="w-full px-3 py-2 text-xs text-left hover:bg-gray-50 flex items-center gap-2 border-b border-gray-100 disabled:opacity-50"><FiTrash2 size={12} /> Supprimer</button>
                    <button onClick={handleCancelPiece} disabled={!!actionLoading || isCancelled || isDeleted} className="w-full px-3 py-2 text-xs text-left hover:bg-gray-50 flex items-center gap-2 border-b border-gray-100 disabled:opacity-50"><FiX size={12} /> Annuler</button>
                    <button onClick={handleReversePiece} disabled={!!actionLoading || !isPosted} className="w-full px-3 py-2 text-xs text-left hover:bg-gray-50 flex items-center gap-2 border-b border-gray-100 disabled:opacity-50"><FiRotateCcw size={12} /> Extourner</button>
                    <button type="button" onClick={() => { setShowTraceabilityPanel(prev => !prev); setShowActionsMenu(false); }} className="w-full px-3 py-2 text-xs text-left hover:bg-gray-50 flex items-center gap-2">
                      <FiInfo size={12} /> {showTraceabilityPanel ? 'Masquer la traçabilité' : 'Afficher la traçabilité'}
                    </button>
                  </div>
                )}
              </div>
              <Tooltip text="Enregistrer">
                <button onClick={() => handleSave().then(ok => { if (ok) navigate('/comptabilite/pieces'); })} disabled={loading || !isDraft || isDeleted} className="w-8 h-8 rounded-full bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center">
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

        {/* BARRE VALIDATION */}
        <div className="border-b border-gray-300 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Tooltip text={!readyForValidation && isDraft ? "Renseignez le journal, le compte, le libellé et le montant" : isDraft ? "Valider la pièce" : "Remettre la pièce en brouillon"}>
                <button type="button" onClick={handleToggleState} disabled={loading || isDeleted || (isDraft && !readyForValidation)} className={`h-8 px-3 text-xs font-medium border transition-all flex items-center ${(!isDeleted && (!isDraft || readyForValidation)) ? 'bg-purple-600 text-white border-purple-600 hover:bg-purple-700 cursor-pointer' : 'bg-gray-100 text-gray-500 border-gray-300 cursor-not-allowed'}`}>
                  {isDraft ? 'Comptabiliser' : 'Remettre en brouillon'}
                </button>
              </Tooltip>
              {isPosted && (
                <Tooltip text="Annuler la pièce comptable">
                  <button type="button" onClick={handleCancelPiece} disabled={loading || !!actionLoading} className="h-8 px-3 text-xs font-medium border border-red-600 bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center">
                    Annuler la pièce
                  </button>
                </Tooltip>
              )}
              {error ? (<div className="flex items-center gap-1 text-xs text-red-600"><FiAlertCircle size={14} /><span>{error}</span></div>)
               : success ? (<div className="flex items-center gap-1 text-xs text-green-600"><FiCheck size={14} /><span>{success}</span></div>)
               : !readyForValidation && isDraft ? (<div className="flex items-center gap-1 text-xs text-amber-600"><FiInfo size={14} /><span>Complétez le journal, le compte, le libellé et le montant</span></div>)
               : null}
            </div>
            <div className="flex items-center gap-2">
              <div className={`h-8 px-3 text-xs font-medium border flex items-center ${isDraft ? 'bg-yellow-100 text-yellow-700 border-yellow-300' : 'bg-gray-100 text-gray-500 border-gray-300'}`}>Brouillon</div>
              <div className={`h-8 px-3 text-xs font-medium border flex items-center ${isPosted ? 'bg-green-100 text-green-700 border-green-300' : 'bg-gray-100 text-gray-500 border-gray-300'}`}>Comptabilisé</div>
              <div className={`h-8 px-3 text-xs font-medium border flex items-center ${isCancelled ? 'bg-red-100 text-red-700 border-red-300' : 'bg-gray-100 text-gray-500 border-gray-300'}`}>Annulé</div>
              <div className={`h-8 px-3 text-xs font-medium border flex items-center ${isDeleted ? 'bg-slate-200 text-slate-700 border-slate-300' : 'bg-gray-100 text-gray-500 border-gray-300'}`}>Supprimé</div>
            </div>
          </div>
        </div>

        {hasUnsavedChanges && <div className="px-4 py-1 bg-blue-50 text-blue-700 text-xs border-b border-blue-200">Modifications non sauvegardées</div>}

        <div className={`grid gap-0 ${showTraceabilityPanel ? 'lg:grid-cols-[minmax(0,1fr)_320px]' : 'grid-cols-1'}`}>
          <div className="min-w-0">
        {/* CHAMPS ENTÊTE */}
        <div className="px-4 py-3 border-b border-gray-300">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center" style={{ height: '26px' }}>
                <label className="text-xs text-gray-700 min-w-[140px] font-medium">Date comptable</label>
                <input type="date" value={formData.date} onChange={(e) => handleChange('date', e.target.value)} disabled={!isDraft} className="flex-1 px-2 py-1 border border-gray-300 text-xs ml-2" style={{ height: '26px' }} />
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
                  <AutocompleteInput value={formData.journal_label} selectedId={formData.journal_id} onChange={(text) => handleChange('journal_label', text)} onSelect={(id, label) => { setFormData(prev => ({ ...prev, journal_id: id, journal_label: label })); markAsModified(); }} options={journals} getOptionLabel={(o) => `${o.code} - ${o.name}`} placeholder="Sélectionner un journal" required={true} disabled={!isDraft} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ONGLETS */}
        <div className="border-b border-gray-300">
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
              <div className="border border-gray-300 mb-3 overflow-x-auto" ref={tableContainerRef}>
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-100">
                      {['Compte *', 'Partenaire', 'Libellé *', 'Débit', 'Crédit'].map((h, i) => (
                        <th key={i} className="border border-gray-300 px-2 py-1.5 text-xs font-medium text-gray-700 text-left">{h}</th>
                      ))}
                      {visibleColumns.tax && <th className="border border-gray-300 px-2 py-1.5 text-xs font-medium text-gray-700 text-left">Taxe</th>}
                      {visibleColumns.withholding && <th className="border border-gray-300 px-2 py-1.5 text-xs font-medium text-gray-700 text-left">Retenue</th>}
                      {visibleColumns.date_maturity && <th className="border border-gray-300 px-2 py-1.5 text-xs font-medium text-gray-700 text-left">Date d’échéance</th>}
                      {visibleColumns.discount_amount && <th className="border border-gray-300 px-2 py-1.5 text-xs font-medium text-gray-700 text-left">Montant de remise</th>}
                      {visibleColumns.discount_percentage && <th className="border border-gray-300 px-2 py-1.5 text-xs font-medium text-gray-700 text-left">% de remise</th>}
                      {visibleColumns.discount_date && <th className="border border-gray-300 px-2 py-1.5 text-xs font-medium text-gray-700 text-left">Date de remise</th>}
                      <th className="border border-gray-300 px-2 py-1.5 text-xs font-medium text-gray-700 text-left w-[40px]" ref={columnsMenuRef}>
                        <button ref={columnsMenuButtonRef} type="button" onClick={toggleColumnsMenu} className="w-full text-left hover:text-purple-600">•••</button>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData.lines.map((line) => {
                      const isAutoLine = line.is_counterpart || line.is_tax_line || line.is_withholding_counterpart;
                      const rowBg = line.is_counterpart ? 'bg-purple-50' : line.is_tax_line ? 'bg-blue-50' : line.is_withholding_counterpart ? 'bg-orange-50' : '';
                      const accountNature = getAccountNature(line.account_code);
                      return (
                        <tr key={line.id} data-line-id={line.id} className={`hover:bg-gray-50 ${rowBg}`}>
                          <td className="border border-gray-300 p-1" style={{ minWidth: '150px' }}>
                            <div className="flex items-center">
                              <AutocompleteInput 
                                value={line.account_label} 
                                selectedId={line.account_id} 
                                onChange={(text) => handleLineChange(line.id, 'account_label', text)} 
                                onSelect={(id, label) => handleAccountSelection(line.id, id, label)} 
                                options={accounts} 
                                getOptionLabel={(o) => `${o.code} - ${o.name}`} 
                                placeholder="Compte" 
                                required={true} 
                                disabled={!isDraft} 
                              />
                              {line.account_code && accountNature !== 'other' && (
                                <span className="ml-1 text-sm" title={accountNature === 'charge' ? 'Compte de Charge' : 'Compte de Produit'}>
                                  {accountNature === 'charge' ? '⬇️' : '⬆️'}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="border border-gray-300 p-1" style={{ minWidth: '120px' }}>
                            <AutocompleteInput 
                              value={line.partner_label} 
                              selectedId={line.partner_id} 
                              onChange={(text) => handleLineChange(line.id, 'partner_label', text)} 
                              onSelect={(id, label) => handlePartnerSelection(line.id, id, label)} 
                              options={partners} 
                              getOptionLabel={(o) => o.nom || o.name || o.raison_sociale || ''} 
                              placeholder="Partenaire" 
                              disabled={isAutoLine || !isDraft} 
                            />
                          </td>
                          <td className="border border-gray-300 p-1" style={{ minWidth: '150px' }}>
                            <input 
                              type="text" 
                              value={line.name} 
                              onChange={(e) => handleLineChange(line.id, 'name', e.target.value)} 
                              className="w-full px-2 py-1 border-0 text-xs focus:ring-1 focus:ring-blue-500" 
                              style={{ height: '26px' }} 
                              placeholder="Libellé" 
                              disabled={!isDraft} 
                            />
                          </td>
                          <td className="border border-gray-300 p-1" style={{ minWidth: '100px' }}>
                            <AmountInput 
                              value={line.debit} 
                              onChange={(v) => handleAmountChange(line.id, 'debit', v)} 
                              placeholder="0" 
                              disabled={!isDraft} 
                            />
                          </td>
                          <td className="border border-gray-300 p-1" style={{ minWidth: '100px' }}>
                            <AmountInput 
                              value={line.credit} 
                              onChange={(v) => handleAmountChange(line.id, 'credit', v)} 
                              onKeyDown={(e) => handleColumnTab(e, line, 'credit')}
                              placeholder="0" 
                              disabled={!isDraft} 
                            />
                          </td>
                          {visibleColumns.tax && <td className="border border-gray-300 p-1" style={{ minWidth: '100px' }}>
                            {!isAutoLine ? (
                              <AutocompleteInput 
                                value={line.tax_label} 
                                selectedId={line.tax_id} 
                                onChange={(text) => handleLineChange(line.id, 'tax_label', text)} 
                                onSelect={(id, label) => handleTaxSelection(line.id, id, label)} 
                                options={taxes} 
                                getOptionLabel={(t) => `${t.name} (${t.amount}%)`} 
                                placeholder="TVA..." 
                                onKeyDown={(e) => handleColumnTab(e, line, 'tax')}
                                disabled={!isDraft} 
                              />
                            ) : (
                              <div className="px-2 text-xs text-gray-400 italic flex items-center" style={{ height: '26px' }}>
                                {line.is_tax_line ? 'TVA auto' : line.is_withholding_counterpart ? 'Retenue auto' : 'Contrepartie'}
                              </div>
                            )}
                          </td>}
                          {visibleColumns.withholding && <td className="border border-gray-300 p-1" style={{ minWidth: '120px' }}>
                            {!isAutoLine ? (
                              <AutocompleteInput 
                                value={line.withholding_tax_label || ''} 
                                selectedId={line.withholding_tax_id} 
                                onChange={(text) => handleLineChange(line.id, 'withholding_tax_label', text)} 
                                onSelect={(id, label) => handleWithholdingSelection(line.id, id, label)} 
                                options={withholdingTaxes.filter(wt => !line.partner_id || !wt.partner_ids?.length || wt.partner_ids.some(p => p.id === line.partner_id))} 
                                getOptionLabel={(wt) => `${wt.name} (${wt.amount}%)`} 
                                placeholder="Retenue..." 
                                onKeyDown={(e) => handleColumnTab(e, line, 'withholding')}
                                disabled={!isDraft} 
                              />
                            ) : (
                              <div className="px-2 text-xs text-gray-400 italic" style={{ height: '26px' }}>—</div>
                            )}
                          </td>}
                          {visibleColumns.date_maturity && <td className="border border-gray-300 p-1" style={{ minWidth: '120px' }}>
                            <input 
                              type="date" 
                              value={line.date_maturity} 
                              onChange={(e) => handleLineChange(line.id, 'date_maturity', e.target.value)} 
                              onKeyDown={(e) => handleColumnTab(e, line, 'date_maturity')}
                              className="w-full px-2 py-1 border-0 text-xs focus:ring-1 focus:ring-blue-500" 
                              style={{ height: '26px' }} 
                              disabled={!isDraft} 
                            />
                          </td>}
                          {visibleColumns.discount_amount && <td className="border border-gray-300 p-1" style={{ minWidth: '100px' }}>
                            <AmountInput 
                              value={line.discount_amount_currency} 
                              onChange={(v) => handleLineChange(line.id, 'discount_amount_currency', v)} 
                              onKeyDown={(e) => handleColumnTab(e, line, 'discount_amount')}
                              placeholder="0" 
                              disabled={isAutoLine || !isDraft} 
                            />
                          </td>}
                          {visibleColumns.discount_percentage && <td className="border border-gray-300 p-1" style={{ minWidth: '80px' }}>
                            <input 
                              type="number" 
                              step="0.01" 
                              min="0" 
                              max="100" 
                              value={line.discount_percentage || ''} 
                              onChange={(e) => handleLineChange(line.id, 'discount_percentage', e.target.value)} 
                              onKeyDown={(e) => handleColumnTab(e, line, 'discount_percentage')}
                              className="w-full px-2 py-1 border-0 text-xs text-right focus:ring-1 focus:ring-blue-500" 
                              style={{ height: '26px' }} 
                              placeholder="0" 
                              disabled={isAutoLine || !isDraft} 
                            />
                          </td>}
                          {visibleColumns.discount_date && <td className="border border-gray-300 p-1" style={{ minWidth: '120px' }}>
                            <input 
                              type="date" 
                              value={line.discount_date || ''} 
                              onChange={(e) => handleLineChange(line.id, 'discount_date', e.target.value)} 
                              onKeyDown={(e) => handleColumnTab(e, line, 'discount_date')} 
                              className="w-full px-2 py-1 border-0 text-xs focus:ring-1 focus:ring-blue-500" 
                              style={{ height: '26px' }} 
                              disabled={isAutoLine || !isDraft} 
                            />
                          </td>}
                          <td className="border border-gray-300 p-1 w-[40px]">
                            {isAutoLine ? (
                              <div className="flex items-center justify-center gap-1">
                                <Tooltip text={line.is_counterpart ? "Contrepartie partenaire" : line.is_tax_line ? "TVA auto" : "Contrepartie retenue"} position="left">
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

              <div className="flex flex-wrap items-center gap-4 mb-2 text-xs text-gray-500 px-2">
                <div className="flex items-center gap-1"><span>⬇️</span> Compte de charge</div>
                <div className="flex items-center gap-1"><span>⬆️</span> Compte de produit</div>
                <div className="flex items-center gap-1"><FiZap size={12} className="text-blue-400" /><span>TVA Auto</span></div>
                <div className="flex items-center gap-1"><FiZap size={12} className="text-purple-400" /><span>Contrepartie Partenaire</span></div>
                <div className="flex items-center gap-1"><FiZap size={12} className="text-orange-400" /><span>Contrepartie Retenue</span></div>
              </div>

              <div className="mb-3 flex items-center gap-4">
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

              <div className="bg-green-50 border border-green-200 px-4 py-2 flex justify-end gap-6">
                <div className="text-sm font-bold text-gray-900">Total débit: {formatAmount(totals.debit)} XOF</div>
                <div className="text-sm font-bold text-gray-900">Total crédit: {formatAmount(totals.credit)} XOF</div>
              </div>
            </>
          )}

          {/* ONGLET NOTES */}
          {activeTab === 'notes' && (
            <div className="border border-gray-300">
              <div className="grid grid-cols-3 bg-gray-100 border-b border-gray-300">
                {['Devise', 'Position fiscale', 'Entité'].map((h, i) => (
                  <div key={i} className={`${i < 2 ? 'border-r border-gray-300' : ''} px-2 py-1.5 text-xs font-medium text-gray-700`}>{h}</div>
                ))}
              </div>
              <div className="grid grid-cols-3 border-b border-gray-300">
                <div className="border-r border-gray-300 p-1">
                  <AutocompleteInput value={formData.currency_label} selectedId={formData.currency_id} onChange={(text) => handleChange('currency_label', text)} onSelect={(id, label) => { setFormData(prev => ({ ...prev, currency_id: id, currency_label: label })); markAsModified(); }} options={devises} getOptionLabel={(o) => `${o.code}${o.symbole ? ` (${o.symbole})` : ''}`} placeholder="Devise" disabled={!isDraft} />
                </div>
                <div className="border-r border-gray-300 p-1">
                  <AutocompleteInput value={formData.fiscal_position_label} selectedId={formData.fiscal_position_id} onChange={(text) => handleChange('fiscal_position_label', text)} onSelect={(id, label) => { setFormData(prev => ({ ...prev, fiscal_position_id: id, fiscal_position_label: label })); markAsModified(); }} options={fiscalPositions} getOptionLabel={(f) => f.name} placeholder="Position fiscale" disabled={!isDraft} />
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
                  <input type="file" id="attachments" className="hidden" multiple onChange={(e) => { handleAttachmentsChange(e.target.files); e.target.value = ''; }} disabled={uploadingFiles} />
                  <label htmlFor="attachments" className={`inline-flex items-center gap-2 h-8 px-3 text-white text-xs cursor-pointer rounded ${uploadingFiles ? 'bg-gray-400 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-700'}`}>
                    <FiUpload size={12} /><span>{uploadingFiles ? 'Upload en cours...' : 'Ajouter des fichiers'}</span>
                  </label>
                  <p className="text-xs text-gray-500 mt-2">Formats acceptés : PDF, JPG, PNG, DOC (max 10MB)</p>
                </div>
              )}
              {attachmentsList.length > 0 ? (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {attachmentsList.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 border border-gray-200 rounded">
                      <div className="flex items-center gap-2 flex-1">
                        <FiPaperclip className="text-gray-500 flex-shrink-0" size={14} />
                        <span className="text-xs text-gray-700 truncate">{file.name}</span>
                        <span className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB</span>
                      </div>
                      {isDraft && <button onClick={() => removeAttachment(index)} className="text-red-600 hover:text-red-800 ml-2"><FiTrash2 size={14} /></button>}
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

          </div>
          {showTraceabilityPanel && (
            <aside className="border-l border-gray-300 bg-gray-50 min-h-[420px]">
              <div className="sticky top-0">
                <div className="px-4 py-3 border-b border-gray-300 bg-white flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FiInfo className="text-purple-600" size={14} />
                    <h3 className="text-xs font-semibold text-gray-800 uppercase tracking-wide">Traçabilité</h3>
                  </div>
                  <button type="button" onClick={() => setShowTraceabilityPanel(false)} className="text-xs text-gray-500 hover:text-gray-900">Fermer</button>
                </div>
                <div className="px-4 py-3">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-medium text-gray-700">Activité liée à la pièce</span>
                    <span className="text-[11px] text-gray-500">{traceabilityLogs.length} événement(s)</span>
                  </div>
                  {traceabilityLogs.length > 0 ? (
                    <div className="space-y-2 max-h-[calc(100vh-240px)] overflow-y-auto pr-1">
                      {traceabilityLogs.map(log => (
                        <div key={log.id} className="bg-white border border-gray-200 px-3 py-2">
                          <div className="text-xs font-medium text-gray-900">{log.action}</div>
                          {(log.target || log.modelName) && (
                            <div className="text-[11px] text-gray-500 mt-0.5">
                              {[log.target, log.modelName].filter(Boolean).join(' - ')}
                            </div>
                          )}
                          {log.description && <div className="text-xs text-gray-600 mt-1">{log.description}</div>}
                          <div className="flex items-center justify-between gap-2 text-[11px] text-gray-500 mt-2">
                            <span className="truncate">Par {log.createdBy || log.user}</span>
                            <span className="whitespace-nowrap">{log.date ? formatDateForDisplay(log.date) : ''}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-white border border-dashed border-gray-300 px-3 py-3 text-xs text-gray-500">
                      Aucune traçabilité disponible pour cette pièce. Le panneau lira les actions depuis le journal global du module.
                    </div>
                  )}
                </div>
              </div>
            </aside>
          )}
        </div>
      </div>

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
    </div>
  );
}

