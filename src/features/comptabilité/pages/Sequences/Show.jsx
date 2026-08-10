// src/features/comptabilite/pages/Sequences/Show.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  FiAlertCircle,
  FiArrowRight,
  FiBriefcase,
  FiCheck,
  FiClock,
  FiHash,
  FiInfo,
  FiLoader,
  FiRefreshCw,
  FiSave,
  FiSettings,
  FiX,
} from 'react-icons/fi';
import { useEntity } from '../../../../context/EntityContext';
import { sequencesService } from '../../services';

const DOCUMENT_SEQUENCE_TYPES = [
  { code: 'PIECE', label: 'Pieces comptables', description: 'Numerotation des pieces comptables.' },
  { code: 'FACTURE', label: 'Factures', description: 'Numerotation des factures.' },
  { code: 'PAIEMENT', label: 'Paiements', description: 'Numerotation des paiements.' },
  { code: 'AVOIR', label: 'Avoirs', description: 'Numerotation des avoirs.' },
  { code: 'RELEVE', label: 'Releves bancaires', description: 'Numerotation des releves bancaires.' },
  { code: 'RAPPROCHEMENT', label: 'Rapprochements', description: 'Numerotation des rapprochements.' },
];

const normalizeApiList = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.records)) return data.records;
  return [];
};

const normalizeSequence = (data) => ({
  id: data?.id || '',
  name: data?.name || '',
  code: String(data?.code || '').toUpperCase(),
  prefix: data?.prefix || '',
  suffix: data?.suffix || '',
  padding: Number(data?.padding || 2),
  current_number: Number(data?.current_number || 0),
  number_increment: Number(data?.number_increment || 1),
  active: data?.active !== false,
  company: data?.company || data?.company_id || '',
});

const padNumber = (value, padding) => String(Number(value || 0)).padStart(Number(padding || 2), '0');

const getSequenceType = (code) => (
  DOCUMENT_SEQUENCE_TYPES.find((type) => type.code === String(code || '').toUpperCase()) || null
);

const stringifyBackendError = (error) => {
  const data = error?.response?.data || error?.data || error;
  if (!data) return error?.message || 'Erreur lors de la sauvegarde de la sequence.';
  if (typeof data === 'string') return data;
  if (data.detail) return Array.isArray(data.detail) ? data.detail.join(' ') : String(data.detail);
  if (data.non_field_errors) return Array.isArray(data.non_field_errors) ? data.non_field_errors.join(' ') : String(data.non_field_errors);

  return Object.entries(data)
    .map(([field, value]) => `${field} : ${Array.isArray(value) ? value.join(' ') : String(value)}`)
    .join(' | ') || error?.message || 'Erreur lors de la sauvegarde de la sequence.';
};

const Tooltip = ({ children, text, position = 'top' }) => {
  const [show, setShow] = useState(false);

  return (
    <div className="relative inline-block">
      <div onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
        {children}
      </div>
      {show && (
        <div className={`absolute z-50 rounded bg-gray-800 px-2 py-1 text-xs text-white whitespace-nowrap ${
          position === 'top' ? 'bottom-full left-1/2 mb-1 -translate-x-1/2' :
          position === 'bottom' ? 'top-full left-1/2 mt-1 -translate-x-1/2' :
          position === 'left' ? 'right-full top-1/2 mr-1 -translate-y-1/2' :
          'left-full top-1/2 ml-1 -translate-y-1/2'
        }`}>
          {text}
          <div className={`absolute h-2 w-2 rotate-45 bg-gray-800 ${
            position === 'top' ? 'left-1/2 top-full -mt-1 -translate-x-1/2' :
            position === 'bottom' ? 'bottom-full left-1/2 -mb-1 -translate-x-1/2' :
            position === 'left' ? 'left-full top-1/2 -ml-1 -translate-y-1/2' :
            'right-full top-1/2 -mr-1 -translate-y-1/2'
          }`} />
        </div>
      )}
    </div>
  );
};

const FieldLabel = ({ children, required = false }) => (
  <label className="text-xs text-gray-700 min-w-[145px] font-medium">
    {children}{required && <span className="text-red-500">*</span>}
  </label>
);

const TextField = ({ value, onChange, type = 'text', placeholder = '', disabled = false, className = '', min, max }) => (
  <input
    type={type}
    value={value}
    min={min}
    max={max}
    disabled={disabled}
    placeholder={placeholder}
    onChange={(event) => onChange(event.target.value)}
    className={`flex-1 px-2 py-1 border border-gray-300 text-xs ml-2 h-[26px] focus:outline-none focus:ring-1 focus:ring-purple-500 disabled:bg-gray-100 disabled:text-gray-500 ${className}`}
  />
);

const ReadOnlyField = ({ children, className = '' }) => (
  <div className={`flex-1 px-2 py-1 border border-gray-300 bg-gray-50 text-xs text-gray-900 ml-2 flex items-center h-[26px] ${className}`}>
    {children || '-'}
  </div>
);

export default function SequencesShow() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { activeEntity } = useEntity();
  const actionsMenuRef = useRef(null);

  const [formData, setFormData] = useState(() => normalizeSequence({}));
  const [initialData, setInitialData] = useState(() => normalizeSequence({}));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('parametres');
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [showTraceabilityPanel, setShowTraceabilityPanel] = useState(false);

  const hasUnsavedChanges = useMemo(
    () => JSON.stringify(formData) !== JSON.stringify(initialData),
    [formData, initialData]
  );

  const sequenceType = useMemo(() => getSequenceType(formData.code), [formData.code]);

  const formatPattern = useCallback((sequence = formData) => {
    const zeros = ''.padStart(Number(sequence.padding || 2), '0');
    return `${sequence.prefix || ''}${zeros}${sequence.suffix || ''}`;
  }, [formData]);

  const formatCurrentNumber = useCallback((sequence = formData) => (
    `${sequence.prefix || ''}${padNumber(sequence.current_number, sequence.padding)}${sequence.suffix || ''}`
  ), [formData]);

  const formatNextNumber = useCallback((sequence = formData) => {
    const next = Number(sequence.current_number || 0) + Number(sequence.number_increment || 1);
    return `${sequence.prefix || ''}${padNumber(next, sequence.padding)}${sequence.suffix || ''}`;
  }, [formData]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (actionsMenuRef.current && !actionsMenuRef.current.contains(event.target)) {
        setShowActionsMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleBeforeUnload = (event) => {
      if (!hasUnsavedChanges) return undefined;
      event.preventDefault();
      event.returnValue = '';
      return '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const loadSequence = useCallback(async () => {
    if (!activeEntity || !id) return;

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const data = await sequencesService.getById(id, activeEntity.id);
      const normalized = normalizeSequence(data);
      setFormData(normalized);
      setInitialData(normalized);
    } catch (err) {
      console.error('Erreur chargement sequence:', err);
      setError('Impossible de charger la sequence.');
    } finally {
      setLoading(false);
    }
  }, [activeEntity, id]);

  useEffect(() => {
    loadSequence();
  }, [loadSequence]);

  const handleChange = (field, value) => {
    setFormData((previous) => ({ ...previous, [field]: value }));
    setError('');
    setSuccess('');
  };

  const validateForm = async () => {
    if (!String(formData.name || '').trim()) return 'Le nom est obligatoire.';
    if (!String(formData.code || '').trim()) return 'Le type de document est obligatoire.';
    if (!String(formData.prefix || '').trim()) return 'Le prefixe est obligatoire.';
    if (Number(formData.padding) < 1 || Number(formData.padding) > 10) return 'La longueur doit etre comprise entre 1 et 10.';
    if (Number(formData.current_number) < 0) return 'Le numero courant ne peut pas etre negatif.';
    if (Number(formData.number_increment) < 1) return "L'increment doit etre au moins egal a 1.";

    if (formData.active && activeEntity?.id) {
      try {
        const rows = normalizeApiList(await sequencesService.getAll(activeEntity.id));
        const duplicate = rows.find((sequence) => (
          String(sequence.id) !== String(id)
          && String(sequence.code || '').toUpperCase() === String(formData.code || '').toUpperCase()
          && sequence.active !== false
        ));
        if (duplicate) {
          return `Une sequence active existe deja pour ${sequenceType?.label || formData.code}.`;
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
    prefix: String(formData.prefix || '').toUpperCase(),
    suffix: String(formData.suffix || '').toUpperCase(),
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

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      await sequencesService.update(id, buildPayload(), activeEntity.id);
      setSuccess('Sequence mise a jour. Les changements concernent seulement les prochains numeros.');
      await loadSequence();
    } catch (err) {
      console.error('Erreur sauvegarde sequence:', err);
      setError(stringifyBackendError(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDiscardChanges = () => {
    setFormData(initialData);
    setError('');
    setSuccess('');
  };

  const handleClose = () => {
    if (hasUnsavedChanges && !window.confirm('Des modifications ne sont pas sauvegardees. Quitter sans enregistrer ?')) {
      return;
    }
    navigate('/comptabilite/sequences');
  };

  if (!activeEntity) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-7xl mx-auto bg-white border border-gray-300">
          <div className="border-b border-gray-300 px-4 py-3">
            <div className="text-lg font-bold text-gray-900">Sequence</div>
          </div>
          <div className="p-8">
            <div className="bg-yellow-50 border border-yellow-200 rounded p-6 text-center">
              <FiAlertCircle className="text-yellow-600 mx-auto mb-3" size={32} />
              <p className="text-yellow-800 font-medium text-lg mb-3">Aucune entite selectionnee</p>
              <p className="text-sm text-gray-600 mb-4">Veuillez selectionner une entite pour gerer les sequences.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-7xl mx-auto bg-white border border-gray-300">
          <div className="border-b border-gray-300 px-4 py-3">
            <div className="text-lg font-bold text-gray-900">Sequence</div>
          </div>
          <div className="p-8 flex items-center justify-center">
            <div className="text-center">
              <FiLoader className="animate-spin text-purple-600 mx-auto" size={32} />
              <p className="mt-4 text-gray-600 text-sm">Chargement...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto bg-white border border-gray-300">
        <div className="border-b border-gray-300 px-4 py-3">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-start gap-3">
              <div className="flex flex-col h-12 justify-center">
                <button
                  type="button"
                  className="text-left text-lg font-bold text-gray-900 cursor-pointer hover:text-purple-600 hover:scale-105 transition-all duration-200"
                  onClick={handleClose}
                >
                  Sequences
                </button>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`px-2 py-0.5 text-xs font-medium ${formData.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                    {formData.active ? 'Actif' : 'Inactif'}
                  </span>
                  <span className="text-xs text-gray-500 font-mono">{formData.code || '-'}</span>
                  <span className="text-xs text-gray-500">Prochain numero : {formatNextNumber()}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative" ref={actionsMenuRef}>
                <Tooltip text="Menu des actions">
                  <button
                    type="button"
                    onClick={() => setShowActionsMenu(!showActionsMenu)}
                    className="h-8 px-3 border border-gray-300 text-gray-700 text-xs hover:bg-gray-50 hover:scale-105 hover:shadow-md active:scale-95 transition-all duration-200 flex items-center gap-1"
                  >
                    <FiSettings size={12} />
                    <span>Actions</span>
                  </button>
                </Tooltip>
                {showActionsMenu && (
                  <div className="absolute right-0 mt-1 w-52 bg-white border border-gray-300 shadow-lg rounded-sm z-50">
                    <button
                      type="button"
                      onClick={() => {
                        setShowTraceabilityPanel((previous) => !previous);
                        setShowActionsMenu(false);
                      }}
                      className="w-full px-3 py-2 text-xs text-left hover:bg-gray-50 hover:pl-4 transition-all duration-200 flex items-center gap-2"
                    >
                      <FiInfo size={12} />
                      {showTraceabilityPanel ? 'Masquer la tracabilite' : 'Afficher la tracabilite'}
                    </button>
                  </div>
                )}
              </div>

              <Tooltip text="Enregistrer">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving || !hasUnsavedChanges}
                  className="w-8 h-8 rounded-full bg-purple-600 text-white hover:bg-purple-700 hover:scale-110 hover:shadow-lg active:scale-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center shadow-sm"
                >
                  {saving ? <FiLoader size={16} className="animate-spin" /> : <FiSave size={16} />}
                </button>
              </Tooltip>

              <Tooltip text={hasUnsavedChanges ? 'Annuler les modifications' : 'Fermer'}>
                <button
                  type="button"
                  onClick={hasUnsavedChanges ? handleDiscardChanges : handleClose}
                  className="w-8 h-8 rounded-full bg-black text-white hover:bg-gray-800 hover:scale-110 hover:shadow-lg active:scale-90 transition-all duration-200 flex items-center justify-center"
                >
                  <FiX size={16} />
                </button>
              </Tooltip>
            </div>
          </div>
        </div>

        <div className="border-b border-gray-300 px-4 py-3">
          <div className="flex flex-col">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Tooltip text={formData.active ? 'Desactiver la sequence' : 'Activer la sequence'}>
                  <button
                    type="button"
                    onClick={() => handleChange('active', !formData.active)}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      formData.active ? 'bg-purple-600' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        formData.active ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </Tooltip>
                <span className="text-sm font-medium text-gray-700">Activer/Desactiver</span>
                {hasUnsavedChanges && (
                  <div className="flex items-center gap-1 text-xs text-amber-600">
                    <FiInfo size={14} />
                    <span>Modifications non sauvegardees</span>
                  </div>
                )}
                {(error || success) && (
                  <div className={`inline-flex items-center gap-2 px-3 py-1 text-xs border ${
                    error ? 'bg-red-50 border-red-200 text-red-700' : 'bg-green-50 border-green-200 text-green-700'
                  }`}>
                    {error ? <FiAlertCircle size={14} /> : <FiCheck size={14} />}
                    <span>{error || success}</span>
                  </div>
                )}
              </div>

              <Tooltip text="Recharger">
                <button
                  type="button"
                  onClick={loadSequence}
                  className="h-8 px-3 border border-gray-300 text-gray-700 text-xs hover:bg-gray-50 transition-all duration-200 flex items-center gap-1"
                >
                  <FiRefreshCw size={12} />
                  Recharger
                </button>
              </Tooltip>
            </div>
          </div>
        </div>

        <div className={`grid gap-0 ${showTraceabilityPanel ? 'lg:grid-cols-[minmax(0,1fr)_320px]' : 'grid-cols-1'}`}>
          <div className="min-w-0">
            <div className="px-4 py-3 border-b border-gray-300">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center h-[26px]">
                    <FieldLabel required>Nom</FieldLabel>
                    <TextField
                      value={formData.name}
                      onChange={(value) => handleChange('name', value)}
                      placeholder="Sequence paiements"
                    />
                  </div>
                  <div className="flex items-center h-[26px]">
                    <FieldLabel required>Type</FieldLabel>
                    <ReadOnlyField className="font-mono">
                      {sequenceType?.label || formData.code}
                    </ReadOnlyField>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center h-[26px]">
                    <FieldLabel>Entite</FieldLabel>
                    <ReadOnlyField>
                      <FiBriefcase className="text-purple-600 mr-2" size={12} />
                      {activeEntity?.raison_sociale || activeEntity?.nom || '-'}
                    </ReadOnlyField>
                  </div>
                  <div className="flex items-center h-[26px]">
                    <FieldLabel>Statut</FieldLabel>
                    <ReadOnlyField>
                      {formData.active ? 'Actif' : 'Inactif'}
                    </ReadOnlyField>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-b border-gray-300">
              <div className="px-4 flex">
                {[
                  { id: 'parametres', label: 'Parametres' },
                  { id: 'apercu', label: 'Apercu' },
                  { id: 'notes', label: 'Notes' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-4 py-2 text-xs font-medium border-b-2 transition-all duration-200 ${
                      activeTab === tab.id
                        ? 'border-purple-600 text-purple-600 hover:text-purple-800'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4">
              {activeTab === 'parametres' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center h-[26px]">
                      <FieldLabel required>Prefixe</FieldLabel>
                      <TextField
                        value={formData.prefix}
                        onChange={(value) => handleChange('prefix', String(value || '').toUpperCase())}
                        placeholder="PAY/26/"
                        className="font-mono"
                      />
                    </div>
                    <div className="flex items-center h-[26px]">
                      <FieldLabel>Suffixe</FieldLabel>
                      <TextField
                        value={formData.suffix}
                        onChange={(value) => handleChange('suffix', String(value || '').toUpperCase())}
                        placeholder="Optionnel"
                        className="font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center h-[26px]">
                      <FieldLabel>Numero courant</FieldLabel>
                      <TextField
                        type="number"
                        min={0}
                        value={formData.current_number}
                        onChange={(value) => handleChange('current_number', parseInt(value, 10) || 0)}
                      />
                    </div>
                    <div className="flex items-center h-[26px]">
                      <FieldLabel>Longueur</FieldLabel>
                      <TextField
                        type="number"
                        min={1}
                        max={10}
                        value={formData.padding}
                        onChange={(value) => handleChange('padding', parseInt(value, 10) || 2)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center h-[26px]">
                      <FieldLabel>Increment</FieldLabel>
                      <TextField
                        type="number"
                        min={1}
                        value={formData.number_increment}
                        onChange={(value) => handleChange('number_increment', parseInt(value, 10) || 1)}
                      />
                    </div>
                    <div className="flex items-center h-[26px]">
                      <FieldLabel>Code technique</FieldLabel>
                      <ReadOnlyField className="font-mono">{formData.code}</ReadOnlyField>
                    </div>
                  </div>

                  <div className="mt-4 p-3 bg-gray-50 border border-gray-200">
                    <p className="text-xs text-gray-600 flex items-center gap-2">
                      <FiInfo size={12} />
                      {sequenceType?.description || 'Cette sequence sert uniquement aux prochains numeros.'}
                    </p>
                  </div>
                </div>
              )}

              {activeTab === 'apercu' && (
                <div className="bg-gray-50 p-6 border border-gray-200">
                  <h3 className="text-sm font-medium text-gray-700 mb-4 flex items-center gap-2">
                    <FiArrowRight size={14} />
                    Apercu du format de numerotation
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white p-4 border border-gray-200 text-center">
                      <p className="text-xs text-gray-500 mb-2">Modele</p>
                      <p className="text-xl font-mono text-purple-600 bg-purple-50 px-3 py-2 inline-block">
                        {formatPattern()}
                      </p>
                    </div>
                    <div className="bg-white p-4 border border-gray-200 text-center">
                      <p className="text-xs text-gray-500 mb-2">Numero actuel</p>
                      <p className="text-xl font-mono text-gray-900 bg-gray-50 px-3 py-2 inline-block">
                        {formatCurrentNumber()}
                      </p>
                    </div>
                    <div className="bg-white p-4 border border-gray-200 text-center">
                      <p className="text-xs text-gray-500 mb-2">Prochain numero</p>
                      <p className="text-xl font-mono text-green-600 bg-green-50 px-3 py-2 inline-block">
                        {formatNextNumber()}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 text-center text-xs text-gray-500">
                    Les documents deja crees gardent leur ancien numero. Cette configuration concerne les futurs numeros.
                  </div>
                </div>
              )}

              {activeTab === 'notes' && (
                <div className="bg-gray-50 border border-gray-200 p-4">
                  <div className="text-sm font-medium text-gray-700 mb-2">Regle appliquee</div>
                  <p className="text-xs text-gray-600 leading-5">
                    Une seule sequence est geree par type de document. L'utilisateur modifie le format de cette sequence,
                    sans creer plusieurs sequences concurrentes. La modification ne renumerote jamais les anciens documents.
                  </p>
                </div>
              )}
            </div>
          </div>

          {showTraceabilityPanel && (
            <div className="border-l border-gray-300 bg-gray-50">
              <div className="flex items-center justify-between border-b border-gray-300 px-4 py-3">
                <div className="flex items-center gap-2">
                  <FiInfo className="text-purple-600" size={14} />
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-800">Tracabilite</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowTraceabilityPanel(false)}
                  className="text-xs text-gray-500 hover:text-gray-900"
                >
                  Fermer
                </button>
              </div>
              <div className="px-4 py-3">
                <div className="mb-3 flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-gray-700">Activite liee a la sequence</h4>
                  <span className="text-xs text-gray-500">0 evenement(s)</span>
                </div>
                <div className="border border-gray-200 bg-white px-3 py-5 text-center">
                  <FiClock className="mx-auto mb-2 h-7 w-7 text-gray-400" />
                  <div className="text-xs text-gray-600">Aucune tracabilite trouvee</div>
                  <div className="mt-1 text-[11px] text-gray-500">
                    Les actions sur cette sequence apparaitront ici si le backend les expose.
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-gray-300 px-4 py-2 bg-gray-50 text-xs text-gray-500 flex justify-between">
          <div>Type : {sequenceType?.label || formData.code || '-'}</div>
          <div>Prochain numero : {formatNextNumber()}</div>
        </div>
      </div>
    </div>
  );
}
