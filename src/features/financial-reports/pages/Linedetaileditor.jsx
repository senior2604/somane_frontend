// LineDetailEditor.jsx — Éditeur détaillé d'une ligne d'état financier SYSCOHADA
// Usage : <LineDetailEditor line={lineObj} report={reportObj} onClose={fn} onSaved={fn} />
// Style aligné sur FinancialReportConfig.jsx + Create.jsx

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  FiArrowLeft, FiSave, FiPlus, FiTrash2, FiCheck, FiX,
  FiAlertCircle, FiInfo, FiRefreshCw, FiHash, FiZap,
  FiLayers, FiCode, FiEye, FiEyeOff, FiCopy,
} from 'react-icons/fi';
import { apiClient } from '../../../services/apiClient';

// ── CONSTANTES (identiques à FinancialReportConfig) ───────────────────────────

const DATE_SCOPE_OPTIONS = [
  { value: 'opening_balance_debit',  label: 'Solde ouverture Débit',  col: 'Ouv.D',  color: '#1a6aab', letter: 'OD' },
  { value: 'opening_balance_credit', label: 'Solde ouverture Crédit', col: 'Ouv.C',  color: '#6b3fa0', letter: 'OC' },
  { value: 'period_move_debit',      label: 'Mouvement Débit',        col: 'Mvt.D',  color: '#1a7a4a', letter: 'MD' },
  { value: 'period_move_credit',     label: 'Mouvement Crédit',       col: 'Mvt.C',  color: '#7a4a1a', letter: 'MC' },
  { value: 'closing_balance_debit',  label: 'Solde clôture Débit',   col: 'Clôt.D', color: '#0f3d6e', letter: 'CD' },
  { value: 'closing_balance_credit', label: 'Solde clôture Crédit',  col: 'Clôt.C', color: '#3d0f6e', letter: 'CC' },
];

const OPERATOR_OPTIONS = [
  { value: '+', label: 'Addition',       sym: '+', color: '#059669' },
  { value: '-', label: 'Soustraction',   sym: '−', color: '#dc2626' },
  { value: '*', label: 'Multiplication', sym: '×', color: '#7c3aed' },
  { value: '/', label: 'Division',       sym: '÷', color: '#d97706' },
];

const EXP_TYPE_OPTIONS = [
  { value: 'account_domain',  label: 'Préfixes de comptes', icon: FiHash,   hint: 'Ex: 24,245,2495' },
  { value: 'fixed_value',     label: 'Valeur fixe',         icon: FiZap,    hint: 'Ex: 0 ou 100000' },
  { value: 'aggregate_lines', label: 'Agrégation de lignes',icon: FiLayers, hint: 'Ex: AZ+BK'       },
  { value: 'ratio',           label: 'Ratio / Formule',     icon: FiCode,   hint: 'Formule custom'   },
];

const LINE_TYPE_CONFIG = {
  header:  { label: 'Titre',   bg: '#1a3a5c', text: '#fff',    border: '#1a3a5c' },
  account: { label: 'Compte',  bg: '#dbeafe', text: '#1e40af', border: '#93c5fd' },
  formula: { label: 'Formule', bg: '#fef3c7', text: '#92400e', border: '#fcd34d' },
  total:   { label: 'Total',   bg: '#dcfce7', text: '#166534', border: '#86efac' },
};

const SIGN_OPTIONS = [
  { value: 1,  label: 'Actif / Charge',   badge: 'A+', color: '#059669', hint: 'Valeur positive — côté Actif ou Charge' },
  { value: -1, label: 'Passif / Produit', badge: 'P−', color: '#dc2626', hint: 'Valeur négative — côté Passif ou Produit' },
];

const REPORT_CFG = {
  balance_sheet: { color: '#1a3a5c', icon: '⚖️',  label: 'Bilan' },
  profit_loss:   { color: '#1a5c3a', icon: '📈',  label: 'Compte de résultat' },
  cash_flow:     { color: '#3a1a5c', icon: '💸',  label: 'TFT' },
  custom:        { color: '#5c3a1a', icon: '⚙️',  label: 'Personnalisé' },
};

// ── NOUVEAU : Options column_target ───────────────────────────────────────────
const COLUMN_TARGET_OPTIONS = [
  {
    value: 'net',
    label: 'NET / Solde principal',
    badge: 'NET',
    color: '#1a6aab',
    hint: 'Valeur principale — tous états (CR, TFT, Passif, NET Bilan)'
  },
  {
    value: 'brut',
    label: 'BRUT (Bilan Actif)',
    badge: 'BRT',
    color: '#1a7a4a',
    hint: 'Valeur brute avant amortissements — Bilan Actif uniquement'
  },
  {
    value: 'amort',
    label: 'AMORT./DÉPRÉC.',
    badge: 'AMT',
    color: '#dc2626',
    hint: 'Cumul amortissements/dépréciations — Bilan Actif uniquement'
  },
];

const API = {
  lines:       '/financial-reports/lines/',
  expressions: '/financial-reports/expressions/',
};

function uid() { return '__new_' + Math.random().toString(36).slice(2); }

// ── TOOLTIP ───────────────────────────────────────────────────────────────────

function Tip({ text, children, placement = 'top' }) {
  const [show, setShow] = useState(false);
  const pos = placement === 'top'
    ? { bottom: '120%', left: '50%', transform: 'translateX(-50%)' }
    : { top: '120%',   left: '50%', transform: 'translateX(-50%)' };
  return (
    <span style={{ position: 'relative', display: 'inline-flex' }}
      onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      {children}
      {show && (
        <span style={{
          position: 'absolute', ...pos,
          background: '#0f172a', color: '#e2e8f0', fontSize: 10,
          padding: '4px 8px', borderRadius: 4, whiteSpace: 'nowrap',
          zIndex: 9999, pointerEvents: 'none',
          boxShadow: '0 4px 12px rgba(0,0,0,.3)', lineHeight: 1.4,
        }}>
          {text}
        </span>
      )}
    </span>
  );
}

// ── BADGE SCOPE ───────────────────────────────────────────────────────────────

function ScopeBadge({ value, size = 'sm' }) {
  const opt = DATE_SCOPE_OPTIONS.find(o => o.value === value);
  if (!opt) return null;
  const p  = size === 'xs' ? '0px 4px' : '1px 6px';
  const fs = size === 'xs' ? 9 : 10;
  return (
    <span style={{
      display: 'inline-block', padding: p, borderRadius: 3,
      fontSize: fs, fontWeight: 700, letterSpacing: '.03em',
      background: opt.color + '18', color: opt.color,
      border: `1px solid ${opt.color}40`, whiteSpace: 'nowrap',
    }}>
      {opt.letter}
    </span>
  );
}

// ── FORMULA PREVIEW — VERSION GROUPÉE PAR COLUMN_TARGET ───────────────────────

function FormulaPreview({ exprs }) {
  const active = [...(exprs || [])].filter(e => e.active).sort((a, b) => a.sequence - b.sequence);
  if (!active.length) return (
    <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: 10 }}>Aucune expression active</span>
  );

  // ── Grouper les expressions par column_target ───────────────────────────
  const grouped = {};
  active.forEach(e => {
    const target = e.column_target || 'net';
    if (!grouped[target]) grouped[target] = [];
    grouped[target].push(e);
  });

  // Ordre d'affichage : brut → amort → net
  const order = ['brut', 'amort', 'net'];

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      gap: 3, 
      fontFamily: 'DM Mono, monospace', 
      fontSize: 10, 
      color: '#334155',
      lineHeight: 1.5,
    }}>
      {order.map(target => {
        const items = grouped[target];
        // N'afficher que les groupes qui ont des expressions
        if (!items || items.length === 0) return null;
        
        const ctOpt = COLUMN_TARGET_OPTIONS.find(o => o.value === target) || COLUMN_TARGET_OPTIONS[0];
        
        return (
          <div key={target} style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
            {/* Badge column_target en début de ligne */}
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 2,
              padding: '0 4px', borderRadius: 2,
              fontSize: 9, fontWeight: 700,
              background: ctOpt.color + '15',
              color: ctOpt.color,
              border: `1px solid ${ctOpt.color}40`,
              whiteSpace: 'nowrap',
            }} title={ctOpt.hint}>
              {ctOpt.badge}
            </span>
            
            {/* Expressions du groupe */}
            {items.map((e, i) => {
              const op = OPERATOR_OPTIONS.find(o => o.value === e.operator);
              const sc = DATE_SCOPE_OPTIONS.find(o => o.value === e.date_scope);
              return (
                <span key={e.id || e._uid} style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  {i > 0 && (
                    <span style={{ fontWeight: 700, color: op?.color || '#1e40af', margin: '0 2px' }}>
                      {op?.sym}
                    </span>
                  )}
                  <span style={{
                    background: '#f1f5f9', padding: '0 4px', borderRadius: 3,
                    color: '#1e293b', border: '1px solid #e2e8f0',
                  }}>
                    {e.formula || '…'}
                  </span>
                  {sc && <ScopeBadge value={e.date_scope} size="xs" />}
                </span>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

// ── STYLES ────────────────────────────────────────────────────────────────────

const S = {
  field: {
    padding: '4px 8px', border: '1px solid #e2e8f0', borderRadius: 4,
    fontSize: 12, color: '#1e293b', background: '#fff', height: 30,
    outline: 'none', width: '100%', boxSizing: 'border-box',
  },
  select: {
    padding: '4px 6px', border: '1px solid #e2e8f0', borderRadius: 4,
    fontSize: 12, color: '#1e293b', background: '#fff', height: 30,
    cursor: 'pointer', width: '100%', boxSizing: 'border-box',
  },
  label: {
    fontSize: 10, fontWeight: 700, color: '#64748b',
    textTransform: 'uppercase', letterSpacing: '.07em',
    display: 'block', marginBottom: 4,
  },
  cellInput: {
    width: '100%', border: 'none', background: 'transparent',
    fontSize: 11, color: '#1e293b', outline: 'none',
    padding: '0 4px', height: '100%', fontFamily: 'inherit',
    boxSizing: 'border-box',
  },
  btnPrimary: {
    padding: '6px 16px', background: '#1a3a5c', color: '#ffd700',
    border: 'none', borderRadius: 5, cursor: 'pointer',
    fontSize: 12, fontWeight: 700,
    display: 'inline-flex', alignItems: 'center', gap: 5,
  },
  btnSecondary: {
    padding: '5px 12px', background: '#fff', color: '#475569',
    border: '1px solid #e2e8f0', borderRadius: 4, cursor: 'pointer',
    fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 4,
  },
  btnAdd: {
    padding: '5px 12px', background: '#eff6ff', color: '#1a6aab',
    border: '1px dashed #93c5fd', borderRadius: 5, cursor: 'pointer',
    fontSize: 11, fontWeight: 600,
    display: 'inline-flex', alignItems: 'center', gap: 5,
  },
};

// ══════════════════════════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Props :
 *   line    — objet FinancialReportLine (avec .expressions si nested)
 *   report  — objet FinancialReport parent
 *   onClose — () => void  (retour à la liste)
 *   onSaved — () => void  (refresh parent après sauvegarde)
 */
export default function LineDetailEditor({ line: initialLine, report, onClose, onSaved }) {
  const [line,        setLine]        = useState({ ...initialLine });
  const [expressions, setExpressions] = useState([]);
  const [loading,     setLoading]     = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [toast,       setToast]       = useState(null);
  const [dirty,       setDirty]       = useState(false);
  const [showHelp,    setShowHelp]    = useState(false);
  const tableEndRef = useRef(null);

  const reportCfg = REPORT_CFG[report?.report_type] || REPORT_CFG.custom;
  const lineCfg   = LINE_TYPE_CONFIG[line.line_type] || LINE_TYPE_CONFIG.account;
  const signOpt   = SIGN_OPTIONS.find(s => Number(s.value) === Number(line.sign)) || SIGN_OPTIONS[0];

  // ── Toast ─────────────────────────────────────────────────────────────
  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // ── Chargement expressions ────────────────────────────────────────────
  const loadExpressions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get(API.expressions, { params: { line: initialLine.id } });
      const all = res.results || res;
      const filtered = all
        .filter(e => {
          const lid = typeof e.line === 'object' ? e.line?.id : e.line;
          return lid === initialLine.id;
        })
        .map(e => ({ ...e, _uid: String(e.id) }))
        .sort((a, b) => a.sequence - b.sequence);
      setExpressions(filtered);
    } catch {
      showToast('Erreur chargement des expressions', 'error');
    } finally {
      setLoading(false);
    }
  }, [initialLine.id]);

  useEffect(() => {
    if (Array.isArray(initialLine.expressions) && initialLine.expressions.length > 0) {
      setExpressions(
        initialLine.expressions
          .filter(e => {
            const lid = typeof e.line === 'object' ? e.line?.id : e.line;
            return lid === initialLine.id;
          })
          .map(e => ({ ...e, _uid: String(e.id) }))
          .sort((a, b) => a.sequence - b.sequence)
      );
    } else {
      loadExpressions();
    }
  }, [initialLine.id]);

  // ── Mise à jour ligne ─────────────────────────────────────────────────
  const updateLine = (field, value) => {
    setLine(prev => ({ ...prev, [field]: value }));
    setDirty(true);
  };

  // ── CRUD expressions ──────────────────────────────────────────────────
  const addExpression = () => {
    const nextSeq = expressions.length > 0
      ? Math.max(...expressions.map(e => e.sequence)) + 10
      : 10;
    const newExpr = {
      _uid: uid(), id: uid(),
      line: initialLine.id, report: report.id,
      formula: '', date_scope: 'closing_balance_debit',
      sign: 'positive', sequence: nextSeq,
      operator: '+', expression_type: 'account_domain',
      column_target: 'net',  // ← Valeur par défaut
      active: true, isNew: true,
    };
    setExpressions(prev => [...prev, newExpr]);
    setDirty(true);
    setTimeout(() => tableEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
  };

  const updateExpr = (uid_val, field, value) => {
    setExpressions(prev => prev.map(e =>
      (e._uid === uid_val || String(e.id) === String(uid_val))
        ? { ...e, [field]: value }
        : e
    ));
    setDirty(true);
  };

  const deleteExpr = async (uid_val, isNew) => {
    if (!isNew && !window.confirm('Supprimer cette expression définitivement ?')) return;
    if (!isNew) {
      const target = expressions.find(e => e._uid === uid_val || String(e.id) === String(uid_val));
      const realId = target?.id;
      if (realId && !String(realId).startsWith('__new_')) {
        try {
          await apiClient.delete(`${API.expressions}${realId}/`);
        } catch {
          showToast('Erreur suppression', 'error');
          return;
        }
      }
    }
    setExpressions(prev => prev.filter(e => e._uid !== uid_val && String(e.id) !== String(uid_val)));
    setDirty(true);
  };

  const duplicateExpr = (uid_val) => {
    const src = expressions.find(e => e._uid === uid_val || String(e.id) === String(uid_val));
    if (!src) return;
    const newUid = uid();
    setExpressions(prev =>
      [...prev, { ...src, _uid: newUid, id: newUid, sequence: src.sequence + 1, isNew: true }]
        .sort((a, b) => a.sequence - b.sequence)
    );
    setDirty(true);
  };

  // ── Sauvegarde ────────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    try {
      // 1. PATCH la ligne
      await apiClient.patch(`${API.lines}${initialLine.id}/`, {
        name:      line.name,
        code:      line.code,
        sequence:  line.sequence,
        line_type: line.line_type,
        sign:      line.sign,
        active:    line.active,
      });

      // 2. Sauvegarder les expressions
      await Promise.all(
        expressions.map(expr => {
          const { isNew, _uid, ...payload } = expr;
          if (isNew) {
            const { id: _id, ...createPayload } = payload;
            return apiClient.post(API.expressions, createPayload);
          }
          return apiClient.patch(`${API.expressions}${expr.id}/`, payload);
        })
      );

      setDirty(false);
      showToast('Ligne et expressions sauvegardées ✓');
      onSaved?.();
      await loadExpressions();
    } catch (err) {
      console.error(err);
      showToast('Erreur lors de la sauvegarde', 'error');
    } finally {
      setSaving(false);
    }
  };

  // ── Quitter avec confirmation si dirty ────────────────────────────────
  const handleClose = () => {
    if (dirty && !window.confirm('Modifications non sauvegardées. Quitter quand même ?')) return;
    onClose();
  };

  // ── Stats expressions ─────────────────────────────────────────────────
  const activeExprs   = expressions.filter(e => e.active);
  const newExprsCount = expressions.filter(e => e.isNew).length;

  // ══════════════════════════════════════════════════════════════════════
  // RENDU
  // ══════════════════════════════════════════════════════════════════════

  return (
    <div style={{ background: '#f8fafc', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>

      {/* ── TOAST ─────────────────────────────────────────────────────── */}
      {toast && (
        <div style={{
          position: 'fixed', top: 16, right: 16, zIndex: 2000,
          background: toast.type === 'error' ? '#fef2f2' : '#f0fdf4',
          border: `1px solid ${toast.type === 'error' ? '#fca5a5' : '#86efac'}`,
          color: toast.type === 'error' ? '#dc2626' : '#16a34a',
          padding: '10px 16px', borderRadius: 8, fontSize: 12, fontWeight: 600,
          display: 'flex', alignItems: 'center', gap: 8,
          boxShadow: '0 4px 20px rgba(0,0,0,.15)',
        }}>
          {toast.type === 'error' ? <FiAlertCircle size={14} /> : <FiCheck size={14} />}
          {toast.msg}
        </div>
      )}

      {/* ── NAVBAR ────────────────────────────────────────────────────── */}
      <div style={{
        background: reportCfg.color, padding: '0 20px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        height: 52, position: 'sticky', top: 0, zIndex: 100,
      }}>
        {/* Gauche */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={handleClose} style={{
            background: 'rgba(255,255,255,.12)', border: '1px solid rgba(255,255,255,.2)',
            color: '#fff', padding: '4px 10px', borderRadius: 4, cursor: 'pointer',
            fontSize: 11, display: 'flex', alignItems: 'center', gap: 4,
          }}>
            <FiArrowLeft size={11} /> Retour
          </button>

          <div style={{ color: 'rgba(255,255,255,.3)', fontSize: 14 }}>|</div>

          <span style={{ fontSize: 14, marginRight: 4 }}>{reportCfg.icon}</span>

          {/* Breadcrumb */}
          <span style={{ color: 'rgba(255,255,255,.55)', fontSize: 11 }}>{report.name}</span>
          <span style={{ color: 'rgba(255,255,255,.3)', fontSize: 11 }}>›</span>
          <span style={{ color: '#fff', fontWeight: 700, fontSize: 11 }}>Ligne {line.code}</span>

          {/* Badges statut */}
          <span style={{
            fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 8,
            background: 'rgba(255,255,255,.15)', color: 'rgba(255,255,255,.85)',
            textTransform: 'uppercase', letterSpacing: '.04em',
          }}>
            {lineCfg.label}
          </span>
          <span style={{
            fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 8,
            background: signOpt.color + '30', color: signOpt.color,
            border: `1px solid ${signOpt.color}50`,
          }}>
            {signOpt.badge} {signOpt.label}
          </span>
          {dirty && (
            <span style={{
              fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 8,
              background: '#fbbf2440', color: '#fbbf24',
              border: '1px solid #fbbf2460',
            }}>
              ● Non sauvegardé
            </span>
          )}
        </div>

        {/* Droite */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <button onClick={loadExpressions} style={{
            background: 'rgba(255,255,255,.1)', border: '1px solid rgba(255,255,255,.2)',
            color: '#fff', width: 32, height: 32, borderRadius: 4, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <FiRefreshCw size={13} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          </button>
          <button onClick={handleSave} disabled={saving || !dirty} style={{
            background: dirty ? '#ffd700' : 'rgba(255,255,255,.15)',
            color: dirty ? '#1a3a5c' : 'rgba(255,255,255,.4)',
            border: 'none', padding: '6px 16px', borderRadius: 5,
            cursor: dirty ? 'pointer' : 'not-allowed',
            fontSize: 12, fontWeight: 700,
            display: 'flex', alignItems: 'center', gap: 5,
            opacity: saving ? .7 : 1,
          }}>
            <FiSave size={13} />
            {saving ? 'Enregistrement…' : 'Sauvegarder tout'}
          </button>
        </div>
      </div>

      {/* ── CORPS ─────────────────────────────────────────────────────── */}
      <div style={{ padding: '20px' }}>

        {/* ═══ PARTIE HAUTE : FICHE LIGNE ══════════════════════════════ */}
        <div style={{
          background: '#fff', borderRadius: 8,
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 4px rgba(0,0,0,.05)',
          marginBottom: 20, overflow: 'hidden',
        }}>
          {/* En-tête section */}
          <div style={{
            padding: '10px 16px',
            background: reportCfg.color + '0a',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 3, height: 14, borderRadius: 2, background: reportCfg.color }} />
              <span style={{
                fontSize: 10, fontWeight: 700, color: reportCfg.color,
                textTransform: 'uppercase', letterSpacing: '.08em',
              }}>
                Paramètres de la ligne
              </span>
            </div>
            <span style={{ fontSize: 10, color: '#94a3b8' }}>
              ID #{initialLine.id} · séquence {line.sequence}
            </span>
          </div>

          {/* Grille de champs */}
          <div style={{ padding: 16 }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '120px 1fr 1fr 1fr',
              gap: '14px 20px',
            }}>

              {/* Code (lecture seule) */}
              <div>
                <label style={S.label}>Code</label>
                <div style={{
                  height: 30, padding: '4px 10px',
                  background: '#f8fafc', border: '1px solid #e2e8f0',
                  borderRadius: 4, fontSize: 12,
                  fontFamily: 'DM Mono, monospace', fontWeight: 700,
                  color: '#1a3a5c', display: 'flex', alignItems: 'center',
                }}>
                  {line.code}
                </div>
              </div>

              {/* Libellé */}
              <div style={{ gridColumn: 'span 3' }}>
                <label style={S.label}>Libellé *</label>
                <input
                  type="text"
                  value={line.name}
                  onChange={e => updateLine('name', e.target.value)}
                  style={{ ...S.field, fontSize: 13, fontWeight: 500 }}
                  placeholder="Libellé de la ligne"
                />
              </div>

              {/* Type de ligne */}
              <div>
                <label style={S.label}>Type de ligne</label>
                <select
                  value={line.line_type}
                  onChange={e => updateLine('line_type', e.target.value)}
                  style={S.select}
                >
                  {Object.entries(LINE_TYPE_CONFIG).map(([v, c]) => (
                    <option key={v} value={v}>{c.label}</option>
                  ))}
                </select>
              </div>

              {/* Classification (signe) */}
              <div>
                <label style={S.label}>Classification</label>
                <select
                  value={Number(line.sign)}
                  onChange={e => updateLine('sign', Number(e.target.value))}
                  style={{
                    ...S.select,
                    color: signOpt.color, fontWeight: 700,
                    borderColor: signOpt.color + '60',
                    background: signOpt.color + '08',
                  }}
                >
                  {SIGN_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.badge} — {o.label}</option>
                  ))}
                </select>
              </div>

              {/* Séquence */}
              <div>
                <label style={S.label}>Séquence</label>
                <input
                  type="number"
                  value={line.sequence}
                  onChange={e => updateLine('sequence', Number(e.target.value))}
                  style={S.field}
                  min={1} step={10}
                />
              </div>

              {/* Actif */}
              <div>
                <label style={S.label}>Statut</label>
                <button
                  onClick={() => updateLine('active', !line.active)}
                  style={{
                    height: 30, padding: '0 14px', borderRadius: 4, cursor: 'pointer',
                    border: `1px solid ${line.active ? '#86efac' : '#e2e8f0'}`,
                    background: line.active ? '#dcfce7' : '#f8fafc',
                    color: line.active ? '#16a34a' : '#94a3b8',
                    fontSize: 11, fontWeight: 700,
                    display: 'flex', alignItems: 'center', gap: 5,
                  }}
                >
                  {line.active
                    ? <><FiCheck size={11} /> Actif</>
                    : <><FiX size={11} /> Inactif</>
                  }
                </button>
              </div>

              {/* Formule résultante (preview) */}
              <div style={{ gridColumn: 'span 4' }}>
                <label style={S.label}>Formule résultante</label>
                <div style={{
                  padding: '7px 12px', background: '#f8fafc', borderRadius: 4,
                  border: '1px solid #e2e8f0', minHeight: 30,
                  display: 'flex', alignItems: 'center',
                }}>
                  <FormulaPreview exprs={expressions} />
                </div>
              </div>
            </div>

            {/* Note classification */}
            <div style={{
              marginTop: 12, padding: '8px 12px',
              background: '#fffbeb', borderRadius: 4, border: '1px solid #fde68a',
              display: 'flex', gap: 8, alignItems: 'flex-start',
            }}>
              <FiInfo size={12} color="#92400e" style={{ flexShrink: 0, marginTop: 1 }} />
              <span style={{ fontSize: 10, color: '#78350f', lineHeight: 1.5 }}>
                <strong>Classification :</strong> signe{' '}
                <code style={{ background: '#fef3c7', padding: '0 3px', borderRadius: 2 }}>
                  {Number(line.sign) === 1 ? 'positif (+1)' : 'négatif (−1)'}
                </code>
                {' '}→ ligne {signOpt.label.toLowerCase()}. Le signe ne modifie pas les valeurs calculées —
                utilisez les <strong>opérateurs</strong> (+ − × ÷) entre expressions pour composer votre calcul.
              </span>
            </div>
          </div>
        </div>

        {/* ═══ PARTIE BASSE : TABLEAU EXPRESSIONS ══════════════════════ */}
        <div style={{
          background: '#fff', borderRadius: 8,
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 4px rgba(0,0,0,.05)',
          overflow: 'hidden',
        }}>
          {/* En-tête section */}
          <div style={{
            padding: '10px 16px',
            background: reportCfg.color + '0a',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            flexWrap: 'wrap', gap: 8,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 3, height: 14, borderRadius: 2, background: reportCfg.color }} />
              <span style={{
                fontSize: 10, fontWeight: 700, color: reportCfg.color,
                textTransform: 'uppercase', letterSpacing: '.08em',
              }}>
                Expressions de calcul
              </span>
              <span style={{
                fontSize: 10, padding: '1px 8px', borderRadius: 10, fontWeight: 700,
                background: activeExprs.length > 0 ? '#dcfce7' : '#f1f5f9',
                color: activeExprs.length > 0 ? '#16a34a' : '#94a3b8',
              }}>
                {activeExprs.length} active{activeExprs.length !== 1 ? 's' : ''}
              </span>
              {newExprsCount > 0 && (
                <span style={{
                  fontSize: 10, padding: '1px 8px', borderRadius: 10, fontWeight: 700,
                  background: '#dbeafe', color: '#1d4ed8',
                }}>
                  +{newExprsCount} nouvelle{newExprsCount !== 1 ? 's' : ''}
                </span>
              )}
            </div>

            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {/* Légende colonnes */}
              <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ fontSize: 10, color: '#94a3b8' }}>Colonnes :</span>
                {DATE_SCOPE_OPTIONS.map(o => (
                  <Tip key={o.value} text={`${o.letter} = ${o.label}`}>
                    <ScopeBadge value={o.value} size="xs" />
                  </Tip>
                ))}
              </div>

              <button
                onClick={() => setShowHelp(v => !v)}
                style={{
                  ...S.btnSecondary, fontSize: 10, padding: '3px 8px',
                }}
              >
                <FiInfo size={10} />
                {showHelp ? 'Masquer aide' : 'Aide'}
              </button>

              <button onClick={addExpression} style={{
                padding: '5px 12px', background: reportCfg.color, color: '#fff',
                border: 'none', borderRadius: 5, cursor: 'pointer',
                fontSize: 11, fontWeight: 600,
                display: 'flex', alignItems: 'center', gap: 5,
              }}>
                <FiPlus size={12} /> Ajouter expression
              </button>
            </div>
          </div>

          {/* Aide contextuelle */}
          {showHelp && (
            <div style={{
              padding: '12px 16px', background: '#fffbeb',
              borderBottom: '1px solid #fde68a',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
              gap: 12,
            }}>
              <div style={{ fontSize: 10, color: '#78350f' }}>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>📋 Types d'expression</div>
                {EXP_TYPE_OPTIONS.map(o => {
                  const Icon = o.icon;
                  return (
                    <div key={o.value} style={{ display: 'flex', gap: 5, marginBottom: 3, alignItems: 'flex-start' }}>
                      <Icon size={10} style={{ flexShrink: 0, marginTop: 1 }} />
                      <span><strong>{o.label}</strong> — {o.hint}</span>
                    </div>
                  );
                })}
              </div>
              <div style={{ fontSize: 10, color: '#78350f' }}>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>🔢 Opérateurs</div>
                {OPERATOR_OPTIONS.map(o => (
                  <div key={o.value} style={{ marginBottom: 3 }}>
                    <span style={{ fontWeight: 800, color: o.color, marginRight: 6, fontSize: 13 }}>{o.sym}</span>
                    <span>{o.label}</span>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 10, color: '#78350f' }}>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>⚙️ Exemple</div>
                <div style={{ fontFamily: 'DM Mono, monospace', lineHeight: 2 }}>
                  <div><strong>Expr 1</strong> <span style={{ color: '#059669', fontWeight: 800 }}>+</span> : <code style={{ background: '#fef3c7', padding: '0 3px', borderRadius: 2 }}>24</code> → Clôt.D</div>
                  <div><strong>Expr 2</strong> <span style={{ color: '#dc2626', fontWeight: 800 }}>−</span> : <code style={{ background: '#fef3c7', padding: '0 3px', borderRadius: 2 }}>245,2495</code> → Clôt.D</div>
                  <div style={{ color: '#92400e', marginTop: 4 }}>= Matériel net d'amortissements</div>
                </div>
              </div>
            </div>
          )}

          {/* Tableau */}
          {loading ? (
            <div style={{ padding: 48, textAlign: 'center', color: '#94a3b8' }}>
              <FiRefreshCw size={20} style={{ animation: 'spin 1s linear infinite', display: 'block', margin: '0 auto 8px' }} />
              <div style={{ fontSize: 12 }}>Chargement des expressions…</div>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f1f5f9' }}>
                    {[
                      { h: 'Seq',        w: 52  },
                      { h: 'Op.',        w: 64  },
                      { h: 'Type',       w: 100 },
                      { h: 'Formule / Préfixes de comptes', w: null },
                      { h: 'Col. cible', w: 95 },  // ← NOUVELLE COLONNE
                      { h: 'Colonne de balance',           w: 210 },
                      { h: 'Actif',      w: 52  },
                      { h: 'Actions',    w: 72  },
                    ].map((col, i) => (
                      <th key={i} style={{
                        padding: '7px 8px', textAlign: 'left',
                        fontSize: 9, fontWeight: 700, color: '#64748b',
                        textTransform: 'uppercase', letterSpacing: '.06em',
                        borderBottom: '2px solid #e2e8f0',
                        borderRight: i < 7 ? '1px solid #e8edf2' : 'none',
                        width: col.w || undefined,
                        whiteSpace: 'nowrap',
                      }}>
                        {col.h}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {expressions.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{  // ← 8 colonnes au lieu de 7
                        padding: '40px 20px', textAlign: 'center',
                        color: '#94a3b8', fontSize: 12, fontStyle: 'italic',
                      }}>
                        Aucune expression — cliquez sur « Ajouter expression » pour commencer
                      </td>
                    </tr>
                  ) : (
                    [...expressions]
                      .sort((a, b) => a.sequence - b.sequence)
                      .map((expr, idx) => {
                        const isNew    = !!expr.isNew;
                        const opOpt    = OPERATOR_OPTIONS.find(o => o.value === expr.operator) || OPERATOR_OPTIONS[0];
                        const typeOpt  = EXP_TYPE_OPTIONS.find(t => t.value === expr.expression_type) || EXP_TYPE_OPTIONS[0];
                        const TypeIcon = typeOpt.icon;
                        const scOpt    = DATE_SCOPE_OPTIONS.find(o => o.value === expr.date_scope) || DATE_SCOPE_OPTIONS[4];
                        const rowBg    = isNew ? '#eff6ff' : (idx % 2 === 0 ? '#fff' : '#fafbfc');

                        // ← NOUVEAU : option column_target sélectionnée
                        const ctOpt = COLUMN_TARGET_OPTIONS.find(o => o.value === (expr.column_target || 'net'))
                          || COLUMN_TARGET_OPTIONS[0];

                        return (
                          <tr
                            key={expr._uid || expr.id}
                            style={{
                              background: rowBg,
                              borderLeft: `3px solid ${isNew ? '#3b82f6' : scOpt.color}`,
                            }}
                          >
                            {/* Séquence */}
                            <td style={{ padding: '4px 6px', borderBottom: '1px solid #f1f5f9', borderRight: '1px solid #f1f5f9' }}>
                              <input
                                type="number"
                                value={expr.sequence}
                                onChange={e => updateExpr(expr._uid, 'sequence', Number(e.target.value))}
                                style={{
                                  ...S.cellInput, width: 44, textAlign: 'center',
                                  fontFamily: 'DM Mono, monospace', fontSize: 10, color: '#64748b',
                                }}
                                min={1} step={10}
                                title="Ordre d'évaluation"
                              />
                            </td>

                            {/* Opérateur */}
                            <td style={{ padding: '4px 6px', borderBottom: '1px solid #f1f5f9', borderRight: '1px solid #f1f5f9', textAlign: 'center' }}>
                              <Tip text={idx === 0 ? "Opérateur d'initialisation" : "Combine avec les expressions précédentes"}>
                                <select
                                  value={expr.operator}
                                  onChange={e => updateExpr(expr._uid, 'operator', e.target.value)}
                                  style={{
                                    width: 50, height: 26,
                                    border: `1px solid ${idx === 0 ? '#e2e8f0' : opOpt.color + '60'}`,
                                    borderRadius: 4, fontWeight: 800, fontSize: 15,
                                    color: opOpt.color, textAlign: 'center',
                                    background: idx === 0 ? '#f8fafc' : opOpt.color + '10',
                                    cursor: 'pointer',
                                  }}
                                >
                                  {OPERATOR_OPTIONS.map(o => (
                                    <option key={o.value} value={o.value}>{o.sym}</option>
                                  ))}
                                </select>
                              </Tip>
                            </td>

                            {/* Type */}
                            <td style={{ padding: '4px 6px', borderBottom: '1px solid #f1f5f9', borderRight: '1px solid #f1f5f9' }}>
                              <select
                                value={expr.expression_type}
                                onChange={e => updateExpr(expr._uid, 'expression_type', e.target.value)}
                                style={{
                                  width: '100%', height: 26, border: '1px solid #e2e8f0',
                                  borderRadius: 4, fontSize: 10, color: '#475569',
                                  background: '#f8fafc', cursor: 'pointer', padding: '0 4px',
                                  boxSizing: 'border-box',
                                }}
                              >
                                {EXP_TYPE_OPTIONS.map(o => (
                                  <option key={o.value} value={o.value}>{o.label}</option>
                                ))}
                              </select>
                            </td>

                            {/* Formule */}
                            <td style={{ padding: '4px 8px', borderBottom: '1px solid #f1f5f9', borderRight: '1px solid #f1f5f9' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <TypeIcon size={11} color="#94a3b8" style={{ flexShrink: 0 }} />
                                <input
                                  type="text"
                                  value={expr.formula}
                                  onChange={e => updateExpr(expr._uid, 'formula', e.target.value)}
                                  placeholder={typeOpt.hint}
                                  style={{
                                    ...S.cellInput,
                                    fontFamily: 'DM Mono, monospace', fontSize: 11, flex: 1,
                                  }}
                                />
                              </div>
                            </td>

                            {/* ── NOUVEAU : Colonne cible (column_target) ── */}
                            <td style={{ padding: '4px 6px', borderBottom: '1px solid #f1f5f9', borderRight: '1px solid #f1f5f9' }}>
                              <Tip text={ctOpt.hint}>
                                <select
                                  value={expr.column_target || 'net'}
                                  onChange={e => updateExpr(expr._uid, 'column_target', e.target.value)}
                                  style={{
                                    width: '100%', height: 26,
                                    border: `1px solid ${ctOpt.color}60`,
                                    borderRadius: 4, fontSize: 10,
                                    fontWeight: 700, color: ctOpt.color,
                                    background: ctOpt.color + '10',
                                    cursor: 'pointer', padding: '0 4px',
                                    boxSizing: 'border-box',
                                  }}
                                >
                                  {COLUMN_TARGET_OPTIONS.map(o => (
                                    <option key={o.value} value={o.value}>
                                      {o.badge} — {o.label}
                                    </option>
                                  ))}
                                </select>
                              </Tip>
                            </td>

                            {/* Colonne de balance */}
                            <td style={{ padding: '4px 6px', borderBottom: '1px solid #f1f5f9', borderRight: '1px solid #f1f5f9' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                <ScopeBadge value={expr.date_scope} size="xs" />
                                <select
                                  value={expr.date_scope}
                                  onChange={e => updateExpr(expr._uid, 'date_scope', e.target.value)}
                                  style={{
                                    flex: 1, height: 26, border: '1px solid #e2e8f0',
                                    borderRadius: 4, fontSize: 10, color: '#475569',
                                    background: '#fff', cursor: 'pointer', padding: '0 3px',
                                    boxSizing: 'border-box',
                                  }}
                                >
                                  {DATE_SCOPE_OPTIONS.map(o => (
                                    <option key={o.value} value={o.value}>{o.col} — {o.label}</option>
                                  ))}
                                </select>
                              </div>
                            </td>

                            {/* Toggle actif */}
                            <td style={{ padding: '4px 6px', borderBottom: '1px solid #f1f5f9', borderRight: '1px solid #f1f5f9', textAlign: 'center' }}>
                              <button
                                onClick={() => updateExpr(expr._uid, 'active', !expr.active)}
                                title={expr.active ? 'Désactiver' : 'Activer'}
                                style={{
                                  width: 30, height: 26, borderRadius: 4, cursor: 'pointer',
                                  border: `1px solid ${expr.active ? '#86efac' : '#e2e8f0'}`,
                                  background: expr.active ? '#dcfce7' : '#f8fafc',
                                  color: expr.active ? '#16a34a' : '#94a3b8',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  margin: '0 auto',
                                }}
                              >
                                {expr.active ? <FiEye size={11} /> : <FiEyeOff size={11} />}
                              </button>
                            </td>

                            {/* Actions : dupliquer + supprimer */}
                            <td style={{ padding: '4px 6px', borderBottom: '1px solid #f1f5f9', textAlign: 'center' }}>
                              <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                                <Tip text="Dupliquer">
                                  <button
                                    onClick={() => duplicateExpr(expr._uid)}
                                    style={{
                                      width: 26, height: 26, borderRadius: 4, cursor: 'pointer',
                                      border: '1px solid #e2e8f0', background: '#f8fafc',
                                      color: '#64748b',
                                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    }}
                                  >
                                    <FiCopy size={10} />
                                  </button>
                                </Tip>
                                <Tip text="Supprimer">
                                  <button
                                    onClick={() => deleteExpr(expr._uid, !!expr.isNew)}
                                    style={{
                                      width: 26, height: 26, borderRadius: 4, cursor: 'pointer',
                                      border: '1px solid #fecaca', background: '#fff0f0',
                                      color: '#ef4444',
                                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    }}
                                  >
                                    <FiTrash2 size={10} />
                                  </button>
                                </Tip>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                  )}
                </tbody>

                {/* Pied de tableau — résumé */}
                {expressions.length > 0 && (
                  <tfoot>
                    <tr style={{ background: '#f8fafc' }}>
                      <td colSpan={4} style={{  // ← 4 au lieu de 3
                        padding: '8px 12px', fontSize: 10, color: '#64748b', fontWeight: 600,
                        borderTop: '2px solid #e2e8f0',
                      }}>
                        {expressions.length} expression{expressions.length !== 1 ? 's' : ''}
                        {' '}· {activeExprs.length} active{activeExprs.length !== 1 ? 's' : ''}
                      </td>
                      <td colSpan={4} style={{ padding: '8px 12px', borderTop: '2px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 9, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.06em' }}>
                            Formule résultante :
                          </span>
                          <FormulaPreview exprs={expressions} />
                        </div>
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}

          {/* Footer tableau */}
          <div style={{
            padding: '10px 16px', background: '#f8fafc',
            borderTop: '1px solid #e2e8f0',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <button onClick={addExpression} style={S.btnAdd}>
              <FiPlus size={11} /> Ajouter une expression
            </button>

            {dirty && (
              <button onClick={handleSave} disabled={saving} style={S.btnPrimary}>
                <FiSave size={13} />
                {saving ? 'Enregistrement…' : 'Sauvegarder les modifications'}
              </button>
            )}
          </div>
        </div>

        <div ref={tableEndRef} />
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        * { box-sizing: border-box; }
        input:focus, select:focus { outline: 2px solid ${reportCfg.color} !important; outline-offset: -1px; }
      `}</style>
    </div>
  );
}