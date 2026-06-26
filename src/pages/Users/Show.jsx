import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  FiAlertCircle,
  FiCheck,
  FiCopy,
  FiInfo,
  FiPlus,
  FiRefreshCw,
  FiSettings,
  FiToggleRight,
  FiTrash2,
  FiUploadCloud,
  FiX,
} from 'react-icons/fi';
import { apiClient } from '../../services/apiClient';
import {
  SECURITY_LIST_ROUTE,
  Tooltip,
  buildPayload,
  getGroupName,
  getPermissionName,
  getResourceMeta,
  getUserName,
  itemToForm,
  useSecurityData,
  validateSecurityForm,
} from './SecurityShared';
import { SecurityForm } from './Create';

export default function SecurityShow() {
  const navigate = useNavigate();
  const { type = 'users', id } = useParams();
  const [searchParams] = useSearchParams();
  const meta = getResourceMeta(type);
  const data = useSecurityData();

  const [item, setItem] = useState(null);
  const [formData, setFormData] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(searchParams.get('edit') === '1');
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const actionsMenuRef = useRef(null);
  const endpoint = type === 'users' ? 'users' : type === 'groups' ? 'groupes' : 'permissions';

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

  const loadItem = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get(`/${endpoint}/${id}/`);
      setItem(response);
      setFormData(itemToForm(type, response));
      setHasUnsavedChanges(false);
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || 'Chargement impossible');
    } finally {
      setLoading(false);
    }
  }, [endpoint, id, type]);

  useEffect(() => { loadItem(); }, [loadItem]);

  const markAsModified = () => {
    if (!hasUnsavedChanges) setHasUnsavedChanges(true);
  };

  const setField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    markAsModified();
  };

  const isReady = formData ? Object.keys(validateSecurityForm(type, formData)).length === 0 : false;

  // Les utilisateurs n'envoient qu'un payload partiel (statut / groupes) :
  // un PUT effacerait les champs non envoyes (email, nom, telephone...).
  // On utilise donc systematiquement PATCH pour toute mise a jour.
  const save = async (silent = false) => {
    const nextErrors = validateSecurityForm(type, formData);
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setError('Veuillez corriger les champs obligatoires.');
      return false;
    }

    setSaving(true);
    if (!silent) setError(null);
    setSuccess(null);
    try {
      const payload = buildPayload(type, formData, item, data.partenaires);
      const updated = await apiClient.patch(`/${endpoint}/${id}/`, payload);
      setItem(updated);
      setFormData(itemToForm(type, updated));
      setHasUnsavedChanges(false);
      if (!silent) setSuccess('Enregistré.');
      return true;
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || 'Enregistrement impossible.');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async () => {
    if (type === 'groups') return; // pas de notion de statut pour les groupes
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const nextStatutValue = type === 'users'
        ? (formData.statut === 'actif' ? 'inactif' : 'actif')
        : !formData.statut;
      const payload = buildPayload(type, { ...formData, statut: nextStatutValue }, item, data.partenaires);
      const updated = await apiClient.patch(`/${endpoint}/${id}/`, payload);
      setItem(updated);
      setFormData(itemToForm(type, updated));
      setHasUnsavedChanges(false);
      const isNowActive = type === 'users' ? nextStatutValue === 'actif' : nextStatutValue;
      setSuccess(isNowActive ? `${meta.label} activé avec succès !` : `${meta.label} désactivé avec succès !`);
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || 'Échec du changement de statut.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!window.confirm(`Supprimer ${meta.label.toLowerCase()} "${getTitle(type, item, data)}" ?`)) return;
    setShowActionsMenu(false);
    try {
      await apiClient.delete(`/${endpoint}/${id}/`);
      navigate(SECURITY_LIST_ROUTE);
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || 'Suppression impossible.');
    }
  };

  const handleDuplicate = () => {
    setSuccess('Duplication à implémenter');
    setShowActionsMenu(false);
  };

  const handleNewItem = () => {
    if (hasUnsavedChanges) {
      setShowConfirmDialog(true);
    } else {
      navigate(`/security/create?type=${type}`);
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
    setFormData(itemToForm(type, item));
    setFieldErrors({});
    setHasUnsavedChanges(false);
    setShowConfirmDialog(false);
    navigate(SECURITY_LIST_ROUTE);
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

  const isActive = type === 'users' ? formData.statut === 'actif' : !!formData.statut;

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto bg-white border border-gray-300">

        {/* En-tête ligne 1 */}
        <div className="border-b border-gray-300 px-4 py-3">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-start gap-3">
              <Tooltip text="Créer une nouvelle fiche">
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
                  {getTitle(type, item, data)}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  {type !== 'groups' && (
                    <span className={`px-2 py-0.5 text-xs font-medium ${isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {isActive ? 'Actif' : 'Inactif'}
                    </span>
                  )}
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
                    <button onClick={() => { setShowActionsMenu(false); loadItem(); }} className="w-full px-3 py-2 text-xs text-left hover:bg-gray-50 hover:pl-4 transition-all duration-200 flex items-center gap-2 border-b border-gray-100">
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
                {type !== 'groups' && (
                  <Tooltip text={isActive ? 'Désactiver' : 'Activer'}>
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
                )}

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

              {type !== 'groups' && (
                <div className="flex items-center gap-2">
                  <div className={`h-8 px-3 text-xs font-medium border transition-all duration-200 flex items-center ${
                    isActive ? 'bg-green-100 text-green-700 border-green-300' : 'bg-gray-100 text-gray-500 border-gray-300'
                  }`}>
                    Actif
                  </div>
                  <div className={`h-8 px-3 text-xs font-medium border transition-all duration-200 flex items-center ${
                    !isActive ? 'bg-red-100 text-red-700 border-red-300' : 'bg-gray-100 text-gray-500 border-gray-300'
                  }`}>
                    Inactif
                  </div>
                </div>
              )}
            </div>

            <div className="mt-2 ml-1">
              <span className="text-xs text-gray-600">{meta.label} #{id}</span>
            </div>
          </div>
        </div>

        {/* Indicateur modifications */}
        {hasUnsavedChanges && (
          <div className="px-4 py-1 bg-blue-50 text-blue-700 text-xs border-b border-blue-200 flex items-center justify-between">
            <span>Modifications non sauvegardées</span>
          </div>
        )}

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
                  const saved = await save(true);
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

function getTitle(type, item, data) {
  if (!item) return '';
  if (type === 'users') return getUserName(item);
  if (type === 'groups') return getGroupName(item);
  return getPermissionName(item, data.groups, data.modules);
}