// src/features/comptabilite/pages/WithholdingTaxes/WithholdingTaxForm.jsx

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
const PERCENTAGE_SCOPES = ['percent', 'on_total', 'on_tax'];
const RECORD_CACHE_PREFIX = 'comptabilite:retenues:record:';
const OPTIONS_CACHE_PREFIX = 'comptabilite:retenues:options:';
const ACCOUNT_CACHE_PREFIX = 'comptabilite:retenues:accounts:';

const emptyLine = (type = 'base') => ({
  key: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
  repartition_type: type,
  factor_percent: type === 'base' || type === 'tax' ? 100 : 0,
  tax_group_id: null,
  tax_group_label: '',
});

const defaultLines = () => [emptyLine('base'), emptyLine('tax')];

const EMPTY_FORM = {
  name: '',
  withholding_scope: 'percent',
  amount: '',
  withholding_type: 'partial',
  withholding_eligibility: 'on_invoice',
  tax_id: null,
  tax_label: '',
  account_id: null,
  account_label: '',
  journal_id: null,
  journal_label: '',
  tax_group: null,
  tax_group_label: '',
  sequence: 10,
  active: true,
  is_default: false,
  description: '',
};

const inputClass = 'h-[26px] w-full border border-gray-300 bg-white px-2 text-xs text-gray-800 outline-none transition-colors hover:border-purple-400 focus:border-purple-600 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500';

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

const readCache = (key, fallback) => {
  try {
    const value = sessionStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
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

const optionLabel = (record, idField, labelField, options, formatter) => {
  const direct = record?.[labelField];
  if (direct) return direct;
  const id = resolveId(record?.[idField]);
  const found = options.find((item) => String(item.id) === String(id));
  return found ? formatter(found) : '';
};

const normalizeLine = (line, accounts, taxGroups) => {
  const accountId = resolveId(line.account_id ?? line.account);
  const groupId = resolveId(line.tax_group_id ?? line.tax_group);
  const account = accounts.find((item) => String(item.id) === String(accountId));
  const group = taxGroups.find((item) => String(item.id) === String(groupId));
  return {
    key: String(line.id || `${Date.now()}-${Math.random().toString(36).slice(2)}`),
    repartition_type: line.repartition_type || 'tax',
    factor_percent: Math.abs(Number(line.factor_percent ?? 0)),
    account_id: accountId,
    account_label: line.account_label || line.account_name || (account ? joinLabel(account.code, account.name) : ''),
    tax_group_id: groupId,
    tax_group_label: line.tax_group_name || (group?.name || ''),
  };
};

const normalizeRecord = (record, options = {}) => ({
  ...EMPTY_FORM,
  name: record.name || '',
  withholding_scope: record.withholding_scope || 'percent',
  amount: record.amount ?? '',
  withholding_type: record.withholding_type || 'partial',
  withholding_eligibility: record.withholding_eligibility || 'on_invoice',
  tax_id: resolveId(record.tax_id),
  tax_label: record.tax_name || optionLabel(record, 'tax_id', 'tax_name', options.taxes || [], (item) => `${item.name} (${item.amount} %)`),
  journal_id: resolveId(record.journal_id),
  journal_label: optionLabel(record, 'journal_id', 'journal_label', options.journals || [], (item) => joinLabel(item.code, item.name)),
  tax_group: resolveId(record.tax_group_id ?? record.tax_group),
  tax_group_label: record.tax_group_name || optionLabel(record, 'tax_group', 'tax_group_name', options.taxGroups || [], (item) => item.name),
  sequence: Number(record.sequence ?? 10),
  active: record.active !== false,
  is_default: Boolean(record.is_default),
  description: record.description || '',
});

function Field({ label, required = false, children }) {
  return (
    <div className="flex min-w-0 items-center" style={{ height: 30 }}>
      <label className="w-[150px] shrink-0 text-xs font-medium text-gray-700">
        {label}{required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      <div className="ml-2 min-w-0 flex-1">{children}</div>
    </div>
  );
}

function Switch({ checked, onChange, yes = 'Oui', no = 'Non' }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`inline-flex h-5 w-9 items-center rounded-full transition-colors ${checked ? 'bg-purple-600' : 'bg-gray-300'}`}
      title={checked ? yes : no}
    >
      <span className={`h-4 w-4 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-4' : 'translate-x-0.5'}`} />
    </button>
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
  onKeyDown,
}) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState(value || '');
  const [highlighted, setHighlighted] = useState(0);
  const [panelStyle, setPanelStyle] = useState({});
  const inputRef = useRef(null);
  const panelRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => setInput(value || ''), [value]);

  const visible = useMemo(() => {
    const query = input.trim().toLocaleLowerCase('fr');
    return (options || [])
      .filter((item) => String(getOptionLabel(item) || '').toLocaleLowerCase('fr').includes(query))
      .slice(0, 100);
  }, [getOptionLabel, input, options]);

  const positionPanel = useCallback(() => {
    const rect = inputRef.current?.getBoundingClientRect();
    if (!rect) return;
    setPanelStyle({
      position: 'fixed', left: rect.left, top: rect.bottom + 1, width: rect.width,
      maxHeight: 230, overflowY: 'auto', zIndex: 9999,
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
      if (!inputRef.current?.contains(event.target) && !panelRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const choose = (item) => {
    const label = getOptionLabel(item);
    setInput(label);
    setOpen(false);
    onSelect(item.id, label, item);
  };

  return (
    <>
      <input
        ref={inputRef}
        value={input}
        placeholder={placeholder}
        autoComplete="off"
        className="h-[26px] w-full border-0 bg-transparent px-2 text-xs text-gray-800 outline-none focus:ring-1 focus:ring-inset focus:ring-purple-500"
        onFocus={() => { setOpen(true); positionPanel(); onOpen?.(); }}
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
            setHighlighted((index) => Math.min(index + 1, visible.length - 1));
          } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            setHighlighted((index) => Math.max(index - 1, 0));
          } else if (event.key === 'Enter' && open && visible[highlighted]) {
            event.preventDefault();
            choose(visible[highlighted]);
          } else if (event.key === 'Escape') {
            setOpen(false);
          }
          onKeyDown?.(event);
        }}
      />
      {open && createPortal(
        <div ref={panelRef} style={panelStyle} className="border border-gray-300 bg-white shadow-xl">
          {loading && <div className="px-3 py-2 text-xs text-gray-500">Chargement…</div>}
          {!loading && !visible.length && <div className="px-3 py-2 text-xs text-gray-500">{emptyLabel}</div>}
          {!loading && visible.map((item, index) => (
            <button
              key={item.id}
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => choose(item)}
              className={`block w-full px-3 py-2 text-left text-xs ${index === highlighted ? 'bg-purple-50 text-purple-700' : 'hover:bg-gray-50'}`}
            >
              {getOptionLabel(item)}
            </button>
          ))}
        </div>,
        document.body,
      )}
    </>
  );
}

function RepartitionTable({ title, totalLabel, lines, setLines, accounts, taxGroups, loadAccounts, accountsLoading, accountsError, onAdd }) {
  const updateLine = (index, patch) => {
    setLines((current) => current.map((line, lineIndex) => (
      lineIndex === index ? { ...line, ...patch } : line
    )));
  };

  const removeLine = (index) => setLines((current) => current.filter((_, lineIndex) => lineIndex !== index));

  const totals = useMemo(() => lines.reduce((result, line) => ({
    ...result,
    [line.repartition_type]: (result[line.repartition_type] || 0) + Math.abs(Number(line.factor_percent) || 0),
  }), {}), [lines]);

  return (
    <div className="border border-gray-300">
      <div className="border-b border-gray-300 bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-800">{title}</div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px] table-fixed border-collapse text-xs">
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
              const isBase = line.repartition_type === 'base';
              return (
                <tr key={line.key} className={index % 2 ? 'bg-gray-50/60' : 'bg-white'}>
                  <td className="border-r border-t border-gray-200 p-0">
                    <select
                      value={line.repartition_type}
                      disabled={isBase}
                      onChange={(event) => updateLine(index, {
                        repartition_type: event.target.value,
                        factor_percent: event.target.value === 'base' ? 100 : line.factor_percent,
                      })}
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
                        disabled={isBase}
                        value={isBase ? 100 : line.factor_percent}
                        onChange={(event) => updateLine(index, { factor_percent: Math.abs(Number(event.target.value) || 0) })}
                        className="h-[30px] w-full border-0 bg-transparent px-2 pr-5 text-right text-xs outline-none focus:ring-1 focus:ring-inset focus:ring-purple-500 disabled:bg-gray-50 disabled:text-green-700"
                      />
                      <span className="pointer-events-none absolute right-1.5 top-2 text-[10px] text-gray-400">%</span>
                    </div>
                  </td>
                  <td className="border-r border-t border-gray-200 p-0">
                    {isBase ? (
                      <div className="flex h-[30px] items-center bg-gray-50 px-2 text-gray-400">Non applicable</div>
                    ) : (
                      <SearchSelect
                        value={line.account_label}
                        selectedId={line.account_id}
                        options={accounts}
                        getOptionLabel={(account) => joinLabel(account.code, account.name)}
                        onChange={(value) => updateLine(index, { account_label: value })}
                        onSelect={(id, label) => updateLine(index, { account_id: id, account_label: label })}
                        onOpen={() => loadAccounts('')}
                        onQuery={loadAccounts}
                        placeholder="Sélectionner un compte"
                        loading={accountsLoading}
                        emptyLabel={accountsError || 'Aucun compte disponible'}
                      />
                    )}
                  </td>
                  <td className="border-r border-t border-gray-200 p-0">
                    {isBase ? (
                      <div className="flex h-[30px] items-center bg-gray-50 px-2 text-gray-400">Non applicable</div>
                    ) : (
                      <SearchSelect
                        value={line.tax_group_label}
                        selectedId={line.tax_group_id}
                        options={taxGroups}
                        getOptionLabel={(group) => group.name || ''}
                        onChange={(value) => updateLine(index, { tax_group_label: value })}
                        onSelect={(id, label) => updateLine(index, { tax_group_id: id, tax_group_label: label })}
                        placeholder="Groupe"
                        onKeyDown={index === lines.length - 1 ? (event) => {
                          if (event.key === 'Tab' && !event.shiftKey) {
                            event.preventDefault();
                            onAdd();
                          }
                        } : undefined}
                      />
                    )}
                  </td>
                  <td className="border-t border-gray-200 p-0 text-center">
                    {!isBase ? (
                      <button type="button" title="Supprimer la ligne" onClick={() => removeLine(index)} className="p-2 text-gray-400 hover:text-red-600">
                        <FiTrash2 size={12} />
                      </button>
                    ) : <FiCheck className="mx-auto text-green-500" size={12} />}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-gray-300 px-3 py-2">
        <span className="shrink-0 text-xs font-semibold text-purple-700">{totalLabel}</span>
        <div className="flex flex-wrap justify-end gap-x-3 gap-y-1 text-xs text-gray-600">
          <span>Base <b>{Number(totals.base || 0).toFixed(2)} %</b></span>
          <span>Taxe <b>{Number(totals.tax || 0).toFixed(2)} %</b></span>
          <span>De la taxe <b>{Number(totals.delatax || 0).toFixed(2)} %</b></span>
        </div>
      </div>
    </div>
  );
}

export default function WithholdingTaxForm({ mode = 'create' }) {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  const { activeEntity } = useEntity();
  const recordId = mode === 'show' ? params.id : null;
  const companyId = activeEntity?.id;
  const initialRecord = location.state?.withholding || location.state?.record || null;

  const cachedOptions = readCache(`${OPTIONS_CACHE_PREFIX}${companyId || 'none'}`, {});
  const [form, setForm] = useState(() => ({ ...EMPTY_FORM, ...(location.state?.duplicateWithholding || {}) }));
  const [lines, setLines] = useState(defaultLines);
  const [record, setRecord] = useState(initialRecord);
  const [accounts, setAccounts] = useState(() => readCache(`${ACCOUNT_CACHE_PREFIX}${companyId || 'none'}`, []).filter(isSelectableAccount));
  const [taxes, setTaxes] = useState(cachedOptions.taxes || []);
  const [journals, setJournals] = useState(cachedOptions.journals || []);
  const [taxGroups, setTaxGroups] = useState(cachedOptions.taxGroups || []);
  const [activeTab, setActiveTab] = useState('accounting');
  const [loading, setLoading] = useState(Boolean(recordId && !initialRecord));
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [traceOpen, setTraceOpen] = useState(Boolean(recordId));
  const [actionsOpen, setActionsOpen] = useState(false);
  const [accountsLoading, setAccountsLoading] = useState(false);
  const [accountsError, setAccountsError] = useState('');
  const actionsRef = useRef(null);
  const accountRequestRef = useRef(0);

  const updateForm = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setDirty(true);
  };

  const updateLines = (value) => {
    setLines(value);
    setDirty(true);
  };

  const addLine = () => updateLines((current) => [...current, emptyLine('delatax')]);

  const loadAccounts = useCallback(async (search = '') => {
    if (!companyId) return;
    const request = accountRequestRef.current + 1;
    accountRequestRef.current = request;
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
      if (request !== accountRequestRef.current) return;
      const rows = asArray(response).filter(isSelectableAccount);
      setAccounts((current) => {
        const merged = new Map(current.filter(isSelectableAccount).map((item) => [String(item.id), item]));
        rows.forEach((item) => merged.set(String(item.id), item));
        const result = [...merged.values()];
        writeCache(`${ACCOUNT_CACHE_PREFIX}${companyId}`, result.slice(0, 250));
        return result;
      });
    } catch (error) {
      if (request === accountRequestRef.current) setAccountsError(getErrorMessage(error, 'Impossible de charger les comptes.'));
    } finally {
      if (request === accountRequestRef.current) setAccountsLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    if (!companyId) return;
    let active = true;
    Promise.allSettled([
      apiClient.get('/compta/taxes/', { params: { company: companyId, page_size: 300 } }),
      apiClient.get('/compta/journals/', { params: { company: companyId, page_size: 300 } }),
      apiClient.get('/compta/tax-groups/', { params: { company: companyId, page_size: 300 } }),
    ]).then(([taxResult, journalResult, groupResult]) => {
      if (!active) return;
      const nextTaxes = taxResult.status === 'fulfilled' ? asArray(taxResult.value) : taxes;
      const nextJournals = journalResult.status === 'fulfilled' ? asArray(journalResult.value) : journals;
      const nextGroups = groupResult.status === 'fulfilled' ? asArray(groupResult.value) : taxGroups;
      setTaxes(nextTaxes);
      setJournals(nextJournals);
      setTaxGroups(nextGroups);
      writeCache(`${OPTIONS_CACHE_PREFIX}${companyId}`, { taxes: nextTaxes, journals: nextJournals, taxGroups: nextGroups });
    });
    loadAccounts('');
    return () => { active = false; };
  // Cached values intentionally seed the first render; this effect refreshes them in background.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId, loadAccounts]);

  const applyRecord = useCallback((data) => {
    const options = { accounts, taxes, journals, taxGroups };
    setRecord(data);
    setForm(normalizeRecord(data, options));
    const sourceLines = Array.isArray(data.repartition_lines) ? data.repartition_lines : [];
    const invoice = sourceLines.filter((line) => line.document_type === 'invoice' || line.use_in_invoice === true);
    const refund = sourceLines.filter((line) => line.document_type === 'refund' || line.use_in_refund === true);
    const commonLines = invoice.length ? invoice : refund;
    setLines(commonLines.length ? commonLines.map((line) => normalizeLine(line, accounts, taxGroups)) : defaultLines());
    setDirty(false);
  }, [accounts, journals, taxGroups, taxes]);

  useEffect(() => {
    if (!recordId) return;
    const cached = readCache(`${RECORD_CACHE_PREFIX}${recordId}`, null);
    const immediate = initialRecord || cached;
    if (immediate) {
      applyRecord(immediate);
      setLoading(false);
    }
    let active = true;
    apiClient.get(`/compta/withholding-taxes/${recordId}/`)
      .then((response) => {
        if (!active) return;
        const data = asObject(response);
        applyRecord(data);
        writeCache(`${RECORD_CACHE_PREFIX}${recordId}`, data);
      })
      .catch((error) => {
        if (!active || immediate) return;
        setFeedback({ type: 'error', message: getErrorMessage(error, 'Impossible de charger la retenue.') });
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [applyRecord, initialRecord, recordId]);

  useEffect(() => {
    if (!recordId || !record) return;
    setForm((current) => ({
      ...current,
      tax_label: current.tax_label || optionLabel(record, 'tax_id', 'tax_name', taxes, (item) => `${item.name} (${item.amount} %)`),
      journal_label: current.journal_label || optionLabel(record, 'journal_id', 'journal_label', journals, (item) => joinLabel(item.code, item.name)),
      tax_group_label: current.tax_group_label || optionLabel(record, 'tax_group', 'tax_group_name', taxGroups, (item) => item.name),
    }));
  }, [accounts, journals, record, recordId, taxGroups, taxes]);

  useEffect(() => {
    const close = (event) => {
      if (!actionsRef.current?.contains(event.target)) setActionsOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const validate = useCallback(() => {
    const errors = [];
    const amount = Number(form.amount);
    if (!form.name.trim()) errors.push('Le nom de la retenue est obligatoire.');
    if (!Number.isFinite(amount) || amount <= 0) errors.push('Le taux ou montant doit être supérieur à zéro.');
    if (PERCENTAGE_SCOPES.includes(form.withholding_scope) && amount > 100) errors.push('Un pourcentage ne peut pas dépasser 100 %.');
    if (form.withholding_scope === 'on_tax' && !resolveId(form.tax_id)) errors.push('La taxe de référence est obligatoire pour un précompte de TVA.');

    const total = (type) => lines.filter((line) => line.repartition_type === type)
        .reduce((sum, line) => sum + Math.abs(Number(line.factor_percent) || 0), 0);
    if (Math.abs(total('base') - 100) > 0.01) errors.push('La base doit être égale à 100 %.');
    if (total('delatax') > 0 && Math.abs(total('tax') - total('delatax')) > 0.01) {
      errors.push('Le total Taxe doit être égal au total De la taxe.');
    }
    if (lines.some((line) => line.repartition_type !== 'base' && !resolveId(line.account_id))) {
      errors.push('Chaque ligne Taxe ou De la taxe doit avoir un compte.');
    }
    return errors;
  }, [form, lines]);

  const buildLines = (lines, documentType) => lines.map((line) => ({
    repartition_type: line.repartition_type,
    factor_percent: Math.abs(Number(line.factor_percent) || 0),
    account_id: resolveId(line.account_id),
    tax_group_id: resolveId(line.tax_group_id),
    document_type: documentType,
    company_id: companyId,
  }));

  const buildReturnState = (saved) => {
    const label = `${saved?.name || form.name}${saved?.amount !== undefined ? ` (${saved.amount} %)` : ''}`;
    const returnTo = location.state?.returnTo || '';
    return {
      ...(location.state || {}),
      createdRecord: saved,
      created_record: saved,
      selectedRecord: saved,
      updatedRecord: saved,
      returnField: location.state?.returnField || location.state?.selectedField || 'withholding',
      selectedField: location.state?.selectedField || location.state?.returnField || 'withholding',
      returnLineId: location.state?.returnLineId ?? location.state?.lineId ?? null,
      lineId: location.state?.lineId ?? location.state?.returnLineId ?? null,
      returnQuery: location.state?.returnQuery || location.state?.suggestedValue || label,
      suggestedValue: location.state?.suggestedValue || location.state?.returnQuery || label,
      restorePieceDraft: location.state?.restorePieceDraft ?? returnTo.includes('/pieces'),
      restoreJournalDraft: location.state?.restoreJournalDraft ?? returnTo.includes('/journals'),
    };
  };

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
      amount: Number(form.amount),
      withholding_type: form.withholding_type,
      withholding_scope: form.withholding_scope,
      withholding_eligibility: form.withholding_eligibility,
      company_id: companyId,
      tax_id: form.withholding_scope === 'on_tax' ? resolveId(form.tax_id) : null,
      journal_id: resolveId(form.journal_id),
      tax_group_id: resolveId(form.tax_group),
      active: Boolean(form.active),
      is_default: Boolean(form.is_default),
      sequence: Number(form.sequence) || 10,
      description: form.description.trim(),
      repartition_lines_write: [
        ...buildLines(lines, 'invoice'),
        ...buildLines(lines, 'refund'),
      ],
    };
    try {
      const response = recordId
        ? await apiClient.patch(`/compta/withholding-taxes/${recordId}/`, payload)
        : await apiClient.post('/compta/withholding-taxes/', payload);
      const saved = asObject(response);
      const savedId = saved.id || recordId;
      setRecord(saved);
      setDirty(false);
      if (savedId) writeCache(`${RECORD_CACHE_PREFIX}${savedId}`, saved);
      setFeedback({
        type: 'success',
        message: recordId ? 'Retenue modifiée avec succès.' : 'Retenue créée avec succès.',
      });
      if (!recordId && location.state?.returnTo) {
        navigate(location.state.returnTo, { replace: true, state: buildReturnState(saved) });
      }
      return saved;
    } catch (error) {
      setFeedback({ type: 'error', message: getErrorMessage(error, 'Impossible d’enregistrer la retenue.') });
      return false;
    } finally {
      setSaving(false);
    }
  // buildReturnState only reads the current location/form after a successful create.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId, form, lines, location.state, navigate, recordId, validate]);

  const duplicate = () => {
    setActionsOpen(false);
    navigate('/comptabilite/withholding-taxes/create', {
      state: { duplicateWithholding: { ...form, name: `${form.name || 'Retenue'} (Copie)` } },
    });
  };

  const remove = async () => {
    setActionsOpen(false);
    if (!recordId || !window.confirm(`Supprimer la retenue « ${form.name} » ?`)) return;
    try {
      await apiClient.delete(`/compta/withholding-taxes/${recordId}/`);
      sessionStorage.removeItem(`${RECORD_CACHE_PREFIX}${recordId}`);
      navigate('/comptabilite/withholding-taxes', { replace: true });
    } catch (error) {
      setFeedback({ type: 'error', message: getErrorMessage(error, 'Impossible de supprimer cette retenue.') });
    }
  };

  const actionsMenu = (
    <div ref={actionsRef} className="relative">
      <button type="button" onClick={() => setActionsOpen((open) => !open)} className="flex h-8 items-center gap-1 border border-gray-300 px-3 text-xs text-gray-700 transition-all hover:border-purple-500 hover:bg-purple-50 hover:text-purple-700">
        <FiMoreVertical size={13} /> Actions
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

  const events = useMemo(() => {
    if (!recordId || !record) return [];
    const rows = [];
    if (record.write_date) rows.push({ title: 'Modification', date: record.write_date, user: record.write_uid });
    if (record.create_date) rows.push({ title: 'Création', date: record.create_date, user: record.create_uid });
    return rows;
  }, [record, recordId]);

  const traceabilityContent = (
    <div className="p-4">
      <div className="mb-3 flex items-center justify-between text-xs font-medium text-gray-700">
        <span>Activité liée à la retenue</span><span>{events.length} événement(s)</span>
      </div>
      {!events.length ? (
        <div className="border border-gray-300 bg-white px-4 py-8 text-center text-xs text-gray-500">
          <FiClock className="mx-auto mb-2 text-gray-400" size={28} />
          La traçabilité apparaîtra après l’enregistrement.
        </div>
      ) : events.map((event) => (
        <div key={`${event.title}-${event.date}`} className="mb-2 border border-gray-300 bg-white p-3 text-xs">
          <div className="font-semibold text-gray-800">{event.title}</div>
          <div className="mt-1 text-gray-600">Retenue {form.name}</div>
          <div className="mt-2 flex justify-between gap-2 text-gray-500">
            <span>Par {auditUser(event.user)}</span><span>{formatDateTime(event.date)}</span>
          </div>
        </div>
      ))}
    </div>
  );

  if (!activeEntity) {
    return <UnifiedFormPage title="Retenues à la source" noContext="Sélectionnez une entité pour gérer les retenues." />;
  }

  if (loading) {
    return (
      <UnifiedFormPage title="Retenues à la source" fallbackPath="/comptabilite/withholding-taxes">
        <div className="p-8 text-center text-sm text-gray-500">Chargement de la retenue…</div>
      </UnifiedFormPage>
    );
  }

  return (
    <UnifiedFormPage
      title="Retenues à la source"
      recordLabel={recordId ? (form.name || 'Retenue') : (form.name || 'Nouvelle retenue')}
      pageLabel={recordId ? 'Détail de la retenue' : 'Création d’une retenue'}
      mode={recordId ? 'show' : 'create'}
      fallbackPath="/comptabilite/withholding-taxes"
      primaryAction={{ label: 'Nouveau', icon: <FiPlus size={12} />, path: '/comptabilite/withholding-taxes/create' }}
      actionsMenu={actionsMenu}
      onSave={save}
      saving={saving}
      saveLabel="Enregistrer"
      autoReturnAfterSave={!location.state?.returnTo}
      hasUnsavedChanges={dirty}
      rememberForm={!recordId}
      memoryKey="comptabilite:retenues:form"
      memoryState={{ form, lines, activeTab }}
      onRestoreMemoryState={(state) => {
        if (recordId || location.state?.duplicateWithholding) return;
        if (state?.form) setForm({ ...EMPTY_FORM, ...state.form });
        if (Array.isArray(state?.lines)) setLines(state.lines);
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
            <Field label="Nom de la retenue" required>
              <input value={form.name} onChange={(event) => updateForm('name', event.target.value)} className={inputClass} placeholder="Ex. Retenue TVA 50 %" />
            </Field>
            <Field label="Type" required>
              <select value={form.withholding_type} onChange={(event) => updateForm('withholding_type', event.target.value)} className={inputClass}>
                <option value="partial">Partielle</option>
                <option value="full">Totale</option>
              </select>
            </Field>
            <Field label="Base de calcul" required>
              <select
                value={form.withholding_scope}
                onChange={(event) => {
                  updateForm('withholding_scope', event.target.value);
                  if (event.target.value !== 'on_tax') {
                    updateForm('tax_id', null);
                    updateForm('tax_label', '');
                  }
                }}
                className={inputClass}
              >
                <option value="percent">Pourcentage du montant HT</option>
                <option value="on_total">Pourcentage du montant TTC</option>
                <option value="fixed">Montant fixe (forfaitaire)</option>
                <option value="on_tax">Précompte de TVA</option>
              </select>
            </Field>
            <Field label="Exigibilité" required>
              <select value={form.withholding_eligibility} onChange={(event) => updateForm('withholding_eligibility', event.target.value)} className={inputClass}>
                <option value="on_invoice">Sur facture</option>
                <option value="on_payment">Sur paiement</option>
              </select>
            </Field>
            <Field label={form.withholding_scope === 'fixed' ? 'Montant fixe' : 'Taux'} required>
              <div className="relative">
                <input type="number" min="0" max={form.withholding_scope === 'fixed' ? undefined : 100} step="0.01" value={form.amount} onChange={(event) => updateForm('amount', event.target.value)} className={`${inputClass} pr-10 text-right`} />
                <span className="pointer-events-none absolute right-3 top-2 text-[10px] text-gray-500">{form.withholding_scope === 'fixed' ? 'montant' : '%'}</span>
              </div>
            </Field>
            {form.withholding_scope === 'on_tax' && (
              <Field label="Taxe de référence" required>
                <div className="border border-gray-300 hover:border-purple-400">
                  <SearchSelect
                    value={form.tax_label}
                    selectedId={form.tax_id}
                    options={taxes}
                    getOptionLabel={(tax) => `${tax.name} (${tax.amount} %)`}
                    onChange={(value) => updateForm('tax_label', value)}
                    onSelect={(id, label) => { updateForm('tax_id', id); updateForm('tax_label', label); }}
                    placeholder="Sélectionner une taxe"
                  />
                </div>
              </Field>
            )}
          </div>
        </div>

        <div className="border-b border-gray-300 px-4">
          <div className="flex gap-1">
            {[
            ['accounting', 'Paramètres comptables'],
            ['advanced', 'Paramètres avancés'],
            ['notes', 'Notes'],
            ].map(([key, label]) => (
            <button key={key} type="button" onClick={() => setActiveTab(key)} className={`border-b-2 px-5 py-3 text-xs font-medium transition-colors ${activeTab === key ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-500 hover:text-purple-600'}`}>
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-4">
          {activeTab === 'accounting' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-x-6 gap-y-1 lg:grid-cols-2">
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
              </div>
              <div className="overflow-x-auto">
                <div className="grid min-w-[1220px] grid-cols-2 gap-3">
                  <RepartitionTable
                    title="Répartition sur une facture"
                    totalLabel="Total Facture"
                    lines={lines}
                    setLines={updateLines}
                    accounts={accounts}
                    taxGroups={taxGroups}
                    loadAccounts={loadAccounts}
                    accountsLoading={accountsLoading}
                    accountsError={accountsError}
                    onAdd={addLine}
                  />
                  <RepartitionTable
                    title="Répartition sur un avoir"
                    totalLabel="Total Avoir"
                    lines={lines}
                    setLines={updateLines}
                    accounts={accounts}
                    taxGroups={taxGroups}
                    loadAccounts={loadAccounts}
                    accountsLoading={accountsLoading}
                    accountsError={accountsError}
                    onAdd={addLine}
                  />
                </div>
              </div>
              <button type="button" onClick={addLine} className="mt-3 flex h-7 items-center gap-1 bg-purple-600 px-3 text-xs font-medium text-white transition-colors hover:bg-purple-700">
                <FiPlus size={12} /> Ajouter une ligne de répartition
              </button>
            </div>
          )}

          {activeTab === 'advanced' && (
            <div className="grid grid-cols-1 gap-x-6 gap-y-1 lg:grid-cols-2">
              <Field label="Société">
                <input value={activeEntity?.nom || activeEntity?.name || ''} disabled className={inputClass} />
              </Field>
              <Field label="Journal comptable">
                <div className="border border-gray-300 hover:border-purple-400">
                  <SearchSelect
                    value={form.journal_label}
                    selectedId={form.journal_id}
                    options={journals}
                    getOptionLabel={(journal) => joinLabel(journal.code, journal.name)}
                    onChange={(value) => updateForm('journal_label', value)}
                    onSelect={(id, label) => { updateForm('journal_id', id); updateForm('journal_label', label); }}
                    placeholder="Sélectionner un journal"
                  />
                </div>
              </Field>
              <Field label="Retenue par défaut">
                <Switch checked={form.is_default} onChange={(value) => updateForm('is_default', value)} />
              </Field>
              <Field label="Active">
                <Switch checked={form.active} onChange={(value) => updateForm('active', value)} />
              </Field>
              <Field label="Ordre d’application">
                <input type="number" min="1" step="1" value={form.sequence} onChange={(event) => updateForm('sequence', event.target.value)} className={inputClass} />
              </Field>
            </div>
          )}

          {activeTab === 'notes' && (
            <Field label="Description">
              <textarea value={form.description} onChange={(event) => updateForm('description', event.target.value)} rows={8} className="w-full resize-y border border-gray-300 p-3 text-xs outline-none hover:border-purple-400 focus:border-purple-600 focus:ring-1 focus:ring-purple-200" placeholder="Description de la retenue…" />
            </Field>
          )}
        </div>
      </div>
    </UnifiedFormPage>
  );
}
