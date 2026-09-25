// C:\python\django\somane_fronten\somane_frontend\src\pages\Users\Create.jsx
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  FiAlertCircle,
  FiCheck,
  FiChevronDown,
  FiCopy,
  FiInfo,
  FiGlobe,
  FiMap,
  FiMapPin,
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
  PERMISSION_MODES,
  PERMISSION_TARGET_TYPES,
  SECURITY_LIST_ROUTE,
  Section,
  Tooltip,
  buildPayload,
  getAccessType,
  getGroupName,
  getPermissionName,
  getResourceMeta,
  getUserName,
  initialForms,
  inputClass,
  useSecurityData,
  validateSecurityForm,
} from './SecurityShared';
import { SearchableDropdown, parseResponse } from '../Partners/PartnerShared';

// ==========================================
// PERMISSIONS : catégorisation + détail
// ==========================================

// Liste des actions elementaires d'une permission — reprise du bloc "Droits"
// du formulaire de creation de permission, pour rester coherent partout.
export const PERMISSION_ACTION_FIELDS = [
  ['perm_read', 'Lire'],
  ['perm_create', 'Créer'],
  ['perm_write', 'Modifier'],
  ['perm_unlink', 'Supprimer'],
  ['perm_validate', 'Valider'],
  ['perm_cancel', 'Annuler'],
  ['perm_export', 'Exporter'],
  ['perm_import', 'Importer'],
  ['perm_print', 'Imprimer'],
];

// Retrouve le module (categorie) d'une permission, quelle que soit la forme
// sous laquelle l'API le renvoie (objet imbrique, id brut, ou via model_id).
export function getPermissionCategory(permission, modules = []) {
  const nested =
    (typeof permission?.module === 'object' ? permission.module : null) ||
    permission?.module_details ||
    (typeof permission?.model_id === 'object' ? permission.model_id?.module_details : null);

  if (nested) {
    return nested.nom_affiche || nested.nom || nested.name || 'Sans catégorie';
  }

  const moduleId = permission?.module ?? permission?.model_id?.module;
  const found = (modules || []).find((m) => String(m.id) === String(moduleId));
  return found ? (found.nom_affiche || found.nom || found.name || 'Sans catégorie') : 'Sans catégorie';
}

// Libellés des actions activées sur une permission (Lire, Créer, ...)
export function getPermissionActions(permission) {
  return PERMISSION_ACTION_FIELDS.filter(([field]) => !!permission?.[field]).map(([, label]) => label);
}

// Regroupe une liste de permissions par catégorie (module), triées par nom.
export function groupPermissionsByCategory(permissions, modules) {
  const map = new Map();
  (permissions || []).forEach((permission) => {
    const category = getPermissionCategory(permission, modules);
    if (!map.has(category)) map.set(category, []);
    map.get(category).push(permission);
  });
  return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
}

// Petit badge reutilisable pour mode / type d'acces / action
function PermissionBadge({ tone, children }) {
  const toneClass = {
    green: 'bg-green-50 text-green-700 border-green-200',
    red: 'bg-red-50 text-red-700 border-red-200',
    gray: 'bg-gray-50 text-gray-600 border-gray-200',
  }[tone] || 'bg-gray-50 text-gray-600 border-gray-200';

  return (
    <span className={`px-1.5 py-0.5 text-[10px] font-medium border ${toneClass}`}>
      {children}
    </span>
  );
}

// Ligne de detail d'une permission : nom + badges (mode, acces, actions).
// Utilisee aussi bien en lecture seule (showCheckbox=false) que dans un
// formulaire a cocher (showCheckbox=true).
export function PermissionDetailRow({ permission, groups, modules, users, checked, onToggle, showCheckbox = true }) {
  const accessType = getAccessType(permission.acces);
  const actions = getPermissionActions(permission);
  const name = getPermissionName(permission, groups, modules, users);

  const content = (
    <div className="min-w-0 flex-1">
      <div className="text-sm text-gray-900 truncate">{name}</div>
      <div className="mt-1 flex flex-wrap items-center gap-1">
        {permission.mode && (
          <PermissionBadge tone={permission.mode === 'deny' ? 'red' : 'green'}>
            {permission.mode === 'deny' ? 'Refuser' : 'Autoriser'}
          </PermissionBadge>
        )}
        {accessType && <PermissionBadge tone="gray">{accessType.label}</PermissionBadge>}
        {actions.map((action) => (
          <PermissionBadge key={action} tone="gray">{action}</PermissionBadge>
        ))}
        {actions.length === 0 && !accessType && (
          <span className="text-[11px] text-gray-400 italic">Aucun detail d'action</span>
        )}
      </div>
    </div>
  );

  if (!showCheckbox) {
    return (
      <div className="px-3 py-2.5 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 flex items-start gap-2">
        {content}
      </div>
    );
  }

  return (
    <label className="flex items-start gap-2 px-3 py-2.5 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 cursor-pointer">
      <input type="checkbox" checked={!!checked} onChange={onToggle} className="mt-1" />
      {content}
    </label>
  );
}

// Liste de permissions categorisee par module, avec en-tete pliable et
// "Tout cocher / Tout decocher" par categorie. Utilisee pour les permissions
// d'un groupe et pour les "Permissions directes" d'un utilisateur.
export function CategorizedPermissionsList({ permissions, value, onChange, modules, groups, users }) {
  const [collapsed, setCollapsed] = useState({});
  const selected = new Set((value || []).map(String));
  const categorized = groupPermissionsByCategory(permissions, modules);

  const toggleOne = (id) => {
    const idStr = String(id);
    const next = selected.has(idStr)
      ? (value || []).filter((v) => String(v) !== idStr)
      : [...(value || []), id];
    onChange(next);
  };

  const toggleCategory = (items, allSelected) => {
    const ids = items.map((p) => String(p.id));
    if (allSelected) {
      onChange((value || []).filter((v) => !ids.includes(String(v))));
    } else {
      const merged = new Set([...(value || []).map(String), ...ids]);
      onChange(Array.from(merged));
    }
  };

  if (categorized.length === 0) {
    return (
      <div className="px-3 py-6 text-xs text-gray-500 text-center border border-gray-200">
        Aucune permission disponible.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {categorized.map(([category, items]) => {
        const allSelected = items.every((p) => selected.has(String(p.id)));
        const isCollapsed = !!collapsed[category];

        return (
          <div key={category} className="border border-gray-300">
            <div className="bg-gray-100 border-b border-gray-300 px-3 py-2 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setCollapsed((prev) => ({ ...prev, [category]: !prev[category] }))}
                className="flex items-center gap-2 text-xs font-medium text-gray-800"
              >
                <FiChevronDown
                  size={12}
                  className={`transition-transform duration-150 ${isCollapsed ? '-rotate-90' : ''}`}
                />
                {category}
                <span className="text-gray-400 font-normal">
                  ({items.filter((p) => selected.has(String(p.id))).length}/{items.length})
                </span>
              </button>

              <button
                type="button"
                onClick={() => toggleCategory(items, allSelected)}
                className="text-[11px] text-purple-600 hover:text-purple-800 hover:underline"
              >
                {allSelected ? 'Tout décocher' : 'Tout cocher'}
              </button>
            </div>

            {!isCollapsed && items.map((permission) => (
              <PermissionDetailRow
                key={permission.id}
                permission={permission}
                groups={groups}
                modules={modules}
                users={users}
                checked={selected.has(String(permission.id))}
                onToggle={() => toggleOne(permission.id)}
              />
            ))}
          </div>
        );
      })}
    </div>
  );
}

// Meme rendu que ci-dessus mais en lecture seule (pas de cases a cocher) —
// pour l'affichage des permissions deja attribuees (ex: fiche utilisateur).
export function CategorizedPermissionsView({ permissions, modules, groups, users, emptyLabel = 'Aucune permission.' }) {
  const [collapsed, setCollapsed] = useState({});
  const categorized = groupPermissionsByCategory(permissions, modules);

  if (categorized.length === 0) {
    return (
      <div className="px-3 py-6 text-xs text-gray-500 text-center border border-gray-200">
        {emptyLabel}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {categorized.map(([category, items]) => {
        const isCollapsed = !!collapsed[category];
        return (
          <div key={category} className="border border-gray-300">
            <button
              type="button"
              onClick={() => setCollapsed((prev) => ({ ...prev, [category]: !prev[category] }))}
              className="w-full bg-gray-100 border-b border-gray-300 px-3 py-2 flex items-center gap-2 text-xs font-medium text-gray-800"
            >
              <FiChevronDown
                size={12}
                className={`transition-transform duration-150 ${isCollapsed ? '-rotate-90' : ''}`}
              />
              {category}
              <span className="text-gray-400 font-normal">({items.length})</span>
            </button>

            {!isCollapsed && items.map((permission) => (
              <PermissionDetailRow
                key={permission.id}
                permission={permission}
                groups={groups}
                modules={modules}
                users={users}
                showCheckbox={false}
              />
            ))}
          </div>
        );
      })}
    </div>
  );
}

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
    setFormData(type === 'users' ? createInitialUserForm() : initialForms[type]);
    setFieldErrors({});
    setHasUnsavedChanges(false);
  }, [type]);

  const markAsModified = () => {
    if (!hasUnsavedChanges) setHasUnsavedChanges(true);
  };

const setField = (field, value) => {
  setFormData((prev) => {
    const next = { ...prev, [field]: value };

    if (field === 'target_type') {
      next.groupe = '';
      next.user = '';

      if (value === 'group' || value === 'global') {
        next.mode = 'allow';
      }
    }

    if (field === 'module') {
      next.model_id = '';
    }

    return next;
  });

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
      const payload = type === 'users'
        ? buildUserRequest(formData)
        : buildPayload(type, formData, null, data.partenaires);
      if (type === 'users') await apiClient.post('/users/', payload);
      if (type === 'groups') await apiClient.post('/groupes/', payload);
      if (type === 'permissions') await apiClient.post('/permissions/', payload);
      setHasUnsavedChanges(false);
      if (!silent) {
        setSuccess(`${meta.label} créé avec succès !`);
        navigate(SECURITY_LIST_ROUTE);
      }
      return true;
    } catch (err) {
      const apiErrors = err?.data || err?.response?.data || {};
      setFieldErrors((prev) => ({
        ...prev,
        ...(apiErrors.email?.[0] ? { email: apiErrors.email[0] } : {}),
        ...(apiErrors.first_name?.[0] ? { first_name: apiErrors.first_name[0] } : {}),
        ...(apiErrors.last_name?.[0] ? { last_name: apiErrors.last_name[0] } : {}),
        ...(apiErrors.telephone?.[0] ? { telephone: apiErrors.telephone[0] } : {}),
        ...(apiErrors.groups?.[0] ? { groups: apiErrors.groups[0] } : {}),
      }));
      setError(
        apiErrors.detail ||
        apiErrors.email?.[0] ||
        apiErrors.non_field_errors?.[0] ||
        err?.message ||
        'Création impossible.'
      );
      return false;
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData(type === 'users' ? createInitialUserForm() : initialForms[type]);
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
function UserPhotoField({ formData, setField }) {
  const inputRef = useRef(null);
  const [previewUrl, setPreviewUrl] = useState(formData.photo_url || null);
  const [previewBroken, setPreviewBroken] = useState(false);

  useEffect(() => {
    if (!(formData.photo instanceof File)) {
      setPreviewUrl(formData.photo_url || null);
      setPreviewBroken(false);
      return undefined;
    }

    const objectUrl = URL.createObjectURL(formData.photo);
    setPreviewUrl(objectUrl);
    setPreviewBroken(false);

    // Libère l'URL temporaire quand la photo change ou au démontage.
    return () => URL.revokeObjectURL(objectUrl);
  }, [formData.photo, formData.photo_url]);

  const removePhoto = () => {
    setField('photo', null);
    setPreviewUrl(null);
    setPreviewBroken(false);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <FormField label="Photo">
      <div className="flex items-center gap-3">
        <div className="w-16 h-16 shrink-0 border border-gray-300 bg-gray-100 overflow-hidden flex items-center justify-center">
          {previewUrl && !previewBroken ? (
            <img
              src={previewUrl}
              alt="Aperçu de la photo utilisateur"
              className="w-full h-full object-cover"
              onError={() => setPreviewBroken(true)}
            />
          ) : (
            <span className="text-xl font-semibold text-gray-400">
              {(formData.first_name || formData.last_name || '?').trim().charAt(0).toUpperCase() || '?'}
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-1">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            onChange={(e) => setField('photo', e.target.files?.[0] || null)}
            className={inputClass()}
          />
          {formData.photo instanceof File && (
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-[11px] text-gray-500">{formData.photo.name}</span>
              <button
                type="button"
                onClick={removePhoto}
                className="shrink-0 text-[11px] text-red-600 hover:text-red-700"
              >
                Supprimer
              </button>
            </div>
          )}
        </div>
      </div>
    </FormField>
  );
}

export function SecurityForm({ type, formData, setField, errors, data, editing = false }) {
  if (type === 'users') {
    return (
      <div className="space-y-4">
        <Section title="Informations utilisateur">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <FormField label="Email" required error={errors.email}>
                <input
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => setField('email', e.target.value)}
                  disabled={editing}
                  className={`${inputClass(errors.email)} ${editing ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}`}
                  style={{ height: 26 }}
                  autoComplete="email"
                />
              </FormField>

              <FormField label="Prénom" required error={errors.first_name}>
                <input type="text" value={formData.first_name || ''} onChange={(e) => setField('first_name', e.target.value)} className={inputClass(errors.first_name)} style={{ height: 26 }} autoComplete="given-name" />
              </FormField>

              <FormField label="Nom" required error={errors.last_name}>
                <input type="text" value={formData.last_name || ''} onChange={(e) => setField('last_name', e.target.value)} className={inputClass(errors.last_name)} style={{ height: 26 }} autoComplete="family-name" />
              </FormField>

              <FormField label="Nom utilisateur">
                <input type="text" value={formData.username || ''} onChange={(e) => setField('username', e.target.value)} className={inputClass()} style={{ height: 26 }} autoComplete="username" />
              </FormField>

              <UserPhotoField formData={formData} setField={setField} />
            </div>

            <div className="space-y-2">
              <FormField label="Téléphone" error={errors.telephone}>
                <input type="tel" value={formData.telephone || ''} onChange={(e) => setField('telephone', e.target.value)} className={inputClass(errors.telephone)} style={{ height: 26 }} autoComplete="tel" />
              </FormField>

              <FormField label="Statut">
                <select value={formData.statut || 'actif'} onChange={(e) => setField('statut', e.target.value)} className={inputClass()} style={{ height: 26 }}>
                  <option value="actif">Actif</option>
                  <option value="inactif">Inactif</option>
                  <option value="suspendu">Suspendu</option>
                </select>
              </FormField>

              <FormField label="Fuseau horaire">
                <input type="text" value={formData.tz || 'UTC'} onChange={(e) => setField('tz', e.target.value)} className={inputClass()} style={{ height: 26 }} placeholder="UTC" />
              </FormField>

              <FormField label="Langue">
                <select value={formData.lang || 'fr_FR'} onChange={(e) => setField('lang', e.target.value)} className={inputClass()} style={{ height: 26 }}>
                  <option value="fr_FR">Français</option>
                  <option value="en_US">English</option>
                </select>
              </FormField>

              <p className="ml-[148px] text-[11px] text-gray-500">
                Le partenaire pourra être créé ensuite depuis la fiche de l'utilisateur.
              </p>
            </div>
          </div>
        </Section>

        <UserLocationFields formData={formData} setField={setField} errors={errors} />

        <Section title="Entités et sociétés">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Entité">
              <select value={formData.entite || ''} onChange={(e) => setField('entite', e.target.value)} className={inputClass()} style={{ height: 26 }}>
                <option value="">Aucune</option>
                {(data.entites || []).map((entity) => <option key={entity.id} value={entity.id}>{entity.raison_sociale || entity.nom || `Entité ${entity.id}`}</option>)}
              </select>
            </FormField>
            <FormField label="Société principale">
              <select value={formData.company_id || ''} onChange={(e) => setField('company_id', e.target.value)} className={inputClass()} style={{ height: 26 }}>
                <option value="">Aucune</option>
                {(data.entites || []).map((entity) => <option key={entity.id} value={entity.id}>{entity.raison_sociale || entity.nom || `Entité ${entity.id}`}</option>)}
              </select>
            </FormField>
          </div>
          <div className="mt-3">
            <div className="mb-2 text-xs font-medium text-gray-700">Sociétés accessibles</div>
            <CheckList items={data.entites || []} value={formData.company_ids || []} onChange={(value) => setField('company_ids', value)} getLabel={(entity) => entity.raison_sociale || entity.nom || `Entité ${entity.id}`} />
          </div>
        </Section>

        <Section title="Groupes">
          {errors.groups && <p className="mb-2 text-xs text-red-600">{errors.groups}</p>}
          <CheckList items={data.groups} value={formData.groups} onChange={(value) => setField('groups', value)} getLabel={getGroupName} />
        </Section>

        <Section title="Permissions directes">
          <CategorizedPermissionsList
            permissions={data.permissions || []}
            value={formData.user_permissions || []}
            onChange={(value) => setField('user_permissions', value)}
            modules={data.modules}
            groups={data.groups}
            users={data.users}
          />
        </Section>

        <Section title="Accès">
          <div className="grid grid-cols-1 gap-4 text-xs">
            <label className="flex items-center gap-2"><input type="checkbox" checked={!!formData.is_active} onChange={(e) => setField('is_active', e.target.checked)} /> Compte actif</label>
          </div>
        </Section>
      </div>
    );
  }

if (type === 'groups') {
    return (
      <div className="space-y-4">
        <Section title="Informations du groupe">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <FormField label="Nom" required error={errors.name}>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setField('name', e.target.value)}
                  className={inputClass(errors.name)}
                  style={{ height: 26 }}
                  autoComplete="off"
                />
              </FormField>

              <FormField label="Catégorie">
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => setField('category', e.target.value)}
                  className={inputClass()}
                  style={{ height: 26 }}
                  autoComplete="off"
                />
              </FormField>
            </div>

            <div className="space-y-2">
              <FormField label="Description">
                <textarea
                  value={formData.description}
                  onChange={(e) => setField('description', e.target.value)}
                  className={inputClass()}
                  rows={4}
                />
              </FormField>

              <p className="ml-[148px] text-[11px] text-gray-500">
                Les membres, permissions et groupes hérités se configurent ci-dessous.
              </p>
            </div>
          </div>
        </Section>

        <Section title="Membres">
          <CheckList
            items={data.users}
            value={formData.members}
            onChange={(value) => setField('members', value)}
            getLabel={getUserName}
          />
        </Section>

        <Section title="Permissions">
          <CategorizedPermissionsList
            permissions={data.permissions}
            value={formData.permissions}
            onChange={(value) => setField('permissions', value)}
            modules={data.modules}
            groups={data.groups}
            users={data.users}
          />
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

const selectedModule = data.modules.find((m) => String(m.id) === String(formData.module));

const normalizeText = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace('modules.', '')
    .replace(/\s+/g, '_');

const selectedModuleKeys = selectedModule
  ? [
      selectedModule.nom,
      selectedModule.name,
      selectedModule.nom_affiche,
    ]
      .map(normalizeText)
      .filter(Boolean)
  : [];

const filteredModels = selectedModule && selectedModuleKeys.length
  ? data.models.filter((model) => {
      const modelPath = normalizeText(model.model);
      return selectedModuleKeys.some((key) =>
        modelPath === key ||
        modelPath.startsWith(`${key}.`) ||
        modelPath.includes(`.${key}.`)
      );
    })
  : data.models;

  const actionFields = PERMISSION_ACTION_FIELDS;

  return (
    <div className="space-y-4">
      <Section title="Permission">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <FormField label="Nom">
              <input value={formData.name} onChange={(e) => setField('name', e.target.value)} className={inputClass()} style={{ height: 26 }} />
            </FormField>

<FormField label="Type de regle" required>
  <select
    value={formData.target_type}
onChange={(e) => setField('target_type', e.target.value)}
    className={inputClass()}
    style={{ height: 26 }}
  >
    {PERMISSION_TARGET_TYPES.map((type) => (
      <option key={type.value} value={type.value}>{type.label}</option>
    ))}
  </select>
</FormField>

{formData.target_type === 'group' && (
  <FormField label="Groupe" required error={errors.groupe}>
    <select
      value={formData.groupe}
      onChange={(e) => setField('groupe', e.target.value)}
      className={inputClass(errors.groupe)}
      style={{ height: 26 }}
    >
      <option value="">Selectionner un groupe</option>
      {data.groups.map((g) => (
        <option key={g.id} value={g.id}>{g.name}</option>
      ))}
    </select>
  </FormField>
)}

{formData.target_type === 'user' && (
  <>
    <FormField label="Utilisateur" required error={errors.user}>
      <select
        value={formData.user}
        onChange={(e) => setField('user', e.target.value)}
        className={inputClass(errors.user)}
        style={{ height: 26 }}
      >
        <option value="">Selectionner un utilisateur</option>
        {data.users.map((u) => (
          <option key={u.id} value={u.id}>
            {getUserName(u)}
          </option>
        ))}
      </select>
    </FormField>

    <FormField label="Mode" required error={errors.mode}>
      <select
        value={formData.mode}
        onChange={(e) => setField('mode', e.target.value)}
        className={inputClass(errors.mode)}
        style={{ height: 26 }}
      >
        {PERMISSION_MODES.map((mode) => (
          <option key={mode.value} value={mode.value}>{mode.label}</option>
        ))}
      </select>
    </FormField>
  </>
)}

{formData.target_type !== 'user' && (
  <FormField label="Mode">
    <select
      value="allow"
      disabled
      className={inputClass()}
      style={{ height: 26 }}
    >
      <option value="allow">Autoriser</option>
    </select>
  </FormField>
)}

            <FormField label="Module" required error={errors.module}>
              <select
                value={formData.module}
                onChange={(e) => setField('module', e.target.value)}
                className={inputClass(errors.module)}
                style={{ height: 26 }}
              >
                <option value="">Sélectionner un module</option>
                {data.modules.map((m) => (
                  <option key={m.id} value={m.id}>{m.nom_affiche || m.nom || m.name}</option>
                ))}
              </select>
            </FormField>

            <FormField label="Modèle / Table" required error={errors.model_id}>
              <select value={formData.model_id} onChange={(e) => setField('model_id', e.target.value)} className={inputClass(errors.model_id)} style={{ height: 26 }}>
                <option value="">Sélectionner un modèle</option>
                {filteredModels.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name || model.model} ({model.model})
                  </option>
                ))}
              </select>
            </FormField>
          </div>

          <div className="space-y-2">
            <FormField label="Entité">
              <select value={formData.entite} onChange={(e) => setField('entite', e.target.value)} className={inputClass()} style={{ height: 26 }}>
                <option value="">Toutes les entités</option>
                {data.entites.map((e) => (
                  <option key={e.id} value={e.id}>{e.raison_sociale || e.name}</option>
                ))}
              </select>
            </FormField>

            <FormField label="Accès">
              <select value={formData.acces} onChange={(e) => setField('acces', e.target.value)} className={inputClass(errors.acces)} style={{ height: 26 }}>
                {ACCESS_TYPES.map((a) => (
                  <option key={a.value} value={a.value}>{a.label}</option>
                ))}
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

      <Section title="Droits">
        <div className="grid grid-cols-3 gap-2">
          {actionFields.map(([field, label]) => (
            <label key={field} className="flex items-center gap-2 border border-gray-200 px-3 py-2 text-xs hover:bg-gray-50 cursor-pointer">
              <input type="checkbox" checked={!!formData[field]} onChange={(e) => setField(field, e.target.checked)} />
              <span>{label}</span>
            </label>
          ))}
        </div>
      </Section>
    </div>
  );
}

export function createInitialUserForm(user = null) {
  return {
    ...initialForms.users,
    email: user?.email || '', username: user?.username || '',
    first_name: user?.first_name || '', last_name: user?.last_name || '',
    telephone: user?.telephone || '', photo: null, photo_url: user?.photo || null,
    pays: user?.pays?.id || user?.pays || '',
    region: user?.region?.id || user?.region || '',
    ville: user?.ville?.id || user?.ville || '',
    tz: user?.tz || 'UTC', lang: user?.lang || 'fr_FR',
    statut: user?.statut || 'actif', is_active: user ? !!user.is_active : true,
    entite: user?.entite?.id || user?.entite || '',
    company_id: user?.company_id?.id || user?.company_id || '',
    company_ids: (user?.company_ids_details || []).map((entry) => entry.id),
    groups: (user?.groups || []).map((entry) => entry?.id ?? entry),
    user_permissions: (user?.user_permissions || []).map((entry) => entry?.id ?? entry),
  };
}

export function buildUserRequest(
  formData,
  editing = false
) {
  const payload = {
    email: formData.email?.trim().toLowerCase() || '',
    username: formData.username?.trim() || '',
    first_name: formData.first_name?.trim() || '',
    last_name: formData.last_name?.trim() || '',
    telephone: formData.telephone?.trim() || '',
    tz: formData.tz?.trim() || 'UTC',
    lang: formData.lang || 'fr_FR',
    statut: formData.statut || 'actif',
    is_active: !!formData.is_active,

    pays: formData.pays
      ? Number(formData.pays)
      : null,

    region: formData.region
      ? Number(formData.region)
      : null,

    ville: formData.ville
      ? Number(formData.ville)
      : null,

    entite: formData.entite
      ? Number(formData.entite)
      : null,

    company_id: formData.company_id
      ? Number(formData.company_id)
      : null,

    company_ids: (
      formData.company_ids || []
    ).map(Number),

    groups: (
      formData.groups || []
    ).map(Number),

    user_permissions: (
      formData.user_permissions || []
    ).map(Number),
  };

  // Ne surtout plus supprimer payload.email ici.

  if (!(formData.photo instanceof File)) {
    return payload;
  }

  const multipart = new FormData();

  Object.entries(payload).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((entry) => {
        multipart.append(key, entry);
      });
    } else if (
      value !== null &&
      value !== undefined
    ) {
      multipart.append(key, value);
    }
  });

  multipart.append('photo', formData.photo);

  return multipart;
}

export function UserLocationFields({ formData, setField, errors }) {
  const [countries, setCountries] = useState([]);
  const [regions, setRegions] = useState([]);
  const [cities, setCities] = useState([]);
  const [searchCountry, setSearchCountry] = useState('');
  const [searchRegion, setSearchRegion] = useState('');
  const [searchCity, setSearchCity] = useState('');

  useEffect(() => {
    let mounted = true;
    apiClient.get('/pays/').then((response) => {
      if (mounted) setCountries(parseResponse(response));
    }).catch(() => {
      if (mounted) setCountries([]);
    });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!formData.pays) {
      setRegions([]);
      setCities([]);
      return undefined;
    }
    let mounted = true;
    apiClient.get(`/subdivisions/?pays=${formData.pays}`).then((response) => {
      if (mounted) setRegions(parseResponse(response));
    }).catch(() => {
      if (mounted) setRegions([]);
    });
    return () => { mounted = false; };
  }, [formData.pays]);

  useEffect(() => {
    if (!formData.region) {
      setCities([]);
      return undefined;
    }
    let mounted = true;
    apiClient.get(`/villes/?subdivision=${formData.region}`).then((response) => {
      if (mounted) setCities(parseResponse(response));
    }).catch(() => {
      if (mounted) setCities([]);
    });
    return () => { mounted = false; };
  }, [formData.region]);

  return (
    <Section title="Localisation">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <FormField label="Pays" error={errors.pays}>
            <SearchableDropdown value={formData.pays || null} onChange={(value) => { setField('pays', value); setField('region', ''); setField('ville', ''); }} options={countries} searchValue={searchCountry} onSearchChange={setSearchCountry} placeholder="Sélectionner un pays" icon={FiGlobe} getOptionLabel={(country) => `${country.emoji || ''} ${country.nom_fr || country.nom || ''} (${country.code_iso || ''})`} getOptionValue={(country) => country.id} errorClass={errors.pays ? 'border-red-500' : ''} />
          </FormField>
          <FormField label="Région" error={errors.region}>
            <SearchableDropdown value={formData.region || null} onChange={(value) => { setField('region', value); setField('ville', ''); }} options={regions} searchValue={searchRegion} onSearchChange={setSearchRegion} placeholder="Sélectionner une région" disabled={!formData.pays} icon={FiMap} getOptionLabel={(region) => `${region.nom || ''} (${region.type_subdivision || ''})`} getOptionValue={(region) => region.id} errorClass={errors.region ? 'border-red-500' : ''} />
          </FormField>
          <FormField label="Ville" error={errors.ville}>
            <SearchableDropdown value={formData.ville || null} onChange={(value) => setField('ville', value)} options={cities} searchValue={searchCity} onSearchChange={setSearchCity} placeholder="Sélectionner une ville" disabled={!formData.region} icon={FiMapPin} getOptionLabel={(city) => `${city.nom || ''}${city.subdivision_nom ? ` (${city.subdivision_nom})` : ''}`} getOptionValue={(city) => city.id} errorClass={errors.ville ? 'border-red-500' : ''} />
          </FormField>
        </div>
        <div className="bg-gray-50 border border-gray-200 p-3 text-xs text-gray-600">
          Le choix est dépendant : le pays charge ses régions, puis la région charge ses villes. Ces informations seront reprises lors de la création du partenaire associé.
        </div>
      </div>
    </Section>
  );
}