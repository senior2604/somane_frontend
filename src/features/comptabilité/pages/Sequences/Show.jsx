// src/features/comptabilite/pages/Sequences/Show.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  FiCheck,
  FiClock,
  FiEye,
  FiEyeOff,
  FiHash,
  FiInfo,
  FiLoader,
  FiSettings,
  FiUploadCloud,
} from 'react-icons/fi';
import UnifiedFormPage from '../../../../components/UnifiedFormPage';
import { useEntity } from '../../../../context/EntityContext';
import { sequencesService } from '../../services';

const DOCUMENT_SEQUENCE_TYPES = [
  {
    code: 'PIECE',
    backendCode: 'account.move',
    label: 'Pièces comptables',
    description: 'Numérotation des pièces comptables.',
    aliases: ['PIECE', 'ACCOUNT.MOVE', 'ACCOUNT_MOVE', 'ACCOUNT MOVE'],
  },
  {
    code: 'FACTURE',
    backendCode: 'account.invoice',
    label: 'Factures',
    description: 'Numérotation des factures.',
    aliases: ['FACTURE', 'FACTURES', 'ACCOUNT.INVOICE', 'ACCOUNT_INVOICE', 'ACCOUNT INVOICE'],
  },
  {
    code: 'PAIEMENT',
    backendCode: 'account.payment',
    label: 'Paiements',
    description: 'Numérotation des paiements.',
    aliases: ['PAIEMENT', 'PAIEMENTS', 'PAYMENT', 'ACCOUNT.PAYMENT', 'ACCOUNT_PAYMENT', 'ACCOUNT PAYMENT'],
  },
  {
    code: 'AVOIR',
    backendCode: 'account.refund',
    label: 'Avoirs',
    description: 'Numérotation des avoirs.',
    aliases: ['AVOIR', 'AVOIRS', 'REFUND', 'ACCOUNT.REFUND', 'ACCOUNT_REFUND', 'ACCOUNT REFUND'],
  },
  {
    code: 'RELEVE',
    backendCode: 'account.bank.statement',
    label: 'Relevés bancaires',
    description: 'Numérotation des relevés bancaires.',
    aliases: ['RELEVE', 'RELEVES', 'ACCOUNT.BANK.STATEMENT', 'ACCOUNT_BANK_STATEMENT', 'ACCOUNT BANK STATEMENT'],
  },
  {
    code: 'RAPPROCHEMENT',
    backendCode: 'account.reconcile',
    label: 'Rapprochements',
    description: 'Numérotation des rapprochements.',
    aliases: ['RAPPROCHEMENT', 'RAPPROCHEMENTS', 'LETTRAGE', 'ACCOUNT.RECONCILE', 'ACCOUNT_RECONCILE', 'ACCOUNT RECONCILE'],
  },
];

const DETAIL_CACHE_PREFIX = 'comptabilite:sequences:detail:v2';
const LIST_CACHE_PREFIX = 'comptabilite:sequences:list:v2';
const detailMemoryCache = new Map();
const pendingDetailRequests = new Map();

const normalizeText = (value) => String(value ?? '')
  .trim()
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '');

const normalizeCode = (value) => normalizeText(value)
  .replace(/[_\s-]+/g, '.')
  .toUpperCase();

const getSequenceType = (code) => {
  const normalized = normalizeCode(code);
  return DOCUMENT_SEQUENCE_TYPES.find((type) => (
    normalizeCode(type.code) === normalized
    || normalizeCode(type.backendCode) === normalized
    || type.aliases.some((alias) => normalizeCode(alias) === normalized)
  )) || null;
};

const normalizeSequence = (data = {}) => ({
  id: data?.id || '',
  name: data?.name || '',
  code: String(data?.code || ''),
  prefix: String(data?.prefix || ''),
  suffix: String(data?.suffix || ''),
  padding: Math.max(1, Number(data?.padding || 2)),
  current_number: Math.max(0, Number(data?.current_number || 0)),
  number_increment: Math.max(1, Number(data?.number_increment || 1)),
  active: data?.active !== false,
  company: data?.company?.id || data?.company || data?.company_id || '',
});

const padNumber = (value, padding) => String(Math.max(0, Number(value || 0)))
  .padStart(Math.max(1, Number(padding || 2)), '0');

const formatPattern = (sequence) => (
  `${sequence?.prefix || ''}${'0'.repeat(Math.max(1, Number(sequence?.padding || 2)))}${sequence?.suffix || ''}`
);

const formatCurrentNumber = (sequence) => (
  `${sequence?.prefix || ''}${padNumber(sequence?.current_number, sequence?.padding)}${sequence?.suffix || ''}`
);

const formatNextNumber = (sequence) => {
  const next = Number(sequence?.current_number || 0) + Number(sequence?.number_increment || 1);
  return `${sequence?.prefix || ''}${padNumber(next, sequence?.padding)}${sequence?.suffix || ''}`;
};

const stringifyBackendError = (error, fallback = 'Erreur lors de la sauvegarde de la séquence.') => {
  const data = error?.response?.data || error?.data;
  if (!data) return error?.message || fallback;
  if (typeof data === 'string') return data;
  if (typeof data?.detail === 'string') return data.detail;
  if (Array.isArray(data?.detail)) return data.detail.join(' ');
  if (Array.isArray(data?.non_field_errors)) return data.non_field_errors.join(' ');

  const message = Object.entries(data)
    .map(([field, value]) => `${field} : ${Array.isArray(value) ? value.join(' ') : String(value)}`)
    .join(' | ');
  return message || error?.message || fallback;
};

const readJson = (key) => {
  try {
    return JSON.parse(sessionStorage.getItem(key) || 'null');
  } catch (error) {
    return null;
  }
};

const writeJson = (key, value) => {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    // Le cache mémoire reste utilisé si sessionStorage n'est pas disponible.
  }
};

const getDetailCacheKey = (entityId, id) => `${DETAIL_CACHE_PREFIX}:${entityId || 'global'}:${id || 'unknown'}`;
const getListCacheKey = (entityId) => `${LIST_CACHE_PREFIX}:${entityId || 'global'}`;

const readCachedSequence = (entityId, id) => {
  const detailKey = getDetailCacheKey(entityId, id);
  if (detailMemoryCache.has(detailKey)) return detailMemoryCache.get(detailKey);

  const detail = readJson(detailKey);
  if (detail && String(detail.id) === String(id)) {
    detailMemoryCache.set(detailKey, detail);
    return detail;
  }

  const list = readJson(getListCacheKey(entityId));
  if (Array.isArray(list)) {
    const row = list.find((item) => String(item.id) === String(id));
    if (row) {
      detailMemoryCache.set(detailKey, row);
      return row;
    }
  }
  return null;
};

const writeCachedSequence = (entityId, sequence) => {
  if (!sequence?.id) return;
  const detailKey = getDetailCacheKey(entityId, sequence.id);
  detailMemoryCache.set(detailKey, sequence);
  writeJson(detailKey, sequence);

  const listKey = getListCacheKey(entityId);
  const currentList = readJson(listKey);
  if (!Array.isArray(currentList)) return;

  const nextList = currentList.map((item) => (
    String(item.id) === String(sequence.id)
      ? { ...item, ...sequence }
      : item
  ));
  writeJson(listKey, nextList);
};

const fetchSequenceOnce = (id, entityId) => {
  const key = `${entityId || 'global'}:${id}`;
  if (pendingDetailRequests.has(key)) return pendingDetailRequests.get(key);

  const request = Promise.resolve(sequencesService.getById(id, entityId))
    .finally(() => pendingDetailRequests.delete(key));
  pendingDetailRequests.set(key, request);
  return request;
};

const FieldLabel = ({ children, required = false }) => (
  <label className="w-[150px] shrink-0 text-xs font-medium text-gray-700">
    {children}{required && <span className="ml-0.5 text-red-500">*</span>}
  </label>
);

const FieldRow = ({ label, required = false, children }) => (
  <div className="flex h-[30px] min-w-0 items-center">
    <FieldLabel required={required}>{label}</FieldLabel>
    <div className="min-w-0 flex-1">{children}</div>
  </div>
);

const Input = ({ value, onChange, type = 'text', min, max, disabled = false, placeholder = '', mono = false }) => (
  <input
    type={type}
    value={value}
    min={min}
    max={max}
    disabled={disabled}
    placeholder={placeholder}
    onChange={(event) => onChange(event.target.value)}
    className={`h-[30px] w-full border border-gray-300 bg-white px-2 text-xs text-gray-800 outline-none transition-colors focus:border-purple-500 focus:ring-1 focus:ring-purple-100 disabled:bg-gray-50 disabled:text-gray-500 ${mono ? 'font-mono' : ''}`}
  />
);

const ReadOnlyValue = ({ children, mono = false }) => (
  <div className={`flex h-[30px] w-full items-center border border-gray-300 bg-gray-50 px-2 text-xs text-gray-700 ${mono ? 'font-mono' : ''}`}>
    <span className="truncate" title={String(children || '')}>{children || '—'}</span>
  </div>
);

const PreviewValue = ({ label, value, tone }) => {
  const tones = {
    purple: 'border-purple-200 bg-purple-50 text-purple-700',
    green: 'border-green-200 bg-green-50 text-green-700',
    gray: 'border-gray-200 bg-gray-50 text-gray-800',
  };

  return (
    <div className="min-w-0 border-r border-gray-200 px-4 py-4 last:border-r-0">
      <div className="mb-2 text-xs text-gray-500">{label}</div>
      <div className={`truncate border px-3 py-2 font-mono text-base font-semibold ${tones[tone] || tones.gray}`} title={value}>
        {value || '—'}
      </div>
    </div>
  );
};

export default function SequencesShow() {
  const { id } = useParams();
  const { activeEntity } = useEntity();
  const entityId = activeEntity?.id || activeEntity?.company_id || '';
  const cachedSequenceRef = useRef(readCachedSequence(entityId, id));
  const actionsMenuRef = useRef(null);

  const [formData, setFormData] = useState(() => normalizeSequence(cachedSequenceRef.current || {}));
  const [initialData, setInitialData] = useState(() => normalizeSequence(cachedSequenceRef.current || {}));
  const [loading, setLoading] = useState(!cachedSequenceRef.current);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('parameters');
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [showTraceability, setShowTraceability] = useState(false);

  const sequenceType = useMemo(() => getSequenceType(formData.code), [formData.code]);
  const hasUnsavedChanges = useMemo(
    () => JSON.stringify(formData) !== JSON.stringify(initialData),
    [formData, initialData],
  );

  const loadSequence = useCallback(async ({ silent = false } = {}) => {
    if (!id || !entityId) return null;
    if (!silent) setLoading(true);
    setError('');

    try {
      const response = await fetchSequenceOnce(id, entityId);
      const normalized = normalizeSequence(response);
      setFormData(normalized);
      setInitialData(normalized);
      writeCachedSequence(entityId, normalized);
      return normalized;
    } catch (requestError) {
      setError(stringifyBackendError(requestError, 'Impossible de charger la séquence.'));
      return null;
    } finally {
      setLoading(false);
    }
  }, [entityId, id]);

  useEffect(() => {
    const cached = readCachedSequence(entityId, id);
    if (cached) {
      const normalized = normalizeSequence(cached);
      setFormData(normalized);
      setInitialData(normalized);
      setLoading(false);
      loadSequence({ silent: true });
      return;
    }
    loadSequence();
  }, [entityId, id, loadSequence]);

  useEffect(() => {
    const closeMenu = (event) => {
      if (actionsMenuRef.current && !actionsMenuRef.current.contains(event.target)) {
        setShowActionsMenu(false);
      }
    };
    document.addEventListener('mousedown', closeMenu);
    return () => document.removeEventListener('mousedown', closeMenu);
  }, []);

  const updateField = useCallback((field, value) => {
    setFormData((current) => ({ ...current, [field]: value }));
    setError('');
    setSuccess('');
  }, []);

  const validate = useCallback(() => {
    if (!String(formData.name || '').trim()) return 'Le nom est obligatoire.';
    if (!String(formData.code || '').trim()) return 'Le type de document est obligatoire.';
    if (!String(formData.prefix || '').trim()) return 'Le préfixe est obligatoire.';
    if (Number(formData.padding) < 1 || Number(formData.padding) > 10) {
      return 'La longueur doit être comprise entre 1 et 10.';
    }
    if (Number(formData.current_number) < 0) return 'Le numéro courant ne peut pas être négatif.';
    if (Number(formData.number_increment) < 1) return "L'incrément doit être supérieur ou égal à 1.";
    return '';
  }, [formData]);

  const buildPayload = useCallback(() => ({
    name: String(formData.name || '').trim(),
    code: String(formData.code || '').trim(),
    prefix: String(formData.prefix || '').trim(),
    suffix: String(formData.suffix || '').trim(),
    padding: Number(formData.padding || 2),
    current_number: Number(formData.current_number || 0),
    number_increment: Number(formData.number_increment || 1),
    active: Boolean(formData.active),
    ...(entityId ? { company: entityId } : {}),
  }), [entityId, formData]);

  const saveSequence = useCallback(async () => {
    const validationMessage = validate();
    if (validationMessage) {
      setError(validationMessage);
      return false;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const response = await sequencesService.update(id, buildPayload(), entityId);
      const normalized = normalizeSequence(response?.id ? response : { ...formData, ...response, id });
      setFormData(normalized);
      setInitialData(normalized);
      writeCachedSequence(entityId, normalized);
      setSuccess('Séquence mise à jour. Les anciens documents conservent leur numéro.');
      return normalized;
    } catch (requestError) {
      setError(stringifyBackendError(requestError));
      return false;
    } finally {
      setSaving(false);
    }
  }, [buildPayload, entityId, formData, id, validate]);

  const feedback = error
    ? { type: 'error', message: error }
    : success
      ? { type: 'success', message: success }
      : null;

  const actionsMenu = (
    <div ref={actionsMenuRef} className="relative">
      <button
        type="button"
        onClick={() => setShowActionsMenu((open) => !open)}
        className="flex h-8 items-center gap-1 border border-gray-300 px-3 text-xs text-gray-700 transition-all duration-200 hover:scale-105 hover:border-purple-500 hover:bg-purple-50 hover:text-purple-700"
        title="Actions"
      >
        <FiSettings size={12} />
        Actions
      </button>
      {showActionsMenu && (
        <div className="absolute right-0 top-full z-[120] mt-1 w-56 border border-gray-300 bg-white py-1 shadow-lg">
          <button
            type="button"
            onClick={() => {
              setShowTraceability((open) => !open);
              setShowActionsMenu(false);
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-gray-700 transition-colors hover:bg-purple-50 hover:text-purple-700"
          >
            {showTraceability ? <FiEyeOff size={13} /> : <FiEye size={13} />}
            {showTraceability ? 'Masquer la traçabilité' : 'Afficher la traçabilité'}
          </button>
        </div>
      )}
    </div>
  );

  const traceabilityContent = (
    <div className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-700">Activité liée à la séquence</span>
        <span className="text-xs text-gray-500">0 événement(s)</span>
      </div>
      <div className="border border-gray-200 bg-white px-4 py-6 text-center">
        <FiClock className="mx-auto mb-2 text-gray-400" size={28} />
        <div className="text-xs text-gray-600">Aucune traçabilité disponible</div>
        <div className="mt-1 text-[11px] leading-4 text-gray-500">
          Les actions liées à cette séquence apparaîtront ici lorsque le backend les exposera.
        </div>
      </div>
    </div>
  );

  if (!activeEntity) {
    return (
      <UnifiedFormPage
        title="Séquences"
        mode="show"
        fallbackPath="/comptabilite/sequences"
        primaryAction={null}
        noContext={(
          <div className="border border-amber-200 bg-amber-50 p-5 text-center text-sm text-amber-800">
            Sélectionnez une société pour afficher cette séquence.
          </div>
        )}
      />
    );
  }

  if (!id) {
    return (
      <UnifiedFormPage
        title="Séquences"
        mode="show"
        fallbackPath="/comptabilite/sequences"
        primaryAction={null}
        noContext={(
          <div className="border border-red-200 bg-red-50 p-5 text-center text-sm text-red-700">
            Identifiant de séquence manquant.
          </div>
        )}
      />
    );
  }

  if (loading && !formData.id) {
    return (
      <UnifiedFormPage
        title="Séquences"
        mode="show"
        fallbackPath="/comptabilite/sequences"
        primaryAction={null}
        noContext={(
          <div className="flex items-center justify-center gap-3 py-8 text-sm text-gray-600">
            <FiLoader className="animate-spin text-purple-600" size={22} />
            Chargement de la séquence...
          </div>
        )}
      />
    );
  }

  return (
    <UnifiedFormPage
      title="Séquences"
      recordLabel={formData.name || sequenceType?.label || 'Séquence'}
      pageLabel="Modification de la séquence"
      mode="show"
      fallbackPath="/comptabilite/sequences"
      primaryAction={{
        label: 'Séquences',
        icon: <FiHash size={13} />,
        path: '/comptabilite/sequences',
        title: 'Revenir aux séquences',
      }}
      actionsMenu={actionsMenu}
      onSave={saveSequence}
      saveLabel="Enregistrer"
      saveIcon={saving ? <FiLoader className="animate-spin" size={16} /> : <FiUploadCloud size={16} />}
      saving={saving}
      saveDisabled={!hasUnsavedChanges || loading}
      autoReturnAfterSave
      hasUnsavedChanges={hasUnsavedChanges}
      exitTitle="Modifications non sauvegardées"
      exitMessage="Cette séquence contient des modifications non sauvegardées. Voulez-vous les enregistrer avant de quitter ?"
      exitSaveLabel="Enregistrer"
      rememberForm={false}
      feedback={feedback}
      onDismissFeedback={() => {
        setError('');
        setSuccess('');
      }}
      messageDuration={15000}
      traceability={{
        open: showTraceability,
        onOpen: () => setShowTraceability(true),
        onClose: () => setShowTraceability(false),
        title: 'Traçabilité',
        content: traceabilityContent,
      }}
    >
      <div className="min-w-0">
        <div className="border-b border-gray-300 px-4 py-3">
          <div className="grid grid-cols-1 gap-x-6 gap-y-2 lg:grid-cols-2">
            <FieldRow label="Nom" required>
              <Input
                value={formData.name}
                onChange={(value) => updateField('name', value)}
                placeholder="Nom de la séquence"
              />
            </FieldRow>
            <FieldRow label="Type de document" required>
              <ReadOnlyValue>{sequenceType?.label || formData.code}</ReadOnlyValue>
            </FieldRow>
            <FieldRow label="Société">
              <ReadOnlyValue>{activeEntity?.raison_sociale || activeEntity?.nom || activeEntity?.name}</ReadOnlyValue>
            </FieldRow>
            <FieldRow label="Statut">
              <ReadOnlyValue>{formData.active ? 'Active' : 'Inactive'}</ReadOnlyValue>
            </FieldRow>
          </div>
        </div>

        <div className="border-b border-gray-300 px-4">
          <div className="flex min-w-max">
            {[
              { id: 'parameters', label: 'Paramètres' },
              { id: 'preview', label: 'Aperçu' },
              { id: 'advanced', label: 'Paramètres avancés' },
              { id: 'notes', label: 'Notes' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`border-b-2 px-4 py-2 text-xs font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'border-purple-600 text-purple-700'
                    : 'border-transparent text-gray-500 hover:border-purple-200 hover:text-purple-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {activeTab === 'parameters' && (
          <div className="px-4 py-4">
            <div className="grid grid-cols-1 gap-x-6 gap-y-3 lg:grid-cols-2">
              <FieldRow label="Préfixe" required>
                <Input
                  value={formData.prefix}
                  onChange={(value) => updateField('prefix', value)}
                  placeholder="Ex. FAC/26/"
                  mono
                />
              </FieldRow>
              <FieldRow label="Suffixe">
                <Input
                  value={formData.suffix}
                  onChange={(value) => updateField('suffix', value)}
                  placeholder="Optionnel"
                  mono
                />
              </FieldRow>
              <FieldRow label="Numéro courant" required>
                <Input
                  type="number"
                  min={0}
                  value={formData.current_number}
                  onChange={(value) => updateField('current_number', Math.max(0, Number(value || 0)))}
                />
              </FieldRow>
              <FieldRow label="Longueur" required>
                <Input
                  type="number"
                  min={1}
                  max={10}
                  value={formData.padding}
                  onChange={(value) => updateField('padding', Math.min(10, Math.max(1, Number(value || 1))))}
                />
              </FieldRow>
              <FieldRow label="Incrément" required>
                <Input
                  type="number"
                  min={1}
                  value={formData.number_increment}
                  onChange={(value) => updateField('number_increment', Math.max(1, Number(value || 1)))}
                />
              </FieldRow>
              <FieldRow label="Code technique">
                <ReadOnlyValue mono>{formData.code}</ReadOnlyValue>
              </FieldRow>
            </div>
          </div>
        )}

        {activeTab === 'preview' && (
          <div className="px-4 py-4">
            <div className="grid grid-cols-1 border border-gray-200 md:grid-cols-3">
              <PreviewValue label="Format" value={formatPattern(formData)} tone="purple" />
              <PreviewValue label="Numéro actuel" value={formatCurrentNumber(formData)} tone="gray" />
              <PreviewValue label="Prochain numéro" value={formatNextNumber(formData)} tone="green" />
            </div>
          </div>
        )}

        {activeTab === 'advanced' && (
          <div className="px-4 py-4">
            <div className="flex min-h-[34px] items-center gap-3">
              <FieldLabel>Statut</FieldLabel>
              <button
                type="button"
                role="switch"
                aria-checked={formData.active}
                onClick={() => updateField('active', !formData.active)}
                className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors ${
                  formData.active ? 'bg-purple-600' : 'bg-gray-300'
                }`}
              >
                <span className={`mt-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                  formData.active ? 'translate-x-5' : 'translate-x-0.5'
                }`} />
              </button>
              <span className="text-xs text-gray-600">{formData.active ? 'Active' : 'Inactive'}</span>
            </div>
          </div>
        )}

        {activeTab === 'notes' && (
          <div className="px-4 py-4">
            <div className="flex items-start gap-2 border border-gray-200 bg-gray-50 px-3 py-3 text-xs leading-5 text-gray-600">
              <FiInfo className="mt-0.5 shrink-0 text-purple-600" size={14} />
              <div>
                <div>{sequenceType?.description || 'Numérotation des futurs documents.'}</div>
                <div>La modification de cette séquence ne renumérote jamais les documents déjà enregistrés.</div>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between border-t border-gray-300 bg-gray-50 px-4 py-2 text-xs text-gray-600">
          <span className="inline-flex items-center gap-1">
            {formData.active && <FiCheck className="text-green-600" size={13} />}
            {sequenceType?.label || formData.code || 'Séquence'}
          </span>
          <span className="font-mono">Prochain numéro : {formatNextNumber(formData)}</span>
        </div>
      </div>
    </UnifiedFormPage>
  );
}
