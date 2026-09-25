import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FiCheck, FiCopy, FiPause, FiPlay, FiPlus, FiPrinter, FiRefreshCw,
  FiSettings, FiTrash2, FiX,
} from 'react-icons/fi';
import { useLocation, useNavigate, useParams } from 'react-router-dom';

import UnifiedFormPage from '../../../../components/UnifiedFormPage';
import axiosInstance from '../../../../config/axiosInstance';
import { SearchSelect } from '../payement/paymentShared.jsx';
import {
  API, ASSET_STATES, ASSET_TYPES, COMPUTATIONS, Field, METHODS,
  MODIFICATION_TYPES, PERIODS, AmountInput, AssetAutocomplete, AssetTable, accountLabel, currencyLabel,
  formatDate, formatDateTime, formatMoney, getActionErrorMessage,
  getActiveEntityId, inputClass, joinLabel, journalLabel, normalizeApiList,
  relationId, userLabel,
} from './assetShared.jsx';

const today = () => new Date().toISOString().slice(0, 10);
const EMPTY_FORM = {
  name: '', code: '', currency_id: '', category_id: '', asset_type: 'acquisition',
  state: 'draft', location: '', used_by: '', original_value: '', acquisition_date: today(),
  asset_group: '', already_depreciated_amount_import: 0, salvage_value: 0,
  depreciate_method: 'linear', declining_coefficient: 1, work_unit_nature: '',
  work_units_consumed: 0, work_units_total: 0, method_number: 5,
  method_period: 'year', computation_type: 'actual', service_start_date: '',
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
  { id: 'account_asset_id', label: "Immobilisation", required: true },
  { id: 'account_depreciation_id', label: 'Amortissement', required: true },
  { id: 'account_depreciation_expense_id', label: 'Dotation aux amortissements', required: true },
  { id: 'account_impairment_id', label: 'Dépréciation' },
  { id: 'account_impairment_expense_id', label: 'Dotation pour dépréciation' },
  { id: 'account_dispose_expense_id', label: 'Valeur comptable des cessions' },
  { id: 'account_disposal_id', label: 'Produit de cession' },
  { id: 'revaluation_gain_account_id', label: 'Écart positif de réévaluation' },
  { id: 'revaluation_loss_account_id', label: 'Écart négatif de réévaluation' },
];
const ACCOUNTING_COLUMNS = [
  { key: 'journal_id', label: 'Journal *', width: 260, required: true },
  ...ACCOUNT_TYPES.map((type) => ({
    key: type.id, label: `${type.label}${type.required ? ' *' : ''}`,
    width: 260, required: Boolean(type.required), defaultVisible: Boolean(type.required),
  })),
];
const ACCOUNTING_VALUES_ROW = [{ id: 'asset-accounts' }];

const categoryDefaults = (current, category) => {
  if (!category) return current;
  const accounts = ACCOUNT_TYPES.reduce((values, row) => ({
    ...values, [row.id]: relationId(category[row.id]) || current[row.id],
  }), {});
  return {
    ...current, ...accounts, category_id: category.id,
    journal_id: relationId(category.journal_id) || current.journal_id,
    depreciate_method: category.method || current.depreciate_method,
    method_number: category.method_number ?? current.method_number,
    method_period: category.method_period || current.method_period,
    declining_coefficient: category.method_progress_factor ?? current.declining_coefficient,
    computation_type: category.prorata === false ? 'none' : 'actual',
    salvage_value: Number(current.original_value || 0) * Number(category.salvage_value_percent || 0) / 100,
  };
};

let optionCache = null;
let optionPromise = null;

const getOptions = async (entityId) => {
  if (optionCache?.entityId === String(entityId) && Date.now() - optionCache.loadedAt < 30000) return optionCache.data;
  if (!optionPromise) {
    optionPromise = Promise.all([
      axiosInstance.get(API.categories, { params: { company_id: entityId, active: true, page_size: 1000 } }),
      axiosInstance.get(API.accounts, { params: { company: entityId, company_id: entityId, page_size: 2500 } }),
      axiosInstance.get(API.journals, { params: { company: entityId, company_id: entityId, page_size: 500 } }),
      axiosInstance.get(API.currencies, { params: { page_size: 500 } }),
      axiosInstance.get(API.users, { params: { page_size: 1000 } }).catch(() => ({ data: [] })),
      axiosInstance.get(API.assets, { params: { company_id: entityId, page_size: 1000 } }).catch(() => ({ data: [] })),
      axiosInstance.get(`${API.entities}${entityId}/`).catch(() => ({ data: {} })),
    ]).then(([categories, accounts, journals, currencies, users, assets, entity]) => ({
      categories: normalizeApiList(categories.data),
      accounts: normalizeApiList(accounts.data).filter((account) => account.company || account.company_id),
      journals: normalizeApiList(journals.data),
      currencies: normalizeApiList(currencies.data),
      users: normalizeApiList(users.data),
      assets: normalizeApiList(assets.data),
      companyCurrencyId: relationId(entity.data?.devise) || relationId(entity.data?.devise_details),
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
  const [options, setOptions] = useState(() => optionCache?.data || { categories: [], accounts: [], journals: [], currencies: [], users: [], assets: [], companyCurrencyId: '' });
  const [operations, setOperations] = useState(() => preload?.modifications || []);
  const [traceability, setTraceability] = useState(() => preload?.traceability || []);
  const [activeTab, setActiveTab] = useState(restoredDraft?.activeTab || 'depreciation');
  const [traceOpen, setTraceOpen] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [operationOpen, setOperationOpen] = useState(false);
  const [operation, setOperation] = useState(EMPTY_OPERATION);
  const [loading, setLoading] = useState(isShow && !preload);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(Boolean(duplicate || restoredDraft));
  const [feedback, setFeedback] = useState(null);
  const [preview, setPreview] = useState({ key: '', rows: [], error: '', loading: false });

  const previewPayload = JSON.stringify({
    ...(isShow ? { asset_id: Number(id) } : {}),
    original_value: form.original_value || 0,
    salvage_value: form.salvage_value || 0,
    already_depreciated_amount_import: form.already_depreciated_amount_import || 0,
    acquisition_date: form.acquisition_date,
    service_start_date: form.service_start_date || null,
    method_number: form.method_number,
    method_period: form.method_period,
    depreciate_method: form.depreciate_method,
    computation_type: form.computation_type,
    declining_coefficient: form.declining_coefficient || 0,
    asset_lifetime_days: form.asset_lifetime_days || null,
    asset_paused_days: form.asset_paused_days || 0,
  });

  useEffect(() => {
    if (!entityId || form.state !== 'draft' || (!dirty && Array.isArray(record?.depreciation_board))) return undefined;
    const payload = JSON.parse(previewPayload);
    if (Number(payload.original_value) <= 0 || !payload.acquisition_date) {
      setPreview({ key: previewPayload, rows: [], error: '', loading: false });
      return undefined;
    }
    let current = true;
    const controller = new window.AbortController();
    setPreview({ key: previewPayload, rows: [], error: '', loading: true });
    const timer = window.setTimeout(async () => {
      try {
        const response = await axiosInstance.post(`${API.assets}preview-depreciation/`, payload, { signal: controller.signal });
        if (current) setPreview({ key: previewPayload, rows: response.data.depreciation_board || [], error: '', loading: false });
      } catch (error) {
        if (current && !controller.signal.aborted) setPreview({ key: previewPayload, rows: [], error: getActionErrorMessage(error, "Impossible de calculer le plan d'amortissement."), loading: false });
      }
    }, 200);
    return () => { current = false; window.clearTimeout(timer); controller.abort(); };
  }, [entityId, previewPayload, form.state, dirty, record]);

  useEffect(() => {
    const closeMenu = (event) => { if (menuRef.current && !menuRef.current.contains(event.target)) setMenuOpen(false); };
    document.addEventListener('mousedown', closeMenu);
    return () => document.removeEventListener('mousedown', closeMenu);
  }, []);

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
          setForm(normalizeRecord(detail.data));
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

  const selectCategory = (value, category) => {
    if (!category) { setField('category_id', value); return; }
    const next = categoryDefaults(form, { ...category, id: value });
    setForm(next);
    setDirty(true);
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

  const save = async () => {
    const errors = validate();
    if (errors.length) { setFeedback({ type: 'error', message: errors.join('\n') }); return false; }
    setSaving(true);
    try {
      const response = isShow ? await axiosInstance.patch(`${API.assets}${id}/`, buildPayload()) : await axiosInstance.post(API.assets, buildPayload());
      setRecord(response.data);
      setForm(normalizeRecord(response.data));
      setDirty(false);
      return response.data;
    } catch (error) {
      setFeedback({ type: 'error', message: getActionErrorMessage(error, "Échec de l'enregistrement de l'immobilisation.") });
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
    } catch (error) { setFeedback({ type: 'error', message: getActionErrorMessage(error, "L'action n'a pas pu être exécutée.") }); }
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

  const process = (
    <div className="flex items-center justify-between gap-4 px-4 py-3">
      <div className="flex items-center gap-2">
        {isShow && form.state === 'draft' && <button type="button" disabled={saving || dirty} onClick={() => runAction('start', 'Mettre cette immobilisation en service ?')} className="h-8 bg-purple-600 px-3 text-xs font-semibold text-white hover:bg-purple-700 disabled:opacity-50"><FiPlay className="mr-1 inline" />Mettre en service</button>}
        {isShow && form.state === 'running' && <button type="button" disabled={saving || dirty} onClick={() => runAction('pause', 'Mettre cette immobilisation en attente ?')} className="h-8 border border-gray-300 px-3 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"><FiPause className="mr-1 inline" />Mettre en attente</button>}
        {isShow && form.state === 'waiting' && <button type="button" disabled={saving || dirty} onClick={() => runAction('start', 'Reprendre les dotations de cette immobilisation ?')} className="h-8 bg-purple-600 px-3 text-xs font-semibold text-white disabled:opacity-50"><FiPlay className="mr-1 inline" />Reprendre</button>}
      </div>
      <div className="flex items-center gap-2 overflow-x-auto text-xs font-semibold">
        {Object.entries(ASSET_STATES).map(([value, label]) => <span key={value} className={`border px-3 py-2 ${form.state === value ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-gray-300 bg-gray-50 text-gray-500'}`}>{label}</span>)}
      </div>
    </div>
  );

  const actionsMenu = (
    <div className="relative" ref={menuRef}>
      <button type="button" onClick={() => setMenuOpen((value) => !value)} className="flex h-8 items-center gap-1 border border-gray-300 px-3 text-xs text-gray-700 hover:border-purple-500 hover:bg-purple-50 hover:text-purple-700"><FiSettings size={12} />Actions</button>
      {menuOpen && <div className="absolute right-0 z-[80] mt-1 w-60 border border-gray-300 bg-white shadow-lg">
        <button type="button" onClick={() => navigate('/comptabilite/immobilisations')} className="w-full border-b border-gray-100 px-3 py-2 text-left text-xs hover:bg-purple-50">Liste des immobilisations</button>
        <button type="button" onClick={() => navigate('/comptabilite/categories-immobilisations')} className="w-full border-b border-gray-100 px-3 py-2 text-left text-xs hover:bg-purple-50">Catégories d'immobilisations</button>
        {isShow && <button type="button" onClick={duplicateRecord} className="flex w-full items-center gap-2 border-b border-gray-100 px-3 py-2 text-left text-xs hover:bg-purple-50"><FiCopy size={13} />Dupliquer</button>}
        <button type="button" onClick={() => { setMenuOpen(false); window.setTimeout(() => window.print(), 50); }} className="flex w-full items-center gap-2 border-b border-gray-100 px-3 py-2 text-left text-xs hover:bg-purple-50"><FiPrinter size={13} />Imprimer</button>
        <button type="button" onClick={() => { setMenuOpen(false); setTraceOpen((value) => !value); }} className="w-full border-b border-gray-100 px-3 py-2 text-left text-xs hover:bg-purple-50">{traceOpen ? 'Fermer la traçabilité' : 'Afficher la traçabilité'}</button>
        {isShow && form.state === 'draft' && <button type="button" disabled={dirty || saving} onClick={() => runAction('start', 'Mettre cette immobilisation en service ?')} className="flex w-full items-center gap-2 border-b border-gray-100 px-3 py-2 text-left text-xs hover:bg-purple-50 disabled:opacity-40"><FiCheck size={13} />Mettre en service</button>}
        {isShow && form.state === 'running' && <button type="button" disabled={dirty || saving} onClick={() => runAction('pause', 'Mettre cette immobilisation en attente ?')} className="flex w-full items-center gap-2 border-b border-gray-100 px-3 py-2 text-left text-xs hover:bg-purple-50 disabled:opacity-40"><FiPause size={13} />Mettre en attente</button>}
        {isShow && form.state === 'waiting' && <button type="button" disabled={dirty || saving} onClick={() => runAction('start', 'Reprendre les dotations de cette immobilisation ?')} className="flex w-full items-center gap-2 border-b border-gray-100 px-3 py-2 text-left text-xs hover:bg-purple-50 disabled:opacity-40"><FiPlay size={13} />Reprendre</button>}
        {isShow && ['waiting', 'cancelled'].includes(form.state) && <button type="button" disabled={dirty || saving} onClick={() => runAction('draft', 'Remettre en brouillon ?')} className="flex w-full items-center gap-2 border-b border-gray-100 px-3 py-2 text-left text-xs hover:bg-purple-50 disabled:opacity-40"><FiRefreshCw size={13} />Remettre en brouillon</button>}
        {isShow && ['draft', 'waiting'].includes(form.state) && <button type="button" disabled={dirty || saving} onClick={() => runAction('cancel', 'Annuler cette immobilisation ?')} className="flex w-full items-center gap-2 border-b border-gray-100 px-3 py-2 text-left text-xs text-red-600 hover:bg-red-50 disabled:opacity-40"><FiX size={13} />Annuler</button>}
        {!isShow && <button type="button" onClick={() => { setForm(EMPTY_FORM); setDirty(false); setMenuOpen(false); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-purple-50"><FiRefreshCw size={13} />Réinitialiser</button>}
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

  const editable = form.state === 'draft';
  const currency = record?.currency_code || options.currencies.find((item) => String(item.id) === String(form.currency_id))?.code || 'XOF';
  const currentBookValue = record?.book_value ?? Math.max(
    Number(form.original_value || 0) - Number(form.already_depreciated_amount_import || 0),
    0,
  );
  const useSavedBoard = !editable || (!dirty && Array.isArray(record?.depreciation_board));
  const depreciationEntries = useSavedBoard ? (record?.depreciation_board || record?.depreciation_entries || []) : (preview.key === previewPayload ? preview.rows : []);
  const boardError = useSavedBoard ? record?.depreciation_board_error : (preview.key === previewPayload ? preview.error : '');
  const boardLoading = !useSavedBoard && preview.key === previewPayload && preview.loading;

  if (!entityId) return <UnifiedFormPage title="Immobilisations" noContext="Sélectionnez une société pour gérer les immobilisations." />;
  if (loading) return <UnifiedFormPage title="Immobilisations" fallbackPath="/comptabilite/immobilisations"><div className="p-8 text-center text-sm text-gray-500">Chargement de l'immobilisation...</div></UnifiedFormPage>;

  return (
    <>
      <UnifiedFormPage
        title="Immobilisations"
        recordLabel={form.name || 'Brouillon'}
        pageLabel={isShow ? "Détail de l'immobilisation" : "Création d'une immobilisation"}
        mode={isShow ? 'show' : 'create'}
        fallbackPath="/comptabilite/immobilisations"
        primaryAction={{ label: 'Nouveau', icon: <FiPlus size={12} />, path: '/comptabilite/immobilisations/create' }}
        actionsMenu={actionsMenu}
        onSave={editable ? save : undefined}
        saving={saving}
        autoReturnAfterSave
        hasUnsavedChanges={dirty}
        rememberForm={!isShow}
        memoryKey="comptabilite:asset:form:v1"
        memoryState={{ form, activeTab }}
        onRestoreMemoryState={(memory) => { if (!isShow && !restoredDraft && memory?.form) { setForm({ ...EMPTY_FORM, ...memory.form }); setActiveTab(memory.activeTab || 'depreciation'); } }}
        feedback={feedback}
        onDismissFeedback={() => setFeedback(null)}
        messageDuration={15000}
        process={process}
        traceability={{ open: traceOpen, onOpen: () => setTraceOpen(true), onClose: () => setTraceOpen(false), title: 'Traçabilité', content: traceabilityContent }}
      >
        <div className="min-w-0">
          <section className="border-b border-gray-300 px-4 py-3" aria-labelledby="asset-information-title">
              <h3 id="asset-information-title" className="mb-3 text-[15px] font-semibold text-gray-900">Informations principales</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2">
                <div className="space-y-1 pb-3 lg:border-r lg:border-gray-300 lg:pb-0 lg:pr-6">
                  <h4 className="mb-2 text-xs font-semibold text-gray-700">Identification</h4>
                  <Field label="Nom de l'immobilisation" required><input className={inputClass} value={form.name || ''} onChange={(event) => setField('name', event.target.value)} disabled={!editable} placeholder="Ex. Véhicule de livraison" /></Field>
                  <Field label="Numéro d'inventaire" required><input className={inputClass} value={form.code || ''} onChange={(event) => setField('code', event.target.value)} disabled={!editable} /></Field>
                  <Field label="Nature" required><SearchSelect value={form.asset_type} onChange={(value) => setField('asset_type', value)} options={ASSET_TYPES} getLabel={(item) => item.label} disabled={!editable} /></Field>
                  <Field label="Catégorie" required><AssetAutocomplete value={relationId(form.category_id)} onChange={selectCategory} options={options.categories} getLabel={(item) => joinLabel(item.code, item.name)} placeholder="Sélectionner une catégorie" disabled={!editable} onCreateOption={createCategory} createOptionLabel="Créer la catégorie" /></Field>
                  <Field label="Groupe d'immobilisations"><input className={inputClass} value={form.asset_group || ''} onChange={(event) => setField('asset_group', event.target.value)} disabled={!editable} /></Field>
                </div>
                <div className="space-y-1 border-t border-gray-300 pt-3 lg:border-t-0 lg:pl-6 lg:pt-0">
                  <h4 className="mb-2 text-xs font-semibold text-gray-700">Valeurs</h4>
                  <Field label="Date d'acquisition" required><input type="date" className={inputClass} value={form.acquisition_date || ''} onChange={(event) => setField('acquisition_date', event.target.value)} disabled={!editable} /></Field>
                  <Field label="Valeur d'origine" required><AmountInput value={form.original_value} onChange={(value) => setField('original_value', value)} disabled={!editable} /></Field>
                  <Field label="Valeur non amortissable"><AmountInput value={form.salvage_value} onChange={(value) => setField('salvage_value', value)} disabled={!editable} /></Field>
                  <Field label="Valeur comptable"><div className="flex h-[26px] items-center border border-gray-300 bg-gray-50 px-2 text-xs font-semibold text-gray-900">{formatMoney(currentBookValue, currency)}</div></Field>
                </div>
              </div>
          </section>

          <div className="flex border-b border-gray-300 bg-white px-4">
            {[['depreciation', "Méthode d'amortissement"], ['accounting', 'Comptabilité'], ['advanced', 'Paramètres avancés']].map(([key, label]) => <button key={key} type="button" onClick={() => setActiveTab(key)} className={`border-b-2 px-5 py-3 text-xs font-medium ${activeTab === key ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-500 hover:text-purple-600'}`}>{label}</button>)}
          </div>

          {activeTab === 'depreciation' && <div className="p-4">
            <div className="mb-4">
              <div className="grid grid-cols-1 gap-x-6 gap-y-1 lg:grid-cols-2">
                <Field label="Mode" required><SearchSelect value={form.depreciate_method} onChange={(value) => setField('depreciate_method', value)} options={METHODS} getLabel={(item) => item.label} disabled={!editable} /></Field>
                <Field label="Durée" required><div className="grid grid-cols-2 gap-2"><input type="number" min="1" className={inputClass} value={form.method_number ?? ''} onChange={(event) => setField('method_number', event.target.value)} disabled={!editable} /><SearchSelect value={form.method_period} onChange={(value) => setField('method_period', value)} options={PERIODS} getLabel={(item) => item.label} disabled={!editable} /></div></Field>
                <Field label="Calcul"><SearchSelect value={form.computation_type} onChange={(value) => setField('computation_type', value)} options={COMPUTATIONS} getLabel={(item) => item.label} disabled={!editable} /></Field>
                <Field label="Date de prorata"><input type="date" className={inputClass} value={form.service_start_date || ''} onChange={(event) => setField('service_start_date', event.target.value)} disabled={!editable} /></Field>
                {['declining', 'declining_constant'].includes(form.depreciate_method) && <Field label="Coefficient dégressif"><input type="number" min="0" step="0.0001" className={inputClass} value={form.declining_coefficient ?? ''} onChange={(event) => setField('declining_coefficient', event.target.value)} disabled={!editable} /></Field>}
                {form.depreciate_method === 'units' && <><Field label="Nature de l'unité"><input className={inputClass} value={form.work_unit_nature || ''} onChange={(event) => setField('work_unit_nature', event.target.value)} disabled={!editable} /></Field><Field label="Unités consommées"><input type="number" min="0" className={inputClass} value={form.work_units_consumed ?? ''} onChange={(event) => setField('work_units_consumed', event.target.value)} disabled={!editable} /></Field><Field label="Unités prévues" required><input type="number" min="0" className={inputClass} value={form.work_units_total ?? ''} onChange={(event) => setField('work_units_total', event.target.value)} disabled={!editable} /></Field></>}
              </div>
            </div>
            <h3 className="mb-2 text-[15px] font-semibold text-gray-900">Tableau d'amortissement</h3>
            {boardError && <div role="alert" className="mb-2 text-xs text-red-600">{boardError}</div>}
            <AssetTable
              storageKey="comptabilite:asset:depreciation-table:v2"
              columns={DEPRECIATION_COLUMNS}
              rows={depreciationEntries}
              emptyLabel={boardLoading ? 'Calcul du plan...' : boardError ? 'Plan non disponible.' : Number(form.original_value || 0) > 0 ? 'Aucune dotation restante.' : "Renseignez la valeur et les paramètres d'amortissement."}
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
            {isShow && !['cancelled', 'disposed'].includes(form.state) && <button type="button" onClick={() => { setOperation({ ...EMPTY_OPERATION, journal_id: form.journal_id }); setOperationOpen(true); }} className="mb-3 flex h-8 items-center gap-1 bg-purple-600 px-3 text-xs font-medium text-white hover:bg-purple-700"><FiPlus size={12} />Nouvelle opération</button>}
            {operations.length > 0 && <div className="mt-3 border border-gray-300"><div className="border-b border-gray-300 bg-gray-50 px-3 py-2 text-sm font-semibold">Historique des opérations</div><div className="overflow-x-auto"><table className="min-w-full text-xs"><thead><tr className="bg-gray-50 text-left"><th className="border-r border-gray-300 px-3 py-2">Date</th><th className="border-r border-gray-300 px-3 py-2">Opération</th><th className="border-r border-gray-300 px-3 py-2">Pièce comptable</th><th className="px-3 py-2">Note</th></tr></thead><tbody>{operations.map((item) => <tr key={item.id} className="border-t border-gray-300"><td className="border-r border-gray-300 px-3 py-2">{formatDate(item.disposal_date)}</td><td className="border-r border-gray-300 px-3 py-2">{item.modify_type_label || MODIFICATION_TYPES.find((type) => type.id === item.modify_type)?.label || item.modify_type}</td><td className="border-r border-gray-300 px-3 py-2">{item.accounting_move_label || '-'}</td><td className="px-3 py-2">{item.note || '-'}</td></tr>)}</tbody></table></div></div>}
          </div>}

          {activeTab === 'accounting' && <div className="p-4">
            <AssetTable
              storageKey="comptabilite:asset:accounting-table:columns:v2"
              columns={ACCOUNTING_COLUMNS}
              rows={ACCOUNTING_VALUES_ROW}
              renderCell={(row, column) => <SearchSelect value={relationId(form[column.key])} onChange={(value) => setField(column.key, value)} options={column.key === 'journal_id' ? options.journals : options.accounts} getLabel={column.key === 'journal_id' ? journalLabel : accountLabel} placeholder={column.key === 'journal_id' ? 'Sélectionner un journal' : 'Sélectionner un compte'} disabled={!editable} bordered={false} />}
            />
            <div className="mt-4 border-t border-gray-300 pt-3">
              <h3 className="mb-3 text-[15px] font-semibold text-gray-900">Valeur à l'import</h3>
              <div className="grid grid-cols-1 gap-x-6 gap-y-1 lg:grid-cols-2">
                <Field label="Montant amorti"><AmountInput value={form.already_depreciated_amount_import} onChange={(value) => setField('already_depreciated_amount_import', value)} disabled={!editable} /></Field>
              </div>
            </div>
          </div>}

          {activeTab === 'advanced' && <div className="p-4"><div className="border border-gray-300"><div className="border-b border-gray-300 bg-gray-50 px-3 py-2 text-sm font-semibold">Informations complémentaires</div><div className="grid grid-cols-1 gap-x-6 gap-y-1 p-3 lg:grid-cols-2">
            <Field label="Devise" required><SearchSelect value={relationId(form.currency_id)} onChange={(value) => setField('currency_id', value)} options={options.currencies} getLabel={currencyLabel} placeholder="Sélectionner une devise" disabled={!editable} /></Field>
            <Field label="Emplacement"><input className={inputClass} value={form.location || ''} onChange={(event) => setField('location', event.target.value)} disabled={!editable} /></Field>
            <Field label="Utilisé par"><SearchSelect value={relationId(form.used_by)} onChange={(value) => setField('used_by', value)} options={options.users} getLabel={userLabel} placeholder="Sélectionner un utilisateur" disabled={!editable} /></Field>
            <Field label="Immobilisation parente"><SearchSelect value={relationId(form.parent_id)} onChange={(value) => setField('parent_id', value)} options={options.assets.filter((item) => String(item.id) !== String(id))} getLabel={(item) => joinLabel(item.code, item.name)} placeholder="Aucune" disabled={!editable} /></Field>
            <Field label="Durée de vie (jours)"><input type="number" min="0" className={inputClass} value={form.asset_lifetime_days ?? ''} onChange={(event) => setField('asset_lifetime_days', event.target.value)} disabled={!editable} /></Field>
            <Field label="Jours de suspension"><input type="number" min="0" className={inputClass} value={form.asset_paused_days ?? ''} onChange={(event) => setField('asset_paused_days', event.target.value)} disabled={!editable} /></Field>
            <Field label="Code-barres"><input className={inputClass} value={record?.barcode || ''} disabled placeholder="Généré automatiquement" /></Field>
            <Field label="Dépréciations cumulées"><div className="flex h-[26px] items-center border border-gray-300 bg-gray-50 px-2 text-xs">{formatMoney(record?.impairment_amount, currency)}</div></Field>
            <Field label="Reprises cumulées"><div className="flex h-[26px] items-center border border-gray-300 bg-gray-50 px-2 text-xs">{formatMoney(record?.impairment_reversal_amount, currency)}</div></Field>
          </div></div></div>}
        </div>
      </UnifiedFormPage>

      {operationOpen && <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/30 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setOperationOpen(false); }}><div className="w-full max-w-2xl border border-gray-300 bg-white shadow-xl"><div className="flex items-center justify-between border-b border-gray-300 px-4 py-3"><h3 className="text-sm font-semibold">Nouvelle opération sur l'immobilisation</h3><button type="button" onClick={() => setOperationOpen(false)} aria-label="Fermer"><FiX /></button></div><div className="grid grid-cols-1 gap-x-6 gap-y-2 p-4 lg:grid-cols-2">
        <Field label="Type" required><SearchSelect value={operation.modify_type} onChange={(value) => setOperation((current) => ({ ...current, modify_type: value }))} options={MODIFICATION_TYPES} getLabel={(item) => item.label} /></Field>
        <Field label="Date" required><input type="date" className={inputClass} value={operation.disposal_date} onChange={(event) => setOperation((current) => ({ ...current, disposal_date: event.target.value }))} /></Field>
        <Field label="Journal" required><SearchSelect value={relationId(operation.journal_id)} onChange={(value) => setOperation((current) => ({ ...current, journal_id: value }))} options={options.journals} getLabel={journalLabel} /></Field>
        {operation.modify_type === 'sale' && <><Field label="Prix de cession" required><AmountInput value={operation.sale_price} onChange={(value) => setOperation((current) => ({ ...current, sale_price: value }))} /></Field><Field label="Frais de cession"><AmountInput value={operation.fee_sale} onChange={(value) => setOperation((current) => ({ ...current, fee_sale: value }))} /></Field></>}
        {['impairment', 'impairment_reversal', 'revaluation'].includes(operation.modify_type) && <Field label="Valeur actuelle" required><AmountInput value={operation.current_value} onChange={(value) => setOperation((current) => ({ ...current, current_value: value }))} /></Field>}
        {operation.modify_type === 'plan_revision' && <><Field label="Nombre de périodes"><input type="number" min="1" className={inputClass} value={operation.method_number} onChange={(event) => setOperation((current) => ({ ...current, method_number: event.target.value }))} /></Field><Field label="Unité de période"><SearchSelect value={operation.method_period} onChange={(value) => setOperation((current) => ({ ...current, method_period: value }))} options={PERIODS} getLabel={(item) => item.label} /></Field><Field label="Valeur résiduelle"><AmountInput value={operation.salvage_value} onChange={(value) => setOperation((current) => ({ ...current, salvage_value: value }))} /></Field></>}
        <div className="lg:col-span-2"><label className="mb-1 block text-xs font-medium text-gray-700">Note</label><textarea className="min-h-20 w-full border border-gray-300 px-2 py-1 text-xs outline-none focus:border-purple-600" value={operation.note} onChange={(event) => setOperation((current) => ({ ...current, note: event.target.value }))} /></div>
      </div><div className="flex justify-end gap-2 border-t border-gray-300 px-4 py-3"><button type="button" onClick={() => setOperationOpen(false)} className="h-8 border border-gray-300 px-4 text-xs">Annuler</button><button type="button" onClick={saveOperation} disabled={saving} className="h-8 bg-purple-600 px-4 text-xs font-semibold text-white disabled:opacity-50">Enregistrer l'opération</button></div></div></div>}
    </>
  );
}
