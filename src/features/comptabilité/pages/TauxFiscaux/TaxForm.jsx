// src/features/comptabilite/pages/TauxFiscaux/TaxForm.jsx

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  FiCheck,
  FiChevronDown,
  FiClock,
  FiCopy,
  FiInfo,
  FiMoreVertical,
  FiPlus,
  FiTrash2,
} from 'react-icons/fi';
import { useEntity } from '../../../../context/EntityContext';
import { apiClient } from '../../../../services/apiClient';
import UnifiedFormPage from '../../../../components/UnifiedFormPage';

const TAX_CACHE_PREFIX = 'comptabilite:tax:record:';
const OPTIONS_CACHE_PREFIX = 'comptabilite:tax:options:';
const MESSAGE_DURATION = 15000;

const EMPTY_FORM = {
  name: '',
  description: '',
  amount: '',
  real_amount: '',
  amount_type: 'percent',
  type_tax_use: 'sale',
  tax_scope: '',
  fiscal_position: null,
  fiscal_position_label: '',
  country: null,
  country_label: '',
  active: true,
  price_include: false,
  include_base_amount: false,
  tax_exigibility: 'on_invoice',
  account: null,
  account_label: '',
  refund_account: null,
  refund_account_label: '',
  cash_basis_transition_account: null,
  cash_basis_transition_account_label: '',
  tax_group: null,
  tax_group_label: '',
  hide_tax_exigibility: false,
  is_base_affected: true,
  analytic: false,
  sequence: 10,
  note: '',
};

const makeId = () => `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

const makeLine = (type = 'delatax') => ({
  key: makeId(),
  repartition_type: type,
  factor_percent: type === 'base' || type === 'tax' ? 100 : 0,
  account: null,
  account_label: '',
  tax_group: null,
  tax_group_label: '',
  sequence: type === 'base' ? 10 : type === 'tax' ? 20 : 30,
  persistedIds: { invoice: null, refund: null },
});

const defaultLines = () => [makeLine('base'), makeLine('tax')];

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
  return Number.isFinite(parsed) ? parsed : null;
};

const joinLabel = (code, name) => [code, name].filter(Boolean).join(' - ');

const accountLabelFrom = (record, prefix) => (
  joinLabel(record?.[`${prefix}_code`], record?.[`${prefix}_name`])
);

const countryLabel = (country) => {
  if (!country) return '';
  const name = country.nom_fr || country.name || country.nom || '';
  const code = country.code_iso || country.code || '';
  return [name, code && `(${code})`].filter(Boolean).join(' ');
};

const entityLabel = (entity) => (
  entity?.raison_sociale || entity?.nom || entity?.name || entity?.code || ''
);

const readCache = (key, fallback = null) => {
  try {
    const value = window.sessionStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
};

const writeCache = (key, value) => {
  try {
    window.sessionStorage.setItem(key, JSON.stringify(value));
  } catch {}
};

const getErrorMessage = (error, fallback) => {
  const data = error?.response?.data ?? error?.data;
  if (typeof data === 'string') return data;
  if (data?.detail) return data.detail;
  if (data && typeof data === 'object') {
    return Object.entries(data)
      .map(([field, value]) => `${field} : ${Array.isArray(value) ? value.join(', ') : String(value)}`)
      .join('\n');
  }
  return error?.message || fallback;
};

const normalizeForm = (tax = {}) => ({
  ...EMPTY_FORM,
  name: tax.name || '',
  description: tax.description || '',
  amount: tax.amount ?? '',
  real_amount: tax.real_amount ?? '',
  amount_type: tax.amount_type || 'percent',
  type_tax_use: tax.type_tax_use || 'sale',
  tax_scope: tax.tax_scope || '',
  fiscal_position: resolveId(tax.fiscal_position_id ?? tax.fiscal_position),
  fiscal_position_label: tax.fiscal_position_name || '',
  country: resolveId(tax.country),
  country_label: tax.country_name || '',
  active: tax.active !== false,
  price_include: Boolean(tax.price_include),
  include_base_amount: Boolean(tax.include_base_amount),
  tax_exigibility: tax.tax_exigibility || 'on_invoice',
  account: resolveId(tax.account_id ?? tax.account),
  account_label: accountLabelFrom(tax, 'account'),
  refund_account: resolveId(tax.refund_account_id ?? tax.refund_account),
  refund_account_label: accountLabelFrom(tax, 'refund_account'),
  cash_basis_transition_account: resolveId(
    tax.cash_basis_transition_account_id ?? tax.cash_basis_transition_account,
  ),
  cash_basis_transition_account_label: accountLabelFrom(tax, 'cash_basis_transition_account'),
  tax_group: resolveId(tax.tax_group_id ?? tax.tax_group),
  tax_group_label: tax.tax_group_name || '',
  hide_tax_exigibility: Boolean(tax.hide_tax_exigibility),
  is_base_affected: tax.is_base_affected !== false,
  analytic: Boolean(tax.analytic),
  sequence: Number(tax.sequence ?? 10),
  note: tax.note || '',
});

const normalizeLine = (line, pair = {}) => ({
  key: makeId(),
  repartition_type: line.repartition_type || 'tax',
  factor_percent: Math.abs(Number(line.factor_percent ?? 0)),
  account: resolveId(line.account_id ?? line.account),
  account_label: joinLabel(line.account_code, line.account_name),
  tax_group: resolveId(line.tax_group_id ?? line.tax_group),
  tax_group_label: line.tax_group_name || '',
  sequence: Number(line.sequence ?? 10),
  persistedIds: {
    invoice: pair.invoice?.id ?? null,
    refund: pair.refund?.id ?? null,
  },
});

const canonicalizeLines = (records) => {
  const rows = asArray(records);
  if (!rows.length) return defaultLines();

  const invoices = rows
    .filter((line) => line.document_type === 'invoice')
    .sort((a, b) => Number(a.sequence || 0) - Number(b.sequence || 0));
  const refunds = rows
    .filter((line) => line.document_type === 'refund')
    .sort((a, b) => Number(a.sequence || 0) - Number(b.sequence || 0));
  const source = invoices.length ? invoices : refunds;

  const result = source.map((line, index) => {
    const counterpart = (invoices.length ? refunds : invoices).find((candidate) => (
      Number(candidate.sequence || 0) === Number(line.sequence || 0)
      && candidate.repartition_type === line.repartition_type
    )) || (invoices.length ? refunds[index] : invoices[index]);

    return normalizeLine(line, {
      invoice: invoices.length ? line : counterpart,
      refund: invoices.length ? counterpart : line,
    });
  });

  if (!result.some((line) => line.repartition_type === 'base')) result.unshift(makeLine('base'));
  if (!result.some((line) => line.repartition_type === 'tax')) result.push(makeLine('tax'));
  return result;
};

const SearchSelect = ({
  value,
  selectedId,
  options,
  getOptionLabel,
  onChange,
  onSelect,
  onQuery,
  onOpen,
  placeholder,
  disabled = false,
  onTab,
}) => {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState(value || '');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef(null);
  const panelRef = useRef(null);
  const timerRef = useRef(null);
  const [style, setStyle] = useState({});

  useEffect(() => setInput(value || ''), [value]);

  const normalized = input.trim().toLocaleLowerCase('fr');
  const visibleOptions = useMemo(() => (options || [])
    .filter((option) => String(getOptionLabel(option) || '').toLocaleLowerCase('fr').includes(normalized))
    .slice(0, 100), [getOptionLabel, normalized, options]);

  const positionPanel = useCallback(() => {
    const rect = inputRef.current?.getBoundingClientRect();
    if (!rect) return;
    setStyle({
      position: 'fixed',
      left: rect.left,
      top: rect.bottom,
      width: Math.max(rect.width, 230),
      maxHeight: 230,
      overflowY: 'auto',
      zIndex: 10000,
    });
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    positionPanel();
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

  const query = (text) => {
    window.clearTimeout(timerRef.current);
    if (!onQuery) return;
    timerRef.current = window.setTimeout(() => onQuery(text), 220);
  };

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
        disabled={disabled}
        placeholder={placeholder}
        autoComplete="off"
        onFocus={() => {
          if (disabled) return;
          setOpen(true);
          positionPanel();
          onOpen?.();
        }}
        onChange={(event) => {
          const text = event.target.value;
          setInput(text);
          setOpen(true);
          setActiveIndex(0);
          onChange(text);
          query(text);
          if (selectedId) onSelect(null, '', null);
        }}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown') {
            event.preventDefault();
            setOpen(true);
            setActiveIndex((index) => Math.min(index + 1, visibleOptions.length - 1));
          } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            setActiveIndex((index) => Math.max(index - 1, 0));
          } else if (event.key === 'Enter' && open && visibleOptions[activeIndex]) {
            event.preventDefault();
            choose(visibleOptions[activeIndex]);
          } else if (event.key === 'Escape') {
            setOpen(false);
          } else if (event.key === 'Tab' && !event.shiftKey && onTab) {
            if (open && visibleOptions[activeIndex]) choose(visibleOptions[activeIndex]);
            event.preventDefault();
            onTab();
          }
        }}
        className="h-[26px] w-full border-0 bg-transparent px-2 text-xs text-gray-800 outline-none focus:ring-1 focus:ring-inset focus:ring-purple-500 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400"
      />
      {open && !disabled && visibleOptions.length > 0 && typeof document !== 'undefined' && createPortal(
        <div ref={panelRef} style={style} className="border border-gray-300 bg-white shadow-xl">
          {visibleOptions.map((option, index) => (
            <button
              key={option.id}
              type="button"
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => choose(option)}
              className={`block w-full truncate px-2 py-1.5 text-left text-xs ${
                index === activeIndex ? 'bg-purple-100 text-purple-700' : 'hover:bg-purple-50'
              }`}
              title={getOptionLabel(option)}
            >
              {getOptionLabel(option)}
            </button>
          ))}
        </div>,
        document.body,
      )}
    </>
  );
};

const Field = ({ label, required = false, children }) => (
  <div className="flex min-w-0 items-center" style={{ height: 30 }}>
    <label className="w-[150px] shrink-0 text-xs font-medium text-gray-700">
      {label}{required && <span className="ml-0.5 text-red-500">*</span>}
    </label>
    <div className="ml-2 min-w-0 flex-1">{children}</div>
  </div>
);

const Toggle = ({ checked, onChange, label, disabled = false }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    disabled={disabled}
    onClick={() => onChange(!checked)}
    className={`inline-flex h-5 w-9 items-center rounded-full transition-colors ${
      checked ? 'bg-purple-600' : 'bg-gray-300'
    } disabled:cursor-not-allowed disabled:opacity-50`}
    title={label}
  >
    <span className={`h-4 w-4 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-4' : 'translate-x-0.5'}`} />
  </button>
);

const RepartitionTable = ({
  lines,
  accounts,
  taxGroups,
  onChange,
  onRemove,
  onAdd,
  loadAccounts,
}) => {
  const totals = useMemo(() => lines.reduce((result, line) => {
    const value = Math.abs(Number(line.factor_percent || 0));
    if (line.repartition_type === 'base') result.base += value;
    if (line.repartition_type === 'tax') result.tax += value;
    if (line.repartition_type === 'delatax') result.delta += value;
    return result;
  }, { base: 0, tax: 0, delta: 0 }), [lines]);
  const valid = Math.abs(totals.base - 100) <= 0.01
    && Math.abs(totals.tax - 100) <= 0.01
    && (totals.delta === 0 || Math.abs(totals.tax - totals.delta) <= 0.01);

  return (
    <div className="border border-gray-300">
      <div className="flex items-center justify-between border-b border-gray-300 bg-gray-50 px-3 py-2">
        <div>
          <div className="text-sm font-semibold text-gray-800">Répartition commune</div>
          <div className="text-[11px] text-gray-500">Les mêmes comptes sont appliqués aux factures et aux avoirs.</div>
        </div>
        <div className={`text-xs font-medium ${valid ? 'text-green-700' : 'text-amber-700'}`}>
          {valid ? 'Répartition équilibrée' : 'Répartition à compléter'}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] table-fixed border-collapse text-xs">
          <thead>
            <tr className="bg-gray-100 text-gray-700">
              <th className="w-[145px] border-r border-gray-300 px-2 py-1.5 text-left font-medium">Type</th>
              <th className="w-[85px] border-r border-gray-300 px-2 py-1.5 text-right font-medium">%</th>
              <th className="border-r border-gray-300 px-2 py-1.5 text-left font-medium">Compte</th>
              <th className="w-[190px] border-r border-gray-300 px-2 py-1.5 text-left font-medium">Groupe</th>
              <th className="w-[38px] px-1 py-1.5" aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {lines.map((line, index) => {
              const base = line.repartition_type === 'base';
              return (
                <tr key={line.key} className={index % 2 ? 'bg-gray-50/60' : 'bg-white'}>
                  <td className="border-r border-t border-gray-200 p-0">
                    <select
                      value={line.repartition_type}
                      disabled={base}
                      onChange={(event) => onChange(index, 'repartition_type', event.target.value)}
                      className="h-[30px] w-full border-0 bg-transparent px-2 text-xs outline-none focus:ring-1 focus:ring-inset focus:ring-purple-500 disabled:text-gray-500"
                    >
                      <option value="base">Base</option>
                      <option value="tax">Taxe</option>
                      <option value="delatax">De la taxe</option>
                    </select>
                  </td>
                  <td className="border-r border-t border-gray-200 p-0">
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        disabled={base}
                        value={base ? 100 : line.factor_percent}
                        onChange={(event) => onChange(index, 'factor_percent', event.target.value)}
                        className="h-[30px] w-full border-0 bg-transparent px-2 pr-5 text-right text-xs outline-none focus:ring-1 focus:ring-inset focus:ring-purple-500 disabled:bg-gray-50 disabled:text-green-700"
                      />
                      <span className="pointer-events-none absolute right-1.5 top-2 text-[10px] text-gray-400">%</span>
                    </div>
                  </td>
                  <td className="border-r border-t border-gray-200 p-0">
                    <SearchSelect
                      value={line.account_label}
                      selectedId={line.account}
                      disabled={base}
                      options={accounts}
                      getOptionLabel={(account) => joinLabel(account.code, account.name)}
                      onChange={(value) => onChange(index, 'account_label', value)}
                      onSelect={(id, label) => {
                        onChange(index, 'account', id);
                        onChange(index, 'account_label', label);
                      }}
                      onOpen={() => loadAccounts('')}
                      onQuery={loadAccounts}
                      placeholder={base ? 'Non applicable' : 'Sélectionner un compte'}
                    />
                  </td>
                  <td className="border-r border-t border-gray-200 p-0">
                    <SearchSelect
                      value={line.tax_group_label}
                      selectedId={line.tax_group}
                      disabled={base}
                      options={taxGroups}
                      getOptionLabel={(group) => group.name || ''}
                      onChange={(value) => onChange(index, 'tax_group_label', value)}
                      onSelect={(id, label) => {
                        onChange(index, 'tax_group', id);
                        onChange(index, 'tax_group_label', label);
                      }}
                      placeholder={base ? 'Non applicable' : 'Groupe'}
                      onTab={index === lines.length - 1 ? onAdd : undefined}
                    />
                  </td>
                  <td className="border-t border-gray-200 p-0 text-center">
                    {base ? (
                      <FiCheck className="mx-auto text-green-600" size={13} title="Ligne obligatoire" />
                    ) : (
                      <button
                        type="button"
                        onClick={() => onRemove(index)}
                        className="h-[30px] w-full text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
                        title="Supprimer la ligne"
                      >
                        <FiTrash2 className="mx-auto" size={12} />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between border-t border-gray-300 px-3 py-2">
        <button
          type="button"
          onClick={onAdd}
          className="flex h-7 items-center gap-1 bg-purple-600 px-3 text-xs font-medium text-white transition-colors hover:bg-purple-700"
        >
          <FiPlus size={12} /> Ajouter une ligne
        </button>
        <div className="flex gap-4 text-xs text-gray-600">
          <span>Base <b>{totals.base.toFixed(2)} %</b></span>
          <span>Taxe <b>{totals.tax.toFixed(2)} %</b></span>
          <span>De la taxe <b>{totals.delta.toFixed(2)} %</b></span>
        </div>
      </div>
    </div>
  );
};

export default function TaxForm({ mode = 'create', taxId: explicitTaxId = null }) {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  const { activeEntity } = useEntity();
  const queryId = new URLSearchParams(location.search).get('id');
  const routeId = explicitTaxId || params.id || queryId;
  const showMode = mode === 'show' || Boolean(routeId);

  const duplicate = location.state?.duplicateTax;
  const immediateTax = location.state?.taxRecord
    || location.state?.record
    || (routeId ? readCache(`${TAX_CACHE_PREFIX}${routeId}`) : null);

  const [recordId, setRecordId] = useState(routeId || null);
  const [taxRecord, setTaxRecord] = useState(immediateTax || null);
  const [form, setForm] = useState(() => duplicate?.form || normalizeForm(immediateTax || {}));
  const [lines, setLines] = useState(() => duplicate?.lines || defaultLines());
  const [existingLineIds, setExistingLineIds] = useState([]);
  const [activeTab, setActiveTab] = useState('accounting');
  const [dirty, setDirty] = useState(Boolean(duplicate));
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [traceOpen, setTraceOpen] = useState(showMode);

  const [accounts, setAccounts] = useState([]);
  const [countries, setCountries] = useState([]);
  const [taxGroups, setTaxGroups] = useState([]);
  const [fiscalPositions, setFiscalPositions] = useState([]);
  const accountRequestRef = useRef(0);
  const loadedRef = useRef(null);
  const actionsRef = useRef(null);

  const companyId = activeEntity?.id || null;
  const optionsCacheKey = `${OPTIONS_CACHE_PREFIX}${companyId || 'none'}`;

  const mergeAccounts = useCallback((values) => {
    setAccounts((current) => {
      const byId = new Map(current.map((account) => [String(account.id), account]));
      values.forEach((account) => {
        if (account?.id !== undefined && account?.id !== null) byId.set(String(account.id), account);
      });
      return Array.from(byId.values());
    });
  }, []);

  const loadAccounts = useCallback(async (search = '') => {
    if (!companyId) return [];
    const requestId = accountRequestRef.current + 1;
    accountRequestRef.current = requestId;
    try {
      const response = await apiClient.get('/compta/accounts/', {
        params: {
          company: companyId,
          exclude_roots: true,
          page_size: 100,
          ...(search.trim() ? { search: search.trim() } : {}),
        },
      });
      const rows = asArray(response);
      if (requestId === accountRequestRef.current) mergeAccounts(rows);
      return rows;
    } catch {
      return [];
    }
  }, [companyId, mergeAccounts]);

  const loadOptions = useCallback(async () => {
    if (!companyId) return;
    const cached = readCache(optionsCacheKey, {});
    if (cached.countries) setCountries(cached.countries);
    if (cached.taxGroups) setTaxGroups(cached.taxGroups);
    if (cached.fiscalPositions) setFiscalPositions(cached.fiscalPositions);
    if (cached.accounts) mergeAccounts(cached.accounts);

    const [countryResult, groupResult, fiscalResult, accountResult] = await Promise.allSettled([
      apiClient.get('/pays/', { params: { page_size: 500 } }),
      apiClient.get('/compta/tax-groups/', { params: { company: companyId, page_size: 500 } }),
      apiClient.get('/compta/fiscal-positions/', { params: { company: companyId, page_size: 500 } }),
      apiClient.get('/compta/accounts/', {
        params: { company: companyId, exclude_roots: true, page_size: 100 },
      }),
    ]);

    const next = {
      countries: countryResult.status === 'fulfilled' ? asArray(countryResult.value) : cached.countries || [],
      taxGroups: groupResult.status === 'fulfilled' ? asArray(groupResult.value) : cached.taxGroups || [],
      fiscalPositions: fiscalResult.status === 'fulfilled' ? asArray(fiscalResult.value) : cached.fiscalPositions || [],
      accounts: accountResult.status === 'fulfilled' ? asArray(accountResult.value) : cached.accounts || [],
    };
    setCountries(next.countries);
    setTaxGroups(next.taxGroups);
    setFiscalPositions(next.fiscalPositions);
    mergeAccounts(next.accounts);
    writeCache(optionsCacheKey, next);
  }, [companyId, mergeAccounts, optionsCacheKey]);

  const injectRecordAccounts = useCallback((tax, repartitions) => {
    const stubs = [];
    const add = (id, code, name) => {
      if (!id) return;
      stubs.push({ id, code: code || '', name: name || '' });
    };
    add(resolveId(tax.account_id ?? tax.account), tax.account_code, tax.account_name);
    add(resolveId(tax.refund_account_id ?? tax.refund_account), tax.refund_account_code, tax.refund_account_name);
    add(
      resolveId(tax.cash_basis_transition_account_id ?? tax.cash_basis_transition_account),
      tax.cash_basis_transition_account_code,
      tax.cash_basis_transition_account_name,
    );
    asArray(repartitions).forEach((line) => add(line.account_id, line.account_code, line.account_name));
    mergeAccounts(stubs);
  }, [mergeAccounts]);

  const applyRecord = useCallback((tax, repartitions) => {
    const canonical = canonicalizeLines(repartitions);
    setTaxRecord(tax);
    setRecordId(tax.id || routeId || null);
    setForm(normalizeForm(tax));
    setLines(canonical);
    setExistingLineIds(asArray(repartitions).map((line) => line.id).filter(Boolean));
    injectRecordAccounts(tax, repartitions);
    setDirty(false);
    if (tax.id) writeCache(`${TAX_CACHE_PREFIX}${tax.id}`, tax);
  }, [injectRecordAccounts, routeId]);

  const loadTax = useCallback(async () => {
    if (!routeId || loadedRef.current === String(routeId)) return;
    loadedRef.current = String(routeId);
    try {
      const [taxResponse, lineResponse] = await Promise.all([
        apiClient.get(`/compta/taxes/${routeId}/`),
        apiClient.get('/compta/tax-repartition-lines/', {
          params: { tax: routeId, page_size: 200 },
        }),
      ]);
      applyRecord(asObject(taxResponse), lineResponse);
    } catch (error) {
      setFeedback({ type: 'error', message: getErrorMessage(error, 'Impossible de charger la taxe.') });
    }
  }, [applyRecord, routeId]);

  useEffect(() => {
    if (!companyId) return;
    void loadOptions();
  }, [companyId, loadOptions]);

  useEffect(() => {
    if (routeId) void loadTax();
  }, [loadTax, routeId]);

  useEffect(() => {
    const close = (event) => {
      if (!actionsRef.current?.contains(event.target)) setActionsOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  useEffect(() => {
    if (!countries.length && !taxGroups.length && !fiscalPositions.length) return;
    setForm((current) => ({
      ...current,
      country_label: current.country_label || countryLabel(
        countries.find((country) => String(country.id) === String(current.country)),
      ),
      tax_group_label: current.tax_group_label || taxGroups.find(
        (group) => String(group.id) === String(current.tax_group),
      )?.name || '',
      fiscal_position_label: current.fiscal_position_label || fiscalPositions.find(
        (position) => String(position.id) === String(current.fiscal_position),
      )?.name || '',
    }));
  }, [countries, fiscalPositions, taxGroups]);

  const updateForm = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setDirty(true);
  };

  const updateLine = (index, field, value) => {
    setLines((current) => current.map((line, lineIndex) => {
      if (lineIndex !== index) return line;
      if (field === 'factor_percent') return { ...line, [field]: Math.abs(Number(value || 0)) };
      if (field === 'repartition_type') {
        return { ...line, [field]: value, factor_percent: value === 'tax' ? 100 : line.factor_percent };
      }
      return { ...line, [field]: value };
    }));
    setDirty(true);
  };

  const addLine = () => {
    setLines((current) => [
      ...current,
      { ...makeLine('delatax'), sequence: (current.length + 1) * 10 },
    ]);
    setDirty(true);
  };

  const removeLine = (index) => {
    const line = lines[index];
    if (!line || line.repartition_type === 'base') return;
    if (line.repartition_type === 'tax' && lines.filter((item) => item.repartition_type === 'tax').length <= 1) {
      setFeedback({ type: 'error', message: 'Au moins une ligne de type Taxe est obligatoire.' });
      return;
    }
    setLines((current) => current.filter((_, lineIndex) => lineIndex !== index));
    setDirty(true);
  };

  const validate = () => {
    const errors = [];
    const amount = Number(form.amount);
    const totals = lines.reduce((result, line) => {
      result[line.repartition_type] = (result[line.repartition_type] || 0)
        + Math.abs(Number(line.factor_percent || 0));
      return result;
    }, {});

    if (!form.name.trim()) errors.push('Le nom de la taxe est obligatoire.');
    if (!Number.isFinite(amount) || amount <= 0) errors.push('La valeur de la taxe doit être supérieure à zéro.');
    if (Math.abs((totals.base || 0) - 100) > 0.01) errors.push('La base doit totaliser exactement 100 %.');
    if (Math.abs((totals.tax || 0) - 100) > 0.01) errors.push('Les lignes Taxe doivent totaliser exactement 100 %.');
    if ((totals.delatax || 0) > 0 && Math.abs((totals.tax || 0) - totals.delatax) > 0.01) {
      errors.push('Le total De la taxe doit être égal au total Taxe.');
    }
    const missingAccounts = lines.filter((line) => line.repartition_type !== 'base' && !resolveId(line.account));
    if (missingAccounts.length) errors.push(`${missingAccounts.length} ligne(s) de répartition sans compte comptable.`);
    return errors;
  };

  const taxPayload = () => ({
    name: form.name.trim(),
    description: form.description || '',
    amount: Number(form.amount || 0),
    real_amount: form.real_amount === '' ? null : Number(form.real_amount),
    amount_type: form.amount_type,
    type_tax_use: form.type_tax_use,
    tax_scope: form.tax_scope || '',
    sequence: Number(form.sequence || 10),
    company: companyId,
    country: resolveId(form.country),
    tax_group_id: resolveId(form.tax_group),
    account_id: resolveId(form.account),
    refund_account_id: resolveId(form.refund_account),
    cash_basis_transition_account_id: resolveId(form.cash_basis_transition_account),
    fiscal_position_id: resolveId(form.fiscal_position),
    analytic: Boolean(form.analytic),
    include_base_amount: Boolean(form.include_base_amount),
    is_base_affected: Boolean(form.is_base_affected),
    hide_tax_exigibility: Boolean(form.hide_tax_exigibility),
    price_include: Boolean(form.price_include),
    tax_exigibility: form.tax_exigibility,
    note: form.note || '',
    active: Boolean(form.active),
  });

  const linePayload = (line, documentType, taxId) => ({
    tax_id: taxId,
    repartition_type: line.repartition_type,
    document_type: documentType,
    factor_percent: line.repartition_type === 'base' ? 100 : Math.abs(Number(line.factor_percent || 0)),
    account_id_write: line.repartition_type === 'base' ? null : resolveId(line.account),
    tax_group_id_write: line.repartition_type === 'base' ? null : resolveId(line.tax_group),
    company_id: companyId,
    sequence: Number(line.sequence || 10),
    use_in_invoice: true,
    use_in_refund: true,
    use_in_tax_closing: true,
  });

  const save = async () => {
    if (!companyId) {
      setFeedback({ type: 'error', message: 'Sélectionnez une entité avant d’enregistrer.' });
      return false;
    }
    const errors = validate();
    if (errors.length) {
      setFeedback({ type: 'error', message: errors.join('\n') });
      return false;
    }

    setSaving(true);
    setFeedback(null);
    try {
      const response = recordId
        ? await apiClient.put(`/compta/taxes/${recordId}/`, taxPayload())
        : await apiClient.post('/compta/taxes/', taxPayload());
      const savedTax = asObject(response);
      const savedId = savedTax.id || recordId;
      if (!savedId) throw new Error('La taxe a été enregistrée sans identifiant.');

      const retainedIds = new Set();
      const updatedLines = await Promise.all(lines.map(async (line) => {
        const persistedIds = { ...(line.persistedIds || {}) };
        for (const documentType of ['invoice', 'refund']) {
          const existingId = persistedIds[documentType];
          const payload = linePayload(line, documentType, savedId);
          const lineResponse = existingId
            ? await apiClient.put(`/compta/tax-repartition-lines/${existingId}/`, payload)
            : await apiClient.post('/compta/tax-repartition-lines/', payload);
          const savedLine = asObject(lineResponse);
          persistedIds[documentType] = savedLine.id || existingId;
          if (persistedIds[documentType]) retainedIds.add(Number(persistedIds[documentType]));
        }
        return { ...line, persistedIds };
      }));

      const obsoleteIds = existingLineIds.filter((id) => !retainedIds.has(Number(id)));
      await Promise.all(obsoleteIds.map((id) => apiClient.delete(`/compta/tax-repartition-lines/${id}/`)));

      setRecordId(savedId);
      setTaxRecord(savedTax);
      setLines(updatedLines);
      setExistingLineIds(Array.from(retainedIds));
      setDirty(false);
      setFeedback({ type: 'success', message: 'Taux fiscal enregistré avec succès.' });
      writeCache(`${TAX_CACHE_PREFIX}${savedId}`, savedTax);
      return savedTax;
    } catch (error) {
      setFeedback({ type: 'error', message: getErrorMessage(error, 'Échec de l’enregistrement du taux fiscal.') });
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setActionsOpen(false);
    if (!recordId || !window.confirm('Supprimer définitivement ce taux fiscal ?')) return;
    try {
      await apiClient.delete(`/compta/taxes/${recordId}/`);
      navigate('/comptabilite/taux-fiscaux', { replace: true });
    } catch (error) {
      setFeedback({ type: 'error', message: getErrorMessage(error, 'Impossible de supprimer le taux fiscal.') });
    }
  };

  const handleDuplicate = () => {
    setActionsOpen(false);
    navigate('/comptabilite/taux-fiscaux/create', {
      state: {
        ...(location.state || {}),
        duplicateTax: {
          form: { ...form, name: `${form.name} (Copie)` },
          lines: lines.map((line) => ({
            ...line,
            key: makeId(),
            persistedIds: { invoice: null, refund: null },
          })),
        },
      },
    });
  };

  const actionsMenu = recordId ? (
    <div ref={actionsRef} className="relative">
      <button
        type="button"
        onClick={() => setActionsOpen((open) => !open)}
        className="flex h-8 items-center gap-1 border border-gray-300 px-3 text-xs text-gray-700 transition-all hover:border-purple-500 hover:bg-purple-50 hover:text-purple-700"
      >
        <FiMoreVertical size={13} /> Actions <FiChevronDown size={12} />
      </button>
      {actionsOpen && (
        <div className="absolute right-0 z-[80] mt-1 w-52 border border-gray-300 bg-white shadow-xl">
          <button type="button" onClick={handleDuplicate} className="flex w-full items-center gap-2 border-b border-gray-100 px-3 py-2 text-left text-xs hover:bg-purple-50 hover:text-purple-700">
            <FiCopy size={12} /> Dupliquer
          </button>
          <button type="button" onClick={handleDelete} className="flex w-full items-center gap-2 border-b border-gray-100 px-3 py-2 text-left text-xs text-red-600 hover:bg-red-50">
            <FiTrash2 size={12} /> Supprimer
          </button>
          <button
            type="button"
            onClick={() => { setTraceOpen((open) => !open); setActionsOpen(false); }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-purple-50 hover:text-purple-700"
          >
            <FiInfo size={12} /> {traceOpen ? 'Masquer la traçabilité' : 'Afficher la traçabilité'}
          </button>
        </div>
      )}
    </div>
  ) : null;

  const resolveUser = (value) => {
    if (!value) return 'Utilisateur';
    if (typeof value === 'object') return value.full_name || value.username || value.email || 'Utilisateur';
    return `Utilisateur ${value}`;
  };

  const formatDateTime = (value) => {
    if (!value) return '';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString('fr-FR');
  };

  const traceItems = useMemo(() => [
    taxRecord?.created_at && {
      id: 'created',
      title: 'Création',
      user: resolveUser(taxRecord.created_by),
      date: formatDateTime(taxRecord.created_at),
    },
    taxRecord?.updated_at && taxRecord.updated_at !== taxRecord.created_at && {
      id: 'updated',
      title: 'Dernière modification',
      user: resolveUser(taxRecord.updated_by),
      date: formatDateTime(taxRecord.updated_at),
    },
  ].filter(Boolean), [taxRecord]);

  const traceabilityContent = (
    <div className="px-4 py-3">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-medium text-gray-700">Activité liée à la taxe</span>
        <span className="text-[11px] text-gray-500">{traceItems.length} événement(s)</span>
      </div>
      {traceItems.length ? (
        <div className="space-y-2">
          {traceItems.map((item) => (
            <div key={item.id} className="border border-gray-200 bg-white px-3 py-2">
              <div className="text-xs font-medium text-gray-900">{item.title}</div>
              <div className="mt-1 text-[11px] text-gray-500">{form.name || 'Taux fiscal'}</div>
              <div className="mt-2 flex justify-between gap-2 text-[11px] text-gray-500">
                <span className="truncate">Par {item.user}</span>
                <span className="whitespace-nowrap">{item.date}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="border border-gray-200 bg-white px-3 py-5 text-center">
          <FiClock className="mx-auto mb-2 text-gray-400" size={28} />
          <div className="text-xs text-gray-600">Aucune traçabilité disponible</div>
          <div className="mt-1 text-[11px] text-gray-500">Les actions sur cette taxe apparaîtront ici.</div>
        </div>
      )}
    </div>
  );

  const selectBoxClass = 'h-[26px] w-full border border-gray-300 bg-white px-2 text-xs outline-none transition-colors hover:border-purple-400 focus:border-purple-600';
  const inputClass = 'h-[26px] w-full border border-gray-300 bg-white px-2 text-xs outline-none transition-colors hover:border-purple-400 focus:border-purple-600';

  if (!activeEntity) {
    return <UnifiedFormPage title="Taux fiscaux" noContext="Sélectionnez une entité pour gérer les taux fiscaux." />;
  }

  return (
    <UnifiedFormPage
      title="Taux fiscaux"
      recordLabel={recordId ? (form.name || 'Taux fiscal') : 'Nouvelle taxe'}
      pageLabel={recordId ? 'Détail du taux fiscal' : 'Création d’un taux fiscal'}
      mode={recordId ? 'show' : 'create'}
      fallbackPath="/comptabilite/taux-fiscaux"
      primaryAction={{
        label: 'Nouveau',
        icon: <FiPlus size={12} />,
        path: '/comptabilite/taux-fiscaux/create',
      }}
      actionsMenu={actionsMenu}
      onSave={save}
      saving={saving}
      saveLabel="Enregistrer"
      autoReturnAfterSave
      hasUnsavedChanges={dirty}
      rememberForm={!recordId}
      memoryKey="comptabilite:taux-fiscaux:form"
      memoryState={{ form, lines, activeTab }}
      onRestoreMemoryState={(state) => {
        if (duplicate || routeId) return;
        if (state?.form) setForm({ ...EMPTY_FORM, ...state.form });
        if (Array.isArray(state?.lines) && state.lines.length) setLines(state.lines);
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
            <Field label="Nom de la taxe" required>
              <input value={form.name} onChange={(event) => updateForm('name', event.target.value)} className={inputClass} placeholder="Ex. TVA 18 %" />
            </Field>
            <Field label="Taxe appliquée sur" required>
              <select value={form.type_tax_use} onChange={(event) => updateForm('type_tax_use', event.target.value)} className={selectBoxClass}>
                <option value="sale">Ventes</option>
                <option value="purchase">Achats</option>
                <option value="none">Aucune / Divers</option>
                <option value="adjustment">Ajustement</option>
              </select>
            </Field>
            <Field label="Valeur de la taxe" required>
              <div className="relative">
                <input type="number" min="0" step="0.0001" value={form.amount} onChange={(event) => updateForm('amount', event.target.value)} className={`${inputClass} pr-7`} />
                {form.amount_type !== 'fixed' && <span className="absolute right-2 top-1.5 text-xs text-gray-400">%</span>}
              </div>
            </Field>
            <Field label="Portée de la taxe">
              <select value={form.tax_scope} onChange={(event) => updateForm('tax_scope', event.target.value)} className={selectBoxClass}>
                <option value="">Tous</option>
                <option value="service">Services</option>
                <option value="consu">Biens consommables</option>
              </select>
            </Field>
            <Field label="Type de valeur" required>
              <select value={form.amount_type} onChange={(event) => updateForm('amount_type', event.target.value)} className={selectBoxClass}>
                <option value="percent">Pourcentage du prix</option>
                <option value="fixed">Montant fixe</option>
                <option value="division">Pourcentage du prix TTC</option>
              </select>
            </Field>
            <Field label="Position fiscale">
              <div className="border border-gray-300 hover:border-purple-400">
                <SearchSelect
                  value={form.fiscal_position_label}
                  selectedId={form.fiscal_position}
                  options={fiscalPositions}
                  getOptionLabel={(position) => position.name || ''}
                  onChange={(value) => updateForm('fiscal_position_label', value)}
                  onSelect={(id, label) => {
                    updateForm('fiscal_position', id);
                    updateForm('fiscal_position_label', label);
                  }}
                  placeholder="Sélectionner une position"
                />
              </div>
            </Field>
          </div>
        </div>

        <div className="border-b border-gray-300 px-4">
          <div className="flex gap-1">
            {[
              ['accounting', 'Paramètres comptables'],
              ['advanced', 'Paramètres avancés'],
              ['notes', 'Notes'],
            ].map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setActiveTab(id)}
                className={`border-b-2 px-4 py-2 text-xs font-medium transition-colors ${
                  activeTab === id ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-500 hover:text-purple-600'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-4">
          {activeTab === 'accounting' && (
            <div className="space-y-4">
              <div className="border border-gray-300 bg-gray-50 p-3">
                <div className="mb-2 flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-gray-800">Comptes de taxe par défaut</h3>
                  <span className="text-[11px] text-gray-500">Optionnels, les lignes de répartition restent prioritaires.</span>
                </div>
                <div className="grid grid-cols-1 gap-x-6 gap-y-1 lg:grid-cols-2">
                  <Field label="Compte de taxe">
                    <div className="border border-gray-300 bg-white hover:border-purple-400">
                      <SearchSelect
                        value={form.account_label}
                        selectedId={form.account}
                        options={accounts}
                        getOptionLabel={(account) => joinLabel(account.code, account.name)}
                        onChange={(value) => updateForm('account_label', value)}
                        onSelect={(id, label) => { updateForm('account', id); updateForm('account_label', label); }}
                        onOpen={() => loadAccounts('')}
                        onQuery={loadAccounts}
                        placeholder="Compte collecté"
                      />
                    </div>
                  </Field>
                  <Field label="Compte de remboursement">
                    <div className="border border-gray-300 bg-white hover:border-purple-400">
                      <SearchSelect
                        value={form.refund_account_label}
                        selectedId={form.refund_account}
                        options={accounts}
                        getOptionLabel={(account) => joinLabel(account.code, account.name)}
                        onChange={(value) => updateForm('refund_account_label', value)}
                        onSelect={(id, label) => { updateForm('refund_account', id); updateForm('refund_account_label', label); }}
                        onOpen={() => loadAccounts('')}
                        onQuery={loadAccounts}
                        placeholder="Compte déductible"
                      />
                    </div>
                  </Field>
                </div>
              </div>

              <RepartitionTable
                lines={lines}
                accounts={accounts}
                taxGroups={taxGroups}
                onChange={updateLine}
                onRemove={removeLine}
                onAdd={addLine}
                loadAccounts={loadAccounts}
              />
            </div>
          )}

          {activeTab === 'advanced' && (
            <div className="grid grid-cols-1 gap-x-8 gap-y-1 lg:grid-cols-2">
              <Field label="Statut">
                <div className="flex h-[26px] items-center gap-2">
                  <Toggle
                    checked={form.active}
                    onChange={(value) => updateForm('active', value)}
                    label={form.active ? 'ON' : 'OFF'}
                  />
                  <span className={`text-xs font-semibold ${form.active ? 'text-purple-700' : 'text-gray-500'}`}>
                    {form.active ? 'ON' : 'OFF'}
                  </span>
                </div>
              </Field>
              <Field label="Société">
                <div className="flex h-[26px] items-center border border-gray-300 bg-gray-100 px-2 text-xs text-gray-700">{entityLabel(activeEntity)}</div>
              </Field>
              <Field label="Groupe de taxes">
                <div className="border border-gray-300 hover:border-purple-400">
                  <SearchSelect
                    value={form.tax_group_label}
                    selectedId={form.tax_group}
                    options={taxGroups}
                    getOptionLabel={(group) => group.name || ''}
                    onChange={(value) => updateForm('tax_group_label', value)}
                    onSelect={(id, label) => { updateForm('tax_group', id); updateForm('tax_group_label', label); }}
                    placeholder="Sélectionner un groupe"
                  />
                </div>
              </Field>
              <Field label="Pays">
                <div className="border border-gray-300 hover:border-purple-400">
                  <SearchSelect
                    value={form.country_label}
                    selectedId={form.country}
                    options={countries}
                    getOptionLabel={countryLabel}
                    onChange={(value) => updateForm('country_label', value)}
                    onSelect={(id, label) => { updateForm('country', id); updateForm('country_label', label); }}
                    placeholder="Sélectionner un pays"
                  />
                </div>
              </Field>
              <Field label="Séquence">
                <input type="number" min="1" value={form.sequence} onChange={(event) => updateForm('sequence', event.target.value)} className={inputClass} />
              </Field>
              <Field label="Montant réel">
                <input type="number" step="0.0001" value={form.real_amount} onChange={(event) => updateForm('real_amount', event.target.value)} className={inputClass} placeholder="Optionnel" />
              </Field>
              <Field label="Exigibilité">
                <select value={form.tax_exigibility} onChange={(event) => updateForm('tax_exigibility', event.target.value)} className={selectBoxClass}>
                  <option value="on_invoice">Sur facture</option>
                  <option value="on_payment">Sur paiement</option>
                </select>
              </Field>
              {form.tax_exigibility === 'on_payment' && (
                <Field label="Compte de transition">
                  <div className="border border-gray-300 hover:border-purple-400">
                    <SearchSelect
                      value={form.cash_basis_transition_account_label}
                      selectedId={form.cash_basis_transition_account}
                      options={accounts}
                      getOptionLabel={(account) => joinLabel(account.code, account.name)}
                      onChange={(value) => updateForm('cash_basis_transition_account_label', value)}
                      onSelect={(id, label) => { updateForm('cash_basis_transition_account', id); updateForm('cash_basis_transition_account_label', label); }}
                      onOpen={() => loadAccounts('')}
                      onQuery={loadAccounts}
                      placeholder="Compte de transition"
                    />
                  </div>
                </Field>
              )}
              <Field label="Inclus dans le prix"><Toggle checked={form.price_include} onChange={(value) => updateForm('price_include', value)} label="Inclus dans le prix" /></Field>
              <Field label="Impacter la base"><Toggle checked={form.include_base_amount} onChange={(value) => updateForm('include_base_amount', value)} label="Impacter la base" /></Field>
              <Field label="Base affectée"><Toggle checked={form.is_base_affected} onChange={(value) => updateForm('is_base_affected', value)} label="Base affectée" /></Field>
              <Field label="Analytique"><Toggle checked={form.analytic} onChange={(value) => updateForm('analytic', value)} label="Analytique" /></Field>
              <Field label="Masquer l’exigibilité"><Toggle checked={form.hide_tax_exigibility} onChange={(value) => updateForm('hide_tax_exigibility', value)} label="Masquer l’exigibilité" /></Field>
            </div>
          )}

          {activeTab === 'notes' && (
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">Étiquette sur les factures</label>
                <input value={form.description} onChange={(event) => updateForm('description', event.target.value)} className={inputClass} placeholder="Libellé court affiché sur les factures" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">Note interne</label>
                <textarea value={form.note} onChange={(event) => updateForm('note', event.target.value)} rows={7} className="w-full border border-gray-300 px-3 py-2 text-xs outline-none hover:border-purple-400 focus:border-purple-600" placeholder="Ajouter une note..." />
              </div>
            </div>
          )}
        </div>
      </div>
    </UnifiedFormPage>
  );
}
