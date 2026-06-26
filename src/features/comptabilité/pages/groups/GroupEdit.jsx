// src/features/comptabilite/pages/groups/GroupEdit.jsx
import { CloseOutlined } from '@ant-design/icons';
import {
  Form,
  Input,
  message,
  Select,
  Spin,
} from 'antd';
import { useEffect, useMemo, useState } from 'react';
import {
  FiAlertCircle,
  FiCheck,
  FiEye,
  FiInfo,
  FiPlus,
  FiSettings,
  FiUploadCloud,
} from 'react-icons/fi';
import { useNavigate, useParams } from 'react-router-dom';
import useFrameworkStore from '../../../../stores/comptabilite/frameworkStore';
import useGroupStore from '../../../../stores/comptabilite/groupStore';

const { TextArea } = Input;
const FRAMEWORK_SESSION_KEY = 'group_list_selected_framework';

const Tooltip = ({ children, text, position = 'top' }) => {
  const [show, setShow] = useState(false);

  return (
    <div className="relative inline-block">
      <div onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
        {children}
      </div>
      {show && (
        <div className={`absolute z-50 px-2 py-1 text-xs text-white bg-gray-800 rounded whitespace-nowrap ${
          position === 'top' ? 'bottom-full left-1/2 transform -translate-x-1/2 mb-1' :
          position === 'bottom' ? 'top-full left-1/2 transform -translate-x-1/2 mt-1' :
          position === 'left' ? 'right-full top-1/2 transform -translate-y-1/2 mr-1' :
          'left-full top-1/2 transform -translate-y-1/2 ml-1'
        }`}>
          {text}
          <div className={`absolute w-2 h-2 bg-gray-800 transform rotate-45 ${
            position === 'top' ? 'top-full left-1/2 -translate-x-1/2 -mt-1' :
            position === 'bottom' ? 'bottom-full left-1/2 -translate-x-1/2 -mb-1' :
            position === 'left' ? 'left-full top-1/2 -translate-y-1/2 -ml-1' :
            'right-full top-1/2 -translate-y-1/2 -mr-1'
          }`} />
        </div>
      )}
    </div>
  );
};

const Section = ({ title, hint, children }) => (
  <section className="border-b border-gray-200 px-4 py-4 last:border-b-0">
    <div className="mb-3">
      <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
      {hint && <p className="mt-1 max-w-3xl text-xs leading-5 text-gray-500">{hint}</p>}
    </div>
    <div className="grid grid-cols-1 gap-x-8 gap-y-3 md:grid-cols-2">
      {children}
    </div>
  </section>
);

const FieldRow = ({ label, optional = false, span = false, children }) => (
  <div className={span ? 'md:col-span-2' : ''}>
    <label className="mb-1 block text-xs font-medium text-gray-700">
      {label}
      {optional && <span className="ml-1 text-[11px] font-normal text-gray-400">(optional)</span>}
    </label>
    {children}
  </div>
);

const normalizeIdList = (value) => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === 'object' ? item.id ?? item.value : item))
    .filter((item) => item !== null && item !== undefined && item !== '');
};

const optionLabel = (record, fallback) => {
  if (!record) return fallback;
  const code = record.code || record.numero || record.number;
  const name = record.name || record.nom || record.raison_sociale || record.label || record.libelle;
  if (code && name) return `${code} - ${name}`;
  return name || code || fallback;
};

function GroupEdit() {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const { id } = useParams();

  const { updateGroup, fetchGroupById, fetchGroups, groups } = useGroupStore();
  const { frameworks, fetchFrameworks } = useFrameworkStore();

  const [pageLoading, setPageLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedFramework, setSelectedFramework] = useState(null);
  const [groupData, setGroupData] = useState(null);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState({
    to: '/comptabilite/groups',
    options: undefined,
  });

  const watchedCode = Form.useWatch('code', form);
  const watchedName = Form.useWatch('name', form);
  const readyForValidation = Boolean(watchedCode && watchedName);

  useEffect(() => {
    const init = async () => {
      setPageLoading(true);
      setError(null);
      setSuccess(null);
      try {
        const [, group] = await Promise.all([
          fetchFrameworks(),
          fetchGroupById(id),
        ]);

        const fwId = group.framework;
        setSelectedFramework(fwId);
        setGroupData(group);
        sessionStorage.setItem(FRAMEWORK_SESSION_KEY, String(fwId));

        try {
          await fetchGroups({ framework: fwId });
        } catch {
          // On garde l'ecran utilisable meme si la liste des classes parentes expire.
        }

        form.setFieldsValue({
          framework: fwId,
          code: group.code,
          name: group.name,
          code_prefix_start: group.code_prefix_start || '',
          code_prefix_end: group.code_prefix_end || '',
          sequence: group.sequence ?? 0,
          parent: group.parent || null,
          company: normalizeIdList(group.company),
          excluded_account_ids: normalizeIdList(group.excluded_account_ids),
          note: group.note || '',
        });
      } catch (caughtError) {
        message.error('Impossible de charger la classe à modifier');
        console.error(caughtError);
        navigate('/comptabilite/groups');
      } finally {
        setPageLoading(false);
      }
    };

    init();
  }, [id]);

  const selectedFw = useMemo(
    () => frameworks.find((framework) => String(framework.id) === String(selectedFramework)),
    [frameworks, selectedFramework]
  );

  const frameworkOptions = useMemo(() => (
    frameworks.map((framework) => ({
      value: framework.id,
      label: `${framework.code || ''} - ${framework.name || ''}`.trim(),
    }))
  ), [frameworks]);

  const parentOptions = useMemo(() => (
    groups
      .filter((group) => String(group.id) !== String(id))
      .map((group) => ({
        value: group.id,
        label: `${group.code || ''} - ${group.name || ''}`.trim(),
      }))
  ), [groups, id]);

  const companyOptions = useMemo(() => {
    const ids = normalizeIdList(groupData?.company);
    const names = Array.isArray(groupData?.company_names) ? groupData.company_names : [];
    const details =
      groupData?.company_detail ||
      groupData?.companies_detail ||
      groupData?.company_details ||
      [];

    if (Array.isArray(details) && details.length > 0) {
      return details.map((company, index) => ({
        value: company.id ?? ids[index],
        label: optionLabel(company, `Societe ${company.id ?? ids[index] ?? ''}`.trim()),
      }));
    }

    return ids.map((companyId, index) => ({
      value: companyId,
      label: names[index] || `Societe ${companyId}`,
    }));
  }, [groupData]);

  const excludedAccountOptions = useMemo(() => {
    const ids = normalizeIdList(groupData?.excluded_account_ids);
    const details = Array.isArray(groupData?.excluded_accounts_detail)
      ? groupData.excluded_accounts_detail
      : [];

    if (details.length > 0) {
      return details.map((account, index) => ({
        value: account.id ?? ids[index],
        label: optionLabel(account, `Compte ${account.id ?? ids[index] ?? ''}`.trim()),
      }));
    }

    return ids.map((accountId) => ({
      value: accountId,
      label: `Compte ${accountId}`,
    }));
  }, [groupData]);

  useEffect(() => {
    const handleBeforeUnload = (event) => {
      if (hasUnsavedChanges) {
        event.preventDefault();
        event.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const navigateWithGuard = (to, options) => {
    if (hasUnsavedChanges) {
      setPendingNavigation({ to, options });
      setShowConfirmDialog(true);
      return;
    }

    navigate(to, options);
  };

  const saveValues = async (values, redirect = { to: '/comptabilite/groups', options: undefined }) => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await updateGroup(id, {
        ...values,
        company: values.company || [],
        excluded_account_ids: values.excluded_account_ids || [],
      });
      setSuccess('Classe modifiée avec succès');
      message.success('Classe modifiée avec succès');
      setHasUnsavedChanges(false);
      navigate(redirect.to, redirect.options);
    } catch (caughtError) {
      const errorData = caughtError.response?.data;
      if (errorData && typeof errorData === 'object') {
        Object.entries(errorData).forEach(([field, errors]) => {
          const msg = Array.isArray(errors) ? errors.join(', ') : String(errors);
          message.error(`${field} : ${msg}`);
          setError(`${field} : ${msg}`);
        });
      } else {
        const msg = caughtError.message || 'Erreur lors de la modification';
        message.error(msg);
        setError(msg);
      }
    } finally {
      setSaving(false);
    }
  };

  const onFinish = async (values) => {
    await saveValues(values, { to: '/comptabilite/groups', options: undefined });
  };

  const saveBeforeLeaving = async () => {
    try {
      const values = await form.validateFields();
      setShowConfirmDialog(false);
      await saveValues(values, pendingNavigation);
    } catch {
      setShowConfirmDialog(false);
    }
  };

  const discardChanges = () => {
    setHasUnsavedChanges(false);
    setShowConfirmDialog(false);
    navigate(pendingNavigation.to, pendingNavigation.options);
  };

  if (pageLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="mx-auto flex min-h-[300px] max-w-7xl items-center justify-center border border-gray-300 bg-white">
          <Spin size="large" tip="Chargement de la classe..." />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <style>{`
        .group-edit-form .ant-form-item {
          margin-bottom: 0;
        }
        .group-edit-form .ant-input,
        .group-edit-form .ant-select-selector {
          min-height: 30px !important;
          border-radius: 0 !important;
          border-color: #d1d5db !important;
          font-size: 12px !important;
          box-shadow: none !important;
        }
        .group-edit-form .ant-input {
          padding: 3px 8px !important;
        }
        .group-edit-form textarea.ant-input {
          min-height: 110px !important;
          line-height: 1.5 !important;
          resize: vertical;
        }
        .group-edit-form .ant-select-selection-item,
        .group-edit-form .ant-select-selection-placeholder {
          font-size: 12px !important;
        }
        .group-edit-form .ant-form-item-explain-error,
        .group-edit-form .ant-form-item-extra {
          font-size: 11px;
          margin-top: 2px;
        }
      `}</style>

      <div className="mx-auto max-w-7xl border border-gray-300 bg-white">
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          onValuesChange={() => setHasUnsavedChanges(true)}
          requiredMark="optional"
          size="middle"
          className="group-edit-form"
        >
          <div className="border-b border-gray-300 px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-3">
                <Tooltip text="Créer une nouvelle classe">
                  <button
                    type="button"
                    onClick={() => navigateWithGuard('/comptabilite/groups/new', { state: { frameworkId: selectedFramework } })}
                    className="flex h-12 items-center gap-1 bg-purple-600 px-4 text-sm font-medium text-white transition-all hover:bg-purple-700"
                  >
                    <FiPlus size={16} /><span>Nouveau</span>
                  </button>
                </Tooltip>
                <div className="flex min-h-[48px] min-w-0 flex-col justify-center">
                  <div
                    className="cursor-pointer text-lg font-bold text-gray-900 transition-colors hover:text-purple-600"
                    onClick={() => navigateWithGuard('/comptabilite/groups')}
                  >
                    Modifier la classe de comptes
                  </div>
                  <div className="mt-1 text-xs font-medium text-gray-600">
                    {groupData
                      ? `${groupData.code} - ${groupData.name}`
                      : 'Modifiez les informations de la classe'}
                  </div>
                  {selectedFw && (
                    <div className="mt-1 text-xs text-gray-500">
                      Référentiel actif : {selectedFw.code} - {selectedFw.name}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative">
                  <Tooltip text="Menu des actions">
                    <button
                      type="button"
                      onClick={() => setShowActionsMenu(!showActionsMenu)}
                      className="flex h-8 items-center gap-1 border border-gray-300 px-3 text-xs text-gray-700 hover:bg-gray-50"
                    >
                      <FiSettings size={12} /><span>Actions</span>
                    </button>
                  </Tooltip>
                  {showActionsMenu && (
                    <div className="absolute right-0 z-50 mt-1 w-52 rounded-sm border border-gray-300 bg-white shadow-lg">
                      <button
                        type="button"
                        onClick={() => {
                          setShowActionsMenu(false);
                          navigateWithGuard(`/comptabilite/groups/${id}`);
                        }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-gray-50"
                      >
                        <FiEye size={12} /> Voir le détail
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowActionsMenu(false);
                          navigateWithGuard('/comptabilite/groups');
                        }}
                        className="flex w-full items-center gap-2 border-t border-gray-100 px-3 py-2 text-left text-xs hover:bg-gray-50"
                      >
                        <FiInfo size={12} /> Retour à la liste
                      </button>
                    </div>
                  )}
                </div>
                <Tooltip text="Enregistrer">
                  <button
                    type="button"
                    onClick={() => form.submit()}
                    disabled={saving}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-600 text-white hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <FiUploadCloud size={16} />
                  </button>
                </Tooltip>
                <Tooltip text="Annuler">
                  <button
                    type="button"
                    onClick={() => navigateWithGuard('/comptabilite/groups')}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-black text-white hover:bg-gray-800"
                  >
                    <CloseOutlined />
                  </button>
                </Tooltip>
              </div>
            </div>
          </div>

          <div className="border-b border-gray-300 px-4 py-2">
            {error ? (
              <div className="flex items-center gap-1 text-xs text-red-600">
                <FiAlertCircle size={14} /><span>{error}</span>
              </div>
            ) : success ? (
              <div className="flex items-center gap-1 text-xs text-green-600">
                <FiCheck size={14} /><span>{success}</span>
              </div>
            ) : !readyForValidation ? (
              <div className="flex items-center gap-1 text-xs text-amber-600">
                <FiInfo size={14} /><span>Complétez le code et le nom de la classe</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-xs text-green-600">
                <FiCheck size={14} /><span>Classe prête à être enregistrée</span>
              </div>
            )}
          </div>

          <div className="bg-white">
            <Section title="Référentiel & Identification">
              <FieldRow label="Référentiel comptable">
                <Form.Item name="framework" rules={[{ required: true, message: 'Référentiel obligatoire' }]}>
                  <Select
                    disabled
                    showSearch
                    optionFilterProp="label"
                    placeholder="Sélectionner un référentiel"
                    options={frameworkOptions}
                  />
                </Form.Item>
              </FieldRow>

              <FieldRow label="Code">
                <Form.Item name="code" rules={[{ required: true, message: 'Code obligatoire' }]}>
                  <Input />
                </Form.Item>
              </FieldRow>

              <FieldRow label="Ordre d'affichage" optional>
                <Form.Item name="sequence">
                  <Input type="number" />
                </Form.Item>
              </FieldRow>

              <FieldRow label="Nom de la classe">
                <Form.Item name="name" rules={[{ required: true, message: 'Nom obligatoire' }]}>
                  <Input />
                </Form.Item>
              </FieldRow>
            </Section>

            <Section title="Hiérarchie">
              <FieldRow label="Classe parente" optional>
                <Form.Item name="parent">
                  <Select
                    allowClear
                    showSearch
                    optionFilterProp="label"
                    placeholder="Aucune (classe racine)"
                    options={parentOptions}
                  />
                </Form.Item>
              </FieldRow>
            </Section>

            <Section
              title="Plage de comptes"
              hint="La plage détermine quels comptes sont rattachés automatiquement à cette classe via leur préfixe de code."
            >
              <FieldRow label="Début de plage" optional>
                <Form.Item name="code_prefix_start">
                  <Input />
                </Form.Item>
              </FieldRow>

              <FieldRow label="Fin de plage" optional>
                <Form.Item name="code_prefix_end">
                  <Input />
                </Form.Item>
              </FieldRow>

              <FieldRow label="Comptes exclus de la plage" optional>
                <Form.Item name="excluded_account_ids">
                  <Select
                    allowClear
                    mode="multiple"
                    optionFilterProp="label"
                    placeholder="Aucun compte exclu"
                    options={excludedAccountOptions}
                  />
                </Form.Item>
              </FieldRow>
            </Section>

            <Section title="Périmètre">
              <FieldRow label="Sociétés concernées" optional>
                <Form.Item name="company">
                  <Select
                    allowClear
                    mode="multiple"
                    optionFilterProp="label"
                    placeholder="Toutes les sociétés (par défaut)"
                    options={companyOptions}
                  />
                </Form.Item>
              </FieldRow>
            </Section>

            <Section title="Notes">
              <FieldRow label="Description / Remarques" optional span>
                <Form.Item name="note">
                  <TextArea maxLength={1000} showCount rows={5} />
                </Form.Item>
              </FieldRow>
            </Section>
          </div>
        </Form>
      </div>

      {showConfirmDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="mx-4 w-full max-w-md rounded-sm bg-white p-6 shadow-lg">
            <h3 className="mb-3 text-lg font-bold text-gray-900">Modifications non sauvegardées</h3>
            <p className="mb-6 text-sm text-gray-600">
              Voulez-vous enregistrer les modifications avant de quitter ?
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={saveBeforeLeaving}
                className="bg-purple-600 px-4 py-2 text-sm text-white transition-all hover:bg-purple-700"
              >
                Enregistrer
              </button>
              <button
                type="button"
                onClick={discardChanges}
                className="bg-red-600 px-4 py-2 text-sm text-white transition-all hover:bg-red-700"
              >
                Ne pas enregistrer
              </button>
              <button
                type="button"
                onClick={() => setShowConfirmDialog(false)}
                className="border border-gray-300 px-4 py-2 text-sm text-gray-700 transition-all hover:bg-gray-50"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export { GroupEdit };
export default GroupEdit;
