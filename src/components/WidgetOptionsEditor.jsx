import React, { useEffect, useId, useState } from 'react';
import { WIDGET_OPTION_SCHEMA } from '../services/widgetOptionSchema';

const WIDGET_FAMILIES = {
  monetary_code: 'monetary', monetary_symbol: 'monetary', monetary_number: 'monetary',
  date_long: 'date', date_no_year: 'date', date_month_year: 'date', date_year: 'date',
  date_relative: 'relative_date', datetime_long: 'datetime',
  text_uppercase: 'text', text_lowercase: 'text', text_code: 'text', text_truncate: 'text',
  text_preserve_lines: 'text', char: 'char', email: 'email', phone: 'phone', url: 'url',
  selection_badge: 'badges_selection', boolean_badge: 'boolean_icon', boolean_toggle: 'boolean_icon',
  boolean_favorite: 'boolean_icon',
  number_grouped: 'number', number_raw: 'number', number_compact: 'number',
  relation_badge: 'badge', relation_chips: 'many2many_tags', badges_many2one: 'badges_many2one',
  html_source: 'html', html_preserve_lines: 'html', binary_size: 'binary', binary_type: 'binary',
};

export function widgetOptionDefinition(widget, fieldType = '') {
  const normalized = WIDGET_FAMILIES[widget] || widget;
  if (normalized === 'text' && fieldType === 'char') {
    return WIDGET_OPTION_SCHEMA.find((item) => item.widget === 'char') || null;
  }
  const direct = WIDGET_OPTION_SCHEMA.find((item) => item.widget === normalized);
  if (direct) return direct;
  if (normalized === 'number') {
    const numberType = ['float', 'decimal'].includes(fieldType) ? 'float' : 'integer';
    return WIDGET_OPTION_SCHEMA.find((item) => item.widget === numberType) || null;
  }
  if (!widget && fieldType) {
    return WIDGET_OPTION_SCHEMA.find((item) => item.widget === fieldType) || null;
  }
  return null;
}

function displayValue(value) {
  if (value === undefined || value === null) return '';
  if (Array.isArray(value) || (typeof value === 'object' && value !== null)) return JSON.stringify(value);
  return String(value);
}

function parseJsonInput(text) {
  if (!text.trim()) return '';
  try { return JSON.parse(text); } catch { return text; }
}

function OptionControl({ option, value, onChange, fields, id, disabled }) {
  const base = 'mt-1 w-full rounded-md border border-gray-300 bg-white px-2.5 py-2 text-sm font-normal';
  if (option.input === 'boolean') {
    return <input id={id} type="checkbox" disabled={disabled} checked={Boolean(value)} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4 rounded border-gray-300 text-violet-700 focus:ring-violet-600 disabled:opacity-50" />;
  }
  if (option.input === 'number') {
    return <input id={id} type="number" disabled={disabled} value={value ?? ''} onChange={(event) => onChange(event.target.value === '' ? '' : Number(event.target.value))} className={`${base} disabled:bg-gray-100`} />;
  }
  if (option.input === 'select' && option.choices?.length) {
    return <select id={id} disabled={disabled} value={value ?? ''} onChange={(event) => onChange(event.target.value)} className={`${base} disabled:bg-gray-100`}>
      <option value="">Valeur par défaut</option>
      {option.choices.map((choice) => <option key={choice} value={choice}>{choice}</option>)}
    </select>;
  }
  if (option.input === 'pair') {
    const pair = Array.isArray(value) ? value : [];
    const labels = option.name === 'size' ? ['Largeur', 'Hauteur'] : ['Largeur totale', 'Décimales'];
    return <div className="mt-1 grid grid-cols-2 gap-2">{labels.map((label, index) => <label key={label} className="text-xs text-gray-500">{label}<input aria-label={`${option.name} ${label}`} type="number" min="0" disabled={disabled} value={pair[index] ?? ''} onChange={(event) => {
      const next = [...pair];
      next[index] = event.target.value === '' ? null : Number(event.target.value);
      onChange(next);
    }} className={`${base} disabled:bg-gray-100`} /></label>)}</div>;
  }
  if (option.input === 'json') {
    return <textarea id={id} rows={3} disabled={disabled} value={displayValue(value)} onChange={(event) => onChange(parseJsonInput(event.target.value))} placeholder="{}" className={`${base} font-mono text-xs disabled:bg-gray-100`} />;
  }
  if (option.input === 'field' && fields.length) {
    return <><input id={id} list={`${id}-fields`} disabled={disabled} value={value ?? ''} onChange={(event) => onChange(event.target.value)} className={`${base} disabled:bg-gray-100`} /><datalist id={`${id}-fields`}>{fields.map((field) => <option key={field.name} value={field.name}>{field.field_description || field.label || field.name}</option>)}</datalist></>;
  }
  return <input id={id} disabled={disabled} value={displayValue(value)} onChange={(event) => onChange(event.target.value)} className={`${base} disabled:bg-gray-100`} />;
}

/** Shows the documented settings for the selected widget in a compact, collapsible panel. */
export default function WidgetOptionsEditor({ widget, fieldType = '', value, onChange, title = 'Options du widget', fields = [], disabled = false }) {
  const [showOptions, setShowOptions] = useState(false);
  const panelId = useId();
  const definition = widgetOptionDefinition(widget, fieldType);
  const settings = value && typeof value === 'object' ? value : {};
  const optionValues = settings.options && typeof settings.options === 'object' ? settings.options : {};
  const attributeValues = settings.attributes && typeof settings.attributes === 'object' ? settings.attributes : {};

  useEffect(() => {
    setShowOptions(false);
  }, [widget, fieldType]);

  const update = (location, name, nextValue) => {
    if (location === 'attribute' && name === 'decoration-*') {
      if (!nextValue || typeof nextValue !== 'object' || Array.isArray(nextValue)) return;
      const next = Object.fromEntries(Object.entries(attributeValues).filter(([key]) => !key.startsWith('decoration-')));
      Object.entries(nextValue).forEach(([key, expression]) => {
        if (/^decoration-[a-z][a-z0-9_-]{0,60}$/.test(key) && typeof expression === 'string' && expression.trim()) {
          next[key] = expression.trim();
        }
      });
      onChange({ options: optionValues, attributes: next });
      return;
    }
    const source = location === 'attribute' ? attributeValues : optionValues;
    const next = { ...source };
    if (nextValue === '' || nextValue === null || nextValue === undefined) delete next[name];
    else next[name] = nextValue;
    onChange({
      options: location === 'option' ? next : optionValues,
      attributes: location === 'attribute' ? next : attributeValues,
    });
  };

  if (!widget && !fieldType) return null;
  if (!definition) return <p className="rounded-md bg-amber-50 p-3 text-xs text-amber-800">Aucune option documentée pour ce rendu.</p>;
  if (!definition.options.length) return <p className="rounded-md bg-gray-50 p-3 text-xs text-gray-600">{definition.role || 'Ce widget ne déclare aucune option dans le classeur.'}</p>;

  const optionSettings = definition.options.filter((option) => option.location !== 'attribute');
  const attributes = definition.options.filter((option) => option.location === 'attribute');
  const settingCount = optionSettings.length + attributes.length;

  const renderSetting = (option) => {
    const location = option.location === 'attribute' ? 'attribute' : 'option';
    const values = location === 'attribute' ? attributeValues : optionValues;
    const optionValue = option.name === 'decoration-*'
      ? Object.fromEntries(Object.entries(attributeValues).filter(([key]) => /^decoration-[a-z][a-z0-9_-]{0,60}$/.test(key)))
      : values[option.name];
    const id = `widget-${widget}-${location}-${option.name}`.replace(/[^a-zA-Z0-9_-]/g, '-');
    return <div key={`${location}-${option.name}`} className="rounded-md border border-gray-100 bg-white p-3">
      <div className="flex items-start justify-between gap-3">
        <label htmlFor={id} className="text-sm font-medium text-gray-800">{option.name}</label>
        {location === 'attribute' && <span className="shrink-0 rounded bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700">Attribut de vue</span>}
      </div>
      <p className="mt-1 text-xs leading-relaxed text-gray-500">{option.description}</p>
      <div className="mt-2"><OptionControl option={option} value={optionValue} onChange={(nextValue) => update(location, option.name, nextValue)} fields={fields} id={id} disabled={disabled} /></div>
    </div>;
  };

  return <section className="rounded-md border border-gray-200 bg-white">
    <div className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <h4 className="text-sm font-semibold text-gray-900">{title}</h4>
        <p className="mt-1 text-xs leading-relaxed text-gray-600">{definition.role}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {disabled && <span className="rounded bg-gray-100 px-2 py-1 text-[11px] font-medium text-gray-600">Lecture seule</span>}
        <button
          type="button"
          aria-expanded={showOptions}
          aria-controls={panelId}
          onClick={() => setShowOptions((current) => !current)}
          className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-1"
        >
          {showOptions ? 'Masquer les options' : `Afficher les options (${settingCount})`}
        </button>
      </div>
    </div>
    <div id={panelId} hidden={!showOptions}>
      {showOptions && <div className="space-y-3 border-t border-gray-200 bg-gray-50 p-3">
        {optionSettings.length > 0 && <div>
          <h5 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-600">Options du widget</h5>
          <div className="grid gap-2 md:grid-cols-2">{optionSettings.map(renderSetting)}</div>
        </div>}
        {attributes.length > 0 && <details className="rounded-md border border-gray-200 bg-white p-3">
          <summary className="cursor-pointer text-sm font-medium text-gray-700">Attributs de la vue ({attributes.length})</summary>
          <div className="mt-3 grid gap-2 md:grid-cols-2">{attributes.map(renderSetting)}</div>
        </details>}
      </div>}
    </div>
  </section>;
}
