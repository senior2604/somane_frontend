import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiAlertCircle,
  FiBriefcase,
  FiCheck,
  FiInfo,
  FiPlus,
  FiRotateCcw,
  FiSettings,
  FiUploadCloud,
  FiX,
} from 'react-icons/fi';
import { apiClient } from '../../services/apiClient';
import {
  EntityForm,
  INITIAL_ENTITY_FORM,
  buildEntityPayload,
  parseResponse,
  validateEntityForm,
} from './EntityShared';

const TABS = [
  { key: 'fiche', label: 'Fiche entite' },
  { key: 'users', label: 'Utilisateurs' },
  { key: 'notes', label: 'Notes' },
];

export default function EntityCreate() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState(INITIAL_ENTITY_FORM);
  const [entities, setEntities] = useState([]);
  const [fieldErrors, setFieldErrors] = useState({});
  const [activeTab, setActiveTab] = useState('fiche');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const actionsMenuRef = useRef(null);
  const logoInputRef = useRef(null);

  useEffect(() => {
    apiClient.get('/entites/')
      .then((res) => setEntities(parseResponse(res)))
      .catch(() => setEntities([]));
  }, []);

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
      if (hasUnsavedChanges) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const markAsModified = () => {
    if (!hasUnsavedChanges) setHasUnsavedChanges(true);
  };

  const resetForm = () => {
    setFormData(INITIAL_ENTITY_FORM);
    setFieldErrors({});
    setActiveTab('fiche');
    setError(null);
    setSuccess(null);
    setHasUnsavedChanges(false);
  };

  const submit = async () => {
    const errors = validateEntityForm(formData);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      setError('Champs obligatoires manquants : raison sociale, activite, email et telephone sont requis.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await apiClient.post('/entites/', buildEntityPayload(formData));
      setHasUnsavedChanges(false);
      setSuccess('Entite creee avec succes.');
      navigate(response?.id ? `/entities/${response.id}` : '/entities');
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || "Erreur lors de la creation de l'entite.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoBack = () => {
    if (hasUnsavedChanges) {
      setShowConfirmDialog(true);
    } else {
      navigate('/entities');
    }
  };

  const importLogo = (file) => {
    if (!file) return;
    if (!file.type?.startsWith('image/')) {
      setError('Le logo doit etre un fichier image.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setFormData((prev) => ({ ...prev, logo: reader.result }));
      setHasUnsavedChanges(true);
      setShowActionsMenu(false);
      setError(null);
    };
    reader.onerror = () => setError("Impossible de lire le fichier logo.");
    reader.readAsDataURL(file);
  };

  const ready = Object.keys(validateEntityForm(formData)).length === 0;

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <input
        ref={logoInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          importLogo(event.target.files?.[0]);
          event.target.value = '';
        }}
      />
      <div className="max-w-7xl mx-auto bg-white border border-gray-300">
        <div className="border-b border-gray-300 px-5 py-4 flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <button
              onClick={() => {
                if (hasUnsavedChanges) setShowConfirmDialog(true);
                else resetForm();
              }}
              className="h-12 px-5 bg-purple-600 text-white font-semibold flex items-center gap-2 hover:bg-purple-700"
            >
              <FiPlus size={18} />
              Nouveau
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-950">Nouvelle entite</h1>
              <p className="text-sm text-gray-600">Creation d'une fiche entite avec ses informations administratives.</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleGoBack}
              className="h-10 px-4 border border-gray-300 bg-white text-sm hover:bg-gray-50 flex items-center gap-2"
            >
              <FiX size={16} />
              Annuler
            </button>
            <div className="relative" ref={actionsMenuRef}>
              <button
                onClick={() => setShowActionsMenu((current) => !current)}
                className="h-10 px-4 border border-gray-300 bg-white text-sm hover:bg-gray-50 flex items-center gap-2"
              >
                <FiSettings size={16} />
                Actions
              </button>
              {showActionsMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-300 shadow-lg z-30">
                  <button onClick={resetForm} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2">
                    <FiRotateCcw size={15} />
                    Reinitialiser
                  </button>
                  <button
                    onClick={() => logoInputRef.current?.click()}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
                  >
                    <FiUploadCloud size={15} />
                    Importer logo
                  </button>
                </div>
              )}
            </div>
            <button
              onClick={submit}
              disabled={loading}
              className="h-10 px-5 bg-purple-600 text-white text-sm font-semibold hover:bg-purple-700 disabled:opacity-60 flex items-center gap-2"
            >
              <FiCheck size={16} />
              {loading ? 'Creation...' : 'Creer'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-4 border-b border-gray-300">
          <HeaderCell label="Raison sociale" value={formData.raison_sociale || 'Nouvelle entite'} strong />
          <HeaderCell label="Sigle" value={formData.sigle || '-'} />
          <HeaderCell label="Activite" value={formData.activite || '-'} />
          <HeaderCell label="Statut" value={formData.statut ? 'Actif' : 'Inactif'} badge={formData.statut} />
        </div>

        <div className="px-5 py-3 border-b border-gray-300 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm">
            <span className={`inline-flex items-center gap-1 px-2 py-1 border ${ready ? 'bg-green-50 border-green-200 text-green-700' : 'bg-yellow-50 border-yellow-200 text-yellow-700'}`}>
              {ready ? <FiCheck size={14} /> : <FiAlertCircle size={14} />}
              {ready ? 'Pret' : 'Brouillon'}
            </span>
            {hasUnsavedChanges && <span className="text-xs text-gray-500">Modifications non enregistrees</span>}
          </div>
          <div className="text-xs text-gray-500 flex items-center gap-1">
            <FiInfo size={13} />
            La fiche est classee en blocs, comme les pieces comptables.
          </div>
        </div>

        {(error || success) && (
          <div className={`mx-5 mt-4 px-3 py-2 text-sm border ${error ? 'bg-red-50 border-red-200 text-red-700' : 'bg-green-50 border-green-200 text-green-700'}`}>
            {error || success}
          </div>
        )}

        <div className="border-b border-gray-300 px-5">
          <div className="flex gap-1">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-5 py-3 text-sm border-b-2 ${
                  activeTab === tab.key
                    ? 'border-purple-600 text-purple-700 font-semibold'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-5">
          {activeTab === 'fiche' && (
            <EntityForm
              formData={formData}
              setFormData={setFormData}
              fieldErrors={fieldErrors}
              mode="main"
              entities={entities}
              onDirty={markAsModified}
            />
          )}
          {activeTab === 'users' && (
            <EntityForm
              formData={formData}
              setFormData={setFormData}
              mode="users"
              entities={entities}
              onDirty={markAsModified}
            />
          )}
          {activeTab === 'notes' && (
            <EntityForm
              formData={formData}
              setFormData={setFormData}
              mode="notes"
              entities={entities}
              onDirty={markAsModified}
            />
          )}
        </div>

        <div className="border-t border-gray-300 px-5 py-3 flex items-center justify-between text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <FiBriefcase size={15} />
            Nouvelle entite
          </div>
          <div>{ready ? 'Pret' : 'A completer'}</div>
        </div>
      </div>

      {showConfirmDialog && (
        <ConfirmDialog
          title="Quitter sans enregistrer ?"
          message="Les modifications en cours seront perdues."
          onCancel={() => setShowConfirmDialog(false)}
          onConfirm={() => {
            setShowConfirmDialog(false);
            navigate('/entities');
          }}
        />
      )}
    </div>
  );
}

function HeaderCell({ label, value, strong, badge }) {
  return (
    <div className="border-r border-gray-300 last:border-r-0">
      <div className="bg-gray-50 border-b border-gray-300 px-3 py-2 text-sm font-semibold text-gray-900">{label}</div>
      <div className={`px-3 py-3 text-sm ${strong ? 'font-bold text-gray-950' : 'text-gray-900'}`}>
        {badge === undefined ? value : (
          <span className={`inline-flex px-2 py-1 text-xs ${badge ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {value}
          </span>
        )}
      </div>
    </div>
  );
}

function ConfirmDialog({ title, message, onCancel, onConfirm }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white border border-gray-300 shadow-xl">
        <div className="px-4 py-3 border-b border-gray-300 font-bold text-gray-900">{title}</div>
        <div className="p-4 text-sm text-gray-600">{message}</div>
        <div className="px-4 py-3 border-t border-gray-300 flex justify-end gap-2">
          <button onClick={onCancel} className="h-9 px-4 border border-gray-300 text-sm hover:bg-gray-50">Annuler</button>
          <button onClick={onConfirm} className="h-9 px-4 bg-purple-600 text-white text-sm hover:bg-purple-700">Confirmer</button>
        </div>
      </div>
    </div>
  );
}
