// src/features/comptabilite/pages/PositionsFiscales/FiscalPositionForm.jsx

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  FiChevronDown,
  FiClock,
  FiCopy,
  FiInfo,
  FiMoreVertical,
  FiPlus,
  FiTrash2,
} from 'react-icons/fi';
import UnifiedFormPage from '../../../../components/UnifiedFormPage';
import { useEntity } from '../../../../context/EntityContext';
import { apiClient } from '../../../../services/apiClient';

const MESSAGE_DURATION = 15000;
const RECORD_CACHE_PREFIX = 'comptabilite:position-fiscale:record:';
const OPTIONS_CACHE_PREFIX = 'comptabilite:position-fiscale:options:';

const EMPTY_FORM = {
  name: '',
  country: null,
  country_label: '',
  sequence: 10,
  auto_apply: false,
  vat_required: false,
  active: true,
  foreign_vat: '',
  foreign_vat_header_mode: '',
  fiscal_country_codes: '',
  zip_from: '',
  zip_to: '',
  note: '',
};

const asArray = (payload) => {
  const value = payload?.data ?? payload;
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.results)) return value.results;
  if (Array.isArray(value?.data)) return value.data;
  return [];
};

const asObject = (payload) => payload?.data ?? payload ?? {};
const makeKey = () => `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
const resolveId = (value) => {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'object') return value.id ?? value.pk ?? null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const readCache = (key, fallback = null) => {
  try {
    const value = window.sessionStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch (_error) {
    return fallback;
  }
};

const writeCache = (key, value) => {
  try { window.sessionStorage.setItem(key, JSON.stringify(value)); } catch (_error) {}
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

const countryLabel = (country) => {
  const name = country?.nom_fr || country?.name || country?.nom || '';
  const code = country?.code_iso || country?.code || '';
  return [name, code && `(${code})`].filter(Boolean).join(' ');
};

const entityLabel = (entity) => (
  entity?.raison_sociale || entity?.nom || entity?.name || entity?.sigle || ''
);

const taxLabel = (tax) => {
  const amount = tax?.amount ?? tax?.rate ?? tax?.taux;
  return [tax?.name || tax?.nom, amount !== undefined && amount !== '' ? `(${amount} %)` : '']
    .filter(Boolean).join(' ');
};

const accountLabel = (account) => [account?.code, account?.name || account?.nom]
  .filter(Boolean).join(' - ');

const selectableAccounts = (payload) => asArray(payload).filter((account) => {
  if (!account?.id) return false;
  if (account.is_root === true || account.is_root_account === true) return false;
  if (account.can_be_used_in_entry === false || account.movement_allowed === false) return false;
  const company = account.company_id ?? account.company;
  return resolveId(company) !== null;
});

const blankTaxLine = () => ({
  key: makeKey(), id: null, tax_src: null, tax_src_label: '', tax_dest: null,
  tax_dest_label: '', sequence: 10, note: '',
});

const blankAccountLine = () => ({
  key: makeKey(), id: null, account_src: null, account_src_label: '', account_dest: null,
  account_dest_label: '', sequence: 10, note: '',
});

const normalizeForm = (record = {}) => ({
  ...EMPTY_FORM,
  name: record.name || '',
  country: resolveId(record.country),
  country_label: record.country_name || '',
  sequence: Number(record.sequence ?? 10),
  auto_apply: Boolean(record.auto_apply),
  vat_required: Boolean(record.vat_required),
  active: record.active !== false,
  foreign_vat: record.foreign_vat || '',
  foreign_vat_header_mode: record.foreign_vat_header_mode || '',
  fiscal_country_codes: record.fiscal_country_codes || '',
  zip_from: record.zip_from || '',
  zip_to: record.zip_to || '',
  note: record.note || '',
});

const normalizeTaxLine = (line) => ({
  key: `tax_${line.id || makeKey()}`,
  id: line.id || null,
  tax_src: resolveId(line.tax_src),
  tax_src_label: line.tax_src_name || '',
  tax_dest: resolveId(line.tax_dest),
  tax_dest_label: line.tax_dest_name || '',
  sequence: Number(line.sequence ?? 10),
  note: line.note || '',
});

const normalizeAccountLine = (line) => ({
  key: `account_${line.id || makeKey()}`,
  id: line.id || null,
  account_src: resolveId(line.account_src_id ?? line.account_src),
  account_src_label: [line.account_src_code, line.account_src_name].filter(Boolean).join(' - '),
  account_dest: resolveId(line.account_dest_id ?? line.account_dest),
  account_dest_label: [line.account_dest_code, line.account_dest_name].filter(Boolean).join(' - '),
  sequence: Number(line.sequence ?? 10),
  note: line.note || '',
});

function Field({ label, required = false, children }) {
  return (
    <div className="flex min-w-0 items-center" style={{ height: 30 }}>
      <label className="w-[155px] shrink-0 text-xs font-medium text-gray-700">
        {label}{required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      <div className="ml-2 min-w-0 flex-1">{children}</div>
    </div>
  );
}

function Toggle({ checked, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      title={label}
      className={`inline-flex h-5 w-9 items-center rounded-full transition-colors ${checked ? 'bg-purple-600' : 'bg-gray-300'}`}
    >
      <span className={`h-4 w-4 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-4' : 'translate-x-0.5'}`} />
    </button>
  );
}

function SearchSelect({ value, selectedId, options, getOptionLabel, onChange, onSelect, onOpen, onQuery, placeholder }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState(value || '');
  const [activeIndex, setActiveIndex] = useState(0);
  const [style, setStyle] = useState({});
  const inputRef = useRef(null);
  const panelRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => setInput(value || ''), [value]);
  const visible = useMemo(() => {
    const query = input.trim().toLocaleLowerCase('fr');
    return (options || []).filter((option) => String(getOptionLabel(option) || '')
      .toLocaleLowerCase('fr').includes(query)).slice(0, 100);
  }, [getOptionLabel, input, options]);

  const position = useCallback(() => {
    const rect = inputRef.current?.getBoundingClientRect();
    if (!rect) return;
    setStyle({ position: 'fixed', left: rect.left, top: rect.bottom, width: Math.max(rect.width, 250), maxHeight: 240, overflowY: 'auto', zIndex: 10000 });
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    position();
    window.addEventListener('resize', position);
    window.addEventListener('scroll', position, true);
    return () => {
      window.removeEventListener('resize', position);
      window.removeEventListener('scroll', position, true);
    };
  }, [open, position]);

  useEffect(() => {
    const close = (event) => {
      if (!inputRef.current?.contains(event.target) && !panelRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const choose = (option) => {
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
        className="h-[26px] w-full border-0 bg-transparent px-2 text-xs outline-none focus:ring-1 focus:ring-inset focus:ring-purple-500"
        onFocus={() => { setOpen(true); position(); onOpen?.(); }}
        onChange={(event) => {
          const text = event.target.value;
          setInput(text);
          setOpen(true);
          setActiveIndex(0);
          onChange(text);
          if (selectedId) onSelect(null, '', null);
          window.clearTimeout(timerRef.current);
          if (onQuery) timerRef.current = window.setTimeout(() => onQuery(text), 220);
        }}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown') { event.preventDefault(); setActiveIndex((index) => Math.min(index + 1, visible.length - 1)); }
          if (event.key === 'ArrowUp') { event.preventDefault(); setActiveIndex((index) => Math.max(index - 1, 0)); }
          if (event.key === 'Enter' && open && visible[activeIndex]) { event.preventDefault(); choose(visible[activeIndex]); }
          if (event.key === 'Escape') setOpen(false);
        }}
      />
      {open && visible.length > 0 && createPortal(
        <div ref={panelRef} style={style} className="border border-gray-300 bg-white shadow-xl">
          {visible.map((option, index) => (
            <button
              key={option.id}
              type="button"
              title={getOptionLabel(option)}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => choose(option)}
              className={`block w-full truncate px-2 py-1.5 text-left text-xs ${index === activeIndex ? 'bg-purple-100 text-purple-700' : 'hover:bg-purple-50'}`}
            >
              {getOptionLabel(option)}
            </button>
          ))}
        </div>, document.body,
      )}
    </>
  );
}

function MappingTable({ kind, rows, options, loadOptions, updateRow, removeRow, addRow }) {
  const taxMode = kind === 'tax';
  const sourceField = taxMode ? 'tax_src' : 'account_src';
  const destinationField = taxMode ? 'tax_dest' : 'account_dest';
  const labeler = taxMode ? taxLabel : accountLabel;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] table-fixed border-collapse border border-gray-300 text-xs">
        <thead>
          <tr className="bg-gray-100 text-gray-700">
            <th className="w-[48%] border border-gray-300 px-2 py-1.5 text-left font-medium">{taxMode ? 'Taxe d’origine' : 'Compte sur produit'}</th>
            <th className="w-[48%] border border-gray-300 px-2 py-1.5 text-left font-medium">{taxMode ? 'Taxe appliquée' : 'Compte de remplacement'}</th>
            <th className="w-[38px] border border-gray-300" aria-label="Actions" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.key} className={index % 2 ? 'bg-gray-50/60' : 'bg-white'}>
              {[sourceField, destinationField].map((field) => (
                <td key={field} className="border border-gray-300 p-0">
                  <SearchSelect
                    value={row[`${field}_label`]}
                    selectedId={row[field]}
                    options={options}
                    getOptionLabel={labeler}
                    onOpen={() => loadOptions('')}
                    onQuery={loadOptions}
                    onChange={(value) => updateRow(index, `${field}_label`, value)}
                    onSelect={(id, label) => {
                      updateRow(index, field, id);
                      updateRow(index, `${field}_label`, label);
                    }}
                    placeholder={taxMode
                      ? 'Sélectionner une taxe'
                      : field === sourceField
                        ? 'Sélectionner un compte sur produit'
                        : 'Sélectionner un compte de remplacement'}
                  />
                </td>
              ))}
              <td className="border border-gray-300 p-0 text-center">
                <button type="button" onClick={() => removeRow(index)} title="Supprimer la ligne" className="h-[30px] w-full text-gray-400 hover:bg-red-50 hover:text-red-600">
                  <FiTrash2 className="mx-auto" size={12} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button type="button" onClick={addRow} className="mt-2 flex h-7 items-center gap-1 bg-purple-600 px-3 text-xs font-medium text-white hover:bg-purple-700">
        <FiPlus size={12} /> Ajouter une correspondance
      </button>
    </div>
  );
}

export default function FiscalPositionForm({ mode = 'create', positionId: explicitId = null }) {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  const { activeEntity } = useEntity();
  const companyId = activeEntity?.id;
  const routeId = explicitId || params.id || new URLSearchParams(location.search).get('id');
  const duplicate = location.state?.duplicatePosition;
  const immediate = location.state?.positionRecord
    || location.state?.fiscalPositionRecord
    || location.state?.record
    || (routeId ? readCache(`${RECORD_CACHE_PREFIX}${routeId}`) : null);

  const [recordId, setRecordId] = useState(routeId || null);
  const [record, setRecord] = useState(immediate || null);
  const [form, setForm] = useState(() => duplicate?.form || normalizeForm(immediate || {}));
  const [taxRows, setTaxRows] = useState(() => duplicate?.taxRows || [blankTaxLine()]);
  const [accountRows, setAccountRows] = useState(() => duplicate?.accountRows || [blankAccountLine()]);
  const [originalTaxIds, setOriginalTaxIds] = useState([]);
  const [originalAccountIds, setOriginalAccountIds] = useState([]);
  const [activeTab, setActiveTab] = useState('accounts');
  const [countries, setCountries] = useState([]);
  const [taxes, setTaxes] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [dirty, setDirty] = useState(Boolean(duplicate));
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [traceOpen, setTraceOpen] = useState(Boolean(routeId));
  const actionsRef = useRef(null);
  const accountRequestRef = useRef(0);

  const inputClass = 'h-[26px] w-full border border-gray-300 bg-white px-2 text-xs outline-none hover:border-purple-400 focus:border-purple-600';
  const selectClass = inputClass;

  const updateForm = useCallback((field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setDirty(true);
  }, []);

  const updateTaxRow = useCallback((index, field, value) => {
    setTaxRows((rows) => rows.map((row, rowIndex) => rowIndex === index ? { ...row, [field]: value } : row));
    setDirty(true);
  }, []);

  const updateAccountRow = useCallback((index, field, value) => {
    setAccountRows((rows) => rows.map((row, rowIndex) => rowIndex === index ? { ...row, [field]: value } : row));
    setDirty(true);
  }, []);

  const loadAccounts = useCallback(async (search = '') => {
    if (!companyId) return;
    const request = ++accountRequestRef.current;
    try {
      const response = await apiClient.get('/compta/accounts/', { params: { company: companyId, exclude_roots: true, page_size: 100, search: search || undefined } });
      if (request === accountRequestRef.current) setAccounts(selectableAccounts(response));
    } catch (_error) {}
  }, [companyId]);

  useEffect(() => {
    if (!companyId) return;
    const cacheKey = `${OPTIONS_CACHE_PREFIX}${companyId}`;
    const cached = readCache(cacheKey, {});
    if (cached.countries) setCountries(cached.countries);
    if (cached.taxes) setTaxes(cached.taxes);
    Promise.allSettled([
      apiClient.get('/pays/', { params: { page_size: 500 } }),
      apiClient.get('/compta/taxes/', { params: { company: companyId, page_size: 500 } }),
    ]).then(([countryResult, taxResult]) => {
      const nextCountries = countryResult.status === 'fulfilled' ? asArray(countryResult.value) : (cached.countries || []);
      const nextTaxes = taxResult.status === 'fulfilled' ? asArray(taxResult.value) : (cached.taxes || []);
      setCountries(nextCountries);
      setTaxes(nextTaxes);
      writeCache(cacheKey, { countries: nextCountries, taxes: nextTaxes });
    });
  }, [companyId]);

  useEffect(() => {
    if (!form.country || form.country_label || !countries.length) return;
    const selected = countries.find((country) => String(country.id) === String(form.country));
    if (selected) setForm((current) => ({ ...current, country_label: countryLabel(selected) }));
  }, [countries, form.country, form.country_label]);

  useEffect(() => {
    if (!routeId || !companyId || duplicate) return;
    let cancelled = false;
    Promise.all([
      apiClient.get(`/compta/fiscal-positions/${routeId}/`),
      apiClient.get('/compta/fiscal-position-tax-mappings/', { params: { position: routeId, company: companyId, page_size: 500, ordering: 'sequence' } }),
      apiClient.get('/compta/fiscal-position-account-mappings/', { params: { position: routeId, company: companyId, page_size: 500, ordering: 'sequence' } }),
    ]).then(([recordResponse, taxResponse, accountResponse]) => {
      if (cancelled) return;
      const nextRecord = asObject(recordResponse);
      const nextTaxRows = asArray(taxResponse).map(normalizeTaxLine);
      const nextAccountRows = asArray(accountResponse).map(normalizeAccountLine);
      setRecord(nextRecord);
      setForm(normalizeForm(nextRecord));
      setTaxRows(nextTaxRows.length ? nextTaxRows : [blankTaxLine()]);
      setAccountRows(nextAccountRows.length ? nextAccountRows : [blankAccountLine()]);
      setOriginalTaxIds(nextTaxRows.map((line) => line.id).filter(Boolean));
      setOriginalAccountIds(nextAccountRows.map((line) => line.id).filter(Boolean));
      setDirty(false);
      writeCache(`${RECORD_CACHE_PREFIX}${routeId}`, nextRecord);
    }).catch((error) => {
      if (!cancelled) setFeedback({ type: 'error', message: getErrorMessage(error, 'Impossible de charger la position fiscale.') });
    });
    return () => { cancelled = true; };
  }, [companyId, duplicate, routeId]);

  useEffect(() => {
    const close = (event) => {
      if (!actionsRef.current?.contains(event.target)) setActionsOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const validateMappings = (rows, source, destination, label) => {
    const useful = rows.filter((line) => line[source] || line[destination]);
    const sources = new Set();
    useful.forEach((line) => {
      if (!line[source] || !line[destination]) throw new Error(`${label} : renseignez l’origine et la destination.`);
      if (String(line[source]) === String(line[destination])) throw new Error(`${label} : l’origine et la destination doivent être différentes.`);
      if (sources.has(String(line[source]))) throw new Error(`${label} : une même origine ne peut apparaître qu’une fois.`);
      sources.add(String(line[source]));
    });
    return useful;
  };

  const syncRows = async ({ rows, originalIds, endpoint, payloadFor }) => {
    const currentIds = rows.map((line) => line.id).filter(Boolean);
    await Promise.all(originalIds.filter((id) => !currentIds.includes(id)).map((id) => apiClient.delete(`${endpoint}${id}/`)));
    await Promise.all(rows.map((line) => line.id
      ? apiClient.patch(`${endpoint}${line.id}/`, payloadFor(line))
      : apiClient.post(endpoint, payloadFor(line))));
  };

  const save = useCallback(async () => {
    if (!companyId) throw new Error('Sélectionnez une société.');
    if (!form.name.trim()) throw new Error('Le nom de la position fiscale est obligatoire.');
    const validTaxRows = validateMappings(taxRows, 'tax_src', 'tax_dest', 'Correspondance de taxes');
    const validAccountRows = validateMappings(accountRows, 'account_src', 'account_dest', 'Correspondance de comptes');
    setSaving(true);
    setFeedback(null);
    try {
      const payload = {
        name: form.name.trim(), country: form.country || null, company: companyId,
        sequence: Number(form.sequence || 10), auto_apply: form.auto_apply,
        vat_required: form.vat_required, active: form.active, foreign_vat: form.foreign_vat || '',
        foreign_vat_header_mode: form.foreign_vat_header_mode || '',
        fiscal_country_codes: form.fiscal_country_codes || '', zip_from: form.zip_from || '',
        zip_to: form.zip_to || '', note: form.note || '',
      };
      const response = recordId
        ? await apiClient.patch(`/compta/fiscal-positions/${recordId}/`, payload)
        : await apiClient.post('/compta/fiscal-positions/', payload);
      const saved = asObject(response);
      const savedId = recordId || saved.id;
      if (!savedId) throw new Error('La position a été enregistrée sans identifiant exploitable.');
      await syncRows({
        rows: validTaxRows, originalIds: originalTaxIds,
        endpoint: '/compta/fiscal-position-tax-mappings/',
        payloadFor: (line) => ({ position: savedId, tax_src: line.tax_src, tax_dest: line.tax_dest, sequence: Number(line.sequence || 10), company: companyId, note: line.note || '' }),
      });
      await syncRows({
        rows: validAccountRows, originalIds: originalAccountIds,
        endpoint: '/compta/fiscal-position-account-mappings/',
        payloadFor: (line) => ({ position_id: savedId, account_src_id: line.account_src, account_dest_id: line.account_dest, sequence: Number(line.sequence || 10), company: companyId, note: line.note || '' }),
      });
      setRecordId(savedId);
      setRecord(saved);
      setDirty(false);
      writeCache(`${RECORD_CACHE_PREFIX}${savedId}`, saved);
      setFeedback({ type: 'success', message: 'Position fiscale enregistrée avec succès.' });
      return saved;
    } catch (error) {
      const message = getErrorMessage(error, 'Impossible d’enregistrer la position fiscale.');
      setFeedback({ type: 'error', message });
      throw new Error(message);
    } finally {
      setSaving(false);
    }
  }, [accountRows, companyId, form, originalAccountIds, originalTaxIds, recordId, taxRows]);

  const handleDuplicate = () => {
    setActionsOpen(false);
    navigate('/comptabilite/positions-fiscales/create', { state: { duplicatePosition: { form: { ...form, name: `${form.name} (copie)` }, taxRows: taxRows.map((line) => ({ ...line, key: makeKey(), id: null })), accountRows: accountRows.map((line) => ({ ...line, key: makeKey(), id: null })) } } });
  };

  const handleDelete = async () => {
    setActionsOpen(false);
    if (!window.confirm('Supprimer cette position fiscale ?')) return;
    try {
      await apiClient.delete(`/compta/fiscal-positions/${recordId}/`);
      navigate('/comptabilite/positions-fiscales', { replace: true });
    } catch (error) {
      setFeedback({ type: 'error', message: getErrorMessage(error, 'Suppression impossible.') });
    }
  };

  const actionsMenu = recordId ? (
    <div ref={actionsRef} className="relative">
      <button type="button" onClick={() => setActionsOpen((value) => !value)} className="flex h-8 items-center gap-1 border border-gray-300 px-3 text-xs text-gray-700 hover:border-purple-500 hover:bg-purple-50 hover:text-purple-700">
        <FiMoreVertical size={13} /> Actions <FiChevronDown size={12} />
      </button>
      {actionsOpen && (
        <div className="absolute right-0 z-[80] mt-1 w-52 border border-gray-300 bg-white shadow-xl">
          <button type="button" onClick={handleDuplicate} className="flex w-full items-center gap-2 border-b border-gray-100 px-3 py-2 text-left text-xs hover:bg-purple-50 hover:text-purple-700"><FiCopy size={12} /> Dupliquer</button>
          <button type="button" onClick={() => { updateForm('active', !form.active); setActionsOpen(false); }} className="flex w-full items-center gap-2 border-b border-gray-100 px-3 py-2 text-left text-xs hover:bg-purple-50 hover:text-purple-700">{form.active ? 'Désactiver' : 'Activer'}</button>
          <button type="button" onClick={() => { setTraceOpen((value) => !value); setActionsOpen(false); }} className="flex w-full items-center gap-2 border-b border-gray-100 px-3 py-2 text-left text-xs hover:bg-purple-50 hover:text-purple-700"><FiInfo size={12} /> {traceOpen ? 'Masquer la traçabilité' : 'Afficher la traçabilité'}</button>
          <button type="button" onClick={handleDelete} className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-red-600 hover:bg-red-50"><FiTrash2 size={12} /> Supprimer</button>
        </div>
      )}
    </div>
  ) : null;

  const traceabilityContent = (
    <div className="space-y-2">
      {recordId && (record?.created_at || record?.updated_at) ? [
        record.created_at && { label: 'Création', date: record.created_at, user: record.created_by_name || record.created_by },
        record.updated_at && { label: 'Dernière modification', date: record.updated_at, user: record.updated_by_name || record.updated_by },
      ].filter(Boolean).map((item) => (
        <div key={item.label} className="border border-gray-200 bg-white p-3 text-xs">
          <div className="font-semibold text-gray-800">{item.label}</div>
          <div className="mt-1 text-gray-500">{item.user ? `Par ${item.user} - ` : ''}{new Date(item.date).toLocaleString('fr-FR')}</div>
        </div>
      )) : (
        <div className="border border-gray-200 bg-white px-3 py-5 text-center">
          <FiClock className="mx-auto mb-2 text-gray-400" size={28} />
          <div className="text-xs text-gray-600">Aucune traçabilité disponible</div>
        </div>
      )}
    </div>
  );

  if (!activeEntity) return <UnifiedFormPage title="Positions fiscales" noContext="Sélectionnez une société pour gérer les positions fiscales." />;

  return (
    <UnifiedFormPage
      title="Positions fiscales"
      recordLabel={form.name.trim() || (recordId ? 'Position fiscale' : 'Nouvelle position')}
      pageLabel={recordId ? 'Détail de la position fiscale' : 'Création d’une position fiscale'}
      mode={recordId ? 'show' : mode}
      fallbackPath="/comptabilite/positions-fiscales"
      primaryAction={{ label: 'Nouveau', icon: <FiPlus size={12} />, path: '/comptabilite/positions-fiscales/create' }}
      actionsMenu={actionsMenu}
      onSave={save}
      saving={saving}
      autoReturnAfterSave
      hasUnsavedChanges={dirty}
      rememberForm={!recordId}
      memoryKey="comptabilite:positions-fiscales:form"
      memoryState={{ form, taxRows, accountRows, activeTab }}
      onRestoreMemoryState={(state) => {
        if (routeId || duplicate) return;
        if (state?.form) setForm({ ...EMPTY_FORM, ...state.form });
        if (state?.taxRows?.length) setTaxRows(state.taxRows);
        if (state?.accountRows?.length) setAccountRows(state.accountRows);
        if (state?.activeTab) setActiveTab(state.activeTab);
      }}
      feedback={feedback}
      onDismissFeedback={() => setFeedback(null)}
      messageDuration={MESSAGE_DURATION}
      traceability={{ open: traceOpen, onOpen: () => setTraceOpen(true), onClose: () => setTraceOpen(false), title: 'Traçabilité', content: traceabilityContent }}
    >
      <div className="min-w-0">
        <div className="border-b border-gray-300 px-4 py-3">
          <div className="grid grid-cols-1 gap-x-6 gap-y-1 lg:grid-cols-2">
            <Field label="Nom" required><input value={form.name} onChange={(event) => updateForm('name', event.target.value)} className={inputClass} placeholder="Ex. Export hors zone" /></Field>
            <Field label="Pays"><div className="border border-gray-300 hover:border-purple-400"><SearchSelect value={form.country_label} selectedId={form.country} options={countries} getOptionLabel={countryLabel} onChange={(value) => updateForm('country_label', value)} onSelect={(id, label) => { updateForm('country', id); updateForm('country_label', label); }} placeholder="Sélectionner un pays" /></div></Field>
            <Field label="Groupe de pays"><input value={form.fiscal_country_codes} onChange={(event) => updateForm('fiscal_country_codes', event.target.value)} className={inputClass} placeholder="TG, BJ, GH" /></Field>
            <Field label="TVA requise" required><div className="flex items-center gap-2"><Toggle checked={form.vat_required} onChange={(value) => updateForm('vat_required', value)} label="TVA requise" /><span className="text-xs text-gray-600">{form.vat_required ? 'Oui' : 'Non'}</span></div></Field>
            <Field label="Société"><div className="flex h-[26px] items-center border border-gray-300 bg-gray-100 px-2 text-xs text-gray-700">{entityLabel(activeEntity)}</div></Field>
            <Field label="Application automatique"><div className="flex items-center gap-2"><Toggle checked={form.auto_apply} onChange={(value) => updateForm('auto_apply', value)} label="Application automatique" /><span className="text-xs text-gray-600">{form.auto_apply ? 'Oui' : 'Non'}</span></div></Field>
          </div>
        </div>

        <div className="border-b border-gray-300 px-4">
          <div className="flex gap-1 overflow-x-auto">
            {[
              ['accounts', 'Remplacement des comptes'],
              ['taxes', 'Remplacement des taxes'],
              ['advanced', 'Paramètres avancés'],
              ['notes', 'Notes'],
            ].map(([id, label]) => (
              <button key={id} type="button" onClick={() => setActiveTab(id)} className={`whitespace-nowrap border-b-2 px-4 py-2 text-xs font-medium transition-colors ${activeTab === id ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-500 hover:text-purple-600'}`}>{label}</button>
            ))}
          </div>
        </div>

        <div className="p-4">
          {activeTab === 'taxes' && <MappingTable kind="tax" rows={taxRows} options={taxes} loadOptions={() => {}} updateRow={updateTaxRow} removeRow={(index) => { setTaxRows((rows) => rows.filter((_, i) => i !== index)); setDirty(true); }} addRow={() => { setTaxRows((rows) => [...rows, blankTaxLine()]); setDirty(true); }} />}
          {activeTab === 'accounts' && <MappingTable kind="account" rows={accountRows} options={accounts} loadOptions={loadAccounts} updateRow={updateAccountRow} removeRow={(index) => { setAccountRows((rows) => rows.filter((_, i) => i !== index)); setDirty(true); }} addRow={() => { setAccountRows((rows) => [...rows, blankAccountLine()]); setDirty(true); loadAccounts(''); }} />}
          {activeTab === 'advanced' && (
            <div className="grid grid-cols-1 gap-x-8 gap-y-1 lg:grid-cols-2">
              <Field label="Statut"><div className="flex items-center gap-2"><Toggle checked={form.active} onChange={(value) => updateForm('active', value)} label="Statut" /><span className="text-xs text-gray-600">{form.active ? 'Actif' : 'Inactif'}</span></div></Field>
              <Field label="TVA étrangère"><input value={form.foreign_vat} onChange={(event) => updateForm('foreign_vat', event.target.value)} className={inputClass} /></Field>
              <Field label="Mode d’en-tête TVA"><select value={form.foreign_vat_header_mode} onChange={(event) => updateForm('foreign_vat_header_mode', event.target.value)} className={selectClass}><option value="">Aucun</option><option value="replace">Remplacer</option><option value="append">Ajouter</option></select></Field>
              <Field label="Code postal début"><input value={form.zip_from} onChange={(event) => updateForm('zip_from', event.target.value)} className={inputClass} /></Field>
              <Field label="Code postal fin"><input value={form.zip_to} onChange={(event) => updateForm('zip_to', event.target.value)} className={inputClass} /></Field>
            </div>
          )}
          {activeTab === 'notes' && <textarea value={form.note} onChange={(event) => updateForm('note', event.target.value)} rows={9} className="w-full border border-gray-300 px-3 py-2 text-xs outline-none hover:border-purple-400 focus:border-purple-600" placeholder="Ajouter une note..." />}
        </div>
      </div>
    </UnifiedFormPage>
  );
}
