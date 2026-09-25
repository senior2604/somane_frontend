// src/features/comptabilite/pages/payement/PaymentMethodForm.jsx
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FiCopy,
  FiPlus,
  FiPower,
  FiSettings,
  FiTrash2,
} from 'react-icons/fi';
import { useLocation, useNavigate, useParams } from 'react-router-dom';

import UnifiedFormPage from '../../../../components/UnifiedFormPage';
import axiosInstance from '../../../../config/axiosInstance';
import {
  Field,
  SearchSelect,
  StatusSwitch,
  getActionErrorMessage,
  getActiveEntityId,
  normalizeApiList,
  optionLabel,
} from './paymentShared.jsx';

const API = {
  methods: 'compta/payment-methods/',
  methodLines: 'compta/payment-method-lines/',
  accounts: 'compta/accounts/',
  journals: 'compta/journals/',
};
const FORM_MEMORY_KEY = 'comptabilite:payment-method:create:v3';
const DIRECTIONS = [
  { id: 'both', label: 'Encaissement et décaissement' },
  { id: 'inbound', label: 'Encaissement uniquement' },
  { id: 'outbound', label: 'Décaissement uniquement' },
];
const LINE_TYPES = [
  { id: 'inbound', label: 'Encaissement' },
  { id: 'outbound', label: 'Décaissement' },
];
const LINE_FIELDS = ['payment_type', 'journal', 'payment_account', 'sequence'];

const relationId = (value) => {
  if (value === null || value === undefined || value === '') return '';
  if (typeof value === 'object') return value.id ?? value.value ?? '';
  return value;
};
const emptyMethod = () => ({
  name: '',
  code: '',
  payment_type: 'both',
  outstanding_receipts_account_id: '',
  outstanding_payments_account_id: '',
  active: true,
});
const emptyLine = () => ({
  id: `tmp-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  payment_type: 'inbound',
  journal: '',
  payment_account: '',
  sequence: 10,
  name: '',
  code: '',
});
const normalizeMethod = (method = {}) => ({
  name: method.name || '',
  code: method.code || '',
  payment_type: method.payment_type || 'both',
  outstanding_receipts_account_id: relationId(
    method.outstanding_receipts_account_id ?? method.outstanding_receipts_account,
  ),
  outstanding_payments_account_id: relationId(
    method.outstanding_payments_account_id ?? method.outstanding_payments_account,
  ),
  active: method.active !== false,
});
const normalizeLine = (line) => ({
  ...line,
  journal: relationId(line.journal_id ?? line.journal),
  payment_account: relationId(line.payment_account_id ?? line.payment_account),
  payment_type: line.payment_type || 'inbound',
  sequence: Number(line.sequence || 10),
});

function ActionsMenu({
  active,
  canManage,
  onDelete,
  onDuplicate,
  onList,
  onPayments,
  onToggleActive,
  disabled,
}) {
  const rootRef = useRef(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const close = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex h-8 items-center gap-1 border border-gray-300 px-3 text-xs text-gray-700 transition-all hover:border-purple-500 hover:bg-purple-50 hover:text-purple-700"
      >
        <FiSettings size={13} />
        Actions
      </button>
      {open && (
        <div className="absolute right-0 top-full z-[120] mt-1 w-48 border border-gray-300 bg-white py-1 shadow-lg">
          <button type="button" onClick={() => { setOpen(false); onList(); }} className="w-full px-3 py-2 text-left text-xs text-gray-700 hover:bg-purple-50 hover:text-purple-700">
            Liste des méthodes
          </button>
          <button type="button" onClick={() => { setOpen(false); onPayments(); }} className="w-full px-3 py-2 text-left text-xs text-gray-700 hover:bg-purple-50 hover:text-purple-700">
            Paiements
          </button>
          {canManage && (
            <>
              <div className="my-1 border-t border-gray-200" />
              <button
                type="button"
                disabled={disabled}
                onClick={() => { setOpen(false); onDuplicate(); }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-gray-700 hover:bg-purple-50 hover:text-purple-700 disabled:opacity-50"
              >
                <FiCopy size={13} />
                Dupliquer
              </button>
              <button
                type="button"
                disabled={disabled}
                onClick={() => { setOpen(false); onToggleActive(); }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-gray-700 hover:bg-purple-50 hover:text-purple-700 disabled:opacity-50"
              >
                <FiPower size={13} />
                {active ? 'Désactiver' : 'Activer'}
              </button>
              <div className="my-1 border-t border-gray-200" />
              <button
                type="button"
                disabled={disabled}
                onClick={() => { setOpen(false); onDelete(); }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                <FiTrash2 size={13} />
                Supprimer
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function PaymentMethodForm({ mode = 'create' }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const isShowMode = mode === 'show' || mode === 'detail';
  const entityId = getActiveEntityId();
  const cachedMethod = location.state?.methodRecord
    || location.state?.selectedRecord
    || null;

  const [formData, setFormData] = useState(() => (
    cachedMethod ? normalizeMethod(cachedMethod) : emptyMethod()
  ));
  const [methodRecord, setMethodRecord] = useState(cachedMethod);
  const [lineDrafts, setLineDrafts] = useState(() => {
    const duplicatedLines = location.state?.lineDrafts;
    if (!isShowMode && Array.isArray(duplicatedLines) && duplicatedLines.length) {
      return duplicatedLines.map((line) => ({
        ...normalizeLine(line),
        id: emptyLine().id,
      }));
    }
    return [emptyLine()];
  });
  const [originalLineIds, setOriginalLineIds] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [journals, setJournals] = useState([]);
  const [activeTab, setActiveTab] = useState('journals');
  const [loading, setLoading] = useState(isShowMode && !cachedMethod);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [traceabilityOpen, setTraceabilityOpen] = useState(isShowMode);

  const loadData = useCallback(async () => {
    if (isShowMode && !cachedMethod) setLoading(true);
    try {
      const [accountsResponse, journalsResponse, linesResponse, methodResponse] = await Promise.all([
        axiosInstance.get(API.accounts, {
          params: {
            company: entityId || undefined,
            company_id: entityId || undefined,
            exclude_roots: true,
            page_size: 2000,
          },
        }).catch(() => ({ data: [] })),
        axiosInstance.get(API.journals, {
          params: { company: entityId || undefined, page_size: 500 },
        }).catch(() => ({ data: [] })),
        isShowMode
          ? axiosInstance.get(API.methodLines, {
            params: { payment_method: id, company: entityId || undefined, page_size: 1000 },
          }).catch(() => ({ data: [] }))
          : Promise.resolve({ data: [] }),
        isShowMode
          ? axiosInstance.get(`${API.methods}${id}/`)
          : Promise.resolve({ data: null }),
      ]);

      setAccounts(normalizeApiList(accountsResponse.data).filter(
        (account) => account.is_root !== true,
      ));
      setJournals(normalizeApiList(journalsResponse.data));

      if (methodResponse.data) {
        setMethodRecord(methodResponse.data);
        setFormData(normalizeMethod(methodResponse.data));
      }

      if (isShowMode) {
        const lines = normalizeApiList(linesResponse.data)
          .filter((line) => {
            const methodId = relationId(line.payment_method_id ?? line.payment_method);
            return !methodId || String(methodId) === String(id);
          })
          .map(normalizeLine);
        setLineDrafts(lines.length ? lines : [emptyLine()]);
        setOriginalLineIds(
          lines.map((line) => line.id).filter((lineId) => Number.isFinite(Number(lineId))),
        );
      }
      setHasChanges(false);
    } catch (error) {
      setFeedback({
        type: 'error',
        message: getActionErrorMessage(error, 'Impossible de charger la méthode de paiement.'),
      });
    } finally {
      setLoading(false);
    }
  }, [cachedMethod, entityId, id, isShowMode]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const markChanged = useCallback(() => {
    setHasChanges(true);
    setFeedback(null);
  }, []);

  const setField = useCallback((field, value) => {
    setFormData((previous) => ({ ...previous, [field]: value }));
    markChanged();
  }, [markChanged]);

  const updateLine = useCallback((index, field, value) => {
    setLineDrafts((previous) => previous.map((line, lineIndex) => (
      lineIndex === index ? { ...line, [field]: value } : line
    )));
    markChanged();
  }, [markChanged]);

  const addLine = useCallback(() => {
    setLineDrafts((previous) => [...previous, emptyLine()]);
    markChanged();
  }, [markChanged]);

  const removeLine = useCallback((index) => {
    setLineDrafts((previous) => {
      const next = previous.filter((_, lineIndex) => lineIndex !== index);
      return next.length ? next : [emptyLine()];
    });
    markChanged();
  }, [markChanged]);

  const focusCell = useCallback((lineId, field) => {
    window.setTimeout(() => {
      document.querySelector(
        `[data-method-line="${lineId}"] [data-method-field="${field}"] input`,
      )?.focus();
    }, 30);
  }, []);

  const handleLineTab = useCallback((event, lineIndex, field) => {
    if (event.key !== 'Tab' || event.shiftKey) return;
    const fieldIndex = LINE_FIELDS.indexOf(field);
    if (fieldIndex < 0) return;
    event.preventDefault();

    const nextField = LINE_FIELDS[fieldIndex + 1];
    if (nextField) {
      focusCell(lineDrafts[lineIndex].id, nextField);
      return;
    }
    if (lineDrafts[lineIndex + 1]) {
      focusCell(lineDrafts[lineIndex + 1].id, LINE_FIELDS[0]);
      return;
    }
    const line = emptyLine();
    setLineDrafts((previous) => [...previous, line]);
    markChanged();
    focusCell(line.id, LINE_FIELDS[0]);
  }, [focusCell, lineDrafts, markChanged]);

  const saveLines = useCallback(async (methodId) => {
    const validLines = lineDrafts.filter((line) => (
      line.journal || line.payment_account || line.name || line.code
    ));
    const keptIds = [];

    for (const line of validLines) {
      const payload = {
        company: entityId || null,
        payment_method: methodId,
        payment_type: line.payment_type || 'inbound',
        journal: line.journal || null,
        payment_account: line.payment_account || null,
        sequence: Number(line.sequence || 10),
        name: line.name || formData.name,
        code: line.code || formData.code,
      };
      if (Number.isFinite(Number(line.id))) {
        await axiosInstance.patch(`${API.methodLines}${line.id}/`, payload);
        keptIds.push(Number(line.id));
      } else {
        const response = await axiosInstance.post(API.methodLines, payload);
        if (response.data?.id) keptIds.push(Number(response.data.id));
      }
    }

    await Promise.all(
      originalLineIds
        .filter((lineId) => !keptIds.includes(Number(lineId)))
        .map((lineId) => axiosInstance.delete(`${API.methodLines}${lineId}/`)),
    );
  }, [entityId, formData.code, formData.name, lineDrafts, originalLineIds]);

  const save = useCallback(async () => {
    if (!formData.name.trim()) {
      setFeedback({ type: 'error', message: 'Le nom de la méthode est obligatoire.' });
      return false;
    }
    setSaving(true);
    setFeedback(null);
    try {
      const payload = {
        name: formData.name.trim(),
        code: formData.code.trim(),
        payment_type: formData.payment_type || 'both',
        active: formData.active !== false,
        company_id: entityId || null,
        outstanding_receipts_account_id: formData.outstanding_receipts_account_id || null,
        outstanding_payments_account_id: formData.outstanding_payments_account_id || null,
      };
      const response = isShowMode
        ? await axiosInstance.patch(`${API.methods}${id}/`, payload)
        : await axiosInstance.post(API.methods, payload);

      await saveLines(response.data.id);
      setMethodRecord(response.data);
      setFormData(normalizeMethod(response.data));
      setHasChanges(false);
      setFeedback({
        type: 'success',
        message: isShowMode
          ? 'Méthode de paiement modifiée avec succès.'
          : 'Méthode de paiement créée avec succès.',
      });
      return response.data;
    } catch (error) {
      setFeedback({
        type: 'error',
        message: getActionErrorMessage(error, "Impossible d'enregistrer la méthode de paiement."),
      });
      return false;
    } finally {
      setSaving(false);
    }
  }, [entityId, formData, id, isShowMode, saveLines]);

  const deleteMethod = useCallback(async () => {
    if (!id || !window.confirm('Supprimer cette méthode de paiement ?')) return;
    setSaving(true);
    try {
      await axiosInstance.delete(`${API.methods}${id}/`);
      navigate('/comptabilite/methodes-paiement', {
        replace: true,
        state: { refreshMethods: true },
      });
    } catch (error) {
      setFeedback({
        type: 'error',
        message: getActionErrorMessage(error, 'Impossible de supprimer cette méthode.'),
      });
    } finally {
      setSaving(false);
    }
  }, [id, navigate]);

  const duplicateMethod = useCallback(() => {
    navigate('/comptabilite/methodes-paiement/create', {
      state: {
        methodRecord: {
          ...methodRecord,
          id: undefined,
          name: formData.name ? `Copie de ${formData.name}` : '',
          code: '',
        },
        lineDrafts: lineDrafts.map((line) => ({
          ...line,
          id: undefined,
          payment_method: undefined,
          payment_method_id: undefined,
        })),
      },
    });
  }, [formData.name, lineDrafts, methodRecord, navigate]);

  const toggleActive = useCallback(async () => {
    if (!id) return;
    setSaving(true);
    setFeedback(null);
    try {
      const active = formData.active === false;
      const response = await axiosInstance.patch(`${API.methods}${id}/`, { active });
      setMethodRecord((previous) => ({ ...previous, ...response.data }));
      setFormData((previous) => ({ ...previous, active }));
      setFeedback({
        type: 'success',
        message: active
          ? 'Méthode de paiement activée avec succès.'
          : 'Méthode de paiement désactivée avec succès.',
      });
    } catch (error) {
      setFeedback({
        type: 'error',
        message: getActionErrorMessage(error, "Impossible de modifier l'état de la méthode."),
      });
    } finally {
      setSaving(false);
    }
  }, [formData.active, id]);

  const traceabilityContent = (
    <div className="space-y-3 p-4 text-xs">
      <div className="border border-gray-200 p-3">
        <div className="font-semibold text-gray-900">Création</div>
        <div className="mt-1 text-gray-600">
          {methodRecord?.create_date
            ? new Date(methodRecord.create_date).toLocaleString('fr-FR')
            : '-'}
        </div>
        <div className="text-gray-500">
          {methodRecord?.create_uid_name || methodRecord?.created_by_name || 'Utilisateur'}
        </div>
      </div>
      <div className="border border-gray-200 p-3">
        <div className="font-semibold text-gray-900">Dernière modification</div>
        <div className="mt-1 text-gray-600">
          {methodRecord?.write_date
            ? new Date(methodRecord.write_date).toLocaleString('fr-FR')
            : '-'}
        </div>
        <div className="text-gray-500">
          {methodRecord?.write_uid_name || methodRecord?.updated_by_name || 'Utilisateur'}
        </div>
      </div>
    </div>
  );

  return (
    <UnifiedFormPage
      title="Méthodes de paiement"
      recordLabel={formData.name || 'Nouvelle méthode'}
      pageLabel={isShowMode ? 'Détail de la méthode de paiement' : 'Création d’une méthode de paiement'}
      mode={isShowMode ? 'show' : 'create'}
      fallbackPath="/comptabilite/methodes-paiement"
      primaryAction={{
        label: 'Nouveau',
        icon: <FiPlus size={13} />,
        path: '/comptabilite/methodes-paiement/create',
      }}
      actionsMenu={(
        <ActionsMenu
          active={formData.active !== false}
          canManage={isShowMode}
          onDelete={deleteMethod}
          onDuplicate={duplicateMethod}
          onList={() => navigate('/comptabilite/methodes-paiement')}
          onPayments={() => navigate('/comptabilite/paiements')}
          onToggleActive={toggleActive}
          disabled={saving}
        />
      )}
      onSave={save}
      saveLabel={isShowMode ? 'Enregistrer les modifications' : 'Enregistrer'}
      saving={saving}
      autoReturnAfterSave={!isShowMode}
      hasUnsavedChanges={hasChanges}
      rememberForm={!isShowMode}
      memoryKey={FORM_MEMORY_KEY}
      memoryState={!isShowMode ? { formData, lineDrafts } : undefined}
      onRestoreMemoryState={!isShowMode ? (memory) => {
        if (memory?.formData) setFormData((previous) => ({ ...previous, ...memory.formData }));
        if (Array.isArray(memory?.lineDrafts) && memory.lineDrafts.length) {
          setLineDrafts(memory.lineDrafts);
        }
      } : undefined}
      feedback={feedback}
      onDismissFeedback={() => setFeedback(null)}
      messageDuration={15000}
      traceability={isShowMode ? {
        open: traceabilityOpen,
        onOpen: () => setTraceabilityOpen(true),
        onClose: () => setTraceabilityOpen(false),
        title: 'Traçabilité',
        content: traceabilityContent,
      } : undefined}
      noContext={loading ? (
        <div className="p-10 text-center text-sm text-gray-500">
          Chargement de la méthode...
        </div>
      ) : undefined}
    >
      {!loading && (
        <div>
          <div className="grid grid-cols-1 gap-x-6 gap-y-2 border-b border-gray-300 px-4 py-4 lg:grid-cols-2">
            <Field label="Nom" required>
              <input
                value={formData.name}
                onChange={(event) => setField('name', event.target.value)}
                className="h-[26px] w-full border border-gray-300 px-2 text-xs outline-none hover:border-purple-400 focus:border-purple-600"
                placeholder="Ex. Virement bancaire"
              />
            </Field>

            <Field label="Code">
              <input
                value={formData.code}
                onChange={(event) => setField('code', event.target.value)}
                className="h-[26px] w-full border border-gray-300 px-2 text-xs uppercase outline-none hover:border-purple-400 focus:border-purple-600"
                placeholder="Ex. BANK"
              />
            </Field>

            <Field label="Type de paiement" required>
              <SearchSelect
                value={formData.payment_type}
                onChange={(value) => setField('payment_type', value)}
                options={DIRECTIONS}
                getLabel={(option) => option.label}
              />
            </Field>
          </div>

          <div className="flex border-b border-gray-300 px-4">
            {[
              ['journals', 'Utilisation dans les journaux'],
              ['accounts', 'Comptes'],
              ['advanced', 'Paramètres avancés'],
            ].map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setActiveTab(key)}
                className={`border-b-2 px-4 py-2 text-xs font-medium ${
                  activeTab === key
                    ? 'border-purple-600 text-purple-700'
                    : 'border-transparent text-gray-500 hover:text-purple-700'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {activeTab === 'accounts' && (
            <div className="grid grid-cols-1 gap-x-6 gap-y-2 px-4 py-4 lg:grid-cols-2">
              <Field label="Compte des encaissements">
                <SearchSelect
                  value={formData.outstanding_receipts_account_id}
                  onChange={(value) => setField('outstanding_receipts_account_id', value)}
                  options={accounts}
                  getLabel={(account) => optionLabel(account)}
                  placeholder="Sélectionner un compte"
                />
              </Field>
              <Field label="Compte des décaissements">
                <SearchSelect
                  value={formData.outstanding_payments_account_id}
                  onChange={(value) => setField('outstanding_payments_account_id', value)}
                  options={accounts}
                  getLabel={(account) => optionLabel(account)}
                  placeholder="Sélectionner un compte"
                />
              </Field>
            </div>
          )}

          {activeTab === 'journals' && (
            <div className="px-4 py-4">
              <div className="overflow-x-auto border border-gray-300">
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr className="bg-gray-100 text-left text-gray-700">
                      <th className="border-r border-gray-300 px-2 py-2">Type de paiement</th>
                      <th className="border-r border-gray-300 px-2 py-2">Journal</th>
                      <th className="border-r border-gray-300 px-2 py-2">Compte en suspens</th>
                      <th
                        className="w-32 border-r border-gray-300 px-2 py-2"
                        title="Détermine la position de cette méthode dans la liste du journal"
                      >
                        Ordre d'affichage
                      </th>
                      <th className="w-10 px-2 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {lineDrafts.map((line, index) => (
                      <tr key={line.id} data-method-line={line.id} className="border-t border-gray-200">
                        <td data-method-field="payment_type" className="border-r border-gray-200 p-0">
                          <SearchSelect
                            value={line.payment_type}
                            onChange={(value) => updateLine(index, 'payment_type', value)}
                            options={LINE_TYPES}
                            getLabel={(option) => option.label}
                            bordered={false}
                          />
                        </td>
                        <td data-method-field="journal" className="border-r border-gray-200 p-0">
                          <SearchSelect
                            value={line.journal}
                            onChange={(value) => updateLine(index, 'journal', value)}
                            options={journals}
                            getLabel={(journal) => optionLabel(journal)}
                            placeholder="Journal"
                            bordered={false}
                          />
                        </td>
                        <td data-method-field="payment_account" className="border-r border-gray-200 p-0">
                          <SearchSelect
                            value={line.payment_account}
                            onChange={(value) => updateLine(index, 'payment_account', value)}
                            options={accounts}
                            getLabel={(account) => optionLabel(account)}
                            placeholder="Compte"
                            bordered={false}
                          />
                        </td>
                        <td data-method-field="sequence" className="border-r border-gray-200 p-0">
                          <input
                            type="number"
                            min="1"
                            step="1"
                            value={line.sequence}
                            onChange={(event) => updateLine(index, 'sequence', event.target.value)}
                            onKeyDown={(event) => handleLineTab(event, index, 'sequence')}
                            className="h-[26px] w-full border-0 px-2 text-right text-xs outline-none focus:bg-purple-50"
                            title="Les plus petits nombres apparaissent en premier"
                          />
                        </td>
                        <td className="p-0 text-center">
                          <button
                            type="button"
                            onClick={() => removeLine(index)}
                            className="p-2 text-gray-400 hover:text-red-600"
                            title="Supprimer la ligne"
                          >
                            <FiTrash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button
                type="button"
                onClick={addLine}
                className="mt-3 flex h-8 items-center gap-1 bg-purple-600 px-3 text-xs font-medium text-white hover:bg-purple-700"
              >
                <FiPlus size={13} />
                Ajouter une ligne
              </button>
            </div>
          )}

          {activeTab === 'advanced' && (
            <div className="px-4 py-4">
              <Field label="Méthode active">
                <div className="flex h-[26px] items-center gap-2">
                  <StatusSwitch
                    checked={formData.active}
                    onChange={(value) => setField('active', value)}
                  />
                  <span className="text-xs text-gray-600">
                    {formData.active ? 'Activée' : 'Désactivée'}
                  </span>
                </div>
              </Field>
            </div>
          )}
        </div>
      )}
    </UnifiedFormPage>
  );
}
