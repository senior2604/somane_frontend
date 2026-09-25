// src/features/comptabilite/pages/types/TypeForm.jsx
import { DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { Form, Input, Modal, Spin, Switch } from 'antd';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FiEye, FiInfo, FiPlus, FiSettings } from 'react-icons/fi';
import { useLocation, useNavigate, useParams } from 'react-router-dom';

import UnifiedFormPage from '../../../../components/UnifiedFormPage';
import { ENDPOINTS } from '../../../../config/api';
import axiosInstance from '../../../../config/axiosInstance';
import useFrameworkStore from '../../../../stores/comptabilite/frameworkStore';
import useTypeStore from '../../../../stores/comptabilite/typeStore';

const { TextArea } = Input;
const { confirm } = Modal;
const FRAMEWORK_SESSION_KEY = 'type_list_selected_framework';
const FORM_MEMORY_KEY = 'comptabilite:type:create:v2';
const frameworkDataCache = new Map();

const normalizeApiList = (payload) => {
  const list = payload?.results || payload || [];
  return Array.isArray(list) ? list : [];
};

const relationId = (value) => {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'object') return value.id ?? value.value ?? null;
  return value;
};

const labelOf = (record, fallback = '-') => {
  if (record === null || record === undefined || record === '') return fallback;
  if (typeof record === 'string' || typeof record === 'number') return String(record);
  return [record.code, record.name, record.label, record.display_name].filter(Boolean).join(' - ') || fallback;
};

const errorMessage = (error, fallback) => {
  const payload = error?.response?.data;
  if (!payload || typeof payload !== 'object') return error?.message || fallback;
  return Object.entries(payload)
    .map(([field, errors]) => `${field} : ${Array.isArray(errors) ? errors.join(', ') : String(errors)}`)
    .join('\n');
};

const formatDateTime = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString('fr-FR');
};

const FieldLine = ({ label, required = false, children }) => (
  <div className="grid min-h-[32px] grid-cols-[160px_minmax(0,1fr)] items-center gap-2">
    <label className="text-xs font-medium text-gray-700">
      {label}{required && <span className="text-red-500"> *</span>}
    </label>
    <div className="min-w-0">{children}</div>
  </div>
);

const TableCell = ({ children }) => (
  <div className="min-w-0 border-r border-gray-200 p-1 last:border-r-0">{children}</div>
);

const PieceDropdown = ({
  value,
  onChange,
  afterChange,
  options = [],
  placeholder = '',
  disabled = false,
  allowClear = false,
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [highlighted, setHighlighted] = useState(0);
  const [dropdownStyle, setDropdownStyle] = useState({});
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  const selected = useMemo(
    () => options.find((option) => String(option.value) === String(value)),
    [options, value],
  );
  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('fr');
    return options.filter((option) => !term || String(option.label || '').toLocaleLowerCase('fr').includes(term));
  }, [options, search]);

  useEffect(() => { setSearch(selected?.label || ''); }, [selected]);

  const positionDropdown = useCallback(() => {
    if (!inputRef.current) return;
    const rect = inputRef.current.getBoundingClientRect();
    setDropdownStyle({
      position: 'fixed',
      left: rect.left,
      top: rect.bottom,
      width: rect.width,
      maxHeight: 220,
      overflowY: 'auto',
      zIndex: 10000,
    });
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    positionDropdown();
    const reposition = () => positionDropdown();
    window.addEventListener('resize', reposition);
    window.addEventListener('scroll', reposition, true);
    return () => {
      window.removeEventListener('resize', reposition);
      window.removeEventListener('scroll', reposition, true);
    };
  }, [open, positionDropdown]);

  useEffect(() => {
    const closeOutside = (event) => {
      if (!inputRef.current?.contains(event.target) && !dropdownRef.current?.contains(event.target)) {
        setOpen(false);
        setSearch(selected?.label || '');
      }
    };
    document.addEventListener('mousedown', closeOutside);
    return () => document.removeEventListener('mousedown', closeOutside);
  }, [selected]);

  const choose = (option) => {
    onChange?.(option.value);
    afterChange?.(option.value, option);
    setSearch(option.label || '');
    setOpen(false);
  };

  const clear = (event) => {
    event.preventDefault();
    event.stopPropagation();
    onChange?.(null);
    afterChange?.(null, null);
    setSearch('');
    setOpen(false);
  };

  return (
    <>
      <div ref={inputRef} className={`relative flex h-[30px] items-center border border-gray-300 ${disabled ? 'bg-gray-100' : 'bg-white hover:border-purple-400'}`}>
        <input
          type="text"
          value={search}
          disabled={disabled}
          placeholder={placeholder}
          autoComplete="off"
          onFocus={() => { if (!disabled) { setOpen(true); positionDropdown(); } }}
          onChange={(event) => {
            setSearch(event.target.value);
            setOpen(true);
            setHighlighted(0);
            if (value) onChange?.(null);
          }}
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown') {
              event.preventDefault();
              setOpen(true);
              setHighlighted((index) => Math.min(index + 1, filtered.length - 1));
            } else if (event.key === 'ArrowUp') {
              event.preventDefault();
              setHighlighted((index) => Math.max(index - 1, 0));
            } else if (event.key === 'Enter' && open && filtered[highlighted]) {
              event.preventDefault();
              choose(filtered[highlighted]);
            } else if (event.key === 'Escape') {
              setOpen(false);
              setSearch(selected?.label || '');
            }
          }}
          className="h-full min-w-0 flex-1 border-0 bg-transparent px-2 text-xs text-gray-900 outline-none disabled:cursor-not-allowed disabled:text-gray-500"
        />
        {allowClear && value && !disabled && <button type="button" onClick={clear} className="px-2 text-xs text-gray-400 hover:text-purple-700">×</button>}
      </div>
      {open && !disabled && (
        <div ref={dropdownRef} style={dropdownStyle} className="border border-gray-300 bg-white shadow-xl">
          {filtered.length ? filtered.map((option, index) => (
            <button
              key={option.value}
              type="button"
              onMouseEnter={() => setHighlighted(index)}
              onClick={() => choose(option)}
              className={`block w-full truncate px-3 py-2 text-left text-xs transition-colors ${index === highlighted ? 'bg-purple-100 text-purple-800' : 'hover:bg-purple-50'}`}
              title={option.label}
            >
              {option.label}
            </button>
          )) : <div className="px-3 py-3 text-xs text-gray-500">Aucun résultat</div>}
        </div>
      )}
    </>
  );
};

export default function TypeForm({ mode = 'create' }) {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const { createType, fetchTypeById, updateType, deleteType } = useTypeStore();
  const { frameworks = [], fetchFrameworks } = useFrameworkStore();

  const isCreate = mode === 'create';
  const isEdit = mode === 'edit';
  const isShow = mode === 'show';
  const isExisting = !isCreate;
  const cachedType = useMemo(() => {
    const candidate = location.state?.typeRecord;
    return candidate && String(candidate.id) === String(id) ? candidate : null;
  }, [id, location.state]);

  const [typeData, setTypeData] = useState(cachedType);
  const [selectedFramework, setSelectedFramework] = useState(() => relationId(cachedType?.framework));
  const [groups, setGroups] = useState([]);
  const [parentTypes, setParentTypes] = useState([]);
  const [activeTab, setActiveTab] = useState('information');
  const [initializing, setInitializing] = useState(isExisting && !cachedType);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [traceabilityOpen, setTraceabilityOpen] = useState(isExisting);

  const watchedCode = Form.useWatch('code', form);
  const watchedName = Form.useWatch('name', form);
  const recordLabel = useMemo(
    () => [watchedCode || typeData?.code, watchedName || typeData?.name].filter(Boolean).join(' - ') || 'Nouvelle nature',
    [typeData, watchedCode, watchedName],
  );

  const loadFrameworkData = useCallback(async (frameworkId, force = false) => {
    if (!frameworkId) {
      setGroups([]);
      setParentTypes([]);
      return;
    }
    const cacheKey = String(frameworkId);
    if (!force && frameworkDataCache.has(cacheKey)) {
      const cached = frameworkDataCache.get(cacheKey);
      setGroups(cached.groups);
      setParentTypes(cached.types);
      return;
    }

    const [groupsResponse, typesResponse] = await Promise.all([
      axiosInstance.get(ENDPOINTS.COMPTA.GROUPS, { params: { framework: frameworkId, page_size: 500 } }),
      axiosInstance.get(ENDPOINTS.COMPTA.TYPES, { params: { framework: frameworkId, page_size: 500 } }),
    ]);
    const result = {
      groups: normalizeApiList(groupsResponse.data),
      types: normalizeApiList(typesResponse.data),
    };
    frameworkDataCache.set(cacheKey, result);
    setGroups(result.groups);
    setParentTypes(result.types);
  }, []);

  const hydrate = useCallback((record) => {
    if (!record) return null;
    const frameworkId = relationId(record.framework) ?? record.framework_id;
    setTypeData(record);
    setSelectedFramework(frameworkId);
    if (frameworkId) sessionStorage.setItem(FRAMEWORK_SESSION_KEY, String(frameworkId));
    form.setFieldsValue({
      framework: frameworkId,
      code: record.code || '',
      name: record.name || '',
      internal_group: relationId(record.internal_group),
      parent: relationId(record.parent),
      default_balance_type: record.default_balance_type || 'debit',
      default_debit: record.default_debit ?? record.default_balance_type !== 'credit',
      default_credit: record.default_credit ?? record.default_balance_type === 'credit',
      allow_reconciliation: record.allow_reconciliation ?? false,
      include_in_opening_balance: record.include_in_opening_balance ?? true,
      closing_behavior: record.closing_behavior || 'none',
      active: record.active !== false,
      note: record.note || '',
    });
    setHasChanges(false);
    return frameworkId;
  }, [form]);

  useEffect(() => {
    let active = true;
    const initialize = async () => {
      if (isCreate) {
        form.setFieldsValue({
          active: true,
          include_in_opening_balance: true,
          closing_behavior: 'none',
          default_balance_type: 'debit',
          allow_reconciliation: false,
          default_debit: true,
          default_credit: false,
          parent: relationId(location.state?.parentId),
        });
      } else if (cachedType) {
        hydrate(cachedType);
      } else {
        setInitializing(true);
      }

      try {
        const frameworksPromise = frameworks.length ? Promise.resolve() : fetchFrameworks();
        const recordPromise = isExisting ? fetchTypeById(id) : Promise.resolve(null);
        const [, freshRecord] = await Promise.all([frameworksPromise, recordPromise]);
        if (!active) return;

        let frameworkId;
        if (freshRecord) frameworkId = hydrate(freshRecord);
        else {
          const stateFramework = relationId(location.state?.frameworkId);
          const storedFramework = sessionStorage.getItem(FRAMEWORK_SESSION_KEY);
          frameworkId = stateFramework || (storedFramework ? Number(storedFramework) : null);
          if (frameworkId) {
            setSelectedFramework(frameworkId);
            form.setFieldValue('framework', frameworkId);
          }
        }
        if (frameworkId) await loadFrameworkData(frameworkId);
      } catch (error) {
        if (!active) return;
        setFeedback({
          type: cachedType ? 'warning' : 'error',
          message: cachedType
            ? 'Les données de la liste sont affichées, mais leur synchronisation a échoué.'
            : errorMessage(error, 'Impossible de charger la nature de compte.'),
        });
      } finally {
        if (active) setInitializing(false);
      }
    };
    initialize();
    return () => { active = false; };
    // L'initialisation ne doit pas repartir lorsque les stores se mettent à jour.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, mode]);

  const frameworkOptions = useMemo(() => frameworks.map((framework) => ({
    value: framework.id,
    label: [framework.code, framework.name].filter(Boolean).join(' - '),
  })), [frameworks]);
  const groupOptions = useMemo(() => groups.map((group) => ({
    value: group.id,
    label: [group.code, group.name].filter(Boolean).join(' - '),
  })), [groups]);
  const parentOptions = useMemo(() => parentTypes
    .filter((type) => !isExisting || String(type.id) !== String(id))
    .map((type) => ({ value: type.id, label: [type.code, type.name].filter(Boolean).join(' - ') })), [id, isExisting, parentTypes]);

  const changeFramework = useCallback(async (frameworkId) => {
    setSelectedFramework(frameworkId);
    form.setFieldsValue({ internal_group: null, parent: null });
    setFeedback(null);
    if (!frameworkId) {
      setGroups([]);
      setParentTypes([]);
      return;
    }
    sessionStorage.setItem(FRAMEWORK_SESSION_KEY, String(frameworkId));
    try {
      await loadFrameworkData(frameworkId);
    } catch (error) {
      setFeedback({ type: 'error', message: errorMessage(error, 'Impossible de charger les groupes et les natures du plan.') });
    }
  }, [form, loadFrameworkData]);

  const save = useCallback(async () => {
    setSaving(true);
    setFeedback(null);
    try {
      const values = await form.validateFields();
      const payload = {
        ...values,
        framework: relationId(values.framework),
        internal_group: relationId(values.internal_group),
        parent: relationId(values.parent),
      };
      const response = isCreate ? await createType(payload) : await updateType(id, payload);
      const result = { ...typeData, ...payload, ...(response || {}), ...(id ? { id } : {}) };
      setTypeData(result);
      setHasChanges(false);
      setFeedback({ type: 'success', message: isCreate ? 'Nature créée avec succès.' : 'Nature modifiée avec succès.' });
      return result;
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error?.errorFields
          ? 'Complétez les champs obligatoires avant l’enregistrement.'
          : errorMessage(error, `Erreur lors de ${isCreate ? 'la création' : 'la modification'} de la nature.`),
      });
      return false;
    } finally {
      setSaving(false);
    }
  }, [createType, form, id, isCreate, typeData, updateType]);

  const remove = useCallback(() => {
    confirm({
      title: 'Supprimer cette nature ?',
      content: `La nature ${recordLabel} sera supprimée définitivement.`,
      okText: 'Supprimer',
      okType: 'danger',
      cancelText: 'Annuler',
      onOk: async () => {
        try {
          await deleteType(id);
          navigate('/comptabilite/types', { state: { refreshTypes: true, restoredFromSmartBack: true } });
        } catch (error) {
          setFeedback({ type: 'error', message: errorMessage(error, 'Erreur lors de la suppression.') });
        }
      },
    });
  }, [deleteType, id, navigate, recordLabel]);

  const traceabilityLogs = useMemo(() => [
    {
      id: 'creation', title: 'Création de la nature',
      date: typeData?.created_at || typeData?.create_date,
      user: typeData?.created_by_name || typeData?.create_uid_label || typeData?.created_by,
    },
    {
      id: 'update', title: 'Dernière modification',
      date: typeData?.updated_at || typeData?.write_date,
      user: typeData?.updated_by_name || typeData?.write_uid_label || typeData?.updated_by,
    },
  ].filter((item) => item.date || item.user), [typeData]);

  const traceabilityContent = (
    <div className="p-3">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-medium text-gray-700">Activité liée à cette nature</span>
        <span className="text-[11px] text-gray-500">{traceabilityLogs.length} événement(s)</span>
      </div>
      {traceabilityLogs.length ? traceabilityLogs.map((log) => (
        <div key={log.id} className="mb-2 border border-gray-200 bg-white px-3 py-2 last:mb-0">
          <div className="text-xs font-semibold text-gray-900">{log.title}</div>
          <div className="mt-1 text-[11px] text-gray-600">{recordLabel}</div>
          <div className="mt-1 text-[11px] text-gray-500">Par {labelOf(log.user, 'Utilisateur')}</div>
          <div className="text-[11px] text-gray-400">{formatDateTime(log.date)}</div>
        </div>
      )) : <div className="border border-gray-200 bg-white p-5 text-center text-xs text-gray-500">Aucune traçabilité disponible pour cette nature.</div>}
    </div>
  );

  const actionsMenu = (
    <div className="relative">
      <button type="button" onClick={() => setActionsOpen((open) => !open)} className="flex h-8 items-center gap-1 border border-gray-300 px-3 text-xs text-gray-700 transition-all hover:border-purple-500 hover:bg-purple-50 hover:text-purple-700">
        <FiSettings size={12} /> Actions
      </button>
      {actionsOpen && (
        <div className="absolute right-0 top-full z-50 mt-1 w-52 border border-gray-300 bg-white shadow-lg">
          {isShow && <button type="button" onClick={() => navigate(`/comptabilite/types/${id}/edit`, { state: { typeRecord: typeData, frameworkId: selectedFramework, returnTo: location.pathname } })} className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-purple-50"><EditOutlined /> Modifier</button>}
          {isEdit && <button type="button" onClick={() => navigate(`/comptabilite/types/${id}`, { state: { typeRecord: typeData, frameworkId: selectedFramework, returnTo: location.pathname } })} className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-purple-50"><FiEye size={12} /> Voir le détail</button>}
          <button type="button" onClick={() => navigate('/comptabilite/types/new', { state: { frameworkId: selectedFramework, parentId: isExisting ? id : null, returnTo: location.pathname } })} className="flex w-full items-center gap-2 border-t border-gray-100 px-3 py-2 text-left text-xs hover:bg-purple-50"><FiPlus size={12} /> Nouvelle nature</button>
          {isExisting && <button type="button" onClick={() => { setTraceabilityOpen((open) => !open); setActionsOpen(false); }} className="flex w-full items-center gap-2 border-t border-gray-100 px-3 py-2 text-left text-xs hover:bg-purple-50"><FiInfo size={12} /> {traceabilityOpen ? 'Masquer' : 'Afficher'} la traçabilité</button>}
          {isShow && <button type="button" onClick={remove} className="flex w-full items-center gap-2 border-t border-gray-100 px-3 py-2 text-left text-xs text-red-600 hover:bg-red-50"><DeleteOutlined /> Supprimer</button>}
        </div>
      )}
    </div>
  );

  const restoreMemory = useCallback((values) => {
    if (!isCreate || !values) return;
    form.setFieldsValue(values);
    const frameworkId = relationId(values.framework);
    if (frameworkId) {
      setSelectedFramework(frameworkId);
      loadFrameworkData(frameworkId).catch(() => {});
    }
  }, [form, isCreate, loadFrameworkData]);

  if (initializing && !typeData) {
    return <div className="flex h-full items-center justify-center bg-white"><Spin size="large" tip="Chargement de la nature..." /></div>;
  }

  const listPath = selectedFramework ? `/comptabilite/types?framework=${selectedFramework}` : '/comptabilite/types';
  const selectedGroup = groups.find((group) => String(group.id) === String(relationId(typeData?.internal_group)));
  const selectedParent = parentTypes.find((type) => String(type.id) === String(relationId(typeData?.parent)));

  return (
    <UnifiedFormPage
      title="Natures de comptes"
      recordLabel={recordLabel}
      pageLabel={isCreate ? 'Création d’une nature de compte' : isEdit ? 'Modification d’une nature de compte' : 'Détail d’une nature de compte'}
      mode={mode}
      fallbackPath={listPath}
      primaryAction={{ label: 'Nouveau', icon: <FiPlus size={12} />, path: '/comptabilite/types/new', state: { frameworkId: selectedFramework } }}
      headerActions={isShow ? [{ id: 'edit', label: 'Modifier', icon: <EditOutlined />, path: `/comptabilite/types/${id}/edit`, state: { typeRecord: typeData, frameworkId: selectedFramework } }] : []}
      actionsMenu={actionsMenu}
      onSave={isShow ? undefined : save}
      saveLabel={isCreate ? 'Enregistrer' : 'Enregistrer les modifications'}
      saving={saving}
      autoReturnAfterSave={isCreate}
      hasUnsavedChanges={hasChanges}
      rememberForm={isCreate}
      memoryKey={FORM_MEMORY_KEY}
      memoryState={isCreate ? form.getFieldsValue(true) : undefined}
      onRestoreMemoryState={isCreate ? restoreMemory : undefined}
      feedback={feedback}
      onDismissFeedback={() => setFeedback(null)}
      messageDuration={15000}
      buildReturnState={(saved) => ({ restoredFromSmartBack: true, refreshTypes: true, frameworkId: relationId(saved?.framework) || selectedFramework, typeRecord: saved })}
      traceability={isExisting && typeData ? { open: traceabilityOpen, onOpen: () => setTraceabilityOpen(true), onClose: () => setTraceabilityOpen(false), title: 'Traçabilité', content: traceabilityContent } : undefined}
      noContext={isExisting && !typeData ? <div className="text-center text-sm text-gray-500">Cette nature est introuvable.</div> : undefined}
    >
      {(!isExisting || typeData) && (
        <Form
          form={form}
          layout="vertical"
          requiredMark={false}
          disabled={isShow}
          className="type-form"
          onValuesChange={() => { if (!isShow) { setHasChanges(true); setFeedback(null); } }}
        >
          <style>{`
            .type-form .ant-form-item { margin-bottom: 0; }
            .type-form .ant-form-item-explain-error { font-size: 10px; line-height: 12px; }
            .type-form .ant-input { height: 30px; border-radius: 0 !important; padding: 3px 8px; font-size: 12px; box-shadow: none !important; }
            .type-form textarea.ant-input { height: auto; min-height: 90px; resize: vertical; }
            .type-form .ant-input:hover { border-color: #c084fc; }
            .type-form .ant-input:focus { border-color: #9333ea; box-shadow: 0 0 0 1px #9333ea !important; }
            .type-form .ant-switch-checked { background: #9333ea !important; }
            .type-form .ant-input-disabled { color: #4b5563; background: #f9fafb; }
          `}</style>

          <div className="flex border-b border-gray-300 px-4">
            {[
              ['information', 'Informations'],
              ['settings', 'Paramètres'],
              ['notes', 'Notes'],
            ].map(([key, label]) => (
              <button key={key} type="button" onClick={() => setActiveTab(key)} className={`border-b-2 px-4 py-2 text-xs font-medium transition-colors ${activeTab === key ? 'border-purple-600 text-purple-700' : 'border-transparent text-gray-500 hover:text-purple-700'}`}>
                {label}
              </button>
            ))}
          </div>

          <div className="p-4">
            {activeTab === 'information' && (
              <div className="grid grid-cols-1 gap-x-8 gap-y-2 lg:grid-cols-2">
                <FieldLine label="Plan comptable" required>
                  <Form.Item name="framework" rules={[{ required: true, message: 'Plan comptable obligatoire' }]}>
                    <PieceDropdown disabled={isShow || isEdit} options={frameworkOptions} placeholder="Sélectionner un plan comptable" afterChange={changeFramework} />
                  </Form.Item>
                </FieldLine>
                <FieldLine label="Code" required>
                  <Form.Item name="code" rules={[{ required: true, message: 'Code obligatoire' }, { max: 32, message: 'Maximum 32 caractères' }]}><Input placeholder="Ex. IMMO" /></Form.Item>
                </FieldLine>
                <FieldLine label="Nom" required>
                  <Form.Item name="name" rules={[{ required: true, message: 'Nom obligatoire' }, { max: 255, message: 'Maximum 255 caractères' }]}><Input placeholder="Ex. Immobilisations" /></Form.Item>
                </FieldLine>
                <FieldLine label="Groupe / Classe">
                  <Form.Item name="internal_group"><PieceDropdown disabled={isShow || !selectedFramework} allowClear options={groupOptions} placeholder="Sélectionner une classe" /></Form.Item>
                </FieldLine>
                <FieldLine label="Nature parente">
                  <Form.Item name="parent"><PieceDropdown disabled={isShow || !selectedFramework} allowClear options={parentOptions} placeholder="Aucune nature parente" /></Form.Item>
                </FieldLine>
                {isShow && (
                  <>
                    <FieldLine label="Classe sélectionnée"><Input value={labelOf(selectedGroup)} disabled /></FieldLine>
                    <FieldLine label="Nature parente"><Input value={labelOf(selectedParent, 'Racine')} disabled /></FieldLine>
                  </>
                )}
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="space-y-4">
                <div className="border border-gray-300">
                  <div className="grid grid-cols-4 border-b border-gray-300 bg-gray-100 text-xs font-semibold text-gray-700">
                    <div className="border-r border-gray-300 px-2 py-2">Solde par défaut</div><div className="border-r border-gray-300 px-2 py-2">Débiteur</div><div className="border-r border-gray-300 px-2 py-2">Créditeur</div><div className="px-2 py-2">Statut</div>
                  </div>
                  <div className="grid grid-cols-4">
                    <TableCell><Form.Item name="default_balance_type" rules={[{ required: true }]}><PieceDropdown disabled={isShow} options={[{ label: 'Débit', value: 'debit' }, { label: 'Crédit', value: 'credit' }]} afterChange={(value) => form.setFieldsValue(value === 'credit' ? { default_debit: false, default_credit: true } : { default_debit: true, default_credit: false })} /></Form.Item></TableCell>
                    <TableCell><div className="flex h-[30px] items-center gap-2 px-1 text-xs"><Form.Item name="default_debit" valuePropName="checked"><Switch checkedChildren="Oui" unCheckedChildren="Non" onChange={(checked) => { if (checked) form.setFieldsValue({ default_balance_type: 'debit', default_credit: false }); }} /></Form.Item></div></TableCell>
                    <TableCell><div className="flex h-[30px] items-center gap-2 px-1 text-xs"><Form.Item name="default_credit" valuePropName="checked"><Switch checkedChildren="Oui" unCheckedChildren="Non" onChange={(checked) => { if (checked) form.setFieldsValue({ default_balance_type: 'credit', default_debit: false }); }} /></Form.Item></div></TableCell>
                    <TableCell><div className="flex h-[30px] items-center px-1"><Form.Item name="active" valuePropName="checked"><Switch checkedChildren="Actif" unCheckedChildren="Inactif" /></Form.Item></div></TableCell>
                  </div>
                </div>

                <div className="border border-gray-300">
                  <div className="grid grid-cols-3 border-b border-gray-300 bg-gray-100 text-xs font-semibold text-gray-700">
                    <div className="border-r border-gray-300 px-2 py-2">Lettrage autorisé</div><div className="border-r border-gray-300 px-2 py-2">Bilan d’ouverture</div><div className="px-2 py-2">Comportement à la clôture</div>
                  </div>
                  <div className="grid grid-cols-3">
                    <TableCell><div className="flex h-[30px] items-center px-1"><Form.Item name="allow_reconciliation" valuePropName="checked"><Switch checkedChildren="Oui" unCheckedChildren="Non" /></Form.Item></div></TableCell>
                    <TableCell><div className="flex h-[30px] items-center px-1"><Form.Item name="include_in_opening_balance" valuePropName="checked"><Switch checkedChildren="Oui" unCheckedChildren="Non" /></Form.Item></div></TableCell>
                    <TableCell><Form.Item name="closing_behavior"><PieceDropdown disabled={isShow} options={[{ label: 'Aucun', value: 'none' }, { label: 'Report à nouveau', value: 'carry_forward' }]} /></Form.Item></TableCell>
                  </div>
                </div>

                {isShow && (
                  <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
                    <FieldLine label="Créé le"><Input value={formatDateTime(typeData?.created_at || typeData?.create_date)} disabled /></FieldLine>
                    <FieldLine label="Modifié le"><Input value={formatDateTime(typeData?.updated_at || typeData?.write_date)} disabled /></FieldLine>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'notes' && (
              <div className="border border-gray-300">
                <div className="border-b border-gray-300 bg-gray-100 px-3 py-2 text-xs font-semibold text-gray-700">Notes</div>
                <div className="p-1"><Form.Item name="note"><TextArea rows={5} maxLength={1000} showCount={!isShow} placeholder="Description fonctionnelle, cas d’usage..." /></Form.Item></div>
              </div>
            )}
          </div>
        </Form>
      )}
    </UnifiedFormPage>
  );
}

export { TypeForm };
