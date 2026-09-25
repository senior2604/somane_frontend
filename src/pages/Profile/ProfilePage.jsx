import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  FiAlertCircle,
  FiCamera,
  FiCheck,
  FiEye,
  FiEyeOff,
  FiGlobe,
  FiLock,
  FiMail,
  FiPhone,
  FiSave,
  FiShield,
  FiUser,
  FiUploadCloud,
  FiX,
} from 'react-icons/fi';
import { apiClient } from '../../services/apiClient';

const initialForm = {
  first_name: '',
  last_name: '',
  email: '',
  telephone: '',
  lang: 'fr',
  tz: 'Africa/Lome',
  photo: null,
  photo_url: null,
};

const LANGUAGES = [
  { value: 'fr', label: 'Français' },
  { value: 'en', label: 'Anglais' },
];

const TIMEZONES = [
  { value: 'Africa/Lome', label: 'Afrique/Lomé' },
  { value: 'Africa/Abidjan', label: 'Afrique/Abidjan' },
  { value: 'Africa/Dakar', label: 'Afrique/Dakar' },
  { value: 'Africa/Cotonou', label: 'Afrique/Cotonou' },
  { value: 'Europe/Paris', label: 'Europe/Paris' },
  { value: 'UTC', label: 'UTC' },
];

// Palette d'avatars dérivée de manière stable à partir de l'e-mail/nom
const AVATAR_PALETTE = [
  { fg: '#6D28D9', bg: '#EDE9FE' }, // violet
  { fg: '#0369A1', bg: '#E0F2FE' }, // sky
  { fg: '#047857', bg: '#D1FAE5' }, // emerald
  { fg: '#BE185D', bg: '#FCE7F3' }, // pink
  { fg: '#B45309', bg: '#FEF3C7' }, // amber
  { fg: '#4338CA', bg: '#E0E7FF' }, // indigo
];

function pickAvatarColors(seed) {
  const str = seed || 'user';
  let hash = 0;
  for (let i = 0; i < str.length; i += 1) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
}

function getInitials(firstName, lastName, email) {
  const a = (firstName || '').trim();
  const b = (lastName || '').trim();
  if (a || b) return `${a.charAt(0)}${b.charAt(0)}`.toUpperCase() || a.charAt(0).toUpperCase();
  if (email) return email.charAt(0).toUpperCase();
  return 'U';
}

function isValidPhone(value) {
  if (!value) return true; // le téléphone est optionnel
  return /^[+]?[\d\s().-]{6,20}$/.test(value.trim());
}

function passwordStrength(pwd) {
  if (!pwd) return { score: 0, label: '' };
  let score = 0;
  if (pwd.length >= 8) score += 1;
  if (pwd.length >= 12) score += 1;
  if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score += 1;
  if (/\d/.test(pwd)) score += 1;
  if (/[^A-Za-z0-9]/.test(pwd)) score += 1;
  const labels = ['Trop faible', 'Faible', 'Moyen', 'Bon', 'Fort', 'Excellent'];
  return { score, label: labels[score] };
}

function resolveMediaUrl(value) {
  if (!value || typeof value !== 'string') return null;
  if (/^(https?:|data:|blob:)/i.test(value)) return value;

  try {
    const backendOrigin = new URL(apiClient.baseURL, window.location.origin).origin;
    return `${backendOrigin}${value.startsWith('/') ? value : `/${value}`}`;
  } catch {
    return value;
  }
}

export default function ProfilePage() {
  const [form, setForm] = useState(initialForm);
  const [original, setOriginal] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [toast, setToast] = useState(null); // { type: 'error' | 'success', message }
  const [fieldErrors, setFieldErrors] = useState({});

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState(null);
  const [avatarBroken, setAvatarBroken] = useState(false);

  const toastTimerRef = useRef(null);
  const photoInputRef = useRef(null);

  const hasChanges = useMemo(
    () => JSON.stringify(form) !== JSON.stringify(original),
    [form, original]
  );

  const fullName = useMemo(() => {
    return [form.first_name, form.last_name].filter(Boolean).join(' ') || form.email || 'Utilisateur';
  }, [form.first_name, form.last_name, form.email]);

  const avatarColors = useMemo(
    () => pickAvatarColors(form.email || fullName),
    [form.email, fullName]
  );
  const initials = useMemo(
    () => getInitials(form.first_name, form.last_name, form.email),
    [form.first_name, form.last_name, form.email]
  );

  const avatarUrl = avatarPreviewUrl || resolveMediaUrl(form.photo_url);

  useEffect(() => {
    if (!(form.photo instanceof File)) {
      setAvatarPreviewUrl(null);
      setAvatarBroken(false);
      return undefined;
    }

    const objectUrl = URL.createObjectURL(form.photo);
    setAvatarPreviewUrl(objectUrl);
    setAvatarBroken(false);
    return () => URL.revokeObjectURL(objectUrl);
  }, [form.photo]);

  useEffect(() => {
    loadProfile();
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showToast = (type, message, duration = 4000) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ type, message });
    toastTimerRef.current = setTimeout(() => setToast(null), duration);
  };

  const normalizeProfile = (data) => ({
    first_name: data?.first_name || '',
    last_name: data?.last_name || '',
    email: data?.email || '',
    telephone: data?.telephone || '',
    lang: data?.lang || 'fr',
    tz: data?.tz || 'Africa/Lome',
    photo: null,
    photo_url: data?.photo || data?.photo_url || data?.avatar || null,
    is_staff: !!data?.is_staff,
    is_superuser: !!data?.is_superuser,
  });

  const loadProfile = async () => {
    setLoading(true);

    try {
      const response = await apiClient.get('/profile/me/');
      const profile = normalizeProfile(response?.data ?? response);

      setForm(profile);
      setOriginal(profile);
      localStorage.setItem('user_data', JSON.stringify(profile));
    } catch (err) {
      showToast('error', err?.response?.data?.detail || err?.message || 'Chargement du profil impossible.');
    } finally {
      setLoading(false);
    }
  };

  const setField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const validate = () => {
    const errors = {};
    if (!form.first_name.trim()) errors.first_name = 'Le prénom est requis.';
    if (!form.last_name.trim()) errors.last_name = 'Le nom est requis.';
    if (!isValidPhone(form.telephone)) errors.telephone = 'Format de téléphone invalide.';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const revertChanges = () => {
    setForm(original);
    setFieldErrors({});
    if (photoInputRef.current) photoInputRef.current.value = '';
  };

  const saveProfile = async () => {
    if (!validate()) {
      showToast('error', 'Merci de corriger les champs en erreur avant d\u2019enregistrer.');
      return;
    }

    setSaving(true);

    try {
      const values = {
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        telephone: form.telephone.trim(),
        lang: form.lang,
        tz: form.tz,
      };

      let payload = values;
      if (form.photo instanceof File) {
        payload = new FormData();
        Object.entries(values).forEach(([key, value]) => payload.append(key, value));
        payload.append('photo', form.photo);
      }

      const response = payload instanceof FormData
        ? await apiClient.request('/profile/me/', { method: 'PATCH', body: payload })
        : await apiClient.patch('/profile/me/', payload);
      const profile = normalizeProfile(response?.data ?? response);

      setForm(profile);
      setOriginal(profile);
      localStorage.setItem('user_data', JSON.stringify(profile));
      showToast('success', 'Profil enregistré avec succès.');
    } catch (err) {
      showToast('error', err?.response?.data?.detail || err?.message || 'Enregistrement impossible.');
    } finally {
      setSaving(false);
    }
  };

  const roleLabel = form.is_superuser
    ? 'Administrateur'
    : form.is_staff
      ? 'Membre du staff'
      : 'Utilisateur';

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 p-4">
        <div className="mx-auto max-w-5xl animate-pulse space-y-4">
          <div className="h-24 rounded-2xl bg-slate-200" />
          <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
            <div className="h-64 rounded-2xl bg-slate-200" />
            <div className="h-64 rounded-2xl bg-slate-200" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4">
      <div className="mx-auto max-w-5xl">
        {/* En-tête */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="relative bg-gradient-to-r from-violet-600 to-violet-500 px-6 py-8">
            <div className="flex items-center gap-4">
              <div className="group relative flex-shrink-0">
                <div
                  className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl text-2xl font-bold shadow-xl ring-4 ring-white/30"
                  style={{ backgroundColor: avatarColors.bg, color: avatarColors.fg }}
                >
                  {avatarUrl && !avatarBroken ? (
                    <img
                      src={avatarUrl}
                      alt={`Photo de ${fullName}`}
                      className="h-full w-full object-cover"
                      onError={() => setAvatarBroken(true)}
                    />
                  ) : initials}
                </div>
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  className="absolute -bottom-2 -right-2 flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-slate-900 text-white shadow-lg transition hover:scale-105 hover:bg-slate-800"
                  aria-label="Modifier la photo"
                >
                  <FiCamera size={16} />
                </button>
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(event) => setField('photo', event.target.files?.[0] || null)}
                />
              </div>
              <div className="min-w-0">
                <h1 className="truncate text-xl font-bold text-white">{fullName}</h1>
                <p className="truncate text-sm text-violet-100">{form.email}</p>
                <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-medium text-white">
                  <FiShield size={11} />
                  {roleLabel}
                </span>
              </div>
            </div>
          </div>

          {/* Barre d'actions / statut */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-6 py-3">
            <div className="text-sm text-slate-500">
              {hasChanges ? (
                <span className="inline-flex items-center gap-1.5 text-amber-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                  Modifications non enregistrées
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-slate-400">
                  <FiCheck size={13} />
                  À jour
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {hasChanges && (
                <button
                  type="button"
                  onClick={revertChanges}
                  disabled={saving}
                  className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Annuler
                </button>
              )}
              <button
                type="button"
                onClick={saveProfile}
                disabled={!hasChanges || saving}
                className="flex h-9 items-center gap-2 rounded-lg bg-violet-600 px-4 text-sm font-medium text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <FiSave size={15} />
                {saving ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>

        {/* Contenu */}
        <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_320px]">
          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <SectionHeader icon={<FiUser size={15} />} title="Informations personnelles" />
            <div className="space-y-4 p-5">
              <div className="flex items-center justify-between gap-4 rounded-xl border border-dashed border-violet-200 bg-violet-50/60 p-4">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800">Photo de profil</p>
                  <p className="mt-0.5 truncate text-xs text-slate-500">
                    {form.photo instanceof File
                      ? `${form.photo.name} · ${Math.ceil(form.photo.size / 1024)} Ko`
                      : avatarUrl
                        ? 'Une photo est actuellement enregistrée.'
                        : 'Ajoutez une photo JPG, PNG ou WebP.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  className="flex h-9 shrink-0 items-center gap-2 rounded-lg bg-white px-3 text-sm font-medium text-violet-700 shadow-sm ring-1 ring-violet-200 transition hover:bg-violet-100"
                >
                  <FiUploadCloud size={15} />
                  {avatarUrl ? 'Remplacer' : 'Ajouter'}
                </button>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Prénom" error={fieldErrors.first_name}>
                  <input
                    value={form.first_name}
                    onChange={(e) => setField('first_name', e.target.value)}
                    className={inputClass(fieldErrors.first_name)}
                    placeholder="Ex: Malike"
                  />
                </Field>

                <Field label="Nom" error={fieldErrors.last_name}>
                  <input
                    value={form.last_name}
                    onChange={(e) => setField('last_name', e.target.value)}
                    className={inputClass(fieldErrors.last_name)}
                    placeholder="Ex: Kolani"
                  />
                </Field>
              </div>

              <Field label="Email">
                <div className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-500">
                  <FiMail size={14} />
                  <span className="truncate">{form.email || '-'}</span>
                  <span className="ml-auto shrink-0 rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-medium text-slate-500">
                    Non modifiable
                  </span>
                </div>
              </Field>

              <Field label="Téléphone" error={fieldErrors.telephone}>
                <div className="relative">
                  <FiPhone size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={form.telephone}
                    onChange={(e) => setField('telephone', e.target.value)}
                    className={`${inputClass(fieldErrors.telephone)} pl-9`}
                    placeholder="+228 90 00 00 00"
                  />
                </div>
              </Field>
            </div>
          </section>

          <aside className="space-y-4">
            <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <SectionHeader icon={<FiGlobe size={15} />} title="Préférences" />
              <div className="space-y-4 p-5">
                <Field label="Langue" stacked>
                  <select
                    value={form.lang}
                    onChange={(e) => setField('lang', e.target.value)}
                    className={inputClass()}
                  >
                    {LANGUAGES.map((item) => (
                      <option key={item.value} value={item.value}>{item.label}</option>
                    ))}
                  </select>
                </Field>

                <Field label="Fuseau horaire" stacked>
                  <select
                    value={form.tz}
                    onChange={(e) => setField('tz', e.target.value)}
                    className={inputClass()}
                  >
                    {TIMEZONES.map((item) => (
                      <option key={item.value} value={item.value}>{item.label}</option>
                    ))}
                  </select>
                </Field>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <SectionHeader icon={<FiLock size={15} />} title="Sécurité" />
              <div className="p-5">
                <p className="mb-3 text-xs text-slate-500">
                  Choisissez un mot de passe unique, que vous n'utilisez sur aucun autre service.
                </p>
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(true)}
                  className="flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  <FiLock size={14} />
                  Changer le mot de passe
                </button>
              </div>
            </section>
          </aside>
        </div>
      </div>

      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}

      {showPasswordModal && (
        <PasswordModal
          onClose={() => setShowPasswordModal(false)}
          onSuccess={() => {
            setShowPasswordModal(false);
            showToast('success', 'Mot de passe mis à jour avec succès.');
          }}
          onError={(msg) => showToast('error', msg)}
        />
      )}
    </div>
  );
}

function inputClass(error) {
  return `h-10 w-full rounded-lg border px-3 text-sm outline-none transition focus:ring-2 ${
    error
      ? 'border-red-300 focus:border-red-400 focus:ring-red-100'
      : 'border-slate-300 focus:border-violet-500 focus:ring-violet-100'
  }`;
}

function SectionHeader({ icon, title }) {
  return (
    <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50/70 px-5 py-3 text-sm font-semibold text-slate-800">
      <span className="text-violet-600">{icon}</span>
      {title}
    </div>
  );
}

function Field({ label, children, error, stacked = false }) {
  const content = (
    <>
      {children}
      {error && (
        <p className="mt-1 flex items-center gap-1 text-xs text-red-600">
          <FiAlertCircle size={12} />
          {error}
        </p>
      )}
    </>
  );

  if (stacked) {
    return (
      <label className="block">
        <span className="mb-1.5 block text-xs font-medium text-slate-700">{label}</span>
        {content}
      </label>
    );
  }

  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-slate-700">{label}</span>
      {content}
    </label>
  );
}

function Toast({ type, message, onClose }) {
  const isError = type === 'error';
  return (
    <div className="pointer-events-none fixed bottom-6 right-6 z-50 flex justify-end">
      <div
        className={`pointer-events-auto flex max-w-sm items-start gap-2 rounded-xl border px-4 py-3 text-sm shadow-lg ${
          isError
            ? 'border-red-200 bg-red-50 text-red-700'
            : 'border-emerald-200 bg-emerald-50 text-emerald-700'
        }`}
      >
        {isError ? <FiAlertCircle size={16} className="mt-0.5 shrink-0" /> : <FiCheck size={16} className="mt-0.5 shrink-0" />}
        <span className="flex-1">{message}</span>
        <button type="button" onClick={onClose} className="shrink-0 text-current opacity-60 hover:opacity-100">
          <FiX size={15} />
        </button>
      </div>
    </div>
  );
}

function PasswordModal({ onClose, onSuccess, onError }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const strength = useMemo(() => passwordStrength(newPassword), [newPassword]);

  const validate = () => {
    const next = {};
    if (!currentPassword) next.currentPassword = 'Mot de passe actuel requis.';
    if (newPassword.length < 8) next.newPassword = '8 caractères minimum.';
    if (newPassword && currentPassword && newPassword === currentPassword) {
      next.newPassword = 'Choisissez un mot de passe différent de l\u2019actuel.';
    }
    if (confirmPassword !== newPassword) next.confirmPassword = 'Les mots de passe ne correspondent pas.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      // NB: adaptez ce endpoint si votre API expose un chemin différent
      // pour le changement de mot de passe (ex: /auth/password/change/).
      await apiClient.post('/auth/change-password/', {
        current_password: currentPassword,
        new_password: newPassword,
      });
      onSuccess();
    } catch (err) {
      const detail = err?.response?.data?.detail
        || err?.response?.data?.current_password?.[0]
        || err?.response?.data?.new_password?.[0]
        || err?.message
        || 'Impossible de modifier le mot de passe.';
      onError(detail);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
            <FiLock size={15} className="text-violet-600" />
            Changer le mot de passe
          </h2>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <FiX size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-5 py-4">
          <PasswordField
            label="Mot de passe actuel"
            value={currentPassword}
            onChange={setCurrentPassword}
            show={showCurrent}
            onToggleShow={() => setShowCurrent((v) => !v)}
            error={errors.currentPassword}
          />

          <div>
            <PasswordField
              label="Nouveau mot de passe"
              value={newPassword}
              onChange={setNewPassword}
              show={showNew}
              onToggleShow={() => setShowNew((v) => !v)}
              error={errors.newPassword}
            />
            {newPassword && (
              <div className="mt-1.5">
                <div className="flex h-1.5 gap-1 overflow-hidden rounded-full bg-slate-100">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <span
                      key={i}
                      className={`flex-1 rounded-full ${
                        i < strength.score
                          ? strength.score <= 2
                            ? 'bg-red-400'
                            : strength.score <= 3
                              ? 'bg-amber-400'
                              : 'bg-emerald-500'
                          : 'bg-slate-100'
                      }`}
                    />
                  ))}
                </div>
                <p className="mt-1 text-xs text-slate-500">{strength.label}</p>
              </div>
            )}
          </div>

          <PasswordField
            label="Confirmer le nouveau mot de passe"
            value={confirmPassword}
            onChange={setConfirmPassword}
            show={showNew}
            error={errors.confirmPassword}
          />

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex h-9 items-center gap-2 rounded-lg bg-violet-600 px-4 text-sm font-medium text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? 'Mise à jour...' : 'Mettre à jour'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function PasswordField({ label, value, onChange, show, onToggleShow, error }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-slate-700">{label}</span>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={inputClass(error) + (onToggleShow ? ' pr-9' : '')}
          autoComplete="new-password"
        />
        {onToggleShow && (
          <button
            type="button"
            onClick={onToggleShow}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            {show ? <FiEyeOff size={15} /> : <FiEye size={15} />}
          </button>
        )}
      </div>
      {error && (
        <p className="mt-1 flex items-center gap-1 text-xs text-red-600">
          <FiAlertCircle size={12} />
          {error}
        </p>
      )}
    </label>
  );
}
