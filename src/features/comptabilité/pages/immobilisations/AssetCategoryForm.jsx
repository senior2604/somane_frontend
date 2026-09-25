import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FiCopy, FiPlus, FiPrinter, FiRefreshCw, FiSettings, FiTrash2 } from 'react-icons/fi';
import { useLocation, useNavigate, useParams } from 'react-router-dom';

import UnifiedFormPage from '../../../../components/UnifiedFormPage';
import axiosInstance from '../../../../config/axiosInstance';
import { SearchSelect, StatusSwitch } from '../payement/paymentShared.jsx';
import {
  API,
  Field,
  METHODS,
  PERIODS,
  accountLabel,
  formatDateTime,
  getActionErrorMessage,
  getActiveEntityId,
  inputClass,
  journalLabel,
  normalizeApiList,
  relationId,
} from './assetShared.jsx';

const EMPTY_FORM = {
  code: '', name: '', account_asset_id: '', account_depreciation_id: '',
  account_depreciation_expense_id: '', account_impairment_id: '',
  account_impairment_expense_id: '', account_dispose_expense_id: '',
  account_disposal_id: '', revaluation_gain_account_id: '',
  revaluation_loss_account_id: '', journal_id: '', method: 'linear',
  method_number: 5, method_period: 'year', method_progress_factor: 1,
  prorata: true, salvage_value_percent: 0, active: true,
};

let optionsCache = null;
let optionsPromise = null;

const loadOptions = async (entityId) => {
  if (optionsCache?.entityId === String(entityId)) return optionsCache.data;
  if (!optionsPromise) {
    optionsPromise = Promise.all([
      axiosInstance.get(API.accounts, { params: { company: entityId, company_id: entityId, page_size: 2000 } }),
      axiosInstance.get(API.journals, { params: { company: entityId, company_id: entityId, page_size: 500 } }),
    ]).then(([accounts, journals]) => ({
      accounts: normalizeApiList(accounts.data).filter((account) => account.company || account.company_id),
      journals: normalizeApiList(journals.data),
    })).finally(() => { optionsPromise = null; });
  }
  const data = await optionsPromise;
  optionsCache = { entityId: String(entityId), data };
  return data;
};

export default function AssetCategoryForm({ mode = 'create' }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const entityId = getActiveEntityId();
  const isShow = mode === 'show' || mode === 'detail';
  const menuRef = useRef(null);
  const preload = isShow ? location.state?.assetCategoryRecord : null;
  const duplicate = !isShow ? location.state?.duplicateAssetCategory : null;
  const [form, setForm] = useState(() => ({ ...EMPTY_FORM, name: !isShow ? location.state?.suggestedValue || '' : '', ...(duplicate || preload || {}), id: undefined }));
  const [record, setRecord] = useState(preload || null);
  const [options, setOptions] = useState(() => optionsCache?.data || { accounts: [], journals: [] });
  const [activeTab, setActiveTab] = useState('accounting');
  const [traceOpen, setTraceOpen] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [loading, setLoading] = useState(isShow && !preload);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(Boolean(duplicate));
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    const close = (event) => { if (menuRef.current && !menuRef.current.contains(event.target)) setMenuOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const load = useCallback(async () => {
    if (!entityId) return;
    if (isShow && !preload) setLoading(true);
    try {
      const [loadedOptions, detail] = await Promise.all([
        loadOptions(entityId),
        isShow ? axiosInstance.get(`${API.categories}${id}/`) : Promise.resolve({ data: null }),
      ]);
      setOptions(loadedOptions);
      if (detail.data) {
        setRecord(detail.data);
        setForm({ ...EMPTY_FORM, ...detail.data });
        setDirty(false);
      }
    } catch (error) {
      setFeedback({ type: 'error', message: getActionErrorMessage(error, 'Impossible de charger la catégorie.') });
    } finally { setLoading(false); }
  }, [entityId, id, isShow, preload]);

  useEffect(() => { load(); }, [load]);

  const setField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setDirty(true);
    setFeedback(null);
  };

  const validate = () => {
    const errors = [];
    if (!form.code?.trim()) errors.push('Le code est obligatoire.');
    if (!form.name?.trim()) errors.push('Le nom est obligatoire.');
    if (!relationId(form.account_asset_id)) errors.push("Le compte d'immobilisation est obligatoire.");
    if (!relationId(form.account_depreciation_id)) errors.push("Le compte d'amortissement est obligatoire.");
    if (!relationId(form.account_depreciation_expense_id)) errors.push('Le compte de dotation est obligatoire.');
    if (!relationId(form.journal_id)) errors.push('Le journal est obligatoire.');
    if (Number(form.method_number || 0) <= 0) errors.push('Le nombre de périodes doit être supérieur à zéro.');
    if (Number(form.salvage_value_percent || 0) < 0 || Number(form.salvage_value_percent || 0) > 100) errors.push('La valeur résiduelle doit être comprise entre 0 et 100 %.');
    return errors;
  };

  const payload = () => ({
    company_id: Number(entityId), code: form.code.trim(), name: form.name.trim(),
    account_asset_id: relationId(form.account_asset_id),
    account_depreciation_id: relationId(form.account_depreciation_id),
    account_depreciation_expense_id: relationId(form.account_depreciation_expense_id),
    account_impairment_id: relationId(form.account_impairment_id) || null,
    account_impairment_expense_id: relationId(form.account_impairment_expense_id) || null,
    account_dispose_expense_id: relationId(form.account_dispose_expense_id) || null,
    account_disposal_id: relationId(form.account_disposal_id) || null,
    revaluation_gain_account_id: relationId(form.revaluation_gain_account_id) || null,
    revaluation_loss_account_id: relationId(form.revaluation_loss_account_id) || null,
    journal_id: relationId(form.journal_id), method: form.method,
    method_number: Number(form.method_number || 0), method_period: form.method_period,
    method_progress_factor: Number(form.method_progress_factor || 0),
    prorata: Boolean(form.prorata), salvage_value_percent: Number(form.salvage_value_percent || 0),
    active: Boolean(form.active),
  });

  const save = async () => {
    const errors = validate();
    if (errors.length) { setFeedback({ type: 'error', message: errors.join('\n') }); return false; }
    setSaving(true);
    try {
      const response = isShow
        ? await axiosInstance.patch(`${API.categories}${id}/`, payload())
        : await axiosInstance.post(API.categories, payload());
      setRecord(response.data);
      setForm({ ...EMPTY_FORM, ...response.data });
      setDirty(false);
      return response.data;
    } catch (error) {
      setFeedback({ type: 'error', message: getActionErrorMessage(error, "Échec de l'enregistrement de la catégorie.") });
      return false;
    } finally { setSaving(false); }
  };

  const deleteRecord = async () => {
    setMenuOpen(false);
    if (!isShow || !window.confirm('Supprimer cette catégorie ?')) return;
    try {
      await axiosInstance.delete(`${API.categories}${id}/`);
      navigate('/comptabilite/categories-immobilisations', { replace: true });
    } catch (error) { setFeedback({ type: 'error', message: getActionErrorMessage(error, 'Suppression impossible.') }); }
  };

  const duplicateRecord = () => {
    setMenuOpen(false);
    navigate('/comptabilite/categories-immobilisations/create', {
      state: { duplicateAssetCategory: { ...form, code: '', name: `${form.name} (copie)` } },
    });
  };

  const actionsMenu = (
    <div className="relative" ref={menuRef}>
      <button type="button" onClick={() => setMenuOpen((value) => !value)} className="flex h-8 items-center gap-1 border border-gray-300 px-3 text-xs text-gray-700 hover:border-purple-500 hover:bg-purple-50 hover:text-purple-700"><FiSettings size={12} />Actions</button>
      {menuOpen && <div className="absolute right-0 z-[80] mt-1 w-56 border border-gray-300 bg-white shadow-lg">
        <button type="button" onClick={() => navigate('/comptabilite/categories-immobilisations')} className="w-full border-b border-gray-100 px-3 py-2 text-left text-xs hover:bg-purple-50">Liste des catégories</button>
        {isShow && <button type="button" onClick={duplicateRecord} className="flex w-full items-center gap-2 border-b border-gray-100 px-3 py-2 text-left text-xs hover:bg-purple-50"><FiCopy size={13} />Dupliquer</button>}
        <button type="button" onClick={() => { setMenuOpen(false); window.setTimeout(() => window.print(), 50); }} className="flex w-full items-center gap-2 border-b border-gray-100 px-3 py-2 text-left text-xs hover:bg-purple-50"><FiPrinter size={13} />Imprimer</button>
        <button type="button" onClick={() => { setMenuOpen(false); setTraceOpen((value) => !value); }} className="w-full border-b border-gray-100 px-3 py-2 text-left text-xs hover:bg-purple-50">{traceOpen ? 'Fermer la traçabilité' : 'Afficher la traçabilité'}</button>
        {!isShow && <button type="button" onClick={() => { setForm(EMPTY_FORM); setDirty(false); setMenuOpen(false); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-purple-50"><FiRefreshCw size={13} />Réinitialiser</button>}
        {isShow && <button type="button" onClick={deleteRecord} className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-red-600 hover:bg-red-50"><FiTrash2 size={13} />Supprimer</button>}
      </div>}
    </div>
  );

  const traceabilityContent = (
    <div className="space-y-2 px-4 py-3">
      {!record?.create_date ? <div className="border border-gray-200 bg-white p-3 text-xs text-gray-500">La traçabilité commencera après l'enregistrement.</div> : <>
        {record.write_date && record.write_date !== record.create_date && <div className="border border-gray-200 bg-white p-3 text-xs"><div className="font-semibold">Dernière modification</div><div className="mt-1 text-gray-500">{formatDateTime(record.write_date)} · {record.write_uid_label || 'Utilisateur'}</div></div>}
        <div className="border border-gray-200 bg-white p-3 text-xs"><div className="font-semibold">Création</div><div className="mt-1 text-gray-500">{formatDateTime(record.create_date)} · {record.create_uid_label || 'Utilisateur'}</div></div>
      </>}
    </div>
  );

  const AccountSelect = ({ field, placeholder }) => <SearchSelect value={relationId(form[field])} onChange={(value) => setField(field, value)} options={options.accounts} getLabel={accountLabel} placeholder={placeholder} />;

  if (!entityId) return <UnifiedFormPage title="Catégories d'immobilisations" noContext="Sélectionnez une société pour gérer les catégories." />;
  if (loading) return <UnifiedFormPage title="Catégories d'immobilisations" fallbackPath="/comptabilite/categories-immobilisations"><div className="p-8 text-center text-sm text-gray-500">Chargement de la catégorie...</div></UnifiedFormPage>;

  return (
    <UnifiedFormPage
      title="Catégories d'immobilisations"
      recordLabel={form.name || 'Nouvelle catégorie'}
      pageLabel={isShow ? "Détail de la catégorie d'immobilisation" : "Création d'une catégorie d'immobilisation"}
      mode={isShow ? 'show' : 'create'}
      fallbackPath="/comptabilite/categories-immobilisations"
      buildReturnState={(savedCategory) => location.state?.restoreAssetDraft ? {
        restoreAssetDraft: location.state.restoreAssetDraft,
        createdAssetCategory: savedCategory || undefined,
        restoredFromSmartBack: true,
      } : { createdRecord: savedCategory, refreshAssetCategories: true }}
      primaryAction={{ label: 'Nouveau', icon: <FiPlus size={12} />, path: '/comptabilite/categories-immobilisations/create' }}
      actionsMenu={actionsMenu}
      onSave={save}
      saving={saving}
      autoReturnAfterSave
      hasUnsavedChanges={dirty}
      rememberForm={!isShow}
      memoryKey="comptabilite:asset-category:form:v1"
      memoryState={{ form, activeTab }}
      onRestoreMemoryState={(memory) => { if (!isShow && !location.state?.restoreAssetDraft && memory?.form) { setForm({ ...EMPTY_FORM, ...memory.form }); setActiveTab(memory.activeTab || 'accounting'); } }}
      feedback={feedback}
      onDismissFeedback={() => setFeedback(null)}
      messageDuration={15000}
      traceability={{ open: traceOpen, onOpen: () => setTraceOpen(true), onClose: () => setTraceOpen(false), title: 'Traçabilité', content: traceabilityContent }}
    >
      <div className="min-w-0">
        <div className="border-b border-gray-300 px-4 py-3">
          <div className="grid grid-cols-1 gap-x-6 gap-y-1 lg:grid-cols-2">
            <Field label="Code" required><input className={inputClass} value={form.code || ''} onChange={(event) => setField('code', event.target.value)} /></Field>
            <Field label="Nom de la catégorie" required><input className={inputClass} value={form.name || ''} onChange={(event) => setField('name', event.target.value)} placeholder="Ex. Matériel informatique" /></Field>
          </div>
        </div>
        <div className="flex border-b border-gray-300 bg-white px-4">
          {[['accounting', 'Paramètres comptables'], ['depreciation', "Amortissement"], ['advanced', 'Paramètres avancés']].map(([key, label]) => <button key={key} type="button" onClick={() => setActiveTab(key)} className={`border-b-2 px-5 py-3 text-xs font-medium ${activeTab === key ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-500 hover:text-purple-600'}`}>{label}</button>)}
        </div>
        <div className="p-4">
          {activeTab === 'accounting' && <div className="border border-gray-300">
            <div className="border-b border-gray-300 bg-gray-50 px-3 py-2 text-sm font-semibold">Comptes et journal par défaut</div>
            <div className="grid grid-cols-1 gap-x-6 gap-y-1 p-3 lg:grid-cols-2">
              <Field label="Compte d'immobilisation" required><AccountSelect field="account_asset_id" placeholder="Sélectionner un compte" /></Field>
              <Field label="Compte d'amortissement" required><AccountSelect field="account_depreciation_id" placeholder="Sélectionner un compte" /></Field>
              <Field label="Compte de dotation" required><AccountSelect field="account_depreciation_expense_id" placeholder="Sélectionner un compte" /></Field>
              <Field label="Journal" required><SearchSelect value={relationId(form.journal_id)} onChange={(value) => setField('journal_id', value)} options={options.journals} getLabel={journalLabel} placeholder="Sélectionner un journal" /></Field>
            </div>
          </div>}
          {activeTab === 'depreciation' && <div className="border border-gray-300">
            <div className="border-b border-gray-300 bg-gray-50 px-3 py-2 text-sm font-semibold">Règles par défaut</div>
            <div className="grid grid-cols-1 gap-x-6 gap-y-1 p-3 lg:grid-cols-2">
              <Field label="Méthode" required><SearchSelect value={form.method} onChange={(value) => setField('method', value)} options={METHODS} getLabel={(item) => item.label} /></Field>
              <Field label="Nombre de périodes" required><input type="number" min="1" className={inputClass} value={form.method_number ?? ''} onChange={(event) => setField('method_number', event.target.value)} /></Field>
              <Field label="Unité de période" required><SearchSelect value={form.method_period} onChange={(value) => setField('method_period', value)} options={PERIODS} getLabel={(item) => item.label} /></Field>
              <Field label="Valeur résiduelle (%)"><input type="number" min="0" max="100" className={inputClass} value={form.salvage_value_percent ?? ''} onChange={(event) => setField('salvage_value_percent', event.target.value)} /></Field>
              {['declining', 'declining_constant'].includes(form.method) && <Field label="Coefficient dégressif"><input type="number" min="0" step="0.0001" className={inputClass} value={form.method_progress_factor ?? ''} onChange={(event) => setField('method_progress_factor', event.target.value)} /></Field>}
              <Field label="Prorata temporis"><StatusSwitch checked={Boolean(form.prorata)} onChange={(value) => setField('prorata', value)} /></Field>
            </div>
          </div>}
          {activeTab === 'advanced' && <div className="border border-gray-300">
            <div className="border-b border-gray-300 bg-gray-50 px-3 py-2 text-sm font-semibold">Comptes facultatifs</div>
            <div className="grid grid-cols-1 gap-x-6 gap-y-1 p-3 lg:grid-cols-2">
              <Field label="Compte de dépréciation"><AccountSelect field="account_impairment_id" placeholder="Facultatif" /></Field>
              <Field label="Dotation pour dépréciation"><AccountSelect field="account_impairment_expense_id" placeholder="Facultatif" /></Field>
              <Field label="Valeur comptable des cessions"><AccountSelect field="account_dispose_expense_id" placeholder="Facultatif" /></Field>
              <Field label="Produit de cession"><AccountSelect field="account_disposal_id" placeholder="Facultatif" /></Field>
              <Field label="Écart positif de réévaluation"><AccountSelect field="revaluation_gain_account_id" placeholder="Facultatif" /></Field>
              <Field label="Écart négatif de réévaluation"><AccountSelect field="revaluation_loss_account_id" placeholder="Facultatif" /></Field>
              <Field label="Actif"><StatusSwitch checked={Boolean(form.active)} onChange={(value) => setField('active', value)} /></Field>
            </div>
          </div>}
        </div>
      </div>
    </UnifiedFormPage>
  );
}
