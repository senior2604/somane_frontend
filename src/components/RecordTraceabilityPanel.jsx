import React, { useCallback, useEffect, useState } from 'react';
import { FiClock, FiInfo, FiX } from 'react-icons/fi';
import { apiClient } from '../services/apiClient';
import { useLanguage } from '../context/LanguageContext';

function rowsOf(payload) {
  if (Array.isArray(payload)) return payload;
  return Array.isArray(payload?.results) ? payload.results : [];
}

function actorName(entry) {
  const user = entry.utilisateur;
  if (typeof user === 'string') return user;
  if (!user) return 'Utilisateur';
  return user.get_full_name || user.full_name || [user.first_name, user.last_name].filter(Boolean).join(' ') || user.email || user.username || 'Utilisateur';
}

export function useRecordTraceability(model, recordId, enabled = true) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    if (!model || !recordId) return;
    setLoading(true);
    setError('');
    try {
      const payload = await apiClient.get('/journals/', {
        params: { modele: model, objet_id: recordId, ordering: '-date_action', page: 1 },
      });
      setRows(rowsOf(payload));
    } catch (exception) {
      setError(exception?.data?.detail || exception?.message || 'Impossible de charger la traçabilité.');
    } finally {
      setLoading(false);
    }
  }, [model, recordId]);

  useEffect(() => {
    if (enabled) void reload();
  }, [enabled, reload]);

  return { rows, loading, error, reload };
}

export function RecordTraceabilityContent({ rows = [], loading = false, error = '', entityLabel = 'cet enregistrement', emptyDescription }) {
  const { t, languageTag } = useLanguage();
  return (
    <div className="px-4 py-3">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-medium text-gray-700">{t('Activité liée à')} {entityLabel}</span>
        <span className="text-[11px] text-gray-500">{t('{count} événement(s)').replace('{count}', rows.length)}</span>
      </div>
      {loading ? (
        <div className="border border-gray-200 bg-white px-3 py-4 text-center text-xs text-gray-500">{t('Chargement de la traçabilité…')}</div>
      ) : error ? (
        <div role="alert" className="border border-red-200 bg-red-50 px-3 py-3 text-xs text-red-700">{error}</div>
      ) : rows.length ? (
        <div className="space-y-2 pr-1">
          {rows.map((entry, index) => (
            <div key={entry.id || index} className="border border-gray-200 bg-white px-3 py-2">
              <div className="text-xs font-medium text-gray-900">{t(entry.action || 'Modification')}</div>
              {entry.description && <div className="mt-1 whitespace-pre-wrap text-[11px] text-gray-600">{entry.description}</div>}
              <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-gray-500">
                <span className="truncate">{t('Par')} {actorName(entry)}</span>
                <time className="whitespace-nowrap">{entry.date_action ? new Date(entry.date_action).toLocaleString(languageTag) : ''}</time>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="border border-gray-200 bg-white px-3 py-5 text-center">
          <FiClock className="mx-auto mb-2 h-7 w-7 text-gray-400" />
          <div className="text-xs text-gray-600">{t('Aucune traçabilité disponible')}</div>
          <div className="mt-1 text-[11px] text-gray-500">{t(emptyDescription || 'Les actions sur cet élément apparaîtront ici.')}</div>
        </div>
      )}
    </div>
  );
}

export default function RecordTraceabilityPanel({ model, recordId }) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open || !model || !recordId) return undefined;
    let mounted = true;
    setLoading(true);
    setError('');
    apiClient.get('/journals/', { params: { modele: model, objet_id: recordId, ordering: '-date_action', page: 1 } })
      .then((payload) => { if (mounted) setRows(rowsOf(payload)); })
      .catch((exception) => { if (mounted) setError(exception?.data?.detail || exception?.message || 'Impossible de charger la traçabilité.'); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [model, open, recordId]);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="inline-flex h-8 items-center gap-1.5 border border-gray-300 bg-white px-3 text-xs text-gray-700 hover:bg-gray-50" title="Afficher la traçabilité">
        <FiInfo size={13} /> Traçabilité
      </button>
      {open && <div className="fixed inset-0 z-[100] flex justify-end bg-gray-950/20" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
        <aside role="dialog" aria-modal="true" aria-label="Traçabilité de l’enregistrement" className="flex h-full w-full max-w-md flex-col border-l border-gray-300 bg-white shadow-2xl">
          <header className="flex shrink-0 items-center justify-between border-b border-gray-200 px-4 py-3">
            <div className="flex items-center gap-2 font-semibold text-gray-900"><FiInfo className="text-violet-700" /> TRAÇABILITÉ</div>
            <button type="button" onClick={() => setOpen(false)} className="inline-flex h-8 items-center gap-1 border border-gray-300 px-2 text-xs text-gray-600 hover:bg-gray-50"><FiX /> Fermer</button>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            <div className="mb-3 flex items-center justify-between text-sm"><span className="font-medium text-gray-800">Activité liée à cet enregistrement</span><span className="text-xs text-gray-500">{rows.length} événement(s)</span></div>
            {loading && <p className="py-8 text-center text-sm text-gray-500">Chargement de la traçabilité…</p>}
            {error && <p role="alert" className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
            {!loading && !error && rows.length === 0 && <div className="rounded border border-gray-200 p-5 text-center"><FiClock className="mx-auto mb-2 text-gray-400" size={24} /><p className="text-sm text-gray-700">Aucun événement enregistré</p><p className="mt-1 text-xs text-gray-500">Les prochaines créations ou modifications apparaîtront ici.</p></div>}
            <ol className="space-y-3">
              {!loading && rows.map((entry) => <li key={entry.id} className="border-l-2 border-violet-200 pl-3">
                <div className="flex flex-wrap items-center justify-between gap-2"><span className="text-sm font-medium capitalize text-gray-900">{entry.action || 'Action'}</span><time className="text-xs text-gray-500">{entry.date_action ? new Date(entry.date_action).toLocaleString() : ''}</time></div>
                <p className="mt-1 text-xs text-gray-600">{actorName(entry)}</p>
                {entry.description && <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-gray-700">{entry.description}</p>}
              </li>)}
            </ol>
          </div>
        </aside>
      </div>}
    </>
  );
}
