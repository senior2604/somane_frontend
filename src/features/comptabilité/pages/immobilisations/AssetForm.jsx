import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FiBookOpen, FiCopy, FiCornerUpLeft, FiLayers, FiPause, FiPlay,
  FiPlus, FiPrinter, FiRefreshCw, FiMoreHorizontal, FiSettings, FiTrash2, FiX, FiFilter, FiSearch,
} from 'react-icons/fi';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate, useParams } from 'react-router-dom';

import UnifiedFormPage from '../../../../components/UnifiedFormPage';
import ColumnVisibilityMenu from '../../../../components/ColumnVisibilityMenu';
import StatusTrack from '../../../../components/StatusTrack';
import axiosInstance from '../../../../config/axiosInstance';
import { SearchSelect } from '../payement/paymentShared.jsx';
import {
  API, ASSET_STATES, ASSET_TYPES, COMPUTATIONS, Field, METHODS,
  MODIFICATION_TYPES, PERIODS, AmountInput, AssetAutocomplete, AssetTable, accountLabel, currencyLabel,
  formatDate, formatDateTime, formatMoney, getActionErrorMessage,
  getActiveEntityId, inputClass, joinLabel, journalLabel, normalizeApiList,
  relationId, userLabel, isOperationalAccount,
} from './assetShared.jsx';

const today = () => new Date().toISOString().slice(0, 10);
const EMPTY_FORM = {
  name: '', code: '', currency_id: '', category_id: '', asset_type: 'acquisition',
  state: 'draft', location: '', used_by: '', original_value: '', acquisition_date: today(),
  asset_group: '', already_depreciated_amount_import: 0, salvage_value: 0,
  depreciate_method: 'linear', declining_coefficient: 1, work_unit_nature: '',
  work_units_consumed: 0, work_units_total: 0, method_number: 5,
  method_period: 'year', computation_type: 'actual', service_start_date: today(),
  asset_lifetime_days: '', asset_paused_days: 0, account_asset_id: '',
  account_depreciation_id: '', account_depreciation_expense_id: '',
  account_impairment_id: '', account_impairment_expense_id: '',
  account_dispose_expense_id: '', account_disposal_id: '', journal_id: '',
  revaluation_gain_account_id: '', revaluation_loss_account_id: '', parent_id: '',
};

const EMPTY_OPERATION = {
  modify_type: 'sale', disposal_date: today(), journal_id: '', sale_price: 0,
  fee_sale: 0, current_value: '', impairment_amount: 0,
  impairment_reversal_amount: 0, revaluation_gain: 0, revaluation_loss: 0,
  salvage_value: '', method_number: '', method_period: '', force_post: false, note: '',
};

const EMPTY_INVOICE_DIALOG = {
  open: false, type: 'supplier', loading: false, saving: false,
  selectedId: '', options: [], error: '', query: '', filtersOpen: false,
  typeFilter: '', stateFilter: '',
};

const DEPRECIATION_COLUMNS = [
  { key: 'sequence', label: 'Échéance', width: 100, required: true },
  { key: 'date', label: 'Date', width: 140, required: true },
  { key: 'name', label: 'N° pièce', width: 200, required: true },
  { key: 'label', label: 'Libellé', width: 280 },
  { key: 'amount', label: 'Montant', width: 180, required: true, numeric: true },
  { key: 'cumulative', label: 'Cumul amorti', width: 180, numeric: true },
  { key: 'book_value', label: 'Valeur comptable', width: 180, numeric: true },
  { key: 'state', label: 'État', width: 140 },
];
const ACCOUNT_TYPES = [
  { id: 'account_asset_id', label: "Compte d'immobilisation", required: true, entryType: 'disposal' },
  { id: 'account_depreciation_id', label: "Compte d'amortissement", required: true, entryType: 'depreciation' },
  { id: 'account_depreciation_expense_id', label: 'Compte de dotation', required: true, entryType: 'depreciation' },
  { id: 'account_impairment_id', label: 'Compte de dépréciation', entryType: 'impairment' },
  { id: 'account_impairment_expense_id', label: 'Dotation pour dépréciation', entryType: 'impairment' },
  { id: 'account_dispose_expense_id', label: 'Valeur comptable de sortie', entryType: 'disposal' },
  { id: 'account_disposal_id', label: 'Produit de cession', entryType: 'disposal' },
  { id: 'revaluation_gain_account_id', label: 'Écart positif de réévaluation', entryType: 'revaluation' },
  { id: 'revaluation_loss_account_id', label: 'Écart négatif de réévaluation', entryType: 'revaluation' },
];
const ACCOUNTING_OPTIONAL_TYPES = ACCOUNT_TYPES.filter((type) => !type.required);
const ACCOUNTING_ENTRY_TYPES = [
  { id: 'depreciation', label: 'Dotation aux amortissements' },
  { id: 'revaluation', label: 'Réévaluation' },
  { id: 'disposal', label: "Sortie d'immobilisation" },
  { id: 'impairment', label: 'Dépréciation de valeur' },
];
const ACCOUNTING_ADD_ENTRY_TYPES = ACCOUNTING_ENTRY_TYPES.filter((entryType) => (
  ACCOUNTING_OPTIONAL_TYPES.some((accountType) => accountType.entryType === entryType.id)
));
const REQUIRED_ACCOUNTING_ROWS = ACCOUNT_TYPES.filter((type) => type.required);
const ACCOUNTING_COLUMNS = [
  { id: 'accountType', label: 'Type de compte' },
  { id: 'entryType', label: "Type d'écriture" },
  { id: 'account', label: 'Compte' },
  { id: 'journal', label: 'Journal' },
];
const ACCOUNTING_COLUMNS_STORAGE_KEY = 'comptabilite:asset:accounting:columns:v1';
const normalizeAssetTab = (tab) => ['method', 'depreciation', 'advanced'].includes(tab) ? 'asset' : (tab || 'asset');
const INVOICE_COLUMNS = [
  { key: 'date', label: 'Date', width: 140, required: true },
  { key: 'name', label: 'N° pièce', width: 200, required: true },
  { key: 'reference', label: 'Référence', width: 220 },
  { key: 'label', label: 'Libellé', width: 300 },
  { key: 'amount', label: 'Montant', width: 180, numeric: true },
  { key: 'state', label: 'État', width: 140 },
  { key: 'actions', label: '', width: 54, required: true },
];

const normalizeLinkedEntries = (value) => {
  if (!Array.isArray(value)) return [];
  return value.map((entry, index) => {
    if (entry && typeof entry === 'object') return { ...entry, id: entry.id ?? `entry-${index}` };
    return { id: entry, name: `#${entry}` };
  });
};

const getInvoiceKind = (move) => {
  const moveType = String(move?.move_type || '').toLowerCase();
  if (['in_invoice', 'in_refund'].includes(moveType)) return 'supplier';
  if (['out_invoice', 'out_refund'].includes(moveType)) return 'customer';
  if (moveType !== 'entry') return null;

  const journal = move?.journal || {};
  const journalType = journal.type || {};
  const text = [journalType.code, journalType.name, journal.code, journal.name, move.journal_code, move.journal_name]
    .filter(Boolean)
    .join(' ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  const tokens = text.split(/[^a-z0-9]+/).filter(Boolean);
  if (tokens.some((token) => token.startsWith('ach') || token.startsWith('pur'))) return 'supplier';
  if (tokens.some((token) => token.startsWith('vte') || token.startsWith('ven') || token.startsWith('sal'))) return 'customer';
  return null;
};

const LinkedEntriesTable = ({ storageKey, rows, currency, emptyLabel, onOpen, onRemove, footer }) => (
  <AssetTable
    storageKey={storageKey}
    columns={INVOICE_COLUMNS}
    rows={rows}
    emptyLabel={emptyLabel}
    footer={footer}
    totals={{ amount: formatMoney(rows.reduce((sum, entry) => sum + Number(entry.amount || entry.amount_total || 0), 0), currency) }}
    renderCell={(entry, column) => {
      if (column.key === 'actions') {
        return onRemove ? <button type="button" title="Retirer cette facture" onClick={() => onRemove(entry)} className="px-2 py-1 text-gray-400 hover:text-red-600"><FiTrash2 size={13} /></button> : null;
      }
      const value = {
        date: formatDate(entry.date || entry.invoice_date || entry.accounting_date),
        name: entry.name || entry.move_name || entry.number || `#${entry.id}`,
        reference: entry.reference || entry.ref || entry.invoice_number || '-',
        label: entry.label || entry.description || entry.narration || '-',
        amount: formatMoney(entry.amount ?? entry.amount_total ?? entry.balance ?? 0, currency),
        state: entry.state_label || ({ draft: 'Brouillon', posted: 'Comptabilisé', cancel: 'Annulé' }[entry.state]) || entry.state || '-',
      }[column.key];
      const linkedMoveId = entry.move_id || entry.account_move_id || entry.move?.id || entry.piece_id;
      if (column.key === 'name' && onOpen && linkedMoveId) {
        return <button type="button" title="Ouvrir la pièce comptable" onClick={() => onOpen(entry)} className="w-full truncate px-1 py-1 text-left font-medium text-teal-700 hover:underline">{value}</button>;
      }
      return <div title={String(value)} className="truncate px-1 py-1">{value}</div>;
    }}
  />
);

const categoryDefaults = (current, category) => {
  if (!category) return current;
  const accountValues = ACCOUNT_TYPES.reduce((values, row) => ({
    ...values, [row.id]: relationId(category[row.id]) || '',
  }), {});
  const hasSalvagePercent = category.salvage_value_percent !== null
    && category.salvage_value_percent !== undefined
    && category.salvage_value_percent !== '';
  const next = {
    ...current, ...accountValues, category_id: category.id,
    journal_id: relationId(category.journal_id) || '',
    depreciate_method: category.method || 'linear',
    method_number: category.method_number ?? 5,
    method_period: category.method_period || 'year',
    declining_coefficient: category.method_progress_factor ?? 1,
    computation_type: category.prorata === false ? 'none' : category.prorata === true ? 'actual' : current.computation_type,
    salvage_value: hasSalvagePercent
      ? Number(current.original_value || 0) * Number(category.salvage_value_percent) / 100
      : current.salvage_value,
  };
  return next;
};

let optionCache = null;
let optionPromise = null;

const getOptions = async (entityId) => {
  if (optionCache?.entityId === String(entityId) && Date.now() - optionCache.loadedAt < 30000) return optionCache.data;
  if (!optionPromise) {
    optionPromise = Promise.all([
      axiosInstance.get(API.categories, { params: { company_id: entityId, active: true, page_size: 1000 } }),
      axiosInstance.get(API.accounts, { params: { company: entityId, page_size: 10000 } }),
      axiosInstance.get(API.journals, { params: { company: entityId, company_id: entityId, page_size: 500 } }),
      axiosInstance.get(API.currencies, { params: { page_size: 500 } }),
      axiosInstance.get(API.users, { params: { page_size: 1000 } }).catch(() => ({ data: [] })),
      axiosInstance.get(API.assets, { params: { company_id: entityId, page_size: 1000 } }).catch(() => ({ data: [] })),
      axiosInstance.get(`${API.entities}${entityId}/`).catch(() => ({ data: {} })),
    ]).then(([categories, accounts, journals, currencies, users, assets, entity]) => ({
      categories: normalizeApiList(categories.data),
      accounts: normalizeApiList(accounts.data).filter(isOperationalAccount),
      journals: normalizeApiList(journals.data),
      currencies: normalizeApiList(currencies.data),
      users: normalizeApiList(users.data),
      assets: normalizeApiList(assets.data),
      companyCurrencyId: relationId(entity.data?.devise) || relationId(entity.data?.devise_details),
      companyName: entity.data?.raison_sociale || entity.data?.name || entity.data?.nom || '',
    })).finally(() => { optionPromise = null; });
  }
  const data = await optionPromise;
  optionCache = { entityId: String(entityId), data, loadedAt: Date.now() };
  return data;
};

const writableFields = Object.keys(EMPTY_FORM);
const normalizeRecord = (data = {}) => {
  const result = { ...EMPTY_FORM };
  writableFields.forEach((field) => {
    if (data[field] !== undefined && data[field] !== null) result[field] = relationId(data[field]);
  });
  if (!data.service_start_date) result.service_start_date = result.acquisition_date || today();
  return result;
};

export default function AssetForm({ mode = 'create' }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const entityId = getActiveEntityId();
  const isShow = mode === 'show' || mode === 'detail';
  const preload = isShow ? location.state?.assetRecord : null;
  const duplicate = !isShow ? location.state?.duplicateAsset : null;
  const restoredDraft = location.state?.restoreAssetDraft;
  const createdCategory = location.state?.createdAssetCategory;
  const menuRef = useRef(null);
  const [form, setForm] = useState(() => categoryDefaults(normalizeRecord(restoredDraft?.form || duplicate || preload || {}), createdCategory));
  const [record, setRecord] = useState(preload || null);
  const [options, setOptions] = useState(() => optionCache?.data || { categories: [], accounts: [], journals: [], currencies: [], users: [], assets: [], companyCurrencyId: '', companyName: '' });
  const [operations, setOperations] = useState(() => preload?.modifications || []);
  const [traceability, setTraceability] = useState(() => preload?.traceability || []);
  const [activeTab, setActiveTab] = useState(normalizeAssetTab(restoredDraft?.activeTab));
  const [traceOpen, setTraceOpen] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [operationOpen, setOperationOpen] = useState(false);
  const [operation, setOperation] = useState(EMPTY_OPERATION);
  const [loading, setLoading] = useState(isShow && !preload);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(Boolean(duplicate || restoredDraft));
  const [feedback, setFeedback] = useState(null);
  const [showDepreciationBoard, setShowDepreciationBoard] = useState(false);
  const [showPlanRevisions, setShowPlanRevisions] = useState(false);
  const [invoiceDialog, setInvoiceDialog] = useState(EMPTY_INVOICE_DIALOG);
  const [pendingInvoices, setPendingInvoices] = useState([]);
  const [validationDialog, setValidationDialog] = useState(null);
  const [accountingTypeMenuOpen, setAccountingTypeMenuOpen] = useState(false);
  const [accountingTypeMenuStyle, setAccountingTypeMenuStyle] = useState(null);
  const [visibleAccountingColumns, setVisibleAccountingColumns] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(ACCOUNTING_COLUMNS_STORAGE_KEY) || 'null');
      return Array.isArray(stored) ? stored.filter((id) => ACCOUNTING_COLUMNS.some((column) => column.id === id)) : ACCOUNTING_COLUMNS.map((column) => column.id);
    } catch { return ACCOUNTING_COLUMNS.map((column) => column.id); }
  });
  const [additionalAccountingRows, setAdditionalAccountingRows] = useState([]);
  const accountingTypeMenuRef = useRef(null);
  const accountingTypePopupRef = useRef(null);
  const accountingTypeButtonRef = useRef(null);
  const accountingRowSequenceRef = useRef(0);
  const depreciationBoardRef = useRef(null);
  const lifetimeInputRef = useRef(null);
  const planRevisionsRef = useRef(null);

  useEffect(() => {
    const closeMenu = (event) => { if (menuRef.current && !menuRef.current.contains(event.target)) setMenuOpen(false); };
    document.addEventListener('mousedown', closeMenu);
    return () => document.removeEventListener('mousedown', closeMenu);
  }, []);

  useEffect(() => {
    const closeMenu = (event) => {
      if (!accountingTypeMenuRef.current?.contains(event.target)
        && !accountingTypePopupRef.current?.contains(event.target)) setAccountingTypeMenuOpen(false);
    };
    const closeOnEscape = (event) => { if (event.key === 'Escape') setAccountingTypeMenuOpen(false); };
    document.addEventListener('mousedown', closeMenu);
    document.addEventListener('keydown', closeOnEscape);
    window.addEventListener('scroll', closeMenu, true);
    window.addEventListener('resize', closeMenu);
    return () => {
      document.removeEventListener('mousedown', closeMenu);
      document.removeEventListener('keydown', closeOnEscape);
      window.removeEventListener('scroll', closeMenu, true);
      window.removeEventListener('resize', closeMenu);
    };
  }, []);

  useEffect(() => {
    try { localStorage.setItem(ACCOUNTING_COLUMNS_STORAGE_KEY, JSON.stringify(visibleAccountingColumns)); } catch {}
  }, [visibleAccountingColumns]);

  const loadTraceability = useCallback(async () => {
    if (!isShow || !id) { setTraceability([]); return; }
    try {
      const response = await axiosInstance.get(API.traceability, { params: { company: entityId, company_id: entityId, model_name: 'AccountAsset', object_id: id, page_size: 100 } });
      setTraceability(normalizeApiList(response.data).filter((event) => String(event.object_id) === String(id) && String(event.model_name || '').toLowerCase().includes('accountasset')));
    } catch { setTraceability([]); }
  }, [entityId, id, isShow]);

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!entityId) return;
    if (!silent && isShow && !preload) setLoading(true);
    try {
      const [loadedOptions, detail, modificationResponse] = await Promise.all([
        getOptions(entityId),
        isShow ? axiosInstance.get(`${API.assets}${id}/`) : Promise.resolve({ data: null }),
        isShow ? axiosInstance.get(API.modifications, { params: { asset_id: id, page_size: 500 } }).catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
      ]);
      const categories = createdCategory
        ? [...loadedOptions.categories.filter((item) => String(item.id) !== String(createdCategory.id)), createdCategory]
        : loadedOptions.categories;
      setOptions({ ...loadedOptions, categories });
      if (createdCategory && optionCache?.entityId === String(entityId)) optionCache.data = { ...loadedOptions, categories };
      if (!isShow) {
        const defaultCurrency = loadedOptions.currencies.find((item) => String(item.id) === String(loadedOptions.companyCurrencyId))
          || loadedOptions.currencies.find((item) => item.code === 'XOF')
          || loadedOptions.currencies[0];
        if (defaultCurrency) setForm((current) => current.currency_id ? current : ({ ...current, currency_id: defaultCurrency.id }));
      }
      if (detail.data) {
        setRecord(detail.data);
        if (!restoredDraft || silent) {
          const nextForm = normalizeRecord(detail.data);
          setForm(nextForm);
        }
        setOperations(detail.data.modifications || normalizeApiList(modificationResponse.data));
        if (!restoredDraft || silent) setDirty(false);
      }
    } catch (error) {
      setFeedback({ type: 'error', message: getActionErrorMessage(error, "Impossible de charger l'immobilisation.") });
    } finally { setLoading(false); }
  }, [entityId, id, isShow, preload, createdCategory, restoredDraft]);

  useEffect(() => {
    load();
    loadTraceability();
  }, [load, loadTraceability]);

  const setField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setDirty(true);
    setFeedback(null);
  };

  const setOriginalValue = (value) => {
    setForm((current) => {
      const category = options.categories.find((item) => String(item.id) === String(relationId(current.category_id)));
      const hasSalvagePercent = category?.salvage_value_percent !== null
        && category?.salvage_value_percent !== undefined
        && category?.salvage_value_percent !== '';
      return {
        ...current,
        original_value: value,
        ...(hasSalvagePercent ? { salvage_value: Number(value || 0) * Number(category.salvage_value_percent) / 100 } : {}),
      };
    });
    setDirty(true);
    setFeedback(null);
  };

  const setAcquisitionDate = (value) => {
    setForm((current) => ({
      ...current,
      acquisition_date: value,
      service_start_date: !current.service_start_date || current.service_start_date === current.acquisition_date
        ? value
        : current.service_start_date,
    }));
    setDirty(true);
    setFeedback(null);
  };

  const selectCategory = (value, category) => {
    if (!category) { setField('category_id', value); return; }
    setForm((current) => categoryDefaults(current, { ...category, id: value }));
    setDirty(true);
    setFeedback(null);
  };

  const toggleAccountingColumn = (columnId) => {
    setVisibleAccountingColumns((current) => current.includes(columnId)
      ? current.filter((id) => id !== columnId)
      : [...current, columnId]);
  };

  const addAccountingRow = () => {
    accountingRowSequenceRef.current += 1;
    setAdditionalAccountingRows((current) => [...current, {
      id: `additional-${accountingRowSequenceRef.current}`,
      entryType: '',
      accountTypeId: '',
    }]);
  };

  const changeAdditionalEntryType = (rowId, entryType) => {
    const row = additionalAccountingRows.find((item) => item.id === rowId);
    if (row?.accountTypeId) setField(row.accountTypeId, '');
    setAdditionalAccountingRows((current) => current.map((item) => item.id === rowId
      ? { ...item, entryType, accountTypeId: '' }
      : item));
  };

  const changeAdditionalAccountType = (rowId, accountTypeId) => {
    const row = additionalAccountingRows.find((item) => item.id === rowId);
    if (row?.accountTypeId && row.accountTypeId !== accountTypeId) setField(row.accountTypeId, '');
    if (rowId === 'entry-slot-revaluation') {
      setAdditionalAccountingRows((current) => [...current, { id: rowId, entryType: 'revaluation', accountTypeId, fixedEntry: true }]);
      return;
    }
    setAdditionalAccountingRows((current) => current.map((row) => row.id === rowId
      ? { ...row, accountTypeId }
      : row));
  };

  const removeAdditionalAccountingRow = (rowId) => {
    const row = additionalAccountingRows.find((item) => item.id === rowId);
    if (row?.accountTypeId) setField(row.accountTypeId, '');
    if (rowId.startsWith('configured-')) {
      setField(rowId.slice('configured-'.length), '');
      return;
    }
    setAdditionalAccountingRows((current) => current.filter((row) => row.id !== rowId));
  };

  const toggleAccountingTypeMenu = () => {
    if (accountingTypeMenuOpen) { setAccountingTypeMenuOpen(false); return; }
    const rect = accountingTypeButtonRef.current?.getBoundingClientRect();
    if (!rect) return;
    const width = Math.min(256, window.innerWidth - 16);
    const height = Math.min(280, 44 + ACCOUNTING_COLUMNS.length * 32);
    setAccountingTypeMenuStyle({
      position: 'fixed', zIndex: 10000, width,
      left: Math.max(8, Math.min(rect.right - width, window.innerWidth - width - 8)),
      top: rect.bottom + height > window.innerHeight ? Math.max(8, rect.top - height) : rect.bottom + 2,
      maxHeight: Math.min(height, window.innerHeight - 16), overflowY: 'auto',
    });
    setAccountingTypeMenuOpen(true);
  };

  const createCategory = (query) => {
    navigate('/comptabilite/categories-immobilisations/create', { state: {
      returnTo: `${location.pathname}${location.search || ''}`,
      restoreAssetDraft: { form, activeTab },
      suggestedValue: query,
    } });
  };

  const validate = () => {
    const errors = [];
    if (!form.name?.trim()) errors.push('La désignation est obligatoire.');
    if (!form.code?.trim()) errors.push("Le numéro d'inventaire est obligatoire.");
    if (!relationId(form.category_id)) errors.push('La catégorie est obligatoire.');
    if (!relationId(form.currency_id)) errors.push('La devise est obligatoire.');
    if (Number(form.original_value || 0) < 0) errors.push("La valeur d'origine ne peut pas être négative.");
    if (!form.acquisition_date) errors.push("La date d'acquisition est obligatoire.");
    if (!relationId(form.account_asset_id)) errors.push("Le compte d'immobilisation est obligatoire.");
    if (!relationId(form.account_depreciation_id)) errors.push("Le compte d'amortissement est obligatoire.");
    if (!relationId(form.account_depreciation_expense_id)) errors.push('Le compte de dotation est obligatoire.');
    if (!relationId(form.journal_id)) errors.push('Le journal est obligatoire.');
    if (Number(form.method_number || 0) <= 0) errors.push('La durée d’amortissement doit être supérieure à zéro.');
    if (Number(form.salvage_value || 0) > Number(form.original_value || 0)) errors.push("La valeur résiduelle ne peut pas dépasser la valeur d'origine.");
    if (form.service_start_date && form.service_start_date < form.acquisition_date) errors.push("La mise en service ne peut pas précéder l'acquisition.");
    if (form.depreciate_method === 'units' && Number(form.work_units_total || 0) <= 0) errors.push("Le total d'unités d'œuvre doit être supérieur à zéro.");
    return errors;
  };

  const buildPayload = () => {
    const data = { company_id: Number(entityId), state: form.state || 'draft' };
    writableFields.forEach((field) => { data[field] = form[field]; });
    ['currency_id', 'category_id', 'used_by', 'account_asset_id', 'account_depreciation_id', 'account_depreciation_expense_id', 'account_impairment_id', 'account_impairment_expense_id', 'account_dispose_expense_id', 'account_disposal_id', 'journal_id', 'revaluation_gain_account_id', 'revaluation_loss_account_id', 'parent_id'].forEach((field) => { data[field] = relationId(form[field]) || null; });
    ['original_value', 'already_depreciated_amount_import', 'salvage_value', 'declining_coefficient', 'work_units_consumed', 'work_units_total'].forEach((field) => { data[field] = Number(form[field] || 0); });
    ['method_number', 'asset_lifetime_days', 'asset_paused_days'].forEach((field) => { data[field] = form[field] === '' ? null : Number(form[field]); });
    data.service_start_date = form.service_start_date || null;
    return data;
  };

  const save = async ({ forCalculation = false } = {}) => {
    const errors = validate();
    if (errors.length) {
      if (forCalculation) setValidationDialog({ title: 'Calcul impossible', message: errors.join('\n') });
      else setFeedback({ type: 'error', message: errors.join('\n') });
      return false;
    }
    setSaving(true);
    try {
      const existingId = isShow ? id : record?.id;
      const requestConfig = forCalculation ? { timeout: 60000 } : undefined;
      const response = existingId
        ? await axiosInstance.patch(`${API.assets}${existingId}/`, buildPayload(), requestConfig)
        : await axiosInstance.post(API.assets, buildPayload(), requestConfig);
      let savedAsset = response.data;
      const failedInvoices = [];
      for (const pending of pendingInvoices) {
        try {
          const invoiceType = getInvoiceKind(pending.invoice) || pending.invoice_type;
          const linked = await axiosInstance.post(`${API.assets}${savedAsset.id}/link-invoice/`, {
            move_id: Number(pending.move_id),
            invoice_type: invoiceType,
          });
          savedAsset = linked.data;
        } catch (error) {
          failedInvoices.push({
            ...pending,
            invoice_type: getInvoiceKind(pending.invoice) || pending.invoice_type,
            error: getActionErrorMessage(error, 'Échec de liaison.'),
          });
        }
      }
      setRecord(savedAsset);
      setForm(normalizeRecord(savedAsset));
      setPendingInvoices(failedInvoices);
      setDirty(false);
      if (failedInvoices.length) {
        const message = `Immobilisation enregistrée, mais ${failedInvoices.length} facture(s) n’ont pas pu être associées. Cliquez de nouveau sur Enregistrer pour réessayer. ${failedInvoices.map((item) => item.error).join(' ')}`;
        setFeedback({ type: 'error', message });
        return false;
      }
      return savedAsset;
    } catch (error) {
      const message = getActionErrorMessage(error, "Échec de l'enregistrement de l'immobilisation.");
      if (forCalculation) setValidationDialog({ title: 'Calcul impossible', message });
      else setFeedback({ type: 'error', message });
      return false;
    } finally { setSaving(false); }
  };

  const runAction = async (action, confirmation) => {
    setMenuOpen(false);
    if (dirty) { setFeedback({ type: 'error', message: "Enregistrez les modifications avant d'exécuter cette action." }); return; }
    if (action === 'start' && form.state === 'draft') {
      const rows = record?.depreciation_board || [];
      const dueCount = rows.filter((row) => String(row.date).slice(0, 10) <= today()).length;
      if (dueCount) confirmation = `${confirmation}\n${dueCount} dotation(s) déjà échue(s) seront comptabilisées au prochain passage de la tâche automatique.`;
    }
    if (confirmation && !window.confirm(confirmation)) return;
    setSaving(true);
    try {
      const response = await axiosInstance.post(`${API.assets}${id}/${action}/`);
      setRecord(response.data);
      setForm(normalizeRecord(response.data));
      setDirty(false);
      await loadTraceability();
    } catch (error) {
      const message = getActionErrorMessage(error, "L'action n'a pas pu être exécutée.");
      if (action === 'start') setValidationDialog({ title: 'Mise en service impossible', message });
      else setFeedback({ type: 'error', message });
    }
    finally { setSaving(false); }
  };

  const deleteRecord = async () => {
    setMenuOpen(false);
    if (!window.confirm('Supprimer cette immobilisation en brouillon ?')) return;
    try { await axiosInstance.delete(`${API.assets}${id}/`); navigate('/comptabilite/immobilisations', { replace: true }); }
    catch (error) { setFeedback({ type: 'error', message: getActionErrorMessage(error, 'Suppression impossible.') }); }
  };

  const duplicateRecord = () => {
    setMenuOpen(false);
    navigate('/comptabilite/immobilisations/create', { state: { duplicateAsset: { ...form, code: '', name: `${form.name} (copie)`, state: 'draft' } } });
  };

  const openModification = () => {
    setMenuOpen(false);
    setOperation({ ...EMPTY_OPERATION, journal_id: form.journal_id });
    setOperationOpen(true);
  };

  const showDepreciation = () => {
    setActiveTab('asset');
    setShowDepreciationBoard(true);
    setFeedback(null);
    window.setTimeout(() => depreciationBoardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
  };

  const calculateDepreciation = async () => {
    setMenuOpen(false);
    let asset = record;
    if (!isShow || dirty || !asset?.id) {
      asset = await save({ forCalculation: true });
      if (!asset?.id) return;
    }

    setSaving(true);
    setFeedback(null);
    setValidationDialog(null);
    try {
      const response = await axiosInstance.post(`${API.assets}${asset.id}/calculate/`, null, { timeout: 60000 });
      setRecord(response.data);
      setForm(normalizeRecord(response.data));
      setDirty(false);
      setShowDepreciationBoard(true);
      setActiveTab('asset');
      await loadTraceability();
      window.setTimeout(() => depreciationBoardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
    } catch (error) {
      setValidationDialog({ title: 'Calcul impossible', message: getActionErrorMessage(error, "Le plan d'amortissement n'a pas pu être préparé.") });
    } finally {
      setSaving(false);
    }
  };

  const showPlanRevisionList = () => {
    setActiveTab('asset');
    setShowPlanRevisions(true);
    setFeedback(null);
    window.setTimeout(() => planRevisionsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
  };

  const handleModification = () => {
    setMenuOpen(false);
    if (!isShow) {
      setFeedback({ type: 'error', message: "Enregistrez d'abord l'immobilisation avant de la modifier." });
      return;
    }
    if (dirty) {
      setFeedback({ type: 'error', message: "Enregistrez les modifications en cours avant de modifier l'immobilisation." });
      return;
    }
    if (form.state === 'draft') {
      setValidationDialog({
        kind: 'draftModification',
        title: 'Immobilisation en brouillon',
        message: "Cette immobilisation est en brouillon. Vous pouvez modifier directement ses champs sur cette fiche puis cliquer sur Enregistrer. Il n'est pas nécessaire de la mettre en service pour la modifier.",
      });
      return;
    }
    if (!['running', 'waiting'].includes(form.state)) {
      setFeedback({ type: 'error', message: "Cette immobilisation ne peut plus être modifiée dans son état actuel." });
      return;
    }
    openModification();
  };

  const openInvoiceDialog = async (type) => {
    if (isShow && dirty) {
      setFeedback({ type: 'error', message: "Enregistrez les modifications en cours avant d'ajouter une facture." });
      return;
    }
    setInvoiceDialog({ ...EMPTY_INVOICE_DIALOG, open: true, type, loading: true });
    try {
      const response = await axiosInstance.get(API.moves, {
        params: {
          company: entityId,
          company_id: entityId,
          ordering: '-date',
          page_size: 1000,
        },
      });
      setInvoiceDialog((current) => ({ ...current, loading: false, options: normalizeApiList(response.data) }));
    } catch (error) {
      setInvoiceDialog((current) => ({
        ...current,
        loading: false,
        error: getActionErrorMessage(error, 'Impossible de charger les factures.'),
      }));
    }
  };

  const linkInvoice = async () => {
    if (!invoiceDialog.selectedId) {
      setInvoiceDialog((current) => ({ ...current, error: 'Sélectionnez une facture.' }));
      return;
    }
    const selectedMove = invoiceDialog.options.find((item) => String(item.id) === String(invoiceDialog.selectedId));
    const invoiceType = getInvoiceKind(selectedMove);
    if (!selectedMove || !invoiceType) {
      setInvoiceDialog((current) => ({ ...current, error: 'Cette pièce ne peut pas être associée comme facture : son type fournisseur/client n’est pas reconnu.' }));
      return;
    }
    setInvoiceDialog((current) => ({ ...current, saving: true, error: '' }));
    if (!isShow) {
      setPendingInvoices((current) => [...current, {
        move_id: selectedMove.id,
        invoice_type: invoiceType,
        invoice: selectedMove,
      }]);
      setDirty(true);
      setInvoiceDialog(EMPTY_INVOICE_DIALOG);
      setFeedback({ type: 'success', message: 'Facture prête à être associée lors de l’enregistrement de l’immobilisation.' });
      return;
    }
    try {
      const response = await axiosInstance.post(`${API.assets}${id}/link-invoice/`, {
        move_id: Number(invoiceDialog.selectedId),
        invoice_type: invoiceType,
      });
      setRecord(response.data);
      setForm(normalizeRecord(response.data));
      setInvoiceDialog(EMPTY_INVOICE_DIALOG);
      setFeedback({ type: 'success', message: 'Facture ajoutée à l’immobilisation.' });
      await loadTraceability();
    } catch (error) {
      setInvoiceDialog((current) => ({
        ...current,
        saving: false,
        error: getActionErrorMessage(error, "La facture n'a pas pu être ajoutée."),
      }));
    }
  };

  const removeInvoice = async (entry, invoiceType) => {
    const moveId = entry.move_id || entry.account_move_id || entry.move?.id || entry.piece_id || entry.id;
    if (!moveId || !window.confirm('Retirer cette facture de l’immobilisation ?')) return;

    const isPending = pendingInvoices.some((item) => String(item.move_id) === String(moveId));
    if (!isShow || isPending) {
      setPendingInvoices((current) => current.filter((item) => String(item.move_id) !== String(moveId)));
      setDirty(true);
      return;
    }

    setSaving(true);
    try {
      const response = await axiosInstance.post(`${API.assets}${id}/unlink-invoice/`, { move_id: Number(moveId), invoice_type: invoiceType });
      setRecord(response.data);
      setForm(normalizeRecord(response.data));
      setFeedback({ type: 'success', message: 'Facture retirée de l’immobilisation.' });
      await loadTraceability();
    } catch (error) {
      setFeedback({ type: 'error', message: getActionErrorMessage(error, 'La facture n’a pas pu être retirée.') });
    } finally {
      setSaving(false);
    }
  };

  const saveOperation = async () => {
    const errors = [];
    if (!operation.disposal_date) errors.push("La date de l'opération est obligatoire.");
    if (!relationId(operation.journal_id)) errors.push('Le journal est obligatoire.');
    if (operation.modify_type === 'sale' && Number(operation.sale_price || 0) <= 0) errors.push('Le prix de cession doit être supérieur à zéro.');
    if (['impairment', 'impairment_reversal', 'revaluation'].includes(operation.modify_type) && operation.current_value === '') errors.push('La valeur actuelle est obligatoire.');
    if (errors.length) { setFeedback({ type: 'error', message: errors.join('\n') }); return; }
    setSaving(true);
    try {
      const response = await axiosInstance.post(API.modifications, {
        ...operation,
        current_value: operation.current_value === '' ? null : Number(operation.current_value),
        salvage_value: operation.salvage_value === '' ? null : Number(operation.salvage_value),
        method_number: operation.method_number === '' ? null : Number(operation.method_number),
        method_period: operation.method_period || null,
        sale_price: Number(operation.sale_price || 0),
        fee_sale: Number(operation.fee_sale || 0),
        impairment_amount: Number(operation.impairment_amount || 0),
        impairment_reversal_amount: Number(operation.impairment_reversal_amount || 0),
        revaluation_gain: Number(operation.revaluation_gain || 0),
        revaluation_loss: Number(operation.revaluation_loss || 0),
        asset_id: Number(id), company_id: Number(entityId), currency_id: relationId(form.currency_id),
        journal_id: relationId(operation.journal_id),
      });
      setOperations((current) => [response.data, ...current]);
      setOperation(EMPTY_OPERATION);
      setOperationOpen(false);
      setFeedback({ type: 'success', message: 'Opération enregistrée.' });
      await load({ silent: true });
      await loadTraceability();
    } catch (error) { setFeedback({ type: 'error', message: getActionErrorMessage(error, "Échec de l'opération.") }); }
    finally { setSaving(false); }
  };

  const hasPostedDepreciation = (record?.depreciation_entries || []).some((entry) =>
    ['posted', 'comptabilise', 'comptabilisé'].includes(String(entry.state || '').toLowerCase()),
  );
  const depreciationEntryCount = record?.depreciation_entries_count ?? record?.depreciation_move_ids?.length ?? 0;
  const editable = form.state === 'draft' || (form.state === 'running' && !hasPostedDepreciation);
  const hasPreparedPlan = depreciationEntryCount > 0 || (record?.depreciation_board || []).length > 0;

  const process = (
    <div className="flex items-center justify-between gap-4 px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        {editable && <button type="button" disabled={saving} onClick={calculateDepreciation} className="somane-form-action-button">{saving ? 'Calcul en cours…' : hasPreparedPlan ? "Recalculer l'amortissement" : "Calculer l'amortissement"}</button>}
        <button type="button" disabled={saving} onClick={handleModification} className="somane-form-action-button">Modifier l'amortissement</button>
        {isShow && form.state === 'waiting' && <button type="button" disabled={saving || dirty} onClick={() => runAction('start', 'Reprendre les dotations de cette immobilisation ?')} className="somane-form-action-button"><FiPlay size={13} /> Reprendre</button>}
      </div>
      <StatusTrack
        steps={[{ id: 'draft', label: 'Brouillon' }, { id: 'running', label: 'En cours' }]}
        currentState={form.state === 'draft' ? 'draft' : 'running'}
        label="États de l’immobilisation"
      />
    </div>
  );

  const actionsMenu = (
    <div className="relative" ref={menuRef}>
      <button type="button" onClick={() => setMenuOpen((value) => !value)} className="flex h-8 items-center gap-1 border border-gray-300 px-3 text-xs text-gray-700 hover:border-purple-500 hover:bg-purple-50 hover:text-purple-700"><FiSettings size={12} />Actions</button>
      {menuOpen && <div className="absolute right-0 z-[80] mt-1 w-60 border border-gray-300 bg-white shadow-lg">
        <button type="button" onClick={() => navigate('/comptabilite/immobilisations')} className="w-full border-b border-gray-100 px-3 py-2 text-left text-xs hover:bg-purple-50">Liste des immobilisations</button>
        <button type="button" onClick={() => navigate('/comptabilite/categories-immobilisations')} className="w-full border-b border-gray-100 px-3 py-2 text-left text-xs hover:bg-purple-50">Catégories d'immobilisations</button>
        {isShow && <button type="button" onClick={duplicateRecord} className="flex w-full items-center gap-2 border-b border-gray-100 px-3 py-2 text-left text-xs hover:bg-purple-50"><FiCopy size={13} />Dupliquer</button>}
        {isShow && <button type="button" disabled={saving} onClick={handleModification} className="flex w-full items-center gap-2 border-b border-gray-100 px-3 py-2 text-left text-xs hover:bg-purple-50 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400"><FiSettings size={13} />Modifier l'amortissement</button>}
        <button type="button" onClick={() => { setMenuOpen(false); window.setTimeout(() => window.print(), 50); }} className="flex w-full items-center gap-2 border-b border-gray-100 px-3 py-2 text-left text-xs hover:bg-purple-50"><FiPrinter size={13} />Imprimer</button>
        <button type="button" onClick={() => { setMenuOpen(false); setTraceOpen((value) => !value); }} className="w-full border-b border-gray-100 px-3 py-2 text-left text-xs hover:bg-purple-50">{traceOpen ? 'Fermer la traçabilité' : 'Afficher la traçabilité'}</button>
        {isShow && form.state === 'running' && <button type="button" disabled={dirty || saving} onClick={() => runAction('pause', 'Mettre cette immobilisation en attente ?')} className="flex w-full items-center gap-2 border-b border-gray-100 px-3 py-2 text-left text-xs hover:bg-purple-50 disabled:opacity-40"><FiPause size={13} />Mettre en attente</button>}
        {isShow && form.state === 'waiting' && <button type="button" disabled={dirty || saving} onClick={() => runAction('start', 'Reprendre les dotations de cette immobilisation ?')} className="flex w-full items-center gap-2 border-b border-gray-100 px-3 py-2 text-left text-xs hover:bg-purple-50 disabled:opacity-40"><FiPlay size={13} />Reprendre</button>}
        {isShow && ['waiting', 'cancelled'].includes(form.state) && <button type="button" disabled={dirty || saving} onClick={() => runAction('draft', 'Remettre en brouillon ?')} className="flex w-full items-center gap-2 border-b border-gray-100 px-3 py-2 text-left text-xs hover:bg-purple-50 disabled:opacity-40"><FiRefreshCw size={13} />Remettre en brouillon</button>}
        {isShow && ['draft', 'waiting'].includes(form.state) && <button type="button" disabled={dirty || saving} onClick={() => runAction('cancel', 'Annuler cette immobilisation ?')} className="flex w-full items-center gap-2 border-b border-gray-100 px-3 py-2 text-left text-xs text-red-600 hover:bg-red-50 disabled:opacity-40"><FiX size={13} />Annuler</button>}
        {!isShow && <button type="button" onClick={() => { setForm(EMPTY_FORM); setPendingInvoices([]); setDirty(false); setMenuOpen(false); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-purple-50"><FiRefreshCw size={13} />Réinitialiser</button>}
        {isShow && form.state === 'draft' && <button type="button" onClick={deleteRecord} className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-red-600 hover:bg-red-50"><FiTrash2 size={13} />Supprimer</button>}
      </div>}
    </div>
  );

  const systemTrace = useMemo(() => [
    record?.write_date && record.write_date !== record.create_date ? { id: 'updated', action: 'Dernière modification', description: record.name, created_at: record.write_date, user_name: record.write_uid_label } : null,
    record?.create_date ? { id: 'created', action: 'Création', description: record.name, created_at: record.create_date, user_name: record.create_uid_label } : null,
  ].filter(Boolean), [record]);
  const displayedTrace = traceability.length ? traceability : systemTrace;
  const traceabilityContent = <div className="space-y-2 px-4 py-3">{displayedTrace.length ? displayedTrace.map((event) => <div key={event.id} className="border border-gray-200 bg-white p-3 text-xs"><div className="font-semibold">{event.action || 'Action'}</div><div className="mt-1 text-gray-600">{event.description || event.object_label || '-'}</div><div className="mt-1 text-[11px] text-gray-400">{formatDateTime(event.created_at)} · {event.user_name || event.created_by_name || 'Utilisateur'}</div></div>) : <div className="border border-gray-200 bg-white p-3 text-xs text-gray-500">La traçabilité commencera après l'enregistrement.</div>}</div>;

  const currency = record?.currency_code || options.currencies.find((item) => String(item.id) === String(form.currency_id))?.code || 'XOF';
  const currentBookValue = record?.book_value ?? Math.max(
    Number(form.original_value || 0) - Number(form.already_depreciated_amount_import || 0),
    0,
  );
  const depreciableValue = record?.value_residual ?? Math.max(
    Number(currentBookValue || 0) - Number(form.salvage_value || 0),
    0,
  );
  const supplierInvoices = normalizeLinkedEntries(
    record?.supplier_move_lines
      || record?.vendor_bill_lines
      || record?.original_move_lines
      || record?.original_move_line_ids,
  );
  const customerInvoices = [
    ...normalizeLinkedEntries(
    record?.customer_invoices
      || record?.customer_move_lines
      || record?.customer_invoice_lines
      || record?.sale_move_lines
      || operations.flatMap((item) => item.customer_move_lines || item.original_move_lines || []),
    ),
    ...pendingInvoices.filter((item) => item.invoice_type === 'customer').map((item) => ({
      ...item.invoice,
      id: item.move_id,
      move_id: item.move_id,
      state_label: 'À associer après enregistrement',
    })),
  ];
  const linkedSupplierInvoices = [
    ...normalizeLinkedEntries(record?.supplier_invoices || supplierInvoices),
    ...pendingInvoices.filter((item) => item.invoice_type === 'supplier').map((item) => ({
      ...item.invoice,
      id: item.move_id,
      move_id: item.move_id,
      state_label: 'À associer après enregistrement',
    })),
  ];
  const childAssets = options.assets.filter((item) => String(relationId(item.parent_id)) === String(record?.id || id));
  const parentAssetId = relationId(record?.parent_id || form.parent_id);
  const parentAsset = options.assets.find((item) => String(item.id) === String(parentAssetId));
  const planRevisionCount = record?.depreciation_count ?? operations.filter((item) => item.modify_type === 'plan_revision').length;
  const hasImpairment = Number(record?.impairment_amount || 0) > 0 || operations.some((item) => item.modify_type === 'impairment');
  const hasImpairmentReversal = Number(record?.impairment_reversal_amount || 0) > 0 || operations.some((item) => item.modify_type === 'impairment_reversal');
  const hasPositiveRevaluation = Number(record?.revaluation_gain || 0) > 0 || operations.some((item) => item.modify_type === 'revaluation' && Number(item.revaluation_gain || 0) > 0);
  const hasNegativeRevaluation = Number(record?.revaluation_loss || 0) > 0 || operations.some((item) => item.modify_type === 'revaluation' && Number(item.revaluation_loss || 0) > 0);
  const visibleOperations = showPlanRevisions
    ? operations.filter((item) => item.modify_type === 'plan_revision')
    : operations;
  const additionalAccountTypeIds = additionalAccountingRows.map((row) => row.accountTypeId).filter(Boolean);
  const configuredOptionalAccountingRows = ACCOUNTING_OPTIONAL_TYPES
    .filter((type) => relationId(form[type.id]) && !additionalAccountTypeIds.includes(type.id))
    .map((type) => ({ id: `configured-${type.id}`, entryType: type.entryType, accountTypeId: type.id, configured: true }));
  const revaluationPlaceholder = !configuredOptionalAccountingRows.some((row) => row.entryType === 'revaluation')
    && !additionalAccountingRows.some((row) => row.entryType === 'revaluation')
    ? [{ id: 'entry-slot-revaluation', entryType: 'revaluation', accountTypeId: '', fixedEntry: true }]
    : [];
  const accountingRows = [
    ...REQUIRED_ACCOUNTING_ROWS.map((type) => ({ id: `required-${type.id}`, entryType: type.entryType, accountTypeId: type.id, required: true })),
    ...configuredOptionalAccountingRows,
    ...additionalAccountingRows,
    ...revaluationPlaceholder,
  ].sort((first, second) => {
    const firstTypeIndex = ACCOUNTING_ENTRY_TYPES.findIndex((type) => type.id === first.entryType);
    const secondTypeIndex = ACCOUNTING_ENTRY_TYPES.findIndex((type) => type.id === second.entryType);
    const typeOrder = (firstTypeIndex < 0 ? ACCOUNTING_ENTRY_TYPES.length : firstTypeIndex)
      - (secondTypeIndex < 0 ? ACCOUNTING_ENTRY_TYPES.length : secondTypeIndex);
    if (typeOrder !== 0) return typeOrder;
    const firstAccountTypeIndex = ACCOUNT_TYPES.findIndex((type) => type.id === first.accountTypeId);
    const secondAccountTypeIndex = ACCOUNT_TYPES.findIndex((type) => type.id === second.accountTypeId);
    return (firstAccountTypeIndex < 0 ? ACCOUNT_TYPES.length : firstAccountTypeIndex)
      - (secondAccountTypeIndex < 0 ? ACCOUNT_TYPES.length : secondAccountTypeIndex);
  });
  const visibleAccountingColumnDefinitions = ACCOUNTING_COLUMNS.filter((column) => visibleAccountingColumns.includes(column.id));
  const selectedInvoice = invoiceDialog.options.find((item) => String(item.id) === String(invoiceDialog.selectedId));
  const linkedInvoiceIds = new Set([
    ...linkedSupplierInvoices.map((entry) => String(entry.move_id || entry.account_move_id || entry.move?.id || entry.id)),
    ...customerInvoices.map((entry) => String(entry.move_id || entry.account_move_id || entry.move?.id || entry.id)),
    ...pendingInvoices.map((entry) => String(entry.move_id)),
  ]);
  const visibleInvoiceOptions = invoiceDialog.options.filter((move) => {
    const query = invoiceDialog.query.trim().toLocaleLowerCase('fr');
    const moveType = getInvoiceKind(move) || 'other';
    const state = String(move.state || '').toLowerCase();
    const partner = move.partner_name || move.partner?.nom || move.partner?.name || move.partner?.raison_sociale || '';
    const journal = move.journal_name || move.journal?.name || move.journal?.nom || '';
    const searchable = [move.name, move.move_name, move.ref, move.reference, journal, move.journal_code, partner, move.partner?.email]
      .filter(Boolean).join(' ').toLocaleLowerCase('fr');
    return (!query || searchable.includes(query))
      && (!invoiceDialog.typeFilter || moveType === invoiceDialog.typeFilter)
      && (!invoiceDialog.stateFilter || state === invoiceDialog.stateFilter);
  });
  const depreciationEntries = record?.depreciation_board || record?.depreciation_entries || [];
  const boardError = record?.depreciation_board_error || '';

  if (!entityId) return <UnifiedFormPage title="Immobilisations" noContext="Sélectionnez une société pour gérer les immobilisations." />;
  if (loading) return <UnifiedFormPage title="Immobilisations" fallbackPath="/comptabilite/immobilisations"><div className="p-8 text-center text-sm text-gray-500">Chargement de l'immobilisation...</div></UnifiedFormPage>;

  return (
    <>
      {validationDialog && <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/40 p-4 somane-overlay-backdrop" role="presentation">
        <section role="alertdialog" aria-modal="true" aria-labelledby="asset-calculation-error-title" className="w-full max-w-lg border border-gray-300 bg-white shadow-xl">
          <header className="border-b border-gray-200 px-5 py-4">
            <h2 id="asset-calculation-error-title" className="text-base font-semibold text-gray-900">{validationDialog.title}</h2>
          </header>
          <div className="space-y-3 px-5 py-4 text-sm text-gray-700">
            <p className="whitespace-pre-line">{validationDialog.message}</p>
            {validationDialog.kind !== 'draftModification' && <p>{validationDialog.title.startsWith('Calcul') ? 'Le plan enregistré reste inchangé. Corrigez le paramètre indiqué puis relancez le calcul.' : 'La mise en service est bloquée. Corrigez les paramètres indiqués puis relancez l’action.'}</p>}
            {validationDialog.kind !== 'draftModification' && !editable && <p className="text-xs text-gray-500">Cette immobilisation n’est pas modifiable dans son état actuel. Les écritures déjà enregistrées restent inchangées.</p>}
          </div>
          <footer className="flex justify-end gap-2 border-t border-gray-200 px-5 py-3">
            <button type="button" onClick={() => setValidationDialog(null)} className="h-8 border border-gray-300 px-4 text-xs text-gray-700">Fermer</button>
            {validationDialog.kind === 'draftModification'
              ? <button type="button" onClick={() => setValidationDialog(null)} className="h-8 bg-purple-600 px-4 text-xs font-semibold text-white hover:bg-purple-700">Continuer la modification</button>
              : editable && <button type="button" onClick={() => {
              setValidationDialog(null);
              const needsLifetime = /durée de vie/i.test(validationDialog.message);
              const needsAccounting = /compte|journal|devise/i.test(validationDialog.message);
              setActiveTab(needsAccounting ? 'accounting' : 'asset');
              window.setTimeout(() => {
                if (needsLifetime) {
                  lifetimeInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  lifetimeInputRef.current?.focus();
                }
              }, 0);
            }} className="h-8 bg-purple-600 px-4 text-xs font-semibold text-white hover:bg-purple-700">Revoir les paramètres</button>}
          </footer>
        </section>
      </div>}
      <UnifiedFormPage
        title="Immobilisations"
        recordLabel={form.name || 'Brouillon'}
        pageLabel={isShow ? "Détail de l'immobilisation" : "Création d'une immobilisation"}
        mode={isShow ? 'show' : 'create'}
        fallbackPath="/comptabilite/immobilisations"
        primaryAction={{ label: 'Nouveau', icon: <FiPlus size={12} />, path: '/comptabilite/immobilisations/create' }}
        headerActions={isShow ? [
          {
            id: 'asset-parent',
            label: parentAsset ? `Parent ${parentAsset.code || ''}`.trim() : 'Parent',
            icon: <FiCornerUpLeft size={12} />,
            title: parentAsset ? `Ouvrir l'immobilisation parente : ${joinLabel(parentAsset.code, parentAsset.name)}` : 'Aucune immobilisation parente',
            onClick: () => parentAssetId && navigate(`/comptabilite/immobilisations/${parentAssetId}`, { state: { assetRecord: parentAsset } }),
            disabled: !parentAssetId,
          },
          {
            id: 'asset-children',
            label: `Enfants ${childAssets.length}`,
            icon: <FiLayers size={12} />,
            title: 'Afficher la liste des immobilisations enfants',
            path: childAssets.length ? `/comptabilite/immobilisations?parent_id=${encodeURIComponent(id)}` : undefined,
            disabled: childAssets.length === 0,
          },
          {
            id: 'asset-depreciation-entries',
            label: `Amortissements ${depreciationEntryCount}`,
            icon: <FiBookOpen size={12} />,
            title: 'Afficher le tableau d’amortissement de cette immobilisation',
            onClick: showDepreciation,
            disabled: depreciationEntryCount === 0,
          },
          {
            id: 'asset-plan-revisions',
            label: `Révisions ${planRevisionCount}`,
            icon: <FiRefreshCw size={12} />,
            title: 'Afficher les révisions du plan d’amortissement de cette immobilisation',
            onClick: showPlanRevisionList,
            disabled: planRevisionCount === 0,
          },
        ] : []}
        headerActionsCentered={isShow}
        actionsMenu={actionsMenu}
        onSave={editable ? save : undefined}
        onAfterSave={() => navigate('/comptabilite/immobilisations', {
          replace: true,
          state: { refreshAssets: true, refreshAt: Date.now() },
        })}
        saving={saving}
        autoReturnAfterSave={false}
        hasUnsavedChanges={dirty || pendingInvoices.length > 0}
        rememberForm={!isShow}
        memoryKey="comptabilite:asset:form:v1"
        memoryState={{ form, activeTab, pendingInvoices }}
        onRestoreMemoryState={(memory) => { if (!isShow && !restoredDraft && memory?.form) { setForm({ ...EMPTY_FORM, ...memory.form }); setActiveTab(normalizeAssetTab(memory.activeTab)); setPendingInvoices(memory.pendingInvoices || []); } }}
        feedback={feedback}
        onDismissFeedback={() => setFeedback(null)}
        messageDuration={15000}
        process={process}
        traceability={{ open: traceOpen, onOpen: () => setTraceOpen(true), onClose: () => setTraceOpen(false), title: 'Traçabilité', content: traceabilityContent }}
      >
        <div className="min-w-0">
          <section className="px-4 py-3">
            <h3 className="mb-2 text-sm font-semibold text-gray-900">Immobilisation</h3>
            <div className="grid grid-cols-1 gap-x-8 lg:grid-cols-2">
              <div className="space-y-1 lg:pr-8">
                <Field label="Désignation" required><input className={inputClass} value={form.name || ''} onChange={(event) => setField('name', event.target.value)} disabled={!editable} placeholder="Ex. Véhicule de livraison" /></Field>
                <Field label="Numéro d'inventaire" required><input className={inputClass} value={form.code || ''} onChange={(event) => setField('code', event.target.value)} disabled={!editable} /></Field>
                <Field label="Nature" required><SearchSelect value={form.asset_type} onChange={(value) => setField('asset_type', value)} options={ASSET_TYPES} getLabel={(item) => item.label} disabled={!editable} /></Field>
                <Field label="État"><div className="flex h-[26px] items-center border border-gray-300 bg-gray-50 px-2 text-xs text-gray-700">{ASSET_STATES[form.state] || form.state || 'Brouillon'}</div></Field>
              </div>
              <div className="mt-2 space-y-1 pt-2 lg:mt-0 lg:pt-0">
                <Field label="Société"><div className="flex h-[26px] items-center border border-gray-300 bg-gray-50 px-2 text-xs text-gray-700">{record?.company_name || options.companyName || '-'}</div></Field>
                <Field label="Devise" required><SearchSelect value={relationId(form.currency_id)} onChange={(value) => setField('currency_id', value)} options={options.currencies} getLabel={currencyLabel} placeholder="Sélectionner une devise" disabled={!editable} /></Field>
                <Field label="Emplacement"><input className={inputClass} value={form.location || ''} onChange={(event) => setField('location', event.target.value)} disabled={!editable} /></Field>
                <Field label="Bien utilisé par"><SearchSelect value={relationId(form.used_by)} onChange={(value) => setField('used_by', value)} options={options.users} getLabel={userLabel} placeholder="Sélectionner un utilisateur" disabled={!editable} /></Field>
                <Field label="Immobilisation parente"><SearchSelect value={relationId(form.parent_id)} onChange={(value) => setField('parent_id', value)} options={options.assets.filter((item) => String(item.id) !== String(id))} getLabel={(item) => joinLabel(item.code, item.name)} placeholder="Aucune" disabled={!editable} /></Field>
                <Field label="Code-barres"><input className={inputClass} value={record?.barcode || ''} disabled placeholder="Généré automatiquement" /></Field>
              </div>
            </div>
          </section>

          <div className="sticky top-0 z-20 flex overflow-x-auto border-b border-gray-300 bg-white px-4 shadow-[0_1px_0_rgba(209,213,219,1)]">
            {[
              ['asset', 'Immobilisation'],
              ['accounting', 'Écritures comptables'],
              ['supplierInvoices', 'Factures fournisseurs'],
              ['customerInvoices', 'Factures clients'],
            ].map(([key, label]) => <button key={key} type="button" onClick={() => setActiveTab(key)} className={`shrink-0 border-b-2 px-4 py-3 text-xs font-medium ${activeTab === key ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-500 hover:text-purple-600'}`}>{label}</button>)}
          </div>

          {activeTab === 'asset' && <div className="p-4">
            <div className="grid grid-cols-1 lg:grid-cols-2">
              <section className="space-y-1 pb-4 lg:border-r lg:border-gray-200 lg:pb-3 lg:pr-6">
                <h3 className="mb-2 text-sm font-semibold text-gray-900">Valeur d'origine</h3>
                <Field label="Valeur d'origine" required><AmountInput value={form.original_value} onChange={setOriginalValue} disabled={!editable} /></Field>
                <Field label="Date d'acquisition" required><input type="date" className={inputClass} value={form.acquisition_date || ''} onChange={(event) => setAcquisitionDate(event.target.value)} disabled={!editable} /></Field>
                <Field label="Catégorie" required><AssetAutocomplete value={relationId(form.category_id)} onChange={selectCategory} options={options.categories} getLabel={(item) => joinLabel(item.code, item.name)} placeholder="Sélectionner une catégorie" disabled={!editable} onCreateOption={createCategory} createOptionLabel="Créer la catégorie" /></Field>
                <Field label="Groupe d'immobilisations"><input className={inputClass} value={form.asset_group || ''} onChange={(event) => setField('asset_group', event.target.value)} disabled={!editable} /></Field>
                <Field label="Amortissement cumulé importé"><AmountInput value={form.already_depreciated_amount_import} onChange={(value) => setField('already_depreciated_amount_import', value)} disabled={!editable} /></Field>
              </section>

              <section className="space-y-1 border-t border-gray-200 py-4 lg:border-t-0 lg:pb-3 lg:pl-6 lg:pt-0">
                <h3 className="mb-2 text-sm font-semibold text-gray-900">Valeurs actuelles</h3>
                <Field label="Valeur résiduelle (non amortissable)"><AmountInput value={form.salvage_value} onChange={(value) => setField('salvage_value', value)} disabled={!editable} /></Field>
                <Field label="Valeur amortissable"><div className="flex h-[26px] items-center border border-gray-300 bg-gray-50 px-2 text-xs font-semibold text-gray-900">{formatMoney(depreciableValue, currency)}</div></Field>
                <Field label="Cumul des amortissements"><div className="flex h-[26px] items-center border border-gray-300 bg-gray-50 px-2 text-xs text-gray-700">{formatMoney(record?.depreciated_value ?? form.already_depreciated_amount_import, currency)}</div></Field>
                <Field label="Valeur nette comptable"><div className="flex h-[26px] items-center border border-gray-300 bg-gray-50 px-2 text-xs font-semibold text-gray-900">{formatMoney(currentBookValue, currency)}</div></Field>
                {hasImpairment && <Field label="Dépréciation de valeur"><div className="flex h-[26px] items-center border border-gray-300 bg-gray-50 px-2 text-xs">{formatMoney(record?.impairment_amount, currency)}</div></Field>}
                {hasImpairmentReversal && <Field label="Reprise de dépréciation"><div className="flex h-[26px] items-center border border-gray-300 bg-gray-50 px-2 text-xs">{formatMoney(record?.impairment_reversal_amount, currency)}</div></Field>}
                {hasPositiveRevaluation && <Field label="Écart de réévaluation positif"><div className="flex h-[26px] items-center border border-gray-300 bg-gray-50 px-2 text-xs">{formatMoney(record?.revaluation_gain, currency)}</div></Field>}
                {hasNegativeRevaluation && <Field label="Écart de réévaluation négatif"><div className="flex h-[26px] items-center border border-gray-300 bg-gray-50 px-2 text-xs">{formatMoney(record?.revaluation_loss, currency)}</div></Field>}
              </section>

              <section className="space-y-1 border-t border-gray-200 pt-4 lg:col-span-2">
                <h3 className="mb-2 text-sm font-semibold text-gray-900">Méthode d'amortissement</h3>
                <div className="grid grid-cols-1 gap-x-8 lg:grid-cols-2">
                  <div className="space-y-1 lg:pr-8">
                    <Field label="Mode" required><SearchSelect value={form.depreciate_method} onChange={(value) => setField('depreciate_method', value)} options={METHODS} getLabel={(item) => item.label} disabled={!editable} /></Field>
                    <Field label="Durée" required><div className="grid grid-cols-2 gap-2"><input type="number" min="1" className={inputClass} value={form.method_number ?? ''} onChange={(event) => setField('method_number', event.target.value)} disabled={!editable} /><SearchSelect value={form.method_period} onChange={(value) => setField('method_period', value)} options={PERIODS} getLabel={(item) => item.label} disabled={!editable} /></div></Field>
                    <Field label="Calcul"><SearchSelect value={form.computation_type} onChange={(value) => setField('computation_type', value)} options={COMPUTATIONS} getLabel={(item) => item.label} disabled={!editable} /></Field>
                    <Field label="Date de mise en service"><input type="date" className={inputClass} value={form.service_start_date || ''} onChange={(event) => setField('service_start_date', event.target.value)} disabled={!editable} /></Field>
                  </div>
                  <div className="mt-2 space-y-1 pt-2 lg:mt-0 lg:pt-0">
                    <Field label="Durée de vie (jours)"><input ref={lifetimeInputRef} type="number" min="0" className={inputClass} value={form.asset_lifetime_days ?? ''} onChange={(event) => setField('asset_lifetime_days', event.target.value)} disabled={!editable} /></Field>
                    <Field label="Jours de suspension"><input type="number" min="0" className={inputClass} value={form.asset_paused_days ?? ''} onChange={(event) => setField('asset_paused_days', event.target.value)} disabled={!editable} /></Field>
                    {form.depreciate_method === 'declining_constant' && <Field label="Coefficient constant"><input type="number" min="0" step="0.0001" className={inputClass} value={form.declining_coefficient ?? ''} onChange={(event) => setField('declining_coefficient', event.target.value)} disabled={!editable} /></Field>}
                    {form.depreciate_method === 'units' && <><Field label="Nature de l'unité d'œuvre"><input className={inputClass} value={form.work_unit_nature || ''} onChange={(event) => setField('work_unit_nature', event.target.value)} disabled={!editable} /></Field><Field label="Unités consommées"><input type="number" min="0" className={inputClass} value={form.work_units_consumed ?? ''} onChange={(event) => setField('work_units_consumed', event.target.value)} disabled={!editable} /></Field><Field label="Unités totales prévues" required><input type="number" min="0" className={inputClass} value={form.work_units_total ?? ''} onChange={(event) => setField('work_units_total', event.target.value)} disabled={!editable} /></Field></>}
                  </div>
                </div>
              </section>

            </div>

            {showDepreciationBoard && <div ref={depreciationBoardRef} className="mt-4 scroll-mt-12 border-t border-gray-200 pt-3">
                {boardError && !validationDialog && <div role="alert" className="mb-2 text-xs text-red-600">{boardError}</div>}
                <AssetTable
                  storageKey="comptabilite:asset:depreciation-table:v2"
                  columns={DEPRECIATION_COLUMNS}
                  rows={depreciationEntries}
                  emptyLabel={boardError ? 'Plan non disponible.' : Number(form.original_value || 0) > 0 ? 'Aucune dotation préparée. Cliquez sur « Calculer l’amortissement ».' : "Renseignez la valeur et les paramètres d'amortissement."}
                  totals={{ amount: formatMoney(depreciationEntries.reduce((sum, entry) => sum + Number(entry.amount || 0), 0), currency) }}
                  renderCell={(entry, column) => {
                    const value = {
                      sequence: entry.sequence || '-', date: formatDate(entry.date), name: entry.name && entry.name !== '/' ? entry.name : entry.state === 'forecast' ? '—' : 'Brouillon',
                      label: entry.ref || entry.label || '-', amount: formatMoney(entry.amount, currency),
                      cumulative: formatMoney(entry.cumulative, currency), book_value: formatMoney(entry.book_value, currency),
                      state: entry.state_label || ({ draft: 'Brouillon', posted: 'Comptabilisé', cancel: 'Annulé' }[entry.state]) || entry.state || '-',
                    }[column.key];
                    if (column.key === 'name' && entry.id) return <button type="button" title="Ouvrir la pièce comptable" onClick={() => navigate(`/comptabilite/pieces/${entry.id}`)} className="w-full truncate px-1 py-1 text-left font-medium text-teal-700 hover:underline">{value}</button>;
                    return <div title={String(value)} className={`truncate px-1 py-1 ${column.key === 'name' ? 'font-medium text-teal-700' : ''}`}>{value}</div>;
                  }}
                />
              </div>}
            {(operations.length > 0 || showPlanRevisions) && <div ref={planRevisionsRef} className="mt-4 scroll-mt-12 border-t border-gray-200 pt-3">
              <h3 className="mb-2 text-sm font-semibold text-gray-900">{showPlanRevisions ? 'Révisions du plan d’amortissement' : 'Historique des modifications'}</h3>
            <div className="somane-form-table-scroll overflow-x-auto border border-gray-200"><table className="somane-form-table min-w-full"><thead><tr className="text-left"><th>Date</th><th>Type</th><th>Pièce comptable</th><th>Valeur actuelle</th><th>Note</th></tr></thead><tbody>{visibleOperations.length ? visibleOperations.map((item) => <tr key={item.id}><td>{formatDate(item.disposal_date)}</td><td>{item.modify_type_label || MODIFICATION_TYPES.find((type) => type.id === item.modify_type)?.label || item.modify_type}</td><td>{item.accounting_move_label || '-'}</td><td className="text-right">{formatMoney(item.current_value ?? item.book_value ?? 0, currency)}</td><td>{item.note || '-'}</td></tr>) : <tr><td colSpan={5} className="py-5 text-center text-gray-500">Aucune révision du plan d’amortissement enregistrée.</td></tr>}</tbody></table></div>
            </div>}
          </div>}

          {activeTab === 'accounting' && <div className="p-4">
            <div className="mb-2 text-xs text-gray-500">Les comptes obligatoires sont affichés par défaut. Les comptes facultatifs s’ajoutent ligne par ligne.</div>
            <div className="somane-form-table-scroll asset-lines-scroll max-h-[52vh] overflow-auto border border-gray-300">
              <table className="somane-form-table w-full min-w-[760px] table-fixed">
                <colgroup>
                  {visibleAccountingColumnDefinitions.map((column) => <col key={column.id} style={{ width: column.id === 'entryType' ? '30%' : column.id === 'accountType' ? '27%' : column.id === 'account' ? '27%' : '16%' }} />)}
                  <col style={{ width: 38 }} />
                </colgroup>
                <thead className="sticky top-0 z-10">
                  <tr className="bg-gray-100 text-left text-gray-700">
                    {visibleAccountingColumnDefinitions.map((column) => <th key={column.id} className="border border-gray-300 px-2 py-1.5 font-medium">{column.label}{column.id === 'journal' && <span className="ml-1 text-red-500">*</span>}</th>)}
                    <th className="border border-gray-300 px-1 text-center">
                      <div className="relative" ref={accountingTypeMenuRef}>
                        <ColumnVisibilityMenu
                          columns={ACCOUNTING_COLUMNS.map(({ id, ...column }) => ({ ...column, key: id }))}
                          isVisible={(key) => visibleAccountingColumns.includes(key)}
                          onToggle={toggleAccountingColumn}
                          allowEmpty
                        />
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {accountingRows.map((row) => {
                    const accountType = ACCOUNT_TYPES.find((type) => type.id === row.accountTypeId);
                    const usedAccountTypes = accountingRows
                      .filter((other) => other.id !== row.id)
                      .map((other) => other.accountTypeId)
                      .filter(Boolean);
                    const availableAccountTypes = ACCOUNTING_OPTIONAL_TYPES.filter((type) => (
                      type.entryType === row.entryType
                      && (!usedAccountTypes.includes(type.id) || type.id === row.accountTypeId)
                    ));
                    return <tr key={row.id} className="odd:bg-white even:bg-gray-50/60">
                      {visibleAccountingColumns.includes('entryType') && <td className="border border-gray-300 p-0">
                        {row.required || row.configured || row.fixedEntry
                          ? <div className="px-2 py-1.5">{ACCOUNTING_ENTRY_TYPES.find((type) => type.id === row.entryType)?.label || row.entryType}{(row.required || row.fixedEntry) && <span className="ml-1 text-red-500">*</span>}</div>
                          : <SearchSelect value={row.entryType} onChange={(value) => changeAdditionalEntryType(row.id, value)} options={ACCOUNTING_ADD_ENTRY_TYPES} getLabel={(type) => type.label} placeholder="Sélectionner un type" disabled={!editable} bordered={false} />}
                      </td>}
                      {visibleAccountingColumns.includes('accountType') && <td className="border border-gray-300 p-0">
                        {row.required
                          ? <div className="px-2 py-1.5">{accountType?.label}<span className="ml-1 text-red-500">*</span></div>
                          : <SearchSelect value={row.accountTypeId} onChange={(value) => changeAdditionalAccountType(row.id, value)} options={availableAccountTypes} getLabel={(type) => type.label} placeholder={row.entryType ? 'Sélectionner un type de compte' : 'Choisir d’abord le type'} disabled={!editable || !row.entryType} bordered={false} />}
                      </td>}
                      {visibleAccountingColumns.includes('account') && <td className="border border-gray-300 p-0">
                        {row.accountTypeId
                          ? <SearchSelect value={relationId(form[row.accountTypeId])} onChange={(value) => setField(row.accountTypeId, value)} options={options.accounts} getLabel={accountLabel} placeholder="Sélectionner un compte" disabled={!editable} bordered={false} />
                          : <div className="px-2 py-1.5 text-gray-400">Sélectionner un type de compte</div>}
                      </td>}
                      {visibleAccountingColumns.includes('journal') && <td className="border border-gray-300 p-0"><SearchSelect value={relationId(form.journal_id)} onChange={(value) => setField('journal_id', value)} options={options.journals} getLabel={journalLabel} placeholder="Sélectionner un journal" disabled={!editable} bordered={false} /></td>}
                      <td className="border border-gray-300 p-0 text-center">
                        {!row.required && !row.fixedEntry && <button type="button" onClick={() => removeAdditionalAccountingRow(row.id)} disabled={!editable} title="Retirer cette ligne" className="px-2 py-1 text-gray-400 hover:text-red-600 disabled:opacity-40"><FiTrash2 size={13} /></button>}
                      </td>
                    </tr>;
                  })}
                  {!accountingRows.length && <tr><td colSpan={visibleAccountingColumnDefinitions.length + 1} className="border border-gray-300 px-3 py-6 text-center text-gray-500">Aucune ligne de paramétrage comptable.</td></tr>}
                </tbody>
              </table>
            </div>
            <button type="button" onClick={addAccountingRow} disabled={!editable} className="mt-2 h-8 bg-purple-600 px-3 text-xs font-medium text-white hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"><FiPlus className="mr-1 inline" size={13} />Ajouter une ligne</button>
          </div>}

          {activeTab === 'supplierInvoices' && <div className="p-4">
            <LinkedEntriesTable
              storageKey="comptabilite:asset:supplier-invoices:columns:v1"
              rows={linkedSupplierInvoices}
              currency={currency}
              emptyLabel="Aucune facture fournisseur liée à cette immobilisation."
              onOpen={(entry) => navigate(`/comptabilite/pieces/${entry.move_id || entry.account_move_id || entry.move?.id || entry.piece_id}`)}
              onRemove={(entry) => removeInvoice(entry, 'supplier')}
              footer={<button type="button" onClick={() => openInvoiceDialog('supplier')} className="h-8 bg-purple-600 px-4 text-xs font-semibold text-white hover:bg-purple-700"><FiPlus className="mr-1 inline" />Ajouter une facture</button>}
            />
          </div>}

          {activeTab === 'customerInvoices' && <div className="p-4">
            <LinkedEntriesTable
              storageKey="comptabilite:asset:customer-invoices:columns:v1"
              rows={customerInvoices}
              currency={currency}
              emptyLabel="Aucune facture client liée à une cession de cette immobilisation."
              onOpen={(entry) => navigate(`/comptabilite/pieces/${entry.move_id || entry.account_move_id || entry.move?.id || entry.piece_id}`)}
              onRemove={(entry) => removeInvoice(entry, 'customer')}
              footer={<button type="button" onClick={() => openInvoiceDialog('customer')} className="h-8 bg-purple-600 px-4 text-xs font-semibold text-white hover:bg-purple-700"><FiPlus className="mr-1 inline" />Ajouter une facture</button>}
            />
          </div>}

        </div>
      </UnifiedFormPage>

      {operationOpen && <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/30 p-4 somane-overlay-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setOperationOpen(false); }}><div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto border border-gray-300 bg-white shadow-xl"><div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-300 bg-white px-4 py-3"><div><h3 className="text-sm font-semibold">Modification de l’immobilisation</h3><div className="mt-0.5 text-[11px] text-gray-500">Décomptabilisation et ajustements</div></div><button type="button" onClick={() => setOperationOpen(false)} aria-label="Fermer"><FiX /></button></div><div className="grid grid-cols-1 gap-x-8 gap-y-3 p-4 lg:grid-cols-2">
        <Field label="Type" required><SearchSelect value={operation.modify_type} onChange={(value) => setOperation((current) => ({ ...current, modify_type: value }))} options={MODIFICATION_TYPES} getLabel={(item) => item.label} /></Field>
        <Field label="Date" required><input type="date" className={inputClass} value={operation.disposal_date} onChange={(event) => setOperation((current) => ({ ...current, disposal_date: event.target.value }))} /></Field>
        <Field label="Immobilisation"><div className="flex h-[26px] items-center border border-gray-300 bg-gray-50 px-2 text-xs">{joinLabel(form.code, form.name)}</div></Field>
        <Field label="Journal" required><SearchSelect value={relationId(operation.journal_id)} onChange={(value) => setOperation((current) => ({ ...current, journal_id: value }))} options={options.journals} getLabel={journalLabel} /></Field>
        <Field label="Cumul des amortissements"><div className="flex h-[26px] items-center border border-gray-300 bg-gray-50 px-2 text-xs">{formatMoney(record?.depreciated_value ?? form.already_depreciated_amount_import, currency)}</div></Field>
        <Field label="Valeur nette comptable"><div className="flex h-[26px] items-center border border-gray-300 bg-gray-50 px-2 text-xs">{formatMoney(currentBookValue, currency)}</div></Field>
        {operation.modify_type === 'sale' && <><Field label="Prix de cession" required><AmountInput value={operation.sale_price} onChange={(value) => setOperation((current) => ({ ...current, sale_price: value }))} /></Field><Field label="Frais de cession"><AmountInput value={operation.fee_sale} onChange={(value) => setOperation((current) => ({ ...current, fee_sale: value }))} /></Field><Field label="Plus-value"><div className="flex h-[26px] items-center border border-gray-300 bg-gray-50 px-2 text-xs">{formatMoney(Math.max(Number(operation.sale_price || 0) - Number(operation.fee_sale || 0) - Number(currentBookValue || 0), 0), currency)}</div></Field><Field label="Moins-value"><div className="flex h-[26px] items-center border border-gray-300 bg-gray-50 px-2 text-xs">{formatMoney(Math.max(Number(currentBookValue || 0) - Number(operation.sale_price || 0) + Number(operation.fee_sale || 0), 0), currency)}</div></Field></>}
        {['impairment', 'impairment_reversal', 'revaluation'].includes(operation.modify_type) && <Field label="Valeur actuelle" required><AmountInput value={operation.current_value} onChange={(value) => setOperation((current) => ({ ...current, current_value: value }))} /></Field>}
        {operation.modify_type === 'plan_revision' && <><Field label="Nombre de périodes"><input type="number" min="1" className={inputClass} value={operation.method_number} onChange={(event) => setOperation((current) => ({ ...current, method_number: event.target.value }))} /></Field><Field label="Unité de période"><SearchSelect value={operation.method_period} onChange={(value) => setOperation((current) => ({ ...current, method_period: value }))} options={PERIODS} getLabel={(item) => item.label} /></Field><Field label="Valeur résiduelle"><AmountInput value={operation.salvage_value} onChange={(value) => setOperation((current) => ({ ...current, salvage_value: value }))} /></Field></>}
        <div className="flex items-center gap-2 text-xs text-gray-700 lg:col-span-2"><input id="asset-force-post" type="checkbox" checked={Boolean(operation.force_post)} onChange={(event) => setOperation((current) => ({ ...current, force_post: event.target.checked }))} /><label htmlFor="asset-force-post">Comptabiliser immédiatement l'écriture</label></div>
        <div className="lg:col-span-2"><label className="mb-1 block text-xs font-medium text-gray-700">Note</label><textarea className="min-h-20 w-full border border-gray-300 px-2 py-1 text-xs outline-none focus:border-purple-600" value={operation.note} onChange={(event) => setOperation((current) => ({ ...current, note: event.target.value }))} /></div>
      </div><div className="flex justify-end gap-2 border-t border-gray-300 px-4 py-3"><button type="button" onClick={() => setOperationOpen(false)} className="h-8 border border-gray-300 px-4 text-xs">Annuler</button><button type="button" onClick={saveOperation} disabled={saving} className="h-8 bg-purple-600 px-4 text-xs font-semibold text-white disabled:opacity-50">Enregistrer l'opération</button></div></div></div>}

      {invoiceDialog.open && <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/30 p-3 somane-overlay-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !invoiceDialog.saving) setInvoiceDialog(EMPTY_INVOICE_DIALOG); }}>
        <div className="flex max-h-[80vh] w-full max-w-5xl flex-col border border-gray-300 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-gray-300 px-4 py-3">
            <div><h3 className="text-sm font-semibold">Pièces comptables</h3><div className="mt-0.5 text-[11px] text-gray-500">Sélectionnez une pièce à associer comme facture {invoiceDialog.type === 'supplier' ? 'fournisseur' : 'client'}.</div></div>
            <button type="button" disabled={invoiceDialog.saving} onClick={() => setInvoiceDialog(EMPTY_INVOICE_DIALOG)} aria-label="Fermer"><FiX /></button>
          </div>
          <div className="min-h-0 flex-1 space-y-2 overflow-visible p-3">
            {invoiceDialog.error && <div role="alert" className="border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{invoiceDialog.error}</div>}
            <div className="relative z-20 flex items-center rounded border border-gray-300 bg-white transition-colors hover:border-purple-400 focus-within:border-purple-500 focus-within:ring-2 focus-within:ring-purple-100">
              <FiSearch className="ml-3 shrink-0 text-gray-500" size={16} />
              {invoiceDialog.typeFilter && <span className="ml-2 inline-flex shrink-0 items-center gap-1 rounded bg-teal-100 px-2 py-1 text-[11px] text-teal-700">{invoiceDialog.typeFilter === 'supplier' ? 'Factures fournisseur' : invoiceDialog.typeFilter === 'customer' ? 'Factures client' : 'Autres pièces'}<button type="button" aria-label="Retirer le filtre de type" onClick={() => setInvoiceDialog((current) => ({ ...current, typeFilter: '' }))}><FiX size={11} /></button></span>}
              {invoiceDialog.stateFilter && <span className="ml-1 inline-flex shrink-0 items-center gap-1 rounded bg-teal-100 px-2 py-1 text-[11px] text-teal-700">{{ draft: 'Brouillon', posted: 'Comptabilisé', cancel: 'Annulé', cancelled: 'Annulé', deleted: 'Supprimé' }[invoiceDialog.stateFilter]}<button type="button" aria-label="Retirer le filtre d'état" onClick={() => setInvoiceDialog((current) => ({ ...current, stateFilter: '' }))}><FiX size={11} /></button></span>}
              <input value={invoiceDialog.query} onChange={(event) => setInvoiceDialog((current) => ({ ...current, query: event.target.value }))} placeholder="Rechercher une pièce..." className="h-9 min-w-[100px] flex-1 bg-transparent px-3 text-sm outline-none" />
              <button type="button" onClick={() => setInvoiceDialog((current) => ({ ...current, filtersOpen: !current.filtersOpen }))} title="Filtres" aria-label="Filtres" className={`mr-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded ${invoiceDialog.filtersOpen || invoiceDialog.typeFilter || invoiceDialog.stateFilter ? 'bg-purple-50 text-purple-700' : 'text-gray-500 hover:bg-purple-50 hover:text-purple-700'}`}><FiFilter size={16} /></button>
              {invoiceDialog.filtersOpen && <div className="absolute right-0 top-11 z-30 grid w-[min(560px,calc(100vw-32px))] grid-cols-1 border border-gray-300 bg-white text-xs text-gray-700 shadow-xl sm:grid-cols-2">
                <div className="border-b border-gray-200 p-3 sm:border-b-0 sm:border-r"><p className="mb-2 font-semibold text-gray-800">Type de pièce</p>{[{ value: '', label: 'Tous les types' }, { value: 'supplier', label: 'Factures fournisseur' }, { value: 'customer', label: 'Factures client' }, { value: 'other', label: 'Autres pièces' }].map((item) => <button key={item.value || 'all-types'} type="button" onClick={() => setInvoiceDialog((current) => ({ ...current, typeFilter: item.value }))} className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left hover:bg-gray-100"><span className="w-4 font-semibold text-purple-600">{invoiceDialog.typeFilter === item.value ? '✓' : ''}</span>{item.label}</button>)}</div>
                <div className="p-3"><p className="mb-2 font-semibold text-gray-800">État</p>{[{ value: '', label: 'Tous les états' }, { value: 'draft', label: 'Brouillon' }, { value: 'posted', label: 'Comptabilisé' }, { value: 'cancel', label: 'Annulé' }, { value: 'deleted', label: 'Supprimé' }].map((item) => <button key={item.value || 'all-states'} type="button" onClick={() => setInvoiceDialog((current) => ({ ...current, stateFilter: item.value }))} className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left hover:bg-gray-100"><span className="w-4 font-semibold text-purple-600">{invoiceDialog.stateFilter === item.value ? '✓' : ''}</span>{item.label}</button>)}</div>
                {(invoiceDialog.typeFilter || invoiceDialog.stateFilter || invoiceDialog.query.trim()) && <div className="border-t border-gray-200 p-2 sm:col-span-2"><button type="button" onClick={() => setInvoiceDialog((current) => ({ ...current, typeFilter: '', stateFilter: '', query: '', filtersOpen: false }))} className="w-full rounded py-1.5 text-center text-red-600 hover:bg-red-50">Effacer les filtres</button></div>}
              </div>}
            </div>
            <div className="max-h-[48vh] overflow-auto border border-gray-300">
              <table className="somane-form-table min-w-[1120px] w-full text-[11px]">
                <thead className="sticky top-0 z-10 bg-gray-100 text-left text-gray-700"><tr>
                  <th className="w-9 border-b border-r border-gray-300 px-2 py-2"></th><th className="border-b border-r border-gray-300 px-2 py-2">Date comptable</th><th className="border-b border-r border-gray-300 px-2 py-2">N° pièce</th><th className="border-b border-r border-gray-300 px-2 py-2">Nom du journal</th><th className="border-b border-r border-gray-300 px-2 py-2">Préfixe</th><th className="border-b border-r border-gray-300 px-2 py-2">Référence</th><th className="border-b border-r border-gray-300 px-2 py-2">Partenaire</th><th className="border-b border-r border-gray-300 px-2 py-2 text-right">HT</th><th className="border-b border-r border-gray-300 px-2 py-2 text-right">Taxes</th><th className="border-b border-r border-gray-300 px-2 py-2 text-right">TTC</th><th className="border-b border-r border-gray-300 px-2 py-2">État</th><th className="border-b border-gray-300 px-2 py-2">Paiement</th>
                </tr></thead>
                <tbody>
                  {invoiceDialog.loading ? <tr><td colSpan={12} className="px-3 py-8 text-center text-gray-500">Chargement des pièces comptables...</td></tr> : visibleInvoiceOptions.length ? visibleInvoiceOptions.map((move) => {
                    const moveId = String(move.id);
                    const isLinked = linkedInvoiceIds.has(moveId);
                    const invoiceType = getInvoiceKind(move);
                    const isUnavailable = isLinked || !invoiceType;
                    const partner = move.partner_name || move.partner?.nom || move.partner?.name || move.partner?.raison_sociale || '-';
                    const journal = move.journal_name || move.journal?.name || move.journal?.nom || '-';
                    const state = String(move.state || '').toLowerCase();
                    const stateLabel = move.state_label || ({ draft: 'Brouillon', posted: 'Comptabilisé', cancel: 'Annulé', cancelled: 'Annulé', deleted: 'Supprimé' }[state]) || move.state || '-';
                    const paymentState = String(move.payment_state || move.payment_status || '').toLowerCase();
                    const paymentLabel = move.payment_state_label || ({ not_paid: 'Non payé', unpaid: 'Non payé', partial: 'Partiel', in_payment: 'En cours', paid: 'Payé', reversed: 'Extourné' }[paymentState]) || move.payment_state || move.payment_status || '-';
                    const isSelected = String(invoiceDialog.selectedId) === moveId;
                    return <tr key={move.id} onClick={() => !isUnavailable && !invoiceDialog.saving && setInvoiceDialog((current) => ({ ...current, selectedId: move.id, error: '' }))} className={`border-b border-gray-200 ${isUnavailable ? 'bg-gray-50 text-gray-400' : 'cursor-pointer hover:bg-purple-50'} ${isSelected ? 'bg-purple-50' : ''}`}>
                      <td className="border-r border-gray-200 px-2 py-2"><input type="radio" name="asset-invoice-choice" checked={isSelected} disabled={isUnavailable || invoiceDialog.saving} onChange={() => setInvoiceDialog((current) => ({ ...current, selectedId: move.id, error: '' }))} /></td>
                      <td className="border-r border-gray-200 px-2 py-2">{formatDate(move.date || move.accounting_date || move.invoice_date)}</td><td className="border-r border-gray-200 px-2 py-2 font-medium text-teal-700">{move.name || move.move_name || move.number || `#${move.id}`}</td><td className="border-r border-gray-200 px-2 py-2">{journal}</td><td className="border-r border-gray-200 px-2 py-2">{move.journal_code || move.journal?.code || move.prefix || '-'}</td><td className="border-r border-gray-200 px-2 py-2">{move.ref || move.reference || '-'}</td><td className="border-r border-gray-200 px-2 py-2">{partner}{isLinked ? <span className="ml-1 text-[10px]">(Déjà liée)</span> : !invoiceType && <span className="ml-1 text-[10px]">(Type de facture non reconnu)</span>}</td><td className="border-r border-gray-200 px-2 py-2 text-right">{formatMoney(move.amount_untaxed ?? move.amount_untaxed_signed ?? 0, move.currency_code || move.currency?.code || currency)}</td><td className="border-r border-gray-200 px-2 py-2 text-right">{formatMoney(move.amount_tax ?? move.amount_tax_signed ?? 0, move.currency_code || move.currency?.code || currency)}</td><td className="border-r border-gray-200 px-2 py-2 text-right font-medium">{formatMoney(move.amount_total ?? move.amount_total_signed ?? 0, move.currency_code || move.currency?.code || currency)}</td><td className="border-r border-gray-200 px-2 py-2">{stateLabel}</td><td className="px-2 py-2">{paymentLabel}</td>
                    </tr>;
                  }) : <tr><td colSpan={12} className="px-3 py-8 text-center text-gray-500">{invoiceDialog.options.length ? 'Aucune pièce ne correspond aux critères. Effacez les filtres ou modifiez la recherche.' : 'Aucune pièce comptable disponible.'}</td></tr>}
                </tbody>
              </table>
            </div>
            <div className="text-[11px] text-gray-500">{visibleInvoiceOptions.length} pièce(s) affichée(s) sur {invoiceDialog.options.length}{selectedInvoice ? ` · Sélection : ${selectedInvoice.name || selectedInvoice.move_name || `#${selectedInvoice.id}`}` : ''}</div>
          </div>
          <div className="flex justify-end gap-2 border-t border-gray-300 px-4 py-3">
            <button type="button" disabled={invoiceDialog.saving} onClick={() => setInvoiceDialog(EMPTY_INVOICE_DIALOG)} className="h-8 border border-gray-300 px-4 text-xs">Annuler</button>
            <button type="button" disabled={invoiceDialog.loading || invoiceDialog.saving || !invoiceDialog.selectedId} onClick={linkInvoice} className="h-8 bg-purple-600 px-4 text-xs font-semibold text-white disabled:opacity-50">Ajouter la facture</button>
          </div>
        </div>
      </div>}
    </>
  );
}
