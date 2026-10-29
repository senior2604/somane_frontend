import { FIELD_DISPLAY_OPTIONS, formatFloatTime, formatMetadataValue, getFieldDisplayOptionsForView, getGlobalFieldDisplayOptions } from './fieldDisplay';
import { WIDGET_OPTION_SCHEMA } from './widgetOptionSchema';
import { widgetOptionDefinition } from '../components/WidgetOptionsEditor';

describe('rendus des widgets de champ', () => {
  test('convertit une durée décimale en heures et minutes', () => {
    expect(formatFloatTime(2.5)).toBe('02:30');
    expect(formatFloatTime(-1.25)).toBe('−01:15');
  });

  test('formate une fraction en pourcentage selon la langue', () => {
    expect(formatMetadataValue(0.125, { type: 'float', widget: 'percentage' }, null, { locale: 'en-US' })).toBe('12.5%');
    expect(formatMetadataValue(0.125, { type: 'float', widget: 'percentage' }, null, { locale: 'fr-FR' })).toContain('%');
  });

  test('affiche une date sans année, dans la langue choisie', () => {
    expect(formatMetadataValue('2026-09-07', { type: 'date', widget: 'date_no_year' }, null, { locale: 'fr-FR' })).toBe('7 septembre');
    expect(formatMetadataValue('2026-09-07', { type: 'date', widget: 'date_no_year' }, null, { locale: 'en-US' })).toBe('September 7');
  });

  test('expose les nouveaux widgets aux types de champs attendus', () => {
    const widgetsFor = (type) => FIELD_DISPLAY_OPTIONS[type].map(([value]) => value);
    expect(widgetsFor('char')).toEqual(expect.arrayContaining(['email', 'phone', 'url', 'CopyClipboardURL']));
    expect(widgetsFor('float')).toEqual(expect.arrayContaining(['float_time', 'percentage', 'progressbar', 'percentpie']));
    expect(widgetsFor('selection')).toEqual(expect.arrayContaining(['badges_selection', 'statusbar', 'radio', 'priority']));
    expect(widgetsFor('boolean')).toEqual(expect.arrayContaining(['boolean_toggle', 'boolean_favorite', 'boolean_checkbox']));
    expect(widgetsFor('date')).toContain('date_no_year');
  });

  test('propose les 42 widgets du classeur dans les types compatibles', () => {
    const registered = new Set(Object.values(FIELD_DISPLAY_OPTIONS).flatMap((options) => options.map(([widget]) => widget)));
    const workbookWidgets = [
      'monetary', 'date', 'datetime', 'float_time', 'char', 'text', 'html', 'integer', 'float',
      'badges_selection', 'statusbar', 'email', 'phone', 'url', 'percentage', 'percentpie',
      'progressbar', 'badge', 'radio', 'priority', 'handle', 'boolean_toggle', 'boolean_favorite',
      'boolean_icon', 'state_selection', 'statinfo', 'image', 'image_url', 'binary', 'pdf_viewer',
      'many2many_binary', 'many2one_binary', 'signature', 'many2many_tags', 'many2many_tags_color_dot',
      'many2one_avatar_user', 'badges_many2one', 'boolean_checkbox', 'relative_date',
      'CopyClipboardChar', 'CopyClipboardButton', 'CopyClipboardURL',
    ];
    workbookWidgets.forEach((widget) => expect(registered.has(widget)).toBe(true));
  });

  test('recense les 149 réglages documentés du classeur et les 13 options datetime', () => {
    expect(WIDGET_OPTION_SCHEMA).toHaveLength(42);
    expect(WIDGET_OPTION_SCHEMA.reduce((total, widget) => total + widget.options.length, 0)).toBe(149);
    const datetime = widgetOptionDefinition('datetime', 'datetime');
    expect(datetime.options).toHaveLength(13);
    expect(datetime.options.map((option) => option.name)).toEqual(expect.arrayContaining([
      'show_time', 'show_seconds', 'rounding', 'min_date', 'max_date', 'warn_future',
      'min_precision', 'max_precision', 'numeric', 'placeholder_field',
      'start_date_field', 'end_date_field', 'always_range',
    ]));
  });

  test('relie les variantes de widget au catalogue d’options du bon type', () => {
    expect(widgetOptionDefinition('date_no_year', 'date').widget).toBe('date');
    expect(widgetOptionDefinition('monetary_symbol', 'monetary').widget).toBe('monetary');
    expect(widgetOptionDefinition('number_compact', 'float').widget).toBe('float');
    expect(widgetOptionDefinition('text_uppercase', 'char').widget).toBe('char');
  });

  test('applique les unités de temps et la précision monétaire configurées', () => {
    expect(formatFloatTime(90, { unit: 'minutes', show_seconds: true })).toBe('01:30:00');
    expect(formatMetadataValue(12.5, { type: 'monetary', widget: 'monetary', widget_options: { no_symbol: true, digits: [16, 0] } }, null, { locale: 'en-US' })).toBe('13');
    expect(formatMetadataValue(0.25, { type: 'float', widget: 'percentage', widget_options: { decimals: 0 } }, null, { locale: 'en-US' })).toBe('25%');
  });

  test('réserve les widgets de liste ou de formulaire à la vue compatible', () => {
    const listWidgets = getFieldDisplayOptionsForView('integer', 'tree').map(([widget]) => widget);
    const formWidgets = getFieldDisplayOptionsForView('integer', 'form').map(([widget]) => widget);
    expect(listWidgets).toContain('handle');
    expect(formWidgets).not.toContain('handle');
    expect(getFieldDisplayOptionsForView('integer', 'form')).toContainEqual(['statinfo', 'Bouton compteur']);
    expect(getGlobalFieldDisplayOptions('integer').map(([widget]) => widget)).not.toContain('statinfo');
  });
});
