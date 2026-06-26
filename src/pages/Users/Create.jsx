import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  FiAlertCircle,
  FiCheck,
  FiCopy,
  FiInfo,
  FiPlus,
  FiRotateCcw,
  FiSettings,
  FiUploadCloud,
  FiX,
} from 'react-icons/fi';
import { apiClient } from '../../services/apiClient';
import {
  ACCESS_TYPES,
  CheckList,
  FormField,
  SECURITY_LIST_ROUTE,
  Section,
  Tooltip,
  buildPayload,
  getGroupName,
  getResourceMeta,
  getUserName,
  initialForms,
  inputClass,
  useSecurityData,
  validateSecurityForm,
} from './SecurityShared';

// ==========================================
// COMPOSANT PRINCIPAL
// ==========================================
export default function SecurityCreate() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const type = searchParams.get('type') || 'users';
  const meta = getResourceMeta(type);
  const data = useSecurityData();

  const [formData, setFormData] = useState(initialForms[type]);
  const [fieldErrors, setFieldErrors] = useState({});
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

  // Si on change de type via l'URL, on repart d'un formulaire propre
  useEffect(() => {
    setFormData(initialForms[type]);
    setFieldErrors({});
    setHasUnsavedChanges(false);
  }, [type]);

  const markAsModified = () => {
    if (!hasUnsavedChanges) setHasUnsavedChanges(true);
  };

  const setField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    markAsModified();
  };

  const isReady = Object.keys(validateSecurityForm(type, formData)).length === 0;

  const submit = async (silent = false) => {
    const nextErrors = validateSecurityForm(type, formData);
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setError('Veuillez compléter les champs obligatoires.');
      return false;
    }

    setLoading(true);
    if (!silent) setError(null);
    setSuccess(null);
    try {
      const payload = buildPayload(type, formData, null, data.eligiblePartenaires);
      if (type === 'users') await apiClient.post('/users/create-from-partenaire/', payload);
      if (type === 'groups') await apiClient.post('/groupes/', payload);
      if (type === 'permissions') await apiClient.post('/permissions/', payload);
      setHasUnsavedChanges(false);
      if (!silent) {
        setSuccess(`${meta.label} créé avec succès !`);
        navigate(SECURITY_LIST_ROUTE);
      }
      return true;
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || 'Création impossible.');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData(initialForms[type]);
    setFieldErrors({});
    setError(null);
    setSuccess(null);
    setHasUnsavedChanges(false);
  };

  const handleNewItem = () => {
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
      navigate(SECURITY_LIST_ROUTE);
    }
  };

  const handleDiscardChanges = () => {
    if (hasUnsavedChanges) {
      setShowConfirmDialog(true);
    } else {
      navigate(SECURITY_LIST_ROUTE);
    }
  };

  const confirmDiscardChanges = () => {
    resetForm();
    setShowConfirmDialog(false);
    navigate(SECURITY_LIST_ROUTE);
  };

  const handleReset = () => {
    resetForm();
    setShowActionsMenu(false);
  };

  const handleDuplicate = () => {
    setSuccess('Duplication à implémenter');
    setShowActionsMenu(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto bg-white border border-gray-300">

        {/* En-tête ligne 1 */}
        <div className="border-b border-gray-300 px-4 py-3">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-start gap-3">
              <Tooltip text="Réinitialiser le formulaire">
                <button
                  onClick={handleNewItem}
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
                  {meta.plural}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="px-2 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-800">
                    Nouveau {meta.label.toLowerCase()}
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
                      <FiCopy size={12} /> Dupliquer
                    </button>
                    <button onClick={handleReset} className="w-full px-3 py-2 text-xs text-left hover:bg-gray-50 hover:pl-4 transition-all duration-200 flex items-center gap-2">
                      <FiRotateCcw size={12} /> Réinitialiser
                    </button>
                  </div>
                )}
              </div>
              <Tooltip text="Enregistrer">
                <button
                  onClick={() => submit(false)}
                  disabled={loading}
                  className="w-8 h-8 rounded-full bg-purple-600 text-white hover:bg-purple-700 hover:scale-110 hover:shadow-lg active:scale-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center shadow-sm"
                >
                  <FiUploadCloud size={16} />
                </button>
              </Tooltip>
              <Tooltip text="Annuler">
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
                <Tooltip text={!isReady ? 'Remplissez tous les champs obligatoires' : 'Prêt à être enregistré'}>
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
                    <span>Complétez les champs obligatoires</span>
                  </div>
                ) : null}
              </div>

              {type !== 'permissions' && (
                <div className="flex items-center gap-2">
                  <StatusPair active={formData.statut === true || formData.statut === 'actif'} />
                </div>
              )}
            </div>

            <div className="mt-2 ml-1">
              <span className="text-xs text-gray-600">
                L'identifiant sera généré après l'enregistrement
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

        {/* Onglets de type (users / groups / permissions) */}
        <div className="border-b border-gray-300">
          <div className="px-4 flex">
            {getResourceMeta('users') && ['users', 'groups', 'permissions'].map((t) => (
              <button
                key={t}
                onClick={() => navigate(`/security/create?type=${t}`)}
                className={`px-4 py-2 text-xs font-medium border-b-2 transition-all duration-200 ${
                  type === t
                    ? 'border-purple-600 text-purple-600 hover:text-purple-800'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {getResourceMeta(t).label}
              </button>
            ))}
          </div>
        </div>

        {/* Contenu */}
        <div className="p-4">
          <SecurityForm type={type} formData={formData} setField={setField} errors={fieldErrors} data={data} />
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
                  if (saved) navigate(SECURITY_LIST_ROUTE);
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

function StatusPair({ active }) {
  return (
    <>
      <div className={`h-8 px-3 text-xs font-medium border transition-all duration-200 flex items-center ${
        active ? 'bg-green-100 text-green-700 border-green-300' : 'bg-gray-100 text-gray-500 border-gray-300'
      }`}>
        Actif
      </div>
      <div className={`h-8 px-3 text-xs font-medium border transition-all duration-200 flex items-center ${
        !active ? 'bg-red-100 text-red-700 border-red-300' : 'bg-gray-100 text-gray-500 border-gray-300'
      }`}>
        Inactif
      </div>
    </>
  );
}

// ==========================================
// FORMULAIRE PAR TYPE (utilise par Create et Show)
// ==========================================
export function SecurityForm({ type, formData, setField, errors, data }) {
  if (type === 'users') {
    const partnerOptions = data.eligiblePartenaires?.length ? data.eligiblePartenaires : data.partenaires;
    return (
      <div className="space-y-4">
        <Section title="Utilisateur">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <FormField label="Partenaire" required error={errors.partenaire}>
                <select value={formData.partenaire} onChange={(e) => setField('partenaire', e.target.value)} className={inputClass(errors.partenaire)} style={{ height: 26 }}>
                  <option value="">Sélectionner un partenaire</option>
                  {partnerOptions.map((p) => (
                    <option key={p.id} value={p.id}>{p.nom || p.raison_sociale || p.email}</option>
                  ))}
                </select>
              </FormField>
              <p className="ml-[148px] text-[11px] text-gray-500">
                {partnerOptions.length} partenaire(s) éligible(s) (avec au moins une entité)
              </p>
            </div>
            <div className="space-y-2">
              <FormField label="Statut">
                <select value={formData.statut} onChange={(e) => setField('statut', e.target.value)} className={inputClass()} style={{ height: 26 }}>
                  <option value="actif">Actif</option>
                  <option value="inactif">Inactif</option>
                </select>
              </FormField>
            </div>
          </div>
        </Section>

        <Section title="Groupes">
          <CheckList items={data.groups} value={formData.groups} onChange={(value) => setField('groups', value)} getLabel={getGroupName} />
        </Section>
      </div>
    );
  }

  if (type === 'groups') {
    return (
      <div className="space-y-4">
        <Section title="Groupe">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <FormField label="Nom" required error={errors.name}>
                <input value={formData.name} onChange={(e) => setField('name', e.target.value)} className={inputClass(errors.name)} style={{ height: 26 }} />
              </FormField>
              <FormField label="Catégorie">
                <input value={formData.category} onChange={(e) => setField('category', e.target.value)} className={inputClass()} style={{ height: 26 }} />
              </FormField>
            </div>
            <div className="space-y-2">
              <FormField label="Description">
                <textarea value={formData.description} onChange={(e) => setField('description', e.target.value)} className={inputClass()} rows={2} />
              </FormField>
            </div>
          </div>
        </Section>

        <Section title="Membres">
          <CheckList items={data.users} value={formData.members} onChange={(value) => setField('members', value)} getLabel={getUserName} />
        </Section>
        <Section title="Permissions">
          <CheckList items={data.permissions} value={formData.permissions} onChange={(value) => setField('permissions', value)} getLabel={(p) => p.name || p.acces || `Permission ${p.id}`} />
        </Section>
        <Section title="Groupes hérités">
          <CheckList
            items={data.groups.filter((g) => g.id !== formData.id)}
            value={formData.inherited_groups}
            onChange={(value) => setField('inherited_groups', value)}
            getLabel={getGroupName}
          />
        </Section>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Section title="Permission">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <FormField label="Nom">
              <input value={formData.name} onChange={(e) => setField('name', e.target.value)} className={inputClass()} style={{ height: 26 }} />
            </FormField>
            <FormField label="Groupe" required error={errors.groupe}>
              <select value={formData.groupe} onChange={(e) => setField('groupe', e.target.value)} className={inputClass(errors.groupe)} style={{ height: 26 }}>
                <option value="">Sélectionner un groupe</option>
                {data.groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </FormField>
            <FormField label="Module" required error={errors.module}>
              <select value={formData.module} onChange={(e) => setField('module', e.target.value)} className={inputClass(errors.module)} style={{ height: 26 }}>
                <option value="">Sélectionner un module</option>
                {data.modules.map((m) => <option key={m.id} value={m.id}>{m.nom_affiche || m.name}</option>)}
              </select>
            </FormField>
          </div>
          <div className="space-y-2">
            <FormField label="Entité">
              <select value={formData.entite} onChange={(e) => setField('entite', e.target.value)} className={inputClass()} style={{ height: 26 }}>
                <option value="">Toutes les entités</option>
                {data.entites.map((e) => <option key={e.id} value={e.id}>{e.raison_sociale || e.name}</option>)}
              </select>
            </FormField>
            <FormField label="Accès" required error={errors.acces}>
              <select value={formData.acces} onChange={(e) => setField('acces', e.target.value)} className={inputClass(errors.acces)} style={{ height: 26 }}>
                {ACCESS_TYPES.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
              </select>
            </FormField>
            <FormField label="Statut">
              <select value={String(formData.statut)} onChange={(e) => setField('statut', e.target.value === 'true')} className={inputClass()} style={{ height: 26 }}>
                <option value="true">Actif</option>
                <option value="false">Inactif</option>
              </select>
            </FormField>
          </div>
        </div>
      </Section>
    </div>
  );
}