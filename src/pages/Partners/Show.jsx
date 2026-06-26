import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  FiAlertCircle,
  FiBriefcase,
  FiCheck,
  FiCopy,
  FiInfo,
  FiPlus,
  FiRefreshCw,
  FiSettings,
  FiToggleRight,
  FiTrash2,
  FiUploadCloud,
  FiUser,
  FiUserPlus,
  FiX,
} from 'react-icons/fi';
import { apiClient } from '../../services/apiClient';
import { useEntity } from '../../context/EntityContext';
import {
  PartnerForm,
  Tooltip,
  buildPartnerPayload,
  getPartnerName,
  parseResponse,
  partnerToForm,
  validatePartnerForm,
} from './PartnerShared';

// ==========================================
// COMPOSANT PRINCIPAL
// ==========================================
export default function PartnerShow() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { activeEntity } = useEntity();

  const [partner, setPartner] = useState(null);
  const [formData, setFormData] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') === 'user' ? 'utilisateur' : 'fiche');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const [groups, setGroups] = useState([]);
  const [userForm, setUserForm] = useState({
    first_name: '',
    last_name: '',
    telephone: '',
    groups: [],
    send_activation_email: true,
    statut: 'actif',
  });

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

  const loadPartner = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.get(`/partenaires/${id}/`);
      setPartner(data);
      setFormData(partnerToForm(data));
      setHasUnsavedChanges(false);

      const parts = (data?.nom || '').split(' ');
      setUserForm(prev => ({
        ...prev,
        first_name: parts[0] || '',
        last_name: parts.slice(1).join(' ') || '',
        telephone: data?.telephone || '',
      }));
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || 'Impossible de charger le partenaire.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { loadPartner(); }, [loadPartner]);

  useEffect(() => {
    apiClient.get('/groupes/')
      .then(res => setGroups(parseResponse(res)))
      .catch(() => {});
  }, []);

  const isReady = formData ? Object.keys(validatePartnerForm(formData)).length === 0 : false;

  const save = async (silent = false) => {
    const errors = validatePartnerForm(formData);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      setError('Veuillez corriger les champs obligatoires.');
      return false;
    }

    setSaving(true);
    if (!silent) setError(null);
    setSuccess(null);
    try {
      const data = await apiClient.put(`/partenaires/${id}/`, buildPartnerPayload(formData));
      setPartner(data);
      setFormData(partnerToForm(data));
      setHasUnsavedChanges(false);
      if (!silent) setSuccess('Partenaire enregistré.');
      return true;
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || 'Modification impossible.');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const newStatut = !formData.statut;
      const payload = buildPartnerPayload({ ...formData, statut: newStatut });
      const data = await apiClient.put(`/partenaires/${id}/`, payload);
      setPartner(data);
      setFormData(partnerToForm(data));
      setHasUnsavedChanges(false);
      setSuccess(newStatut ? 'Partenaire activé avec succès !' : 'Partenaire désactivé avec succès !');
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || 'Échec du changement de statut.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!window.confirm(`Supprimer "${getPartnerName(partner)}" ?`)) return;
    setShowActionsMenu(false);
    try {
      await apiClient.delete(`/partenaires/${id}/`);
      navigate('..');
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || 'Suppression impossible.');
    }
  };

  const handleDuplicate = () => {
    setSuccess('Duplication à implémenter');
    setShowActionsMenu(false);
  };

  const handleNewPartner = () => {
    if (hasUnsavedChanges) {
      setShowConfirmDialog(true);
    } else {
      navigate('../create');
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
    setFormData(partnerToForm(partner));
    setFieldErrors({});
    setHasUnsavedChanges(false);
    setShowConfirmDialog(false);
    navigate('..');
  };

  const toggleGroup = (groupId) => {
    setUserForm(prev => ({
      ...prev,
      groups: prev.groups.includes(groupId)
        ? prev.groups.filter(g => g !== groupId)
        : [...prev.groups, groupId],
    }));
  };

  const createUser = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      if (hasUnsavedChanges) {
        const saved = await save(true);
        if (!saved) return;
      }
      if (!partner?.email && !formData?.email) throw new Error('Le partenaire doit avoir un email.');
      await apiClient.post('/users/create-from-partenaire/', {
        partenaire: partner.id,
        first_name: userForm.first_name?.trim() || '',
        last_name: userForm.last_name?.trim() || '',
        telephone: userForm.telephone?.trim() || '',
        groups: userForm.groups,
        send_activation_email: userForm.send_activation_email,
        statut: userForm.statut,
      });
      setSuccess('Compte utilisateur créé.');
      await loadPartner();
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || 'Création utilisateur impossible.');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !formData) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-7xl mx-auto bg-white border border-gray-300 p-8 flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="mt-4 text-gray-600 text-sm">Chargement...</p>
          </div>
        </div>
      </div>
    );
  }

  const isActive = !!formData.statut;

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto bg-white border border-gray-300">

        {/* En-tête ligne 1 */}
        <div className="border-b border-gray-300 px-4 py-3">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-start gap-3">
              <Tooltip text="Créer un nouveau partenaire">
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
                  {getPartnerName(partner)}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`px-2 py-0.5 text-xs font-medium ${isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {isActive ? 'Actif' : 'Inactif'}
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
                    <button onClick={() => { setShowActionsMenu(false); loadPartner(); }} className="w-full px-3 py-2 text-xs text-left hover:bg-gray-50 hover:pl-4 transition-all duration-200 flex items-center gap-2 border-b border-gray-100">
                      <FiRefreshCw size={12} /> Actualiser
                    </button>
                    <button onClick={remove} className="w-full px-3 py-2 text-xs text-left hover:bg-red-50 hover:text-red-600 hover:pl-4 transition-all duration-200 flex items-center gap-2">
                      <FiTrash2 size={12} /> Supprimer
                    </button>
                  </div>
                )}
              </div>
              <Tooltip text="Enregistrer les modifications">
                <button
                  onClick={() => save(false)}
                  disabled={saving}
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
                <Tooltip text={isActive ? 'Désactiver ce partenaire' : 'Activer ce partenaire'}>
                  <button
                    type="button"
                    onClick={handleToggleStatus}
                    disabled={saving}
                    className={`h-8 px-3 text-xs font-medium border transition-all duration-200 flex items-center justify-center gap-1 ${
                      isActive
                        ? 'bg-white text-red-600 border-red-300 hover:bg-red-50 hover:scale-105 hover:shadow-md active:scale-95'
                        : 'bg-purple-600 text-white border-purple-600 hover:bg-purple-700 hover:scale-105 hover:shadow-md active:scale-95'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    <FiToggleRight size={13} />
                    {isActive ? 'Désactiver' : 'Activer'}
                  </button>
                </Tooltip>

                {error ? (
                  <div className="flex items-center gap-1 text-xs text-red-600">
                    <FiAlertCircle size={14} />
                    <span>{error}</span>
                  </div>
                ) : !isReady ? (
                  <div className="flex items-center gap-1 text-xs text-amber-600">
                    <FiInfo size={14} />
                    <span>Certains champs obligatoires sont incomplets</span>
                  </div>
                ) : null}
              </div>

              <div className="flex items-center gap-2">
                <div className={`h-8 px-3 text-xs font-medium border transition-all duration-200 flex items-center ${
                  isActive
                    ? 'bg-green-100 text-green-700 border-green-300'
                    : 'bg-gray-100 text-gray-500 border-gray-300'
                }`}>
                  Actif
                </div>
                <div className={`h-8 px-3 text-xs font-medium border transition-all duration-200 flex items-center ${
                  !isActive
                    ? 'bg-red-100 text-red-700 border-red-300'
                    : 'bg-gray-100 text-gray-500 border-gray-300'
                }`}>
                  Inactif
                </div>
              </div>
            </div>

            <div className="mt-2 ml-1">
              <span className="text-xs text-gray-600">
                ID #{partner.id}{formData.email ? ` — ${formData.email}` : ''}
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

        {/* Entité / compte utilisateur */}
        <div className="px-4 py-3 border-b border-gray-300">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center" style={{ height: '26px' }}>
              <label className="text-xs text-gray-700 min-w-[140px] font-medium">Entité</label>
              <div className="flex-1 px-2 py-1 border border-gray-300 bg-gray-50 text-xs text-gray-900 ml-2 flex items-center gap-1" style={{ height: '26px' }}>
                <FiBriefcase className="text-purple-600" size={12} />
                {activeEntity?.nom || activeEntity?.name || activeEntity?.raison_sociale || '-'}
              </div>
            </div>
            <div className="flex items-center" style={{ height: '26px' }}>
              <label className="text-xs text-gray-700 min-w-[140px] font-medium">Compte utilisateur</label>
              <div className="flex-1 ml-2">
                {partner.user ? (
                  <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800">Compte créé</span>
                ) : (
                  <span className="px-2 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-800">À créer</span>
                )}
              </div>
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
              {partner.user ? (
                <div className="p-4 text-sm">
                  <div className="flex items-center gap-2">
                    <FiUser size={16} className="text-green-600" />
                    <div>
                      <div className="font-medium text-gray-900">{partner.user.email || formData.email}</div>
                      <div className="text-xs text-gray-500">Statut : {partner.user.is_active ? 'Actif' : 'Inactif'}</div>
                    </div>
                  </div>
                </div>
              ) : (
                <form onSubmit={createUser} className="p-4 space-y-3">
                  <div className="bg-blue-50 border border-blue-200 px-3 py-2 text-xs text-blue-800">
                    Email utilisé : <span className="font-bold">{formData.email || 'Email manquant'}</span>
                    {hasUnsavedChanges && <div className="mt-1">La fiche partenaire sera sauvegardée avant la création du compte.</div>}
                  </div>
                  <div className="grid grid-cols-4 border border-gray-300">
                    <div className="border-r border-gray-300">
                      <div className="bg-gray-100 px-2 py-1.5 text-xs font-medium border-b border-gray-300">Prénom *</div>
                      <div className="p-1"><input required value={userForm.first_name} onChange={(e) => setUserForm(prev => ({ ...prev, first_name: e.target.value }))} className="w-full border border-gray-300 px-2 py-1.5 text-xs" /></div>
                    </div>
                    <div className="border-r border-gray-300">
                      <div className="bg-gray-100 px-2 py-1.5 text-xs font-medium border-b border-gray-300">Nom *</div>
                      <div className="p-1"><input required value={userForm.last_name} onChange={(e) => setUserForm(prev => ({ ...prev, last_name: e.target.value }))} className="w-full border border-gray-300 px-2 py-1.5 text-xs" /></div>
                    </div>
                    <div className="border-r border-gray-300">
                      <div className="bg-gray-100 px-2 py-1.5 text-xs font-medium border-b border-gray-300">Téléphone</div>
                      <div className="p-1"><input value={userForm.telephone} onChange={(e) => setUserForm(prev => ({ ...prev, telephone: e.target.value }))} className="w-full border border-gray-300 px-2 py-1.5 text-xs" /></div>
                    </div>
                    <div>
                      <div className="bg-gray-100 px-2 py-1.5 text-xs font-medium border-b border-gray-300">Statut</div>
                      <div className="p-1">
                        <select value={userForm.statut} onChange={(e) => setUserForm(prev => ({ ...prev, statut: e.target.value }))} className="w-full border border-gray-300 px-2 py-1.5 text-xs">
                          <option value="actif">Actif</option>
                          <option value="inactif">Inactif</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="border border-gray-300">
                    <div className="bg-gray-100 border-b border-gray-300 px-2 py-1.5 text-xs font-medium">Groupes</div>
                    <div className="p-2 grid grid-cols-3 gap-2">
                      {groups.length === 0 ? (
                        <div className="text-xs text-gray-500">Aucun groupe disponible</div>
                      ) : groups.map(group => (
                        <label key={group.id} className="text-xs flex items-center gap-2">
                          <input type="checkbox" checked={userForm.groups.includes(group.id)} onChange={() => toggleGroup(group.id)} />
                          {group.name}
                        </label>
                      ))}
                    </div>
                  </div>

                  <label className="text-xs flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={userForm.send_activation_email}
                      onChange={(e) => setUserForm(prev => ({ ...prev, send_activation_email: e.target.checked }))}
                    />
                    Envoyer email d'activation
                  </label>

                  <Tooltip text="Créer le compte utilisateur lié à ce partenaire">
                    <button
                      type="submit"
                      disabled={saving || !formData.email}
                      className="h-8 px-3 bg-green-600 text-white text-xs hover:bg-green-700 hover:scale-105 hover:shadow-md active:scale-95 transition-all duration-200 disabled:opacity-50 flex items-center gap-1"
                    >
                      <FiUserPlus size={13} /> {saving ? 'Création...' : 'Créer le compte utilisateur'}
                    </button>
                  </Tooltip>
                </form>
              )}
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
                  const saved = await save(true);
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