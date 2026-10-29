import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiActivity, FiDatabase, FiEye, FiLayers, FiRefreshCw, FiSearch } from 'react-icons/fi';
import { apiClient } from '../../services/apiClient';
import { useLanguage } from '../../context/LanguageContext';

const SOURCE_ENDPOINTS = [
  ['models', '/ir-models/'],
  ['fields', '/ir-model-fields/'],
  ['views', '/ir-views/'],
  ['menus', '/menus/'],
  ['actions', '/actions/'],
  ['windowActions', '/actions-window/'],
];

const VIEW_TYPE_LABELS = {
  form: 'Formulaire', tree: 'Liste', search: 'Recherche', qweb: 'QWeb',
  kanban: 'Kanban', graph: 'Graphique', pivot: 'Pivot', calendar: 'Calendrier', dashboard: 'Tableau de bord',
};
const EMPTY_ROWS = Object.freeze([]);

function rowsOf(payload) {
  if (Array.isArray(payload)) return payload;
  return Array.isArray(payload?.results) ? payload.results : [];
}

async function fetchAll(endpoint) {
  const rows = [];
  let page = 1;
  let hasNext = true;
  while (hasNext) {
    const payload = await apiClient.get(endpoint, { params: { page } });
    rows.push(...rowsOf(payload));
    hasNext = Boolean(payload?.next);
    page += 1;
    if (page > 500) throw new Error('La pagination a dépassé la limite de sécurité.');
  }
  return rows;
}

function fieldRefsInViews(views, knownFields) {
  const placed = new Set();
  const overrides = new Set();
  if (typeof DOMParser === 'undefined') return { placed, overrides };
  views.filter((view) => view.active && ['form', 'tree'].includes(view.type)).forEach((view) => {
    const document = new DOMParser().parseFromString(view.arch_db || '', 'application/xml');
    if (document.querySelector('parsererror')) return;
    document.querySelectorAll('field[name]').forEach((node) => {
      const name = node.getAttribute('name');
      if (!knownFields.has(name)) return;
      placed.add(name);
      if (node.getAttribute('widget')) overrides.add(name);
    });
  });
  return { placed, overrides };
}

function countBy(rows, key, expected) {
  return rows.filter((row) => row[key] === expected).length;
}

function normalizeId(value) {
  return value === null || value === undefined || value === '' ? '' : String(value);
}

function buildRows(models, fields, views, windowActions, menus, optionalAvailable) {
  const modelById = new Map(models.map((model) => [normalizeId(model.id), model.model]));
  const fieldsByModel = new Map();
  fields.forEach((field) => {
    const modelName = field.model_name || modelById.get(normalizeId(field.model_id));
    if (!modelName) return;
    if (!fieldsByModel.has(modelName)) fieldsByModel.set(modelName, []);
    fieldsByModel.get(modelName).push(field);
  });

  const viewsByModel = new Map();
  views.forEach((view) => {
    if (!view.model) return;
    if (!viewsByModel.has(view.model)) viewsByModel.set(view.model, []);
    viewsByModel.get(view.model).push(view);
  });

  const windowsByModel = new Map();
  windowActions.forEach((action) => {
    if (!action.res_model) return;
    if (!windowsByModel.has(action.res_model)) windowsByModel.set(action.res_model, []);
    windowsByModel.get(action.res_model).push(action);
  });

  const windowsByActionId = new Map(windowActions
    .filter((action) => action.action_id !== null && action.action_id !== undefined)
    .map((action) => [normalizeId(action.action_id), action]));
  const menusByModel = new Map();
  if (optionalAvailable.menus) {
    menus.forEach((menu) => {
      const action = optionalAvailable.windowActions
        ? windowsByActionId.get(normalizeId(menu.action_id))
        : null;
      const modelName = menu.web_path_model || action?.res_model;
      if (!modelName) return;
      if (!menusByModel.has(modelName)) menusByModel.set(modelName, []);
      menusByModel.get(modelName).push(menu);
    });
  }

  return models.map((model) => {
    const modelFields = fieldsByModel.get(model.model) || [];
    const modelViews = viewsByModel.get(model.model) || [];
    const activeViews = modelViews.filter((view) => view.active);
    const knownFields = new Set(modelFields.map((field) => field.name));
    const references = fieldRefsInViews(modelViews, knownFields);
    return {
      ...model,
      fields: modelFields,
      manualFields: modelFields.filter((field) => field.state === 'manual'),
      globalWidgets: modelFields.filter((field) => Boolean(field.display_widget)),
      placedFields: references.placed,
      viewWidgetFields: references.overrides,
      views: modelViews,
      activeViews,
      windowActions: windowsByModel.get(model.model) || [],
      menus: menusByModel.get(model.model) || [],
    };
  });
}

export default function DynamizationOverviewPage() {
  const { t } = useLanguage();
  const [data, setData] = useState({});
  const [unavailableSources, setUnavailableSources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [moduleFilter, setModuleFilter] = useState('all');
  const [selectedModelName, setSelectedModelName] = useState('');

  const loadOverview = useCallback(async () => {
    setLoading(true);
    setError('');
    const results = await Promise.allSettled(SOURCE_ENDPOINTS.map(([, endpoint]) => fetchAll(endpoint)));
    const nextData = {};
    const unavailable = [];
    results.forEach((result, index) => {
      const [key] = SOURCE_ENDPOINTS[index];
      if (result.status === 'fulfilled') nextData[key] = result.value;
      else {
        nextData[key] = null;
        unavailable.push(key);
      }
    });
    setData(nextData);
    setUnavailableSources(unavailable);
    if (!nextData.models || !nextData.fields || !nextData.views) {
      setError(t('Certaines sources principales sont inaccessibles. Vérifie les droits de lecture sur les modèles, champs et vues.'));
    }
    setLoading(false);
  }, [t]);

  useEffect(() => { loadOverview(); }, [loadOverview]);

  const models = data.models || EMPTY_ROWS;
  const fields = data.fields || EMPTY_ROWS;
  const views = data.views || EMPTY_ROWS;
  const menus = data.menus || EMPTY_ROWS;
  const menusAvailable = Array.isArray(data.menus);
  const windowActionsAvailable = Array.isArray(data.windowActions);
  const windowActions = data.windowActions || EMPTY_ROWS;
  const sourceAvailable = {
    models: Array.isArray(data.models), fields: Array.isArray(data.fields), views: Array.isArray(data.views),
    menus: Array.isArray(data.menus), actions: Array.isArray(data.actions), windowActions: Array.isArray(data.windowActions),
  };

  const summaryRows = useMemo(() => buildRows(models, fields, views, windowActions, menus, {
    menus: menusAvailable,
    windowActions: windowActionsAvailable,
  }), [
    models, fields, views, windowActions, menus, menusAvailable, windowActionsAvailable,
  ]);

  const moduleOptions = useMemo(() => Array.from(new Set(models.map((model) => String(model.modules || '').trim()).filter(Boolean)))
    .sort((a, b) => a.localeCompare(b, 'fr')), [models]);

  const filteredRows = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('fr');
    return summaryRows.filter((row) => {
      if (moduleFilter !== 'all' && row.modules !== moduleFilter) return false;
      if (!normalized) return true;
      return [row.name, row.model, row.modules, row.info]
        .some((value) => String(value || '').toLocaleLowerCase('fr').includes(normalized));
    });
  }, [summaryRows, query, moduleFilter]);

  const selectedModel = summaryRows.find((row) => row.model === selectedModelName) || null;
  const totals = useMemo(() => ({
    modelCount: models.length,
    fieldCount: fields.length,
    manualCount: fields.filter((field) => field.state === 'manual').length,
    activeViewCount: views.filter((view) => view.active).length,
    linkedMenuCount: menus.filter((menu) => (menu.action_id || menu.web_path) && !menu.is_hidden).length,
  }), [models, fields, views, menus]);

  const viewCountLabel = (row, type) => {
    if (!sourceAvailable.views) return '—';
    return countBy(row.activeViews, 'type', type);
  };

  const statusLabels = (row) => {
    if (!sourceAvailable.fields || !sourceAvailable.views) return t('Données partielles');
    if (row.activeViews.some((view) => ['form', 'tree'].includes(view.type))) return t('Vues actives enregistrées');
    if (row.fields.length) return t('Champs catalogués');
    return t('À configurer');
  };

  return (
    <main className="min-h-full bg-gray-50 p-4 md:p-6">
      <div className="mx-auto max-w-[1500px] space-y-5">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="rounded-lg bg-violet-100 p-2 text-violet-700"><FiActivity size={22} /></span>
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">{t('Bilan de dynamisation')}</h1>
              <p className="mt-1 text-sm text-gray-600">{t('Récapitulatif des modèles, champs, vues, actions et menus enregistrés dans les métadonnées du système.')}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/field-displays" className="inline-flex items-center gap-2 rounded-md border border-violet-200 bg-violet-50 px-3 py-2 text-sm text-violet-800 hover:bg-violet-100"><FiLayers /> {t('Rendus groupés')}</Link>
            <Link to="/model-fields" className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"><FiDatabase /> {t('Champs des modèles')}</Link>
            <Link to="/qweb-views" className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"><FiEye /> {t('Vues QWeb')}</Link>
            <button type="button" onClick={loadOverview} disabled={loading} className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"><FiRefreshCw className={loading ? 'animate-spin' : ''} /> {t('Actualiser')}</button>
          </div>
        </header>

        {error && <div role="alert" className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{error}</div>}
        {unavailableSources.length > 0 && !error && <div role="status" className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{t('Certaines sources secondaires sont indisponibles. Les valeurs correspondantes apparaissent comme non vérifiées.')}</div>}

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <SummaryCard icon={<FiLayers />} label={t('Modèles')} value={loading ? '…' : (sourceAvailable.models ? totals.modelCount : '—')} />
          <SummaryCard icon={<FiDatabase />} label={t('Définitions de champs')} value={loading ? '…' : (sourceAvailable.fields ? totals.fieldCount : '—')} detail={sourceAvailable.fields ? `${totals.manualCount} ${t('manuels')}` : ''} />
          <SummaryCard icon={<FiEye />} label={t('Vues actives')} value={loading ? '…' : (sourceAvailable.views ? totals.activeViewCount : '—')} />
          <SummaryCard icon={<FiActivity />} label={t('Actions fenêtre')} value={loading ? '…' : (sourceAvailable.windowActions ? windowActions.length : '—')} />
          <SummaryCard icon={<FiLayers />} label={t('Menus avec action')} value={loading ? '…' : (sourceAvailable.menus ? totals.linkedMenuCount : '—')} />
        </div>

        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm leading-relaxed text-blue-900">
          <strong>{t('Comment lire ce bilan')}</strong> — {t('Les champs « Base » sont synchronisés depuis les modèles Django ; les champs « Manuel » sont les définitions personnalisées. Les vues listées sont des configurations enregistrées dans IrUiView. Leur présence ne prouve pas à elle seule que chaque écran React les utilise déjà : le tableau sépare les métadonnées déclarées de leur branchement par vue, action ou menu.')}
        </div>

        <div className="grid min-w-0 gap-4 2xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,0.8fr)]">
          <section className="min-w-0 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 p-4">
              <div><h2 className="font-semibold text-gray-900">{t('État par modèle')}</h2><p className="mt-0.5 text-xs text-gray-500">{loading ? t('Chargement…') : `${filteredRows.length} ${t('modèle(s) affiché(s)')}`}</p></div>
              <div className="flex w-full flex-wrap gap-2 sm:w-auto">
                <label className="relative min-w-[220px] flex-1 sm:max-w-sm"><FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('Rechercher un modèle…')} className="w-full rounded-md border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500" /></label>
                <select aria-label={t('Filtrer par module')} value={moduleFilter} onChange={(event) => setModuleFilter(event.target.value)} className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700"><option value="all">{t('Tous les modules')}</option>{moduleOptions.map((module) => <option key={module} value={module}>{module}</option>)}</select>
              </div>
            </div>
            <div className="max-h-[68vh] overflow-auto">
              <table className="min-w-[1100px] divide-y divide-gray-200 text-left text-sm">
                <thead className="sticky top-0 z-10 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                  <tr><th className="px-3 py-3">{t('Modèle')}</th><th className="px-3 py-3">{t('Champs')}</th><th className="px-3 py-3">{t('Référencés en formulaire / liste')}</th><th className="px-3 py-3">{t('Vues actives')}</th><th className="px-3 py-3">{t('Actions / menus')}</th><th className="px-3 py-3">{t('État des métadonnées')}</th></tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loading && <tr><td colSpan="6" className="px-4 py-10 text-center text-gray-500">{t('Chargement des métadonnées…')}</td></tr>}
                  {!loading && filteredRows.map((row) => (
                    <tr key={row.id} onClick={() => setSelectedModelName(row.model)} className={`cursor-pointer align-top hover:bg-violet-50 ${row.model === selectedModelName ? 'bg-violet-50' : ''}`}>
                      <td className="px-3 py-3"><span className="block font-medium text-gray-900">{row.name || row.model}</span><span className="mt-1 block font-mono text-xs text-violet-800">{row.model}</span><span className="mt-1 block text-xs text-gray-500">{row.modules || '—'}</span></td>
                      <td className="px-3 py-3"><span className="font-semibold text-gray-900">{sourceAvailable.fields ? row.fields.length : '—'}</span><span className="mt-1 block text-xs text-gray-500">{sourceAvailable.fields ? `${row.manualFields.length} ${t('manuels')} · ${row.globalWidgets.length} ${t('rendus globaux')}` : t('Non disponible')}</span></td>
                      <td className="px-3 py-3">{sourceAvailable.views && sourceAvailable.fields ? <><span className="font-semibold text-gray-900">{row.placedFields.size} / {row.fields.length}</span><span className="mt-1 block text-xs text-gray-500">{row.viewWidgetFields.size} {t('rendu(s) spécifique(s) par vue')}</span></> : '—'}</td>
                      <td className="px-3 py-3">{sourceAvailable.views ? <div className="flex max-w-[240px] flex-wrap gap-1">{['form', 'tree', 'search', 'qweb'].map((type) => <span key={type} className="rounded bg-gray-100 px-1.5 py-1 text-xs text-gray-700">{t(VIEW_TYPE_LABELS[type])} {viewCountLabel(row, type)}</span>)}<span className="rounded bg-gray-100 px-1.5 py-1 text-xs text-gray-700">{t('Autres')} {row.activeViews.filter((view) => !['form', 'tree', 'search', 'qweb'].includes(view.type)).length}</span></div> : '—'}</td>
                      <td className="px-3 py-3"><span className="font-medium text-gray-900">{sourceAvailable.windowActions ? row.windowActions.length : '—'} / {sourceAvailable.menus ? row.menus.filter((menu) => !menu.is_hidden).length : '—'}</span><span className="mt-1 block text-xs text-gray-500">{t('actions fenêtre / menus visibles')}</span></td>
                      <td className="px-3 py-3"><span className={`inline-flex rounded-full px-2 py-1 text-xs ${row.activeViews.some((view) => ['form', 'tree'].includes(view.type)) ? 'bg-green-100 text-green-800' : row.fields.length ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-700'}`}>{statusLabels(row)}</span></td>
                    </tr>
                  ))}
                  {!loading && !filteredRows.length && <tr><td colSpan="6" className="px-4 py-10 text-center text-gray-500">{t('Aucun modèle ne correspond à la recherche.')}</td></tr>}
                </tbody>
              </table>
            </div>
          </section>

          <aside className="min-w-0 rounded-xl border border-gray-200 bg-white shadow-sm">
            {!selectedModel ? <div className="flex min-h-56 flex-col items-center justify-center p-6 text-center text-sm text-gray-500"><FiEye size={26} className="mb-2 text-gray-400" />{t('Sélectionne un modèle dans le tableau pour voir le détail des champs et des vues.')}</div> : (
              <>
                <header className="border-b border-gray-200 p-4"><p className="text-xs font-medium uppercase tracking-wide text-violet-700">{t('Détail du modèle')}</p><h2 className="mt-1 text-lg font-semibold text-gray-900">{selectedModel.name}</h2><p className="mt-1 break-all font-mono text-xs text-gray-500">{selectedModel.model}</p><p className="mt-1 text-xs text-gray-500">{selectedModel.info || t('Aucune description enregistrée.')}</p></header>
                <div className="space-y-4 p-4">
                  <section><h3 className="text-sm font-semibold text-gray-900">{t('Champs')}</h3><p className="mt-1 text-xs text-gray-500">{selectedModel.fields.length} {t('définitions')} · {selectedModel.manualFields.length} {t('manuels')} · {selectedModel.placedFields.size} {t('référencés dans une vue formulaire ou liste')}</p><div className="mt-2 flex flex-wrap gap-1">{selectedModel.manualFields.slice(0, 20).map((field) => <span key={field.id} className="rounded bg-amber-50 px-2 py-1 font-mono text-[11px] text-amber-900" title={field.field_description}>{field.name}</span>)}{selectedModel.manualFields.length > 20 && <span className="px-2 py-1 text-xs text-gray-500">+{selectedModel.manualFields.length - 20}</span>}{!selectedModel.manualFields.length && <span className="text-xs text-gray-500">{t('Aucun champ manuel')}</span>}</div><Link to={`/model-fields?model_id=${encodeURIComponent(selectedModel.id)}`} className="mt-2 inline-block text-xs font-medium text-violet-700 hover:underline">{t('Ouvrir les champs du modèle')} →</Link></section>
                  <section><h3 className="text-sm font-semibold text-gray-900">{t('Vues enregistrées')}</h3>{selectedModel.views.length ? <ul className="mt-2 max-h-44 space-y-2 overflow-auto">{selectedModel.views.map((view) => <li key={view.id} className="flex items-start justify-between gap-2 rounded-md border border-gray-100 p-2 text-xs"><span className="min-w-0"><span className="block break-words font-medium text-gray-800">{view.name}</span><span className="mt-0.5 block text-gray-500">{t(VIEW_TYPE_LABELS[view.type] || view.type)} · {view.mode === 'extension' ? t('Extension') : t('Primaire')} · {t('priorité')} {view.priority}</span></span><span className={`shrink-0 rounded-full px-2 py-0.5 ${view.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>{view.active ? t('Actif') : t('Inactif')}</span></li>)}</ul> : <p className="mt-2 text-xs text-gray-500">{sourceAvailable.views ? t('Aucune vue enregistrée pour ce modèle.') : t('Source des vues non disponible.')}</p>}</section>
                  <section><h3 className="text-sm font-semibold text-gray-900">{t('Navigation')}</h3><p className="mt-1 text-xs text-gray-500">{sourceAvailable.windowActions ? `${selectedModel.windowActions.length} ${t('action(s) fenêtre')}` : t('Actions non disponibles')} · {sourceAvailable.menus ? `${selectedModel.menus.length} ${t('menu(s) lié(s)')}` : t('Menus non vérifiables')}</p>{selectedModel.menus.length > 0 && <ul className="mt-2 space-y-1">{selectedModel.menus.map((menu) => <li key={menu.id} className="text-xs text-gray-700">• {menu.complete_name || menu.name}{menu.web_path ? ` → ${menu.web_path}` : ''}{menu.is_hidden ? ` (${t('masqué')})` : ''}</li>)}</ul>}</section>
                  {!sourceAvailable.actions && <p className="rounded bg-amber-50 p-2 text-xs text-amber-900">{t('Le registre des actions génériques n’a pas pu être lu ; les liens de menus reposent sur les actions fenêtre accessibles.')}</p>}
                </div>
              </>
            )}
          </aside>
        </div>

        <footer className="text-xs leading-relaxed text-gray-500">{t('Sources consultées')}: IrModel, IrModelFields, IrUiView, IrAction, IrActionsActWindow, IrUiMenu. {t('Une valeur « — » signale une source inaccessible ou non vérifiée, pas un total égal à zéro.')}</footer>
      </div>
    </main>
  );
}

function SummaryCard({ icon, label, value, detail }) {
  return <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"><div className="flex items-center justify-between gap-2"><p className="text-sm text-gray-500">{label}</p><span className="text-violet-600">{icon}</span></div><p className="mt-2 text-2xl font-semibold text-gray-900">{value}</p>{detail && <p className="mt-1 text-xs text-gray-500">{detail}</p>}</div>;
}
