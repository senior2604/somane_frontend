import React, { useEffect, useRef, useState } from 'react';
import { currencyLabel, sanitizeRichHtml, toDateTimeLocalValue } from '../services/fieldDisplay';
import MetadataFieldDisplay from './MetadataFieldDisplay';
import { AttachmentFieldInput } from './AttachmentWidget';
import { useLanguage } from '../context/LanguageContext';

const BOOLEAN_EDIT_WIDGETS = new Set(['boolean_toggle', 'boolean_favorite', 'boolean_checkbox']);
const SELECTION_EDIT_WIDGETS = new Set(['radio', 'statusbar', 'priority']);

function valueEvent(value) {
  return { target: { value } };
}

function selectionChoices(field) {
  const options = field.selection || field.selection_options || [];
  if (!Array.isArray(options)) return [];
  return options.map((option) => ({
    value: String(option.value ?? option.key ?? option.name ?? ''),
    label: option.label || option.name || option.value || option.key || '',
  })).filter((option) => option.value !== '');
}

function RichHtmlInput({ value, onChange, disabled, className, height, codeview = false }) {
  const editorRef = useRef(null);
  const [showSource, setShowSource] = useState(false);
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== sanitizeRichHtml(value)) {
      editorRef.current.innerHTML = sanitizeRichHtml(value);
    }
  }, [value]);

  const update = () => onChange(valueEvent(sanitizeRichHtml(editorRef.current?.innerHTML || '')));
  const command = (name) => {
    editorRef.current?.focus();
    document.execCommand(name, false);
    update();
  };

  return <div className="overflow-hidden rounded border border-slate-300">
    {!disabled && <div className="flex flex-wrap gap-1 border-b border-slate-200 bg-slate-50 p-1">
      {[
        ['bold', 'Gras'], ['italic', 'Italique'], ['underline', 'Souligné'],
        ['insertUnorderedList', 'Liste à puces'], ['insertOrderedList', 'Liste numérotée'],
      ].map(([commandName, label]) => <button key={commandName} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => command(commandName)} className="rounded px-2 py-1 text-xs text-slate-700 hover:bg-violet-100">{label}</button>)}
      {codeview && <button type="button" onClick={() => setShowSource((current) => !current)} className="rounded px-2 py-1 text-xs text-violet-700 hover:bg-violet-100">{showSource ? 'Aperçu' : 'Code HTML'}</button>}
    </div>}
    {showSource && codeview
      ? <textarea value={value ?? ''} disabled={disabled} onChange={(event) => onChange(valueEvent(event.target.value))} style={{ height: Number(height) > 0 ? `${Math.min(Number(height), 2048)}px` : undefined }} className={`w-full p-3 font-mono text-xs outline-none ${disabled ? 'bg-slate-50' : 'bg-white'} ${className || ''}`} aria-label="Code HTML" />
      : <div ref={editorRef} contentEditable={!disabled} suppressContentEditableWarning role="textbox" aria-multiline="true" onInput={update} onBlur={update} style={{ height: Number(height) > 0 ? `${Math.min(Number(height), 2048)}px` : undefined, overflow: Number(height) > 0 ? 'auto' : undefined }} className={`min-h-28 p-3 text-sm outline-none ${disabled ? 'bg-slate-50' : 'bg-white'} ${className || ''}`} />}
  </div>;
}

function BinaryInput({ value, onChange, disabled, accept, className }) {
  const [error, setError] = useState('');
  const read = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    setError('');
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) {
      setError('La taille maximale autorisée est de 20 Mo.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      onChange(valueEvent(dataUrl.split(',').pop() || ''));
    };
    reader.onerror = () => setError('Impossible de lire ce fichier.');
    reader.readAsDataURL(file);
  };
  return <div className="space-y-1">
    <input type="file" accept={accept || undefined} disabled={disabled} onChange={read} className={`block w-full text-sm ${className || ''}`} />
    {value && <MetadataFieldDisplay value={value} field={{ ...{}, type: 'binary', widget: 'binary' }} />}
    {error && <span role="alert" className="text-xs text-rose-700">{error}</span>}
  </div>;
}

function SignaturePad({ value, onChange, disabled }) {
  const canvasRef = useRef(null);
  const drawing = useRef(false);
  const [hasSignature, setHasSignature] = useState(Boolean(value));

  useEffect(() => {
    setHasSignature(Boolean(value));
    if (!value || !canvasRef.current || typeof Image === 'undefined') return;
    const image = new Image();
    image.onload = () => {
      const context = canvasRef.current?.getContext('2d');
      if (!context) return;
      context.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      context.drawImage(image, 0, 0, canvasRef.current.width, canvasRef.current.height);
    };
    image.src = String(value).startsWith('data:') ? String(value) : `data:image/png;base64,${value}`;
  }, [value]);

  const position = (event) => {
    const bounds = canvasRef.current.getBoundingClientRect();
    return { x: (event.clientX - bounds.left) * (canvasRef.current.width / bounds.width), y: (event.clientY - bounds.top) * (canvasRef.current.height / bounds.height) };
  };
  const start = (event) => {
    if (disabled) return;
    event.preventDefault();
    canvasRef.current.setPointerCapture?.(event.pointerId);
    const point = position(event);
    const context = canvasRef.current.getContext('2d');
    context.beginPath(); context.moveTo(point.x, point.y); drawing.current = true;
  };
  const move = (event) => {
    if (!drawing.current || disabled) return;
    const point = position(event);
    const context = canvasRef.current.getContext('2d');
    context.lineWidth = 2.5; context.lineCap = 'round'; context.strokeStyle = '#172554';
    context.lineTo(point.x, point.y); context.stroke(); setHasSignature(true);
  };
  const stop = () => {
    if (!drawing.current) return;
    drawing.current = false;
    onChange(valueEvent(canvasRef.current.toDataURL('image/png').split(',').pop()));
  };
  const clear = () => {
    const canvas = canvasRef.current;
    canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false); onChange(valueEvent(''));
  };

  return <div className="inline-flex flex-col gap-2">
    <canvas ref={canvasRef} width="640" height="180" onPointerDown={start} onPointerMove={move} onPointerUp={stop} onPointerCancel={stop} className={`w-full max-w-xl touch-none rounded border border-dashed border-slate-400 bg-white ${disabled ? 'pointer-events-none opacity-70' : 'cursor-crosshair'}`} aria-label="Zone de signature" />
    {!disabled && <div className="flex items-center gap-3"><button type="button" onClick={clear} className="text-xs text-rose-700 hover:underline">Effacer</button>{hasSignature && <span className="text-xs text-emerald-700">Signature prête</span>}</div>}
  </div>;
}

export default function MetadataFieldInput({
  field, value, onChange, className = '', disabled = false, currencyEntity = null, record = {},
}) {
  const { t } = useLanguage();
  const { type } = field;
  const widget = field.widget || field.display_widget || '';
  const widgetOptions = field.widget_options || field.display_widget_options?.options || {};
  const widgetAttributes = field.widget_attributes || field.display_widget_options?.attributes || {};
  const commonClass = className || 'w-full rounded border border-slate-300 px-2 py-1 text-sm';
  const placeholder = widgetOptions.placeholder_field ? record?.[widgetOptions.placeholder_field] : '';

  if (disabled) {
    return (
      <div className={`${commonClass} flex min-h-[26px] items-center bg-gray-50`}>
        <MetadataFieldDisplay value={value} field={field} entity={currencyEntity} />
      </div>
    );
  }

  if (type === 'boolean' && BOOLEAN_EDIT_WIDGETS.has(widget)) {
    const checked = value === true || value === 1 || value === '1' || value === 'true';
    if (widget === 'boolean_checkbox') {
      return <input type="checkbox" checked={checked} onChange={(event) => onChange(valueEvent(event.target.checked))} className={className} aria-label={t('Oui / Non')} />;
    }
    if (widget === 'boolean_favorite') {
      return <button type="button" disabled={disabled} onClick={() => onChange(valueEvent(!checked))} aria-pressed={checked} aria-label={t(checked ? 'Retirer des favoris' : 'Ajouter aux favoris')} className={`text-xl ${checked ? 'text-amber-500' : 'text-slate-300'}`}>{checked ? '★' : '☆'}</button>;
    }
    return (
      <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(valueEvent(!checked))} className={`inline-flex h-6 w-11 items-center rounded-full p-0.5 transition ${checked ? 'justify-end bg-violet-600' : 'justify-start bg-slate-300'}`}>
        <span className="h-5 w-5 rounded-full bg-white shadow" />
      </button>
    );
  }

  if (type === 'selection' && SELECTION_EDIT_WIDGETS.has(widget)) {
    const choices = selectionChoices(field);
    if (widget === 'priority') {
      const selectedIndex = choices.findIndex((option) => option.value === String(value ?? ''));
      const hasZeroChoice = choices.some((option) => Number(option.value) === 0);
      const priorityChoices = choices.filter((option) => Number(option.value) > 0);
      const count = priorityChoices.length || (choices.length ? choices.length : 5);
      const rawPriority = Number(value);
      const active = Number.isFinite(rawPriority) ? rawPriority : (selectedIndex >= 0 ? selectedIndex + (hasZeroChoice ? 0 : 1) : 0);
      return <span className="inline-flex items-center gap-1" role="radiogroup" aria-label={t(field.label || 'Priorité')}>
        {Array.from({ length: count }, (_, index) => {
          const option = priorityChoices[index] || { value: String(index + 1), label: String(index + 1) };
          const activeStar = index < active;
          return <button key={option.value} type="button" role="radio" aria-checked={String(option.value) === String(value)} disabled={disabled} onClick={() => onChange(valueEvent(option.value))} className={`text-xl ${activeStar ? 'text-amber-500' : 'text-slate-300'}`} title={t(option.label)}>{activeStar ? '★' : '☆'}</button>;
        })}
      </span>;
    }
    if (widget === 'radio') {
      return <span className="inline-flex flex-wrap gap-x-4 gap-y-2" role="radiogroup" aria-label={t(field.label || 'Sélection')}>
        {choices.map((option) => <label key={option.value} className="inline-flex items-center gap-1.5 text-sm">
          <input type="radio" name={field.name} value={option.value} checked={String(value ?? '') === option.value} onChange={() => onChange(valueEvent(option.value))} />
          {t(option.label)}
        </label>)}
      </span>;
    }
    if (widget === 'statusbar') {
      return <span className="inline-flex flex-wrap gap-1" role="group" aria-label={t(field.label || 'Étape')}>
        {choices.map((option) => <button key={option.value} type="button" disabled={disabled} aria-pressed={String(value ?? '') === option.value} onClick={() => onChange(valueEvent(option.value))} className={`rounded border px-2 py-1 text-xs ${String(value ?? '') === option.value ? 'border-violet-600 bg-violet-50 font-semibold text-violet-800' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>{t(option.label)}</button>)}
      </span>;
    }
  }

  if ((widget === 'many2many_binary' || widget === 'many2one_binary') && ['many2many', 'many2one'].includes(type)) {
    const relation = String(field.relation || '').toLowerCase();
    const isAttachmentRelation = relation === 'core.irattachment' || relation === 'ir.attachment';
    if (!isAttachmentRelation) return <span className="text-xs text-rose-700">Ce widget exige une relation vers core.IrAttachment.</span>;
    return <AttachmentFieldInput value={value} multiple={widget === 'many2many_binary'} onChange={onChange} disabled={disabled} accept={widgetOptions.accepted_file_extensions || field.accepted_file_extensions || ''} />;
  }

  if (widget === 'signature' && type === 'binary') return <SignaturePad value={value} onChange={onChange} disabled={disabled} />;
  if (type === 'binary' || widget === 'image') return <BinaryInput value={value} onChange={onChange} disabled={disabled} accept={widgetOptions.accepted_file_extensions || field.accepted_file_extensions || (widget === 'image' ? 'image/*' : '')} className={commonClass} />;
  if (type === 'html' && (widget === 'html' || !widget)) return <RichHtmlInput value={value} onChange={onChange} disabled={disabled} className={commonClass} height={widgetOptions.height} codeview={Boolean(widgetOptions.codeview)} />;
  if (type === 'html' && widget === 'html_source') return <textarea value={value ?? ''} onChange={onChange} disabled={disabled} rows={5} className={commonClass} />;
  if (type === 'html' && widget === 'html_preserve_lines') return <textarea value={value ?? ''} onChange={onChange} disabled={disabled} rows={5} className={commonClass} />;

  if (type === 'char' || type === 'text') {
    const inputType = widget === 'email' ? 'email' : widget === 'phone' ? 'tel' : widget === 'url' ? 'url' : 'text';
    const password = widgetAttributes.password === true || widgetAttributes.password === '1' || widgetAttributes.password === 'true';
    const autoComplete = widgetAttributes.autocomplete || undefined;
    if (type === 'text' || widget === 'text') return <textarea value={value ?? ''} onChange={onChange} disabled={disabled} rows={4} placeholder={placeholder || undefined} className={`${commonClass} min-h-24`} />;
    const caseMode = widget === 'text_uppercase' ? 'uppercase' : widget === 'text_lowercase' ? 'lowercase' : undefined;
    return <input type={password ? 'password' : inputType} autoComplete={autoComplete} value={value ?? ''} onChange={(event) => onChange(valueEvent(widget === 'text_uppercase' ? event.target.value.toLocaleUpperCase() : widget === 'text_lowercase' ? event.target.value.toLocaleLowerCase() : event.target.value))} disabled={disabled} placeholder={placeholder || undefined} className={commonClass} style={{ textTransform: caseMode }} />;
  }
  if (type === 'selection' && !SELECTION_EDIT_WIDGETS.has(widget)) {
    const choices = selectionChoices(field);
    if (choices.length) return <select value={value ?? ''} onChange={onChange} disabled={disabled} className={commonClass}>{choices.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>;
  }

  if (!['date', 'datetime', 'monetary', 'integer', 'float', 'decimal'].includes(type)) return null;

  const inputType = type === 'date' || (type === 'datetime' && widgetOptions.show_time === false) ? 'date' : type === 'datetime' ? 'datetime-local' : 'number';
  const today = new Date();
  const todayISO = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const resolveDateBound = (bound) => bound === 'today' ? todayISO : bound;
  const recordStart = widgetOptions.start_date_field ? record?.[widgetOptions.start_date_field] : undefined;
  const recordEnd = widgetOptions.end_date_field ? record?.[widgetOptions.end_date_field] : undefined;
  const minBound = resolveDateBound(widgetOptions.min_date || (widgetOptions.end_date_field ? recordStart : undefined));
  const maxBound = resolveDateBound(widgetOptions.max_date || (widgetOptions.start_date_field ? recordEnd : undefined));
  const minAttribute = inputType === 'datetime-local' && minBound && /^\d{4}-\d{2}-\d{2}$/.test(minBound) ? `${minBound}T00:00` : minBound;
  const maxAttribute = inputType === 'datetime-local' && maxBound && /^\d{4}-\d{2}-\d{2}$/.test(maxBound) ? `${maxBound}T23:59` : maxBound;
  const stepSeconds = type === 'datetime'
    ? (widgetOptions.show_seconds ? 1 : Math.max(1, Number(widgetOptions.rounding) || 5) * 60)
    : undefined;
  const numberMin = type === 'integer' && widgetOptions.min !== undefined ? widgetOptions.min : undefined;
  const numberMax = type === 'integer' && widgetOptions.max !== undefined ? widgetOptions.max : undefined;
  const numberStep = type === 'integer' && widgetOptions.step !== undefined ? widgetOptions.step : (type === 'integer' ? '1' : 'any');
  const numericValue = Number(value);
  const futureWarning = widgetOptions.warn_future && ['date', 'datetime'].includes(type)
    && value && new Date(value).getTime() > Date.now();
  const inputValue = inputType === 'date' && type === 'datetime'
    ? toDateTimeLocalValue(value, widgetOptions.show_seconds).slice(0, 10)
    : type === 'datetime' ? toDateTimeLocalValue(value, widgetOptions.show_seconds) : value ?? '';
  const input = (
    <input
      type={inputType}
      step={stepSeconds || numberStep}
      min={inputType === 'date' || inputType === 'datetime-local' ? minAttribute || undefined : numberMin}
      max={inputType === 'date' || inputType === 'datetime-local' ? maxAttribute || undefined : numberMax}
      value={inputValue}
      onChange={inputType === 'date' && type === 'datetime'
        ? (event) => onChange(valueEvent(event.target.value ? `${event.target.value}T00:00` : ''))
        : onChange}
      placeholder={placeholder || undefined}
      className={commonClass}
      style={{ height: 26 }}
    />
  );

  if (type === 'date' || type === 'datetime') return <div className="space-y-1">{input}{futureWarning && <span role="status" className="block text-xs text-amber-700">⚠ Cette date est dans le futur.</span>}</div>;
  if (type !== 'monetary') {
    if (Number.isFinite(numericValue) && ((numberMin !== undefined && numericValue < Number(numberMin)) || (numberMax !== undefined && numericValue > Number(numberMax)))) {
      return <div className="space-y-1">{input}<span role="alert" className="block text-xs text-rose-700">La valeur doit être comprise entre {numberMin ?? '—'} et {numberMax ?? '—'}.</span></div>;
    }
    return input;
  }
  const currency = widgetOptions.currency_field ? record?.[widgetOptions.currency_field] : null;
  const effectiveCurrency = currency && typeof currency === 'object' ? currency : currencyEntity;
  const suffix = widgetOptions.no_symbol ? '' : currencyLabel(effectiveCurrency, widget || 'monetary');
  return (
    <div className="relative w-full">
      {React.cloneElement(input, { className: `${commonClass} ${suffix ? 'pr-16' : ''}` })}
      {suffix && <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-[10px] text-gray-500">{suffix}</span>}
    </div>
  );
}
