import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FiEdit2, FiMenu, FiPlus, FiRefreshCw, FiSave, FiSearch, FiX } from 'react-icons/fi';
import { apiClient } from '../../services/apiClient';
import { useUi } from '../../context/UiContext';
import { useLanguage } from '../../context/LanguageContext';
import { can } from '../../services/securityAccess';

const EMPTY_FORM = {
  name: '', sequence: 10, parent_id: '', app_id: '', web_icon: '',
  destination_type: 'group', web_path: '', web_path_model: '', action_id: '',
  groups_id: [], is_hidden: false,
};

function rowsOf(payload) {
  if (Array.isArray(payload)) return payload;
  return Array.isArray(payload?.results) ? payload.results : [];
}

async function fetchAll(endpoint) {
  const all = [];
  let page = 1;
  let next = true;
  while (next) {
    const payload = await apiClient.get(endpoint, { params: { page } });
    all.push(...rowsOf(payload));
    next = Boolean(payload?.next);
    page += 1;
    if (page > 200) throw new Error('Trop de pages dans la réponse du serveur.');
  }
  return all;
}

function formatMenuName(menu, byId) {
  if (menu.complete_name) return menu.complete_name;
  const labels = [menu.name];
  let parentId = menu.parent_id;
  const seen = new Set([String(menu.id)]);
  while (parentId && !seen.has(String(parentId))) {
    seen.add(String(parentId));
    const parent = byId.get(String(parentId));
    if (!parent) break;
    labels.unshift(parent.name);
    parentId = parent.parent_id;
  }
  return labels.join(' / ');
}

function descendantsOf(menuId, menus) {
  const result = new Set([String(menuId)]);
  let changed = true;
  while (changed) {
    changed = false;
    menus.forEach((menu) => {
      if (result.has(String(menu.parent_id)) && !result.has(String(menu.id))) {
        result.add(String(menu.id));
        changed = true;
      }
    });
  }
  return result;
}

export default function MenusPage() {
  const { security, reload } = useUi();
  const { t } = useLanguage();
  const [menus, setMenus] = useState([]);
  const [groups, setGroups] = useState([]);
  const [modules, setModules] = useState([]);
  const [actions, setActions] = useState([]);
  const [models, setModels] = useState([]);
  const [query, setQuery] = useState('');
  const [moduleFilter, setModuleFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const isSuperuser = Boolean(security?.user?.is_superuser);
  const canCreate = can(security, 'core.IrUiMenu', 'create') || isSuperuser;
  const canUpdate = can(security, 'core.IrUiMenu', 'write') || isSuperuser;
  const canEditForm = selectedId ? canUpdate : canCreate;
  const byId = useMemo(() => new Map(menus.map((menu) => [String(menu.id), menu])), [menus]);
  const modulesById = useMemo(() => new Map(modules.map((module) => [String(module.id), module])), [modules]);
  const sortedModules = useMemo(
    () => [...modules].sort((left, right) => (left.nom_affiche || left.nom || '').localeCompare(right.nom_affiche || right.nom || '', 'fr')),
    [modules],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [menuResult, groupResult, moduleResult, actionResult, modelResult] = await Promise.allSettled([
        fetchAll('/menus/'), fetchAll('/groupes/'), fetchAll('/modules/'),
        fetchAll('/actions/'), fetchAll('/ir-models/'),
      ]);
      if (menuResult.status === 'rejected') throw menuResult.reason;
      const menuRows = menuResult.value;
      const groupRows = groupResult.status === 'fulfilled' ? groupResult.value : [];
      const moduleRows = moduleResult.status === 'fulfilled' ? moduleResult.value : [];
      const actionRows = actionResult.status === 'fulfilled' ? actionResult.value : [];
      const modelRows = modelResult.status === 'fulfilled' ? modelResult.value : [];
      setMenus(menuRows.sort((a, b) => (a.complete_name || a.name).localeCompare(b.complete_name || b.name, 'fr')));
      setGroups(groupRows);
      setModules(moduleRows);
      setActions(actionRows);
      setModels(modelRows);
    } catch (exception) {
      setError(exception?.data?.detail || exception?.message || t('Impossible de charger les menus.'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { load(); }, [load]);

  const filteredMenus = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('fr');
    return menus.filter((menu) => {
      if (moduleFilter && String(menu.app_id || '') !== moduleFilter) return false;
      return !normalized || formatMenuName(menu, byId).toLocaleLowerCase('fr').includes(normalized);
    });
  }, [menus, byId, query, moduleFilter]);

  const updateForm = (name, value) => setForm((current) => ({ ...current, [name]: value }));

  const startCreate = () => {
    setSelectedId(null);
    setForm({ ...EMPTY_FORM });
    setError('');
    setNotice('');
  };

  const startEdit = (menu) => {
    setSelectedId(menu.id);
    setForm({
      name: menu.name || '', sequence: menu.sequence ?? 10,
      parent_id: menu.parent_id ? String(menu.parent_id) : '',
      app_id: menu.app_id ? String(menu.app_id) : '',
      web_icon: menu.web_icon || '',
      destination_type: menu.web_path ? 'route' : menu.action_id ? 'action' : 'group',
      web_path: menu.web_path || '', web_path_model: menu.web_path_model || '',
      action_id: menu.action_id ? String(menu.action_id) : '',
      groups_id: (menu.groups_id || []).map(String), is_hidden: Boolean(menu.is_hidden),
    });
    setError('');
    setNotice('');
  };

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    const payload = {
      name: form.name.trim(),
      sequence: Number(form.sequence) || 10,
      parent_id: form.parent_id ? Number(form.parent_id) : null,
      app_id: form.app_id ? Number(form.app_id) : null,
      web_icon: form.web_icon.trim(),
      web_path: form.destination_type === 'route' ? form.web_path.trim() : '',
      web_path_model: form.destination_type === 'route' ? form.web_path_model.trim() : '',
      action_id: form.destination_type === 'action' && form.action_id ? Number(form.action_id) : null,
      groups_id: form.groups_id.map(Number),
      is_hidden: Boolean(form.is_hidden),
    };

    try {
      if (selectedId) await apiClient.patch(`/menus/${selectedId}/`, payload);
      else await apiClient.post('/menus/', payload);
      setNotice(t('Menu enregistré.'));
      await load();
      await reload();
      if (!selectedId) setForm({ ...EMPTY_FORM });
    } catch (exception) {
      const details = exception?.data;
      const message = typeof details === 'object'
        ? Object.entries(details).map(([field, value]) => `${field} : ${Array.isArray(value) ? value.join(', ') : String(value)}`).join(' · ')
        : exception?.message;
      setError(message || t('Impossible d’enregistrer ce menu.'));
    } finally {
      setSaving(false);
    }
  };

  const eligibleParents = useMemo(() => {
    const excluded = selectedId ? descendantsOf(selectedId, menus) : new Set();
    return menus.filter((menu) => !excluded.has(String(menu.id)) && !menu.is_hidden);
  }, [menus, selectedId]);

  const selectedGroups = new Set(form.groups_id.map(String));

  return (
    <main className="min-h-full bg-gray-50 p-4 md:p-6">
      <div className="mx-auto max-w-[1500px] space-y-5">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="rounded-lg bg-violet-100 p-2 text-violet-700"><FiMenu size={22} /></span>
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">{t('Menus d’interface')}</h1>
              <p className="mt-1 text-sm text-gray-600">{t('Organise les menus du sidebar et associe chaque entrée à une route ou une action.')}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={load} disabled={loading} className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"><FiRefreshCw className={loading ? 'animate-spin' : ''} />{t('Actualiser')}</button>
            {canCreate && <button type="button" onClick={startCreate} className="inline-flex items-center gap-2 rounded-md bg-violet-700 px-3 py-2 text-sm font-medium text-white"><FiPlus />{t('Nouveau menu')}</button>}
          </div>
        </header>

        {error && <div role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>}
        {notice && <div role="status" className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</div>}

        <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.8fr)]">
          <section className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 p-3">
              <h2 className="font-semibold text-gray-900">{t('Arborescence des menus')} <span className="font-normal text-gray-500">({filteredMenus.length}/{menus.length})</span></h2>
              <div className="flex w-full flex-wrap gap-2 sm:w-auto">
                <label className="block w-full sm:w-52">
                  <span className="sr-only">{t('Filtrer par module')}</span>
                  <select value={moduleFilter} onChange={(event) => setModuleFilter(event.target.value)} className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm">
                    <option value="">{t('Tous les modules')}</option>
                    {sortedModules.map((module) => <option key={module.id} value={String(module.id)}>{module.nom_affiche || module.nom}</option>)}
                  </select>
                </label>
                <label className="relative block w-full sm:w-64">
                  <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('Rechercher un menu…')} className="w-full rounded-md border border-gray-300 py-2 pl-9 pr-3 text-sm" />
                </label>
              </div>
            </div>
            {loading ? <p className="p-6 text-sm text-gray-500">{t('Chargement…')}</p> : filteredMenus.length === 0 ? <p className="p-6 text-sm text-gray-500">{t('Aucun menu trouvé.')}</p> : (
              <div className="divide-y divide-gray-100">
                {filteredMenus.map((menu) => (
                  <div key={menu.id} className={`flex items-center justify-between gap-3 px-4 py-3 ${menu.is_hidden ? 'bg-gray-50 text-gray-500' : ''}`}>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-gray-900">{formatMenuName(menu, byId)}</p>
                      <p className="mt-0.5 truncate text-xs text-gray-500">
                        {modulesById.get(String(menu.app_id)) && <span className="mr-2 inline-block rounded bg-gray-100 px-1.5 py-0.5">{modulesById.get(String(menu.app_id)).nom_affiche || modulesById.get(String(menu.app_id)).nom}</span>}
                        {menu.web_path || (menu.action_id ? `${t('Action')} #${menu.action_id}` : t('Groupe'))}
                        {menu.web_path_model ? ` · ${menu.web_path_model}` : ''}
                        {menu.is_hidden ? ` · ${t('Masqué')}` : ''}
                      </p>
                    </div>
                    {canUpdate && <button type="button" onClick={() => startEdit(menu)} title={t('Modifier le menu')} className="rounded border border-gray-300 p-2 text-gray-600 hover:bg-gray-50"><FiEdit2 /></button>}
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-lg border border-gray-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-gray-200 p-4">
              <h2 className="font-semibold text-gray-900">{selectedId ? t('Modifier le menu') : t('Créer un menu')}</h2>
              {(selectedId || form.name) && <button type="button" onClick={startCreate} className="rounded p-1 text-gray-500 hover:bg-gray-100" aria-label={t('Réinitialiser')}><FiX /></button>}
            </div>
            {!canEditForm ? <p className="p-4 text-sm text-gray-600">{t(selectedId ? 'Tu peux consulter les menus, mais tu ne disposes pas du droit de modification.' : 'Tu ne disposes pas du droit de création des menus.')}</p> : (
              <form onSubmit={save} className="space-y-4 p-4">
                <label className="block text-sm font-medium text-gray-700">{t('Nom')} *
                  <input required maxLength={255} value={form.name} onChange={(event) => updateForm('name', event.target.value)} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 font-normal" />
                </label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block text-sm font-medium text-gray-700">{t('Menu parent')}
                    <select value={form.parent_id} onChange={(event) => updateForm('parent_id', event.target.value)} className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 font-normal">
                      <option value="">{t('Aucun — menu principal')}</option>
                      {eligibleParents.map((menu) => <option key={menu.id} value={menu.id}>{formatMenuName(menu, byId)}</option>)}
                    </select>
                  </label>
                  <label className="block text-sm font-medium text-gray-700">{t('Ordre')}
                    <input type="number" value={form.sequence} onChange={(event) => updateForm('sequence', event.target.value)} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 font-normal" />
                  </label>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block text-sm font-medium text-gray-700">{t('Module propriétaire')}
                    <select value={form.app_id} onChange={(event) => updateForm('app_id', event.target.value)} className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 font-normal">
                      <option value="">{t('Aucun')}</option>
                      {modules.map((module) => <option key={module.id} value={module.id}>{module.nom_affiche || module.nom}</option>)}
                    </select>
                  </label>
                  <label className="block text-sm font-medium text-gray-700">{t('Icône')} <span className="font-normal text-gray-500">(home, users, settings…)</span>
                    <input maxLength={100} value={form.web_icon} onChange={(event) => updateForm('web_icon', event.target.value)} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 font-normal" />
                  </label>
                </div>
                <label className="block text-sm font-medium text-gray-700">{t('Destination')}
                  <select value={form.destination_type} onChange={(event) => updateForm('destination_type', event.target.value)} className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 font-normal">
                    <option value="group">{t('Groupe de sous-menus')}</option>
                    <option value="route">{t('Route interne du frontend')}</option>
                    <option value="action">{t('Action fenêtre IrAction')}</option>
                  </select>
                </label>
                {form.destination_type === 'route' && <div className="space-y-3 rounded-md bg-gray-50 p-3">
                  <label className="block text-sm font-medium text-gray-700">{t('Route interne')} *
                    <input required value={form.web_path} onChange={(event) => updateForm('web_path', event.target.value)} placeholder="/partners" className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 font-normal" />
                  </label>
                  <label className="block text-sm font-medium text-gray-700">{t('Modèle requis pour afficher le menu')}
                    <select value={form.web_path_model} onChange={(event) => updateForm('web_path_model', event.target.value)} className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 font-normal">
                      <option value="">{t('Aucun modèle — la route vérifie elle-même les droits')}</option>
                      {models.map((model) => <option key={model.id} value={model.model}>{model.model} — {model.name}</option>)}
                    </select>
                    <span className="mt-1 block text-xs font-normal text-gray-500">{t('Le backend masque ce menu aux utilisateurs sans droit de lecture sur ce modèle. Les permissions de la page restent aussi appliquées.')}</span>
                  </label>
                </div>}
                {form.destination_type === 'action' && <label className="block text-sm font-medium text-gray-700">{t('Action fenêtre')} *
                  <select required value={form.action_id} onChange={(event) => updateForm('action_id', event.target.value)} className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 font-normal">
                    <option value="">{t('Sélectionner une action')}</option>
                    {actions.filter((action) => action.type === 'window').map((action) => <option key={action.id} value={action.id}>#{action.id} — {action.name}</option>)}
                    {form.action_id && !actions.some((action) => String(action.id) === String(form.action_id)) && <option value={form.action_id}>#{form.action_id} — {t('action déjà liée')}</option>}
                  </select>
                </label>}
                <fieldset className="rounded-md border border-gray-200 p-3">
                  <legend className="px-1 text-sm font-medium text-gray-700">{t('Groupes autorisés')} <span className="font-normal text-gray-500">({t('vide = tous les groupes')})</span></legend>
                  <div className="max-h-36 space-y-1 overflow-y-auto">
                    {groups.map((group) => <label key={group.id} className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={selectedGroups.has(String(group.id))} onChange={(event) => updateForm('groups_id', event.target.checked ? [...form.groups_id, String(group.id)] : form.groups_id.filter((id) => String(id) !== String(group.id)))} />{group.name}</label>)}
                    {groups.length === 0 && <p className="text-xs text-gray-500">{t('Aucun groupe disponible.')}</p>}
                  </div>
                </fieldset>
                <label className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={form.is_hidden} onChange={(event) => updateForm('is_hidden', event.target.checked)} />{t('Masquer ce menu')}</label>
                <div className="flex justify-end gap-2 border-t border-gray-100 pt-3">
                  <button type="button" onClick={startCreate} className="rounded-md border border-gray-300 px-3 py-2 text-sm">{t('Réinitialiser')}</button>
                  <button type="submit" disabled={saving || !form.name.trim()} className="inline-flex items-center gap-2 rounded-md bg-violet-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"><FiSave />{saving ? t('Enregistrement…') : t('Enregistrer')}</button>
                </div>
              </form>
            )}
          </section>
        </div>
        <p className="text-xs text-gray-500">{t('Les changements de navigation sont rechargés automatiquement après enregistrement. Les pages et leurs API gardent leurs propres contrôles d’accès.')}</p>
      </div>
    </main>
  );
}
