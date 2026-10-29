function findViewReference(action, mode) {
  const acceptedModes = mode === 'list' ? new Set(['list', 'tree']) : new Set([mode]);
  return (action?.views || []).find((item) => acceptedModes.has(item.mode));
}

function parseConfigAttribute(value) {
  if (!value || typeof value !== 'string') return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function normalizeField(node, definitionsByName) {
  const name = node.getAttribute('name');
  if (!name) return null;
  const definition = definitionsByName.get(name) || {};
  const attributes = new Map(Array.from(node.attributes, (attribute) => [attribute.name, attribute.value]));
  const globalConfig = definition.display_widget_options && typeof definition.display_widget_options === 'object'
    ? definition.display_widget_options : {};
  const globalOptions = globalConfig.options && typeof globalConfig.options === 'object' ? globalConfig.options : {};
  const globalWidgetAttributes = globalConfig.attributes && typeof globalConfig.attributes === 'object' ? globalConfig.attributes : {};
  const viewOptions = parseConfigAttribute(attributes.get('options'));
  const viewWidgetAttributes = {};
  attributes.forEach((attributeValue, attributeName) => {
    if (!['name', 'widget', 'options', 'string', 'help', 'required', 'readonly', 'invisible'].includes(attributeName)) {
      viewWidgetAttributes[attributeName] = attributeValue;
    }
  });
  return {
    ...definition,
    name,
    label: attributes.get('string') || definition.label || definition.field_description || name,
    type: definition.type || definition.ttype || 'char',
    widget: attributes.has('widget') ? attributes.get('widget') : (definition.display_widget || ''),
    display_widget: definition.display_widget || '',
    widget_options: { ...globalOptions, ...viewOptions },
    widget_attributes: { ...globalWidgetAttributes, ...viewWidgetAttributes },
    relation: definition.relation || '',
    selection: Array.isArray(definition.selection) ? definition.selection : [],
    required: attributes.has('required')
      ? ['1', 'true'].includes(attributes.get('required').toLowerCase())
      : Boolean(definition.required),
    readonly: attributes.has('readonly')
      ? ['1', 'true'].includes(attributes.get('readonly').toLowerCase())
      : Boolean(definition.readonly),
    invisible: attributes.has('invisible')
      ? ['1', 'true'].includes(attributes.get('invisible').toLowerCase())
      : false,
    help: attributes.get('help') || definition.help || '',
  };
}

function parseConfiguredView({ action, view, definitions, mode }) {
  if (!view?.architecture || typeof DOMParser === 'undefined') return null;
  const document = new DOMParser().parseFromString(view.architecture, 'application/xml');
  if (document.querySelector('parsererror')) return null;
  const root = document.documentElement;
  const definitionsByName = new Map((definitions || []).map((field) => [field.name, field]));

  if (mode === 'form') {
    const groups = Array.from(root.querySelectorAll('group')).filter((group) => (
      !group.parentElement?.closest('group')
    )).map((group, index) => ({
      title: group.getAttribute('string') || `Informations ${index + 1}`,
      fields: Array.from(group.querySelectorAll('field'))
        .map((node) => normalizeField(node, definitionsByName))
        .filter(Boolean),
    })).filter((group) => group.fields.length);

    if (groups.length) return { action, view, groups };
    const fields = Array.from(root.querySelectorAll('field'))
      .map((node) => normalizeField(node, definitionsByName))
      .filter(Boolean);
    return fields.length ? { action, view, groups: [{ title: view.name || action?.name || 'Formulaire', fields }] } : null;
  }

  const fields = Array.from(root.querySelectorAll('tree > field, list > field'))
    .map((node) => normalizeField(node, definitionsByName))
    .filter(Boolean);
  return fields.length ? { action, view, fields } : null;
}

/**
 * Resolve a model's configured list or form fields from the UI bootstrap.
 * The field definition supplies its global type and renderer; the XML view
 * supplies order, labels, and any view-specific renderer override.
 */
export function getConfiguredModelView(configuration, modelName, mode = 'list', options = {}) {
  if (!configuration || typeof DOMParser === 'undefined') return null;
  const modelConfig = configuration.model_views?.[modelName];
  const expectedType = mode === 'list' ? 'list' : mode;
  const modelViews = modelConfig?.views || [];

  if (options.preferredViewKey) {
    const preferredView = modelViews.find((view) => view.key === options.preferredViewKey
      && (view.type === expectedType || (mode === 'list' && view.type === 'tree')));
    const parsedPreferred = preferredView && parseConfiguredView({
      action: null,
      view: preferredView,
      definitions: modelConfig.fields,
      mode,
    });
    if (parsedPreferred) return parsedPreferred;
  }

  const actions = Object.values(configuration.actions || {}).filter((action) => action.model === modelName);

  for (const action of actions) {
    const reference = findViewReference(action, mode);
    const view = reference && configuration.views?.[String(reference.view_id)];
    const parsed = parseConfiguredView({ action, view, definitions: action.fields, mode });
    if (parsed) return parsed;
  }

  const configuredView = modelViews.find((view) => (
    view.type === expectedType || (mode === 'list' && view.type === 'tree')
  ));
  if (configuredView) {
    return parseConfiguredView({
      action: null,
      view: configuredView,
      definitions: modelConfig.fields,
      mode,
    });
  }
  return null;
}

/**
 * Apply the order and labels from an IrUiView list while retaining the page's
 * specialised cell renderers and actions.
 */
export function applyConfiguredListColumns(columns, configuredFields, aliases = {}) {
  if (!Array.isArray(configuredFields) || configuredFields.length === 0) return columns;
  const columnsByField = new Map();
  columns.forEach((column) => {
    columnsByField.set(column.id, column);
    if (column.dataIndex) columnsByField.set(column.dataIndex, column);
  });

  return configuredFields.filter((field) => !field.invisible).map((field) => {
    const column = columnsByField.get(aliases[field.name] || field.name);
    return column ? { ...column, label: field.label || column.label, metadataField: field } : null;
  }).filter(Boolean);
}
