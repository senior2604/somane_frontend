import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { FiCalendar, FiCode, FiDollarSign, FiInfo, FiLink, FiType, FiHash, FiToggleLeft, FiList, FiFileText, FiDatabase } from 'react-icons/fi';
import MetadataFieldInput from '../../components/MetadataFieldInput';
import MetadataFieldDisplay from '../../components/MetadataFieldDisplay';
import WidgetOptionsEditor from '../../components/WidgetOptionsEditor';
import { FIELD_DISPLAY_OPTIONS, formatMetadataValue, getGlobalFieldDisplayOptions } from '../../services/fieldDisplay';
import { apiClient } from '../../services/apiClient';
import { useEntity } from '../../context/EntityContext';
import { useUi } from '../../context/UiContext';
import { useLanguage } from '../../context/LanguageContext';
import ModelPicker from '../../components/ModelPicker';

const SAMPLE_CURRENCY = { devise_details: { code: 'XOF', nom: 'Franc CFA', symbole: 'FCFA' } };
const EXAMPLE_CHOICES = [
  { value: 'standard', label: 'Standard' },
  { value: 'premium', label: 'Premium' },
];
const SAMPLE_VALUES = {
  char: 'REF-CLIENT-2026-00012',
  text: 'Première ligne de la note.\nDeuxième ligne avec un détail utile.',
  integer: '12800',
  float: '1234567.89',
  decimal: '1234567.89',
  boolean: true,
  selection: 'premium',
  many2one: { id: 32, name: 'SOCOGEC' },
  one2many: [{ id: 1, name: 'Ligne de facture 1' }, { id: 2, name: 'Ligne de facture 2' }],
  many2many: [{ id: 1, name: 'Client' }, { id: 2, name: 'Fournisseur' }],
  reference: { model: 'core.Partenaire', id: 32, name: 'SOCOGEC' },
  binary: { name: 'contrat-client.pdf', size: 284000, mimetype: 'application/pdf' },
  html: '<p>Texte <strong>mis en forme</strong>.</p><p>Deuxième paragraphe.</p>',
  json: '{\n  "code": "CLI-104",\n  "actif": true,\n  "tags": ["client", "premium"]\n}',
};

function rowsFrom(payload) {
  if (Array.isArray(payload)) return payload;
  return Array.isArray(payload?.results) ? payload.results : [];
}

async function fetchAll(endpoint, filters = {}) {
  const all = [];
  let page = 1;
  let next = true;
  while (next) {
    const payload = await apiClient.get(endpoint, { params: { ...filters, page } });
    all.push(...rowsFrom(payload));
    next = Boolean(payload?.next);
    page += 1;
  }
  return all;
}

function currentLocalDateTime() {
  const date = new Date();
  const pad = (value) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function currentLocalDate() {
  return currentLocalDateTime().slice(0, 10);
}

function WidgetSelector({ label, value, options, onChange }) {
  const { t } = useLanguage();
  return (
    <label className="block text-sm font-medium text-slate-700">
      {t(label)}
      <select aria-label={label} value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm">
        {options.map(([optionValue, optionLabel]) => <option key={optionValue || 'default'} value={optionValue}>{t(optionLabel)}</option>)}
      </select>
    </label>
  );
}

function PreviewCard({ icon: Icon, title, technicalType, description, children }) {
  const { t } = useLanguage();
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <header className="flex items-start gap-3 border-b border-slate-200 bg-slate-50 px-5 py-4">
        <span className="rounded-lg bg-violet-100 p-2 text-violet-700"><Icon size={20} /></span>
        <div>
          <h2 className="font-semibold text-slate-900">{t(title)}</h2>
          <p className="mt-0.5 font-mono text-xs text-slate-500">IrModelFields.ttype = {technicalType}</p>
          <p className="mt-2 text-sm text-slate-600">{t(description)}</p>
        </div>
      </header>
      <div className="space-y-4 p-5">{children}</div>
    </section>
  );
}

function SampleFieldCard({ title, type, description, icon: Icon }) {
  const { t } = useLanguage();
  const [value, setValue] = useState(SAMPLE_VALUES[type]);
  const [widget, setWidget] = useState('');
  const [widgetOptions, setWidgetOptions] = useState({ options: {}, attributes: {} });
  const options = FIELD_DISPLAY_OPTIONS[type] || [];
  let previewValue = value;
  if (type === 'char' && widget === 'email') previewValue = 'contact@somane.example';
  if (type === 'char' && widget === 'phone') previewValue = '+228 22 00 00 00';
  if (type === 'char' && ['url', 'CopyClipboardURL'].includes(widget)) previewValue = 'https://somane.example';
  if (type === 'char' && widget === 'image_url') previewValue = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="120" height="60"%3E%3Crect width="120" height="60" rx="8" fill="%23ede9fe"/%3E%3Ctext x="60" y="36" text-anchor="middle" fill="%237c3aed" font-size="14"%3EImage%3C/text%3E%3C/svg%3E';
  if (['integer', 'float', 'decimal'].includes(type) && ['progressbar', 'percentpie'].includes(widget)) previewValue = 65;
  if (['float', 'decimal'].includes(type) && widget === 'percentage') previewValue = 0.125;
  if (type === 'float' && widget === 'float_time') previewValue = 2.5;
  if (widget === 'statinfo' && ['one2many', 'many2many'].includes(type)) previewValue = 12;
  if (widget === 'many2one_binary') previewValue = { name: 'contrat-client.pdf', mimetype: 'application/pdf' };
  if (widget === 'many2many_binary') previewValue = [{ name: 'facture-client.pdf', mimetype: 'application/pdf' }, { name: 'justificatif.png', mimetype: 'image/png' }];
  if (type === 'binary' && ['image', 'signature'].includes(widget)) previewValue = {
    name: 'exemple-image.svg', mimetype: 'image/svg+xml',
    data: 'PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMjAiIGhlaWdodD0iNjAiPjxyZWN0IHdpZHRoPSIxMjAiIGhlaWdodD0iNjAiIHJ4PSI4IiBmaWxsPSIjZWRlOWZlIi8+PHRleHQgeD0iNjAiIHk9IjM2IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjN2MzYWVkIiBmb250LXNpemU9IjE0Ij5JbWFnZTwvdGV4dD48L3N2Zz4=',
  };
  const field = { name: `exemple_${type}`, type, widget, widget_options: widgetOptions.options, widget_attributes: widgetOptions.attributes, selection: EXAMPLE_CHOICES };
  let editor;

  if (type === 'text' || type === 'html' || type === 'json') {
    editor = <textarea value={value} onChange={(event) => setValue(event.target.value)} rows={3} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />;
  } else if (type === 'boolean') {
    editor = <select value={value ? 'true' : 'false'} onChange={(event) => setValue(event.target.value === 'true')} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"><option value="true">Oui</option><option value="false">Non</option></select>;
  } else if (type === 'selection') {
    editor = <select value={value} onChange={(event) => setValue(event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm">{EXAMPLE_CHOICES.map((choice) => <option key={choice.value} value={choice.value}>{choice.label}</option>)}</select>;
  } else if (['many2one', 'one2many', 'many2many', 'reference', 'binary'].includes(type)) {
    editor = <p className="mt-1 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">Exemple prérempli ; les relations et fichiers réels sont choisis dans leur formulaire dédié.</p>;
  } else {
    editor = <input type={type === 'integer' || type === 'float' ? 'number' : 'text'} step={type === 'integer' ? '1' : type === 'float' ? 'any' : undefined} value={value} onChange={(event) => setValue(event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />;
  }

  return (
    <PreviewCard icon={Icon} title={title} technicalType={type} description={description}>
      <label className="block text-sm font-medium text-slate-700">{t('Valeur d’exemple')}{editor}</label>
      {options.length > 1 && <WidgetSelector label="Rendu de lecture" value={widget} options={options} onChange={setWidget} />}
      <WidgetOptionsEditor widget={widget || type} fieldType={type} value={widgetOptions} onChange={setWidgetOptions} />
      <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm">
        <span className="mr-2 text-slate-500">{t('Résultat')} :</span>
        <MetadataFieldDisplay value={previewValue} field={field} />
      </div>
    </PreviewCard>
  );
}

function sampleForField(field) {
  const type = field?.ttype;
  if (type === 'date') return currentLocalDate();
  if (type === 'datetime') return currentLocalDateTime();
  if (type === 'monetary' || ['integer', 'float', 'decimal'].includes(type)) return type === 'integer' ? 1250000 : '1250000.5';
  return SAMPLE_VALUES[type] ?? 'Exemple';
}

export default function FieldPreviewPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { t } = useLanguage();
  const { activeEntity } = useEntity();
  const { security, reload: reloadUi } = useUi();
  const isAdministrator = Boolean(security?.user?.is_superuser);
  const [dateValue, setDateValue] = useState(currentLocalDate);
  const [dateWidget, setDateWidget] = useState('');
  const [dateWidgetOptions, setDateWidgetOptions] = useState({ options: {}, attributes: {} });
  const [dateTimeValue, setDateTimeValue] = useState(currentLocalDateTime);
  const [dateTimeWidget, setDateTimeWidget] = useState('');
  const [dateTimeWidgetOptions, setDateTimeWidgetOptions] = useState({ options: {}, attributes: {} });
  const [amount, setAmount] = useState('1250000');
  const [moneyWidget, setMoneyWidget] = useState('');
  const [moneyWidgetOptions, setMoneyWidgetOptions] = useState({ options: {}, attributes: {} });
  const [models, setModels] = useState([]);
  const [modelId, setModelId] = useState(searchParams.get('model_id') || '');
  const [modelFields, setModelFields] = useState([]);
  const [fieldId, setFieldId] = useState('');
  const [globalWidget, setGlobalWidget] = useState('');
  const [globalWidgetOptions, setGlobalWidgetOptions] = useState({ options: {}, attributes: {} });
  const [loadingModels, setLoadingModels] = useState(true);
  const [loadingFields, setLoadingFields] = useState(false);
  const [savingWidget, setSavingWidget] = useState(false);
  const [registryError, setRegistryError] = useState('');
  const [registryNotice, setRegistryNotice] = useState('');

  const entityCurrency = activeEntity?.devise_details
    || (typeof activeEntity?.devise === 'object' ? activeEntity.devise : null);
  const currencyEntity = entityCurrency ? { ...activeEntity, devise_details: entityCurrency } : SAMPLE_CURRENCY;
  const currencyName = entityCurrency?.code || 'XOF (exemple)';
  const selectedModel = models.find((model) => String(model.id) === String(modelId));
  const selectedField = modelFields.find((field) => String(field.id) === String(fieldId));
  const selectedFieldOptions = getGlobalFieldDisplayOptions(selectedField?.ttype);
  const selectedFieldSample = sampleForField(selectedField);
  const previewField = selectedField
    ? { type: selectedField.ttype, widget: globalWidget, widget_options: globalWidgetOptions.options, widget_attributes: globalWidgetOptions.attributes, selection: EXAMPLE_CHOICES, name: selectedField.name, label: selectedField.field_description, relation: selectedField.relation }
    : null;

  useEffect(() => {
    let active = true;
    fetchAll('/ir-models/')
      .then((rows) => {
        if (!active) return;
        const sortedRows = rows.sort((a, b) => (a.model || '').localeCompare(b.model || '', 'fr'));
        setModels(sortedRows);
        setModelId((current) => {
          if (current && sortedRows.some((model) => String(model.id) === current)) return current;
          const partnerModel = sortedRows.find((model) => model.model === 'core.Partenaire');
          return String(partnerModel?.id || sortedRows[0]?.id || '');
        });
      })
      .catch((exception) => { if (active) setRegistryError(exception?.message || 'Impossible de charger les modèles.'); })
      .finally(() => { if (active) setLoadingModels(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    if (!modelId) { setModelFields([]); setFieldId(''); return () => { active = false; }; }
    setLoadingFields(true);
    setRegistryError('');
    fetchAll('/ir-model-fields/', { model_id: modelId })
      .then((rows) => {
        if (!active) return;
        setModelFields(rows);
        const first = rows.find((field) => (FIELD_DISPLAY_OPTIONS[field.ttype] || []).length > 1) || rows[0];
        setFieldId(String(first?.id || ''));
        setGlobalWidget(first?.display_widget || '');
      })
      .catch((exception) => { if (active) setRegistryError(exception?.message || 'Impossible de charger les champs du modèle.'); })
      .finally(() => { if (active) setLoadingFields(false); });
    return () => { active = false; };
  }, [modelId]);

  useEffect(() => {
    const field = modelFields.find((item) => String(item.id) === String(fieldId));
    if (field) {
      setGlobalWidget(field.display_widget || '');
      setGlobalWidgetOptions(field.display_widget_options || { options: {}, attributes: {} });
    }
  }, [fieldId, modelFields]);

  const saveGlobalWidget = async () => {
    if (!selectedField || !isAdministrator) return;
    setSavingWidget(true);
    setRegistryError('');
    setRegistryNotice('');
    try {
      const updated = await apiClient.patch(`/ir-model-fields/${selectedField.id}/update-definition/`, {
        display_widget: globalWidget,
        display_widget_options: globalWidgetOptions,
      });
      setModelFields((current) => current.map((field) => field.id === updated.id ? updated : field));
      setRegistryNotice('Rendu par défaut enregistré ; il sera appliqué aux vues sans exception.');
      await reloadUi();
    } catch (exception) {
      setRegistryError(exception?.data?.display_widget || exception?.message || 'Impossible d’enregistrer ce rendu.');
    } finally {
      setSavingWidget(false);
    }
  };

  return (
    <main className="min-h-full bg-slate-100 p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-5">
        <header className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <span className="rounded-lg bg-violet-100 p-2 text-violet-700"><FiCode size={22} /></span>
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">{t('Aperçu des champs et de leurs rendus')}</h1>
            <p className="mt-1 text-sm text-slate-600">{t('Compare les contrôles de saisie et teste les styles avant de les appliquer à un champ enregistré.')}</p>
          </div>
        </header>

        <div role="note" className="flex gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
          <FiInfo className="mt-0.5 shrink-0" />
          <p>Les cartes ci-dessous sont des exemples temporaires : les valeurs saisies ne sont pas enregistrées. Le type du champ vient d’<strong>IrModelFields</strong>. Le rendu global est stocké dans cette définition et s’applique aux écrans branchés sur le rendu des métadonnées ; <strong>IrUiView</strong> peut le remplacer dans un formulaire ou une liste précise.</p>
        </div>

        <section className="rounded-xl border border-violet-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-semibold text-slate-900">{t('Tester un champ déjà défini dans IrModelFields')}</h2>
              <p className="mt-1 text-sm text-slate-600">{t('Le réglage ci-dessous est réel : il change le rendu par défaut de ce champ dans les écrans qui utilisent les métadonnées.')}</p>
            </div>
            {selectedField && <Link to={`/model-fields?model_id=${encodeURIComponent(modelId)}&field_id=${encodeURIComponent(fieldId)}`} className="text-sm font-medium text-violet-700 hover:underline">{t('Ouvrir sa fiche dans Champs des modèles')} →</Link>}
          </div>
          {registryError && <p role="alert" className="mb-3 rounded-md bg-red-50 p-3 text-sm text-red-700">{registryError}</p>}
          {registryNotice && <p role="status" className="mb-3 rounded-md bg-green-50 p-3 text-sm text-green-800">{registryNotice}</p>}
          <div className="grid gap-4 md:grid-cols-2">
            <ModelPicker
              id="field-preview-model"
              models={models}
              value={modelId}
              onChange={(value) => {
                setModelId(value);
                setSearchParams(value ? { model_id: value } : {}, { replace: true });
              }}
              loading={loadingModels}
              label={t('Modèle')}
              placeholder={t('Rechercher un modèle par nom ou code…')}
              loadingLabel={t('Chargement des modèles…')}
              emptyLabel={t('Aucun modèle trouvé')}
              partnerShortcutLabel={t('Accès rapide : Partenaire')}
            />
            <label className="block text-sm font-medium text-slate-700">{t('Champ')}
              <select value={fieldId} onChange={(event) => setFieldId(event.target.value)} disabled={loadingFields || !modelFields.length} className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2">
                {loadingFields && <option value="">{t('Chargement…')}</option>}
                {modelFields.map((field) => <option key={field.id} value={String(field.id)}>{t(field.field_description || field.name)} · {t(field.ttype)}</option>)}
              </select>
            </label>
          </div>
          {selectedField && (
            <>
            <div className="mt-4 grid gap-4 border-t border-slate-100 pt-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
              {selectedFieldOptions.length > 1 ? (
                <label className="block text-sm font-medium text-slate-700">{t('Rendu global')}
                  <select value={globalWidget} onChange={(event) => setGlobalWidget(event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2">
                    {selectedFieldOptions.map(([value, label]) => <option key={value || 'default'} value={value}>{t(label)}</option>)}
                  </select>
                </label>
              ) : <p className="text-sm text-slate-500">{t('Ce type de champ n’a pas encore d’option de rendu spécifique.')}</p>}
              <div className="rounded-md bg-slate-50 p-3 text-sm">
                <span className="mr-2 text-slate-500">{t('Aperçu')} :</span>
                <MetadataFieldDisplay value={selectedFieldSample} field={previewField} entity={currencyEntity} />
              </div>
              {isAdministrator && <button type="button" onClick={saveGlobalWidget} disabled={savingWidget || (globalWidget === (selectedField.display_widget || '') && JSON.stringify(globalWidgetOptions) === JSON.stringify(selectedField.display_widget_options || { options: {}, attributes: {} }))} className="rounded-md bg-violet-700 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50">{t(savingWidget ? 'Enregistrement…' : 'Enregistrer le rendu global')}</button>}
            </div>
            <div className="mt-4 border-t border-slate-100 pt-4"><WidgetOptionsEditor widget={globalWidget || selectedField.ttype} fieldType={selectedField.ttype} value={globalWidgetOptions} fields={modelFields} disabled={!isAdministrator || savingWidget} onChange={setGlobalWidgetOptions} /></div>
            </>
          )}
          {!isAdministrator && <p className="mt-3 text-xs text-slate-500">{t('Tu peux tester les rendus ici. L’enregistrement du rendu global est réservé à l’administrateur système.')}</p>}
          {selectedField && <p className="mt-2 text-xs text-slate-500">{t('Modèle')} : {selectedModel?.model} · {t('champ')} : <code>{selectedField.name}</code>. {t('Les exceptions par formulaire ou liste se règlent dans le détail du champ.')}</p>}
        </section>

        <div className="grid gap-5 xl:grid-cols-2">
          <PreviewCard icon={FiCalendar} title="Date" technicalType="date" description="Une date sans heure. Le champ d’édition conserve le sélecteur du navigateur.">
            <label className="block text-sm font-medium text-slate-700">{t('Valeur d’exemple')}
              <MetadataFieldInput field={{ name: 'date_exemple', type: 'date', widget: dateWidget, widget_options: dateWidgetOptions.options, widget_attributes: dateWidgetOptions.attributes }} value={dateValue} onChange={(event) => setDateValue(event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm" />
            </label>
            <WidgetSelector label="Rendu de lecture" value={dateWidget} options={FIELD_DISPLAY_OPTIONS.date} onChange={setDateWidget} />
            <WidgetOptionsEditor widget={dateWidget || 'date'} fieldType="date" value={dateWidgetOptions} onChange={setDateWidgetOptions} />
            <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm"><span className="mr-2 text-slate-500">{t('Résultat')} :</span>{formatMetadataValue(dateValue, { type: 'date', widget: dateWidget, widget_options: dateWidgetOptions.options, widget_attributes: dateWidgetOptions.attributes }, currencyEntity)}</div>
          </PreviewCard>

          <PreviewCard icon={FiCalendar} title="Date et heure" technicalType="datetime" description="Une date associée à une heure, éditée par un contrôle unique.">
            <label className="block text-sm font-medium text-slate-700">{t('Valeur d’exemple')}
              <MetadataFieldInput field={{ name: 'date_heure_exemple', type: 'datetime', widget: dateTimeWidget, widget_options: dateTimeWidgetOptions.options, widget_attributes: dateTimeWidgetOptions.attributes }} value={dateTimeValue} onChange={(event) => setDateTimeValue(event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm" />
            </label>
            <WidgetSelector label="Rendu de lecture" value={dateTimeWidget} options={FIELD_DISPLAY_OPTIONS.datetime} onChange={setDateTimeWidget} />
            <WidgetOptionsEditor widget={dateTimeWidget || 'datetime'} fieldType="datetime" value={dateTimeWidgetOptions} onChange={setDateTimeWidgetOptions} />
            <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm"><span className="mr-2 text-slate-500">{t('Résultat')} :</span>{formatMetadataValue(dateTimeValue, { type: 'datetime', widget: dateTimeWidget, widget_options: dateTimeWidgetOptions.options, widget_attributes: dateTimeWidgetOptions.attributes }, currencyEntity)}</div>
          </PreviewCard>

          <PreviewCard icon={FiDollarSign} title="Monétaire" technicalType="monetary" description="Le nombre peut reprendre la devise de l’entité, afficher son code ou son symbole.">
            <label className="block text-sm font-medium text-slate-700">{t('Montant d’exemple')}
              <MetadataFieldInput field={{ name: 'montant_exemple', type: 'monetary', widget: moneyWidget, widget_options: moneyWidgetOptions.options, widget_attributes: moneyWidgetOptions.attributes }} value={amount} onChange={(event) => setAmount(event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm" currencyEntity={currencyEntity} />
            </label>
            <p className="text-xs text-slate-500">{t('Devise utilisée')} : {currencyName}</p>
            <WidgetSelector label="Rendu de lecture" value={moneyWidget} options={FIELD_DISPLAY_OPTIONS.monetary} onChange={setMoneyWidget} />
            <WidgetOptionsEditor widget={moneyWidget || 'monetary'} fieldType="monetary" value={moneyWidgetOptions} onChange={setMoneyWidgetOptions} />
            <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm"><span className="mr-2 text-slate-500">{t('Résultat')} :</span>{formatMetadataValue(amount, { type: 'monetary', widget: moneyWidget, widget_options: moneyWidgetOptions.options, widget_attributes: moneyWidgetOptions.attributes }, currencyEntity)}</div>
          </PreviewCard>

          <SampleFieldCard icon={FiType} title="Texte court" type="char" description="Référence, nom ou code avec plusieurs styles de lecture." />
          <SampleFieldCard icon={FiType} title="Texte long" type="text" description="Note multiligne avec retours à la ligne, casse, police code ou aperçu raccourci." />
          <SampleFieldCard icon={FiHash} title="Entier" type="integer" description="Un nombre entier avec séparateurs ou présentation compacte." />
          <SampleFieldCard icon={FiHash} title="Nombre décimal" type="float" description="Un nombre décimal avec séparateurs ou présentation compacte." />
          <SampleFieldCard icon={FiHash} title="Décimal de précision" type="decimal" description="Un nombre précis, rendu avec séparateurs ou présentation compacte." />
          <SampleFieldCard icon={FiToggleLeft} title="Oui / Non" type="boolean" description="Une valeur booléenne sous forme de texte, badge ou icône." />
          <SampleFieldCard icon={FiList} title="Liste de choix" type="selection" description="Une option choisie, éventuellement présentée sous forme de badge." />
          <SampleFieldCard icon={FiLink} title="Relation simple" type="many2one" description="Un seul enregistrement lié, en texte ou en badge." />
          <SampleFieldCard icon={FiLink} title="Lignes liées" type="one2many" description="Des enregistrements enfants affichés en texte ou en étiquettes." />
          <SampleFieldCard icon={FiLink} title="Relations multiples" type="many2many" description="Plusieurs éléments liés, en texte ou en étiquettes." />
          <SampleFieldCard icon={FiLink} title="Référence" type="reference" description="Une référence à un enregistrement, avec ou sans modèle." />
          <SampleFieldCard icon={FiFileText} title="Fichier" type="binary" description="Les informations descriptives d’une pièce jointe." />
          <SampleFieldCard icon={FiCode} title="HTML" type="html" description="Texte HTML affiché sans exécuter de balises dans l’aperçu." />
          <SampleFieldCard icon={FiDatabase} title="JSON" type="json" description="Un objet affiché en JSON lisible, compact ou en bloc de code." />
        </div>

        <p className="text-xs leading-relaxed text-slate-500">Les rendus des cartes d’exemple sont temporaires. Pour un champ réel, choisis son rendu global dans cet aperçu ou ouvre « Champs des modèles » pour définir une exception propre à une vue. Les exemples n’ajoutent aucun champ à Partenaire.</p>
      </div>
    </main>
  );
}

