// C:\python\django\somane_fronten\somane_frontend\src\pages\Users\Show.jsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  FiAlertCircle,
  FiCamera,
  FiCheck,
  FiCopy,
  FiInfo,
  FiKey,
  FiLock,
  FiMail,
  FiPhone,
  FiPlus,
  FiRefreshCw,
  FiSend,
  FiSettings,
  FiShield,
  FiToggleRight,
  FiTrash2,
  FiUploadCloud,
  FiUserPlus,
  FiX,
} from 'react-icons/fi';
import { apiClient } from '../../services/apiClient';
import {
  CheckList,
  FormField,
  SECURITY_LIST_ROUTE,
  Section,
  Tooltip,
  buildPayload,
  getAccessType,
  getGroupName,
  getPermissionName,
  getResourceMeta,
  getUserName,
  inputClass,
  itemToForm,
  normalizeIds,
  useSecurityData,
  validateSecurityForm,
} from './SecurityShared';
import {
  SecurityForm,
  UserLocationFields,
  buildUserRequest,
  createInitialUserForm,
} from './Create';

// Palette Odoo-like pour les avatars, tirée de manière stable a partir du nom
const AVATAR_COLORS = [
  '#875A7B', '#F06050', '#F4A460', '#7C7BAD', '#6CC1ED',
  '#814968', '#2C8397', '#475577', '#D6145F', '#30C381', '#B36C4A',
];

function getAvatarColor(name = '') {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitial(name = '') {
  const trimmed = name.trim();
  return trimmed ? trimmed.charAt(0).toUpperCase() : '?';
}

// Déduit l'origine du backend (sans le /api final) a partir de la config d'apiClient,
// pour transformer une URL relative ("/media/users/x.jpg") en URL absolue utilisable
// dans un <img>.
function getBackendOrigin() {
  const base =
    apiClient?.defaults?.baseURL ||
    apiClient?.baseURL ||
    apiClient?.axios?.defaults?.baseURL ||
    '';

  if (!base) return '';

  try {
    const url = new URL(base, window.location.origin);
    return url.origin;
  } catch {
    return base.replace(/\/api\/?$/, '');
  }
}

function resolveMediaUrl(value) {
  if (typeof value !== 'string' || !value.trim()) return null;
  const trimmed = value.trim();

  if (/^(https?:|data:|blob:)/i.test(trimmed)) return trimmed;

  const origin = getBackendOrigin();
  const path = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return origin ? `${origin}${path}` : path;
}

// Cherche une photo utilisateur quel que soit le nom du champ renvoyé par l'API
function getAvatarUrl(item, formData) {
  // Si une nouvelle photo vient d'etre choisie localement (File), on la previsualise
  if (formData?.photo instanceof File) {
    return URL.createObjectURL(formData.photo);
  }

  if (!item) return null;

  const direct =
    item.avatar_url ||
    item.avatar ||
    item.photo_url ||
    item.photo ||
    item.picture ||
    item.image_url ||
    item.image;

  if (typeof direct === 'string' && direct.trim()) {
    if (/^[A-Za-z0-9+/=]+$/.test(direct) && direct.length > 100) {
      return `data:image/png;base64,${direct}`;
    }
    return resolveMediaUrl(direct);
  }

  return null;
}

// Récupère les ids de groupes de l'utilisateur, quel que soit le nom du champ
// renvoyé par l'API (groups / groupes / groupes_details, ids bruts ou objets)
function extractUserGroupIds(formData, item) {
  const raw =
    formData?.groups ??
    formData?.groupes ??
    item?.groups ??
    item?.groupes ??
    item?.groupes_details ??
    [];
  return normalizeIds(raw).map(String);
}

// Les 4 onglets de bas de page : un seul est affiché a la fois, a la place
// des anciens onglets (Informations / Localisation / Entités / Droits de groupe /
// Permissions directes / Partenaire).
const USER_TABS = [
  { key: 'droits_acces', label: "Droits d'accès" },
  { key: 'securite', label: 'Sécurité' },
  { key: 'preference', label: 'Préférence' },
  { key: 'notes', label: 'Notes' },
];

// ==========================================
// Bloc identité, toujours visible (hors onglets) :
// Nom, Prénoms, E-mail, Téléphone, Partenaire associé
// ==========================================
function UserIdentityFields({ formData, setField, errors }) {
  return (
    <div className="grid grid-cols-2 gap-x-8 gap-y-1 max-w-2xl">
      <FormField label="Nom" required error={errors.last_name}>
        <input
          type="text"
          value={formData.last_name || ''}
          onChange={(e) => setField('last_name', e.target.value)}
          className={inputClass(errors.last_name)}
          style={{ height: 26 }}
          placeholder="Ex: SOMANE"
          autoComplete="family-name"
        />
      </FormField>

      <FormField label="Prénoms" required error={errors.first_name}>
        <input
          type="text"
          value={formData.first_name || ''}
          onChange={(e) => setField('first_name', e.target.value)}
          className={inputClass(errors.first_name)}
          style={{ height: 26 }}
          placeholder="Ex: Kokou Séménou"
          autoComplete="given-name"
        />
      </FormField>

      <FormField label="E-mail" required error={errors.email}>
        <input
          type="email"
          value={formData.email || ''}
          onChange={(event) => {
            setField('email', event.target.value);
          }}
          className={inputClass(errors.email)}
          style={{ height: 26 }}
          autoComplete="email"
          placeholder="utilisateur@exemple.com"
        />
      </FormField>

      <FormField label="Téléphone" error={errors.telephone}>
        <input
          type="tel"
          value={formData.telephone || ''}
          onChange={(e) => setField('telephone', e.target.value)}
          className={inputClass(errors.telephone)}
          style={{ height: 26 }}
          placeholder="+228 91 80 01 14"
          autoComplete="tel"
        />
      </FormField>
    </div>
  );
}

// ==========================================
// Onglet "Droits d'accès" : groupes + entités + permissions directes
// (fusion des anciens onglets Entités et sociétés / Droits d'accès des
// groupes / Permissions directes)
// ==========================================
function UserDroitsAccesSection({ formData, setField, data, userGroups, userPermissions, navigate }) {
  return (
    <div className="space-y-4">
      <Section title="Entité et sociétés">
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Entité par défaut">
            <select
              value={formData.entite || ''}
              onChange={(e) => setField('entite', e.target.value)}
              className={inputClass()}
              style={{ height: 26 }}
            >
              <option value="">Aucune</option>
              {(data.entites || []).map((entity) => (
                <option key={entity.id} value={entity.id}>
                  {entity.raison_sociale || entity.nom || `Entité ${entity.id}`}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Société principale">
            <select
              value={formData.company_id || ''}
              onChange={(e) => setField('company_id', e.target.value)}
              className={inputClass()}
              style={{ height: 26 }}
            >
              <option value="">Aucune</option>
              {(data.entites || []).map((entity) => (
                <option key={entity.id} value={entity.id}>
                  {entity.raison_sociale || entity.nom || `Entité ${entity.id}`}
                </option>
              ))}
            </select>
          </FormField>
        </div>

        <div className="mt-3">
          <div className="mb-2 text-xs font-medium text-gray-700">Entités accessibles</div>
          <CheckList
            items={data.entites || []}
            value={formData.company_ids || []}
            onChange={(value) => setField('company_ids', value)}
            getLabel={(entity) => entity.raison_sociale || entity.nom || `Entité ${entity.id}`}
          />
        </div>
      </Section>

      <div className="border border-gray-300">
        <div className="bg-gray-100 border-b border-gray-300 px-3 py-2 text-xs font-medium text-gray-800">
          Groupe d'utilisateur
        </div>

        {userGroups.length === 0 ? (
          <div className="px-3 py-6 text-xs text-gray-500 text-center">
            Cet utilisateur n'appartient à aucun groupe.
          </div>
        ) : (
          userGroups.map((group) => (
            <div
              key={group.id}
              className="px-3 py-2.5 border-b border-gray-100 last:border-b-0 flex items-center justify-between hover:bg-gray-50"
            >
              <div>
                <div className="text-sm font-medium text-gray-900">{getGroupName(group)}</div>
                {group.description && (
                  <div className="text-xs text-gray-500 mt-0.5">{group.description}</div>
                )}
              </div>
              <button
                type="button"
                onClick={() => navigate(`${SECURITY_LIST_ROUTE}?tab=groups&id=${group.id}`)}
                className="text-xs text-purple-600 hover:text-purple-800 hover:underline flex-shrink-0"
              >
                Voir le groupe
              </button>
            </div>
          ))
        )}
      </div>

      <div className="border border-gray-300">
        <div className="bg-gray-100 border-b border-gray-300 px-3 py-2 text-xs font-medium text-gray-800">
          Permissions attribuées directement
        </div>

        {userPermissions.length === 0 ? (
          <div className="px-3 py-6 text-xs text-gray-500 text-center">
            Aucune permission directe n'est attribuée à cet utilisateur.
          </div>
        ) : (
          userPermissions.map((permission) => {
            const accessType = getAccessType(permission.acces);
            return (
              <div
                key={permission.id}
                className="px-3 py-2.5 border-b border-gray-100 last:border-b-0 flex items-center justify-between hover:bg-gray-50"
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">
                    {getPermissionName(permission, data.groups, data.modules, data.users)}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`px-1.5 py-0.5 text-[10px] font-medium border ${
                      permission.mode === 'deny'
                        ? 'bg-red-50 text-red-700 border-red-200'
                        : 'bg-green-50 text-green-700 border-green-200'
                    }`}>
                      {permission.mode === 'deny' ? 'Refuser' : 'Autoriser'}
                    </span>
                    {accessType && (
                      <span className={`px-1.5 py-0.5 text-[10px] font-medium border ${accessType.badge}`}>
                        {accessType.label}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => navigate(`${SECURITY_LIST_ROUTE}?tab=permissions&id=${permission.id}`)}
                  className="text-xs text-purple-600 hover:text-purple-800 hover:underline flex-shrink-0 ml-3"
                >
                  Ouvrir
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ==========================================
// Onglet "Sécurité" : identifiant, mot de passe, 2FA
// NB: les 3 actions ci-dessous sont des points d'accroche UI — a brancher
// sur les endpoints back (changement de mdp / envoi de reset / activation 2FA)
// quand ils seront disponibles.
// ==========================================
function UserSecuriteSection({ formData, setField, errors, onChangePassword, onSendReset, onToggle2fa, sending }) {
  return (
    <div className="space-y-4">
      <Section title="Identifiant">
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Nom utilisateur">
            <input
              type="text"
              value={formData.username || ''}
              onChange={(e) => setField('username', e.target.value)}
              className={inputClass()}
              style={{ height: 26 }}
              autoComplete="username"
            />
          </FormField>

          <FormField label="Statut">
            <select
              value={formData.statut || 'actif'}
              onChange={(e) => setField('statut', e.target.value)}
              className={inputClass()}
              style={{ height: 26 }}
            >
              <option value="actif">Actif</option>
              <option value="inactif">Inactif</option>
              <option value="suspendu">Suspendu</option>
            </select>
          </FormField>
        </div>
      </Section>

      <Section title="Mot de passe">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onChangePassword}
            disabled={sending}
            className="h-8 px-3 bg-purple-600 text-white text-xs hover:bg-purple-700 disabled:opacity-50 flex items-center gap-1.5"
          >
            <FiLock size={13} />
            Modifier le mot de passe
          </button>

          <button
            type="button"
            onClick={onSendReset}
            disabled={sending || !formData.email}
            className="
              h-8 px-3
              border border-gray-300
              text-gray-700 text-xs
              hover:bg-gray-50
              disabled:opacity-50
              disabled:cursor-not-allowed
              flex items-center gap-1.5
            "
            title={
              "Enregistrer l'adresse actuelle et envoyer " +
              "un lien de réinitialisation"
            }
          >
            <FiSend size={13} />

            {sending
              ? 'Envoi en cours...'
              : 'Envoyer la réinitialisation du mot de passe'}
          </button>
        </div>
      </Section>

      <Section title="Authentification à deux facteurs">
        <button
          type="button"
          onClick={onToggle2fa}
          disabled={sending}
          className={`h-8 px-3 text-xs font-medium border disabled:opacity-50 flex items-center gap-1.5 ${
            formData.two_factor_enabled
              ? 'bg-white text-red-600 border-red-300 hover:bg-red-50'
              : 'bg-purple-600 text-white border-purple-600 hover:bg-purple-700'
          }`}
        >
          <FiShield size={13} />
          {formData.two_factor_enabled ? 'Désactiver la 2FA' : 'Activer la 2FA'}
        </button>
      </Section>
    </div>
  );
}

// ==========================================
// Onglet "Préférence" : langue, fuseau horaire, localisation
// ==========================================
function UserPreferenceSection({ formData, setField, errors }) {
  return (
    <div className="space-y-4">
      <Section title="Préférences générales">
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Langue">
            <select
              value={formData.lang || 'fr_FR'}
              onChange={(e) => setField('lang', e.target.value)}
              className={inputClass()}
              style={{ height: 26 }}
            >
              <option value="fr_FR">Français</option>
              <option value="en_US">English</option>
            </select>
          </FormField>

          <FormField label="Fuseau horaire">
            <input
              type="text"
              value={formData.tz || 'UTC'}
              onChange={(e) => setField('tz', e.target.value)}
              className={inputClass()}
              style={{ height: 26 }}
              placeholder="UTC"
            />
          </FormField>
        </div>
      </Section>

      <Section title="Localisation">
        <UserLocationFields formData={formData} setField={setField} errors={errors} />
      </Section>
    </div>
  );
}

// ==========================================
// Onglet "Notes" : champ libre
// ==========================================
function UserNotesSection({ formData, setField }) {
  return (
    <Section title="Notes internes">
      <textarea
        value={formData.notes || ''}
        onChange={(e) => setField('notes', e.target.value)}
        rows={8}
        className="w-full border border-gray-300 text-sm px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-purple-500"
        placeholder="Notes internes concernant cet utilisateur..."
      />
    </Section>
  );
}

export default function SecurityShow() {
  const navigate = useNavigate();
  const params = useParams();
  const [searchParams] = useSearchParams();

  const type = searchParams.get('type') || params.type || 'users';
  const id = searchParams.get('id') || params.id;
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
  const [partnerType, setPartnerType] = useState('employe');
  const [creatingPartner, setCreatingPartner] = useState(false);
  const [showPartnerPanel, setShowPartnerPanel] = useState(false);
  const [activeTab, setActiveTab] = useState('droits_acces');
  const [avatarBroken, setAvatarBroken] = useState(false);

  const actionsMenuRef = useRef(null);
  const photoInputRef = useRef(null);
  const endpoint = type === 'users' ? 'users' : type === 'groups' ? 'groupes' : 'permissions';

  const partnerDetails = item?.partner_details || (
    typeof item?.partner_id === 'object' ? item.partner_id : null
  );
  const partnerId = partnerDetails?.id || (
    typeof item?.partner_id === 'number' ? item.partner_id : null
  );
  const hasPartner = Boolean(partnerId);

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

  const loadItem = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.get(`/${endpoint}/${id}/`);
      setItem(response);
      setFormData(type === 'users' ? createInitialUserForm(response) : itemToForm(type, response));
      setHasUnsavedChanges(false);
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || 'Chargement impossible');
    } finally {
      setLoading(false);
    }
  }, [endpoint, id, type]);

  useEffect(() => {
    loadItem();
  }, [loadItem]);

  useEffect(() => {
    setAvatarBroken(false);
  }, [item]);

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

  const isReady = formData ? Object.keys(validateSecurityForm(type, formData)).length === 0 : false;

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
      const payload = type === 'users'
        ? buildUserRequest(formData, true)
        : buildPayload(type, formData, item, data.partenaires);
      const updated = payload instanceof FormData
        ? await apiClient.request(`/${endpoint}/${id}/`, { method: 'PATCH', body: payload })
        : await apiClient.patch(`/${endpoint}/${id}/`, payload);

      setItem(updated);
      setFormData(type === 'users' ? createInitialUserForm(updated) : itemToForm(type, updated));
      setHasUnsavedChanges(false);

      if (!silent) setSuccess('Enregistre.');
      return true;
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || 'Enregistrement impossible.');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async () => {
    if (type === 'groups') return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const nextStatutValue =
        type === 'users'
          ? formData.statut === 'actif' ? 'inactif' : 'actif'
          : !formData.statut;

      const payload = buildPayload(
        type,
        { ...formData, statut: nextStatutValue, active: nextStatutValue },
        item,
        data.partenaires
      );

      const updated = await apiClient.patch(`/${endpoint}/${id}/`, payload);

      setItem(updated);
      setFormData(type === 'users' ? createInitialUserForm(updated) : itemToForm(type, updated));
      setHasUnsavedChanges(false);

      const isNowActive = type === 'users' ? nextStatutValue === 'actif' : nextStatutValue;
      setSuccess(isNowActive ? `${meta.label} active avec succes !` : `${meta.label} desactive avec succes !`);
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || 'Echec du changement de statut.');
    } finally {
      setSaving(false);
    }
  };

  // --- Actions de l'onglet Sécurité (a brancher sur les endpoints reels) ---
  const handleChangePassword = () => {
    setSuccess(null);
    setError('Changement de mot de passe : endpoint a brancher.');
  };

const handleSendResetPassword = async () => {
  if (type !== 'users') return;

  const newEmail = String(
    formData?.email || ''
  ).trim().toLowerCase();

  if (!newEmail) {
    setSuccess(null);
    setError(
      "L'adresse email de l'utilisateur est obligatoire."
    );
    return;
  }

  setError(null);
  setSuccess(null);

  /*
   * Si l'administrateur vient de modifier l'email,
   * il faut d'abord enregistrer l'utilisateur.
   */
  if (hasUnsavedChanges) {
    const saved = await save(true);

    if (!saved) {
      setError(
        "L'utilisateur n'a pas pu être enregistré. " +
        "L'email de réinitialisation n'a pas été envoyé."
      );
      return;
    }
  }

  setSaving(true);

  try {
    await apiClient.post(
      '/auth/users/reset_password/',
      {
        email: newEmail,
      }
    );

    setSuccess(
      `L'email de réinitialisation a été envoyé à ${newEmail}.`
    );
  } catch (err) {
    const apiErrors =
      err?.data ||
      err?.response?.data ||
      {};

    setError(
      apiErrors.email?.[0] ||
      apiErrors.detail ||
      err?.message ||
      "Impossible d'envoyer l'email de réinitialisation."
    );
  } finally {
    setSaving(false);
  }
};
  const handleToggle2fa = () => {
    setField('two_factor_enabled', !formData.two_factor_enabled);
  };

  const createPartner = async () => {
    if (type !== 'users' || !id) return;

    if (hasPartner) {
      setError('Cet utilisateur possède déjà un partenaire.');
      return;
    }

    if (hasUnsavedChanges) {
      setError("Enregistrez d'abord les modifications de l'utilisateur.");
      return;
    }

    setCreatingPartner(true);
    setError(null);
    setSuccess(null);

    try {
      await apiClient.post(`/users/${id}/create-partenaire/`, {
        type_partenaire: partnerType,
      });
      await loadItem();
      setShowPartnerPanel(false);
      setSuccess('Partenaire créé et associé avec succès.');
    } catch (err) {
      const apiErrors = err?.data || err?.response?.data || {};
      setError(
        apiErrors.partner_id?.[0] ||
        apiErrors.type_partenaire?.[0] ||
        apiErrors.entite?.[0] ||
        apiErrors.detail ||
        apiErrors.non_field_errors?.[0] ||
        err?.message ||
        'Création du partenaire impossible.'
      );
    } finally {
      setCreatingPartner(false);
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
    setSuccess('Duplication a implementer');
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
    setFormData(type === 'users' ? createInitialUserForm(item) : itemToForm(type, item));
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
            <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="mt-4 text-gray-600 text-sm">Chargement...</p>
          </div>
        </div>
      </div>
    );
  }

  const isActive = type === 'users' ? formData.statut === 'actif' : !!formData.statut;
  const title = getTitle(type, item, data);
  const avatarUrl = type === 'users' ? getAvatarUrl(item, formData) : null;
  const showTabs = type === 'users';

  const userGroupIds = type === 'users' ? extractUserGroupIds(formData, item) : [];
  const userGroups = (data.groups || []).filter((group) => userGroupIds.includes(String(group.id)));

  const userPermissions = type === 'users'
    ? (data.permissions || []).filter((permission) => {
        const permUserId = permission?.user?.id ?? permission?.user;
        return permUserId !== null && permUserId !== undefined && String(permUserId) === String(id);
      })
    : [];

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto bg-white border border-gray-300 relative overflow-hidden">
        {/* Barre superieure : Nouveau + fil d'ariane + actions */}
        <div className="border-b border-gray-300 px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <Tooltip text="Creer une nouvelle fiche">
                <button
                  onClick={handleNewItem}
                  className="h-9 px-4 bg-purple-600 text-white text-sm hover:bg-purple-700 hover:scale-105 hover:shadow-md active:scale-95 transition-all duration-200 flex items-center justify-center font-medium border-0 flex-shrink-0"
                >
                  <FiPlus size={16} className="mr-1" />
                  <span>Nouveau</span>
                </button>
              </Tooltip>

              <div className="flex items-center gap-1.5 text-sm min-w-0">
                <span
                  className="text-gray-500 hover:text-purple-600 cursor-pointer transition-colors duration-150"
                  onClick={() => navigate('/settings')}
                >
                  Paramètres
                </span>
                <span className="text-gray-300">/</span>
                <span
                  className="text-gray-500 hover:text-purple-600 cursor-pointer transition-colors duration-150"
                  onClick={handleGoToList}
                >
                  {meta.plural}
                </span>
                <span className="text-gray-300">/</span>
                <span className="text-gray-900 font-medium truncate">{title}</span>

                <div className="relative flex-shrink-0" ref={actionsMenuRef}>
                  <Tooltip text="Menu des actions">
                    <button
                      onClick={() => setShowActionsMenu(!showActionsMenu)}
                      className="ml-0.5 w-6 h-6 flex items-center justify-center text-gray-400 hover:text-purple-600 hover:bg-gray-100 rounded-sm transition-all duration-150"
                    >
                      <FiSettings size={13} />
                    </button>
                  </Tooltip>

                  {showActionsMenu && (
                    <div className="absolute left-0 mt-1 w-48 bg-white border border-gray-300 shadow-lg rounded-sm z-50">
                      <button
                        onClick={handleDuplicate}
                        className="w-full px-3 py-2 text-xs text-left hover:bg-gray-50 hover:pl-4 transition-all duration-200 flex items-center gap-2 border-b border-gray-100"
                      >
                        <FiCopy size={12} />
                        Dupliquer
                      </button>

                      <button
                        onClick={() => {
                          setShowActionsMenu(false);
                          loadItem();
                        }}
                        className="w-full px-3 py-2 text-xs text-left hover:bg-gray-50 hover:pl-4 transition-all duration-200 flex items-center gap-2 border-b border-gray-100"
                      >
                        <FiRefreshCw size={12} />
                        Actualiser
                      </button>

                      <button
                        onClick={remove}
                        className="w-full px-3 py-2 text-xs text-left hover:bg-red-50 hover:text-red-600 hover:pl-4 transition-all duration-200 flex items-center gap-2"
                      >
                        <FiTrash2 size={12} />
                        Supprimer
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
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

        {/* Bloc identite : avatar + nom/prenoms/email/telephone + partenaire — toujours visible */}
        <div className="px-6 pt-6 pb-0">
          <div className="flex items-start gap-6 flex-wrap">
            <div className="flex items-start gap-5 min-w-0">
              <div className="relative flex-shrink-0">
                {avatarUrl && !avatarBroken ? (
                  <img
                    src={avatarUrl}
                    alt={title}
                    onError={() => setAvatarBroken(true)}
                    className="w-24 h-24 rounded-md object-cover border border-gray-200 select-none"
                  />
                ) : (
                  <div
                    className="w-24 h-24 rounded-md flex items-center justify-center text-white text-4xl font-bold select-none"
                    style={{ backgroundColor: getAvatarColor(title) }}
                  >
                    {getInitial(title)}
                  </div>
                )}

                {type === 'users' && (
                  <>
                    <Tooltip text="Changer la photo">
                      <button
                        type="button"
                        onClick={() => photoInputRef.current?.click()}
                        className="absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-full bg-white border border-gray-300 shadow-sm flex items-center justify-center text-gray-600 hover:text-purple-600 hover:border-purple-400 transition-colors duration-150"
                      >
                        <FiCamera size={13} />
                      </button>
                    </Tooltip>
                    <input
                      ref={photoInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => setField('photo', e.target.files?.[0] || null)}
                    />
                  </>
                )}
              </div>

              <div className="min-w-0 pt-1">
                {type === 'users' ? (
                  <>
                    <UserIdentityFields formData={formData} setField={setField} errors={fieldErrors} />

                    <div className="mt-2 flex items-center gap-2 text-sm">
                      <span className="text-gray-500">Partenaire associé :</span>
                      {hasPartner ? (
                        <span className="font-medium text-gray-900">
                          {partnerDetails?.nom || `Partenaire #${partnerId}`}
                        </span>
                      ) : (
                        <>
                          <span className="text-gray-400 italic">Aucun</span>
                          <button
                            type="button"
                            onClick={() => setShowPartnerPanel((v) => !v)}
                            className="text-xs text-purple-600 hover:text-purple-800 hover:underline flex items-center gap-1"
                          >
                            <FiUserPlus size={12} />
                            Créer le partenaire
                          </button>
                        </>
                      )}
                    </div>

                    {showPartnerPanel && !hasPartner && (
                      <div className="mt-2 p-3 border border-gray-200 bg-gray-50 max-w-2xl">
                        <p className="text-xs text-gray-600 mb-2">
                          Le partenaire sera créé depuis le nom, l'e-mail et le téléphone de cet utilisateur.
                        </p>
                        <div className="flex flex-wrap items-center gap-3">
                          <select
                            value={partnerType}
                            onChange={(event) => setPartnerType(event.target.value)}
                            disabled={creatingPartner}
                            className="h-8 min-w-[190px] border border-gray-300 bg-white px-2 text-xs"
                          >
                            <option value="employe">Employé</option>
                            <option value="client">Client</option>
                            <option value="fournisseur">Fournisseur</option>
                            <option value="debiteur">Débiteur divers</option>
                            <option value="crediteur">Créditeur divers</option>
                          </select>
                          <button
                            type="button"
                            onClick={createPartner}
                            disabled={creatingPartner || hasUnsavedChanges}
                            className="h-8 px-3 bg-green-600 text-white text-xs hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                          >
                            <FiUserPlus size={13} />
                            {creatingPartner ? 'Création...' : 'Créer le partenaire'}
                          </button>
                        </div>
                        {hasUnsavedChanges && (
                          <p className="mt-2 text-xs text-amber-600">
                            Enregistrez les modifications de l'utilisateur avant de créer son partenaire.
                          </p>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <h1 className="text-3xl font-bold text-gray-900 truncate">{title}</h1>
                )}

                {type === 'groups' && formData.description && (
                  <p className="mt-2 text-sm text-gray-600 max-w-xl">{formData.description}</p>
                )}

                {type === 'permissions' && (
                  <div className="mt-2 flex items-center gap-2">
                    <span className={`px-2 py-0.5 text-xs font-medium ${formData.target_type === 'user' ? 'bg-blue-100 text-blue-800' : formData.target_type === 'group' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'}`}>
                      {formData.target_type === 'user' ? 'Utilisateur' : formData.target_type === 'group' ? 'Groupe' : 'Global'}
                    </span>
                    <span className={`px-2 py-0.5 text-xs font-medium ${formData.mode === 'deny' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                      {formData.mode === 'deny' ? 'Refuser' : 'Autoriser'}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0 ml-auto">
              {type !== 'groups' && (
                <Tooltip text={isActive ? 'Desactiver' : 'Activer'}>
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
                    {isActive ? 'Desactiver' : 'Activer'}
                  </button>
                </Tooltip>
              )}
            </div>
          </div>

          {/* Onglets : Droits d'accès / Sécurité / Préférence / Notes — un seul affiché a la fois */}
          {showTabs && (
            <div className="mt-6 flex items-center gap-6 border-b border-gray-200">
              {USER_TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`pb-3 text-sm font-medium border-b-2 transition-colors duration-150 ${
                    activeTab === tab.key
                      ? 'border-purple-600 text-purple-700'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          )}

          {!showTabs && <div className="mt-6 border-b border-gray-200" />}
        </div>

        {/* Barre d'info : champs incomplets / erreur */}
        {(error || !isReady) && (
          <div className="px-6 pt-3">
            {error ? (
              <div className="flex items-center gap-1 text-xs text-red-600">
                <FiAlertCircle size={14} />
                <span>{error}</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-xs text-amber-600">
                <FiInfo size={14} />
                <span>Certains champs obligatoires sont incomplets</span>
              </div>
            )}
          </div>
        )}

        {hasUnsavedChanges && (
          <div className="mx-6 mt-3 px-3 py-1 bg-blue-50 text-blue-700 text-xs border border-blue-200 flex items-center justify-between">
            <span>Modifications non sauvegardees</span>
          </div>
        )}

        {/* Contenu de l'onglet actif (un seul rendu a la fois) */}
        <div className="p-6">
          {!showTabs && (
            <SecurityForm
              type={type}
              formData={formData}
              setField={setField}
              errors={fieldErrors}
              data={data}
              editing
            />
          )}

          {showTabs && activeTab === 'droits_acces' && (
            <UserDroitsAccesSection
              formData={formData}
              setField={setField}
              data={data}
              userGroups={userGroups}
              userPermissions={userPermissions}
              navigate={navigate}
            />
          )}

          {showTabs && activeTab === 'securite' && (
            <UserSecuriteSection
              formData={formData}
              setField={setField}
              errors={fieldErrors}
              onChangePassword={handleChangePassword}
              onSendReset={handleSendResetPassword}
              onToggle2fa={handleToggle2fa}
              sending={saving}
            />
          )}

          {showTabs && activeTab === 'preference' && (
            <UserPreferenceSection
              formData={formData}
              setField={setField}
              errors={fieldErrors}
            />
          )}

          {showTabs && activeTab === 'notes' && (
            <UserNotesSection formData={formData} setField={setField} />
          )}
        </div>

        {success && (
          <div className="px-6 py-3 text-sm border-t border-gray-300 transition-all duration-300 bg-green-50 text-green-700">
            <div className="flex items-center gap-2">
              <FiCheck size={14} />
              <span>{success}</span>
            </div>
          </div>
        )}
      </div>

      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-sm shadow-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-gray-900 mb-3">Modifications non sauvegardees</h3>
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
  return getPermissionName(item, data.groups, data.modules, data.users);
}