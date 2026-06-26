import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiPlus,
  FiSettings,
  FiCopy,
  FiRotateCcw,
  FiUploadCloud,
  FiX,
  FiCheck,
  FiAlertCircle,
  FiBriefcase,
  FiInfo,
  FiUserPlus,
} from 'react-icons/fi';
import { apiClient } from '../../services/apiClient';
import { useEntity } from '../../context/EntityContext';
import {
  INITIAL_FORM,
  PARTNER_TYPES,
  PartnerForm,
  Tooltip,
  buildPartnerPayload,
  validatePartnerForm,
} from './PartnerShared';

// ==========================================
// COMPOSANT PRINCIPAL
// ==========================================
export default function PartnerCreate() {
  const navigate = useNavigate();
  const { activeEntity } = useEntity();

  const [formData, setFormData] = useState(INITIAL_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [activeTab, setActiveTab] = useState('fiche');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const actionsMenuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (actionsMenuRef.current && !actionsMenuRef.current.contains(e.target)) {
        setShowActionsMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const markAsModified = () => {
    if (!hasUnsavedChanges) setHasUnsavedChanges(true);
  };

  const updateForm = (updater) => {
    setFormData(prev => (typeof updater === 'function' ? updater(prev) : updater));
    markAsModified();
  };

  const isReady = Object.keys(validatePartnerForm(formData)).length === 0;

  const submit = async (silent = false) => {
    const errors = validatePartnerForm(formData);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      setError('Champs obligatoires manquants : nom, type, email, téléphone, pays, région, ville et adresse sont requis.');
      return false;
    }

    if (!activeEntity) {
      setError('Vous devez sélectionner une entité.');
      return false;
    }

    setLoading(true);
    if (!silent) setError(null);
    setSuccess(null);

    try {
      const response = await apiClient.post('/partenaires/', buildPartnerPayload(formData));
      setHasUnsavedChanges(false);
      if (!silent) {
        setSuccess('Partenaire créé avec succès !');
        navigate(response?.id ? `../${response.id}` : '..');
      }
      return true;
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || 'Erreur lors de la création du partenaire.');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData(INITIAL_FORM);
    setFieldErrors({});
    setActiveTab('fiche');
    setError(null);
    setSuccess(null);
    setHasUnsavedChanges(false);
  };

  const handleNewPartner = () => {
    if (hasUnsavedChanges) {
      setShowConfirmDialog(true);
    } else {
      resetForm();
    }
  };

  const handleGoToList = () => {
    if (hasUnsavedChanges) {
      setShowConfirmDialog(true);
    } else {
      navigate('..');
    }
  };

  const handleDiscardChanges = () => {
    setShowConfirmDialog(true);
  };

  const confirmDiscardChanges = () => {
    resetForm();
    setShowConfirmDialog(false);
    navigate('..');
  };

  const handleDuplicate = () => {
    setSuccess('Duplication à implémenter');
    setShowActionsMenu(false);
  };

  const handleReset = () => {
    resetForm();
    setShowActionsMenu(false);
  };

  const typeLabel = PARTNER_TYPES.find(t => t.value === formData.type_partenaire)?.label || formData.type_partenaire;

  if (!activeEntity) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-7xl mx-auto bg-white border border-gray-300">
          <div className="border-b border-gray-300 px-4 py-3">
            <div className="text-lg font-bold text-gray-900">Créer un partenaire</div>
          </div>
          <div className="p-8">
            <div className="bg-yellow-50 border border-yellow-200 rounded p-6 text-center">
              <FiAlertCircle className="text-yellow-600 mx-auto mb-3" size={32} />
              <p className="text-yellow-800 font-medium text-lg mb-3">Aucune entité sélectionnée</p>
              <p className="text-sm text-gray-600 mb-4">
                Vous devez sélectionner une entité pour créer un partenaire.
              </p>
              <p className="text-xs text-gray-500">
                Cliquez sur l'icône <FiBriefcase className="inline text-purple-600 mx-1" size={14} />
                en haut à droite pour choisir une entité.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto bg-white border border-gray-300">

        {/* En-tête ligne 1 */}
        <div className="border-b border-gray-300 px-4 py-3">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-start gap-3">
              <Tooltip text="Réinitialiser le formulaire">
                <button
                  onClick={handleNewPartner}
                  className="h-12 px-4 bg-purple-600 text-white text-sm hover:bg-purple-700 hover:scale-105 hover:shadow-md active:scale-95 transition-all duration-200 flex items-center justify-center font-medium border-0"
                  style={{ minWidth: '100px' }}
                >
                  <FiPlus size={16} className="mr-1" />
                  <span>Nouveau</span>
                </button>
              </Tooltip>
              <div className="flex flex-col h-12 justify-center">
                <div
                  className="text-lg font-bold text-gray-900 cursor-pointer hover:text-purple-600 hover:scale-105 transition-all duration-200"
                  onClick={handleGoToList}
                >
                  Partenaires
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="px-2 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-800">
                    Nouveau partenaire
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative" ref={actionsMenuRef}>
                <Tooltip text="Menu des actions">
                  <button
                    onClick={() => setShowActionsMenu(!showActionsMenu)}
                    className="h-8 px-3 border border-gray-300 text-gray-700 text-xs hover:bg-gray-50 hover:scale-105 hover:shadow-md active:scale-95 transition-all duration-200 flex items-center gap-1"
                  >
                    <FiSettings size={12} /><span>Actions</span>
                  </button>
                </Tooltip>
                {showActionsMenu && (
                  <div className="absolute right-0 mt-1 w-48 bg-white border border-gray-300 shadow-lg rounded-sm z-50">
                    <button onClick={handleDuplicate} className="w-full px-3 py-2 text-xs text-left hover:bg-gray-50 hover:pl-4 transition-all duration-200 flex items-center gap-2 border-b border-gray-100">
                      <FiCopy size={12} /> Dupliquer un partenaire
                    </button>
                    <button onClick={handleReset} className="w-full px-3 py-2 text-xs text-left hover:bg-gray-50 hover:pl-4 transition-all duration-200 flex items-center gap-2">
                      <FiRotateCcw size={12} /> Réinitialiser
                    </button>
                  </div>
                )}
              </div>
              <Tooltip text="Enregistrer le partenaire">
                <button
                  onClick={() => submit(false)}
                  disabled={loading}
                  className="w-8 h-8 rounded-full bg-purple-600 text-white hover:bg-purple-700 hover:scale-110 hover:shadow-lg active:scale-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center shadow-sm"
                >
                  <FiUploadCloud size={16} />
                </button>
              </Tooltip>
              <Tooltip text="Annuler les modifications">
                <button
                  onClick={handleDiscardChanges}
                  className="w-8 h-8 rounded-full bg-black text-white hover:bg-gray-800 hover:scale-110 hover:shadow-lg active:scale-90 transition-all duration-200 flex items-center justify-center"
                >
                  <FiX size={16} />
                </button>
              </Tooltip>
            </div>
          </div>
        </div>

        {/* En-tête ligne 2 */}
        <div className="border-b border-gray-300 px-4 py-3">
          <div className="flex flex-col">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Tooltip text={
                  !isReady
                    ? "Remplissez tous les champs obligatoires (nom, type, email, téléphone, pays, région, ville, adresse)"
                    : "Le partenaire est prêt à être enregistré"
                }>
                  <span className={`h-8 px-3 text-xs font-medium border flex items-center justify-center ${
                    isReady
                      ? 'bg-green-50 text-green-700 border-green-300'
                      : 'bg-amber-50 text-amber-700 border-amber-300'
                  }`}>
                    {isReady ? 'Prêt à enregistrer' : 'Incomplet'}
                  </span>
                </Tooltip>

                {error ? (
                  <div className="flex items-center gap-1 text-xs text-red-600">
                    <FiAlertCircle size={14} />
                    <span>{error}</span>
                  </div>
                ) : !isReady ? (
                  <div className="flex items-center gap-1 text-xs text-amber-600">
                    <FiInfo size={14} />
                    <span>Complétez l'identité, le contact et la localisation</span>
                  </div>
                ) : null}
              </div>

              <div className="flex items-center gap-2">
                <div className={`h-8 px-3 text-xs font-medium border transition-all duration-200 flex items-center ${
                  formData.statut
                    ? 'bg-green-100 text-green-700 border-green-300'
                    : 'bg-gray-100 text-gray-500 border-gray-300'
                }`}>
                  Actif
                </div>
                <div className={`h-8 px-3 text-xs font-medium border transition-all duration-200 flex items-center ${
                  !formData.statut
                    ? 'bg-red-100 text-red-700 border-red-300'
                    : 'bg-gray-100 text-gray-500 border-gray-300'
                }`}>
                  Inactif
                </div>
              </div>
            </div>

            <div className="mt-2 ml-1">
              <span className="text-xs text-gray-600">
                {formData.nom ? `${formData.nom} — ${typeLabel}` : "L'identifiant sera généré après l'enregistrement"}
              </span>
            </div>
          </div>
        </div>

        {/* Indicateur modifications */}
        {hasUnsavedChanges && (
          <div className="px-4 py-1 bg-blue-50 text-blue-700 text-xs border-b border-blue-200 flex items-center justify-between">
            <span>Modifications non sauvegardées</span>
          </div>
        )}

        {/* Entité */}
        <div className="px-4 py-3 border-b border-gray-300">
          <div className="flex items-center" style={{ height: '26px' }}>
            <label className="text-xs text-gray-700 min-w-[140px] font-medium">Entité</label>
            <div className="flex-1 px-2 py-1 border border-gray-300 bg-gray-50 text-xs text-gray-900 ml-2 flex items-center gap-1" style={{ height: '26px' }}>
              <FiBriefcase className="text-purple-600" size={12} />
              {activeEntity?.nom || activeEntity?.name || activeEntity?.raison_sociale || 'Entité sélectionnée'}
            </div>
          </div>
        </div>

        {/* Onglets */}
        <div className="border-b border-gray-300">
          <div className="px-4 flex">
            {[
              ['fiche', 'Fiche partenaire'],
              ['utilisateur', 'Utilisateur'],
              ['notes', 'Notes'],
            ].map(([key, label]) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`px-4 py-2 text-xs font-medium border-b-2 transition-all duration-200 ${
                  activeTab === key
                    ? 'border-purple-600 text-purple-600 hover:text-purple-800'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Contenu onglets */}
        <div className="p-4">
          {activeTab === 'fiche' && (
            <PartnerForm
              mode="main"
              formData={formData}
              setFormData={updateForm}
              fieldErrors={fieldErrors}
              setFieldErrors={setFieldErrors}
            />
          )}

          {activeTab === 'utilisateur' && (
            <div className="border border-gray-300">
              <div className="bg-gray-100 border-b border-gray-300 px-2 py-1.5 text-xs font-medium">Compte utilisateur</div>
              <div className="p-4 text-sm text-gray-600">
                <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 px-3 py-2 text-xs text-blue-800">
                  <FiInfo size={14} className="mt-0.5" />
                  <div>
                    Enregistrez d'abord le partenaire. Sa fiche permettra ensuite de générer le compte utilisateur avec cet email :
                    <span className="font-bold"> {formData.email || 'email non renseigné'}</span>
                  </div>
                </div>
                <Tooltip text="Enregistrer puis ouvrir la fiche pour créer le compte">
                  <button
                    onClick={() => submit(false)}
                    disabled={loading}
                    className="mt-4 h-8 px-3 bg-purple-600 text-white text-xs hover:bg-purple-700 hover:scale-105 hover:shadow-md active:scale-95 transition-all duration-200 disabled:opacity-50 flex items-center gap-1"
                  >
                    <FiUserPlus size={13} /> Créer le partenaire puis ouvrir sa fiche
                  </button>
                </Tooltip>
              </div>
            </div>
          )}

          {activeTab === 'notes' && (
            <PartnerForm
              mode="notes"
              formData={formData}
              setFormData={updateForm}
              fieldErrors={fieldErrors}
              setFieldErrors={setFieldErrors}
            />
          )}
        </div>

        {/* Messages */}
        {(error || success) && (
          <div className={`px-4 py-3 text-sm border-t border-gray-300 transition-all duration-300 ${
            error ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
          }`}>
            <div className="flex items-center gap-2">
              {error ? <FiAlertCircle size={14} /> : <FiCheck size={14} />}
              <span>{error || success}</span>
            </div>
          </div>
        )}
      </div>

      {/* Dialogue confirmation */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-sm shadow-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-gray-900 mb-3">Modifications non sauvegardées</h3>
            <p className="text-sm text-gray-600 mb-6">
              Voulez-vous enregistrer les modifications avant de quitter ?
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={async () => {
                  setShowConfirmDialog(false);
                  const saved = await submit(true);
                  if (saved) navigate('..');
                }}
                className="px-4 py-2 bg-purple-600 text-white text-sm hover:bg-purple-700 hover:scale-105 active:scale-95 transition-all duration-200"
              >
                Enregistrer
              </button>
              <button
                onClick={confirmDiscardChanges}
                className="px-4 py-2 bg-red-600 text-white text-sm hover:bg-red-700 hover:scale-105 active:scale-95 transition-all duration-200"
              >
                Ne pas enregistrer
              </button>
              <button
                onClick={() => setShowConfirmDialog(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 text-sm hover:bg-gray-50 hover:scale-105 active:scale-95 transition-all duration-200"
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