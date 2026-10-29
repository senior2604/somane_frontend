import React, { useEffect, useMemo, useState } from 'react';
import { apiClient } from '../services/apiClient';

function asItems(value, multiple) {
  if (multiple) return Array.isArray(value) ? value : (value === null || value === undefined || value === '' ? [] : [value]);
  return value === null || value === undefined || value === '' ? [] : [value];
}

function idOf(item) {
  if (item && typeof item === 'object') return item.id ?? item.pk ?? null;
  const id = Number(item);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function fileName(item) {
  if (item && typeof item === 'object') return item.datas_fname || item.filename || item.name || `Fichier ${idOf(item) || ''}`;
  return `Fichier ${item}`;
}

function safeExternalUrl(value) {
  try {
    const parsed = new URL(String(value), window.location.origin);
    return ['http:', 'https:'].includes(parsed.protocol) ? parsed.href : '';
  } catch {
    return '';
  }
}

function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = String(name || 'fichier').replace(/[\\/:*?"<>|]/g, '_');
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function AttachmentDownloadButton({ attachment, className = '' }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const id = idOf(attachment);
  const url = safeExternalUrl(attachment && typeof attachment === 'object' ? attachment.url : '');

  const download = async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const response = await apiClient.download(`/attachments/${id}/download/`);
      if (!response.ok) throw new Error(`Téléchargement impossible (${response.status}).`);
      downloadBlob(await response.blob(), fileName(attachment));
    } catch (exception) {
      setError(exception?.message || 'Téléchargement impossible.');
    } finally {
      setLoading(false);
    }
  };

  if (url) {
    return <a href={url} target="_blank" rel="noreferrer" className={`text-violet-700 underline ${className}`}>{fileName(attachment)}</a>;
  }
  return <span className="inline-flex flex-col items-start gap-0.5">
    <button type="button" onClick={download} disabled={!id || loading} className={`text-left text-violet-700 underline disabled:text-slate-500 ${className}`}>
      {loading ? 'Téléchargement…' : fileName(attachment)}
    </button>
    {error && <span role="status" className="text-xs text-rose-700">{error}</span>}
  </span>;
}

export function BinaryDownloadButton({ value, name = 'fichier', mimetype = 'application/octet-stream' }) {
  const download = () => {
    let source = value;
    let mime = mimetype;
    if (source && typeof source === 'object') {
      mime = source.mimetype || source.content_type || mime;
      source = source.data || source.content || source.base64 || '';
    }
    const dataUrl = typeof source === 'string' ? source.match(/^data:([^;,]+)?;base64,(.+)$/s) : null;
    if (dataUrl) {
      mime = dataUrl[1] || mime;
      source = dataUrl[2];
    }
    try {
      const binary = atob(String(source || '').replace(/\s/g, ''));
      const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
      downloadBlob(new Blob([bytes], { type: mime }), name);
    } catch {
      // Invalid base64 values are left visible but cannot be downloaded.
    }
  };
  return <button type="button" onClick={download} className="text-violet-700 underline">Télécharger {name}</button>;
}

export function AttachmentFieldDisplay({ value, multiple = false, className = '' }) {
  const items = useMemo(() => asItems(value, multiple), [value, multiple]);
  const [resolved, setResolved] = useState({});
  const missingIds = items.map(idOf).filter((id) => id && !items.some((item) => item && typeof item === 'object' && idOf(item) === id) && !resolved[id]);
  const missingKey = [...new Set(missingIds)].join(',');

  useEffect(() => {
    if (!missingKey) return undefined;
    let cancelled = false;
    const ids = missingKey.split(',').map(Number).filter(Boolean);
    Promise.all(ids.map(async (id) => {
      try {
        return [id, await apiClient.get(`/attachments/${id}/`)];
      } catch {
        return [id, { id, name: `Fichier ${id}` }];
      }
    })).then((entries) => {
      if (!cancelled) setResolved((current) => ({ ...current, ...Object.fromEntries(entries) }));
    });
    return () => { cancelled = true; };
  }, [missingKey]);

  if (!items.length) return <span className="text-slate-400">—</span>;
  return <span className={`inline-flex flex-wrap gap-x-3 gap-y-1 ${className}`}>
    {items.map((item, index) => {
      const id = idOf(item);
      const attachment = id ? (typeof item === 'object' ? item : resolved[id] || item) : item;
      return <AttachmentDownloadButton key={`${id || fileName(item)}-${index}`} attachment={attachment} />;
    })}
  </span>;
}

export function AttachmentFieldInput({ value, multiple = false, onChange, disabled = false, accept = '' }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [details, setDetails] = useState([]);
  const items = asItems(value, multiple);
  const ids = items.map(idOf).filter(Boolean);

  useEffect(() => {
    const known = new Set(details.map((item) => idOf(item)));
    const missing = ids.filter((id) => !known.has(id));
    if (!missing.length) return undefined;
    let cancelled = false;
    Promise.all(missing.map(async (id) => {
      try { return await apiClient.get(`/attachments/${id}/`); }
      catch { return { id, name: `Fichier ${id}` }; }
    })).then((loaded) => { if (!cancelled) setDetails((current) => [...current, ...loaded]); });
    return () => { cancelled = true; };
    // ids are represented by a stable primitive key to avoid refetching every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids.join(',')]);

  const uploadFiles = async (event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    if (!files.length) return;
    setUploading(true);
    setError('');
    try {
      const uploaded = [];
      for (const file of (multiple ? files : files.slice(0, 1))) {
        const form = new FormData();
        form.append('file', file);
        uploaded.push(await apiClient.upload('/attachments/upload/', form));
      }
      setDetails((current) => [...current, ...uploaded]);
      const newIds = uploaded.map((item) => item.id).filter(Boolean);
      const next = multiple ? [...new Set([...ids, ...newIds])] : (newIds[0] || '');
      onChange({ target: { value: next } });
    } catch (exception) {
      setError(exception?.data?.detail || exception?.message || 'Le téléversement a échoué.');
    } finally {
      setUploading(false);
    }
  };

  const remove = (id) => {
    const next = multiple ? ids.filter((current) => current !== id) : null;
    onChange({ target: { value: next } });
  };

  return <div className="space-y-2">
    <input type="file" multiple={multiple} accept={accept || undefined} disabled={disabled || uploading} onChange={uploadFiles} className="block w-full text-sm text-slate-700 file:mr-3 file:rounded file:border-0 file:bg-violet-50 file:px-3 file:py-2 file:font-medium file:text-violet-700 hover:file:bg-violet-100 disabled:opacity-60" />
    {uploading && <span role="status" className="text-xs text-slate-500">Téléversement…</span>}
    {error && <span role="alert" className="block text-xs text-rose-700">{error}</span>}
    {ids.length > 0 && <ul className="space-y-1">
      {ids.map((id) => {
        const attachment = details.find((item) => idOf(item) === id) || { id, name: `Fichier ${id}` };
        return <li key={id} className="flex items-center justify-between gap-2 rounded border border-slate-200 px-2 py-1 text-xs">
          <AttachmentDownloadButton attachment={attachment} />
          {!disabled && <button type="button" onClick={() => remove(id)} className="text-rose-700 hover:underline">Retirer</button>}
        </li>;
      })}
    </ul>}
  </div>;
}
