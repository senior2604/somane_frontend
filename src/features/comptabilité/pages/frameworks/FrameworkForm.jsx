// src/features/comptabilite/pages/frameworks/FrameworkForm.jsx
import { Form, Input, Select, Spin, Switch } from 'antd';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FiBriefcase, FiFolder, FiInfo, FiPlus, FiSettings, FiTag } from 'react-icons/fi';
import { useLocation, useNavigate, useParams } from 'react-router-dom';

import UnifiedFormPage from '../../../../components/UnifiedFormPage';
import { ENDPOINTS } from '../../../../config/api';
import axiosInstance from '../../../../config/axiosInstance';
import useFrameworkStore from '../../../../stores/comptabilite/frameworkStore';

const { TextArea } = Input;
const requestCache = new Map();

const normalizeList = (payload) => {
  const list = payload?.results || payload || [];
  return Array.isArray(list) ? list : [];
};

const relationId = (value) => {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'object') return value.id ?? value.value ?? null;
  return value;
};

const relationIds = (values) => normalizeList(values).map(relationId).filter((value) => value !== null);

const getCountryLabel = (country) => (
  country?.nom || country?.name || country?.libelle || country?.code || `Pays ${country?.id || ''}`.trim()
);

const getEntityLabel = (entity) => (
  entity?.raison_sociale || entity?.name || entity?.nom || `Entité ${entity?.id || ''}`.trim()
);

const getCompanyNames = (framework) => normalizeList(framework?.company)
  .map((company) => (typeof company === 'object' ? getEntityLabel(company) : String(company)))
  .filter(Boolean);

const countFromResponse = (payload) => {
  if (Number.isFinite(Number(payload?.count))) return Number(payload.count);
  return normalizeList(payload).length;
};

const formatDateTime = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString('fr-FR');
};

const apiErrorMessage = (error, fallback) => {
  const data = error?.response?.data;
  if (typeof data?.detail === 'string') return data.detail;
  if (data && typeof data === 'object') {
    return Object.entries(data)
      .map(([field, value]) => `${field} : ${Array.isArray(value) ? value.join(', ') : value}`)
      .join('\n');
  }
  return error?.message || fallback;
};

const cachedRequest = (key, loader) => {
  if (!requestCache.has(key)) {
    requestCache.set(key, Promise.resolve().then(loader).catch((error) => {
      requestCache.delete(key);
      throw error;
    }));
  }
  return requestCache.get(key);
};

const FieldLine = ({ label, required = false, children }) => (
  <div className="flex min-w-0 items-center" style={{ height: 28 }}>
    <label className="w-40 shrink-0 text-xs font-medium text-gray-700">
      {label}{required && <span className="ml-0.5 text-red-500">*</span>}
    </label>
    <div className="ml-2 min-w-0 flex-1">{children}</div>
  </div>
);

const CompactSelect = ({ options, ...props }) => (
  <Select
    {...props}
    options={options}
    showSearch
    allowClear
    optionFilterProp="label"
    popupClassName="framework-select-dropdown"
    className="w-full"
    notFoundContent={<span className="text-xs text-gray-400">Aucun résultat</span>}
  />
);

const TableHeader = ({ children }) => (
  <th className="border border-gray-300 bg-gray-100 px-2 py-1.5 text-left text-xs font-medium text-gray-700">
    {children}
  </th>
);

const TableCell = ({ children }) => (
  <td className="h-8 min-w-0 border border-gray-300 p-0 align-middle">{children}</td>
);

const hydrateForm = (form, framework) => {
  if (!framework) return;
  const companies = relationIds(framework.company);
  form.setFieldsValue({
    code: framework.code || '',
    name: framework.name || '',
    version: framework.version || '',
    country: relationId(framework.country),
    country_group: framework.country_group || '',
    account_code_length: framework.account_code_length ?? 10,
    shared: companies.length === 0,
    company: companies,
    description: framework.description || '',
    active: framework.active !== false,
  });
};

export default function FrameworkForm({ mode = 'create' }) {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const resolvedMode = mode === 'show' ? 'show' : (id ? 'edit' : 'create');
  const isShowMode = resolvedMode === 'show';
  const isExisting = Boolean(id);
  const initialRecord = location.state?.frameworkRecord || location.state?.record || null;
  const initialValuesRef = useRef({});

  const { createFramework, updateFramework, fetchFrameworkById } = useFrameworkStore();

  const [framework, setFramework] = useState(initialRecord);
  const [pageLoading, setPageLoading] = useState(isExisting && !initialRecord);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [countries, setCountries] = useState([]);
  const [entities, setEntities] = useState([]);
  const [activeTab, setActiveTab] = useState('parameters');
  const [actionsOpen, setActionsOpen] = useState(false);
  const [traceabilityOpen, setTraceabilityOpen] = useState(true);
  const [feedback, setFeedback] = useState(null);
  const [stats, setStats] = useState({ groups: null, types: null, accounts: null });

  const watchedCode = Form.useWatch('code', form);
  const watchedName = Form.useWatch('name', form);
  const watchedActive = Form.useWatch('active', form);
  const watchedShared = Form.useWatch('shared', form);

  const countryOptions = useMemo(() => countries.map((country) => ({
    value: country.id,
    label: getCountryLabel(country),
  })), [countries]);

  const entityOptions = useMemo(() => entities.map((entity) => ({
    value: entity.id,
    label: getEntityLabel(entity),
  })), [entities]);

  const rememberInitialValues = useCallback(() => {
    initialValuesRef.current = form.getFieldsValue(true);
    setHasChanges(false);
  }, [form]);

  const loadReferences = useCallback(async () => {
    const [countriesResult, entitiesResult] = await Promise.allSettled([
      cachedRequest('framework-countries', () => axiosInstance.get(ENDPOINTS.PAYS).then((response) => response.data)),
      cachedRequest('framework-entities', () => axiosInstance.get(ENDPOINTS.ENTITES).then((response) => response.data)),
    ]);
    if (countriesResult.status === 'fulfilled') setCountries(normalizeList(countriesResult.value));
    if (entitiesResult.status === 'fulfilled') setEntities(normalizeList(entitiesResult.value));
  }, []);

  const loadStats = useCallback(async () => {
    if (!id) return;
    const [groupsResult, typesResult, accountsResult] = await Promise.allSettled([
      axiosInstance.get(ENDPOINTS.COMPTA.GROUPS, { params: { framework: id, page_size: 1 } }),
      axiosInstance.get(ENDPOINTS.COMPTA.TYPES, { params: { framework: id, page_size: 1 } }),
      axiosInstance.get(ENDPOINTS.COMPTA.ACCOUNTS, { params: { framework: id, page_size: 1 } }),
    ]);
    setStats({
      groups: groupsResult.status === 'fulfilled' ? countFromResponse(groupsResult.value.data) : null,
      types: typesResult.status === 'fulfilled' ? countFromResponse(typesResult.value.data) : null,
      accounts: accountsResult.status === 'fulfilled' ? countFromResponse(accountsResult.value.data) : null,
    });
  }, [id]);

  useEffect(() => {
    let mounted = true;
    loadReferences();

    if (!isExisting) {
      form.setFieldsValue({ active: true, shared: true, account_code_length: 10 });
      rememberInitialValues();
      setPageLoading(false);
      return () => { mounted = false; };
    }

    if (initialRecord) {
      hydrateForm(form, initialRecord);
      rememberInitialValues();
      setPageLoading(false);
    }

    fetchFrameworkById(id)
      .then((record) => {
        if (!mounted || !record) return;
        setFramework(record);
        hydrateForm(form, record);
        rememberInitialValues();
      })
      .catch((error) => {
        if (!mounted) return;
        setFeedback({ type: 'error', message: apiErrorMessage(error, 'Impossible de charger le plan comptable.') });
      })
      .finally(() => {
        if (mounted) setPageLoading(false);
      });

    loadStats();
    return () => { mounted = false; };
  }, [fetchFrameworkById, form, id, initialRecord, isExisting, loadReferences, loadStats, rememberInitialValues]);

  const restoreMemory = useCallback((values) => {
    if (isExisting || !values || typeof values !== 'object') return;
    form.setFieldsValue(values);
    setHasChanges(true);
  }, [form, isExisting]);

  const save = useCallback(async () => {
    setSaving(true);
    setFeedback(null);
    try {
      const values = await form.validateFields();
      const { shared, ...fields } = values;
      const payload = {
        ...fields,
        country: relationId(values.country),
        company: shared ? [] : relationIds(values.company),
        account_code_length: Number(values.account_code_length || 10),
        active: values.active !== false,
      };

      const saved = isExisting
        ? await updateFramework(id, payload)
        : await createFramework(payload);
      const savedRecord = saved || { ...framework, ...payload, id: framework?.id || id };
      setFramework(savedRecord);
      hydrateForm(form, savedRecord);
      rememberInitialValues();
      setFeedback({
        type: 'success',
        message: isExisting ? 'Plan comptable modifié avec succès.' : 'Plan comptable créé avec succès.',
      });
      return savedRecord;
    } catch (error) {
      if (error?.errorFields) {
        setFeedback({ type: 'error', message: 'Complétez les champs obligatoires du plan comptable.' });
      } else {
        setFeedback({ type: 'error', message: apiErrorMessage(error, 'Impossible d’enregistrer le plan comptable.') });
      }
      return false;
    } finally {
      setSaving(false);
    }
  }, [createFramework, form, framework, id, isExisting, rememberInitialValues, updateFramework]);

  const buildReturnState = useCallback((savedRecord) => ({
    restoredFromSmartBack: true,
    frameworkRecord: savedRecord,
    createdRecord: savedRecord,
    updatedRecord: savedRecord,
  }), []);

  const recordLabel = watchedCode || watchedName || (isExisting ? 'Plan comptable' : 'Nouveau plan');
  const companyNames = getCompanyNames(framework);
  const traceabilityLogs = useMemo(() => [
    {
      id: 'creation',
      title: 'Création du plan comptable',
      date: framework?.created_at || framework?.create_date,
      user: framework?.created_by_name || framework?.create_uid_label || framework?.created_by,
    },
    {
      id: 'update',
      title: 'Dernière modification',
      date: framework?.updated_at || framework?.write_date,
      user: framework?.updated_by_name || framework?.write_uid_label || framework?.updated_by,
    },
  ].filter((log) => log.date || log.user), [framework]);

  const traceabilityContent = (
    <div className="p-3">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-medium text-gray-700">Activité liée à ce plan</span>
        <span className="text-[11px] text-gray-500">{traceabilityLogs.length} événement(s)</span>
      </div>
      {traceabilityLogs.length ? traceabilityLogs.map((log) => (
        <div key={log.id} className="mb-2 border border-gray-200 bg-white px-3 py-2 last:mb-0">
          <div className="text-xs font-semibold text-gray-900">{log.title}</div>
          <div className="mt-1 text-[11px] text-gray-600">{[framework?.code, framework?.name].filter(Boolean).join(' - ')}</div>
          <div className="mt-1 text-[11px] text-gray-500">Par {log.user || 'Utilisateur'}</div>
          <div className="text-[11px] text-gray-400">{formatDateTime(log.date)}</div>
        </div>
      )) : (
        <div className="border border-gray-200 bg-white p-4 text-center text-xs text-gray-500">
          Aucune traçabilité disponible.
        </div>
      )}
    </div>
  );

  const actionsMenu = (
    <div className="relative">
      <button
        type="button"
        onClick={() => setActionsOpen((open) => !open)}
        className="flex h-8 items-center gap-1 border border-gray-300 px-3 text-xs text-gray-700 transition-all hover:border-purple-500 hover:bg-purple-50 hover:text-purple-700"
      >
        <FiSettings size={12} /> Actions
      </button>
      {actionsOpen && (
        <div className="absolute right-0 top-full z-50 mt-1 w-52 border border-gray-300 bg-white shadow-lg">
          <button type="button" onClick={() => navigate(`/comptabilite/groups?framework=${id || ''}`)} className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-purple-50"><FiFolder size={12} /> Voir les classes</button>
          <button type="button" onClick={() => navigate(`/comptabilite/types?framework=${id || ''}`)} className="flex w-full items-center gap-2 border-t border-gray-100 px-3 py-2 text-left text-xs hover:bg-purple-50"><FiTag size={12} /> Voir les natures</button>
          <button type="button" onClick={() => navigate(`/comptabilite/accounts?framework=${id || ''}`)} className="flex w-full items-center gap-2 border-t border-gray-100 px-3 py-2 text-left text-xs hover:bg-purple-50"><FiBriefcase size={12} /> Voir les comptes</button>
          {isShowMode && <button type="button" onClick={() => { setTraceabilityOpen((open) => !open); setActionsOpen(false); }} className="flex w-full items-center gap-2 border-t border-gray-100 px-3 py-2 text-left text-xs hover:bg-purple-50"><FiInfo size={12} /> {traceabilityOpen ? 'Masquer la traçabilité' : 'Afficher la traçabilité'}</button>}
        </div>
      )}
    </div>
  );

  if (pageLoading) {
    return <div className="flex h-full items-center justify-center bg-white"><Spin size="large" tip="Chargement du plan comptable..." /></div>;
  }

  return (
    <UnifiedFormPage
      title="Plan comptable"
      recordLabel={recordLabel}
      pageLabel={isShowMode ? 'Détail du plan comptable' : (isExisting ? 'Modification du plan comptable' : 'Création d’un plan comptable')}
      mode={resolvedMode}
      fallbackPath="/comptabilite/frameworks"
      primaryAction={{ label: 'Nouveau', icon: <FiPlus size={12} />, path: '/comptabilite/frameworks/new' }}
      actionsMenu={actionsMenu}
      onSave={save}
      saveLabel={isExisting ? 'Enregistrer les modifications' : 'Enregistrer'}
      saving={saving}
      autoReturnAfterSave={!isExisting}
      buildReturnState={buildReturnState}
      hasUnsavedChanges={hasChanges}
      rememberForm={!isExisting}
      memoryKey="comptabilite:framework:form:v2"
      memoryState={!isExisting ? form.getFieldsValue(true) : undefined}
      onRestoreMemoryState={!isExisting ? restoreMemory : undefined}
      feedback={feedback}
      onDismissFeedback={() => setFeedback(null)}
      messageDuration={15000}
      traceability={{
        open: traceabilityOpen,
        onOpen: () => setTraceabilityOpen(true),
        onClose: () => setTraceabilityOpen(false),
        title: 'Traçabilité',
        content: traceabilityContent,
      }}
    >
      <Form
        form={form}
        layout="vertical"
        requiredMark={false}
        onValuesChange={() => {
          setHasChanges(true);
          setFeedback(null);
        }}
        className="framework-form"
      >
        <style>{`
          .framework-form .ant-form-item { margin-bottom: 0; }
          .framework-form .ant-input,
          .framework-form .ant-select-selector {
            min-height: 26px !important;
            border-radius: 0 !important;
            font-size: 12px !important;
            box-shadow: none !important;
          }
          .framework-form .ant-input { height: 26px; padding: 2px 8px; }
          .framework-form .ant-select-selector { padding: 0 8px !important; }
          .framework-form .ant-select-selection-item,
          .framework-form .ant-select-selection-placeholder { line-height: 24px !important; font-size: 12px !important; }
          .framework-form .ant-input:hover,
          .framework-form .ant-select:hover .ant-select-selector { border-color: #c084fc !important; }
          .framework-form .ant-input:focus,
          .framework-form .ant-select-focused .ant-select-selector {
            border-color: #9333ea !important;
            box-shadow: 0 0 0 1px #9333ea !important;
          }
          .framework-form-table .ant-input,
          .framework-form-table .ant-select-selector,
          .framework-form-table .ant-input:hover,
          .framework-form-table .ant-input:focus,
          .framework-form-table .ant-select:hover .ant-select-selector,
          .framework-form-table .ant-select-focused .ant-select-selector {
            height: 30px !important;
            border: 0 !important;
            border-radius: 0 !important;
            background: transparent !important;
            box-shadow: none !important;
          }
          .framework-form-table .ant-select { display: block; width: 100%; }
          .framework-form-table .ant-select-selection-item,
          .framework-form-table .ant-select-selection-placeholder { line-height: 28px !important; }
          .framework-select-dropdown { border-radius: 0 !important; padding: 0 !important; }
          .framework-select-dropdown .ant-select-item { min-height: 27px; border-radius: 0; padding: 4px 8px; font-size: 12px; }
          .framework-select-dropdown .ant-select-item-option-active { background: #faf5ff !important; }
          .framework-select-dropdown .ant-select-item-option-selected { background: #f3e8ff !important; color: #7e22ce; }
          .framework-form textarea.ant-input { min-height: 150px !important; height: 150px !important; resize: vertical; }
        `}</style>

        <div className="border-b border-gray-300 px-4 py-3">
          <div className="grid grid-cols-2 gap-x-8 gap-y-2">
            <FieldLine label="Code" required>
              <Form.Item name="code" rules={[{ required: true, message: 'Code obligatoire' }, { max: 64, message: 'Maximum 64 caractères' }]}>
                <Input placeholder="SYSCOHADA" className="font-mono" />
              </Form.Item>
            </FieldLine>
            <FieldLine label="Nom complet" required>
              <Form.Item name="name" rules={[{ required: true, message: 'Nom obligatoire' }, { max: 255, message: 'Maximum 255 caractères' }]}>
                <Input placeholder="SYSCOHADA révisé" />
              </Form.Item>
            </FieldLine>
            <FieldLine label="Version">
              <Form.Item name="version"><Input placeholder="2018" /></Form.Item>
            </FieldLine>
            <FieldLine label="Pays principal">
              <Form.Item name="country"><CompactSelect options={countryOptions} placeholder="Sélectionner un pays" /></Form.Item>
            </FieldLine>
          </div>
        </div>

        <div className="border-b border-gray-300 px-4">
          <div className="flex">
            {[
              ['parameters', 'Paramètres'],
              ['scope', 'Portée'],
              ['notes', 'Notes'],
              ...(isExisting ? [['statistics', 'Statistiques']] : []),
            ].map(([key, label]) => (
              <button key={key} type="button" onClick={() => setActiveTab(key)} className={`border-b-2 px-4 py-2 text-xs font-medium transition-all ${activeTab === key ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-500 hover:text-purple-600'}`}>
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-4">
          {activeTab === 'parameters' && (
            <div className="overflow-x-auto">
              <table className="framework-form-table w-full table-fixed border-collapse">
                <thead><tr><TableHeader>Groupe de pays</TableHeader><TableHeader>Longueur des comptes</TableHeader><TableHeader>Plan actif</TableHeader><TableHeader>Type de portée</TableHeader></tr></thead>
                <tbody><tr>
                  <TableCell><Form.Item name="country_group"><Input placeholder="UEMOA" /></Form.Item></TableCell>
                  <TableCell><Form.Item name="account_code_length"><Input type="number" min={1} max={20} placeholder="10" /></Form.Item></TableCell>
                  <TableCell><div className="flex h-8 items-center gap-2 px-2 text-xs"><Form.Item name="active" valuePropName="checked"><Switch size="small" /></Form.Item><span>{watchedActive !== false ? 'Oui' : 'Non'}</span></div></TableCell>
                  <TableCell><div className="flex h-8 items-center gap-2 px-2 text-xs"><Form.Item name="shared" valuePropName="checked"><Switch size="small" onChange={(checked) => { if (checked) form.setFieldValue('company', []); }} /></Form.Item><span>{watchedShared !== false ? 'Partagé' : 'Spécifique'}</span></div></TableCell>
                </tr></tbody>
              </table>
            </div>
          )}

          {activeTab === 'scope' && (
            <div className="overflow-x-auto">
              <table className="framework-form-table w-full table-fixed border-collapse">
                <thead><tr><TableHeader>Plan partagé</TableHeader><TableHeader>Sociétés concernées</TableHeader></tr></thead>
                <tbody><tr>
                  <TableCell><div className="flex h-8 items-center gap-2 px-2 text-xs"><Form.Item name="shared" valuePropName="checked"><Switch size="small" onChange={(checked) => { if (checked) form.setFieldValue('company', []); }} /></Form.Item><span>{watchedShared !== false ? 'Toutes les sociétés' : 'Sociétés spécifiques'}</span></div></TableCell>
                  <TableCell><Form.Item name="company" rules={[{ validator: (_, value) => watchedShared !== false || (value?.length ? Promise.resolve() : Promise.reject(new Error('Sélectionnez au moins une société'))) }]}><CompactSelect mode="multiple" disabled={watchedShared !== false} options={entityOptions} placeholder={watchedShared !== false ? 'Toutes les sociétés' : 'Sélectionner les sociétés'} /></Form.Item></TableCell>
                </tr></tbody>
              </table>
              {isShowMode && companyNames.length > 0 && <div className="mt-2 text-xs text-gray-500">{companyNames.join(', ')}</div>}
            </div>
          )}

          {activeTab === 'notes' && (
            <div className="border border-gray-300">
              <div className="border-b border-gray-300 bg-gray-100 px-2 py-1.5 text-xs font-medium text-gray-700">Description</div>
              <Form.Item name="description"><TextArea placeholder="Description du plan comptable..." /></Form.Item>
            </div>
          )}

          {activeTab === 'statistics' && (
            <table className="w-full table-fixed border-collapse">
              <thead><tr><TableHeader>Classes de comptes</TableHeader><TableHeader>Natures de comptes</TableHeader><TableHeader>Comptes comptables</TableHeader></tr></thead>
              <tbody><tr>
                <TableCell><button type="button" onClick={() => navigate(`/comptabilite/groups?framework=${id}`)} className="flex h-10 w-full items-center gap-2 px-3 text-left text-xs hover:bg-purple-50"><FiFolder className="text-purple-600" /> <strong>{stats.groups ?? '-'}</strong></button></TableCell>
                <TableCell><button type="button" onClick={() => navigate(`/comptabilite/types?framework=${id}`)} className="flex h-10 w-full items-center gap-2 px-3 text-left text-xs hover:bg-purple-50"><FiTag className="text-purple-600" /> <strong>{stats.types ?? '-'}</strong></button></TableCell>
                <TableCell><button type="button" onClick={() => navigate(`/comptabilite/accounts?framework=${id}`)} className="flex h-10 w-full items-center gap-2 px-3 text-left text-xs hover:bg-purple-50"><FiBriefcase className="text-purple-600" /> <strong>{stats.accounts ?? '-'}</strong></button></TableCell>
              </tr></tbody>
            </table>
          )}
        </div>
      </Form>
    </UnifiedFormPage>
  );
}

export { FrameworkForm };
