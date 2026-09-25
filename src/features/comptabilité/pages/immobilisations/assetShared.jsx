import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export const API = {
  assets: 'compta/assets/',
  categories: 'compta/asset-categories/',
  modifications: 'compta/asset-modifications/',
  accounts: 'compta/accounts/',
  journals: 'compta/journals/',
  currencies: 'devises/',
  entities: 'entites/',
  users: 'utilisateurs/',
  traceability: 'compta/module-traceability/',
};

export const ASSET_STATES = {
  draft: 'Brouillon',
  running: 'En cours',
  waiting: 'En attente',
  cancelled: 'Annulé',
  disposed: 'Décomptabilisé',
};

export const ASSET_TYPES = [
  { id: 'acquisition', label: 'Acquisition' },
  { id: 'donation', label: 'Don' },
  { id: 'finance_lease', label: 'Location-financement' },
  { id: 'credit_lease', label: 'Crédit-bail' },
  { id: 'internal_production', label: 'Production interne' },
];

export const METHODS = [
  { id: 'linear', label: 'Linéaire' },
  { id: 'declining', label: 'Dégressif à taux décroissant' },
  { id: 'declining_constant', label: 'Dégressif à coefficient constant' },
  { id: 'units', label: "Unités d'œuvre" },
];

export const PERIODS = [
  { id: 'month', label: 'Mois' },
  { id: 'year', label: 'Années' },
];

export const COMPUTATIONS = [
  { id: 'none', label: 'Pas de prorata' },
  { id: 'constant_360', label: 'Périodes constantes (360 jours/an)' },
  { id: 'actual', label: 'Nombre de jours réel (365/366 jours/an)' },
];

export const MODIFICATION_TYPES = [
  { id: 'sale', label: 'Cession' },
  { id: 'scrap', label: 'Mise au rebut' },
  { id: 'destruction', label: 'Destruction' },
  { id: 'loss', label: 'Disparition' },
  { id: 'contract_expiry', label: 'Expiration de contrat' },
  { id: 'plan_revision', label: "Révision du plan d'amortissement" },
  { id: 'impairment', label: 'Dépréciation de valeur' },
  { id: 'impairment_reversal', label: 'Reprise de dépréciation' },
  { id: 'pause', label: 'Mise en attente' },
  { id: 'revaluation', label: 'Réévaluation' },
];

export const normalizeApiList = (data) => {
  if (Array.isArray(data)) return data;
  return data?.results || data?.data || data?.items || data?.records || [];
};

export const getActiveEntityId = () => {
  const raw = localStorage.getItem('entiteActive');
  if (!raw) return '';
  try {
    const parsed = JSON.parse(raw);
    return parsed?.id || raw;
  } catch {
    return raw;
  }
};

export const relationId = (value) => {
  if (value === null || value === undefined || value === '') return '';
  return typeof value === 'object' ? (value.id ?? value.value ?? '') : value;
};

export const normalizeText = (value) => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase();

export const joinLabel = (...parts) => parts.filter(Boolean).join(' - ');

export const accountLabel = (account) => joinLabel(account?.code, account?.name || account?.nom) || `Compte ${account?.id || ''}`;
export const journalLabel = (journal) => joinLabel(journal?.code, journal?.name || journal?.nom) || `Journal ${journal?.id || ''}`;
export const currencyLabel = (currency) => joinLabel(currency?.code, currency?.name || currency?.nom) || `Devise ${currency?.id || ''}`;
export const userLabel = (user) => user?.full_name || user?.username || user?.email || joinLabel(user?.first_name, user?.last_name) || `Utilisateur ${user?.id || ''}`;

export const formatMoney = (value, currency = 'XOF') => `${new Intl.NumberFormat('fr-FR', {
  maximumFractionDigits: 2,
}).format(Number(value || 0))} ${currency || 'XOF'}`;

export const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString('fr-FR');
};

export const formatDateTime = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString('fr-FR');
};

export const getActionErrorMessage = (error, fallback) => {
  const data = error?.response?.data || error?.data;
  if (typeof data === 'string') return data;
  if (data?.detail) return Array.isArray(data.detail) ? data.detail.join('\n') : data.detail;
  if (data && typeof data === 'object') {
    return Object.entries(data).flatMap(([field, messages]) => {
      const values = Array.isArray(messages) ? messages : [messages];
      return values.map((message) => `${field} : ${typeof message === 'object' ? JSON.stringify(message) : message}`);
    }).join('\n');
  }
  return error?.message || fallback;
};

export const Field = ({ label, required = false, children }) => (
  <div className="flex min-h-[26px] items-center gap-2">
    <label className="w-[145px] shrink-0 text-xs font-medium leading-4 text-gray-700 sm:w-[205px]">
      {label}{required && <span className="ml-1 text-red-500">*</span>}
    </label>
    <div className="min-w-0 flex-1">{children}</div>
  </div>
);

export const inputClass = 'h-[26px] w-full border border-gray-300 bg-white px-2 text-left text-xs outline-none hover:border-purple-400 focus:border-purple-600 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500';

export const AssetAutocomplete = ({ value, onChange, options, getLabel, placeholder = '', disabled = false, onCreateOption, createOptionLabel = 'Créer' }) => {
  const selected = options.find((option) => String(option.id) === String(value));
  const selectedLabel = selected ? getLabel(selected) : '';
  const [query, setQuery] = useState(selectedLabel);
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [position, setPosition] = useState({});
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);
  const editingRef = useRef(false);
  const normalizedQuery = query.trim().toLowerCase();
  const matches = useMemo(() => options.filter((option) => getLabel(option).toLowerCase().includes(normalizedQuery)), [options, getLabel, normalizedQuery]);
  const canCreate = Boolean(onCreateOption && normalizedQuery && !matches.some((option) => getLabel(option).trim().toLowerCase() === normalizedQuery));

  useEffect(() => {
    if (!editingRef.current || selectedLabel) setQuery(selectedLabel);
  }, [selectedLabel]);

  const updatePosition = useCallback(() => {
    if (!inputRef.current) return;
    const rect = inputRef.current.getBoundingClientRect();
    setPosition({ position: 'fixed', top: rect.bottom, left: rect.left, width: rect.width, zIndex: 30, maxHeight: 220, overflowY: 'auto' });
  }, []);

  useEffect(() => {
    if (!open || disabled) return undefined;
    updatePosition();
    const outside = (event) => {
      if (!inputRef.current?.contains(event.target) && !dropdownRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('mousedown', outside);
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      document.removeEventListener('mousedown', outside);
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [open, disabled, updatePosition]);

  useEffect(() => {
    if (open) dropdownRef.current?.querySelectorAll('[data-option]')[highlightedIndex]?.scrollIntoView?.({ block: 'nearest' });
  }, [open, highlightedIndex, matches.length]);

  const choose = (option) => {
    if (!option || disabled) return;
    editingRef.current = false;
    setQuery(getLabel(option));
    setOpen(false);
    onChange(option.id, option);
  };
  const create = () => {
    if (!canCreate || disabled) return;
    setOpen(false);
    onCreateOption(query.trim());
  };

  return <>
    <input ref={inputRef} className={inputClass} value={query} title={query || placeholder} placeholder={placeholder} disabled={disabled} autoComplete="off"
      onFocus={() => { if (!disabled) { setOpen(true); updatePosition(); } }}
      onChange={(event) => {
        editingRef.current = true;
        setQuery(event.target.value);
        setOpen(true);
        setHighlightedIndex(0);
        if (value) onChange('', null);
      }}
      onKeyDown={(event) => {
        if (event.key === 'ArrowDown') { event.preventDefault(); setOpen(true); setHighlightedIndex((index) => Math.min(index + 1, Math.max(matches.length - 1, 0))); }
        else if (event.key === 'ArrowUp') { event.preventDefault(); setHighlightedIndex((index) => Math.max(index - 1, 0)); }
        else if (event.key === 'Escape') setOpen(false);
        else if (event.key === 'Enter' && open) {
          event.preventDefault();
          if (matches.length) choose(matches[highlightedIndex]);
          else create();
        } else if (event.key === 'Tab' && open && matches.length) { event.preventDefault(); choose(matches[highlightedIndex]); }
      }}
    />
    {open && !disabled && (matches.length > 0 || canCreate) && createPortal(<div ref={dropdownRef} className="border border-gray-300 bg-white shadow-lg" style={position}>
      {matches.map((option, index) => <button key={option.id} data-option type="button" onClick={() => choose(option)} onMouseEnter={() => setHighlightedIndex(index)} className={`w-full px-2 py-1 text-left text-xs ${index === highlightedIndex ? 'bg-blue-100 text-blue-700' : 'hover:bg-blue-50'}`}>{getLabel(option)}</button>)}
      {canCreate && <button type="button" onClick={create} className="flex w-full items-center gap-1 border-t border-gray-200 px-2 py-1.5 text-left text-xs font-medium text-purple-700 hover:bg-purple-50"><span>+</span><span>{createOptionLabel} "{query.trim()}"</span></button>}
    </div>, document.body)}
  </>;
};

const readTablePreferences = (storageKey) => {
  try { return JSON.parse(localStorage.getItem(storageKey)) || {}; }
  catch { return {}; }
};

export const AssetTable = ({ storageKey, columns, rows, renderCell, renderAction, totals = {}, emptyLabel }) => {
  const [preferences, setPreferences] = useState(() => readTablePreferences(storageKey));
  const [menuPosition, setMenuPosition] = useState(null);
  const buttonRef = useRef(null);
  const popupRef = useRef(null);
  const resizeRef = useRef(null);
  const isColumnVisible = (column, saved = preferences) => column.required || (
    typeof saved.hidden?.[column.key] === 'boolean' ? !saved.hidden[column.key] : column.defaultVisible !== false
  );
  const visibleColumns = columns.filter((column) => isColumnVisible(column));
  const columnWidth = (column) => preferences.widths?.[column.key] || column.width || 180;

  useEffect(() => {
    try { localStorage.setItem(storageKey, JSON.stringify(preferences)); } catch {}
  }, [preferences, storageKey]);

  useEffect(() => {
    if (!menuPosition) return undefined;
    const closeOutside = (event) => {
      if (!buttonRef.current?.contains(event.target) && !popupRef.current?.contains(event.target)) setMenuPosition(null);
    };
    const closeOnEscape = (event) => { if (event.key === 'Escape') setMenuPosition(null); };
    const closeOnMove = (event) => {
      if (!popupRef.current?.contains(event.target)) setMenuPosition(null);
    };
    document.addEventListener('mousedown', closeOutside);
    document.addEventListener('keydown', closeOnEscape);
    window.addEventListener('scroll', closeOnMove, true);
    window.addEventListener('resize', closeOnMove);
    return () => {
      document.removeEventListener('mousedown', closeOutside);
      document.removeEventListener('keydown', closeOnEscape);
      window.removeEventListener('scroll', closeOnMove, true);
      window.removeEventListener('resize', closeOnMove);
    };
  }, [menuPosition]);

  useEffect(() => () => resizeRef.current?.(), []);

  const startResize = (event, column) => {
    event.preventDefault();
    resizeRef.current?.();
    const startX = event.clientX;
    const width = columnWidth(column);
    const move = (nextEvent) => setPreferences((current) => ({
      ...current, widths: { ...current.widths, [column.key]: Math.max(90, width + nextEvent.clientX - startX) },
    }));
    const stop = () => {
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseup', stop);
      resizeRef.current = null;
    };
    resizeRef.current = stop;
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', stop);
  };

  const toggleMenu = () => {
    if (menuPosition) { setMenuPosition(null); return; }
    const rect = buttonRef.current.getBoundingClientRect();
    const height = Math.min(300, 44 + columns.length * 32);
    setMenuPosition({
      position: 'fixed', zIndex: 10000, width: Math.min(224, window.innerWidth - 16),
      left: Math.max(8, Math.min(rect.right - 224, window.innerWidth - 232)),
      top: rect.bottom + height > window.innerHeight ? Math.max(8, rect.top - height) : rect.bottom + 2,
      maxHeight: Math.min(height, window.innerHeight - 16), overflowY: 'auto',
    });
  };

  return <>
    <style>{`
      .asset-lines-scroll { scrollbar-width: thin; scrollbar-color: #e2e8f0 transparent; }
      .asset-lines-scroll::-webkit-scrollbar { width: 1px; height: 1px; }
      .asset-lines-scroll::-webkit-scrollbar-track { background: transparent; }
      .asset-lines-scroll::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 999px; }
    `}</style>
    <div className="asset-lines-scroll mb-3 max-h-[52vh] overflow-auto">
      <table className="table-fixed border-collapse text-xs" style={{ width: '100%', minWidth: visibleColumns.reduce((sum, column) => sum + columnWidth(column), 40) }}>
        <colgroup>{visibleColumns.map((column) => <col key={column.key} style={{ width: columnWidth(column) }} />)}<col style={{ width: 40 }} /></colgroup>
        <thead className="sticky top-0 z-10"><tr className="bg-gray-100">
          {visibleColumns.map((column) => <th key={column.key} className="relative border border-gray-300 px-2 py-1.5 text-left font-medium text-gray-700">
            {column.label}
            <span role="separator" aria-label={`Redimensionner ${column.label}`} onMouseDown={(event) => startResize(event, column)} className="absolute right-0 top-0 h-full w-1 cursor-col-resize select-none hover:bg-purple-400" />
          </th>)}
          <th className="border border-gray-300 px-2 py-1.5"><button ref={buttonRef} type="button" onClick={toggleMenu} aria-label="Afficher ou masquer les colonnes" title="Afficher ou masquer les colonnes" className="w-full text-left hover:text-purple-600">...</button></th>
        </tr></thead>
        <tbody>{rows.length ? rows.map((row, index) => <tr key={row.id ?? row.sequence ?? index} className="odd:bg-white even:bg-gray-50/60">
          {visibleColumns.map((column) => <td key={column.key} className={`border border-gray-300 p-1 ${column.numeric ? 'text-right tabular-nums' : 'text-left'}`}><div className="min-w-0">{renderCell(row, column)}</div></td>)}
          <td className="border border-gray-300 p-1 text-center">{renderAction?.(row)}</td>
        </tr>) : <tr><td colSpan={visibleColumns.length + 1} className="border border-gray-300 px-2 py-6 text-center text-gray-500">{emptyLabel}</td></tr>}</tbody>
        {Object.keys(totals).length > 0 && <tfoot><tr>{visibleColumns.map((column) => <td key={column.key} className="px-2 py-2 text-right text-sm font-semibold tabular-nums">{totals[column.key] ?? ''}</td>)}<td /></tr></tfoot>}
      </table>
    </div>
    {menuPosition && createPortal(<div ref={popupRef} className="border border-gray-300 bg-white p-2 text-xs text-gray-700 shadow-xl" style={menuPosition}>
      <div className="border-b border-gray-100 px-2 py-1.5 font-semibold">Colonnes à afficher</div>
      {columns.map((column) => <label key={column.key} className="flex items-center gap-2 px-2 py-1.5 hover:bg-purple-50">
        <input type="checkbox" checked={isColumnVisible(column)} disabled={column.required} onChange={() => setPreferences((current) => ({ ...current, hidden: { ...current.hidden, [column.key]: isColumnVisible(column, current) } }))} className="accent-purple-600" />
        {column.label}
      </label>)}
    </div>, document.body)}
  </>;
};

export const AmountInput = ({ value, onChange, disabled = false }) => {
  const [display, setDisplay] = useState('');
  useEffect(() => {
    if (value === '' || value === null || value === undefined) setDisplay('');
    else setDisplay(new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(Number(value || 0)));
  }, [value]);
  return (
    <input
      className={inputClass}
      value={display}
      disabled={disabled}
      inputMode="decimal"
      placeholder="0"
      onFocus={() => setDisplay(value === '' || value === null || value === undefined ? '' : String(value))}
      onChange={(event) => {
        const raw = event.target.value.replace(/\s/g, '').replace(',', '.').replace(/[^\d.-]/g, '');
        setDisplay(raw);
        onChange(raw === '' || raw === '-' ? '' : Number(raw));
      }}
      onBlur={() => setDisplay(value === '' || value === null || value === undefined ? '' : new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(Number(value || 0)))}
    />
  );
};

export const StateBadge = ({ state }) => {
  const styles = {
    draft: 'border-amber-200 bg-amber-50 text-amber-700',
    running: 'border-green-200 bg-green-50 text-green-700',
    waiting: 'border-blue-200 bg-blue-50 text-blue-700',
    cancelled: 'border-red-200 bg-red-50 text-red-700',
    disposed: 'border-gray-300 bg-gray-100 text-gray-700',
  };
  return <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${styles[state] || styles.draft}`}>{ASSET_STATES[state] || state || 'Brouillon'}</span>;
};

export const AssetProcess = ({ state }) => (
  <div className="flex items-center justify-end gap-2 px-4 py-3 text-xs font-semibold">
    {[
      ['draft', 'Brouillon'],
      ['running', 'En cours'],
      ['waiting', 'En attente'],
      ['disposed', 'Décomptabilisé'],
    ].map(([value, label]) => (
      <span key={value} className={`border px-4 py-2 ${state === value ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-gray-300 bg-gray-50 text-gray-500'}`}>{label}</span>
    ))}
  </div>
);
