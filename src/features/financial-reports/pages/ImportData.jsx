// src/features/financial-reports/pages/ImportData.jsx
import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  FiUpload, FiFile, FiCheckCircle, FiAlertCircle, FiClock,
  FiEye, FiDatabase, FiCalendar, FiFileText, FiX, FiRefreshCw,
  FiChevronRight, FiInbox, FiLayers, FiLock, FiLink, FiInfo,
  FiAlertTriangle,
} from 'react-icons/fi';
import { apiClient } from '../../../services/apiClient';

const STATE_CONFIG = {
  processed: { label: 'Traité',    bg: '#dcfce7', color: '#15803d', icon: FiCheckCircle },
  validated: { label: 'Validé',    bg: '#dbeafe', color: '#1d4ed8', icon: FiCheckCircle },
  error:     { label: 'Erreur',    bg: '#fee2e2', color: '#dc2626', icon: FiAlertCircle },
  draft:     { label: 'Brouillon', bg: '#fef9c3', color: '#a16207', icon: FiClock },
};

const EMPTY_FORM = {
  name:                 '',
  data_source:          '',
  period:               '',
  file:                 null,
  is_reference_balance: false,
};

const N1_CONFIG = {
  first: {
    bg: '#f0fdf4', border: '#bbf7d0', iconBg: '#dcfce7',
    icon: FiLayers, iconColor: '#15803d', titleColor: '#15803d',
    title: 'Première balance',
  },
  found: {
    bg: '#eff6ff', border: '#bfdbfe', iconBg: '#dbeafe',
    icon: FiLink, iconColor: '#1d4ed8', titleColor: '#1d4ed8',
    title: 'Balance N-1 détectée automatiquement',
  },
  blocked: {
    bg: '#fffbeb', border: '#fde68a', iconBg: '#fef3c7',
    icon: FiLock, iconColor: '#b45309', titleColor: '#b45309',
    title: 'Import bloqué — balance N-1 manquante',
  },
};

export default function ImportData() {
  const navigate  = useNavigate();
  const location  = useLocation();

  // ── Détecter si on arrive depuis ImportDetail (bouton "Importer N-1") ───
  // location.state contient : { prefillPeriod, n1Warning, fromImportId }
  const locationState = location.state || {};
  const isN1Context   = !!locationState.n1Warning;

  const [dataSources, setDataSources] = useState([]);
  const [periods, setPeriods]         = useState([]);
  const [imports, setImports]         = useState([]);
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);
  const [submitting, setSubmitting]   = useState(false);
  const [successMsg, setSuccessMsg]   = useState('');
  const [errorMsg, setErrorMsg]       = useState('');
  const [dragOver, setDragOver]       = useState(false);
  const [form, setForm]               = useState(EMPTY_FORM);
  const [touched, setTouched]         = useState({});
  const [n1Status, setN1Status]       = useState(null);

  const fileInputRef = useRef(null);

  useEffect(() => { loadData(); }, []);

  // Pré-remplir le formulaire si on vient du contexte N-1
  useEffect(() => {
    if (isN1Context && periods.length > 0 && locationState.prefillPeriod) {
      const periodId = locationState.prefillPeriod?.id || locationState.prefillPeriod;
      const period   = periods.find(p => String(p.id) === String(periodId));
      if (period) {
        setForm(prev => ({
          ...prev,
          period:               String(periodId),
          is_reference_balance: true,
          name:                 `Balance N-1 référence — ${period.code}`,
        }));
        // Calculer le statut N-1 pour cette période
        handlePeriodChangeInternal(String(periodId), periods, imports, true);
      }
    }
  }, [isN1Context, periods, imports]);

  const loadData = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const [srcRes, perRes, impRes] = await Promise.all([
        apiClient.get('financial-reports/data-sources/'),
        apiClient.get('financial-reports/periods/'),
        apiClient.get('financial-reports/raw-imports/'),
      ]);
      setDataSources(srcRes.results || srcRes || []);
      setPeriods(perRes.results    || perRes    || []);
      setImports(impRes.results    || impRes    || []);
    } catch {
      setErrorMsg('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // ── Logique de résolution N-1 (partagée entre onChange et useEffect) ────
  const handlePeriodChangeInternal = useCallback((
    periodId, allPeriods, allImports, isRef = false
  ) => {
    if (!periodId) { setN1Status(null); return; }

    const period = allPeriods.find(p => String(p.id) === String(periodId));
    if (!period) { setN1Status(null); return; }

    // Si c'est un import de référence N-1 → pas de vérification N-1 sur lui-même
    if (isRef) {
      setN1Status({
        status:  'reference',
        message: `Cet import sera utilisé comme balance de référence N-1 pour la période « ${period.code} ».`,
      });
      return;
    }

    const prevPeriodId = period.opening_reference_period || period.previous_period;

    if (!prevPeriodId) {
      // Vérifier si un import validé existe sur la même période (Option B)
      const samePeriodN1 = allImports
        .filter(i => String(i.period) === String(periodId) && i.state === 'validated')
        .sort((a, b) => new Date(b.import_date) - new Date(a.import_date))[0];

      if (samePeriodN1) {
        setN1Status({
          status:  'found',
          message: `Balance N-1 sur même période : « ${samePeriodN1.name} » (validée le ${new Date(samePeriodN1.import_date).toLocaleDateString('fr-FR')})`,
        });
      } else {
        setN1Status({
          status:  'first',
          message: `La période « ${period.code} » n'a pas de période N-1 définie. `
            + `Cette balance sera traitée comme première balance — la Règle 2 est désactivée. `
            + `Si vos soldes d'ouverture ne sont pas nuls, il vous sera demandé d'importer une balance N-1.`,
        });
      }
      setForm(prev => ({
        ...prev,
        period: periodId,
        name: prev.name || `Balance ${period.code}`,
      }));
      return;
    }

    const prevPeriod = allPeriods.find(p => String(p.id) === String(prevPeriodId));
    const n1Import   = allImports
      .filter(i => String(i.period) === String(prevPeriodId) && i.state === 'validated')
      .sort((a, b) => new Date(b.import_date) - new Date(a.import_date))[0];

    if (!n1Import) {
      setN1Status({
        status:  'blocked',
        message: `La période N-1 « ${prevPeriod?.code || prevPeriodId} » est définie mais aucune balance validée n'y est rattachée. Importez et validez d'abord la balance N-1.`,
        blockedPeriodCode: prevPeriod?.code,
      });
    } else {
      setN1Status({
        status:  'found',
        message: `Balance N-1 : « ${n1Import.name} » (période ${prevPeriod?.code || ''}, validée le ${new Date(n1Import.import_date).toLocaleDateString('fr-FR')})`,
      });
      setForm(prev => ({
        ...prev,
        period: periodId,
        name: prev.name || `Balance ${period.code}`,
      }));
    }
  }, []);

  const handlePeriodChange = useCallback((periodId) => {
    setField('period', periodId);
    const isRef = form.is_reference_balance;
    handlePeriodChangeInternal(periodId, periods, imports, isRef);
  }, [periods, imports, form.is_reference_balance, handlePeriodChangeInternal]);

  const setField = (key, val) => {
    setForm(prev => ({ ...prev, [key]: val }));
    setTouched(prev => ({ ...prev, [key]: true }));
  };

  const handleDrop = (e) => {
    e.preventDefault(); setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && /\.(xlsx|xls|csv)$/i.test(file.name)) { setField('file', file); setErrorMsg(''); }
    else setErrorMsg('Format non supporté. Utilisez .xlsx, .xls ou .csv');
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) { setField('file', file); setErrorMsg(''); }
  };

  // ── Toggle is_reference_balance ───────────────────────────────────────────
  const handleToggleReference = (checked) => {
    setField('is_reference_balance', checked);
    // Recalculer le statut N-1 avec le nouveau contexte
    if (form.period) {
      handlePeriodChangeInternal(form.period, periods, imports, checked);
    }
  };

  // ── Soumission ────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setTouched({ name: true, data_source: true, period: true, file: true });

    if (!form.name.trim())              return setErrorMsg('Le nom est obligatoire');
    if (!form.data_source)              return setErrorMsg('Choisissez une source de données');
    if (!form.period)                   return setErrorMsg('Choisissez une période');
    if (n1Status?.status === 'blocked') return setErrorMsg(n1Status.message);
    if (!form.file)                     return setErrorMsg('Sélectionnez un fichier');

    setSubmitting(true);
    const fd = new FormData();
    fd.append('name',                 form.name);
    fd.append('data_source',          form.data_source);
    fd.append('period',               form.period);
    fd.append('file',                 form.file);
    fd.append('is_reference_balance', form.is_reference_balance ? 'true' : 'false');

    try {
      const created = await apiClient.upload('financial-reports/raw-imports/', fd);
      setSuccessMsg('Import créé et en cours de traitement.');
      setForm(EMPTY_FORM);
      setTouched({});
      setN1Status(null);
      if (fileInputRef.current) fileInputRef.current.value = '';

      // Si on vient du contexte N-1, retourner à l'import principal
      if (isN1Context && locationState.fromImportId) {
        setTimeout(() => navigate(`/financial-reports/import/${locationState.fromImportId}`), 1200);
      } else {
        setTimeout(() => navigate(`/financial-reports/import/${created.id}`), 1000);
      }
      loadData(true);
    } catch (err) {
      const data = err.response?.data;
      const msg  = data
        ? (typeof data === 'object' ? Object.values(data).flat().join(' • ') : data)
        : err.message || 'Erreur inconnue';
      setErrorMsg(`Échec : ${msg}`);
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit = n1Status?.status !== 'blocked' && !submitting;

  const stats = {
    total:     imports.length,
    validated: imports.filter(i => i.state === 'validated').length,
    errors:    imports.filter(i => i.state === 'error').length,
  };

  if (loading) return (
    <div style={s.loadingWrap}>
      <div style={s.spinner} />
      <p style={s.loadingText}>Chargement…</p>
    </div>
  );

  const n1Cfg  = n1Status ? (N1_CONFIG[n1Status.status] || N1_CONFIG.first) : null;
  const N1Icon = n1Cfg?.icon;

  return (
    <div style={s.page}>

      <nav style={s.breadcrumb}>
        <button onClick={() => navigate('/financial-reports')} style={s.breadLink}>
          États financiers
        </button>
        <FiChevronRight size={13} color="#9ca3af" />
        <span style={s.breadCurrent}>Import de données</span>
      </nav>

      {/* ── Bandeau contexte N-1 (si on vient d'ImportDetail) ────────────── */}
      {isN1Context && (
        <div style={s.n1ContextBanner}>
          <div style={s.n1ContextIcon}><FiAlertTriangle size={16} color="#b45309" /></div>
          <div style={{ flex: 1 }}>
            <p style={s.n1ContextTitle}>
              Vous importez la balance de référence N-1
            </p>
            <p style={s.n1ContextDesc}>
              Cet import servira de référence pour vérifier les soldes d'ouverture
              de la balance précédente. La case « Balance de référence N-1 » est
              pré-cochée — ne la décochez pas.
              {locationState.fromImportId && (
                <> Après validation, vous serez renvoyé à l'import d'origine.</>
              )}
            </p>
          </div>
          <button
            onClick={() => navigate(
              locationState.fromImportId
                ? `/financial-reports/import/${locationState.fromImportId}`
                : '/financial-reports/import'
            )}
            style={s.n1ContextBack}
          >
            ← Retour
          </button>
        </div>
      )}

      <header style={s.header}>
        <div style={s.headerLeft}>
          <div style={s.headerIcon}><FiUpload size={22} color="#4f6ef7" /></div>
          <div>
            <h1 style={s.title}>Import de données comptables</h1>
            <p style={s.subtitle}>
              Le lien N-1 est détecté automatiquement via la configuration de la période
            </p>
          </div>
        </div>
        <button onClick={() => loadData(true)} disabled={refreshing}
          style={{ ...s.refreshBtn, opacity: refreshing ? 0.6 : 1 }}>
          <FiRefreshCw size={14} style={{ animation: refreshing ? 'spin 0.8s linear infinite' : 'none' }} />
          Actualiser
        </button>
      </header>

      <div style={s.kpiRow}>
        {[
          { label: 'Total imports', value: stats.total,     color: '#4f6ef7', bg: '#eef1fe' },
          { label: 'Validés',       value: stats.validated, color: '#15803d', bg: '#dcfce7' },
          { label: 'Erreurs',       value: stats.errors,    color: '#dc2626', bg: '#fee2e2' },
        ].map(k => (
          <div key={k.label} style={{ ...s.kpiCard, background: k.bg }}>
            <span style={{ ...s.kpiValue, color: k.color }}>{k.value}</span>
            <span style={s.kpiLabel}>{k.label}</span>
          </div>
        ))}
      </div>

      {successMsg && (
        <div style={s.bannerSuccess}>
          <FiCheckCircle size={16} />
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg('')} style={s.bannerClose}><FiX size={13} /></button>
        </div>
      )}
      {errorMsg && (
        <div style={s.bannerError}>
          <FiAlertCircle size={16} />
          <span style={{ flex: 1 }}>{errorMsg}</span>
          <button onClick={() => setErrorMsg('')} style={s.bannerClose}><FiX size={13} /></button>
        </div>
      )}

      <section style={s.card}>
        <div style={s.cardHeader}>
          <div style={s.sectionDot} />
          <h2 style={s.cardTitle}>Nouvel import</h2>
        </div>

        <form onSubmit={handleSubmit} style={s.formBody}>

          {/* Nom + Source */}
          <div style={s.grid2}>
            <div style={s.field}>
              <label style={s.label}>Nom de l'import <span style={s.req}>*</span></label>
              <div style={s.inputWrap}>
                <FiFileText size={15} style={s.inputIcon} />
                <input type="text" value={form.name} onChange={e => setField('name', e.target.value)}
                  placeholder="Ex : Balance FY2025"
                  style={{ ...s.input, borderColor: touched.name && !form.name ? '#ef4444' : '#e5e7eb' }} />
              </div>
              {touched.name && !form.name && <span style={s.fieldErr}>Champ obligatoire</span>}
            </div>

            <div style={s.field}>
              <label style={s.label}>Source de données <span style={s.req}>*</span></label>
              <div style={s.inputWrap}>
                <FiDatabase size={15} style={s.inputIcon} />
                <select value={form.data_source} onChange={e => setField('data_source', e.target.value)}
                  style={{ ...s.input, ...s.select, borderColor: touched.data_source && !form.data_source ? '#ef4444' : '#e5e7eb' }}>
                  <option value="">Sélectionner une source…</option>
                  {dataSources.map(src => (
                    <option key={src.id} value={src.id}>{src.name} — {src.source_type}</option>
                  ))}
                </select>
              </div>
              {touched.data_source && !form.data_source && <span style={s.fieldErr}>Champ obligatoire</span>}
            </div>
          </div>

          {/* Période */}
          <div style={{ ...s.field, maxWidth: '50%' }}>
            <label style={s.label}>Période comptable <span style={s.req}>*</span></label>
            <div style={s.inputWrap}>
              <FiCalendar size={15} style={s.inputIcon} />
              <select value={form.period} onChange={e => handlePeriodChange(e.target.value)}
                style={{ ...s.input, ...s.select, borderColor: touched.period && !form.period ? '#ef4444' : '#e5e7eb' }}>
                <option value="">Sélectionner une période…</option>
                {periods.map(p => (
                  <option key={p.id} value={p.id}>{p.code} — {p.name}</option>
                ))}
              </select>
            </div>
            {touched.period && !form.period && <span style={s.fieldErr}>Champ obligatoire</span>}
          </div>

          {/* ── Case "Balance de référence N-1" ─────────────────────────── */}
          {/* Toujours visible mais pré-cochée et mise en avant si contexte N-1 */}
          <div
            onClick={() => handleToggleReference(!form.is_reference_balance)}
            style={{
              ...s.refToggle,
              borderColor:  form.is_reference_balance ? '#b45309' : '#e5e7eb',
              background:   form.is_reference_balance ? '#fffbeb' : '#fafafa',
              boxShadow:    form.is_reference_balance ? '0 0 0 3px #fde68a55' : 'none',
            }}
          >
            <div style={{
              ...s.checkbox,
              background:  form.is_reference_balance ? '#b45309' : '#fff',
              borderColor: form.is_reference_balance ? '#b45309' : '#d1d5db',
            }}>
              {form.is_reference_balance && (
                <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                  <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8"
                    strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
            <div style={s.refToggleText}>
              <p style={{
                ...s.refToggleLabel,
                color: form.is_reference_balance ? '#92400e' : '#374151',
              }}>
                Balance de référence N-1
              </p>
              <p style={s.refToggleDesc}>
                {form.is_reference_balance
                  ? "Cet import servira de référence N-1. Les soldes d'ouverture ne seront pas vérifiés — c'est normal pour une balance de référence."
                  : "Cochez si cet import est destiné à servir de balance N-1 de référence pour un autre import de la même période."
                }
              </p>
            </div>
            {form.is_reference_balance && (
              <span style={s.refBadge}>Référence N-1</span>
            )}
          </div>

          {/* Bandeau N-1 */}
          {n1Status && n1Cfg && (
            <div style={{
              ...s.n1Banner,
              background:  n1Status.status === 'reference' ? '#fffbeb' : n1Cfg.bg,
              borderColor: n1Status.status === 'reference' ? '#fde68a' : n1Cfg.border,
            }}>
              <div style={{
                ...s.n1Icon,
                background: n1Status.status === 'reference' ? '#fef3c7' : n1Cfg.iconBg,
              }}>
                {n1Status.status === 'reference'
                  ? <FiInfo size={16} color="#b45309" />
                  : <N1Icon size={16} color={n1Cfg.iconColor} />
                }
              </div>
              <div style={{ flex: 1 }}>
                <p style={{
                  ...s.n1Title,
                  color: n1Status.status === 'reference' ? '#92400e' : n1Cfg.titleColor,
                }}>
                  {n1Status.status === 'reference' ? 'Import de référence N-1' : n1Cfg.title}
                </p>
                <p style={s.n1Desc}>{n1Status.message}</p>
              </div>
              {n1Status.status === 'blocked' && (
                <div style={s.n1BlockBadge}><FiLock size={12} /> Bloqué</div>
              )}
            </div>
          )}

          {/* Zone fichier — désactivée si bloqué */}
          {n1Status?.status !== 'blocked' && (
            <div style={s.field}>
              <label style={s.label}>Fichier Excel ou CSV <span style={s.req}>*</span></label>
              {!form.file ? (
                <div
                  onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    ...s.dropZone,
                    borderColor: dragOver ? '#4f6ef7' : touched.file && !form.file ? '#ef4444' : '#d1d5db',
                    background:  dragOver ? '#eef1fe' : '#fafafa',
                    transform:   dragOver ? 'scale(1.01)' : 'scale(1)',
                  }}
                >
                  <div style={s.dropIconWrap}>
                    <FiUpload size={24} color={dragOver ? '#4f6ef7' : '#9ca3af'} />
                  </div>
                  <p style={{ ...s.dropTitle, color: dragOver ? '#4f6ef7' : '#374151' }}>
                    {dragOver ? 'Déposez le fichier ici' : 'Glissez-déposez votre fichier'}
                  </p>
                  <p style={s.dropSub}>ou <span style={s.dropLink}>cliquez pour parcourir</span></p>
                  <p style={s.dropFormats}>.xlsx · .xls · .csv</p>
                  <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv"
                    onChange={handleFileChange} style={{ display: 'none' }} />
                </div>
              ) : (
                <div style={s.filePreview}>
                  <div style={s.fileIconWrap}><FiFile size={20} color="#4f6ef7" /></div>
                  <div style={{ flex: 1 }}>
                    <p style={s.fileName}>{form.file.name}</p>
                    <p style={s.fileSize}>{(form.file.size / 1024).toFixed(1)} Ko</p>
                  </div>
                  <button type="button" onClick={() => { setField('file', null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                    style={s.fileRemove}><FiX size={15} /></button>
                </div>
              )}
              {touched.file && !form.file && <span style={s.fieldErr}>Veuillez sélectionner un fichier</span>}
            </div>
          )}

          {/* Structure attendue */}
          <div style={s.formatNote}>
            <p style={s.formatNoteTitle}>Structure attendue (8 colonnes)</p>
            <div style={s.formatCols}>
              {[
                { letter: 'A', name: 'Code compte' }, { letter: 'B', name: 'Libellé' },
                { letter: 'C', name: 'Ouv. Débit' },  { letter: 'D', name: 'Ouv. Crédit' },
                { letter: 'E', name: 'Mvt Débit' },   { letter: 'F', name: 'Mvt Crédit' },
                { letter: 'G', name: 'Clôt. Débit' }, { letter: 'H', name: 'Clôt. Crédit' },
              ].map(col => (
                <div key={col.letter} style={s.formatCol}>
                  <span style={s.formatColLetter}>{col.letter}</span>
                  <span style={s.formatColName}>{col.name}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={s.formActions}>
            <button type="button" onClick={() => { setForm(EMPTY_FORM); setTouched({}); setErrorMsg(''); setN1Status(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
              style={s.resetBtn}>Réinitialiser</button>
            <button type="submit" disabled={!canSubmit}
              style={{ ...s.submitBtn, opacity: canSubmit ? 1 : 0.5, cursor: canSubmit ? 'pointer' : 'not-allowed' }}>
              {submitting
                ? <><div style={s.btnSpinner} /> Import en cours…</>
                : n1Status?.status === 'blocked'
                ? <><FiLock size={15} /> Import bloqué</>
                : <><FiUpload size={15} /> Lancer l'import</>
              }
            </button>
          </div>
        </form>
      </section>

      {/* ── Historique ──────────────────────────────────────────────────── */}
      <section style={s.card}>
        <div style={{ ...s.cardHeader, marginBottom: 0 }}>
          <div style={{ ...s.sectionDot, background: '#16a34a' }} />
          <h2 style={s.cardTitle}>Historique des imports</h2>
          <span style={s.historyCount}>{imports.length}</span>
        </div>

        {imports.length === 0 ? (
          <div style={s.emptyState}>
            <FiInbox size={36} color="#d1d5db" />
            <p style={s.emptyTitle}>Aucun import effectué</p>
            <p style={s.emptySub}>Vos imports apparaîtront ici.</p>
          </div>
        ) : (
          <div style={s.importList}>
            {[...imports]
              .sort((a, b) => new Date(b.import_date) - new Date(a.import_date))
              .map((imp, idx) => {
                const cfg    = STATE_CONFIG[imp.state] || STATE_CONFIG.draft;
                const Icon   = cfg.icon;
                const period = periods.find(p => p.id === imp.period);
                return (
                  <div key={imp.id} style={{ ...s.importRow, borderTop: idx === 0 ? 'none' : '1px solid #f3f4f6' }}>
                    <div style={{ ...s.importStateIcon, background: cfg.bg }}>
                      <Icon size={15} color={cfg.color} />
                    </div>
                    <div style={s.importInfo}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <p style={s.importName}>{imp.name}</p>
                        {imp.is_reference_balance && (
                          <span style={s.refBadgeSmall}>Réf. N-1</span>
                        )}
                        {imp.opening_balance_warning && (
                          <span style={s.warnBadgeSmall}>⚠ N-1 requis</span>
                        )}
                      </div>
                      <div style={s.importMeta}>
                        <span style={s.importMetaItem}>
                          <FiCalendar size={11} />
                          {new Date(imp.import_date).toLocaleString('fr-FR', {
                            day: '2-digit', month: 'short', year: 'numeric',
                            hour: '2-digit', minute: '2-digit',
                          })}
                        </span>
                        {period && <span style={s.importMetaItem}><FiLayers size={11} /> {period.code}</span>}
                        {imp.note && <span style={s.importNote}>{imp.note}</span>}
                      </div>
                    </div>
                    <div style={s.importActions}>
                      <span style={{ ...s.stateBadge, background: cfg.bg, color: cfg.color }}>
                        {cfg.label}
                      </span>
                      <button onClick={() => navigate(`/financial-reports/import/${imp.id}`)} style={s.detailBtn}>
                        <FiEye size={13} /> Détails
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </section>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = {
  page: { maxWidth: 860, margin: '0 auto', padding: '28px 24px 60px', fontFamily: "'DM Sans', 'Segoe UI', sans-serif" },
  loadingWrap: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 320 },
  spinner: { width: 36, height: 36, border: '3px solid #e5e7eb', borderTop: '3px solid #4f6ef7', borderRadius: '50%', animation: 'spin 0.8s linear infinite' },
  loadingText: { color: '#6b7280', marginTop: 14, fontSize: 13 },
  breadcrumb: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 22 },
  breadLink: { background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', fontSize: 13, padding: 0 },
  breadCurrent: { color: '#111827', fontSize: 13, fontWeight: 500 },

  // Bandeau contexte N-1
  n1ContextBanner: {
    display: 'flex', alignItems: 'flex-start', gap: 12,
    padding: '14px 18px', marginBottom: 20,
    background: '#fffbeb', border: '2px solid #fbbf24', borderRadius: 12,
  },
  n1ContextIcon: { width: 32, height: 32, borderRadius: 8, background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  n1ContextTitle: { margin: 0, fontSize: 13, fontWeight: 700, color: '#92400e' },
  n1ContextDesc: { margin: '3px 0 0', fontSize: 12, color: '#78350f', lineHeight: 1.5 },
  n1ContextBack: { background: 'none', border: '1px solid #fbbf24', borderRadius: 7, padding: '6px 12px', fontSize: 12, color: '#92400e', cursor: 'pointer', flexShrink: 0 },

  header: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 24 },
  headerLeft: { display: 'flex', alignItems: 'flex-start', gap: 14 },
  headerIcon: { width: 48, height: 48, background: '#eef1fe', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  title: { margin: 0, fontSize: 22, fontWeight: 700, color: '#111827', letterSpacing: '-0.4px' },
  subtitle: { margin: '4px 0 0', fontSize: 13, color: '#6b7280' },
  refreshBtn: { display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, fontWeight: 500, color: '#374151', cursor: 'pointer', flexShrink: 0 },
  kpiRow: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 },
  kpiCard: { borderRadius: 10, padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 2 },
  kpiValue: { fontSize: 26, fontWeight: 700, lineHeight: 1 },
  kpiLabel: { fontSize: 12, color: '#6b7280', fontWeight: 500 },
  bannerSuccess: { display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, color: '#15803d', fontSize: 13, marginBottom: 16 },
  bannerError: { display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, color: '#dc2626', fontSize: 13, marginBottom: 16 },
  bannerClose: { background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', marginLeft: 'auto', padding: 2, display: 'flex', alignItems: 'center' },
  card: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: '24px 26px', marginBottom: 16 },
  cardHeader: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 22 },
  sectionDot: { width: 8, height: 8, borderRadius: '50%', background: '#4f6ef7', flexShrink: 0 },
  cardTitle: { margin: 0, fontSize: 15, fontWeight: 650, color: '#111827' },
  historyCount: { marginLeft: 6, background: '#f3f4f6', color: '#6b7280', fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20 },
  formBody: { display: 'flex', flexDirection: 'column', gap: 18 },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 },
  field: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { fontSize: 13, fontWeight: 550, color: '#374151', display: 'flex', alignItems: 'center', gap: 3 },
  req: { color: '#ef4444' },
  inputWrap: { position: 'relative', display: 'flex', alignItems: 'center' },
  inputIcon: { position: 'absolute', left: 12, color: '#9ca3af', pointerEvents: 'none' },
  input: { width: '100%', padding: '9px 12px 9px 36px', border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: 13, color: '#111827', background: '#fafafa', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.15s' },
  select: { appearance: 'none', paddingRight: 32, cursor: 'pointer' },
  fieldErr: { fontSize: 11, color: '#ef4444', marginTop: -2 },

  // Toggle balance de référence
  refToggle: { display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 16px', border: '1.5px solid #e5e7eb', borderRadius: 10, cursor: 'pointer', userSelect: 'none', transition: 'all 0.18s' },
  checkbox: { width: 18, height: 18, borderRadius: 5, border: '1.5px solid #d1d5db', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 1, transition: 'all 0.15s' },
  refToggleText: { flex: 1 },
  refToggleLabel: { margin: 0, fontSize: 13, fontWeight: 650, transition: 'color 0.15s' },
  refToggleDesc: { margin: '3px 0 0', fontSize: 12, color: '#6b7280', lineHeight: 1.5 },
  refBadge: { display: 'inline-flex', alignItems: 'center', padding: '3px 10px', background: '#fef3c7', color: '#b45309', borderRadius: 20, fontSize: 11, fontWeight: 600, flexShrink: 0 },

  // Bandeau N-1
  n1Banner: { display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 16px', border: '1px solid', borderRadius: 10, transition: 'all 0.2s' },
  n1Icon: { width: 32, height: 32, borderRadius: 8, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  n1Title: { margin: 0, fontSize: 13, fontWeight: 650 },
  n1Desc: { margin: '3px 0 0', fontSize: 12, color: '#6b7280', lineHeight: 1.5 },
  n1BlockBadge: { display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', background: '#fef3c7', color: '#b45309', borderRadius: 20, fontSize: 11, fontWeight: 600, flexShrink: 0 },

  dropZone: { border: '2px dashed #d1d5db', borderRadius: 12, padding: '28px 24px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s ease' },
  dropIconWrap: { width: 48, height: 48, background: '#f3f4f6', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' },
  dropTitle: { margin: 0, fontSize: 14, fontWeight: 600 },
  dropSub: { margin: '5px 0 6px', fontSize: 13, color: '#6b7280' },
  dropLink: { color: '#4f6ef7', fontWeight: 500 },
  dropFormats: { margin: 0, fontSize: 11, color: '#9ca3af' },
  filePreview: { display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: '#eef1fe', border: '1.5px solid #c7d2fe', borderRadius: 10 },
  fileIconWrap: { width: 38, height: 38, background: '#fff', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '1px solid #e5e7eb' },
  fileName: { margin: 0, fontSize: 13, fontWeight: 600, color: '#111827' },
  fileSize: { margin: '2px 0 0', fontSize: 11, color: '#6b7280' },
  fileRemove: { background: 'none', border: '1px solid #e5e7eb', borderRadius: 6, cursor: 'pointer', padding: 6, color: '#6b7280', display: 'flex', alignItems: 'center' },
  formatNote: { background: '#f8faff', border: '1px solid #dde5ff', borderRadius: 10, padding: '14px 18px' },
  formatNoteTitle: { margin: '0 0 10px', fontSize: 12, fontWeight: 600, color: '#4f6ef7' },
  formatCols: { display: 'flex', flexWrap: 'wrap', gap: 8 },
  formatCol: { display: 'flex', alignItems: 'center', gap: 6, background: '#fff', border: '1px solid #dde5ff', borderRadius: 6, padding: '4px 10px' },
  formatColLetter: { fontSize: 11, fontWeight: 700, color: '#4f6ef7', fontFamily: 'monospace' },
  formatColName: { fontSize: 11, color: '#374151' },
  formActions: { display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 4 },
  resetBtn: { padding: '9px 18px', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, fontWeight: 500, color: '#374151', cursor: 'pointer' },
  submitBtn: { display: 'flex', alignItems: 'center', gap: 8, padding: '10px 24px', background: 'linear-gradient(135deg, #4f6ef7 0%, #6e5ff7 100%)', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, color: '#fff', boxShadow: '0 2px 8px rgba(79,110,247,0.3)' },
  btnSpinner: { width: 14, height: 14, border: '2px solid rgba(255,255,255,0.35)', borderTop: '2px solid #fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' },
  emptyState: { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 24px', gap: 8, marginTop: 16 },
  emptyTitle: { margin: 0, fontSize: 14, fontWeight: 600, color: '#374151' },
  emptySub: { margin: 0, fontSize: 13, color: '#9ca3af' },
  importList: { marginTop: 16 },
  importRow: { display: 'flex', alignItems: 'center', gap: 14, padding: '13px 4px', transition: 'background 0.15s' },
  importStateIcon: { width: 34, height: 34, borderRadius: 8, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  importInfo: { flex: 1, minWidth: 0 },
  importName: { margin: 0, fontSize: 13, fontWeight: 600, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  importMeta: { display: 'flex', alignItems: 'center', gap: 12, marginTop: 3, flexWrap: 'wrap' },
  importMetaItem: { display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#9ca3af' },
  importNote: { fontSize: 11, color: '#6b7280', background: '#f3f4f6', padding: '1px 8px', borderRadius: 20 },
  importActions: { display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 },
  stateBadge: { fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20 },
  detailBtn: { display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 7, fontSize: 12, fontWeight: 500, color: '#374151', cursor: 'pointer' },
  refBadgeSmall: { fontSize: 10, fontWeight: 600, padding: '1px 7px', background: '#fef3c7', color: '#b45309', borderRadius: 20, flexShrink: 0 },
  warnBadgeSmall: { fontSize: 10, fontWeight: 600, padding: '1px 7px', background: '#fee2e2', color: '#dc2626', borderRadius: 20, flexShrink: 0 },
};