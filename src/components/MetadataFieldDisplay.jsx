import React, { useEffect, useRef, useState } from 'react';
import { formatMetadataValue, sanitizeRichHtml } from '../services/fieldDisplay';
import { useLanguage } from '../context/LanguageContext';
import { AttachmentFieldDisplay, BinaryDownloadButton } from './AttachmentWidget';

const BADGE_WIDGETS = new Set([
  'boolean_badge', 'selection_badge', 'badges_selection', 'relation_badge',
  'reference_badge', 'badge', 'state_selection',
]);

const TAG_COLORS = [
  'bg-rose-500', 'bg-orange-500', 'bg-amber-500', 'bg-lime-500', 'bg-green-500', 'bg-emerald-500',
  'bg-teal-500', 'bg-cyan-500', 'bg-sky-500', 'bg-blue-500', 'bg-violet-500', 'bg-fuchsia-500',
];

const DECORATION_CLASSES = {
  success: 'bg-emerald-100 text-emerald-800', danger: 'bg-rose-100 text-rose-800',
  warning: 'bg-amber-100 text-amber-900', info: 'bg-sky-100 text-sky-800',
  primary: 'bg-violet-100 text-violet-800', muted: 'bg-slate-100 text-slate-600',
  bf: 'font-bold', it: 'italic', underline: 'underline',
};

function expressionValue(raw) {
  const text = String(raw || '').trim();
  if (/^(True|true)$/.test(text)) return true;
  if (/^(False|false)$/.test(text)) return false;
  if (/^(None|null)$/.test(text)) return null;
  if (/^-?\d+(?:\.\d+)?$/.test(text)) return Number(text);
  const quoted = text.match(/^(?:'([^']*)'|"([^"]*)")$/);
  return quoted ? (quoted[1] ?? quoted[2]) : text;
}

/** Evaluate only simple field comparisons; never execute Python/XML expressions. */
function safeExpressionMatches(expression, record = {}) {
  const source = String(expression || '').trim().replace(/^\(+|\)+$/g, '').trim();
  if (!source) return false;
  const disjunction = source.split(/\s+or\s+/i);
  if (disjunction.length > 1) return disjunction.some((part) => safeExpressionMatches(part, record));
  const conjunction = source.split(/\s+and\s+/i);
  if (conjunction.length > 1) return conjunction.every((part) => safeExpressionMatches(part, record));
  if (/^(True|true)$/.test(source)) return true;
  if (/^(False|false)$/.test(source)) return false;
  const comparison = source.match(/^([A-Za-z_][A-Za-z0-9_]*)\s+(not\s+in|in|==|!=|>=|<=|>|<)\s+(.+)$/);
  if (comparison) {
    const [, name, operator, expectedText] = comparison;
    const actual = record?.[name];
    const expected = expressionValue(expectedText);
    if (operator === '==') return String(actual ?? '') === String(expected ?? '');
    if (operator === '!=') return String(actual ?? '') !== String(expected ?? '');
    if (operator === 'in' || operator === 'not in') {
      const values = expectedText.replace(/^\(|\)$/g, '').replace(/^\[|\]$/g, '').split(',').map(expressionValue);
      const contains = values.some((item) => String(item) === String(actual));
      return operator === 'in' ? contains : !contains;
    }
    const left = Number(actual); const right = Number(expected);
    if (!Number.isFinite(left) || !Number.isFinite(right)) return false;
    return operator === '>' ? left > right : operator === '<' ? left < right : operator === '>=' ? left >= right : left <= right;
  }
  const fieldName = source.match(/^([A-Za-z_][A-Za-z0-9_]*)$/)?.[1];
  return fieldName ? Boolean(record?.[fieldName]) : false;
}

function decorationClass(attributes = {}, record = {}) {
  return Object.entries(attributes)
    .filter(([name, expression]) => name.startsWith('decoration-') && safeExpressionMatches(expression, record))
    .map(([name]) => DECORATION_CLASSES[name.slice('decoration-'.length)] || '')
    .filter(Boolean)
    .join(' ');
}

function safeWebUrl(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  if (raw.startsWith('/') && !raw.startsWith('//')) return raw;
  const candidate = /^[a-z][a-z\d+.-]*:/i.test(raw) ? raw : `https://${raw}`;
  try {
    const parsed = new URL(candidate, typeof window !== 'undefined' ? window.location.origin : 'https://somane.invalid');
    return ['http:', 'https:'].includes(parsed.protocol) ? parsed.href : '';
  } catch {
    return '';
  }
}

function mediaSource(value, expectedMime = '') {
  if (value && typeof value === 'object') {
    const direct = value.url || value.content_url || value.src;
    if (direct) return String(direct).startsWith('data:') ? String(direct) : safeWebUrl(direct);
    const data = value.data || value.content || value.base64;
    const mime = value.mimetype || value.content_type || expectedMime;
    if (data && String(mime).startsWith('image/')) return `data:${mime};base64,${data}`;
    if (data && mime === 'application/pdf') return `data:application/pdf;base64,${data}`;
    return '';
  }
  const text = String(value ?? '').trim();
  if (/^data:(image\/|application\/pdf)/i.test(text)) return text;
  if (expectedMime.startsWith('image/') && /^[A-Za-z0-9+/=]+$/.test(text)) return `data:${expectedMime};base64,${text}`;
  if (expectedMime === 'application/pdf' && /^[A-Za-z0-9+/=]+$/.test(text)) return `data:application/pdf;base64,${text}`;
  return safeWebUrl(text);
}

function choiceLabel(field, value, translate) {
  if (!Array.isArray(field.selection)) return String(value ?? '—');
  const choice = field.selection.find((item) => String(item.value) === String(value));
  return choice ? translate(choice.label || choice.name || String(value)) : String(value ?? '—');
}

function asItems(value) {
  if (Array.isArray(value)) return value;
  return value === null || value === undefined || value === '' ? [] : [value];
}

function isTruthy(value) {
  return value === true || value === 1 || value === '1' || value === 'true' || value === 'yes';
}

function itemLabel(value) {
  if (value && typeof value === 'object') return value.name || value.nom || value.label || value.filename || value.id || '—';
  return String(value ?? '—');
}

function Avatar({ value, label }) {
  const image = mediaSource(value?.avatar_url || value?.image_url || value?.image || value?.avatar, 'image/png');
  const initials = String(label || '?').trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
  return image
    ? <img src={image} alt="" className="h-6 w-6 rounded-full object-cover" />
    : <span aria-hidden="true" className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-violet-100 text-[10px] font-semibold text-violet-800">{initials || '?'}</span>;
}

function ZoomImage({ src, alt, style, className, delay = 0 }) {
  const [zoomed, setZoomed] = useState(false);
  const timer = useRef(null);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const scheduleZoom = () => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setZoomed(true), Math.max(0, Number(delay) || 0));
  };
  return <>
    <button type="button" onClick={() => setZoomed(true)} onMouseEnter={scheduleZoom} onMouseLeave={() => window.clearTimeout(timer.current)} className="inline-flex max-w-full cursor-zoom-in border-0 bg-transparent p-0">
      <img src={src} alt={alt} loading="lazy" style={style} className={className} />
    </button>
    {zoomed && <div role="dialog" aria-label={alt || 'Aperçu image'} className="fixed inset-0 z-[120] flex cursor-zoom-out items-center justify-center bg-black/75 p-6" onClick={() => setZoomed(false)}>
      <img src={src} alt={alt} className="max-h-full max-w-full rounded bg-white object-contain shadow-2xl" />
    </div>}
  </>;
}

function ClipboardValue({ value, showValue = true, buttonLabel, disabled = false, buttonClass = '', t }) {
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);

  const copy = async () => {
    try {
      if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(String(value ?? ''));
      setCopied(true);
      setFailed(false);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setFailed(true);
      setCopied(false);
    }
  };

  return (
    <span className="inline-flex max-w-full items-center gap-1.5">
      {showValue && <span className="break-all">{String(value ?? '')}</span>}
      <button type="button" disabled={disabled} onClick={copy} className={`shrink-0 rounded border border-slate-200 px-1.5 py-0.5 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-50 ${buttonClass}`} aria-label={t('Copier dans le presse-papiers')} title={t('Copier dans le presse-papiers')}>
        {copied ? t('Copié') : (buttonLabel || t('Copier'))}
      </button>
      {failed && <span role="status" className="text-xs text-rose-700">{t('Copie indisponible')}</span>}
    </span>
  );
}

function ProgressVisual({ value, type, compact = false, locale, t, maxValue = 100, caption = '' }) {
  const number = Number(value);
  if (!Number.isFinite(number)) return <span>—</span>;
  const maximum = Number.isFinite(Number(maxValue)) && Number(maxValue) > 0 ? Number(maxValue) : 100;
  const ratio = type === 'percentage' ? number : number / maximum;
  const percentage = Math.max(0, Math.min(100, ratio * 100));
  const numberFormat = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 });
  const formattedNumber = numberFormat.format(number);
  const formattedMaximum = numberFormat.format(maximum);
  const label = type === 'percentage'
    ? new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 1 }).format(number)
    : type === 'progressbar'
      ? `${formattedNumber} / ${formattedMaximum}`
      : `${formattedNumber}%`;

  if (type === 'percentpie') {
    return (
      <span className="inline-flex flex-col items-center gap-1">
        <span role="img" aria-label={`${label} ${t('pour cent')}`} className="inline-flex h-12 w-12 items-center justify-center rounded-full text-[10px] font-semibold text-slate-800" style={{ background: `conic-gradient(#7c3aed ${percentage}%, #e2e8f0 0)` }}>
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white">{label}</span>
        </span>
        {caption && <span className="max-w-28 truncate text-center text-[10px] text-slate-600" title={caption}>{caption}</span>}
      </span>
    );
  }

  return (
    <span className={`inline-flex ${compact ? 'w-28' : 'w-full max-w-56'} flex-col gap-1`}>
      <span className="text-xs text-slate-600">{label}</span>
      <span className="h-2 overflow-hidden rounded-full bg-slate-200" role="img" aria-label={`${t('Progression')} : ${label}`}>
        <span className="block h-full rounded-full bg-violet-600" style={{ width: `${percentage}%` }} />
      </span>
    </span>
  );
}

function HandleDisplay({ value, field, disabled, onDragStart, onDrop }) {
  return <span
    draggable={!disabled}
    onDragStart={onDragStart}
    onDrop={onDrop}
    className={`inline-flex cursor-grab items-center gap-1 text-slate-500 active:cursor-grabbing ${disabled ? 'opacity-60' : 'hover:text-violet-700'}`}
    title={disabled ? 'Réorganisation indisponible dans ce contexte' : 'Faire glisser pour réorganiser'}
    aria-label="Poignée de réorganisation"
  ><span aria-hidden="true" className="text-lg leading-none">⠿</span><span className="sr-only">{value ?? field?.label ?? 'Réorganiser'}</span></span>;
}

function StatInfo({ value, field, entity, locale, t, record = {} }) {
  const configuredLabel = field.widget_options?.label_field ? record?.[field.widget_options.label_field] : '';
  const label = configuredLabel || field.label || field.field_description || field.name || t('Indicateur');
  const count = Array.isArray(value) ? value.length : (field.type === 'many2one' ? (value ? 1 : 0) : value);
  const formatted = formatMetadataValue(count, field, entity, { locale, translate: t });
  const actionUrl = safeWebUrl(field.action_url || field.url);
  const content = <><span className="block truncate text-xs font-medium text-slate-500">{label}</span><span className="mt-1 block truncate text-lg font-semibold text-slate-900">{formatted}</span></>;
  return actionUrl
    ? <a href={actionUrl} className="inline-flex min-w-28 flex-col rounded-md border border-slate-200 bg-white px-3 py-2 text-left shadow-sm hover:border-violet-300 hover:bg-violet-50">{content}</a>
    : <span className="inline-flex min-w-28 flex-col rounded-md border border-slate-200 bg-white px-3 py-2 shadow-sm">{content}</span>;
}

export default function MetadataFieldDisplay({ value, field = {}, entity, record = {}, className = '', onHandleDragStart, onHandleDrop, handleDisabled = true }) {
  const { languageTag, t } = useLanguage();
  const widget = field.widget || field.display_widget || '';
  const widgetOptions = field.widget_options || field.display_widget_options?.options || {};
  const widgetAttributes = field.widget_attributes || field.display_widget_options?.attributes || {};
  const hasText = value !== null && value !== undefined && value !== '';
  const imageSize = Array.isArray(widgetOptions.size) ? widgetOptions.size : [];
  const imageWidth = Number(widgetOptions.width || imageSize[0]);
  const imageHeight = Number(widgetOptions.height || imageSize[1]);
  const imageStyle = {
    ...(Number.isFinite(imageWidth) && imageWidth > 0 ? { width: `${Math.min(imageWidth, 2048)}px` } : {}),
    ...(Number.isFinite(imageHeight) && imageHeight > 0 ? { height: `${Math.min(imageHeight, 2048)}px` } : {}),
  };
  const imageClass = typeof widgetAttributes.img_class === 'string'
    ? widgetAttributes.img_class.split(/\s+/).filter((name) => /^[a-zA-Z0-9:_/-]+$/.test(name)).join(' ')
    : '';
  const clipboardLabel = widgetAttributes.string || widgetOptions.string;
  const clipboardDisabled = widgetAttributes.disabled === true || widgetAttributes.disabled === 'true' || widgetAttributes.disabled === '1'
    || safeExpressionMatches(widgetAttributes.disabled, record);
  const clipboardClass = widgetOptions.btn_class || '';

  if (widget === 'image_url' || (widget === 'image' && field.type !== 'binary')) {
    const src = mediaSource(value);
    if (src) return widgetOptions.zoom
      ? <ZoomImage src={src} alt={field.label || field.field_description || ''} delay={widgetOptions.zoom_delay} style={imageStyle} className={`max-h-36 max-w-full rounded object-contain ${imageClass} ${className}`} />
      : <img src={src} alt={field.label || field.field_description || ''} loading="lazy" style={imageStyle} className={`max-h-36 max-w-full rounded object-contain ${imageClass} ${className}`} />;
  }

  if (widget === 'image' || widget === 'signature') {
    const previewValue = widgetOptions.preview_image ? record?.[widgetOptions.preview_image] : value;
    const src = mediaSource(previewValue, value?.mimetype || value?.content_type || 'image/png');
    const alt = widgetAttributes.string || (widget === 'signature' ? t('Signature') : (field.label || t('Image')));
    if (src) return widgetOptions.zoom
      ? <ZoomImage src={src} alt={alt} delay={widgetOptions.zoom_delay} style={imageStyle} className={`max-h-36 max-w-full rounded object-contain ${imageClass} ${className}`} />
      : <img src={src} alt={alt} loading="lazy" style={imageStyle} className={`max-h-36 max-w-full rounded object-contain ${imageClass} ${className}`} />;
  }

  if (widget === 'binary' && value && typeof value === 'object' && (value.id || value.pk)) {
    return <AttachmentFieldDisplay value={value} className={className} />;
  }
  if (widget === 'binary' && hasText) {
    const filename = widgetAttributes.filename ? record?.[widgetAttributes.filename] : '';
    const name = value?.name || value?.filename || filename || field.filename || field.name || 'fichier';
    return <span className={`inline-flex items-center gap-2 ${className}`}><span>{name}</span><BinaryDownloadButton value={value} name={name} mimetype={value?.mimetype || value?.content_type} /></span>;
  }

  if (widget === 'many2many_binary' || widget === 'many2one_binary') {
    return <AttachmentFieldDisplay value={value} multiple={widget === 'many2many_binary'} className={className} />;
  }

  if (widget === 'statinfo') {
    return <StatInfo value={value} field={field} entity={entity} locale={languageTag} t={t} record={record} />;
  }

  if (widget === 'handle') {
    return <HandleDisplay value={value} field={field} disabled={handleDisabled} onDragStart={onHandleDragStart} onDrop={onHandleDrop} />;
  }

  if (widget === 'pdf_viewer') {
    const src = mediaSource(value, 'application/pdf');
    if (src) return <iframe title={field.label || t('Aperçu PDF')} src={src} sandbox="" className={`h-64 w-full rounded border border-slate-200 ${className}`} />;
  }

  if (widget === 'email' && hasText) {
    const email = String(value).trim();
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
      ? <a className={`text-sky-700 hover:underline ${className}`} href={`mailto:${email}`}>{email}</a>
      : <span className={className}>{email}</span>;
  }

  if (widget === 'phone' && hasText) {
    const phone = String(value).trim();
    const dial = phone.replace(/[^\d+*#,;]/g, '');
    const allowSms = widgetOptions.enable_sms === true || widgetOptions.enable_sms === 'true';
    return <span className={`inline-flex flex-wrap items-center gap-2 ${className}`}>
      {dial ? <a className="text-sky-700 hover:underline" href={`tel:${dial}`}>{phone}</a> : <span>{phone}</span>}
      {allowSms && dial && <a className="text-xs text-violet-700 hover:underline" href={`sms:${dial}`}>{t('SMS')}</a>}
    </span>;
  }

  if ((widget === 'url' || widget === 'CopyClipboardURL') && hasText) {
    const href = safeWebUrl(value);
    const label = widgetAttributes.text || String(value);
    if (widget === 'CopyClipboardURL') {
    return <span className={`inline-flex flex-wrap items-center gap-2 ${className}`}>
        {href ? <a href={href} target={href.startsWith('/') ? undefined : '_blank'} rel="noreferrer" className="break-all text-sky-700 hover:underline">{label}</a> : <span>{label}</span>}
        {!clipboardDisabled && <ClipboardValue value={value} showValue={false} buttonLabel={clipboardLabel} buttonClass={clipboardClass} t={t} />}
      </span>;
    }
    return href
      ? <a className={`break-all text-sky-700 hover:underline ${className}`} href={href} target={href.startsWith('/') ? undefined : '_blank'} rel="noreferrer">{label}</a>
      : <span className={className}>{label}</span>;
  }

  if (widget === 'CopyClipboardButton' && hasText) return clipboardDisabled ? null : <ClipboardValue value={value} showValue={false} buttonLabel={clipboardLabel} buttonClass={clipboardClass} t={t} />;
  if (widget === 'CopyClipboardChar' && hasText) return clipboardDisabled ? <span className={className}>{String(value)}</span> : <ClipboardValue value={value} buttonLabel={clipboardLabel} buttonClass={clipboardClass} t={t} />;

  if (['progressbar', 'percentpie'].includes(widget)) {
    const configuredMaximum = widgetOptions.max_value;
    const numericMaximum = Number(configuredMaximum);
    const maximumFromRecord = typeof configuredMaximum === 'string' && !Number.isFinite(numericMaximum)
      ? record?.[configuredMaximum]
      : undefined;
    const maxValue = maximumFromRecord ?? configuredMaximum ?? 100;
    const caption = widgetAttributes.string || widgetOptions.string || field.label || field.field_description || field.name || '';
    return <span className={className}><ProgressVisual value={value} type={widget} compact={widget === 'percentpie'} locale={languageTag} t={t} maxValue={maxValue} caption={caption} /></span>;
  }

  if (widget === 'priority') {
    const choices = Array.isArray(field.selection) ? field.selection : [];
    const choiceIndex = choices.findIndex((item) => String(item.value) === String(value));
    const raw = Number(value);
    const hasZeroChoice = choices.some((item) => Number(item.value) === 0);
    const active = Number.isFinite(raw) ? raw : (choiceIndex >= 0 ? choiceIndex + (hasZeroChoice ? 0 : 1) : 0);
    const max = Number(widgetOptions.badge_limit) > 0 ? Number(widgetOptions.badge_limit) : (choices.length ? (hasZeroChoice ? choices.length - 1 : choices.length) : 5);
    return <span role="img" aria-label={`${t('Priorité')} ${active} ${t('sur')} ${max}`} className={`whitespace-nowrap text-amber-500 ${className}`}>
      {'★'.repeat(Math.max(0, Math.min(max, active)))}<span className="text-slate-300">{'☆'.repeat(Math.max(0, max - active))}</span>
    </span>;
  }

  if (widget === 'statusbar' && Array.isArray(field.selection) && field.selection.length) {
    const selectedIndex = field.selection.findIndex((item) => String(item.value) === String(value));
    const visibleStates = widgetAttributes.statusbar_visible
      ? String(widgetAttributes.statusbar_visible).split(',').map((item) => item.trim())
      : null;
    const displayedStates = visibleStates ? field.selection.filter((item) => visibleStates.includes(String(item.value))) : field.selection;
    return <span className={`inline-flex flex-wrap items-center gap-1 ${className}`} aria-label={`${t('Étape actuelle')} : ${choiceLabel(field, value, t)}`}>
      {displayedStates.map((item, index) => <React.Fragment key={item.value}>
        {index > 0 && <span aria-hidden="true" className="text-slate-300">›</span>}
        <span className={`rounded px-2 py-1 text-xs ${index === selectedIndex ? 'bg-violet-100 font-semibold text-violet-800' : index < selectedIndex ? 'text-slate-700' : 'text-slate-400'}`}>{t(item.label || item.name || item.value)}</span>
      </React.Fragment>)}
    </span>;
  }

  if (widget === 'radio' && Array.isArray(field.selection) && field.selection.length) {
    return <span className={`inline-flex flex-wrap gap-2 ${className}`}>{field.selection.map((item) => <span key={item.value} className={`rounded-full border px-2 py-1 text-xs ${String(item.value) === String(value) ? 'border-violet-300 bg-violet-50 text-violet-800' : 'border-slate-200 text-slate-500'}`}>{String(item.value) === String(value) ? '● ' : '○ '}{t(item.label || item.name || item.value)}</span>)}</span>;
  }

  if (widget === 'boolean_toggle') {
    const checked = isTruthy(value);
    return <span role="img" aria-label={t(checked ? 'Activé' : 'Désactivé')} className={`inline-flex h-5 w-9 items-center rounded-full p-0.5 ${checked ? 'justify-end bg-violet-600' : 'justify-start bg-slate-300'} ${className}`}><span className="h-4 w-4 rounded-full bg-white shadow" /></span>;
  }
  if (widget === 'boolean_checkbox') return <input type="checkbox" checked={isTruthy(value)} readOnly aria-label={t(isTruthy(value) ? 'Oui' : 'Non')} className={className} />;
  if (widget === 'boolean_favorite') return <span aria-label={t(isTruthy(value) ? 'Favori' : 'Non favori')} className={`text-amber-500 ${className}`}>{isTruthy(value) ? '★' : '☆'}</span>;
  if (widget === 'boolean_icon') {
    const checked = isTruthy(value);
    return <span aria-label={t(checked ? 'Oui' : 'Non')} className={`inline-flex items-center gap-1 ${checked ? 'text-emerald-700' : 'text-slate-500'} ${className}`}><span aria-hidden="true">{checked ? '✓' : '✕'}</span>{t(checked ? 'Oui' : 'Non')}</span>;
  }

  if (widget === 'many2one_avatar_user' && value && typeof value === 'object') {
    return <span className={`inline-flex items-center gap-2 ${className}`}><Avatar value={value} label={itemLabel(value)} /><span>{itemLabel(value)}</span></span>;
  }

  if (['badges_many2one', 'many2many_tags', 'many2many_tags_color_dot', 'relation_chips'].includes(widget)) {
    const items = asItems(value);
    const itemLimit = Number(widgetOptions.tag_limit || widgetOptions.badge_limit || widgetOptions.number_of_files);
    const visibleItems = Number.isFinite(itemLimit) && itemLimit > 0 ? items.slice(0, itemLimit) : items;
    return <span className={`inline-flex flex-wrap gap-1 ${className}`}>
      {items.length ? <>{visibleItems.map((item, index) => {
        const label = itemLabel(item);
        if (widget === 'many2many_tags_color_dot') {
          const configuredColor = widgetOptions.color_field ? record?.[widgetOptions.color_field] : undefined;
          const color = Number(item?.color ?? configuredColor);
          return <span key={`${label}-${index}`} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700"><span aria-hidden="true" className={`h-2 w-2 rounded-full ${TAG_COLORS[Number.isInteger(color) ? Math.abs(color) % TAG_COLORS.length : index % TAG_COLORS.length]}`} />{label}</span>;
        }
        return <span key={`${label}-${index}`} className={`rounded-full px-2 py-0.5 text-xs ${widget === 'badges_many2one' ? 'bg-violet-100 text-violet-800' : 'bg-slate-100 text-slate-700'}`}>{label}</span>;
      })}{visibleItems.length < items.length && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">+{items.length - visibleItems.length}</span>}</> : '—'}
    </span>;
  }

  const text = formatMetadataValue(value, field, entity, { locale: languageTag, translate: t, record });
  if ((widget === 'html' || (!widget && field.type === 'html')) && hasText) {
    const height = Number(widgetOptions.height);
    const style = Number.isFinite(height) && height > 0 ? { maxHeight: `${Math.min(height, 2048)}px`, overflow: 'auto' } : undefined;
    return <div style={style} className={`prose prose-sm max-w-none break-words ${className}`} dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(value) }} />;
  }
  if (field.type === 'json') {
    return <pre className={`overflow-x-auto whitespace-pre-wrap rounded bg-slate-50 p-2 font-mono text-xs ${className}`}>{text}</pre>;
  }
  if (widget === 'html_source') return <code className={`break-all rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs ${className}`}>{text}</code>;
  if (widget === 'html_preserve_lines' || widget === 'text_preserve_lines' || (field.type === 'text' && widgetOptions.line_breaks === true)) return <span className={`whitespace-pre-line ${className}`}>{text}</span>;
  if (BADGE_WIDGETS.has(widget)) {
    const isFalse = !isTruthy(value);
    const stateClass = widget === 'state_selection' && ['done', 'normal'].includes(String(value))
      ? 'bg-emerald-100 text-emerald-800'
      : widget === 'state_selection' && String(value) === 'blocked'
        ? 'bg-rose-100 text-rose-800'
        : isFalse && widget === 'boolean_badge' ? 'bg-slate-100 text-slate-600' : 'bg-violet-100 text-violet-800';
    const selection = Array.isArray(field.selection) ? field.selection.find((item) => String(item.value) === String(value)) : null;
    let iconMapping = widgetOptions.icon_mapping || {};
    if (typeof iconMapping === 'string') {
      try { iconMapping = JSON.parse(iconMapping); } catch { iconMapping = {}; }
    }
    const icon = selection?.icon || iconMapping?.[String(value)] || widgetOptions.default_icon || widgetOptions.icon;
    const customClass = typeof widgetAttributes.class === 'string'
      ? widgetAttributes.class.split(/\s+/).filter((name) => /^[a-zA-Z0-9:_/-]+$/.test(name)).join(' ')
      : '';
    const decoration = decorationClass(widgetAttributes, record);
    const label = widget === 'state_selection' && Array.isArray(field.selection) ? choiceLabel(field, value, t) : text;
    return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${stateClass} ${customClass} ${decoration} ${className}`}>{icon ? <span aria-hidden="true">{String(icon)}</span> : null}{widget === 'state_selection' && (widgetOptions.hide_label === true || widgetOptions.hide_label === 'true') ? null : label}</span>;
  }
  if (widget === 'text_code') return <code className={`rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs ${className}`}>{text}</code>;
  if (widget === 'text_truncate') return <span title={text} className={`inline-block max-w-full truncate align-bottom ${className}`}>{text}</span>;
  if (widgetOptions.warn_future && ['date', 'datetime'].includes(field.type) && new Date(value).getTime() > Date.now()) {
    return <span className={`inline-flex items-center gap-1 ${className}`} title={t('Cette date est dans le futur.')}><span aria-hidden="true" className="text-amber-600">⚠</span>{text}</span>;
  }
  return <span className={className}>{text}</span>;
}
