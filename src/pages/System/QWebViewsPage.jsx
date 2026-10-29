import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FiCode, FiFileText, FiRefreshCw, FiSearch } from 'react-icons/fi';
import { apiClient } from '../../services/apiClient';
import { useLanguage } from '../../context/LanguageContext';

function rowsOf(payload) {
  if (Array.isArray(payload)) return payload;
  return Array.isArray(payload?.results) ? payload.results : [];
}

async function fetchAllQWebViews() {
  const views = [];
  let page = 1;
  let hasNext = true;
  while (hasNext) {
    const payload = await apiClient.get('/ir-views/', { params: { type: 'qweb', page } });
    views.push(...rowsOf(payload));
    hasNext = Boolean(payload?.next);
    page += 1;
  }
  return views;
}

function sourceLineCount(source) {
  return String(source || '').split(/\r\n|\r|\n/).length;
}

export default function QWebViewsPage() {
  const { t } = useLanguage();
  const [views, setViews] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [query, setQuery] = useState('');
  const [stateFilter, setStateFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadViews = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await fetchAllQWebViews();
      result.sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'fr'));
      setViews(result);
      setSelectedId((current) => current && result.some((view) => String(view.id) === String(current))
        ? current
        : (result[0]?.id ?? null));
    } catch (exception) {
      setError(exception?.data?.detail || exception?.message || t('Impossible de charger les vues QWeb.'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { loadViews(); }, [loadViews]);

  const filteredViews = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return views.filter((view) => {
      if (stateFilter === 'active' && !view.active) return false;
      if (stateFilter === 'inactive' && view.active) return false;
      if (!normalizedQuery) return true;
      return [view.name, view.model, view.key, view.inherit_nom, view.arch_db]
        .some((value) => String(value || '').toLocaleLowerCase().includes(normalizedQuery));
    });
  }, [query, stateFilter, views]);

  const selectedView = views.find((view) => String(view.id) === String(selectedId)) || null;
  const activeCount = views.filter((view) => view.active).length;

  return (
    <main className="min-h-full bg-gray-50 p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-5">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="rounded-lg bg-violet-100 p-2 text-violet-700"><FiCode size={22} /></span>
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">{t('Vues QWeb')}</h1>
              <p className="mt-1 text-sm text-gray-600">{t('Inventaire des templates QWeb enregistrés dans IrUiView, avec leur source XML.')}</p>
            </div>
          </div>
          <button type="button" onClick={loadViews} disabled={loading} className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50">
            <FiRefreshCw className={loading ? 'animate-spin' : ''} /> {t('Actualiser')}
          </button>
        </header>

        {error && <div role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"><p className="text-sm text-gray-500">{t('Templates QWeb')}</p><p className="mt-1 text-2xl font-semibold text-gray-900">{loading ? '…' : views.length}</p></div>
          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"><p className="text-sm text-gray-500">{t('Actifs')}</p><p className="mt-1 text-2xl font-semibold text-green-700">{loading ? '…' : activeCount}</p></div>
          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"><p className="text-sm text-gray-500">{t('Inactifs')}</p><p className="mt-1 text-2xl font-semibold text-gray-700">{loading ? '…' : views.length - activeCount}</p></div>
        </div>

        <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
          <section className="min-w-0 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 p-4">
              <div><h2 className="font-semibold text-gray-900">{t('Templates enregistrés')}</h2><p className="mt-0.5 text-xs text-gray-500">{loading ? t('Chargement…') : `${filteredViews.length} ${t('vue(s) affichée(s)')}`}</p></div>
              <div className="flex w-full flex-wrap gap-2 sm:w-auto">
                <label className="relative min-w-[220px] flex-1 sm:max-w-sm">
                  <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('Rechercher nom, modèle, clé ou XML…')} className="w-full rounded-md border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500" />
                </label>
                <select aria-label={t('Filtrer par état')} value={stateFilter} onChange={(event) => setStateFilter(event.target.value)} className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700">
                  <option value="all">{t('Tous les états')}</option><option value="active">{t('Actifs')}</option><option value="inactive">{t('Inactifs')}</option>
                </select>
              </div>
            </div>
            <div className="max-h-[65vh] overflow-auto">
              <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
                <thead className="sticky top-0 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                  <tr><th className="px-4 py-3">{t('Nom')}</th><th className="px-4 py-3">{t('Modèle')}</th><th className="px-4 py-3">{t('Identifiant')}</th><th className="px-4 py-3">{t('État')}</th></tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loading && <tr><td colSpan="4" className="px-4 py-10 text-center text-gray-500">{t('Chargement des vues QWeb…')}</td></tr>}
                  {!loading && filteredViews.map((view) => (
                    <tr key={view.id} onClick={() => setSelectedId(view.id)} className={`cursor-pointer align-top hover:bg-violet-50 ${String(view.id) === String(selectedId) ? 'bg-violet-50' : ''}`}>
                      <td className="max-w-[220px] px-4 py-3 font-medium text-gray-900"><span className="block truncate" title={view.name}>{view.name || '—'}</span><span className="mt-1 block text-xs font-normal text-gray-500">{view.mode === 'extension' ? t('Extension') : t('Primaire')}</span></td>
                      <td className="max-w-[180px] px-4 py-3 font-mono text-xs text-violet-800"><span className="block truncate" title={view.model}>{view.model || '—'}</span></td>
                      <td className="max-w-[220px] px-4 py-3 font-mono text-xs text-gray-600"><span className="block truncate" title={view.key}>{view.key || '—'}</span></td>
                      <td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-xs ${view.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>{view.active ? t('Actif') : t('Inactif')}</span></td>
                    </tr>
                  ))}
                  {!loading && !filteredViews.length && <tr><td colSpan="4" className="px-4 py-10 text-center text-gray-500">{views.length ? t('Aucun template ne correspond à la recherche.') : t('Aucune vue de type QWeb enregistrée dans IrUiView.')}</td></tr>}
                </tbody>
              </table>
            </div>
          </section>

          <aside className="min-w-0 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            {!selectedView ? (
              <div className="flex min-h-52 flex-col items-center justify-center p-6 text-center text-sm text-gray-500"><FiFileText size={28} className="mb-2 text-gray-400" />{t('Sélectionne un template pour inspecter sa définition.')}</div>
            ) : (
              <>
                <div className="border-b border-gray-200 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-violet-700">{t('Détail du template')} · #{selectedView.id}</p>
                  <h2 className="mt-1 break-words text-lg font-semibold text-gray-900">{selectedView.name}</h2>
                  <p className="mt-1 break-all font-mono text-xs text-gray-500">{selectedView.key || selectedView.model || '—'}</p>
                </div>
                <dl className="grid gap-3 border-b border-gray-200 p-4 text-sm sm:grid-cols-2">
                  <div><dt className="text-xs text-gray-500">{t('Modèle associé')}</dt><dd className="mt-1 break-all font-mono text-xs text-gray-800">{selectedView.model || '—'}</dd></div>
                  <div><dt className="text-xs text-gray-500">{t('Vue parente')}</dt><dd className="mt-1 break-words text-gray-800">{selectedView.inherit_nom || selectedView.inherit_id || t('Aucune')}</dd></div>
                  <div><dt className="text-xs text-gray-500">{t('Mode')}</dt><dd className="mt-1 text-gray-800">{selectedView.mode === 'extension' ? t('Extension') : t('Primaire')}</dd></div>
                  <div><dt className="text-xs text-gray-500">{t('Priorité')}</dt><dd className="mt-1 text-gray-800">{selectedView.priority ?? '—'}</dd></div>
                  <div><dt className="text-xs text-gray-500">{t('État')}</dt><dd className="mt-1 text-gray-800">{selectedView.active ? t('Actif') : t('Inactif')}</dd></div>
                  <div><dt className="text-xs text-gray-500">{t('Taille de la source')}</dt><dd className="mt-1 text-gray-800">{sourceLineCount(selectedView.arch_db)} {t('lignes')}</dd></div>
                </dl>
                <div className="p-4">
                  <div className="mb-2 flex items-center justify-between gap-2"><h3 className="text-sm font-semibold text-gray-900">{t('Source XML')}</h3><span className="text-xs text-gray-500">arch_db</span></div>
                  <pre className="max-h-[50vh] overflow-auto rounded-lg bg-slate-950 p-4 text-xs leading-relaxed text-slate-100"><code>{selectedView.arch_db || t('Aucune source XML enregistrée.')}</code></pre>
                </div>
              </>
            )}
          </aside>
        </div>
        <p className="text-xs leading-relaxed text-gray-500">{t('Cette page inventorie uniquement les vues dont le type est QWeb dans IrUiView. Elle permet de consulter leur définition ; elle ne modifie pas leur source.')}</p>
      </div>
    </main>
  );
}
