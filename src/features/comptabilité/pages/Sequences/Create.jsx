// src/features/comptabilite/pages/Sequences/Create.jsx
import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiAlertCircle,
  FiCheck,
  FiInfo,
  FiPlus,
  FiUploadCloud,
  FiX,
} from 'react-icons/fi';
import { apiClient } from '../../../../services/apiClient';
import { useEntity } from '../../../../context/EntityContext';

const DOCUMENT_SEQUENCE_TYPES = [
  {
    code: 'PIECE',
    label: 'Pieces comptables',
    defaultName: 'Sequence pieces comptables',
    defaultPrefix: '{PREFIXE}/AA/',
    description: 'Utilise le prefixe du journal : ACH, VTE, BAN, CAI, OD.',
  },
  {
    code: 'FACTURE',
    label: 'Factures',
    defaultName: 'Sequence factures',
    defaultPrefix: 'FAC/AA/',
    description: 'Utilisee pour les factures clients ou fournisseurs.',
  },
  {
    code: 'PAIEMENT',
    label: 'Paiements',
    defaultName: 'Sequence paiements',
    defaultPrefix: 'PAY/AA/',
    description: 'Utilisee pour les encaissements, decaissements et transferts.',
  },
  {
    code: 'AVOIR',
    label: 'Avoirs',
    defaultName: 'Sequence avoirs',
    defaultPrefix: 'AV/AA/',
    description: 'Utilisee pour les avoirs et corrections commerciales.',
  },
  {
    code: 'RELEVE',
    label: 'Releves bancaires',
    defaultName: 'Sequence releves bancaires',
    defaultPrefix: 'REL/AA/',
    description: 'Utilisee pour les releves et imports bancaires.',
  },
  {
    code: 'RAPPROCHEMENT',
    label: 'Rapprochements',
    defaultName: 'Sequence rapprochements',
    defaultPrefix: 'RAP/AA/',
    description: 'Utilisee pour les rapprochements et controles.',
  },
];

const getCurrentYearShort = () => String(new Date().getFullYear()).slice(-2);

const normalizeApiList = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.records)) return data.records;
  return [];
};

const padNumber = (value, padding) => String(Number(value || 0)).padStart(Number(padding || 2), '0');

const stringifyBackendError = (error) => {
  const data = error?.response?.data || error?.data || error;
  if (!data) return error?.message || 'Erreur lors de la creation de la sequence.';
  if (typeof data === 'string') return data;
  if (data.detail) return Array.isArray(data.detail) ? data.detail.join(' ') : String(data.detail);
  if (data.non_field_errors) return Array.isArray(data.non_field_errors) ? data.non_field_errors.join(' ') : String(data.non_field_errors);
  return Object.entries(data)
    .map(([field, value]) => `${field} : ${Array.isArray(value) ? value.join(' ') : String(value)}`)
    .join(' | ') || error?.message || 'Erreur lors de la creation de la sequence.';
};

const sanitizeTemplate = (value) => String(value || '')
  .toUpperCase()
  .replace(/[^A-Z0-9_{}\/.-]/g, '')
  .slice(0, 64);

const renderPreview = (sequence, examplePrefix = 'ACH') => {
  const year = getCurrentYearShort();
  const prefix = String(sequence.prefix || '')
    .replaceAll('{PREFIXE}', examplePrefix)
    .replaceAll('PREFIXE', examplePrefix)
    .replaceAll('AAAA', `20${year}`)
    .replaceAll('AA', year);
  const next = Number(sequence.current_number || 0) + Number(sequence.number_increment || 1);
  return `${prefix}${padNumber(next, sequence.padding)}${sequence.suffix || ''}`;
};

const Tooltip = ({ children, text }) => {
  const [show, setShow] = useState(false);
  return (
    <div className="relative inline-block" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      {children}
      {show && (
        <div className="absolute bottom-full left-1/2 z-50 mb-1 -translate-x-1/2 whitespace-nowrap rounded bg-gray-800 px-2 py-1 text-xs text-white">
          {text}
        </div>
      )}
    </div>
  );
};

const RequiredLabel = ({ children, required = false }) => (
  <label className="w-[150px] flex-shrink-0 text-xs font-medium text-gray-700">
    {children}{required && <span className="text-red-500">*</span>}
  </label>
);

const FieldInput = ({ value, onChange, placeholder, type = 'text', disabled = false, className = '', min, max }) => (
  <input
    type={type}
    value={value}
    onChange={(event) => onChange(event.target.value)}
    disabled={disabled}
    placeholder={placeholder}
    min={min}
    max={max}
    className={`ml-2 h-[26px] flex-1 border border-gray-300 px-2 py-1 text-xs transition-colors hover:border-purple-400 focus:border-purple-600 focus:outline-none disabled:bg-gray-100 disabled:text-gray-400 ${className}`}
  />
);

export default function SequencesCreate() {
  const navigate = useNavigate();
  const { activeEntity } = useEntity();

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    prefix: '',
    suffix: '',
    padding: 2,
    current_number: 0,
    number_increment: 1,
    active: true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [activeTab, setActiveTab] = useState('parametres');

  const selectedType = useMemo(
    () => DOCUMENT_SEQUENCE_TYPES.find((type) => type.code === formData.code) || null,
    [formData.code],
  );

  const preview = useMemo(() => renderPreview(formData), [formData]);

  const handleChange = (field, value) => {
    setFormData((previous) => ({ ...previous, [field]: value }));
    setHasUnsavedChanges(true);
    setError('');
    setSuccess('');
  };

  const handleTypeChange = (code) => {
    const type = DOCUMENT_SEQUENCE_TYPES.find((item) => item.code === code) || null;
    setFormData((previous) => ({
      ...previous,
      code: type?.code || '',
      name: type?.defaultName || '',
      prefix: type?.defaultPrefix || '',
      suffix: previous.suffix || '',
    }));
    setHasUnsavedChanges(true);
    setError('');
    setSuccess('');
  };

  const validateForm = async () => {
    if (!activeEntity?.id) return 'Aucune entite selectionnee.';
    if (!formData.code) return 'Le type de document est obligatoire.';
    if (!String(formData.name || '').trim()) return 'Le nom est obligatoire.';
    if (!String(formData.prefix || '').trim()) return 'Le modele de prefixe est obligatoire.';
    if (Number(formData.padding) < 1 || Number(formData.padding) > 10) return 'La longueur doit etre comprise entre 1 et 10.';
    if (Number(formData.current_number) < 0) return 'Le compteur courant ne peut pas etre negatif.';
    if (Number(formData.number_increment) < 1) return "L'increment doit etre superieur ou egal a 1.";

    if (formData.active) {
      try {
        const response = await apiClient.get(`/sequences/?company=${activeEntity.id}&page_size=500`);
        const existing = normalizeApiList(response?.data ?? response).find((sequence) => (
          String(sequence.code || '').toUpperCase() === String(formData.code || '').toUpperCase()
          && sequence.active !== false
        ));
        if (existing) {
          return `Une sequence active existe deja pour ${selectedType?.label || formData.code}. Modifiez-la au lieu d'en creer une autre.`;
        }
      } catch {
        return '';
      }
    }

    return '';
  };

  const buildPayload = () => ({
    name: String(formData.name || '').trim(),
    code: String(formData.code || '').trim().toUpperCase(),
    prefix: sanitizeTemplate(formData.prefix),
    suffix: sanitizeTemplate(formData.suffix),
    padding: Number(formData.padding || 2),
    current_number: Number(formData.current_number || 0),
    number_increment: Number(formData.number_increment || 1),
    active: Boolean(formData.active),
    ...(activeEntity?.id ? { company: activeEntity.id } : {}),
  });

  const handleSave = async () => {
    const validation = await validateForm();
    if (validation) {
      setError(validation);
      return;
    }

    setIsSubmitting(true);
    setError('');
    setSuccess('');
    try {
      await apiClient.post('/sequences/', buildPayload());
      setSuccess('Sequence creee. Elle sera utilisee uniquement pour les prochains numeros.');
      setHasUnsavedChanges(false);
      setTimeout(() => navigate('/comptabilite/sequences'), 700);
    } catch (err) {
      console.error('Erreur creation sequence', err);
      setError(stringifyBackendError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="mx-auto max-w-7xl border border-gray-300 bg-white">
        <div className="border-b border-gray-300 px-4 py-3">
          <div className="mb-2 flex items-start justify-between">
            <div className="flex items-start gap-3">
              <Tooltip text="Nouvelle sequence">
                <button
                  type="button"
                  onClick={() => navigate('/comptabilite/sequences/create')}
                  className="flex h-8 items-center gap-1 border border-purple-600 bg-purple-600 px-3 text-xs text-white transition-all duration-200 hover:border-purple-700 hover:bg-purple-700 hover:shadow-md active:scale-95"
                >
                  <FiPlus size={12} />
                  <span>Nouveau</span>
                </button>
              </Tooltip>
              <div className="flex flex-col">
                <button
                  type="button"
                  onClick={() => navigate('/comptabilite/sequences')}
                  className="text-left text-lg font-bold text-gray-900 transition-all duration-200 hover:text-purple-600"
                >
                  Sequences
                </button>
                <div className="mt-0.5 text-sm text-gray-600">
                  Creation - {selectedType?.label || 'Choisir un type de document'}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Tooltip text="Enregistrer la sequence">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSubmitting}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-600 text-white shadow-sm transition-all duration-200 hover:bg-purple-700 hover:shadow-lg active:scale-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <FiUploadCloud size={16} />
                </button>
              </Tooltip>
              <Tooltip text="Annuler">
                <button
                  type="button"
                  onClick={() => navigate('/comptabilite/sequences')}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-black text-white transition-all duration-200 hover:bg-gray-800 hover:shadow-lg active:scale-90"
                >
                  <FiX size={16} />
                </button>
              </Tooltip>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between border-b border-gray-300 px-4 py-3">
          <div className="flex items-center gap-3">
            <Tooltip text={formData.active ? 'Desactiver la sequence' : 'Activer la sequence'}>
              <button
                type="button"
                onClick={() => handleChange('active', !formData.active)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${
                  formData.active ? 'bg-purple-600' : 'bg-gray-200'
                }`}
                role="switch"
                aria-checked={formData.active}
              >
                <span
                  aria-hidden="true"
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    formData.active ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </Tooltip>
            <span className="text-sm font-medium text-gray-700">Activer/Desactiver</span>
            {(error || success) && (
              <div className={`ml-2 inline-flex max-w-2xl items-start gap-2 border px-3 py-1.5 text-xs ${
                error ? 'border-red-200 bg-red-50 text-red-700' : 'border-green-200 bg-green-50 text-green-700'
              }`}>
                <span className="mt-0.5 flex-shrink-0">
                  {error ? <FiAlertCircle size={13} /> : <FiCheck size={13} />}
                </span>
                <span className="whitespace-pre-line leading-4">{error || success}</span>
              </div>
            )}
          </div>
        </div>

        {hasUnsavedChanges && (
          <div className="flex items-center justify-between border-b border-blue-200 bg-blue-50 px-4 py-1 text-xs text-blue-700">
            <span>Modifications non sauvegardees</span>
            {isSubmitting && <span className="animate-pulse">Sauvegarde en cours...</span>}
          </div>
        )}

        <div className="border-b border-gray-300 px-4 py-3">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="flex items-center" style={{ height: '26px' }}>
              <RequiredLabel required>Type de document</RequiredLabel>
              <select
                value={formData.code}
                onChange={(event) => handleTypeChange(event.target.value)}
                className="ml-2 h-[26px] flex-1 border border-gray-300 bg-white px-2 py-1 text-xs transition-colors hover:border-purple-400 focus:border-purple-600 focus:outline-none"
              >
                <option value="">Selectionner</option>
                {DOCUMENT_SEQUENCE_TYPES.map((type) => (
                  <option key={type.code} value={type.code}>{type.label}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center" style={{ height: '26px' }}>
              <RequiredLabel required>Nom</RequiredLabel>
              <FieldInput value={formData.name} onChange={(value) => handleChange('name', value)} placeholder="Sequence paiements" />
            </div>
          </div>
        </div>

        <div className="border-b border-gray-300">
          <div className="flex px-4">
            {[
              { id: 'parametres', label: 'Parametres' },
              { id: 'apercu', label: 'Apercu' },
              { id: 'notes', label: 'Notes' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`border-b-2 px-4 py-2 text-xs font-medium transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'border-purple-600 text-purple-600'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-4">
          {activeTab === 'parametres' && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div className="flex items-center" style={{ height: '26px' }}>
                  <RequiredLabel required>Modele prefixe</RequiredLabel>
                  <FieldInput
                    value={formData.prefix}
                    onChange={(value) => handleChange('prefix', sanitizeTemplate(value))}
                    placeholder="{PREFIXE}/AA/ ou PAY/AA/"
                    className="font-mono"
                  />
                </div>
                <div className="flex items-center" style={{ height: '26px' }}>
                  <RequiredLabel>Suffixe</RequiredLabel>
                  <FieldInput value={formData.suffix} onChange={(value) => handleChange('suffix', sanitizeTemplate(value))} placeholder="Optionnel" className="font-mono" />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div className="flex items-center" style={{ height: '26px' }}>
                  <RequiredLabel>Compteur courant</RequiredLabel>
                  <FieldInput type="number" min={0} value={formData.current_number} onChange={(value) => handleChange('current_number', parseInt(value, 10) || 0)} />
                </div>
                <div className="flex items-center" style={{ height: '26px' }}>
                  <RequiredLabel>Longueur numero</RequiredLabel>
                  <FieldInput type="number" min={1} max={10} value={formData.padding} onChange={(value) => handleChange('padding', parseInt(value, 10) || 2)} />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div className="flex items-center" style={{ height: '26px' }}>
                  <RequiredLabel>Increment</RequiredLabel>
                  <FieldInput type="number" min={1} value={formData.number_increment} onChange={(value) => handleChange('number_increment', parseInt(value, 10) || 1)} />
                </div>
                <div className="flex items-center" style={{ height: '26px' }}>
                  <RequiredLabel>Code interne</RequiredLabel>
                  <div className="ml-2 flex h-[26px] flex-1 items-center border border-gray-200 bg-gray-50 px-2 font-mono text-xs text-gray-600">
                    {formData.code || '-'}
                  </div>
                </div>
              </div>

              {selectedType && (
                <div className="border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800">
                  {selectedType.description}
                </div>
              )}
            </div>
          )}

          {activeTab === 'apercu' && (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <div className="border border-gray-200 bg-gray-50 p-3">
                <div className="mb-1 text-xs text-gray-500">Type</div>
                <div className="text-sm font-semibold text-gray-900">{selectedType?.label || '-'}</div>
              </div>
              <div className="border border-gray-200 bg-gray-50 p-3">
                <div className="mb-1 text-xs text-gray-500">Modele</div>
                <div className="font-mono text-lg font-semibold text-purple-700">{formData.prefix || '-'}</div>
              </div>
              <div className="border border-gray-200 bg-gray-50 p-3">
                <div className="mb-1 text-xs text-gray-500">Prochain numero</div>
                <div className="font-mono text-lg font-semibold text-green-700">{preview}</div>
              </div>
            </div>
          )}

          {activeTab === 'notes' && (
            <div className="border border-gray-200 bg-gray-50 px-3 py-3 text-xs text-gray-600">
              Une seule sequence active est autorisee pour chaque type de document et chaque societe. Modifier une sequence change seulement les prochains numeros.
            </div>
          )}

          <div className="mt-4 flex items-start gap-2 border border-purple-200 bg-purple-50 px-3 py-2 text-xs text-purple-800">
            <FiInfo className="mt-0.5 flex-shrink-0" size={13} />
            <div>
              Pour les pieces comptables, le modele peut contenir <span className="font-mono">{'{PREFIXE}'}</span> : il sera remplace par le prefixe du journal.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
