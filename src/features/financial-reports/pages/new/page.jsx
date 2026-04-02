// src/features/financial-reports/pages/new/page.jsx
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiClient } from '../../../../services/apiClient';
import {
  FiX, FiSave, FiFileText, FiHash, FiLayers,
  FiToggleLeft, FiToggleRight, FiChevronRight,
  FiBarChart2, FiTrendingUp, FiDollarSign, FiSliders,
  FiCheck, FiAlertCircle
} from 'react-icons/fi';

// ─── Types de rapport ─────────────────────────────────────────────────────────
const REPORT_TYPES = [
  {
    value: 'balance_sheet',
    label: 'Bilan',
    description: 'Actif, passif et capitaux propres',
    icon: FiBarChart2,
    color: '#4f6ef7',
    bg: '#eef1fe',
  },
  {
    value: 'profit_loss',
    label: 'Compte de résultat',
    description: 'Produits, charges et résultat net',
    icon: FiTrendingUp,
    color: '#16a34a',
    bg: '#dcfce7',
  },
  {
    value: 'cash_flow',
    label: 'Flux de trésorerie',
    description: 'Encaissements et décaissements',
    icon: FiDollarSign,
    color: '#d97706',
    bg: '#fef3c7',
  },
  {
    value: 'custom',
    label: 'Personnalisé',
    description: 'Structure libre et personnalisée',
    icon: FiSliders,
    color: '#9333ea',
    bg: '#f3e8ff',
  },
];

// ─── Composant principal ───────────────────────────────────────────────────────
export default function ReportForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    report_type: 'balance_sheet',
    sequence: 10,
    active: true,
    company: null,
  });

  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [touched, setTouched] = useState({});

  useEffect(() => {
    if (isEdit) loadReport();
  }, [id]);

  const loadReport = async () => {
    setFetchLoading(true);
    try {
      const data = await apiClient.get(`financial-reports/financial-reports/${id}/`);
      setFormData(data);
    } catch (err) {
      setError('Impossible de charger le rapport');
    } finally {
      setFetchLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    setTouched(prev => ({ ...prev, [name]: true }));
  };

  const handleTypeSelect = (value) => {
    setFormData(prev => ({ ...prev, report_type: value }));
    setTouched(prev => ({ ...prev, report_type: true }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Marquer tous les champs comme touchés
    setTouched({ name: true, code: true, report_type: true });

    try {
      if (isEdit) {
        await apiClient.put(`financial-reports/financial-reports/${id}/`, formData);
      } else {
        await apiClient.post('financial-reports/financial-reports/', formData);
      }
      setSuccess(true);
      setTimeout(() => navigate('/financial-reports'), 1000);
    } catch (err) {
      setError(err?.response?.data
        ? Object.values(err.response.data).flat().join(' • ')
        : 'Erreur lors de la sauvegarde');
    } finally {
      setLoading(false);
    }
  };

  // ── Auto-génération du code depuis le nom ──────────────────────────────────
  const handleNameChange = (e) => {
    const name = e.target.value;
    setFormData(prev => ({
      ...prev,
      name,
      code: !touched.code
        ? name.toUpperCase().replace(/\s+/g, '_').replace(/[^A-Z0-9_]/g, '').slice(0, 32)
        : prev.code,
    }));
    setTouched(prev => ({ ...prev, name: true }));
  };

  const selectedType = REPORT_TYPES.find(t => t.value === formData.report_type);

  if (fetchLoading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner} />
        <p style={{ color: '#6b7280', marginTop: 16, fontSize: 14 }}>Chargement du rapport…</p>
      </div>
    );
  }

  return (
    <div style={styles.pageWrapper}>

      {/* ── Fil d'Ariane ────────────────────────────────────────────────────── */}
      <nav style={styles.breadcrumb}>
        <button onClick={() => navigate('/financial-reports')} style={styles.breadcrumbLink}>
          États financiers
        </button>
        <FiChevronRight size={14} style={{ color: '#9ca3af' }} />
        <span style={styles.breadcrumbCurrent}>
          {isEdit ? 'Modifier le rapport' : 'Nouveau rapport'}
        </span>
      </nav>

      {/* ── En-tête ──────────────────────────────────────────────────────────── */}
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={styles.headerIcon}>
            <FiFileText size={22} color="#4f6ef7" />
          </div>
          <div>
            <h1 style={styles.title}>
              {isEdit ? 'Modifier le rapport' : 'Nouveau rapport financier'}
            </h1>
            <p style={styles.subtitle}>
              {isEdit
                ? 'Modifiez les informations du rapport sélectionné'
                : 'Configurez un nouvel état financier pour votre entité'}
            </p>
          </div>
        </div>
        <button onClick={() => navigate('/financial-reports')} style={styles.cancelBtn}>
          <FiX size={16} />
          Annuler
        </button>
      </header>

      {/* ── Alerte erreur ────────────────────────────────────────────────────── */}
      {error && (
        <div style={styles.errorBanner}>
          <FiAlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* ── Succès ──────────────────────────────────────────────────────────── */}
      {success && (
        <div style={styles.successBanner}>
          <FiCheck size={16} />
          <span>Rapport {isEdit ? 'mis à jour' : 'créé'} avec succès ! Redirection…</span>
        </div>
      )}

      <form onSubmit={handleSubmit} style={styles.form}>

        {/* ══ Bloc 1 : Informations générales ══════════════════════════════════ */}
        <section style={styles.section}>
          <div style={styles.sectionHeader}>
            <div style={styles.sectionDot} />
            <h2 style={styles.sectionTitle}>Informations générales</h2>
          </div>

          <div style={styles.grid2}>
            {/* Nom */}
            <div style={styles.fieldGroup}>
              <label style={styles.label}>
                Nom du rapport
                <span style={styles.required}>*</span>
              </label>
              <div style={styles.inputWrapper}>
                <FiFileText size={16} style={styles.inputIcon} />
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleNameChange}
                  required
                  placeholder="Ex : Bilan comptable 2025"
                  style={{
                    ...styles.input,
                    borderColor: touched.name && !formData.name ? '#ef4444' : '#e5e7eb',
                  }}
                />
              </div>
              {touched.name && !formData.name && (
                <span style={styles.fieldError}>Ce champ est obligatoire</span>
              )}
            </div>

            {/* Code */}
            <div style={styles.fieldGroup}>
              <label style={styles.label}>
                Code unique
                <span style={styles.required}>*</span>
                <span style={styles.labelHint}>(généré automatiquement)</span>
              </label>
              <div style={styles.inputWrapper}>
                <FiHash size={16} style={styles.inputIcon} />
                <input
                  type="text"
                  name="code"
                  value={formData.code}
                  onChange={handleChange}
                  required
                  placeholder="Ex : BILAN_2025"
                  style={{
                    ...styles.input,
                    ...styles.inputMono,
                    borderColor: touched.code && !formData.code ? '#ef4444' : '#e5e7eb',
                  }}
                />
              </div>
              {touched.code && !formData.code && (
                <span style={styles.fieldError}>Ce champ est obligatoire</span>
              )}
            </div>
          </div>

          {/* Séquence */}
          <div style={{ ...styles.fieldGroup, maxWidth: 240 }}>
            <label style={styles.label}>
              <FiLayers size={13} style={{ marginRight: 4 }} />
              Ordre d'affichage (séquence)
            </label>
            <input
              type="number"
              name="sequence"
              value={formData.sequence}
              onChange={handleChange}
              min="1"
              style={{ ...styles.input, maxWidth: 180 }}
            />
          </div>
        </section>

        {/* ══ Bloc 2 : Type de rapport ════════════════════════════════════════ */}
        <section style={styles.section}>
          <div style={styles.sectionHeader}>
            <div style={{ ...styles.sectionDot, background: '#16a34a' }} />
            <h2 style={styles.sectionTitle}>Type de rapport</h2>
          </div>
          <p style={styles.sectionDesc}>
            Choisissez la structure qui correspond à votre état financier.
          </p>

          <div style={styles.typeGrid}>
            {REPORT_TYPES.map((type) => {
              const Icon = type.icon;
              const isSelected = formData.report_type === type.value;
              return (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => handleTypeSelect(type.value)}
                  style={{
                    ...styles.typeCard,
                    borderColor: isSelected ? type.color : '#e5e7eb',
                    background: isSelected ? type.bg : '#fff',
                    boxShadow: isSelected
                      ? `0 0 0 3px ${type.color}22, 0 4px 12px ${type.color}18`
                      : '0 1px 3px rgba(0,0,0,0.06)',
                    transform: isSelected ? 'translateY(-2px)' : 'none',
                  }}
                >
                  <div style={{
                    ...styles.typeIcon,
                    background: isSelected ? type.color : '#f3f4f6',
                    color: isSelected ? '#fff' : '#6b7280',
                  }}>
                    <Icon size={18} />
                  </div>
                  <div style={styles.typeContent}>
                    <p style={{
                      ...styles.typeLabel,
                      color: isSelected ? type.color : '#374151',
                    }}>
                      {type.label}
                    </p>
                    <p style={styles.typeDesc}>{type.description}</p>
                  </div>
                  {isSelected && (
                    <div style={{ ...styles.typeCheck, background: type.color }}>
                      <FiCheck size={10} color="#fff" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        {/* ══ Bloc 3 : Options ════════════════════════════════════════════════ */}
        <section style={styles.section}>
          <div style={styles.sectionHeader}>
            <div style={{ ...styles.sectionDot, background: '#d97706' }} />
            <h2 style={styles.sectionTitle}>Options</h2>
          </div>

          <div
            style={{
              ...styles.toggleRow,
              borderColor: formData.active ? '#bbf7d0' : '#e5e7eb',
              background: formData.active ? '#f0fdf4' : '#f9fafb',
            }}
            onClick={() => setFormData(prev => ({ ...prev, active: !prev.active }))}
          >
            <div>
              <p style={{ ...styles.toggleLabel, color: formData.active ? '#15803d' : '#374151' }}>
                Rapport actif
              </p>
              <p style={styles.toggleDesc}>
                {formData.active
                  ? 'Ce rapport est visible et utilisable dans les états financiers'
                  : 'Ce rapport est désactivé et masqué des listes'}
              </p>
            </div>
            <div style={{ flexShrink: 0 }}>
              {formData.active
                ? <FiToggleRight size={30} color="#16a34a" />
                : <FiToggleLeft size={30} color="#9ca3af" />}
            </div>
          </div>
        </section>

        {/* ══ Récap visuel ════════════════════════════════════════════════════ */}
        {(formData.name || formData.code) && (
          <section style={styles.recap}>
            <p style={styles.recapTitle}>Récapitulatif</p>
            <div style={styles.recapGrid}>
              <div style={styles.recapItem}>
                <span style={styles.recapKey}>Nom</span>
                <span style={styles.recapVal}>{formData.name || '—'}</span>
              </div>
              <div style={styles.recapItem}>
                <span style={styles.recapKey}>Code</span>
                <code style={{ ...styles.recapVal, fontFamily: 'monospace', color: '#4f6ef7' }}>
                  {formData.code || '—'}
                </code>
              </div>
              <div style={styles.recapItem}>
                <span style={styles.recapKey}>Type</span>
                <span style={{
                  ...styles.recapVal,
                  background: selectedType?.bg,
                  color: selectedType?.color,
                  padding: '2px 10px',
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: 600,
                }}>
                  {selectedType?.label}
                </span>
              </div>
              <div style={styles.recapItem}>
                <span style={styles.recapKey}>Statut</span>
                <span style={{
                  ...styles.recapVal,
                  background: formData.active ? '#dcfce7' : '#f3f4f6',
                  color: formData.active ? '#15803d' : '#6b7280',
                  padding: '2px 10px',
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: 600,
                }}>
                  {formData.active ? 'Actif' : 'Inactif'}
                </span>
              </div>
            </div>
          </section>
        )}

        {/* ══ Actions ═════════════════════════════════════════════════════════ */}
        <div style={styles.actions}>
          <button
            type="button"
            onClick={() => navigate('/financial-reports')}
            style={styles.cancelBtnBottom}
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={loading || success}
            style={{
              ...styles.submitBtn,
              opacity: loading || success ? 0.7 : 1,
              cursor: loading || success ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? (
              <>
                <div style={styles.btnSpinner} />
                Enregistrement…
              </>
            ) : success ? (
              <>
                <FiCheck size={16} />
                Enregistré !
              </>
            ) : (
              <>
                <FiSave size={16} />
                {isEdit ? 'Mettre à jour' : 'Créer le rapport'}
              </>
            )}
          </button>
        </div>

      </form>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = {
  pageWrapper: {
    maxWidth: 760,
    margin: '0 auto',
    padding: '28px 24px 48px',
    fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
  },

  // Loading
  loadingContainer: {
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    height: 320,
  },
  spinner: {
    width: 36, height: 36,
    border: '3px solid #e5e7eb',
    borderTop: '3px solid #4f6ef7',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },

  // Breadcrumb
  breadcrumb: {
    display: 'flex', alignItems: 'center', gap: 6,
    marginBottom: 24,
  },
  breadcrumbLink: {
    background: 'none', border: 'none', cursor: 'pointer',
    color: '#6b7280', fontSize: 13,
    padding: 0,
    transition: 'color 0.15s',
  },
  breadcrumbCurrent: {
    color: '#111827', fontSize: 13, fontWeight: 500,
  },

  // Header
  header: {
    display: 'flex', alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16, marginBottom: 28,
  },
  headerLeft: {
    display: 'flex', alignItems: 'flex-start', gap: 14,
  },
  headerIcon: {
    width: 48, height: 48,
    background: '#eef1fe',
    borderRadius: 12,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  title: {
    margin: 0,
    fontSize: 22,
    fontWeight: 700,
    color: '#111827',
    letterSpacing: '-0.4px',
  },
  subtitle: {
    margin: '4px 0 0',
    fontSize: 13,
    color: '#6b7280',
  },
  cancelBtn: {
    display: 'flex', alignItems: 'center', gap: 6,
    padding: '8px 16px',
    background: '#f3f4f6',
    border: '1px solid #e5e7eb',
    borderRadius: 8,
    fontSize: 13, fontWeight: 500,
    color: '#374151',
    cursor: 'pointer',
    flexShrink: 0,
    transition: 'background 0.15s',
  },

  // Banners
  errorBanner: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '12px 16px',
    background: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: 10,
    color: '#dc2626',
    fontSize: 13,
    marginBottom: 20,
  },
  successBanner: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '12px 16px',
    background: '#f0fdf4',
    border: '1px solid #bbf7d0',
    borderRadius: 10,
    color: '#15803d',
    fontSize: 13,
    marginBottom: 20,
  },

  // Form
  form: {
    display: 'flex', flexDirection: 'column', gap: 4,
  },

  // Sections
  section: {
    background: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: 14,
    padding: '24px 26px',
    marginBottom: 16,
  },
  sectionHeader: {
    display: 'flex', alignItems: 'center', gap: 10,
    marginBottom: 20,
  },
  sectionDot: {
    width: 8, height: 8,
    borderRadius: '50%',
    background: '#4f6ef7',
    flexShrink: 0,
  },
  sectionTitle: {
    margin: 0,
    fontSize: 15,
    fontWeight: 650,
    color: '#111827',
    letterSpacing: '-0.2px',
  },
  sectionDesc: {
    margin: '-12px 0 18px',
    fontSize: 13,
    color: '#6b7280',
  },

  // Grid
  grid2: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 16,
    marginBottom: 16,
  },

  // Field
  fieldGroup: {
    display: 'flex', flexDirection: 'column', gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: 550,
    color: '#374151',
    display: 'flex', alignItems: 'center', gap: 4,
  },
  required: {
    color: '#ef4444',
    marginLeft: 2,
  },
  labelHint: {
    color: '#9ca3af',
    fontWeight: 400,
    fontSize: 11,
    marginLeft: 4,
  },
  inputWrapper: {
    position: 'relative', display: 'flex', alignItems: 'center',
  },
  inputIcon: {
    position: 'absolute', left: 12,
    color: '#9ca3af', pointerEvents: 'none',
  },
  input: {
    width: '100%',
    padding: '9px 12px 9px 36px',
    border: '1.5px solid #e5e7eb',
    borderRadius: 8,
    fontSize: 13,
    color: '#111827',
    background: '#fafafa',
    outline: 'none',
    transition: 'border-color 0.15s, box-shadow 0.15s',
    boxSizing: 'border-box',
  },
  inputMono: {
    fontFamily: "'Fira Code', 'JetBrains Mono', monospace",
    letterSpacing: '0.02em',
    color: '#4f6ef7',
  },
  fieldError: {
    fontSize: 11,
    color: '#ef4444',
    marginTop: -2,
  },

  // Type cards
  typeGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: 12,
  },
  typeCard: {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '14px 16px',
    border: '2px solid #e5e7eb',
    borderRadius: 12,
    background: '#fff',
    cursor: 'pointer',
    textAlign: 'left',
    position: 'relative',
    transition: 'all 0.2s ease',
  },
  typeIcon: {
    width: 38, height: 38,
    borderRadius: 9,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
    transition: 'all 0.2s',
  },
  typeContent: {
    flex: 1,
  },
  typeLabel: {
    margin: 0,
    fontSize: 13,
    fontWeight: 650,
    lineHeight: 1.3,
  },
  typeDesc: {
    margin: '2px 0 0',
    fontSize: 11,
    color: '#9ca3af',
  },
  typeCheck: {
    position: 'absolute',
    top: 8, right: 8,
    width: 18, height: 18,
    borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },

  // Toggle
  toggleRow: {
    display: 'flex', alignItems: 'center',
    justifyContent: 'space-between', gap: 16,
    padding: '16px 20px',
    border: '1.5px solid #e5e7eb',
    borderRadius: 10,
    cursor: 'pointer',
    userSelect: 'none',
    transition: 'all 0.2s',
  },
  toggleLabel: {
    margin: 0, fontSize: 14, fontWeight: 600,
  },
  toggleDesc: {
    margin: '3px 0 0', fontSize: 12, color: '#6b7280',
  },

  // Recap
  recap: {
    background: '#f8faff',
    border: '1.5px solid #dde5ff',
    borderRadius: 12,
    padding: '18px 22px',
    marginBottom: 8,
  },
  recapTitle: {
    margin: '0 0 12px',
    fontSize: 12,
    fontWeight: 600,
    color: '#4f6ef7',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
  },
  recapGrid: {
    display: 'flex', flexWrap: 'wrap', gap: 12,
  },
  recapItem: {
    display: 'flex', alignItems: 'center', gap: 8,
  },
  recapKey: {
    fontSize: 12, color: '#6b7280', fontWeight: 500,
  },
  recapVal: {
    fontSize: 13, color: '#111827', fontWeight: 600,
  },

  // Actions
  actions: {
    display: 'flex', justifyContent: 'flex-end', gap: 10,
    paddingTop: 8,
  },
  cancelBtnBottom: {
    padding: '10px 20px',
    background: '#f3f4f6',
    border: '1px solid #e5e7eb',
    borderRadius: 9,
    fontSize: 13, fontWeight: 500,
    color: '#374151',
    cursor: 'pointer',
    transition: 'background 0.15s',
  },
  submitBtn: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '10px 24px',
    background: 'linear-gradient(135deg, #4f6ef7 0%, #6e5ff7 100%)',
    border: 'none',
    borderRadius: 9,
    fontSize: 13, fontWeight: 600,
    color: '#fff',
    cursor: 'pointer',
    boxShadow: '0 2px 8px rgba(79,110,247,0.3)',
    transition: 'all 0.2s',
  },
  btnSpinner: {
    width: 14, height: 14,
    border: '2px solid rgba(255,255,255,0.4)',
    borderTop: '2px solid #fff',
    borderRadius: '50%',
    animation: 'spin 0.7s linear infinite',
  },
};