const DEFAULT_LOCALE = 'fr-FR';

function currentLocale(locale) {
  if (locale) return locale;
  if (typeof document !== 'undefined' && document.documentElement.lang) return document.documentElement.lang;
  return DEFAULT_LOCALE;
}

export const FIELD_DISPLAY_OPTIONS = {
  char: [
    ['', 'Texte normal'], ['char', 'Widget texte simple'], ['text_uppercase', 'Majuscules'], ['text_lowercase', 'Minuscules'],
    ['text_code', 'Police code'], ['text_truncate', 'Texte raccourci'],
    ['email', 'Lien e-mail'], ['phone', 'Lien téléphonique'], ['url', 'Lien web'], ['badge', 'Badge'],
    ['image_url', 'Image depuis une URL'], ['CopyClipboardChar', 'Valeur avec bouton Copier'],
    ['CopyClipboardButton', 'Bouton Copier uniquement'], ['CopyClipboardURL', 'Lien web avec Copier'],
    ['statinfo', 'Bouton compteur'],
  ],
  text: [
    ['', 'Texte normal'], ['text', 'Widget texte multiligne'], ['text_preserve_lines', 'Conserver les lignes'],
    ['text_uppercase', 'Majuscules'], ['text_lowercase', 'Minuscules'],
    ['text_code', 'Police code'], ['text_truncate', 'Texte raccourci'],
    ['CopyClipboardChar', 'Valeur avec bouton Copier'], ['CopyClipboardButton', 'Bouton Copier uniquement'],
  ],
  integer: [
    ['', 'Nombre normal'], ['integer', 'Widget entier'], ['number_grouped', 'Avec séparateurs'],
    ['number_raw', 'Sans séparateurs'], ['number_compact', 'Format compact'],
    ['progressbar', 'Barre de progression'], ['percentpie', 'Jauge circulaire'],
    ['statinfo', 'Bouton compteur'], ['handle', 'Poignée de réorganisation'],
  ],
  float: [
    ['', 'Nombre normal'], ['float', 'Widget décimal'], ['number_grouped', 'Avec séparateurs'],
    ['number_raw', 'Sans séparateurs'], ['number_compact', 'Format compact'],
    ['float_time', 'Durée en heures et minutes'], ['percentage', 'Pourcentage'],
    ['progressbar', 'Barre de progression'], ['percentpie', 'Jauge circulaire'], ['statinfo', 'Bouton compteur'],
  ],
  decimal: [
    ['', 'Nombre normal'], ['float', 'Widget décimal'], ['number_grouped', 'Avec séparateurs'],
    ['number_raw', 'Sans séparateurs'], ['number_compact', 'Format compact'],
    ['percentage', 'Pourcentage'], ['progressbar', 'Barre de progression'],
    ['percentpie', 'Jauge circulaire'], ['statinfo', 'Bouton compteur'],
  ],
  boolean: [
    ['', 'Oui / Non'], ['boolean_badge', 'Badge coloré'], ['boolean_icon', 'Icône et libellé'],
    ['boolean_toggle', 'Interrupteur'], ['boolean_favorite', 'Étoile favorite'],
    ['boolean_checkbox', 'Case à cocher'],
  ],
  selection: [
    ['', 'Texte normal'], ['selection_badge', 'Badge coloré'], ['badges_selection', 'Badges de sélection'],
    ['badge', 'Badge'], ['statusbar', 'Étapes du statut'], ['state_selection', 'Statut coloré'],
    ['radio', 'Boutons radio'], ['priority', 'Étoiles de priorité'],
  ],
  date: [
    ['', 'Date courte'], ['date', 'Widget date'], ['date_long', 'Date longue'], ['date_no_year', 'Date sans année'], ['date_month_year', 'Mois et année'],
    ['date_year', 'Année seulement'], ['date_relative', 'Date relative'], ['relative_date', 'Date relative (widget)'],
  ],
  datetime: [
    ['', 'Date et heure courte'], ['datetime', 'Widget date et heure'], ['datetime_long', 'Date et heure détaillée'],
    ['relative_date', 'Date relative'],
  ],
  monetary: [
    ['', 'Devise de l’entité'], ['monetary', 'Widget monétaire'], ['monetary_code', 'Code de devise'],
    ['monetary_symbol', 'Symbole de devise'], ['monetary_number', 'Nombre sans devise'],
  ],
  many2one: [
    ['', 'Texte normal'], ['relation_badge', 'Badge relation'], ['badges_many2one', 'Badges de relation'],
    ['many2one_avatar_user', 'Avatar et utilisateur'], ['many2one_binary', 'Pièce jointe unique'],
    ['statinfo', 'Bouton compteur'],
  ],
  one2many: [['', 'Texte normal'], ['relation_chips', 'Étiquettes multiples'], ['many2many_tags', 'Étiquettes relationnelles'], ['statinfo', 'Bouton compteur']],
  many2many: [
    ['', 'Texte normal'], ['relation_chips', 'Étiquettes multiples'], ['many2many_tags', 'Étiquettes relationnelles'],
    ['many2many_tags_color_dot', 'Étiquettes avec pastille couleur'], ['many2many_binary', 'Pièces jointes multiples'],
  ],
  reference: [['', 'Référence lisible'], ['reference_badge', 'Badge avec modèle']],
  binary: [
    ['', 'Nom du fichier'], ['binary', 'Widget fichier'], ['binary_size', 'Taille du fichier'], ['binary_type', 'Type de fichier'],
    ['image', 'Aperçu image'], ['pdf_viewer', 'Aperçu PDF'], ['signature', 'Signature'],
  ],
  html: [['', 'Texte lisible'], ['html', 'Éditeur HTML riche'], ['html_source', 'Source HTML'], ['html_preserve_lines', 'Texte avec retours à la ligne']],
  json: [['', 'JSON formaté'], ['json_compact', 'JSON compact'], ['json_code', 'Bloc de code']],
};

const WIDGET_VIEW_TYPES = {
  statusbar: ['form'],
  percentpie: ['form', 'kanban'],
  badge: ['form', 'tree'],
  radio: ['form', 'tree'],
  handle: ['tree'],
  state_selection: ['form', 'kanban'],
  statinfo: ['form'],
  image_url: ['form', 'tree'],
  binary: ['form', 'tree'],
  pdf_viewer: ['form'],
  many2many_binary: ['form'],
  many2one_binary: ['form'],
  signature: ['form'],
  many2many_tags_color_dot: ['form', 'tree'],
  many2one_avatar_user: ['form', 'tree', 'kanban', 'activity'],
  badges_many2one: ['form', 'tree'],
  boolean_checkbox: ['form', 'tree'],
  relative_date: ['form', 'tree', 'kanban', 'card'],
  CopyClipboardChar: ['form', 'tree'],
  CopyClipboardButton: ['form', 'tree'],
  CopyClipboardURL: ['form', 'tree'],
};

const DEFAULT_WIDGET_VIEW_TYPES = ['form', 'tree', 'kanban'];

function canonicalViewType(viewType) {
  const normalized = String(viewType || '').toLowerCase();
  return normalized === 'list' ? 'tree' : normalized;
}

function widgetSupportsView(widget, viewType) {
  if (!widget) return true;
  const allowed = WIDGET_VIEW_TYPES[widget] || DEFAULT_WIDGET_VIEW_TYPES;
  return allowed.includes(canonicalViewType(viewType));
}

export function getFieldDisplayOptionsForView(fieldType, viewType) {
  return (FIELD_DISPLAY_OPTIONS[fieldType] || []).filter(([widget]) => widgetSupportsView(widget, viewType));
}

export function getGlobalFieldDisplayOptions(fieldType) {
  return (FIELD_DISPLAY_OPTIONS[fieldType] || []).filter(([widget]) => (
    widgetSupportsView(widget, 'form') && widgetSupportsView(widget, 'tree')
  ));
}

function parseDateOnly(value) {
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
}

function validDate(value) {
  const parsed = parseDateOnly(value) || new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function fileSizeLabel(size, locale) {
  const bytes = Number(size);
  if (!Number.isFinite(bytes) || bytes < 0) return '—';
  const english = currentLocale(locale).toLowerCase().startsWith('en');
  if (bytes < 1024) return `${bytes} ${english ? 'B' : 'o'}`;
  const units = english ? ['KB', 'MB', 'GB'] : ['Ko', 'Mo', 'Go'];
  let scaled = bytes / 1024;
  let unit = units[0];
  for (let index = 1; scaled >= 1024 && index < units.length; index += 1) {
    scaled /= 1024;
    unit = units[index];
  }
  return `${new Intl.NumberFormat(currentLocale(locale), { maximumFractionDigits: 1 }).format(scaled)} ${unit}`;
}

function jsonValue(value) {
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function htmlAsText(value) {
  return String(value)
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<\/(p|div|li|h[1-6])\s*>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .trim();
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]);
}

const SAFE_RICH_TAGS = new Set([
  'a', 'b', 'blockquote', 'br', 'code', 'div', 'em', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'hr', 'i', 'img', 'li', 'ol', 'p', 'pre', 's', 'span', 'strong', 'table', 'tbody', 'td',
  'th', 'thead', 'tr', 'u', 'ul',
]);

function safeRichUrl(value, allowDataImage = false) {
  const url = String(value || '').trim();
  if (allowDataImage && /^data:image\/(png|jpeg|gif|webp);base64,[a-z0-9+/=]+$/i.test(url)) return url;
  if (/^(https?:|mailto:)/i.test(url)) return url;
  if (url.startsWith('/') && !url.startsWith('//')) return url;
  return '';
}

/** Keep a small, safe subset of rich HTML for previews and the basic editor. */
export function sanitizeRichHtml(value) {
  const source = String(value ?? '');
  if (typeof DOMParser === 'undefined') return escapeHtml(htmlAsText(source)).replace(/\n/g, '<br>');
  const parsed = new DOMParser().parseFromString(source, 'text/html');
  const sanitizeNode = (node) => {
    if (node.nodeType === 3) return document.createTextNode(node.nodeValue || '');
    if (node.nodeType !== 1) return document.createDocumentFragment();
    const tag = node.tagName.toLowerCase();
    if (['script', 'style', 'iframe', 'object', 'embed', 'svg', 'math', 'form'].includes(tag)) {
      return document.createDocumentFragment();
    }
    if (!SAFE_RICH_TAGS.has(tag)) {
      const fragment = document.createDocumentFragment();
      Array.from(node.childNodes).forEach((child) => fragment.appendChild(sanitizeNode(child)));
      return fragment;
    }
    const clean = document.createElement(tag);
    const attributes = ['title', 'alt', 'width', 'height', 'colspan', 'rowspan'];
    attributes.forEach((name) => {
      if (node.hasAttribute(name)) clean.setAttribute(name, node.getAttribute(name));
    });
    if (tag === 'a') {
      const href = safeRichUrl(node.getAttribute('href'));
      if (href) {
        clean.setAttribute('href', href);
        clean.setAttribute('rel', 'noreferrer');
      }
    }
    if (tag === 'img') {
      const src = safeRichUrl(node.getAttribute('src'), true);
      if (src) clean.setAttribute('src', src);
    }
    Array.from(node.childNodes).forEach((child) => clean.appendChild(sanitizeNode(child)));
    return clean;
  };
  const output = document.createElement('div');
  Array.from(parsed.body.childNodes).forEach((node) => output.appendChild(sanitizeNode(node)));
  return output.innerHTML;
}

function relativeDateLabel(value, locale, translate = (text) => text) {
  const date = validDate(value);
  if (!date) return String(value);
  const deltaSeconds = (date.getTime() - Date.now()) / 1000;
  const absoluteSeconds = Math.abs(deltaSeconds);
  if (absoluteSeconds < 60) return translate("Aujourd’hui");
  const units = absoluteSeconds < 3600
    ? ['minute', 60]
    : absoluteSeconds < 86400
      ? ['hour', 3600]
      : absoluteSeconds < 45 * 86400
        ? ['day', 86400]
        : absoluteSeconds < 365 * 86400
          ? ['month', 30 * 86400]
          : ['year', 365 * 86400];
  const [unit, seconds] = units;
  return new Intl.RelativeTimeFormat(currentLocale(locale), { numeric: 'auto' })
    .format(Math.round(deltaSeconds / seconds), unit);
}

export function formatFloatTime(value, options = {}) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return String(value ?? '—');
  const unit = options.unit || 'hours';
  const seconds = Math.round(Math.abs(amount) * (unit === 'seconds' ? 1 : unit === 'minutes' ? 60 : 3600));
  const sign = amount < 0 ? '−' : '';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  if (options.numeric === false) {
    const parts = [];
    if (hours) parts.push(`${hours} h`);
    if (minutes || !hours) parts.push(`${minutes} min`);
    if (options.show_seconds && remainingSeconds) parts.push(`${remainingSeconds} s`);
    return `${sign}${parts.join(' ')}`;
  }
  return `${sign}${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}${options.show_seconds ? `:${String(remainingSeconds).padStart(2, '0')}` : ''}`;
}

export function currencyDetails(entity) {
  return entity?.devise_details || entity?.devise || {};
}

export function currencyLabel(entity, widget = 'monetary') {
  const currency = currencyDetails(entity);
  if (widget === 'monetary_number') return '';
  if (widget === 'monetary_code') return currency.code || '';
  return currency.symbole || currency.symbol || currency.code || '';
}

export function formatDateValue(value, widget = 'date', locale, translate = (text) => text, widgetOptions = {}) {
  if (value === null || value === undefined || value === '') return '—';
  const date = validDate(value);
  if (!date) return String(value);
  const optionsByWidget = {
    date_long: { day: 'numeric', month: 'long', year: 'numeric' },
    date_no_year: { day: 'numeric', month: 'long' },
    date_month_year: { month: 'long', year: 'numeric' },
    date_year: { year: 'numeric' },
  };
  if (widget === 'date_relative' || widget === 'relative_date') {
    const today = new Date();
    const todayUtc = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
    const difference = Math.round((date.getTime() - todayUtc) / 86400000);
    if (difference === 0) return translate("Aujourd’hui");
    return new Intl.RelativeTimeFormat(currentLocale(locale), { numeric: 'auto' }).format(difference, 'day');
  }
  if (optionsByWidget[widget]) {
    return new Intl.DateTimeFormat(currentLocale(locale), {
      ...optionsByWidget[widget],
      timeZone: 'UTC',
    }).format(date);
  }
  if (widgetOptions.numeric === false) {
    return new Intl.DateTimeFormat(currentLocale(locale), {
      dateStyle: 'medium', timeZone: 'UTC',
    }).format(date);
  }
  return new Intl.DateTimeFormat(currentLocale(locale), {
    day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC',
  }).format(date);
}

export function formatDateTimeValue(value, widget = 'datetime', locale, translate = (text) => text, widgetOptions = {}) {
  if (value === null || value === undefined || value === '') return '—';
  const date = validDate(value);
  if (!date) return String(value);
  if (widget === 'relative_date') return relativeDateLabel(date, locale, translate);
  if (widgetOptions.show_time === false) {
    return new Intl.DateTimeFormat(currentLocale(locale), { dateStyle: widgetOptions.numeric === false ? 'medium' : 'short' }).format(date);
  }
  const formatOptions = widget === 'datetime_long'
    ? { dateStyle: 'long', timeStyle: widgetOptions.show_seconds ? 'medium' : 'short' }
    : { dateStyle: widgetOptions.numeric === false ? 'medium' : 'short', timeStyle: widgetOptions.show_seconds ? 'medium' : 'short' };
  return new Intl.DateTimeFormat(currentLocale(locale), formatOptions).format(date);
}

export function toDateTimeLocalValue(value, includeSeconds = false) {
  if (value === null || value === undefined || value === '') return '';
  const text = String(value);
  if (new RegExp(`^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}${includeSeconds ? ':\\d{2}' : ''}$`).test(text)) return text;
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return text.slice(0, 16);
  const pad = (part) => String(part).padStart(2, '0');
  const valueWithoutSeconds = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  return includeSeconds ? `${valueWithoutSeconds}:${pad(date.getSeconds())}` : valueWithoutSeconds;
}

export function formatMonetaryValue(value, entity, widget = 'monetary', locale, widgetOptions = {}) {
  if (value === null || value === undefined || value === '') return '—';
  const amount = Number(value);
  if (!Number.isFinite(amount)) return String(value);
  const currency = currencyDetails(entity);
  const code = String(currency.code || '').toUpperCase();
  let fractionDigits = Number.isInteger(Number(widgetOptions.digits?.[1]))
    ? Math.max(0, Math.min(20, Number(widgetOptions.digits[1]))) : 2;
  if (/^[A-Z]{3}$/.test(code) && !widgetOptions.field_digits) {
    try {
      fractionDigits = new Intl.NumberFormat(currentLocale(locale), { style: 'currency', currency: code })
        .resolvedOptions().maximumFractionDigits;
    } catch {
      fractionDigits = 2;
    }
  }
  const minimumDigits = widgetOptions.hide_trailing_zeros ? 0 : fractionDigits;
  const number = new Intl.NumberFormat(currentLocale(locale), {
    minimumFractionDigits: minimumDigits,
    maximumFractionDigits: fractionDigits,
  }).format(amount);
  if (widget === 'monetary_number') return number;
  if (widgetOptions.no_symbol || widget === 'monetary_number') return number;
  if (widget === 'monetary_code') return `${number}${code ? ` ${code}` : ''}`;
  if (widget === 'monetary_symbol') {
    const symbol = currency.symbole || currency.symbol || code;
    return `${number}${symbol ? ` ${symbol}` : ''}`;
  }
  if (!widgetOptions.no_symbol && /^[A-Z]{3}$/.test(code)) {
    return new Intl.NumberFormat(currentLocale(locale), {
      style: 'currency', currency: code,
      minimumFractionDigits: minimumDigits, maximumFractionDigits: fractionDigits,
    }).format(amount);
  }
  const symbol = currency.symbole || currency.symbol || code;
  return `${number}${symbol ? ` ${symbol}` : ''}`;
}

export function formatMetadataValue(value, field = {}, entity, options = {}) {
  const locale = currentLocale(options.locale);
  const translate = options.translate || ((text) => text);
  const record = options.record || {};
  const widget = field.widget || field.display_widget || '';
  const baseWidgetOptions = field.widget_options || field.display_widget_options?.options || {};
  const widgetOptions = field.type === 'monetary' && baseWidgetOptions.field_digits && Array.isArray(field.digits)
    ? { ...baseWidgetOptions, digits: field.digits }
    : baseWidgetOptions;
  const effectiveEntity = widgetOptions.currency_field && record?.[widgetOptions.currency_field]
    ? record[widgetOptions.currency_field] : entity;
  if (typeof value === 'boolean' || field.type === 'boolean') {
    if (value === null || value === undefined || value === '') return '—';
    const checked = value === true || value === 1 || value === '1' || value === 'true' || value === 'yes';
    if (widget === 'boolean_icon') return checked ? `✓ ${translate('Oui')}` : `✕ ${translate('Non')}`;
    if (widget === 'boolean_favorite') return checked ? '★' : '☆';
    return checked ? translate('Oui') : translate('Non');
  }
  if (value === null || value === undefined || value === '') return '—';
  if (field.type === 'date') return formatDateValue(value, widget || 'date', locale, translate, widgetOptions);
  if (field.type === 'datetime') return formatDateTimeValue(value, widget || 'datetime', locale, translate, widgetOptions);
  if (field.type === 'monetary') return formatMonetaryValue(value, effectiveEntity, widget || 'monetary', locale, widgetOptions);
  if (field.type === 'binary') {
    const file = typeof value === 'object' ? value : {};
    if (widget === 'binary_size') return fileSizeLabel(file.size ?? file.file_size, locale);
    if (widget === 'binary_type') return file.mimetype || file.content_type || translate('Type inconnu');
    return file.name || file.filename || (typeof value === 'string' && value.length < 120 ? value : translate('Fichier joint'));
  }
  if (field.type === 'html') {
    const html = String(value);
    return widget === 'html_source' ? html : htmlAsText(html);
  }
  if (field.type === 'json') {
    const parsed = jsonValue(value);
    if (typeof parsed === 'string') return parsed;
    return JSON.stringify(parsed, null, widget === 'json_compact' ? 0 : 2);
  }
  if (field.type === 'reference') {
    const reference = typeof value === 'object' ? value : { name: String(value) };
    const label = reference.name || reference.nom || reference.label || reference.id || '—';
    return widget === 'reference_badge' && reference.model
      ? `${reference.model} · ${label}`
      : label;
  }
  if (['integer', 'decimal', 'float'].includes(field.type)) {
    const number = Number(value);
    if (Number.isFinite(number)) {
      if (widget === 'float_time') return formatFloatTime(number, widgetOptions);
      if (widget === 'percentage') return new Intl.NumberFormat(locale, {
        style: 'percent', maximumFractionDigits: Number(widgetOptions.digits?.[1] ?? widgetOptions.decimals ?? 2),
      }).format(number);
      if (widget === 'number_raw') return String(number);
      if (widgetOptions.enable_formatting === false) return String(number);
      const configuredDecimals = widgetOptions.digits?.[1] ?? widgetOptions.decimals;
      const maxDigits = Number.isInteger(Number(configuredDecimals))
        ? Math.max(0, Math.min(20, Number(configuredDecimals)))
        : (field.type === 'integer' ? 0 : 2);
      return new Intl.NumberFormat(locale, {
        notation: widget === 'number_compact' || widgetOptions.human_readable ? 'compact' : 'standard',
        maximumFractionDigits: widgetOptions.hide_trailing_zeros ? Math.max(maxDigits, Number(widgetOptions.min_display_digits || 0)) : maxDigits,
        minimumFractionDigits: widgetOptions.hide_trailing_zeros ? 0 : Number(widgetOptions.min_display_digits || 0),
      }).format(number);
    }
  }
  if (field.type === 'selection' && Array.isArray(field.selection)) {
    const choice = field.selection.find((option) => String(option.value) === String(value));
    if (choice) return translate(choice.label || choice.name || String(value));
  }
  if (Array.isArray(value)) return value.map((item) => (
    typeof item === 'object' && item !== null ? item.name || item.nom || item.label || item.id : item
  )).filter((item) => item !== null && item !== undefined && item !== '').join(', ');
  const text = typeof value === 'object' ? value.name || value.nom || value.label || value.id || '—' : String(value);
  if (widget === 'text_uppercase') return text.toLocaleUpperCase(locale);
  if (widget === 'text_lowercase') return text.toLocaleLowerCase(locale);
  if (widget === 'text_truncate' && text.length > 32) return `${text.slice(0, 29)}…`;
  return text;
}
