import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FiCode, FiEdit2, FiPlus, FiRefreshCw, FiSearch, FiX } from 'react-icons/fi';
import { apiClient } from '../../services/apiClient';
import { readDeveloperMode, subscribeDeveloperMode } from '../../services/developerMode';
import { useUi } from '../../context/UiContext';
import { useLanguage } from '../../context/LanguageContext';
import ModelPicker from '../../components/ModelPicker';
import WidgetOptionsEditor from '../../components/WidgetOptionsEditor';
import {
  FIELD_DISPLAY_OPTIONS,
  getFieldDisplayOptionsForView,
  getGlobalFieldDisplayOptions,
  toDateTimeLocalValue,
} from '../../services/fieldDisplay';
import SomaneSelect from '../../components/SomaneSelect';

function asRows(payload) {
  if (Array.isArray(payload)) return payload;
  return Array.isArray(payload?.results) ? payload.results : [];
}

async function fetchAll(endpoint, filters = {}) {
  const rows = [];
  let page = 1;
  let hasNext = true;

  while (hasNext) {
    const payload = await apiClient.get(endpoint, {
      params: { ...filters, page },
    });

    rows.push(...asRows(payload));
    hasNext = Boolean(payload?.next);
    page += 1;
  }

  return rows;
}

const typeLabels = {
  char: 'Caractère',
  text: 'Texte multiligne',
  integer: 'Entier',
  float: 'Décimal',
  decimal: 'Nombre décimal',
  boolean: 'Booléen',
  date: 'Date',
  datetime: 'Date et heure',
  many2one: 'many2one',
  many2many: 'many2many',
  one2many: 'one2many',
  binary: 'Fichier',
  json: 'JSON',
  selection: 'sélection',
  monetary: 'Monétaire',
  html: 'HTML',
};

const editableTypes = [
  ['char', 'Texte court'],
  ['text', 'Texte long'],
  ['integer', 'Entier'],
  ['float', 'Nombre décimal'],
  ['monetary', 'Monétaire'],
  ['boolean', 'Oui / Non'],
  ['date', 'Date'],
  ['datetime', 'Date et heure'],
  ['selection', 'Liste de choix'],
];

const viewWidgetOptions = Object.fromEntries(
  Object.keys(FIELD_DISPLAY_OPTIONS).map((type) => [
    type,
    {
      form: getFieldDisplayOptionsForView(type, 'form'),
      tree: getFieldDisplayOptionsForView(type, 'tree'),
    },
  ]),
);

const detailSections = [
  [
    'Identification',
    [
      ['name', 'Nom technique'],
      ['field_description', 'Libellé'],
      ['model_name', 'Modèle'],
      ['ttype', 'Type technique'],
      ['state', 'Origine'],
      ['help', 'Texte d’aide'],
    ],
  ],
  [
    'Comportement',
    [
      ['required', 'Obligatoire'],
      ['readonly', 'Lecture seule'],
      ['store', 'Valeur stockée'],
      ['copied', 'Copié lors d’une duplication'],
      ['selectable', 'Sélectionnable'],
      ['index', 'Index SQL'],
      ['translate', 'Traduisible'],
      ['group_expand', 'Développer les groupes'],
      ['website_form_blacklisted', 'Exclu des formulaires web'],
      ['tracking', 'Ordre de suivi'],
      ['size', 'Taille maximale'],
    ],
  ],
  [
    'Options et calcul',
    [
      ['selection_options', 'Options de sélection'],
      ['default_value', 'Valeur par défaut'],
      ['selection', 'Options historiques'],
      ['compute', 'Calcul'],
      ['depends', 'Dépendances'],
      ['related', 'Chemin du champ lié'],
      ['related_field_id', 'ID du champ lié'],
    ],
  ],
  [
    'Relations',
    [
      ['relation', 'Modèle lié'],
      ['relation_field', 'Champ inverse'],
      ['relation_field_id', 'ID du champ inverse'],
      ['relation_table', 'Table de relation'],
      ['column1', 'Colonne source'],
      ['column2', 'Colonne cible'],
      ['domain', 'Domaine'],
      ['on_delete', 'Comportement à la suppression'],
    ],
  ],
  [
    'Accès et provenance',
    [
      ['groups', 'Groupes associés'],
      ['modules', 'Modules propriétaires'],
      ['create_uid', 'Créé par (ID)'],
      ['create_date', 'Date de création'],
      ['write_uid', 'Modifié par (ID)'],
      ['write_date', 'Date de modification'],
    ],
  ],
];

function detailValue(field, key, t) {
  const value = field[key];

  if (typeof value === 'boolean') {
    return value ? t('Oui') : t('Non');
  }

  if (key === 'ttype') {
    return t(typeLabels[value] || value || '—');
  }

  if (key === 'state') {
    return value === 'manual' ? t('Manuel') : t('Base');
  }

  if (key === 'groups' && Array.isArray(value)) {
    return value.length ? value.join(', ') : t('Aucun');
  }

  if (value === null || value === undefined || value === '') {
    return '—';
  }

  if (typeof value === 'object') {
    return JSON.stringify(value, null, 2);
  }

  return String(value);
}

function viewsContainingField(views, fieldName) {
  if (typeof DOMParser === 'undefined') return [];

  return views
    .filter((view) => view.active && ['form', 'tree'].includes(view.type))
    .flatMap((view) => {
      const document = new DOMParser().parseFromString(
        view.arch_db || '',
        'application/xml',
      );

      if (document.querySelector('parsererror')) return [];

      return Array.from(document.querySelectorAll('field'))
        .filter((node) => node.getAttribute('name') === fieldName)
        .map((node) => {
          let widgetOptions = {};

          try {
            widgetOptions = JSON.parse(node.getAttribute('options') || '{}');
          } catch {
            widgetOptions = {};
          }

          const widgetAttributes = {};

          Array.from(node.attributes).forEach((attribute) => {
            if (
              ![
                'name',
                'widget',
                'options',
                'string',
                'help',
                'required',
                'readonly',
                'invisible',
              ].includes(attribute.name)
            ) {
              widgetAttributes[attribute.name] = attribute.value;
            }
          });

          return {
            id: view.id,
            name: view.name,
            type: view.type === 'tree' ? 'Liste' : 'Formulaire',
            viewType: view.type,
            widgetValue: node.getAttribute('widget') || '',
            widgetOptions,
            widgetAttributes,
          };
        });
    });
}

function widgetLabel(fieldType, widget, t = (value) => value) {
  const options = FIELD_DISPLAY_OPTIONS[fieldType] || [];

  return t(
    options.find(([value]) => value === widget)?.[1] || 'Par défaut',
  );
}

function slugFromLabel(label) {
  const slug = String(label || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

  return `x_${slug || 'nouveau_champ'}`.slice(0, 63);
}

function configuredField(configuration, name) {
  for (const action of Object.values(configuration?.actions || {})) {
    if (action.model !== 'core.Partenaire') continue;

    const definition = (action.fields || []).find(
      (field) => field.name === name,
    );

    if (definition) return definition;
  }

  return null;
}

function FieldOptionsEditor({ options, onChange }) {
  const { t } = useLanguage();

  const update = (index, key, value) => {
    onChange(
      options.map((option, optionIndex) =>
        optionIndex === index
          ? { ...option, [key]: value }
          : option,
      ),
    );
  };

  return (
    <div className="space-y-2 rounded-md border border-gray-200 p-3 sm:col-span-2">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-gray-700">
          {t('Options de la liste')}
        </p>

        <button
          type="button"
          onClick={() =>
            onChange([...options, { name: '', value: '' }])
          }
          className="text-sm font-medium text-violet-700 hover:text-violet-900"
        >
          + {t('Ajouter une option')}
        </button>
      </div>

      {options.map((option, index) => (
        <div
          key={index}
          className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]"
        >
          <input
            aria-label={`${t('Libellé de l’option')} ${index + 1}`}
            value={option.name}
            onChange={(event) =>
              update(index, 'name', event.target.value)
            }
            placeholder={t('Libellé affiché')}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          />

          <input
            aria-label={`${t('Valeur de l’option')} ${index + 1}`}
            value={option.value}
            onChange={(event) =>
              update(index, 'value', event.target.value)
            }
            placeholder={t('Valeur enregistrée')}
            className="rounded-md border border-gray-300 px-3 py-2 font-mono text-sm"
          />

          <button
            type="button"
            disabled={options.length <= 1}
            onClick={() =>
              onChange(
                options.filter((_, optionIndex) => optionIndex !== index),
              )
            }
            aria-label={`${t('Supprimer l’option')} ${index + 1}`}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-600 disabled:opacity-40"
          >
            {t('Supprimer')}
          </button>
        </div>
      ))}

      <p className="text-xs text-gray-500">
        {t(
          'Le libellé est montré à l’utilisateur ; la valeur est conservée avec le partenaire.',
        )}
      </p>
    </div>
  );
}

function DefaultValueInput({ type, value, options = [], onChange }) {
  const { t } = useLanguage();

  const className =
    'mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-normal';

  if (type === 'boolean') {
    const selected =
      value === true ? 'true' : value === false ? 'false' : '';

    return (
      <SomaneSelect
        value={selected}
        onChange={(event) =>
          onChange(
            event.target.value === ''
              ? ''
              : event.target.value === 'true',
          )
        }
        className={className}
      >
        <option value="">{t('Aucune valeur par défaut')}</option>
        <option value="true">{t('Oui')}</option>
        <option value="false">{t('Non')}</option>
      </SomaneSelect>
    );
  }

  if (type === 'selection') {
    return (
      <SomaneSelect
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value)}
        className={className}
      >
        <option value="">{t('Aucune valeur par défaut')}</option>

        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {t(option.name || option.label || option.value)}
          </option>
        ))}
      </SomaneSelect>
    );
  }

  const inputType =
    type === 'date'
      ? 'date'
      : type === 'datetime'
        ? 'datetime-local'
        : ['integer', 'float', 'monetary'].includes(type)
          ? 'number'
          : 'text';

  const step =
    type === 'integer'
      ? '1'
      : ['float', 'monetary'].includes(type)
        ? 'any'
        : undefined;

  return (
    <input
      type={inputType}
      step={step}
      value={
        type === 'datetime'
          ? toDateTimeLocalValue(value)
          : value ?? ''
      }
      onChange={(event) => onChange(event.target.value)}
      className={className}
      placeholder={t('Aucune valeur par défaut')}
    />
  );
}

export default function ModelFieldsPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const requestedModelId = searchParams.get('model_id') || '';
  const requestedFieldId = searchParams.get('field_id') || '';

  const { security, configuration, reload: reloadUi } = useUi();

  const isAdministrator = Boolean(security?.user?.is_superuser);
  const currentUserId =
    security?.user?.id || security?.user?.user_id || null;

  const [developerMode, setDeveloperMode] = useState(false);
  const [models, setModels] = useState([]);
  const [fields, setFields] = useState([]);
  const [views, setViews] = useState([]);
  const [groups, setGroups] = useState([]);

  const [selectedModelId, setSelectedModelId] = useState(
    searchParams.get('model_id') || '',
  );
  const [selectedField, setSelectedField] = useState(null);
  const [editingField, setEditingField] = useState(null);
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState('');

  const [loadingModels, setLoadingModels] = useState(true);
  const [loadingFields, setLoadingFields] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingPlacementId, setSavingPlacementId] = useState(null);

  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [nameTouched, setNameTouched] = useState(false);

  const [editForm, setEditForm] = useState({
    field_description: '',
    help: '',
    required: false,
    readonly: false,
    size: '',
    selection_options: [],
    default_value: '',
    display_widget: '',
    display_widget_options: { options: {}, attributes: {} },
  });

  const [newForm, setNewForm] = useState({
    name: '',
    field_description: '',
    ttype: 'char',
    help: '',
    required: false,
    view_id: '',
    size: '',
    selection_options: [{ name: '', value: '' }],
    default_value: '',
    widget: '',
    display_widget: '',
    display_widget_options: { options: {}, attributes: {} },
    view_widget_options: { options: {}, attributes: {} },
  });

  const [viewWidgetDrafts, setViewWidgetDrafts] = useState({});

  const selectedModel =
    models.find(
      (model) => String(model.id) === String(selectedModelId),
    ) || null;

  const formViews = views.filter(
    (view) => view.type === 'form' && view.active && view.mode === 'primary',
  );

  const loadModels = useCallback(async () => {
    setLoadingModels(true);
    setError('');

    try {
      const rows = await fetchAll('/ir-models/');

      rows.sort((a, b) =>
        (a.model || '').localeCompare(b.model || '', 'fr'),
      );

      setModels(rows);

      setSelectedModelId((current) => {
        if (current && rows.some((model) => String(model.id) === current)) {
          return current;
        }

        if (
          requestedModelId &&
          rows.some((model) => String(model.id) === requestedModelId)
        ) {
          return requestedModelId;
        }

        const partnerModel = rows.find(
          (model) => model.model === 'core.Partenaire',
        );

        return String(partnerModel?.id || rows[0]?.id || '');
      });
    } catch (exception) {
      setError(
        exception?.message || t('Impossible de charger les modèles.'),
      );
    } finally {
      setLoadingModels(false);
    }
  }, [requestedModelId, t]);

  const loadSelectedModel = useCallback(
    async (modelId, modelKey) => {
      if (!modelId || !modelKey) {
        setFields([]);
        setViews([]);
        return;
      }

      setLoadingFields(true);
      setError('');

      try {
        const fieldRows = await fetchAll('/ir-model-fields/', {
          model_id: modelId,
        });

        setFields(fieldRows);

        const requestedField = requestedFieldId
          ? fieldRows.find(
              (field) => String(field.id) === requestedFieldId,
            )
          : null;

        if (requestedField) setSelectedField(requestedField);

        if (isAdministrator) {
          try {
            setViews(await fetchAll('/ir-views/', { model: modelKey }));
          } catch {
            setViews([]);
          }
        } else {
          setViews([]);
        }
      } catch (exception) {
        setError(
          exception?.message || t('Impossible de charger les champs.'),
        );
        setFields([]);
      } finally {
        setLoadingFields(false);
      }
    },
    [isAdministrator, requestedFieldId, t],
  );

  useEffect(() => {
    loadModels();
  }, [loadModels]);

  useEffect(() => {
    loadSelectedModel(selectedModelId, selectedModel?.model);
  }, [selectedModelId, selectedModel?.model, loadSelectedModel]);

  useEffect(() => {
    if (!isAdministrator || !currentUserId) {
      setDeveloperMode(false);
      return undefined;
    }

    setDeveloperMode(readDeveloperMode(currentUserId));

    return subscribeDeveloperMode(currentUserId, setDeveloperMode);
  }, [currentUserId, isAdministrator]);

  useEffect(() => {
    if (!isAdministrator) return;

    fetchAll('/groupes/')
      .then(setGroups)
      .catch(() => setGroups([]));
  }, [isAdministrator]);

  const selectModel = (value) => {
    setSelectedField(null);
    setSelectedModelId(value);
    setSearchParams(value ? { model_id: value } : {}, { replace: true });
    setNotice('');
  };

  const filteredFields = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('fr');

    if (!query) return fields;

    return fields.filter((field) =>
      [
        field.name,
        field.field_description,
        field.ttype,
        field.relation,
        field.help,
      ].some((value) =>
        String(value || '').toLocaleLowerCase('fr').includes(query),
      ),
    );
  }, [fields, search]);

  const refresh = async () => {
    await Promise.all([
      loadModels(),
      loadSelectedModel(selectedModelId, selectedModel?.model),
    ]);
  };

  const openEdit = (field) => {
    const metadata = configuredField(configuration, field.name);

    const choices =
      field.selection_options ||
      (metadata?.selection || []).map((option, sequence) => ({
        name: option.name || option.label || option.value,
        value: option.value,
        sequence: (sequence + 1) * 10,
      }));

    setEditingField(field);

    setEditForm({
      field_description: field.field_description || '',
      help: field.help || '',
      required: Boolean(field.required),
      readonly: Boolean(field.readonly),
      groups: Array.isArray(field.groups) ? field.groups : [],
      size: field.size ?? metadata?.size ?? '',
      selection_options: choices.length
        ? choices
        : [{ name: '', value: '' }],
      default_value:
        field.default_value ?? metadata?.default_value ?? '',
      display_widget: field.display_widget || '',
      display_widget_options:
        field.display_widget_options || {
          options: {},
          attributes: {},
        },
    });

    setViewWidgetDrafts({});
    setError('');
    setNotice('');
  };

  const supportsBaseFieldSettings = (field) =>
    field?.state === 'manual' ||
    selectedModel?.model === 'core.Partenaire';

  const supportsDefaultValue = (field) =>
    supportsBaseFieldSettings(field) &&
    [
      'char',
      'text',
      'integer',
      'float',
      'monetary',
      'boolean',
      'date',
      'datetime',
      'selection',
    ].includes(field?.ttype) &&
    (field?.state === 'manual' || field?.ttype !== 'selection');

  const saveEdit = async (event) => {
    event.preventDefault();

    if (!editingField || !isAdministrator) return;

    setSaving(true);
    setError('');

    try {
      const payload = {
        field_description: editForm.field_description,
        help: editForm.help,
        required: editForm.required,
        readonly: editForm.readonly,
        groups: editForm.groups,
      };

      if (getGlobalFieldDisplayOptions(editingField.ttype).length > 1) {
        payload.display_widget = editForm.display_widget;
        payload.display_widget_options = editForm.display_widget_options;
      }

      if (developerMode && supportsBaseFieldSettings(editingField)) {
        if (editingField.ttype === 'char') {
          payload.size =
            editForm.size === '' ? null : Number(editForm.size);
        }

        if (
          editingField.state === 'manual' &&
          editingField.ttype === 'selection'
        ) {
          payload.selection_options = editForm.selection_options;
        }
      }

      if (developerMode && supportsDefaultValue(editingField)) {
        payload.default_value =
          editForm.default_value === '' ? null : editForm.default_value;
      }

      if (developerMode) payload.groups = editForm.groups;

      const updated = await apiClient.patch(
        `/ir-model-fields/${editingField.id}/update-definition/`,
        payload,
      );

      setFields((current) =>
        current.map((field) =>
          field.id === updated.id ? updated : field,
        ),
      );

      setSelectedField(updated);
      setEditingField(null);

      setNotice(
        t(
          'Définition enregistrée et répercutée dans les vues formulaire/liste.',
        ),
      );

      await reloadUi();
    } catch (exception) {
      setError(
        exception?.data?.detail ||
          exception?.message ||
          t('Impossible d’enregistrer le champ.'),
      );
    } finally {
      setSaving(false);
    }
  };

  const openCreate = () => {
    const firstView =
      formViews.find((view) => view.key === 'somane_ui.clients_form') ||
      formViews[0];

    setNewForm({
      name: '',
      field_description: '',
      ttype: 'char',
      help: '',
      required: false,
      view_id: String(firstView?.id || ''),
      size: '',
      selection_options: [{ name: '', value: '' }],
      default_value: '',
      widget: '',
      display_widget: '',
      display_widget_options: { options: {}, attributes: {} },
      view_widget_options: { options: {}, attributes: {} },
    });

    setNameTouched(false);
    setCreating(true);
    setError('');
    setNotice('');
  };

  const updateNewForm = (name, value) => {
    setNewForm((current) => {
      const next = { ...current, [name]: value };

      if (name === 'field_description' && !nameTouched) {
        next.name = slugFromLabel(value);
      }

      if (name === 'ttype' && value !== current.ttype) {
        next.default_value = '';
        next.widget = '';
        next.display_widget = '';
        next.display_widget_options = {
          options: {},
          attributes: {},
        };
        next.view_widget_options = {
          options: {},
          attributes: {},
        };

        if (value !== 'char') next.size = '';

        if (
          value === 'selection' &&
          !next.selection_options?.length
        ) {
          next.selection_options = [{ name: '', value: '' }];
        }
      }

      return next;
    });
  };

  const createField = async (event) => {
    event.preventDefault();

    if (!selectedModel || !isAdministrator) return;

    setSaving(true);
    setError('');

    try {
      const payload = {
        ...newForm,
        model_id: selectedModel.id,
        name: newForm.name.trim(),
        field_description: newForm.field_description.trim(),
        view_id: Number(newForm.view_id),
        size:
          newForm.ttype === 'char' && newForm.size !== ''
            ? Number(newForm.size)
            : null,
        selection_options:
          newForm.ttype === 'selection'
            ? newForm.selection_options
            : [],
        default_value:
          newForm.default_value === '' ? null : newForm.default_value,
        widget: newForm.widget || '',
        display_widget: newForm.display_widget || '',
        display_widget_options: newForm.display_widget_options,
        widget_options: newForm.view_widget_options.options,
        widget_attributes: newForm.view_widget_options.attributes,
      };

      const created = await apiClient.post(
        '/ir-model-fields/create-manual/',
        payload,
      );

      setCreating(false);

      const targetViewName =
        formViews.find(
          (view) => String(view.id) === String(payload.view_id),
        )?.name || t('sélectionnée');

      const selectedWidget = widgetLabel(
        created.ttype,
        created.widget || '',
        t,
      );

      setNotice(
        t(
          'Champ {name} créé. Rendu par défaut : « {defaultWidget} » ; vue « {view} » : « {viewWidget} ».',
        )
          .replace('{name}', created.name)
          .replace(
            '{defaultWidget}',
            widgetLabel(created.ttype, created.display_widget, t),
          )
          .replace('{view}', targetViewName)
          .replace('{viewWidget}', selectedWidget),
      );

      await Promise.all([
        loadSelectedModel(selectedModel.id, selectedModel.model),
        reloadUi(),
      ]);
    } catch (exception) {
      setError(
        exception?.data?.name ||
          exception?.data?.ttype ||
          exception?.data?.widget ||
          exception?.data?.view_id ||
          exception?.data?.model_id ||
          exception?.data?.message ||
          exception?.message ||
          t('Impossible de créer le champ.'),
      );
    } finally {
      setSaving(false);
    }
  };

  const updatePlacementWidget = async (
    placement,
    widget,
    config = null,
  ) => {
    if (!selectedField || !isAdministrator) return;

    setSavingPlacementId(placement.id);
    setError('');
    setNotice('');

    try {
      const nextConfig =
        config ||
        viewWidgetDrafts[placement.id] || {
          options: placement.widgetOptions || {},
          attributes: placement.widgetAttributes || {},
        };

      const currentAttributes = placement.widgetAttributes || {};
      const nextAttributes = nextConfig.attributes || {};

      const updated = await apiClient.patch(
        `/ir-model-fields/${selectedField.id}/set-view-widget/`,
        {
          view_id: placement.id,
          widget,
          options: nextConfig.options || {},
          attributes: nextAttributes,
          clear_attributes: Object.keys(currentAttributes).filter(
            (name) => !(name in nextAttributes),
          ),
        },
      );

      setViews((current) =>
        current.map((view) =>
          view.id === updated.view_id
            ? { ...view, arch_db: updated.arch_db }
            : view,
        ),
      );

      setViewWidgetDrafts((current) => {
        const next = { ...current };
        delete next[placement.id];
        return next;
      });

      setNotice(
        t('Affichage du champ mis à jour dans « {view} ».').replace(
          '{view}',
          placement.name,
        ),
      );

      await reloadUi();
    } catch (exception) {
      setError(
        exception?.data?.widget ||
          exception?.data?.view_id ||
          exception?.message ||
          t('Impossible de modifier cet affichage.'),
      );
    } finally {
      setSavingPlacementId(null);
    }
  };

  const placements = selectedField
    ? viewsContainingField(views, selectedField.name)
    : [];

  const visibleDetailSections = developerMode
    ? detailSections
    : detailSections
        .map(([title, properties]) => [
          title,
          properties.filter(([key]) =>
            [
              'name',
              'field_description',
              'model_name',
              'ttype',
              'state',
              'help',
              'required',
              'readonly',
            ].includes(key),
          ),
        ])
        .filter(([, properties]) => properties.length);

  return (
    <main className="min-h-full bg-gray-50 p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-5">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="rounded-lg bg-violet-100 p-2 text-violet-700">
              <FiCode size={22} />
            </span>

            <div>
              <h1 className="text-2xl font-semibold text-gray-900">
                {t('Champs des modèles')}
              </h1>

              <p className="mt-1 text-sm text-gray-600">
                {t(
                  'Consulte et modifie les définitions utilisées par les vues de l’application.',
                )}
              </p>

              {developerMode && (
                <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-800">
                  <FiCode size={12} /> {t('Mode développeur activé')}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => navigate('/model-fields/schema')}
              className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              <FiCode /> {t('Structure de IrModelFields')}
            </button>

            {selectedModel?.model === 'core.Partenaire' &&
              isAdministrator &&
              developerMode && (
                <button
                  type="button"
                  onClick={openCreate}
                  disabled={!formViews.length}
                  className="inline-flex items-center gap-2 rounded-md bg-violet-700 px-3 py-2 text-sm font-medium text-white hover:bg-violet-800 disabled:opacity-50"
                >
                  <FiPlus /> {t('Nouveau champ personnalisé')}
                </button>
              )}

            <button
              type="button"
              onClick={refresh}
              disabled={loadingFields || loadingModels}
              className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              <FiRefreshCw
                className={
                  loadingFields || loadingModels ? 'animate-spin' : ''
                }
              />
              {t('Actualiser')}
            </button>
          </div>
        </header>

        {!isAdministrator && (
          <p className="rounded-md border border-blue-200 bg-blue-50 p-3 text-xs text-blue-800">
            {t(
              'Consultation seule. Les modifications techniques sont réservées à l’administrateur système.',
            )}
          </p>
        )}

        {isAdministrator && !developerMode && (
          <p className="rounded-md border border-violet-200 bg-violet-50 p-3 text-xs text-violet-800">
            {t('Les réglages usuels restent disponibles. Active le')}{' '}
            <strong>{t('Mode développeur')}</strong>{' '}
            {t(
              'depuis le menu de ton profil pour afficher les paramètres techniques et créer des champs personnalisés.',
            )}
          </p>
        )}

        {selectedModel && selectedModel.model !== 'core.Partenaire' && (
          <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">
            {t(
              'La création de champs dont les valeurs sont stockées est actuellement activée sur le modèle pilote Partenaire. Les définitions des autres modèles restent consultables et modifiables.',
            )}
          </p>
        )}

        {error && (
          <div
            role="alert"
            className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700"
          >
            {typeof error === 'string' ? error : JSON.stringify(error)}
          </div>
        )}

        {notice && (
          <div
            role="status"
            className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800"
          >
            {notice}
          </div>
        )}

        <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="grid gap-3 border-b border-gray-200 p-4 md:grid-cols-[minmax(220px,0.9fr)_minmax(260px,1.1fr)] md:items-end">
            <ModelPicker
              id="model-fields-model"
              models={models}
              value={selectedModelId}
              onChange={selectModel}
              loading={loadingModels}
              label={t('Modèle')}
              placeholder={t('Rechercher un modèle par nom ou code…')}
              loadingLabel={t('Chargement des modèles…')}
              emptyLabel={t('Aucun modèle trouvé')}
              partnerShortcutLabel={t('Accès rapide : Partenaire')}
            />

            <label className="relative block text-sm font-medium text-gray-700">
              {t('Rechercher un champ')}
              <FiSearch className="pointer-events-none absolute bottom-2.5 left-3 text-gray-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t('Nom, libellé, type, relation…')}
                className="mt-1 block w-full rounded-md border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
              />
            </label>
          </div>

          {selectedModel && (
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 px-4 py-3 text-sm text-gray-600">
              <span>
                <strong className="font-medium text-gray-900">
                  {selectedModel.name}
                </strong>
                <span className="ml-2 font-mono text-xs text-gray-500">
                  {selectedModel.model}
                </span>
              </span>

              <span>
                {loadingFields
                  ? t('Chargement…')
                  : t('{shown} champ(s) affiché(s) sur {total}')
                      .replace('{shown}', filteredFields.length)
                      .replace('{total}', fields.length)}
              </span>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-600">
                <tr>
                  <th className="px-4 py-3">{t('Nom technique')}</th>
                  <th className="px-4 py-3">{t('Libellé')}</th>
                  <th className="px-4 py-3">{t('Type')}</th>
                  <th className="px-4 py-3">{t('Origine')}</th>
                  <th className="px-4 py-3">{t('Obligatoire')}</th>
                  <th className="px-4 py-3">{t('Lecture seule')}</th>
                  <th className="px-4 py-3">{t('Index SQL')}</th>
                  <th className="px-4 py-3">{t('Relation')}</th>
                  <th className="px-4 py-3">{t('Aide')}</th>
                  <th className="px-4 py-3">{t('Action')}</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100 bg-white">
                {loadingFields && (
                  <tr>
                    <td
                      colSpan="10"
                      className="px-4 py-10 text-center text-gray-500"
                    >
                      {t('Chargement des champs…')}
                    </td>
                  </tr>
                )}

                {!loadingFields &&
                  filteredFields.map((field) => (
                    <tr
                      key={field.id}
                      onClick={() =>
                        setSelectedField({
                          ...field,
                          selection_options:
                            field.selection_options ||
                            configuredField(configuration, field.name)
                              ?.selection ||
                            [],
                          default_value:
                            field.default_value ??
                            configuredField(configuration, field.name)
                              ?.default_value ??
                            null,
                        })
                      }
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          setSelectedField({
                            ...field,
                            selection_options:
                              field.selection_options ||
                              configuredField(configuration, field.name)
                                ?.selection ||
                              [],
                            default_value:
                              field.default_value ??
                              configuredField(configuration, field.name)
                                ?.default_value ??
                              null,
                          });
                        }
                      }}
                      tabIndex={0}
                      className="cursor-pointer hover:bg-violet-50 focus:bg-violet-50 focus:outline-none"
                    >
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-violet-800">
                        {field.name}
                      </td>

                      <td className="px-4 py-3 text-gray-900">
                        {field.field_description || '—'}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3 text-gray-700">
                        {t(typeLabels[field.ttype] || field.ttype || '—')}
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2 py-1 text-xs ${
                            field.state === 'manual'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {field.state === 'manual'
                            ? t('Manuel')
                            : t('core')}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        {field.required ? t('Oui') : t('Non')}
                      </td>

                      <td className="px-4 py-3">
                        {field.readonly ? t('Oui') : t('Non')}
                      </td>

                      <td className="px-4 py-3">
                        {field.index ? (
                          <span className="rounded-full bg-green-100 px-2 py-1 text-xs text-green-800">
                            {t('Oui')}
                          </span>
                        ) : (
                          <span className="text-gray-500">{t('Non')}</span>
                        )}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-gray-600">
                        {field.relation || '—'}
                      </td>

                      <td className="max-w-xs px-4 py-3 text-gray-600">
                        {field.help || '—'}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            openEdit(field);
                          }}
                          disabled={!isAdministrator}
                          className="inline-flex items-center gap-1 rounded border border-gray-300 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <FiEdit2 /> {t('Modifier')}
                        </button>
                      </td>
                    </tr>
                  ))}

                {!loadingFields && !filteredFields.length && (
                  <tr>
                    <td
                      colSpan="10"
                      className="px-4 py-10 text-center text-gray-500"
                    >
                      {t('Aucun champ trouvé pour ce modèle.')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <p className="text-xs leading-relaxed text-gray-500">
          {t(
            'Les champs « Base » décrivent le modèle Django ; le nom technique et le type restent fixes. Les champs « Manuel » sont stockés comme valeurs personnalisées par enregistrement.',
          )}
        </p>
      </div>

      {selectedField && !editingField && !creating && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/40 p-3 md:p-6 somane-overlay-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedField(null);
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="field-detail-title"
            className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl"
          >
            <header className="flex items-start justify-between border-b border-gray-200 px-5 py-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-violet-700">
                  {t('Détail du champ')}
                </p>
                <h2
                  id="field-detail-title"
                  className="mt-1 text-lg font-semibold text-gray-900"
                >
                  {selectedField.field_description || selectedField.name}
                </h2>
                <p className="mt-1 font-mono text-sm text-gray-500">
                  {selectedField.model_name}.{selectedField.name}
                </p>
              </div>

              <div className="flex gap-2">
                {isAdministrator && (
                  <button
                    type="button"
                    onClick={() => openEdit(selectedField)}
                    className="inline-flex items-center gap-2 rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <FiEdit2 /> {t('Modifier')}
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setSelectedField(null)}
                  aria-label={t('Fermer le détail')}
                  className="rounded-md p-2 text-gray-500 hover:bg-gray-100"
                >
                  <FiX size={20} />
                </button>
              </div>
            </header>

            <div className="overflow-y-auto p-5">
              <div className="grid gap-5 md:grid-cols-2">
                {visibleDetailSections.map(([title, properties]) => (
                  <section
                    key={title}
                    className="rounded-lg border border-gray-200"
                  >
                    <h3 className="border-b border-gray-100 bg-gray-50 px-4 py-2 text-sm font-semibold text-gray-800">
                      {t(title)}
                    </h3>

                    <dl className="divide-y divide-gray-100 px-4">
                      {properties.map(([key, label]) => (
                        <div
                          key={key}
                          className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] gap-3 py-2.5 text-sm"
                        >
                          <dt className="text-gray-500">{t(label)}</dt>
                          <dd className="break-words whitespace-pre-wrap text-right text-gray-900">
                            {detailValue(selectedField, key, t)}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </section>
                ))}

                <section className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 md:col-span-2">
                  <h3 className="font-semibold">
                    {t('Index de base de données')}
                  </h3>
                  <p className="mt-1">
                    {t(
                      selectedField.state === 'manual'
                        ? 'Ce champ personnalisé est stocké dans la table partagée des propriétés. Le cocher dans IrModelFields ne créerait pas un index SQL propre à ce champ ; il faut d’abord faire évoluer la stratégie de stockage.'
                        : selectedField.index
                          ? 'Un index physique est détecté sur le champ Django. Il accélère les recherches qui filtrent sur ce champ.'
                          : 'Aucun index physique n’est détecté. Pour l’ajouter, le champ doit être déclaré avec db_index dans le modèle Django, puis une migration doit être créée et appliquée.',
                    )}
                  </p>
                </section>

                <section className="rounded-lg border border-gray-200 md:col-span-2">
                  <h3 className="border-b border-gray-100 bg-gray-50 px-4 py-2 text-sm font-semibold text-gray-800">
                    {t('Présence et affichage dans les vues')}
                  </h3>

                  <div className="space-y-3 p-4">
                    <div className="rounded-md border border-violet-100 bg-violet-50 px-3 py-2 text-sm">
                      <strong className="text-violet-900">
                        {t('Rendu par défaut pour ce champ :')}
                      </strong>{' '}
                      <span className="text-violet-800">
                        {widgetLabel(
                          selectedField.ttype,
                          selectedField.display_widget,
                          t,
                        )}
                      </span>

                      <p className="mt-1 text-xs text-violet-700">
                        {t(
                          'Ce rendu s’applique aux écrans branchés sur le rendu des métadonnées, sauf si une vue choisit son propre rendu.',
                        )}
                      </p>
                    </div>

                    {placements.length ? (
                      placements.map((placement, index) => {
                        const options =
                          viewWidgetOptions[selectedField.ttype]?.[
                            placement.viewType
                          ] || [];

                        const draft = viewWidgetDrafts[placement.id] || {
                          options: placement.widgetOptions || {},
                          attributes: placement.widgetAttributes || {},
                        };

                        const effectiveWidget =
                          placement.widgetValue ||
                          selectedField.display_widget ||
                          selectedField.ttype;

                        return (
                          <div
                            key={`${placement.id}-${index}`}
                            className="space-y-2 rounded-md bg-gray-50 p-3 text-sm"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <span className="text-gray-800">
                                {placement.name}{' '}
                                <span className="text-xs text-gray-500">
                                  ({t(placement.type)})
                                </span>
                              </span>

                              {options.length > 1 && isAdministrator ? (
                                <label className="flex items-center gap-2 text-xs text-gray-600">
                                  {t('Affichage')}

                                  <SomaneSelect
                                    value={placement.widgetValue}
                                    disabled={
                                      savingPlacementId === placement.id
                                    }
                                    onChange={(event) => {
                                      const widget = event.target.value;
                                      const emptyConfig = {
                                        options: {},
                                        attributes: {},
                                      };

                                      setViewWidgetDrafts((current) => ({
                                        ...current,
                                        [placement.id]: emptyConfig,
                                      }));

                                      updatePlacementWidget(
                                        placement,
                                        widget,
                                        emptyConfig,
                                      );
                                    }}
                                    className="rounded border border-gray-300 bg-white px-2 py-1 text-sm text-gray-800"
                                  >
                                    {options.map(([value, label]) => (
                                      <option
                                        key={value || 'default'}
                                        value={value}
                                      >
                                        {value
                                          ? t(label)
                                          : `${t('Par défaut')} — ${widgetLabel(
                                              selectedField.ttype,
                                              selectedField.display_widget,
                                              t,
                                            )}`}
                                      </option>
                                    ))}
                                  </SomaneSelect>
                                </label>
                              ) : (
                                <span className="text-xs text-gray-600">
                                  {t('Rendu effectif :')}{' '}
                                  {widgetLabel(
                                    selectedField.ttype,
                                    placement.widgetValue ||
                                      selectedField.display_widget,
                                    t,
                                  )}
                                </span>
                              )}
                            </div>

                            {isAdministrator && (
                              <WidgetOptionsEditor
                                widget={effectiveWidget}
                                fieldType={selectedField.ttype}
                                value={draft}
                                fields={fields}
                                title={t('Options propres à cette vue')}
                                disabled={
                                  savingPlacementId === placement.id
                                }
                                onChange={(value) =>
                                  setViewWidgetDrafts((current) => ({
                                    ...current,
                                    [placement.id]: value,
                                  }))
                                }
                              />
                            )}

                            {isAdministrator &&
                              (Object.keys(draft.options || {}).length ||
                                Object.keys(draft.attributes || {}).length) >
                                0 && (
                                <div className="flex justify-end">
                                  <button
                                    type="button"
                                    disabled={
                                      savingPlacementId === placement.id
                                    }
                                    onClick={() =>
                                      updatePlacementWidget(
                                        placement,
                                        placement.widgetValue,
                                        draft,
                                      )
                                    }
                                    className="rounded-md bg-violet-700 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                                  >
                                    {savingPlacementId === placement.id
                                      ? t('Enregistrement…')
                                      : t(
                                          'Enregistrer les options de cette vue',
                                        )}
                                  </button>
                                </div>
                              )}
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-sm text-gray-500">
                        {t(
                          'Ce champ n’est présent dans aucune vue chargée pour ce modèle.',
                        )}
                      </p>
                    )}
                  </div>
                </section>
              </div>
            </div>

            <footer className="border-t border-gray-200 px-5 py-3 text-right">
              <button
                type="button"
                onClick={() => setSelectedField(null)}
                className="rounded-md bg-violet-700 px-4 py-2 text-sm font-medium text-white hover:bg-violet-800"
              >
                {t('Fermer')}
              </button>
            </footer>
          </section>
        </div>
      )}

      {editingField && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-gray-950/40 p-3 md:p-6 somane-overlay-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setEditingField(null);
            }
          }}
        >
          <form
            onSubmit={saveEdit}
            role="dialog"
            aria-modal="true"
            aria-labelledby="field-edit-title"
            className="flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl"
          >
            <header className="flex shrink-0 items-start justify-between border-b border-gray-200 p-5">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-violet-700">
                  {t(
                    editingField.state === 'manual'
                      ? 'Champ personnalisé'
                      : 'Champ Django',
                  )}
                </p>

                <h2
                  id="field-edit-title"
                  className="mt-1 text-lg font-semibold text-gray-900"
                >
                  {t('Modifier le champ')}
                </h2>

                <p className="mt-1 font-mono text-xs text-gray-500">
                  {editingField.name} ·{' '}
                  {t(
                    typeLabels[editingField.ttype] ||
                      editingField.ttype,
                  )}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setEditingField(null)}
                aria-label={t('Fermer')}
                className="rounded-md p-2 text-gray-500 hover:bg-gray-100"
              >
                <FiX />
              </button>
            </header>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
              <label className="block text-sm font-medium text-gray-700">
                {t('Libellé')}
                <input
                  required
                  value={editForm.field_description}
                  onChange={(event) =>
                    setEditForm((current) => ({
                      ...current,
                      field_description: event.target.value,
                    }))
                  }
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 font-normal"
                />
              </label>

              <label className="block text-sm font-medium text-gray-700">
                {t('Texte d’aide')}
                <textarea
                  value={editForm.help}
                  onChange={(event) =>
                    setEditForm((current) => ({
                      ...current,
                      help: event.target.value,
                    }))
                  }
                  rows={3}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 font-normal"
                />
              </label>

              {getGlobalFieldDisplayOptions(editingField.ttype).length >
                1 && (
                <label className="block text-sm font-medium text-gray-700">
                  {t('Rendu par défaut dans les vues compatibles')}

                  <SomaneSelect
                    value={editForm.display_widget}
                    onChange={(event) =>
                      setEditForm((current) => ({
                        ...current,
                        display_widget: event.target.value,
                        display_widget_options: {
                          options: {},
                          attributes: {},
                        },
                      }))
                    }
                    className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 font-normal"
                  >
                    {getGlobalFieldDisplayOptions(editingField.ttype).map(
                      ([value, label]) => (
                        <option key={value || 'default'} value={value}>
                          {t(label)}
                        </option>
                      ),
                    )}
                  </SomaneSelect>

                  <span className="mt-1 block text-xs font-normal text-gray-500">
                    {t(
                      'Les vues formulaire et liste peuvent remplacer ce choix individuellement.',
                    )}
                  </span>
                </label>
              )}

              <WidgetOptionsEditor
                widget={editForm.display_widget || editingField.ttype}
                fieldType={editingField.ttype}
                value={editForm.display_widget_options}
                fields={fields}
                disabled={saving}
                onChange={(value) =>
                  setEditForm((current) => ({
                    ...current,
                    display_widget_options: value,
                  }))
                }
              />

              {developerMode &&
                supportsBaseFieldSettings(editingField) &&
                editingField.ttype === 'char' && (
                  <label className="block text-sm font-medium text-gray-700">
                    {t('Longueur maximale')}
                    <input
                      type="number"
                      min="1"
                      max="255"
                      value={editForm.size}
                      onChange={(event) =>
                        setEditForm((current) => ({
                          ...current,
                          size: event.target.value,
                        }))
                      }
                      placeholder={t('Sans limite personnalisée')}
                      className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 font-normal"
                    />
                    <span className="mt-1 block text-xs font-normal text-gray-500">
                      {t(
                        'De 1 à 255 caractères. La règle est vérifiée dans le formulaire et par l’API.',
                      )}
                    </span>
                  </label>
                )}

              {developerMode &&
                editingField.state === 'manual' &&
                editingField.ttype === 'selection' && (
                  <FieldOptionsEditor
                    options={editForm.selection_options}
                    onChange={(options) =>
                      setEditForm((current) => ({
                        ...current,
                        selection_options: options,
                      }))
                    }
                  />
                )}

              {developerMode &&
                supportsDefaultValue(editingField) && (
                  <label className="block text-sm font-medium text-gray-700">
                    {t('Valeur par défaut')}
                    <DefaultValueInput
                      type={editingField.ttype}
                      value={editForm.default_value}
                      options={editForm.selection_options}
                      onChange={(value) =>
                        setEditForm((current) => ({
                          ...current,
                          default_value: value,
                        }))
                      }
                    />
                    <span className="mt-1 block text-xs font-normal text-gray-500">
                      {t(
                        'Appliquée lors de la création d’un nouveau partenaire pour tous les utilisateurs ; efface le champ pour la supprimer.',
                      )}
                    </span>
                  </label>
                )}

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex items-center gap-2 rounded-md border border-gray-200 p-3 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={editForm.required}
                    onChange={(event) =>
                      setEditForm((current) => ({
                        ...current,
                        required: event.target.checked,
                      }))
                    }
                  />
                  {t('Obligatoire')}
                </label>

                <label className="flex items-center gap-2 rounded-md border border-gray-200 p-3 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={editForm.readonly}
                    onChange={(event) =>
                      setEditForm((current) => ({
                        ...current,
                        readonly: event.target.checked,
                      }))
                    }
                  />
                  {t('Lecture seule')}
                </label>
              </div>

              {developerMode && (
                <label className="block text-sm font-medium text-gray-700">
                  {t('Groupes autorisés')}

                  <SomaneSelect
                    multiple
                    value={editForm.groups.map(String)}
                    onChange={(event) =>
                      setEditForm((current) => ({
                        ...current,
                        groups: Array.from(
                          event.target.selectedOptions,
                          (option) => Number(option.value),
                        ),
                      }))
                    }
                    className="mt-1 min-h-24 w-full rounded-md border border-gray-300 bg-white px-3 py-2 font-normal"
                    size={Math.min(Math.max(groups.length, 3), 7)}
                  >
                    {groups.map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.name}
                      </option>
                    ))}
                  </SomaneSelect>

                  <span className="mt-1 block text-xs font-normal text-gray-500">
                    {t(
                      'Vide : tous les utilisateurs autorisés sur le modèle voient ce champ. Avec une sélection : seuls les membres de ces groupes y accèdent, dans l’interface et l’API. Maintiens Ctrl pour choisir plusieurs groupes.',
                    )}
                  </span>
                </label>
              )}

              <p className="text-xs leading-relaxed text-gray-500">
                {t(
                  'Le nom technique, le modèle et le type définissent la structure ; ils ne sont pas modifiables après création.',
                )}
                {developerMode &&
                  ` ${t(
                    'Les propriétés supplémentaires ne sont proposées que lorsqu’elles ont un effet pris en charge par l’application.',
                  )}`}
              </p>
            </div>

            <footer className="flex shrink-0 justify-end gap-2 border-t border-gray-200 bg-white p-4">
              <button
                type="button"
                onClick={() => setEditingField(null)}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700"
              >
                {t('Annuler')}
              </button>

              <button
                type="submit"
                disabled={saving}
                className="rounded-md bg-violet-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {saving ? t('Enregistrement…') : t('Enregistrer')}
              </button>
            </footer>
          </form>
        </div>
      )}

      {creating && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-gray-950/40 p-3 md:p-6 somane-overlay-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setCreating(false);
            }
          }}
        >
          <form
            onSubmit={createField}
            role="dialog"
            aria-modal="true"
            aria-labelledby="field-create-title"
            className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl"
          >
            <header className="flex shrink-0 items-start justify-between border-b border-gray-200 p-5">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-violet-700">
                  {selectedModel?.name}
                </p>

                <h2
                  id="field-create-title"
                  className="mt-1 text-lg font-semibold text-gray-900"
                >
                  {t('Ajouter un champ personnalisé')}
                </h2>

                <p className="mt-1 text-xs text-gray-500">
                  {t(
                    'Le nouveau champ sera ajouté à une vue formulaire du partenaire.',
                  )}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setCreating(false)}
                aria-label={t('Fermer')}
                className="rounded-md p-2 text-gray-500 hover:bg-gray-100"
              >
                <FiX />
              </button>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto">
              <div className="grid gap-4 p-5 sm:grid-cols-2">
                <label className="block text-sm font-medium text-gray-700">
                  {t('Libellé')}
                  <input
                    required
                    value={newForm.field_description}
                    onChange={(event) =>
                      updateNewForm(
                        'field_description',
                        event.target.value,
                      )
                    }
                    placeholder={t('Ex. Code client')}
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 font-normal"
                  />
                </label>

                <label className="block text-sm font-medium text-gray-700">
                  {t('Nom technique')}
                  <input
                    required
                    pattern="x_[a-z][a-z0-9_]{0,60}"
                    title={t(
                      'Commence par x_ puis utilise des minuscules, chiffres et _',
                    )}
                    value={newForm.name}
                    onChange={(event) => {
                      setNameTouched(true);
                      updateNewForm('name', event.target.value);
                    }}
                    placeholder="x_code_client"
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-sm font-normal"
                  />
                </label>

                <label className="block text-sm font-medium text-gray-700">
                  {t('Type')}
                  <SomaneSelect
                    value={newForm.ttype}
                    onChange={(event) =>
                      updateNewForm('ttype', event.target.value)
                    }
                    className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 font-normal"
                  >
                    {editableTypes.map(([value, label]) => (
                      <option key={value} value={value}>
                        {t(label)}
                      </option>
                    ))}
                  </SomaneSelect>
                </label>

                <label className="block text-sm font-medium text-gray-700">
                  {t('Vue formulaire')}
                  <SomaneSelect
                    required
                    value={newForm.view_id}
                    onChange={(event) =>
                      updateNewForm('view_id', event.target.value)
                    }
                    className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 font-normal"
                  >
                    {formViews.map((view) => (
                      <option key={view.id} value={String(view.id)}>
                        {view.name}
                        {view.key === 'somane_ui.clients_form'
                          ? ` — ${t('Partenaires')}`
                          : ''}
                      </option>
                    ))}
                  </SomaneSelect>
                </label>

                {newForm.ttype === 'char' && (
                  <label className="block text-sm font-medium text-gray-700">
                    {t('Longueur maximale')}
                    <input
                      type="number"
                      min="1"
                      max="255"
                      value={newForm.size}
                      onChange={(event) =>
                        updateNewForm('size', event.target.value)
                      }
                      placeholder={t('Sans limite personnalisée')}
                      className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 font-normal"
                    />
                    <span className="mt-1 block text-xs font-normal text-gray-500">
                      {t('De 1 à 255 caractères.')}
                    </span>
                  </label>
                )}

                {getGlobalFieldDisplayOptions(newForm.ttype).length > 1 && (
                  <label className="block text-sm font-medium text-gray-700">
                    {t('Rendu par défaut dans les vues compatibles')}

                    <SomaneSelect
                      value={newForm.display_widget}
                      onChange={(event) => {
                        updateNewForm('display_widget', event.target.value);
                        updateNewForm('display_widget_options', {
                          options: {},
                          attributes: {},
                        });
                      }}
                      className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 font-normal"
                    >
                      {getGlobalFieldDisplayOptions(newForm.ttype).map(
                        ([value, label]) => (
                          <option key={value || 'default'} value={value}>
                            {t(label)}
                          </option>
                        ),
                      )}
                    </SomaneSelect>

                    <span className="mt-1 block text-xs font-normal text-gray-500">
                      {t(
                        'Il sera repris dans toutes les vues, sauf si une vue le remplace.',
                      )}
                    </span>
                  </label>
                )}

                <div className="sm:col-span-2">
                  <WidgetOptionsEditor
                    widget={newForm.display_widget || newForm.ttype}
                    fieldType={newForm.ttype}
                    value={newForm.display_widget_options}
                    fields={fields}
                    disabled={saving}
                    onChange={(value) =>
                      updateNewForm('display_widget_options', value)
                    }
                  />
                </div>

                {viewWidgetOptions[newForm.ttype]?.form?.length > 1 && (
                  <label className="block text-sm font-medium text-gray-700">
                    {t('Exception pour la vue formulaire choisie')}

                    <SomaneSelect
                      value={newForm.widget}
                      onChange={(event) => {
                        updateNewForm('widget', event.target.value);
                        updateNewForm('view_widget_options', {
                          options: {},
                          attributes: {},
                        });
                      }}
                      className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 font-normal"
                    >
                      {viewWidgetOptions[newForm.ttype].form.map(
                        ([value, label]) => (
                          <option key={value || 'default'} value={value}>
                            {value
                              ? t(label)
                              : `${t('Utiliser le rendu global')} (${widgetLabel(
                                  newForm.ttype,
                                  newForm.display_widget,
                                  t,
                                )})`}
                          </option>
                        ),
                      )}
                    </SomaneSelect>

                    <span className="mt-1 block text-xs font-normal text-gray-500">
                      {t(
                        'Cette exception ne concerne que la vue choisie. En saisie, les dates restent sélectionnées avec le calendrier.',
                      )}
                    </span>
                  </label>
                )}

                {newForm.widget && (
                  <div className="sm:col-span-2">
                    <WidgetOptionsEditor
                      widget={newForm.widget}
                      fieldType={newForm.ttype}
                      value={newForm.view_widget_options}
                      fields={fields}
                      title={t('Options pour la vue formulaire choisie')}
                      disabled={saving}
                      onChange={(value) =>
                        updateNewForm('view_widget_options', value)
                      }
                    />
                  </div>
                )}

                {newForm.ttype === 'selection' && (
                  <FieldOptionsEditor
                    options={newForm.selection_options}
                    onChange={(options) =>
                      updateNewForm('selection_options', options)
                    }
                  />
                )}

                <label className="block text-sm font-medium text-gray-700">
                  {t('Valeur par défaut')}
                  <DefaultValueInput
                    type={newForm.ttype}
                    value={newForm.default_value}
                    options={newForm.selection_options}
                    onChange={(value) =>
                      updateNewForm('default_value', value)
                    }
                  />
                  <span className="mt-1 block text-xs font-normal text-gray-500">
                    {t(
                      'Cette valeur préremplira le champ sur chaque nouveau partenaire.',
                    )}
                  </span>
                </label>

                <label className="block text-sm font-medium text-gray-700 sm:col-span-2">
                  {t('Texte d’aide')}
                  <textarea
                    value={newForm.help}
                    onChange={(event) =>
                      updateNewForm('help', event.target.value)
                    }
                    rows={2}
                    placeholder={t('Explique à quoi sert le champ')}
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 font-normal"
                  />
                </label>

                <label className="flex items-center gap-2 rounded-md border border-gray-200 p-3 text-sm text-gray-700 sm:col-span-2">
                  <input
                    type="checkbox"
                    checked={newForm.required}
                    onChange={(event) =>
                      updateNewForm('required', event.target.checked)
                    }
                  />
                  {t('Rendre ce champ obligatoire')}
                </label>

                <p className="rounded-md bg-blue-50 p-3 text-xs leading-relaxed text-blue-800 sm:col-span-2">
                  {t(
                    'La valeur sera enregistrée avec chaque partenaire dans les propriétés dynamiques. Aucun champ SQL ne sera ajouté au modèle Django.',
                  )}
                </p>
              </div>
            </div>

            <footer className="flex shrink-0 justify-end gap-2 border-t border-gray-200 bg-white p-4">
              <button
                type="button"
                onClick={() => setCreating(false)}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700"
              >
                {t('Annuler')}
              </button>

              <button
                type="submit"
                disabled={saving || !newForm.view_id}
                className="rounded-md bg-violet-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {saving
                  ? t('Création…')
                  : t('Créer et ajouter à la vue')}
              </button>
            </footer>
          </form>
        </div>
      )}
    </main>
  );
}