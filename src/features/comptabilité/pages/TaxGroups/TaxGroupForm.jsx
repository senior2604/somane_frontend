// src/features/comptabilite/pages/TaxGroups/TaxGroupForm.jsx

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  FiCheck,
  FiClock,
  FiCopy,
  FiMoreVertical,
  FiPlus,
  FiTrash2,
} from 'react-icons/fi';
import UnifiedFormPage from '../../../../components/UnifiedFormPage';
import { useEntity } from '../../../../context/EntityContext';
import { apiClient } from '../../../../services/apiClient';

const MESSAGE_DURATION = 15000;
const RECORD_CACHE_PREFIX = 'comptabilite:groupes-taxes:record:';
const COUNTRY_CACHE_KEY = 'comptabilite:groupes-taxes:countries';
const ACCOUNT_CACHE_PREFIX = 'comptabilite:groupes-taxes:accounts:';

const EMPTY_FORM = {
  name: '',
  sequence: 10,
  country: null,
  country_label: '',
  property_tax_payable_account: null,
  property_tax_payable_account_label: '',
  property_tax_receivable_account: null,
  property_tax_receivable_account_label: '',
  property_advance_tax_payment_account: null,
  property_advance_tax_payment_account_label: '',
  preceding_subtotal: '',
};

const inputClass = 'h-[30px] w-full border border-gray-300 bg-white px-2 text-xs text-gray-800 outline-none transition-colors hover:border-purple-400 focus:border-purple-600 focus:ring-1 focus:ring-purple-200 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500';

const asArray = (payload) => {
  const value = payload?.data ?? payload;
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.results)) return value.results;
  if (Array.isArray(value?.data)) return value.data;
  return [];
};

const asObject = (payload) => payload?.data ?? payload ?? {};

const resolveId = (value) => {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'object') return value.id ?? value.pk ?? null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : value;
};

const joinLabel = (code, name) => [code, name].filter(Boolean).join(' - ');

const accountLabelFrom = (record, prefix) => {
  const relation = record?.[prefix];
  return joinLabel(
    record?.[`${prefix}_code`] || relation?.code,
    record?.[`${prefix}_name`] || relation?.name || relation?.nom,
  );
};

const countryLabel = (country) => {
  if (!country) return '';
  const name = country.nom_fr || country.nom || country.name || '';
  const code = country.code_iso || country.code || '';
  return [name, code && `(${code})`].filter(Boolean).join(' ');
};

const readCache = (key, fallback) => {
  try {
    const stored = sessionStorage.getItem(key);
    return stored ? JSON.parse(stored) : fallback;
  } catch {
    return fallback;
  }
};

const writeCache = (key, value) => {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {}
};

const getErrorMessage = (error, fallback) => {
  const data = error?.response?.data ?? error?.data;
  if (typeof data === 'string' && data.trim()) return data;
  if (data?.detail) return data.detail;
  if (data && typeof data === 'object') {
    return Object.entries(data)
      .map(([field, value]) => `${field} : ${Array.isArray(value) ? value.join(', ') : String(value)}`)
      .join('\n');
  }
  return error?.message || fallback;
};

const normalizeForm = (record = {}) => ({
  ...EMPTY_FORM,
  name: record.name || '',
  sequence: Number(record.sequence ?? 10),
  country: resolveId(record.country),
  country_label: countryLabel(typeof record.country === 'object' ? record.country : null),
  property_tax_payable_account: resolveId(record.property_tax_payable_account),
  property_tax_payable_account_label: accountLabelFrom(record, 'property_tax_payable_account'),
  property_tax_receivable_account: resolveId(record.property_tax_receivable_account),
  property_tax_receivable_account_label: accountLabelFrom(record, 'property_tax_receivable_account'),
  property_advance_tax_payment_account: resolveId(record.property_advance_tax_payment_account),
  property_advance_tax_payment_account_label: accountLabelFrom(record, 'property_advance_tax_payment_account'),
  preceding_subtotal: record.preceding_subtotal || '',
});

const isSelectableAccount = (account) => {
  if (!account?.id) return false;
  if (account.is_root === true || account.is_root_account === true) return false;
  if (String(account.account_type || '').toLowerCase() === 'root') return false;
  if (String(account.internal_group || '').toLowerCase() === 'root') return false;
  if (account.can_be_used_in_entry === false || account.movement_allowed === false) return false;

  const company = account.company_id ?? account.company;
  const companyId = typeof company === 'object' ? (company?.id ?? company?.pk) : company;
  return companyId !== null && companyId !== undefined && companyId !== '';
};

function Field({ label, required = false, children }) {
  return (
    <label className="grid min-w-0 grid-cols-[175px_minmax(0,1fr)] items-center gap-3 py-1">
      <span className="text-xs font-medium text-gray-700">
        {label}{required && <span className="ml-0.5 text-red-500">*</span>}
      </span>
      <span className="min-w-0">{children}</span>
    </label>
  );
}

function SearchSelect({
  value,
  selectedId,
  options,
  getOptionLabel,
  onChange,
  onSelect,
  onOpen,
  onQuery,
  placeholder,
  loading = false,
  emptyLabel = 'Aucun résultat',
}) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState(value || '');
  const [highlighted, setHighlighted] = useState(0);
  const [panelStyle, setPanelStyle] = useState({});
  const inputRef = useRef(null);
  const panelRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => setInput(value || ''), [value]);

  const visibleOptions = useMemo(() => {
    const query = input.trim().toLocaleLowerCase('fr');
    return (options || [])
      .filter((option) => String(getOptionLabel(option) || '').toLocaleLowerCase('fr').includes(query))
      .slice(0, 100);
  }, [getOptionLabel, input, options]);

  const positionPanel = useCallback(() => {
    const rect = inputRef.current?.getBoundingClientRect();
    if (!rect) return;
    setPanelStyle({
      position: 'fixed',
      left: rect.left,
      top: rect.bottom + 1,
      width: rect.width,
      maxHeight: 230,
      overflowY: 'auto',
      zIndex: 9999,
    });
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const reposition = () => positionPanel();
    window.addEventListener('resize', reposition);
    window.addEventListener('scroll', reposition, true);
    return () => {
      window.removeEventListener('resize', reposition);
      window.removeEventListener('scroll', reposition, true);
    };
  }, [open, positionPanel]);

  useEffect(() => {
    const close = (event) => {
      if (!inputRef.current?.contains(event.target) && !panelRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const selectOption = (option) => {
    const label = getOptionLabel(option);
    setInput(label);
    setOpen(false);
    onSelect(option.id, label, option);
  };

  return (
    <>
      <input
        ref={inputRef}
        value={input}
        placeholder={placeholder}
        autoComplete="off"
        onFocus={() => {
          setOpen(true);
          positionPanel();
          onOpen?.();
        }}
        onChange={(event) => {
          const text = event.target.value;
          setInput(text);
          setOpen(true);
          setHighlighted(0);
          onChange(text);
          if (selectedId) onSelect(null, '', null);
          window.clearTimeout(timerRef.current);
          if (onQuery) timerRef.current = window.setTimeout(() => onQuery(text), 220);
        }}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown') {
            event.preventDefault();
            setOpen(true);
            setHighlighted((index) => Math.min(index + 1, visibleOptions.length - 1));
          } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            setHighlighted((index) => Math.max(index - 1, 0));
          } else if (event.key === 'Enter' && open && visibleOptions[highlighted]) {
            event.preventDefault();
            selectOption(visibleOptions[highlighted]);
          } else if (event.key === 'Escape') {
            setOpen(false);
          }
        }}
        className={inputClass}
      />
      {open && typeof document !== 'undefined' && createPortal(
        <div ref={panelRef} style={panelStyle} className="border border-gray-300 bg-white shadow-xl">
          {loading && visibleOptions.length === 0 ? (
            <div className="px-3 py-3 text-xs text-gray-500">Chargement des comptes…</div>
          ) : visibleOptions.length === 0 ? (
            <div className="px-3 py-3 text-xs text-gray-500">{emptyLabel}</div>
          ) : (
            visibleOptions.map((option, index) => (
              <button
                key={option.id}
                type="button"
                onMouseEnter={() => setHighlighted(index)}
                onClick={() => selectOption(option)}
                className={`block w-full truncate px-3 py-2 text-left text-xs transition-colors ${
                  index === highlighted || String(option.id) === String(selectedId)
                    ? 'bg-purple-50 text-purple-700'
                    : 'text-gray-700 hover:bg-purple-50 hover:text-purple-700'
                }`}
                title={getOptionLabel(option)}
              >
                {getOptionLabel(option)}
              </button>
            ))
          )}
        </div>,
        document.body,
      )}
    </>
  );
}

export default function TaxGroupForm({ mode = 'create' }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { id: routeId } = useParams();
  const { activeEntity } = useEntity();
  const companyId = activeEntity?.id;
  const recordId = mode === 'show' ? routeId : null;
  const initialRecord = location.state?.taxGroupRecord || null;

  const [form, setForm] = useState(() => normalizeForm(initialRecord || {}));
  const [record, setRecord] = useState(initialRecord);
  const [countries, setCountries] = useState(() => readCache(COUNTRY_CACHE_KEY, []));
  const [accounts, setAccounts] = useState(() => (
    readCache(`${ACCOUNT_CACHE_PREFIX}${companyId || 'global'}`, []).filter(isSelectableAccount)
  ));
  const [accountsLoading, setAccountsLoading] = useState(false);
  const [accountsError, setAccountsError] = useState('');
  const [activeTab, setActiveTab] = useState('accounting');
  const [dirty, setDirty] = useState(false);
  const [loading, setLoading] = useState(Boolean(recordId && !initialRecord));
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [traceOpen, setTraceOpen] = useState(Boolean(recordId));
  const [actionsOpen, setActionsOpen] = useState(false);
  const actionsRef = useRef(null);
  const accountRequestRef = useRef(0);

  const loadCountries = useCallback(async () => {
    if (countries.length) return;
    try {
      const response = await apiClient.get('/pays/', { params: { page_size: 500 } });
      const rows = asArray(response);
      setCountries(rows);
      writeCache(COUNTRY_CACHE_KEY, rows);
    } catch {}
  }, [countries.length]);

  const loadAccounts = useCallback(async (search = '') => {
    if (!companyId) return;
    const version = accountRequestRef.current + 1;
    accountRequestRef.current = version;
    setAccountsLoading(true);
    setAccountsError('');
    try {
      const response = await apiClient.get('/compta/accounts/', {
        params: {
          company: companyId,
          exclude_roots: true,
          page_size: 100,
          ...(search.trim() ? { search: search.trim() } : {}),
        },
      });
      if (version !== accountRequestRef.current) return;
      const rows = asArray(response).filter(isSelectableAccount);
      setAccounts((current) => {
        const map = new Map(
          current.filter(isSelectableAccount).map((item) => [String(item.id), item]),
        );
        rows.forEach((item) => map.set(String(item.id), item));
        const merged = [...map.values()];
        writeCache(`${ACCOUNT_CACHE_PREFIX}${companyId}`, merged.slice(0, 250));
        return merged;
      });
    } catch (error) {
      if (version === accountRequestRef.current) {
        setAccountsError(getErrorMessage(error, 'Impossible de charger les comptes.'));
      }
    } finally {
      if (version === accountRequestRef.current) setAccountsLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    loadCountries();
  }, [loadCountries]);

  useEffect(() => {
    if (!companyId) return;
    const cached = readCache(`${ACCOUNT_CACHE_PREFIX}${companyId}`, []).filter(isSelectableAccount);
    if (cached.length) setAccounts(cached);
    loadAccounts('');
  }, [companyId, loadAccounts]);

  useEffect(() => {
    if (!recordId) return;
    const cached = readCache(`${RECORD_CACHE_PREFIX}${recordId}`, null);
    const immediate = initialRecord || cached;
    if (immediate) {
      setRecord(immediate);
      setForm(normalizeForm(immediate));
      setLoading(false);
    }

    let active = true;
    apiClient.get(`/compta/tax-groups/${recordId}/`)
      .then((response) => {
        if (!active) return;
        const data = asObject(response);
        setRecord(data);
        setForm(normalizeForm(data));
        setDirty(false);
        writeCache(`${RECORD_CACHE_PREFIX}${recordId}`, data);
      })
      .catch((error) => {
        if (!active || immediate) return;
        setFeedback({ type: 'error', message: getErrorMessage(error, 'Impossible de charger le groupe de taxes.') });
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [initialRecord, recordId]);

  useEffect(() => {
    if (!countries.length || form.country_label || !form.country) return;
    const country = countries.find((item) => String(item.id) === String(form.country));
    if (country) setForm((current) => ({ ...current, country_label: countryLabel(country) }));
  }, [countries, form.country, form.country_label]);

  useEffect(() => {
    const close = (event) => {
      if (!actionsRef.current?.contains(event.target)) setActionsOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const updateForm = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setDirty(true);
  };

  const validate = useCallback(() => {
    const errors = [];
    if (!form.name.trim()) errors.push('Le nom du groupe est obligatoire.');
    if (!Number.isFinite(Number(form.sequence)) || Number(form.sequence) < 1) {
      errors.push('La séquence doit être un nombre supérieur ou égal à 1.');
    }
    return errors;
  }, [form.name, form.sequence]);

  const save = useCallback(async () => {
    const errors = validate();
    if (errors.length) {
      setFeedback({ type: 'error', message: errors.join('\n') });
      return false;
    }

    setSaving(true);
    setFeedback(null);
    const payload = {
      name: form.name.trim(),
      sequence: Number(form.sequence) || 10,
      country: resolveId(form.country),
      property_tax_payable_account_id: resolveId(form.property_tax_payable_account),
      property_tax_receivable_account_id: resolveId(form.property_tax_receivable_account),
      property_advance_tax_payment_account_id: resolveId(form.property_advance_tax_payment_account),
      preceding_subtotal: form.preceding_subtotal.trim(),
    };

    try {
      const response = recordId
        ? await apiClient.patch(`/compta/tax-groups/${recordId}/`, payload)
        : await apiClient.post('/compta/tax-groups/', payload);
      const saved = asObject(response);
      const savedId = saved.id || recordId;
      setRecord(saved);
      setForm(normalizeForm(saved));
      setDirty(false);
      if (savedId) writeCache(`${RECORD_CACHE_PREFIX}${savedId}`, saved);
      setFeedback({
        type: 'success',
        message: recordId ? 'Groupe de taxes modifié avec succès.' : 'Groupe de taxes créé avec succès.',
      });
      return saved;
    } catch (error) {
      setFeedback({ type: 'error', message: getErrorMessage(error, 'Impossible d’enregistrer le groupe de taxes.') });
      return false;
    } finally {
      setSaving(false);
    }
  }, [form, recordId, validate]);

  const duplicate = () => {
    setActionsOpen(false);
    navigate('/comptabilite/tax-groups/create', {
      state: {
        duplicateTaxGroup: {
          ...form,
          name: `${form.name || 'Groupe de taxes'} (Copie)`,
        },
      },
    });
  };

  const remove = async () => {
    setActionsOpen(false);
    if (!recordId || !window.confirm(`Supprimer le groupe « ${form.name} » ?`)) return;
    try {
      await apiClient.delete(`/compta/tax-groups/${recordId}/`);
      sessionStorage.removeItem(`${RECORD_CACHE_PREFIX}${recordId}`);
      navigate('/comptabilite/tax-groups', { replace: true });
    } catch (error) {
      setFeedback({ type: 'error', message: getErrorMessage(error, 'Impossible de supprimer ce groupe de taxes.') });
    }
  };

  useEffect(() => {
    if (recordId || !location.state?.duplicateTaxGroup) return;
    setForm({ ...EMPTY_FORM, ...location.state.duplicateTaxGroup });
    setDirty(true);
  }, [location.state, recordId]);

  const actionsMenu = (
    <div ref={actionsRef} className="relative">
      <button
        type="button"
        onClick={() => setActionsOpen((open) => !open)}
        className="flex h-8 items-center gap-1 border border-gray-300 px-3 text-xs text-gray-700 transition-all hover:border-purple-500 hover:bg-purple-50 hover:text-purple-700"
      >
        <FiMoreVertical size={13} />
        Actions
      </button>
      {actionsOpen && (
        <div className="absolute right-0 top-9 z-[95] w-48 border border-gray-300 bg-white shadow-xl">
          <button type="button" onClick={duplicate} className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-purple-50 hover:text-purple-700">
            <FiCopy size={12} /> Dupliquer
          </button>
          {recordId && (
            <button type="button" onClick={remove} className="flex w-full items-center gap-2 border-t border-gray-100 px-3 py-2 text-left text-xs text-red-600 hover:bg-red-50">
              <FiTrash2 size={12} /> Supprimer
            </button>
          )}
        </div>
      )}
    </div>
  );

  const auditUser = (value) => {
    if (!value) return 'Utilisateur';
    if (typeof value === 'string') return value;
    return value.username || value.nom || value.name || value.email || 'Utilisateur';
  };

  const formatDateTime = (value) => {
    if (!value) return '';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString('fr-FR');
  };

  const traceabilityContent = (
    <div className="p-4">
      <div className="mb-3 flex items-center justify-between text-xs font-medium text-gray-700">
        <span>Activité liée au groupe</span>
        <span>{recordId ? `${record?.updated_at && record?.created_at !== record?.updated_at ? 2 : 1} événement(s)` : '0 événement(s)'}</span>
      </div>
      {!recordId ? (
        <div className="border border-gray-300 bg-white px-4 py-8 text-center text-xs text-gray-500">
          <FiClock className="mx-auto mb-2 text-gray-400" size={28} />
          La traçabilité apparaîtra après l’enregistrement.
        </div>
      ) : (
        <div className="space-y-2">
          {record?.updated_at && record?.created_at !== record?.updated_at && (
            <div className="border border-gray-300 bg-white p-3 text-xs">
              <div className="font-semibold text-gray-800">Modification</div>
              <div className="mt-1 text-gray-600">Groupe {form.name}</div>
              <div className="mt-2 flex justify-between gap-2 text-gray-500">
                <span>Par {auditUser(record.updated_by)}</span>
                <span>{formatDateTime(record.updated_at)}</span>
              </div>
            </div>
          )}
          <div className="border border-gray-300 bg-white p-3 text-xs">
            <div className="font-semibold text-gray-800">Création</div>
            <div className="mt-1 text-gray-600">Groupe {form.name}</div>
            <div className="mt-2 flex justify-between gap-2 text-gray-500">
              <span>Par {auditUser(record?.created_by)}</span>
              <span>{formatDateTime(record?.created_at)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  if (!activeEntity) {
    return <UnifiedFormPage title="Groupes de taxes" noContext="Sélectionnez une entité pour gérer les groupes de taxes." />;
  }

  if (loading) {
    return (
      <UnifiedFormPage title="Groupes de taxes" fallbackPath="/comptabilite/tax-groups">
        <div className="p-8 text-center text-sm text-gray-500">Chargement du groupe de taxes…</div>
      </UnifiedFormPage>
    );
  }

  return (
    <UnifiedFormPage
      title="Groupes de taxes"
      recordLabel={recordId ? (form.name || 'Groupe de taxes') : (form.name || 'Nouveau groupe')}
      pageLabel={recordId ? 'Détail du groupe de taxes' : 'Création d’un groupe de taxes'}
      mode={recordId ? 'show' : 'create'}
      fallbackPath="/comptabilite/tax-groups"
      primaryAction={{
        label: 'Nouveau',
        icon: <FiPlus size={12} />,
        path: '/comptabilite/tax-groups/create',
      }}
      actionsMenu={actionsMenu}
      onSave={save}
      saving={saving}
      saveLabel="Enregistrer"
      autoReturnAfterSave
      hasUnsavedChanges={dirty}
      rememberForm={!recordId}
      memoryKey="comptabilite:groupes-taxes:form"
      memoryState={{ form, activeTab }}
      onRestoreMemoryState={(state) => {
        if (recordId || location.state?.duplicateTaxGroup) return;
        if (state?.form) setForm({ ...EMPTY_FORM, ...state.form });
        if (state?.activeTab) setActiveTab(state.activeTab);
      }}
      feedback={feedback}
      onDismissFeedback={() => setFeedback(null)}
      messageDuration={MESSAGE_DURATION}
      traceability={{
        open: traceOpen,
        onOpen: () => setTraceOpen(true),
        onClose: () => setTraceOpen(false),
        title: 'Traçabilité',
        content: traceabilityContent,
      }}
    >
      <div className="min-w-0">
        <div className="border-b border-gray-300 px-4 py-3">
          <div className="grid grid-cols-1 gap-x-6 gap-y-1 lg:grid-cols-2">
            <Field label="Nom du groupe" required>
              <input
                value={form.name}
                onChange={(event) => updateForm('name', event.target.value)}
                className={inputClass}
                placeholder="Ex. TVA, IS, Importations"
              />
            </Field>
            <Field label="Pays">
              <SearchSelect
                value={form.country_label}
                selectedId={form.country}
                options={countries}
                getOptionLabel={countryLabel}
                onChange={(value) => updateForm('country_label', value)}
                onSelect={(id, label) => {
                  updateForm('country', id);
                  updateForm('country_label', label);
                }}
                onOpen={loadCountries}
                placeholder="Sélectionner un pays"
              />
            </Field>
          </div>
        </div>

        <div className="flex border-b border-gray-300 bg-white px-4">
          {[
            ['accounting', 'Paramètres comptables'],
            ['advanced', 'Paramètres avancés'],
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              className={`border-b-2 px-5 py-3 text-xs font-medium transition-colors ${
                activeTab === key
                  ? 'border-purple-600 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-purple-600'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="p-4">
          {activeTab === 'accounting' && (
            <div className="border border-gray-300">
              <div className="border-b border-gray-300 bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-800">
                Comptes fiscaux
              </div>
              <div className="grid grid-cols-1 gap-x-6 gap-y-1 p-3 lg:grid-cols-2">
                <Field label="Compte fiscal à payer">
                  <SearchSelect
                    value={form.property_tax_payable_account_label}
                    selectedId={form.property_tax_payable_account}
                    options={accounts}
                    getOptionLabel={(account) => joinLabel(account.code, account.name)}
                    onChange={(value) => updateForm('property_tax_payable_account_label', value)}
                    onSelect={(id, label) => {
                      updateForm('property_tax_payable_account', id);
                      updateForm('property_tax_payable_account_label', label);
                    }}
                    onOpen={() => loadAccounts('')}
                    onQuery={loadAccounts}
                    placeholder="Sélectionner un compte"
                    loading={accountsLoading}
                    emptyLabel={accountsError || 'Aucun compte disponible'}
                  />
                </Field>
                <Field label="Compte fiscal à recevoir">
                  <SearchSelect
                    value={form.property_tax_receivable_account_label}
                    selectedId={form.property_tax_receivable_account}
                    options={accounts}
                    getOptionLabel={(account) => joinLabel(account.code, account.name)}
                    onChange={(value) => updateForm('property_tax_receivable_account_label', value)}
                    onSelect={(id, label) => {
                      updateForm('property_tax_receivable_account', id);
                      updateForm('property_tax_receivable_account_label', label);
                    }}
                    onOpen={() => loadAccounts('')}
                    onQuery={loadAccounts}
                    placeholder="Sélectionner un compte"
                    loading={accountsLoading}
                    emptyLabel={accountsError || 'Aucun compte disponible'}
                  />
                </Field>
                <Field label="Compte d’acomptes sur taxes">
                  <SearchSelect
                    value={form.property_advance_tax_payment_account_label}
                    selectedId={form.property_advance_tax_payment_account}
                    options={accounts}
                    getOptionLabel={(account) => joinLabel(account.code, account.name)}
                    onChange={(value) => updateForm('property_advance_tax_payment_account_label', value)}
                    onSelect={(id, label) => {
                      updateForm('property_advance_tax_payment_account', id);
                      updateForm('property_advance_tax_payment_account_label', label);
                    }}
                    onOpen={() => loadAccounts('')}
                    onQuery={loadAccounts}
                    placeholder="Sélectionner un compte"
                    loading={accountsLoading}
                    emptyLabel={accountsError || 'Aucun compte disponible'}
                  />
                </Field>
              </div>
            </div>
          )}

          {activeTab === 'advanced' && (
            <div className="grid grid-cols-1 gap-x-6 gap-y-1 lg:grid-cols-2">
              <Field label="Séquence" required>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={form.sequence}
                  onChange={(event) => updateForm('sequence', event.target.value)}
                  className={inputClass}
                />
              </Field>
              <Field label="Sous-total précédent">
                <input
                  value={form.preceding_subtotal}
                  onChange={(event) => updateForm('preceding_subtotal', event.target.value)}
                  className={inputClass}
                  placeholder="Ex. Total hors taxes"
                />
              </Field>
            </div>
          )}
        </div>
      </div>
    </UnifiedFormPage>
  );
}
