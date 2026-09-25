import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  FiAlertCircle, FiChevronLeft, FiChevronRight, FiGrid,
  FiList, FiPlus, FiRefreshCw, FiSearch, FiSliders,
} from 'react-icons/fi';
import { apiClient } from '../../services/apiClient';
import { useUi } from '../../context/UiContext';

const MODEL_ENDPOINTS = {
  "core.Entite": "entites/",
  "core.Partenaire": "partenaires/",
};

const MODEL_ROUTES = {
  "core.Entite": {
    create: "/entities/create",
    detail: "/entities",
  },
  "core.Partenaire": {
    create: "/partners/create",
    detail: "/partners",
  },
};

const FALLBACK_LABELS = {
  nom: 'Nom', email: 'E-mail', telephone: 'Téléphone', statut: 'Statut',
  type_partenaire: 'Type', adresse: 'Adresse', vat: 'NIF',
  is_company: 'Société', city: 'Ville', mobile: 'Mobile',
};

const PAGE_SIZE = 20;

function parseCollection(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
}

function parseJson(value, fallback) {
  if (!value) return fallback;
  if (typeof value !== 'string') return value;
  try { return JSON.parse(value); } catch { return fallback; }
}

function readListFields(architecture) {
  if (!architecture || typeof DOMParser === 'undefined') return [];
  const xml = new DOMParser().parseFromString(architecture, 'application/xml');
  if (xml.querySelector('parsererror')) return [];
  return Array.from(xml.querySelectorAll('tree > field, list > field')).map((node) => {
    const name = node.getAttribute('name');
    return {
      name,
      label: node.getAttribute('string') || FALLBACK_LABELS[name] || name,
    };
  }).filter((field) => field.name);
}

function formatValue(value) {
  if (typeof value === 'boolean') return value ? 'Oui' : 'Non';
  if (value === null || value === undefined || value === '') return '—';
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'object') return value.name || value.nom || value.label || value.id || '—';
  return String(value);
}

function compareValues(a, b) {
  return String(a ?? '').localeCompare(String(b ?? ''), 'fr', {
    numeric: true,
    sensitivity: 'base',
  });
}

export default function DynamicActionPage() {
  const { actionId } = useParams();
  const navigate = useNavigate();
  const { configuration, loading: uiLoading, error: uiError } = useUi();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState([]);
  const [sort, setSort] = useState({ field: null, direction: 'asc' });
  const [page, setPage] = useState(1);
  const [displayMode, setDisplayMode] = useState('list');

  const action = configuration?.actions?.[String(actionId)];
  const listReference = action?.views?.find((item) => item.mode === 'list');
  const view = listReference
    ? configuration?.views?.[String(listReference.view_id)]
    : null;
  const fields = useMemo(() => readListFields(view?.architecture), [view?.architecture]);
  const routes = MODEL_ROUTES[action?.model];

  const loadRows = async () => {
    if (!action) return;
    const endpoint = MODEL_ENDPOINTS[action.model];
    if (!endpoint) {
      setError(`Le modèle ${action.model} n'est pas encore pris en charge.`);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const domain = parseJson(action.domain, []);
      const params = new URLSearchParams();
      domain.forEach((condition) => {
        if (Array.isArray(condition) && condition.length === 3 && condition[1] === '=') {
          params.set(condition[0], String(condition[2]));
        }
      });
      const suffix = params.toString() ? `?${params}` : '';
      setRows(parseCollection(await apiClient.get(`${endpoint}${suffix}`)));
      setSelected([]);
    } catch (exception) {
      setError(exception?.message || 'Impossible de charger les enregistrements.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionId, action?.id]);

  useEffect(() => { setPage(1); }, [query, sort.field, sort.direction]);

  const filteredRows = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('fr');
    const result = normalized
      ? rows.filter((row) => fields.some(({ name }) =>
          formatValue(row[name]).toLocaleLowerCase('fr').includes(normalized)))
      : [...rows];
    if (sort.field) {
      result.sort((a, b) => {
        const compared = compareValues(a[sort.field], b[sort.field]);
        return sort.direction === 'asc' ? compared : -compared;
      });
    }
    return result;
  }, [rows, fields, query, sort]);

  const pageCount = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const visibleRows = filteredRows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const visibleIds = visibleRows.map((row) => row.id);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selected.includes(id));

  const toggleSort = (field) => setSort((current) => ({
    field,
    direction: current.field === field && current.direction === 'asc' ? 'desc' : 'asc',
  }));

  const toggleAll = () => setSelected((current) => allVisibleSelected
    ? current.filter((id) => !visibleIds.includes(id))
    : [...new Set([...current, ...visibleIds])]);

  const openRecord = (row) => {
    if (routes?.detail) navigate(`${routes.detail}/${row.id}`);
  };

  if (uiLoading) return <div className="p-6 text-sm text-slate-500">Chargement de l’interface…</div>;
  if (uiError) return <div className="m-6 border border-red-200 bg-red-50 p-4 text-red-700">{uiError}</div>;
  if (!action || !view) return <div className="m-6 border border-amber-200 bg-amber-50 p-4">Action ou vue indisponible.</div>;

  return (
    <div className="min-h-full bg-slate-100">
      <header className="border-b border-slate-200 bg-white px-5 py-3">
        <div className="mb-3 flex items-center justify-between gap-4">
          <div>
            <div className="text-xs text-slate-400">{view.name || 'Vue'}</div>
            <h1 className="text-xl font-semibold text-slate-800">{action.name}</h1>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={loadRows} title="Actualiser" className="rounded border border-slate-300 p-2 text-slate-600 hover:bg-slate-50">
              <FiRefreshCw className={loading ? 'animate-spin' : ''} />
            </button>
            {routes?.create && (
              <button onClick={() => navigate(routes.create)} className="flex items-center gap-2 rounded bg-violet-700 px-4 py-2 text-sm font-medium text-white hover:bg-violet-800">
                <FiPlus /> Nouveau
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-[280px] flex-1 items-center rounded border border-slate-300 bg-white focus-within:border-violet-500 focus-within:ring-1 focus-within:ring-violet-500">
            <FiSearch className="ml-3 text-slate-400" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher…" className="w-full border-0 bg-transparent px-3 py-2 text-sm outline-none" />
            <button className="border-l border-slate-200 px-3 py-2 text-slate-500" title="Filtres"><FiSliders /></button>
          </div>
          <div className="flex items-center gap-1">
            <span className="mr-2 text-xs text-slate-500">{filteredRows.length} enregistrement(s)</span>
            <button onClick={() => setPage(Math.max(1, safePage - 1))} disabled={safePage === 1} className="rounded p-2 hover:bg-slate-100 disabled:opacity-30"><FiChevronLeft /></button>
            <span className="min-w-[55px] text-center text-xs text-slate-600">{safePage} / {pageCount}</span>
            <button onClick={() => setPage(Math.min(pageCount, safePage + 1))} disabled={safePage === pageCount} className="rounded p-2 hover:bg-slate-100 disabled:opacity-30"><FiChevronRight /></button>
            <div className="ml-2 flex rounded border border-slate-300">
              <button onClick={() => setDisplayMode('list')} className={`p-2 ${displayMode === 'list' ? 'bg-violet-50 text-violet-700' : 'text-slate-500'}`} title="Liste"><FiList /></button>
              <button onClick={() => setDisplayMode('kanban')} className={`border-l border-slate-300 p-2 ${displayMode === 'kanban' ? 'bg-violet-50 text-violet-700' : 'text-slate-500'}`} title="Kanban"><FiGrid /></button>
            </div>
          </div>
        </div>
      </header>

      {selected.length > 0 && (
        <div className="border-b border-violet-200 bg-violet-50 px-5 py-2 text-sm text-violet-800">
          {selected.length} élément(s) sélectionné(s)
          <button onClick={() => setSelected([])} className="ml-4 font-medium underline">Annuler</button>
        </div>
      )}

      {error && <div className="m-5 flex items-center gap-2 border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"><FiAlertCircle />{error}</div>}

      <main className="p-5">
        {displayMode === 'list' ? (
          <div className="overflow-hidden rounded border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="w-10 border-b border-slate-200 px-3 py-3"><input type="checkbox" checked={allVisibleSelected} onChange={toggleAll} /></th>
                    {fields.map((field) => (
                      <th key={field.name} onClick={() => toggleSort(field.name)} className="cursor-pointer whitespace-nowrap border-b border-slate-200 px-3 py-3 hover:bg-slate-100">
                        {field.label}{sort.field === field.name ? (sort.direction === 'asc' ? ' ↑' : ' ↓') : ''}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? <tr><td colSpan={fields.length + 1} className="p-10 text-center text-slate-500">Chargement…</td></tr>
                    : visibleRows.length === 0 ? <tr><td colSpan={fields.length + 1} className="p-10 text-center text-slate-500">Aucun résultat</td></tr>
                    : visibleRows.map((row) => (
                      <tr key={row.id} onDoubleClick={() => openRecord(row)} className="cursor-pointer hover:bg-violet-50/40">
                        <td className="px-3 py-2.5" onClick={(event) => event.stopPropagation()}>
                          <input type="checkbox" checked={selected.includes(row.id)} onChange={() => setSelected((current) => current.includes(row.id) ? current.filter((id) => id !== row.id) : [...current, row.id])} />
                        </td>
                        {fields.map((field, index) => <td key={field.name} onClick={() => openRecord(row)} className={`px-3 py-2.5 ${index === 0 ? 'font-medium text-violet-700' : 'text-slate-700'}`}>{formatValue(row[field.name])}</td>)}
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {visibleRows.map((row) => (
              <button key={row.id} onClick={() => openRecord(row)} className="rounded border border-slate-200 bg-white p-4 text-left shadow-sm hover:border-violet-300 hover:shadow">
                <div className="mb-3 font-semibold text-violet-700">{formatValue(row[fields[0]?.name])}</div>
                <dl className="space-y-2 text-sm">{fields.slice(1, 5).map((field) => <div key={field.name} className="flex justify-between gap-4"><dt className="text-slate-400">{field.label}</dt><dd className="text-right text-slate-700">{formatValue(row[field.name])}</dd></div>)}</dl>
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
