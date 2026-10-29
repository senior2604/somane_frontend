import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiAlertCircle, FiCheckCircle, FiCode, FiDatabase, FiLayers, FiRefreshCw, FiSearch } from 'react-icons/fi';
import { apiClient } from '../../services/apiClient';
import { useLanguage } from '../../context/LanguageContext';
import { useUi } from '../../context/UiContext';
import { readDeveloperMode, subscribeDeveloperMode } from '../../services/developerMode';
import { FIELD_DISPLAY_OPTIONS, getFieldDisplayOptionsForView, getGlobalFieldDisplayOptions } from '../../services/fieldDisplay';
import WidgetOptionsEditor from '../../components/WidgetOptionsEditor';

const ALL_MODELS = 'all';
const MIXED_WIDGETS = '__mixed_widgets__';
const TYPE_LABELS = {
  char: 'Texte court', text: 'Texte long', integer: 'Entier', float: 'Décimal', decimal: 'Décimal',
  boolean: 'Oui / Non', date: 'Date', datetime: 'Date et heure', monetary: 'Monétaire',
  selection: 'Liste de choix', many2one: 'Relation simple', one2many: 'Relation en lignes',
  many2many: 'Relation multiple', reference: 'Référence', binary: 'Fichier', html: 'HTML', json: 'JSON',
};

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

function groupKey(name, type) {
  return name + '|' + type;
}

function currentWidgetLabel(group, translate) {
  const widgets = Array.from(new Set(group.occurrences.map((field) => field.display_widget || '')));
  if (widgets.length > 1) return translate('Rendus différents');
  return widgetLabel(group.ttype, widgets[0] || '', translate);
}

function widgetLabel(fieldType, widget, translate) {
  const label = (FIELD_DISPLAY_OPTIONS[fieldType] || []).find(([value]) => value === widget)?.[1] || 'Par défaut';
  return translate(label);
}

function buildFieldGroups(fields, models) {
  const modelNames = new Map(models.map((model) => [String(model.id), model.model]));
  const groups = new Map();
  fields.forEach((field) => {
    if (!field.name || !field.ttype) return;
    const key = groupKey(field.name, field.ttype);
    if (!groups.has(key)) groups.set(key, { key, name: field.name, ttype: field.ttype, occurrences: [] });
    groups.get(key).occurrences.push({
      ...field,
      modelKey: field.model_name || modelNames.get(String(field.model_id)) || '',
    });
  });
  return Array.from(groups.values()).map((group) => {
    const occurrences = group.occurrences.sort((a, b) => a.modelKey.localeCompare(b.modelKey, 'fr'));
    const labels = Array.from(new Set(occurrences.map((field) => field.field_description).filter(Boolean)));
    return {
      ...group,
      occurrences,
      label: labels[0] || group.name,
      labels,
      modelCount: new Set(occurrences.map((field) => field.modelKey)).size,
    };
  }).sort((a, b) => a.name.localeCompare(b.name, 'fr') || a.ttype.localeCompare(b.ttype, 'fr'));
}

function viewPlacementsByModelAndField(views) {
  const result = new Map();
  if (typeof DOMParser === 'undefined') return result;
  views.filter((view) => view.active && ['form', 'tree'].includes(view.type)
    && (view.mode || 'primary') === 'primary' && !view.inherit_id).forEach((view) => {
    const document = new DOMParser().parseFromString(view.arch_db || '', 'application/xml');
    if (document.querySelector('parsererror')) return;
    document.querySelectorAll('field[name]').forEach((node) => {
      const name = node.getAttribute('name');
      if (!name) return;
      const key = view.model + '|' + name;
      if (!result.has(key)) result.set(key, []);
      const placement = result.get(key).find((item) => String(item.id) === String(view.id));
      const widget = node.getAttribute('widget') || '';
      let widgetOptions = {};
      try {
        const parsed = JSON.parse(node.getAttribute('options') || '{}');
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) widgetOptions = parsed;
      } catch { widgetOptions = {}; }
      const widgetAttributes = {};
      Array.from(node.attributes).forEach((attribute) => {
        if (!['name', 'widget', 'options', 'string', 'help', 'required', 'readonly', 'invisible'].includes(attribute.name)) {
          widgetAttributes[attribute.name] = attribute.value;
        }
      });
      if (placement) {
        if (!placement.widgets.includes(widget)) placement.widgets.push(widget);
      } else {
        result.get(key).push({
          id: view.id,
          name: view.name,
          type: view.type,
          widgets: [widget],
          widgetOptions,
          widgetAttributes,
        });
      }
    });
  });
  result.forEach((placements) => placements.forEach((placement) => {
    placement.widget = placement.widgets.length === 1 ? placement.widgets[0] : MIXED_WIDGETS;
  }));
  return result;
}

function errorMessage(exception, fallback) {
  const data = exception?.data;
  if (data?.detail) return data.detail;
  if (data && typeof data === 'object') {
    const first = Object.values(data).flat(Infinity).find((value) => typeof value === 'string');
    if (first) return first;
  }
  return exception?.message || fallback;
}

export default function FieldDisplayBatchPage() {
  const { t } = useLanguage();
  const { security, reload: reloadUi } = useUi();
  const isAdministrator = Boolean(security?.user?.is_superuser);
  const currentUserId = security?.user?.id || security?.user?.user_id || null;
  const [developerMode, setDeveloperMode] = useState(false);
  const [fields, setFields] = useState([]);
  const [models, setModels] = useState([]);
  const [views, setViews] = useState([]);
  const [localViewWidgetOverrides, setLocalViewWidgetOverrides] = useState({});
  const [viewConfigDrafts, setViewConfigDrafts] = useState({});
  const [viewsAvailable, setViewsAvailable] = useState(true);
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [pageSize, setPageSize] = useState(20);
  const [page, setPage] = useState(1);
  const [selectedGroupKey, setSelectedGroupKey] = useState('');
  const [selectedModelId, setSelectedModelId] = useState(ALL_MODELS);
  const [displayWidget, setDisplayWidget] = useState('');
  const [displayWidgetConfig, setDisplayWidgetConfig] = useState({ options: {}, attributes: {} });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingPlacementKey, setSavingPlacementKey] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [reloadSequence, setReloadSequence] = useState(0);

  useEffect(() => {
    if (!isAdministrator || !currentUserId) {
      setDeveloperMode(false);
      return undefined;
    }
    setDeveloperMode(readDeveloperMode(currentUserId));
    return subscribeDeveloperMode(currentUserId, setDeveloperMode);
  }, [currentUserId, isAdministrator]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    const [modelsResult, fieldsResult, viewsResult] = await Promise.allSettled([
      fetchAll('/ir-models/'), fetchAll('/ir-model-fields/'), fetchAll('/ir-views/'),
    ]);
    if (modelsResult.status === 'rejected' || fieldsResult.status === 'rejected') {
      const failure = modelsResult.status === 'rejected' ? modelsResult.reason : fieldsResult.reason;
      setError(errorMessage(failure, t('Impossible de charger les modèles et les champs.')));
      setLoading(false);
      return;
    }
    setModels(modelsResult.value);
    setFields(fieldsResult.value);
    if (viewsResult.status === 'fulfilled') {
      setViews(viewsResult.value);
      setViewsAvailable(true);
    } else {
      setViews([]);
      setViewsAvailable(false);
    }
    setLoading(false);
  }, [t]);

  useEffect(() => { loadData(); }, [loadData, reloadSequence]);

  const groups = useMemo(() => buildFieldGroups(fields, models), [fields, models]);
  const filteredGroups = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('fr');
    return groups.filter((group) => {
      if (typeFilter !== 'all' && group.ttype !== typeFilter) return false;
      if (!normalized) return true;
      return [group.name, group.ttype, ...group.labels, ...group.occurrences.map((field) => field.modelKey)]
        .some((value) => String(value || '').toLocaleLowerCase('fr').includes(normalized));
    });
  }, [groups, query, typeFilter]);
  const pageCount = Math.max(1, Math.ceil(filteredGroups.length / pageSize));
  const visibleGroups = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredGroups.slice(start, start + pageSize);
  }, [filteredGroups, page, pageSize]);
  useEffect(() => { setPage(1); }, [query, typeFilter, pageSize]);
  useEffect(() => { if (page > pageCount) setPage(pageCount); }, [page, pageCount]);
  const selectedGroup = filteredGroups.find((group) => group.key === selectedGroupKey) || null;
  const modelOptions = useMemo(() => {
    if (!selectedGroup) return [];
    const unique = new Map();
    selectedGroup.occurrences.forEach((field) => unique.set(String(field.model_id), field.modelKey));
    return Array.from(unique.entries()).sort((a, b) => a[1].localeCompare(b[1], 'fr'));
  }, [selectedGroup]);
  const targetOccurrences = useMemo(() => {
    if (!selectedGroup) return [];
    if (selectedModelId === ALL_MODELS) return selectedGroup.occurrences;
    return selectedGroup.occurrences.filter((field) => String(field.model_id) === selectedModelId);
  }, [selectedGroup, selectedModelId]);
  const viewPlacements = useMemo(() => {
    const placements = viewPlacementsByModelAndField(views);
    placements.forEach((viewList, modelFieldKey) => viewList.forEach((view) => {
      const localKey = `${modelFieldKey}|${view.id}`;
      if (Object.prototype.hasOwnProperty.call(localViewWidgetOverrides, localKey)) {
        view.widget = localViewWidgetOverrides[localKey] || '';
      }
    }));
    return placements;
  }, [views, localViewWidgetOverrides]);
  const widgetOptions = selectedGroup ? getGlobalFieldDisplayOptions(selectedGroup.ttype) : [];
  const hasViewOverrides = viewsAvailable && targetOccurrences.some((field) => (
    (viewPlacements.get(field.modelKey + '|' + field.name) || []).some((view) => view.widget)
  ));
  const canApply = isAdministrator && developerMode && !saving && widgetOptions.length > 1
    && targetOccurrences.length > 0 && displayWidget !== MIXED_WIDGETS;

  const selectGroup = (key) => {
    const group = filteredGroups.find((item) => item.key === key);
    const groupIndex = filteredGroups.findIndex((item) => item.key === key);
    if (groupIndex >= 0) setPage(Math.floor(groupIndex / pageSize) + 1);
    setSelectedGroupKey(key);
    setSelectedModelId(ALL_MODELS);
    const widgets = Array.from(new Set((group?.occurrences || []).map((field) => field.display_widget || '')));
    setDisplayWidget(widgets.length === 1 ? widgets[0] : widgets.length ? MIXED_WIDGETS : '');
    const configs = (group?.occurrences || []).map((field) => JSON.stringify(field.display_widget_options || { options: {}, attributes: {} }));
    setDisplayWidgetConfig(configs.length && configs.every((item) => item === configs[0])
      ? (group.occurrences[0].display_widget_options || { options: {}, attributes: {} })
      : { options: {}, attributes: {} });
    setNotice('');
    setError('');
  };

  const selectModel = (modelId) => {
    setSelectedModelId(modelId);
    const occurrences = modelId === ALL_MODELS
      ? (selectedGroup?.occurrences || [])
      : (selectedGroup?.occurrences || []).filter((field) => String(field.model_id) === modelId);
    const widgets = Array.from(new Set(occurrences.map((field) => field.display_widget || '')));
    setDisplayWidget(widgets.length === 1 ? widgets[0] : widgets.length ? MIXED_WIDGETS : '');
    const configs = occurrences.map((field) => JSON.stringify(field.display_widget_options || { options: {}, attributes: {} }));
    setDisplayWidgetConfig(configs.length && configs.every((item) => item === configs[0])
      ? (occurrences[0]?.display_widget_options || { options: {}, attributes: {} })
      : { options: {}, attributes: {} });
  };

  const updateViewWidget = async (field, view, widget, config = null) => {
    if (!isAdministrator || !developerMode) return;
    const savingKey = `${field.id}:${view.id}`;
    setSavingPlacementKey(savingKey);
    setError('');
    setNotice('');
    try {
      const nextConfig = config || viewConfigDrafts[`${field.modelKey}|${field.name}|${view.id}`]
        || { options: view.widgetOptions || {}, attributes: view.widgetAttributes || {} };
      const currentAttributes = view.widgetAttributes || {};
      const nextAttributes = nextConfig.attributes || {};
      const response = await apiClient.patch(`/ir-model-fields/${field.id}/set-view-widget/`, {
        view_id: view.id,
        widget,
        options: nextConfig.options || {},
        attributes: nextAttributes,
        clear_attributes: Object.keys(currentAttributes).filter((name) => !(name in nextAttributes)),
      });
      setViews((current) => current.map((item) => String(item.id) === String(response.view_id)
        ? { ...item, arch_db: response.arch_db }
        : item));
      setLocalViewWidgetOverrides((current) => ({
        ...current,
        [`${field.modelKey}|${field.name}|${view.id}`]: widget,
      }));
      setViewConfigDrafts((current) => {
        const next = { ...current };
        delete next[`${field.modelKey}|${field.name}|${view.id}`];
        return next;
      });
      setNotice(t('Rendu de vue mis à jour dans « {view} ».').replace('{view}', view.name));
      if (reloadUi) {
        try {
          await reloadUi();
        } catch {
          setNotice(t('Rendu enregistré. Actualise la page pour recharger la configuration active.'));
        }
      }
    } catch (exception) {
      setError(errorMessage(exception, t('Impossible de modifier ce rendu pour cette vue.')));
    } finally {
      setSavingPlacementKey('');
    }
  };

  const applyWidget = async () => {
    if (!selectedGroup || !canApply) return;
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const config = displayWidgetConfig && typeof displayWidgetConfig === 'object'
        ? displayWidgetConfig : { options: {}, attributes: {} };
      const payload = {
        name: selectedGroup.name,
        ttype: selectedGroup.ttype,
        display_widget: displayWidget,
        display_widget_options: config,
      };
      if (selectedModelId !== ALL_MODELS) payload.model_ids = [Number(selectedModelId)];
      const response = await apiClient.patch('/ir-model-fields/apply-display-widget/', payload);
      const modelsCount = new Set(response.models || []).size;
      setNotice(t('Rendu appliqué à {count} occurrence(s) répartie(s) dans {models} modèle(s).')
        .replace('{count}', String(response.updated_count || 0))
        .replace('{models}', String(modelsCount)));
      setReloadSequence((sequence) => sequence + 1);
    } catch (exception) {
      setError(errorMessage(exception, t('Impossible d’appliquer ce rendu.')));
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-full bg-gray-50 p-4 md:p-6">
      <div className="mx-auto max-w-[1450px] space-y-5">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="rounded-lg bg-violet-100 p-2 text-violet-700"><FiLayers size={22} /></span>
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">{t('Rendus groupés des champs')}</h1>
              <p className="mt-1 text-sm text-gray-600">{t('Choisis un champ pour modifier son rendu global, par modèle ou dans une vue précise.')}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/model-fields" className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"><FiDatabase /> {t('Champs des modèles')}</Link>
            <button type="button" onClick={() => setReloadSequence((sequence) => sequence + 1)} disabled={loading} className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"><FiRefreshCw className={loading ? 'animate-spin' : ''} /> {t('Actualiser')}</button>
          </div>
        </header>

        {error && <div role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>}
        {notice && <div role="status" className="flex items-start gap-2 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800"><FiCheckCircle className="mt-0.5 shrink-0" />{notice}</div>}

        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm leading-relaxed text-blue-900">
          <strong>{t('Rendu global')}</strong> — {t('La modification met à jour les définitions de champ correspondantes dans IrModelFields. Les rendus configurés directement dans une vue IrUiView restent prioritaires et ne sont pas écrasés.')}
        </div>

        {!isAdministrator && <div role="status" className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{t('La modification groupée est réservée à un administrateur système.')}</div>}
        {isAdministrator && !developerMode && <div role="status" className="rounded-md border border-violet-200 bg-violet-50 p-3 text-sm text-violet-900"><FiCode className="mr-2 inline" />{t('Active le mode développeur depuis le menu de ton profil pour modifier les rendus.')}</div>}
        {!viewsAvailable && <div role="status" className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"><FiAlertCircle className="mr-2 inline" />{t('Les vues sont inaccessibles ; les exceptions propres aux vues ne peuvent pas être vérifiées.')}</div>}

        <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm md:p-5">
          <div className="grid gap-4 lg:grid-cols-[minmax(220px,1fr)_220px_minmax(320px,1.4fr)]">
            <label className="block text-sm font-medium text-gray-700">
              {t('Rechercher un champ')}
              <span className="relative mt-1 block"><FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('Nom technique, libellé ou modèle…')} className="w-full rounded-md border border-gray-300 py-2 pl-9 pr-3 font-normal focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500" /></span>
            </label>
            <label className="block text-sm font-medium text-gray-700">{t('Type de champ')}
              <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 font-normal">
                <option value="all">{t('Tous les types')}</option>
                {Array.from(new Set(groups.map((group) => group.ttype))).sort().map((type) => <option key={type} value={type}>{t(TYPE_LABELS[type] || type)}</option>)}
              </select>
            </label>
            <label className="block text-sm font-medium text-gray-700">{t('Champ à modifier')} {loading && <span className="font-normal text-gray-500">— {t('Chargement…')}</span>}
              <select value={selectedGroupKey} onChange={(event) => selectGroup(event.target.value)} disabled={loading} className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 font-normal disabled:bg-gray-100">
                <option value="">{t('Sélectionne un champ ({count} résultats)').replace('{count}', String(filteredGroups.length))}</option>
                {filteredGroups.map((group) => <option key={group.key} value={group.key}>{group.label} ({group.name}) — {group.modelCount} {t('modèle(s)')}</option>)}
              </select>
            </label>
          </div>
          {selectedGroup && <div className="mt-4 grid gap-4 border-t border-gray-100 pt-4 md:grid-cols-[minmax(220px,1fr)_minmax(260px,1.4fr)]">
            <div><label className="block text-sm font-medium text-gray-700">{t('Modèles concernés')}</label>
              <select value={selectedModelId} onChange={(event) => selectModel(event.target.value)} className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm">
                <option value={ALL_MODELS}>{t('Tous les modèles')} ({modelOptions.length})</option>
                {modelOptions.map(([id, modelName]) => <option key={id} value={id}>{modelName}</option>)}
              </select>
            </div>
            <div className="flex flex-wrap items-end gap-3 text-sm text-gray-600">
              <span className="rounded-md bg-gray-100 px-3 py-2"><strong className="text-gray-900">{targetOccurrences.length}</strong> {t('occurrence(s) ciblée(s)')}</span>
              <span className="rounded-md bg-gray-100 px-3 py-2"><strong className="text-gray-900">{new Set(targetOccurrences.map((field) => field.modelKey)).size}</strong> {t('modèle(s) ciblé(s)')}</span>
              {viewsAvailable && <span className={hasViewOverrides ? 'rounded-md bg-amber-50 px-3 py-2 text-amber-800' : 'rounded-md bg-gray-100 px-3 py-2'}><strong>{targetOccurrences.reduce((total, field) => total + (viewPlacements.get(field.modelKey + '|' + field.name) || []).filter((view) => Boolean(view.widget)).length, 0)}</strong> {t('exception(s) de vue')}</span>}
            </div>
          </div>}
        </section>

        <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 px-4 py-3 md:px-5">
            <div>
              <h2 className="font-semibold text-gray-900">{t('Champs disponibles')}</h2>
              <p className="mt-1 text-sm text-gray-500">{t('{count} champ(s) trouvé(s)').replace('{count}', String(filteredGroups.length))}</p>
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-600">
              {t('Lignes par page')}
              <select value={pageSize} onChange={(event) => setPageSize(Number(event.target.value))} className="rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-800">
                <option value={20}>20</option>
                <option value={30}>30</option>
              </select>
            </label>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                <tr><th className="px-4 py-3">{t('Champ')}</th><th className="px-4 py-3">{t('Type de champ')}</th><th className="px-4 py-3">{t('Modèles')}</th><th className="px-4 py-3">{t('Occurrences')}</th><th className="px-4 py-3">{t('Rendu global actuel')}</th><th className="px-4 py-3">{t('Action')}</th></tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {visibleGroups.map((group) => (
                  <tr key={group.key} className={selectedGroupKey === group.key ? 'bg-violet-50' : 'hover:bg-gray-50'}>
                    <td className="px-4 py-3">
                      <span className="block font-medium text-gray-900">{group.label}</span>
                      <code className="text-xs text-gray-500">{group.name}</code>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-700">{t(TYPE_LABELS[group.ttype] || group.ttype)}</td>
                    <td className="px-4 py-3 text-gray-700">{group.modelCount}</td>
                    <td className="px-4 py-3 text-gray-700">{group.occurrences.length}</td>
                    <td className="px-4 py-3 text-gray-700">{currentWidgetLabel(group, t)}</td>
                    <td className="px-4 py-3">
                      <button type="button" onClick={() => selectGroup(group.key)} className="rounded-md border border-violet-200 px-3 py-1.5 text-sm font-medium text-violet-800 hover:bg-violet-50">{t('Configurer')}</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!loading && visibleGroups.length === 0 && <p className="p-5 text-sm text-gray-500">{t('Aucun champ ne correspond à ces critères.')}</p>}
            {loading && <p className="p-5 text-sm text-gray-500">{t('Chargement…')}</p>}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 px-4 py-3 text-sm text-gray-600 md:px-5">
            <span>{t('Page {page} sur {pages}').replace('{page}', String(page)).replace('{pages}', String(pageCount))}</span>
            <div className="flex gap-2">
              <button type="button" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={page <= 1} className="rounded-md border border-gray-300 px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-50">{t('Précédent')}</button>
              <button type="button" onClick={() => setPage((value) => Math.min(pageCount, value + 1))} disabled={page >= pageCount || !filteredGroups.length} className="rounded-md border border-gray-300 px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-50">{t('Suivant')}</button>
            </div>
          </div>
        </section>

        {selectedGroup && <>
          <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-200 px-4 py-3 md:px-5">
              <h2 className="font-semibold text-gray-900">{selectedGroup.label} <code className="ml-1 rounded bg-gray-100 px-1.5 py-0.5 text-sm font-normal text-gray-700">{selectedGroup.name}</code></h2>
              <p className="mt-1 text-sm text-gray-500">{t(TYPE_LABELS[selectedGroup.ttype] || selectedGroup.ttype)} · {t('{count} occurrence(s) au total').replace('{count}', String(selectedGroup.occurrences.length))}</p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-600"><tr><th className="px-4 py-3">{t('Modèle')}</th><th className="px-4 py-3">{t('Libellé')}</th><th className="px-4 py-3">{t('Origine')}</th><th className="px-4 py-3">{t('Rendu global actuel')}</th><th className="px-4 py-3">{t('Rendus spécifiques aux vues')}</th></tr></thead>
                <tbody className="divide-y divide-gray-100">
                  {targetOccurrences.map((field) => {
                    const placements = viewPlacements.get(field.modelKey + '|' + field.name) || [];
                    const optionLabel = (FIELD_DISPLAY_OPTIONS[field.ttype] || []).find(([value]) => value === (field.display_widget || ''))?.[1] || 'Par défaut';
                    return <tr key={field.id} className="hover:bg-gray-50">
                      <td className="whitespace-nowrap px-4 py-3 font-medium text-gray-900">{field.modelKey || '#' + field.model_id}</td>
                      <td className="px-4 py-3 text-gray-700">{field.field_description || field.name}</td>
                      <td className="px-4 py-3 text-gray-600">{field.state === 'manual' ? t('Manuel') : t('Base')}</td>
                      <td className="px-4 py-3 text-gray-700">{t(optionLabel)}</td>
                      <td className="min-w-72 px-4 py-3">
                        {!viewsAvailable ? '—' : placements.length ? <div className="space-y-3">
                          {placements.map((view) => {
                            const savingKey = `${field.id}:${view.id}`;
                            const configKey = `${field.modelKey}|${field.name}|${view.id}`;
                            const viewOptions = getFieldDisplayOptionsForView(field.ttype, view.type);
                            const widgetValue = view.widget || '';
                            const effectiveWidget = widgetValue === MIXED_WIDGETS ? '' : (widgetValue || field.display_widget || '');
                            const viewConfig = viewConfigDrafts[configKey] || { options: view.widgetOptions || {}, attributes: view.widgetAttributes || {} };
                            const savedViewConfig = { options: view.widgetOptions || {}, attributes: view.widgetAttributes || {} };
                            const viewConfigChanged = JSON.stringify(viewConfig) !== JSON.stringify(savedViewConfig);
                            const effectiveLabel = widgetValue === MIXED_WIDGETS
                              ? t('Rendus différents')
                              : widgetLabel(field.ttype, effectiveWidget, t);
                            return <div key={view.id} className="min-w-64 rounded-md border border-gray-100 bg-gray-50 p-2">
                              <div className="mb-1 text-xs font-medium text-gray-700">{t(view.type === 'tree' ? 'Liste' : 'Formulaire')} · {view.name}</div>
                              {isAdministrator && developerMode && viewOptions.length > 1 ? <select
                                aria-label={`${t('Rendu de la vue')} — ${view.name}`}
                                value={widgetValue}
                                disabled={savingPlacementKey === savingKey}
                                onChange={(event) => updateViewWidget(field, view, event.target.value, { options: {}, attributes: {} })}
                                className="w-full rounded border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-800 disabled:bg-gray-100"
                              >
                                {widgetValue === MIXED_WIDGETS && <option value={MIXED_WIDGETS} disabled>{t('Rendus différents — choisis une valeur')}</option>}
                                <option value="">{t('Utiliser le rendu global')} ({widgetLabel(field.ttype, field.display_widget, t)})</option>
                                {viewOptions.filter(([value]) => value).map(([value, label]) => <option key={value} value={value}>{t(label)}</option>)}
                              </select> : <span className="text-xs text-gray-600">{t('Rendu effectif :')} {effectiveLabel}</span>}
                              {isAdministrator && developerMode && <div className="mt-2 space-y-2">
                                <WidgetOptionsEditor
                                  widget={effectiveWidget || field.ttype}
                                  fieldType={field.ttype}
                                  value={viewConfig}
                                  fields={fields.filter((item) => item.model_id === field.model_id)}
                                  title={t('Options propres à cette vue')}
                                  disabled={savingPlacementKey === savingKey}
                                  onChange={(value) => setViewConfigDrafts((current) => ({ ...current, [configKey]: value }))}
                                />
                                {viewConfigChanged && <div className="flex justify-end"><button type="button" disabled={savingPlacementKey === savingKey} onClick={() => updateViewWidget(field, view, widgetValue, viewConfig)} className="rounded-md bg-violet-700 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50">{savingPlacementKey === savingKey ? t('Enregistrement…') : t('Enregistrer les options de cette vue')}</button></div>}
                              </div>}
                            </div>;
                          })}
                        </div> : <span className="text-xs text-gray-500">{t('Aucune vue principale active ne contient ce champ.')}</span>}
                      </td>
                    </tr>;
                  })}
                </tbody>
              </table>
              {!targetOccurrences.length && <p className="p-5 text-sm text-gray-500">{t('Aucune occurrence trouvée pour ce modèle.')}</p>}
            </div>
          </section>

          <section className="grid gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm md:grid-cols-[minmax(260px,1fr)_auto] md:items-end md:p-5">
            <label className="block text-sm font-medium text-gray-700">{t('Nouveau rendu global')}
              <select value={displayWidget} onChange={(event) => { setDisplayWidget(event.target.value); setDisplayWidgetConfig({ options: {}, attributes: {} }); }} disabled={!isAdministrator || !developerMode || widgetOptions.length <= 1} className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 disabled:bg-gray-100">
                {displayWidget === MIXED_WIDGETS && <option value={MIXED_WIDGETS} disabled>{t('Rendus actuels différents — choisis une valeur')}</option>}
                {widgetOptions.map(([value, label]) => <option key={value || 'default'} value={value}>{t(label)}</option>)}
              </select>
              {widgetOptions.length <= 1 && <span className="mt-1 block text-xs font-normal text-gray-500">{t('Ce type de champ ne propose pas plusieurs rendus.')}</span>}
            </label>
            <button type="button" onClick={applyWidget} disabled={!canApply} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-violet-700 px-4 py-2 text-sm font-medium text-white hover:bg-violet-800 disabled:cursor-not-allowed disabled:opacity-50"><FiCheckCircle />{saving ? t('Enregistrement…') : t('Appliquer à {count} occurrence(s)').replace('{count}', String(targetOccurrences.length))}</button>
            <div className="md:col-span-2"><WidgetOptionsEditor widget={displayWidget === MIXED_WIDGETS ? '' : (displayWidget || selectedGroup.ttype)} fieldType={selectedGroup.ttype} value={displayWidgetConfig} fields={fields.filter((field) => field.ttype === selectedGroup.ttype && field.name === selectedGroup.name)} disabled={!isAdministrator || !developerMode || displayWidget === MIXED_WIDGETS || saving} onChange={setDisplayWidgetConfig} /></div>
          </section>
        </>}
      </div>
    </main>
  );
}
