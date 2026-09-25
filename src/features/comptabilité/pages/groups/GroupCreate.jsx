// src/features/comptabilite/pages/groups/GroupCreate.jsx
import { Form, Spin } from 'antd';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { FiPlus } from 'react-icons/fi';
import { useLocation } from 'react-router-dom';

import UnifiedFormPage from '../../../../components/UnifiedFormPage';
import useFrameworkStore from '../../../../stores/comptabilite/frameworkStore';
import useGroupStore from '../../../../stores/comptabilite/groupStore';
import GroupFormFields from './components/GroupFormFields';

const FRAMEWORK_SESSION_KEY = 'group_list_selected_framework';
const FORM_MEMORY_KEY = 'comptabilite:group:create:v2';

const asId = (value) => {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'object') return value.id ?? value.value ?? null;
  return value;
};

const normalizeIds = (value) => (
  Array.isArray(value)
    ? value.map(asId).filter((item) => item !== null && item !== undefined && item !== '')
    : []
);

const errorMessage = (error, fallback) => {
  const payload = error?.response?.data;
  if (!payload || typeof payload !== 'object') return error?.message || fallback;

  return Object.entries(payload)
    .map(([field, errors]) => `${field} : ${Array.isArray(errors) ? errors.join(', ') : String(errors)}`)
    .join('\n');
};

export default function GroupCreate() {
  const [form] = Form.useForm();
  const location = useLocation();
  const { createGroup, fetchGroups, groups = [] } = useGroupStore();
  const { frameworks = [], fetchFrameworks } = useFrameworkStore();

  const [selectedFramework, setSelectedFramework] = useState(null);
  const [initializing, setInitializing] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const watchedCode = Form.useWatch('code', form);
  const watchedName = Form.useWatch('name', form);
  const recordLabel = useMemo(
    () => [watchedCode, watchedName].filter(Boolean).join(' - ') || 'Nouvelle classe',
    [watchedCode, watchedName],
  );

  const loadGroups = useCallback(async (frameworkId) => {
    if (!frameworkId) return;
    await fetchGroups({ framework: frameworkId });
  }, [fetchGroups]);

  useEffect(() => {
    let active = true;

    const initialize = async () => {
      setInitializing(true);
      try {
        if (!frameworks.length) await fetchFrameworks();

        const stateFramework = asId(location.state?.frameworkId);
        const storedFramework = sessionStorage.getItem(FRAMEWORK_SESSION_KEY);
        const frameworkId = stateFramework || (storedFramework ? Number(storedFramework) : null);
        const parentId = asId(location.state?.parentId);

        if (!active) return;
        if (frameworkId) {
          setSelectedFramework(frameworkId);
          form.setFieldsValue({
            framework: frameworkId,
            ...(parentId ? { parent: parentId } : {}),
          });
          await loadGroups(frameworkId);
        }
      } catch (error) {
        if (active) setFeedback({ type: 'error', message: errorMessage(error, 'Erreur lors du chargement initial.') });
      } finally {
        if (active) setInitializing(false);
      }
    };

    initialize();
    return () => { active = false; };
    // Le chargement initial ne doit pas repartir lorsque le store se met à jour.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFrameworkChange = useCallback(async (frameworkId) => {
    const normalizedId = asId(frameworkId);
    setSelectedFramework(normalizedId);
    form.setFieldValue('parent', null);
    setFeedback(null);

    if (!normalizedId) return;
    sessionStorage.setItem(FRAMEWORK_SESSION_KEY, String(normalizedId));
    try {
      await loadGroups(normalizedId);
    } catch (error) {
      setFeedback({ type: 'error', message: errorMessage(error, 'Impossible de charger les classes de ce plan.') });
    }
  }, [form, loadGroups]);

  const save = useCallback(async () => {
    setSaving(true);
    setFeedback(null);
    try {
      const values = await form.validateFields();
      const payload = {
        ...values,
        framework: asId(values.framework),
        parent: asId(values.parent),
        company: normalizeIds(values.company),
        excluded_account_ids: normalizeIds(values.excluded_account_ids),
      };
      const created = await createGroup(payload);
      setHasChanges(false);
      setFeedback({ type: 'success', message: 'Classe créée avec succès.' });
      return created || payload;
    } catch (error) {
      if (error?.errorFields) {
        setFeedback({ type: 'error', message: 'Complétez les champs obligatoires avant l’enregistrement.' });
      } else {
        setFeedback({ type: 'error', message: errorMessage(error, 'Erreur lors de la création de la classe.') });
      }
      return false;
    } finally {
      setSaving(false);
    }
  }, [createGroup, form]);

  const restoreMemory = useCallback((savedValues) => {
    if (!savedValues || typeof savedValues !== 'object') return;
    form.setFieldsValue(savedValues);
    const frameworkId = asId(savedValues.framework);
    if (frameworkId) {
      setSelectedFramework(frameworkId);
      loadGroups(frameworkId).catch(() => {});
    }
  }, [form, loadGroups]);

  return (
    <UnifiedFormPage
      title="Classes / Groupes"
      recordLabel={recordLabel}
      pageLabel="Création d’une classe comptable"
      mode="create"
      fallbackPath="/comptabilite/groups"
      primaryAction={{
        label: 'Nouveau',
        icon: <FiPlus size={12} />,
        path: '/comptabilite/groups/new',
        state: selectedFramework ? { frameworkId: selectedFramework } : undefined,
      }}
      onSave={save}
      saveLabel="Enregistrer"
      saving={saving}
      autoReturnAfterSave
      hasUnsavedChanges={hasChanges}
      memoryKey={FORM_MEMORY_KEY}
      memoryState={form.getFieldsValue(true)}
      onRestoreMemoryState={restoreMemory}
      feedback={feedback}
      onDismissFeedback={() => setFeedback(null)}
      messageDuration={15000}
      buildReturnState={(created) => ({
        restoredFromSmartBack: true,
        refreshGroups: true,
        createdGroup: created,
        frameworkId: asId(created?.framework) || selectedFramework,
      })}
    >
      <div className="p-4">
        {initializing && !frameworks.length ? (
          <div className="flex min-h-[220px] items-center justify-center">
            <Spin size="large" tip="Chargement..." />
          </div>
        ) : (
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
              groups={groups}
              selectedFramework={selectedFramework}
              onFrameworkChange={handleFrameworkChange}
              disableFramework={false}
            />
          </Form>
        )}
      </div>
    </UnifiedFormPage>
  );
}
