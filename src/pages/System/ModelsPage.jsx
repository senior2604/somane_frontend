import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiBox, FiEdit2, FiInfo, FiRefreshCw, FiSearch, FiX } from 'react-icons/fi';
import { apiClient } from '../../services/apiClient';
import { useUi } from '../../context/UiContext';

function rowsOf(payload) {
  if (Array.isArray(payload)) return payload;
  return Array.isArray(payload?.results) ? payload.results : [];
}

async function fetchAll(endpoint, filters = {}) {
  const rows = [];
  let page = 1;
  let hasNext = true;
  while (hasNext) {
    const payload = await apiClient.get(endpoint, { params: { ...filters, page } });
    rows.push(...rowsOf(payload));
    hasNext = Boolean(payload?.next);
    page += 1;
  }
  return rows;
}

export default function ModelsPage() {
  const navigate = useNavigate();
  const { security } = useUi();
  const isAdministrator = Boolean(security?.user?.is_superuser);
  const [models, setModels] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [fieldsCount, setFieldsCount] = useState(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState({ name: '', info: '', order: '' });
  const [notice, setNotice] = useState('');

  const selectedModel = models.find((model) => String(model.id) === String(selectedId)) || null;

  const loadModels = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await fetchAll('/ir-models/');
      result.sort((a, b) => (a.model || '').localeCompare(b.model || '', 'fr'));
      setModels(result);
      setSelectedId((current) => current && result.some((model) => String(model.id) === current)
        ? current
        : String(result[0]?.id || ''));
    } catch (exception) {
      setError(exception?.message || 'Impossible de charger les modèles.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadModels(); }, [loadModels]);

  useEffect(() => {
    if (!selectedId) { setFieldsCount(null); return undefined; }
    let active = true;
    setDetailLoading(true);
    apiClient.get('/ir-model-fields/', { params: { model_id: selectedId, page: 1 } })
      .then((payload) => {
        if (active) setFieldsCount(Number.isFinite(payload?.count) ? payload.count : rowsOf(payload).length);
      })
      .catch(() => { if (active) setFieldsCount(null); })
      .finally(() => { if (active) setDetailLoading(false); });
    return () => { active = false; };
  }, [selectedId]);

  const filteredModels = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('fr');
    if (!query) return models;
    return models.filter((model) => [model.model, model.name, model.modules, model.info]
      .some((value) => String(value || '').toLocaleLowerCase('fr').includes(query)));
  }, [models, search]);

  const openEdit = () => {
    if (!selectedModel || !isAdministrator) return;
    setForm({ name: selectedModel.name || '', info: selectedModel.info || '', order: selectedModel.order || '' });
    setNotice('');
    setEditOpen(true);
  };

  const saveModel = async (event) => {
    event.preventDefault();
    if (!selectedModel || !isAdministrator) return;
    setSaving(true);
    setError('');
    try {
      const updated = await apiClient.patch(`/ir-models/${selectedModel.id}/`, form);
      setModels((current) => current.map((model) => String(model.id) === String(updated.id) ? updated : model));
      setEditOpen(false);
      setNotice('Informations du modèle enregistrées.');
    } catch (exception) {
      setError(exception?.data?.detail || exception?.message || 'Impossible d’enregistrer le modèle.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-full bg-gray-50 p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-5">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="rounded-lg bg-violet-100 p-2 text-violet-700"><FiBox size={22} /></span>
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Modèles</h1>
              <p className="mt-1 text-sm text-gray-600">Catalogue des modèles Django enregistrés dans IrModel.</p>
            </div>
          </div>
          <button type="button" onClick={loadModels} disabled={loading} className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50">
            <FiRefreshCw className={loading ? 'animate-spin' : ''} /> Actualiser
          </button>
        </header>

        {error && <div role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        {notice && <div role="status" className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800">{notice}</div>}

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(300px,0.8fr)]">
          <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 p-4">
              <div>
                <h2 className="font-semibold text-gray-900">Tous les modèles</h2>
                <p className="mt-0.5 text-xs text-gray-500">{loading ? 'Chargement…' : `${filteredModels.length} modèle(s)`}</p>
              </div>
              <label className="relative min-w-[220px] flex-1 sm:max-w-sm">
                <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nom, modèle, module…" className="w-full rounded-md border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500" />
              </label>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
                <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                  <tr><th className="px-4 py-3">Nom du modèle</th><th className="px-4 py-3">Modèle technique</th><th className="px-4 py-3">Module</th><th className="px-4 py-3">État</th></tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loading && <tr><td colSpan="4" className="px-4 py-10 text-center text-gray-500">Chargement des modèles…</td></tr>}
                  {!loading && filteredModels.map((model) => (
                    <tr key={model.id} onClick={() => { setSelectedId(String(model.id)); setNotice(''); }} className={`cursor-pointer hover:bg-violet-50 ${String(model.id) === String(selectedId) ? 'bg-violet-50' : ''}`}>
                      <td className="px-4 py-3 font-medium text-gray-900">{model.name || '—'}</td>
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-violet-800">{model.model}</td>
                      <td className="px-4 py-3 text-gray-600">{model.modules || '—'}</td>
                      <td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-xs ${model.state === 'manual' ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-700'}`}>{model.state === 'manual' ? 'Manuel' : 'Base'}</span></td>
                    </tr>
                  ))}
                  {!loading && !filteredModels.length && <tr><td colSpan="4" className="px-4 py-10 text-center text-gray-500">Aucun modèle trouvé.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>

          <aside className="h-fit rounded-xl border border-gray-200 bg-white shadow-sm">
            {!selectedModel ? (
              <div className="p-6 text-sm text-gray-500">Sélectionne un modèle pour voir ses informations.</div>
            ) : (
              <>
                <div className="flex items-start justify-between gap-3 border-b border-gray-200 p-4">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-violet-700">Fiche modèle</p>
                    <h2 className="mt-1 text-lg font-semibold text-gray-900">{selectedModel.name}</h2>
                    <p className="mt-1 break-all font-mono text-xs text-gray-500">{selectedModel.model}</p>
                  </div>
                  {isAdministrator && <button type="button" onClick={openEdit} aria-label="Modifier les informations du modèle" className="rounded-md border border-gray-300 p-2 text-gray-600 hover:bg-gray-50"><FiEdit2 /></button>}
                </div>
                <dl className="space-y-3 p-4 text-sm">
                  <div><dt className="text-xs text-gray-500">Description</dt><dd className="mt-1 whitespace-pre-wrap text-gray-800">{selectedModel.info || 'Aucune description.'}</dd></div>
                  <div className="flex justify-between gap-3"><dt className="text-gray-500">Module</dt><dd className="text-right text-gray-800">{selectedModel.modules || '—'}</dd></div>
                  <div className="flex justify-between gap-3"><dt className="text-gray-500">Origine</dt><dd className="text-gray-800">{selectedModel.state === 'manual' ? 'Manuel' : 'Base'}</dd></div>
                  <div className="flex justify-between gap-3"><dt className="text-gray-500">Modèle abstrait</dt><dd className="text-gray-800">{selectedModel.abstract ? 'Oui' : 'Non'}</dd></div>
                  <div className="flex justify-between gap-3"><dt className="text-gray-500">Temporaire</dt><dd className="text-gray-800">{selectedModel.transient ? 'Oui' : 'Non'}</dd></div>
                  <div className="flex justify-between gap-3"><dt className="text-gray-500">Champs déclarés</dt><dd className="text-gray-800">{detailLoading ? '…' : fieldsCount ?? '—'}</dd></div>
                </dl>
                {selectedModel.info && <div className="mx-4 mb-4 flex gap-2 rounded-md bg-blue-50 p-3 text-xs leading-relaxed text-blue-800"><FiInfo className="mt-0.5 flex-shrink-0" />Le nom technique et la structure de ce modèle viennent du code Django ; cet écran modifie ses informations de catalogue.</div>}
                <div className="border-t border-gray-200 p-4">
                  <button type="button" onClick={() => navigate(`/model-fields?model_id=${selectedModel.id}`)} className="w-full rounded-md bg-violet-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-violet-800">Afficher les champs du modèle</button>
                </div>
              </>
            )}
          </aside>
        </div>
      </div>

      {editOpen && selectedModel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/40 p-4 somane-overlay-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setEditOpen(false); }}>
          <form onSubmit={saveModel} role="dialog" aria-modal="true" aria-labelledby="model-edit-title" className="w-full max-w-xl rounded-xl bg-white shadow-2xl">
            <header className="flex items-start justify-between border-b border-gray-200 p-5">
              <div><p className="text-xs font-medium uppercase tracking-wide text-violet-700">Catalogue technique</p><h2 id="model-edit-title" className="mt-1 text-lg font-semibold text-gray-900">Modifier le modèle</h2><p className="mt-1 font-mono text-xs text-gray-500">{selectedModel.model}</p></div>
              <button type="button" onClick={() => setEditOpen(false)} aria-label="Fermer" className="rounded-md p-2 text-gray-500 hover:bg-gray-100"><FiX /></button>
            </header>
            <div className="space-y-4 p-5">
              <label className="block text-sm font-medium text-gray-700">Nom affiché<input required value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 font-normal" /></label>
              <label className="block text-sm font-medium text-gray-700">Description<textarea value={form.info} onChange={(event) => setForm((current) => ({ ...current, info: event.target.value }))} rows={4} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 font-normal" /></label>
              <label className="block text-sm font-medium text-gray-700">Ordre par défaut<input value={form.order} onChange={(event) => setForm((current) => ({ ...current, order: event.target.value }))} placeholder="id desc" className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-sm font-normal" /></label>
              <p className="text-xs leading-relaxed text-gray-500">Le nom technique, les colonnes et la table réelle du modèle restent définis dans Django.</p>
            </div>
            <footer className="flex justify-end gap-2 border-t border-gray-200 p-4"><button type="button" onClick={() => setEditOpen(false)} className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700">Annuler</button><button type="submit" disabled={saving} className="rounded-md bg-violet-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{saving ? 'Enregistrement…' : 'Enregistrer'}</button></footer>
          </form>
        </div>
      )}
    </main>
  );
}
