// src/features/comptabilite/pages/groups/GroupEdit.jsx
import { Form, Spin } from 'antd';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { FiEye, FiInfo, FiPlus, FiSettings } from 'react-icons/fi';
import { useLocation, useNavigate, useParams } from 'react-router-dom';

import UnifiedFormPage from '../../../../components/UnifiedFormPage';
import useFrameworkStore from '../../../../stores/comptabilite/frameworkStore';
import useGroupStore from '../../../../stores/comptabilite/groupStore';
import GroupFormFields from './components/GroupFormFields';

const FRAMEWORK_SESSION_KEY = 'group_list_selected_framework';

const relationId = (value) => {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'object') return value.id ?? value.value ?? null;
  return value;
};

const normalizeIds = (value) => (
  Array.isArray(value)
    ? value.map(relationId).filter((item) => item !== null && item !== undefined && item !== '')
    : []
);

const getErrorMessage = (error, fallback) => {
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

export default function GroupEdit() {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();

  const { updateGroup, fetchGroupById, fetchGroups, groups = [] } = useGroupStore();
  const { frameworks = [], fetchFrameworks } = useFrameworkStore();

  const cachedGroup = useMemo(() => {
    const candidate = location.state?.groupRecord;
    return candidate && String(candidate.id) === String(id) ? candidate : null;
  }, [id, location.state]);

  const [groupData, setGroupData] = useState(cachedGroup);
  const [selectedFramework, setSelectedFramework] = useState(() => relationId(cachedGroup?.framework));
  const [initializing, setInitializing] = useState(!cachedGroup);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [traceabilityOpen, setTraceabilityOpen] = useState(true);

  const watchedCode = Form.useWatch('code', form);
  const watchedName = Form.useWatch('name', form);
  const recordLabel = useMemo(
    () => [watchedCode || groupData?.code, watchedName || groupData?.name].filter(Boolean).join(' - ') || 'Classe comptable',
    [groupData, watchedCode, watchedName],
  );

  const hydrateForm = useCallback((group) => {
    if (!group) return null;
    const frameworkId = relationId(group.framework) ?? group.framework_id;
    setGroupData(group);
    setSelectedFramework(frameworkId);
    if (frameworkId) sessionStorage.setItem(FRAMEWORK_SESSION_KEY, String(frameworkId));

    form.setFieldsValue({
      framework: frameworkId,
      code: group.code || '',
      name: group.name || '',
      code_prefix_start: group.code_prefix_start || '',
      code_prefix_end: group.code_prefix_end || '',
      sequence: group.sequence ?? 0,
      parent: relationId(group.parent),
      company: normalizeIds(group.company_detail?.length ? group.company_detail : group.company),
      excluded_account_ids: normalizeIds(
        group.excluded_account_ids?.length
          ? group.excluded_account_ids
          : group.excluded_accounts_detail,
      ),
      note: group.note || '',
    });
    setHasChanges(false);
    return frameworkId;
  }, [form]);

  useEffect(() => {
    let active = true;

    const initialize = async () => {
      if (cachedGroup) hydrateForm(cachedGroup);
      else setInitializing(true);

      try {
        const frameworkPromise = frameworks.length ? Promise.resolve() : fetchFrameworks();
        const groupPromise = fetchGroupById(id);
        const [, freshGroup] = await Promise.all([frameworkPromise, groupPromise]);
        if (!active || !freshGroup) return;

        const frameworkId = hydrateForm(freshGroup);
        if (frameworkId) fetchGroups({ framework: frameworkId }).catch(() => {});
      } catch (error) {
        if (!active) return;
        setFeedback({
          type: cachedGroup ? 'warning' : 'error',
          message: cachedGroup
            ? 'Les données de la liste sont affichées, mais leur synchronisation a échoué.'
            : getErrorMessage(error, 'Impossible de charger la classe à modifier.'),
        });
      } finally {
        if (active) setInitializing(false);
      }
    };

    initialize();
    return () => { active = false; };
    // Les données du store changent pendant le chargement; l'initialisation ne doit pas repartir.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleFrameworkChange = useCallback(async (frameworkId) => {
    const normalizedId = relationId(frameworkId);
    setSelectedFramework(normalizedId);
    form.setFieldValue('parent', null);
    setFeedback(null);
    if (!normalizedId) return;

    sessionStorage.setItem(FRAMEWORK_SESSION_KEY, String(normalizedId));
    try {
      await fetchGroups({ framework: normalizedId });
    } catch (error) {
      setFeedback({ type: 'error', message: getErrorMessage(error, 'Impossible de charger les classes parentes.') });
    }
  }, [fetchGroups, form]);

  const save = useCallback(async () => {
    setSaving(true);
    setFeedback(null);
    try {
      const values = await form.validateFields();
      const payload = {
        ...values,
        framework: relationId(values.framework),
        parent: relationId(values.parent),
        company: normalizeIds(values.company),
        excluded_account_ids: normalizeIds(values.excluded_account_ids),
      };
      const updated = await updateGroup(id, payload);
      const result = { ...groupData, ...payload, ...(updated || {}), id };
      setGroupData(result);
      setHasChanges(false);
      setFeedback({ type: 'success', message: 'Classe modifiée avec succès.' });
      return result;
    } catch (error) {
      if (error?.errorFields) {
        setFeedback({ type: 'error', message: 'Complétez les champs obligatoires avant l’enregistrement.' });
      } else {
        setFeedback({ type: 'error', message: getErrorMessage(error, 'Erreur lors de la modification de la classe.') });
      }
      return false;
    } finally {
      setSaving(false);
    }
  }, [form, groupData, id, updateGroup]);

  const listPath = selectedFramework
    ? `/comptabilite/groups?framework=${selectedFramework}`
    : '/comptabilite/groups';

  const traceabilityLogs = useMemo(() => [
    {
      id: 'creation',
      title: 'Création de la classe',
      date: groupData?.created_at || groupData?.create_date,
      user: groupData?.created_by_name || groupData?.create_uid_label || groupData?.created_by,
    },
    {
      id: 'update',
      title: 'Dernière modification',
      date: groupData?.updated_at || groupData?.write_date,
      user: groupData?.updated_by_name || groupData?.write_uid_label || groupData?.updated_by,
    },
  ].filter((item) => item.date || item.user), [groupData]);

  const traceabilityContent = (
    <div className="p-3">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-medium text-gray-700">Activité liée à cette classe</span>
        <span className="text-[11px] text-gray-500">{traceabilityLogs.length} événement(s)</span>
      </div>
      {traceabilityLogs.length ? traceabilityLogs.map((log) => (
        <div key={log.id} className="mb-2 border border-gray-200 bg-white px-3 py-2 last:mb-0">
          <div className="text-xs font-semibold text-gray-900">{log.title}</div>
          <div className="mt-1 text-[11px] text-gray-600">{recordLabel}</div>
          <div className="mt-1 text-[11px] text-gray-500">Par {log.user || 'Utilisateur'}</div>
          <div className="text-[11px] text-gray-400">{formatDateTime(log.date)}</div>
        </div>
      )) : (
        <div className="border border-gray-200 bg-white p-5 text-center text-xs text-gray-500">
          Aucune traçabilité disponible pour cette classe.
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
          <button
            type="button"
            onClick={() => navigate(`/comptabilite/groups/${id}`, { state: { groupRecord: groupData, frameworkId: selectedFramework, returnTo: location.pathname } })}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-purple-50"
          >
            <FiEye size={12} /> Voir le détail
          </button>
          <button
            type="button"
            onClick={() => navigate('/comptabilite/groups/new', { state: { frameworkId: selectedFramework, parentId: id, returnTo: location.pathname } })}
            className="flex w-full items-center gap-2 border-t border-gray-100 px-3 py-2 text-left text-xs hover:bg-purple-50"
          >
            <FiPlus size={12} /> Ajouter une sous-classe
          </button>
          <button
            type="button"
            onClick={() => { setTraceabilityOpen((open) => !open); setActionsOpen(false); }}
            className="flex w-full items-center gap-2 border-t border-gray-100 px-3 py-2 text-left text-xs hover:bg-purple-50"
          >
            <FiInfo size={12} /> {traceabilityOpen ? 'Masquer' : 'Afficher'} la traçabilité
          </button>
        </div>
      )}
    </div>
  );

  if (initializing && !groupData) {
    return <div className="flex h-full items-center justify-center bg-white"><Spin size="large" tip="Chargement de la classe..." /></div>;
  }

  return (
    <UnifiedFormPage
      title="Classes / Groupes"
      recordLabel={recordLabel}
      pageLabel="Modification d’une classe comptable"
      mode="edit"
      fallbackPath={listPath}
      primaryAction={{
        label: 'Nouveau',
        icon: <FiPlus size={12} />,
        path: '/comptabilite/groups/new',
        state: { frameworkId: selectedFramework },
      }}
      actionsMenu={actionsMenu}
      onSave={save}
      saveLabel="Enregistrer les modifications"
      saving={saving}
      hasUnsavedChanges={hasChanges}
      rememberForm={false}
      feedback={feedback}
      onDismissFeedback={() => setFeedback(null)}
      messageDuration={15000}
      buildReturnState={(updated) => ({
        restoredFromSmartBack: true,
        refreshGroups: true,
        updatedGroup: updated,
        frameworkId: relationId(updated?.framework) || selectedFramework,
      })}
      traceability={groupData ? {
        open: traceabilityOpen,
        onOpen: () => setTraceabilityOpen(true),
        onClose: () => setTraceabilityOpen(false),
        title: 'Traçabilité',
        content: traceabilityContent,
      } : undefined}
      noContext={!groupData ? <div className="text-center text-sm text-gray-500">Cette classe est introuvable.</div> : undefined}
    >
      {groupData && (
        <div className="p-4">
          <Form
            form={form}
            layout="vertical"
            requiredMark={false}
            className="group-form"
            onValuesChange={() => {
              setHasChanges(true);
              setFeedback(null);
            }}
          >
            <style>{`
              .group-form .ant-form-item { margin-bottom: 10px; }
              .group-form .ant-form-item-label { padding-bottom: 3px; }
              .group-form .ant-form-item-label > label { height: auto; font-size: 12px; font-weight: 600; color: #374151; }
              .group-form .ant-input,
              .group-form .ant-input-number,
              .group-form .ant-select-selector { min-height: 30px !important; border-radius: 0 !important; font-size: 12px !important; box-shadow: none !important; }
              .group-form .ant-input { height: 30px; padding: 3px 8px; }
              .group-form textarea.ant-input { height: auto; min-height: 76px !important; }
              .group-form .ant-select-selector { padding: 0 8px !important; }
              .group-form .ant-select-selection-item,
              .group-form .ant-select-selection-placeholder { line-height: 28px !important; font-size: 12px !important; }
              .group-form .ant-input:hover,
              .group-form .ant-select:hover .ant-select-selector { border-color: #c084fc !important; }
              .group-form .ant-input:focus,
              .group-form .ant-select-focused .ant-select-selector { border-color: #9333ea !important; box-shadow: 0 0 0 1px #9333ea !important; }
              .group-form .ant-card { border-radius: 0 !important; box-shadow: none !important; }
            `}</style>
            <GroupFormFields
              frameworks={frameworks}
              groups={groups.filter((item) => String(item.id) !== String(id))}
              selectedFramework={selectedFramework}
              onFrameworkChange={handleFrameworkChange}
              disableFramework
            />
          </Form>
        </div>
      )}
    </UnifiedFormPage>
  );
}

export { GroupEdit };
