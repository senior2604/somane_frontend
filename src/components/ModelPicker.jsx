import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FiCheck, FiChevronDown, FiSearch } from 'react-icons/fi';
import { useLanguage } from '../context/LanguageContext';

function labelFor(model) {
  return `${model.model || ''} — ${model.name || ''}`.trim();
}

export default function ModelPicker({
  models = [], value = '', onChange, loading = false, id = 'model-picker', label = 'Modèle',
  placeholder = 'Rechercher un modèle…', loadingLabel = 'Chargement des modèles…',
  emptyLabel = 'Aucun modèle trouvé', partnerShortcutLabel = 'Accès rapide : Partenaire',
}) {
  const { t } = useLanguage();
  const selected = models.find((model) => String(model.id) === String(value));
  const [query, setQuery] = useState(selected ? labelFor(selected) : '');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef(null);

  useEffect(() => setQuery(selected ? labelFor(selected) : ''), [selected]);

  useEffect(() => {
    const closeOutside = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setOpen(false);
        setQuery(selected ? labelFor(selected) : '');
      }
    };
    document.addEventListener('mousedown', closeOutside);
    return () => document.removeEventListener('mousedown', closeOutside);
  }, [selected]);

  const matches = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    const filtered = !needle
      ? models
      : models.filter((model) => `${model.model || ''} ${model.name || ''}`.toLocaleLowerCase().includes(needle));
    return filtered.slice().sort((first, second) => {
      const firstPartner = first.model === 'core.Partenaire' ? -1 : 0;
      const secondPartner = second.model === 'core.Partenaire' ? -1 : 0;
      return firstPartner - secondPartner || labelFor(first).localeCompare(labelFor(second), 'fr');
    });
  }, [models, query]);

  const choose = (model) => {
    if (!model) return;
    onChange?.(String(model.id));
    setQuery(labelFor(model));
    setOpen(false);
  };

  const handleKeyDown = (event) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((index) => Math.min(index + 1, Math.max(matches.length - 1, 0)));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === 'Enter' && open) {
      event.preventDefault();
      choose(matches[activeIndex] || matches[0]);
    } else if (event.key === 'Escape') {
      setOpen(false);
      setQuery(selected ? labelFor(selected) : '');
    }
  };

  const partner = models.find((model) => model.model === 'core.Partenaire');
  const inputId = `${id}-search`;

  return (
    <div ref={rootRef} className="relative block text-sm font-medium text-gray-700">
      <label htmlFor={inputId}>{label}</label>
      <div className="relative mt-1">
        <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
        <input
          id={inputId} type="text" autoComplete="off" role="combobox" aria-autocomplete="list"
          aria-expanded={open} aria-controls={`${id}-options`} value={query} disabled={loading}
          placeholder={loading ? loadingLabel : placeholder}
          onFocus={(event) => { event.currentTarget.select(); setOpen(true); }} onClick={() => setOpen(true)}
          onChange={(event) => { setQuery(event.target.value); setActiveIndex(0); setOpen(true); }}
          onKeyDown={handleKeyDown}
          className="block w-full rounded-md border border-gray-300 bg-white py-2 pl-9 pr-9 text-sm font-normal focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 disabled:bg-gray-50"
        />
        <FiChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
      </div>
      <div className="mt-1 flex items-center justify-between gap-2">
        <span className="text-xs font-normal text-gray-500">{selected?.model || ''}</span>
        {partner && String(partner.id) !== String(value) && (
          <button type="button" onClick={() => choose(partner)} className="text-xs font-medium text-violet-700 hover:underline">{partnerShortcutLabel}</button>
        )}
      </div>
      {open && (
        <div className="absolute left-0 right-0 z-40 mt-1 overflow-hidden rounded-md border border-gray-200 bg-white shadow-lg">
          {loading ? <p className="px-3 py-3 text-sm font-normal text-gray-500">{loadingLabel}</p> : matches.length ? (
            <ul id={`${id}-options`} role="listbox" className="max-h-64 overflow-y-auto py-1">
              {matches.map((model, index) => {
                const isSelected = String(model.id) === String(value);
                return <li key={model.id} role="option" aria-selected={isSelected}>
                  <button type="button" onMouseEnter={() => setActiveIndex(index)} onClick={() => choose(model)} className={`flex w-full items-start justify-between gap-3 px-3 py-2 text-left text-sm font-normal ${index === activeIndex ? 'bg-violet-50 text-violet-900' : 'text-gray-800 hover:bg-gray-50'}`}>
                    <span className="min-w-0"><span className="block truncate font-medium">{model.name || model.model}</span><span className="mt-0.5 block truncate font-mono text-xs text-gray-500">{model.model}</span></span>
                    {isSelected && <FiCheck className="mt-1 shrink-0 text-violet-700" size={15} />}
                  </button>
                </li>;
              })}
            </ul>
          ) : <p className="px-3 py-3 text-sm font-normal text-gray-500">{emptyLabel}</p>}
          {partner && <div className="border-t border-gray-100 px-3 py-2 text-[11px] font-normal text-gray-500">{t('{count} modèle(s) · core.Partenaire est épinglé en haut').replace('{count}', models.length)}</div>}
        </div>
      )}
    </div>
  );
}
