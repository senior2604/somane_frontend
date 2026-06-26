// src/features/financial-reports/pages/FinancialReportConfig.jsx
// Paramétrage avancé des états financiers SYSCOHADA
// ✅ Corrections : filtrage par rapport, opérateur actif sur 1ère expr, édition détaillée

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiSave, FiRefreshCw, FiPlus, FiTrash2,
  FiChevronDown, FiChevronRight, FiEye,
  FiCheck, FiX, FiAlertCircle,
  FiHash, FiZap, FiLayers, FiCode,
  FiArrowLeft, FiInfo,
} from 'react-icons/fi';
import { apiClient } from '../../../services/apiClient';
import LineDetailEditor from './Linedetaileditor'; // ← ajuste le chemin si besoin

// ── CONSTANTES ────────────────────────────────────────────────────────────────

const DATE_SCOPE_OPTIONS = [
  { value: 'opening_balance_debit',  label: 'Solde ouverture Débit',  col: 'Ouv.D',  color: '#1a6aab', letter: 'OD' },
  { value: 'opening_balance_credit', label: 'Solde ouverture Crédit', col: 'Ouv.C',  color: '#6b3fa0', letter: 'OC' },
  { value: 'period_move_debit',      label: 'Mouvement Débit',        col: 'Mvt.D',  color: '#1a7a4a', letter: 'MD' },
  { value: 'period_move_credit',     label: 'Mouvement Crédit',       col: 'Mvt.C',  color: '#7a4a1a', letter: 'MC' },
  { value: 'closing_balance_debit',  label: 'Solde clôture Débit',   col: 'Clôt.D', color: '#0f3d6e', letter: 'CD' },
  { value: 'closing_balance_credit', label: 'Solde clôture Crédit',  col: 'Clôt.C', color: '#3d0f6e', letter: 'CC' },
];

const SIGN_OPTIONS = [
  { value: 'positive', label: 'Actif / Charge',   badge: 'A', color: '#059669', hint: 'Ligne classée en Actif ou Charge' },
  { value: 'negative', label: 'Passif / Produit', badge: 'P', color: '#dc2626', hint: 'Ligne classée en Passif ou Produit' },
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
  { value: 'aggregate_lines', label: 'Agrégation de lignes',icon: FiLayers, hint: 'Ex: LINES:AZ+BK'  },
  { value: 'ratio',           label: 'Ratio / Formule',     icon: FiCode,   hint: 'Formule custom'   },
];

const LINE_TYPE_CONFIG = {
  header:  { label: 'Titre',   bg: '#1a3a5c', text: '#fff',    border: '#1a3a5c' },
  account: { label: 'Compte',  bg: '#dbeafe', text: '#1e40af', border: '#93c5fd' },
  formula: { label: 'Formule', bg: '#fef3c7', text: '#92400e', border: '#fcd34d' },
  total:   { label: 'Total',   bg: '#dcfce7', text: '#166534', border: '#86efac' },
};

// Ajouter avec les autres constantes
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
  reports:     '/financial-reports/financial-reports/',
  lines:       '/financial-reports/lines/',
  expressions: '/financial-reports/expressions/',
};

// ── HELPERS ────────────────────────────────────────────────────────────────────

function uid() { return '__new_' + Math.random().toString(36).slice(2); }

function scopeOpt(val) {
  return DATE_SCOPE_OPTIONS.find(o => o.value === val) || DATE_SCOPE_OPTIONS[4];
}

// ── COMPOSANT : BADGE SCOPE ────────────────────────────────────────────────────

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

// ── COMPOSANT : TOOLTIP ────────────────────────────────────────────────────────

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
          background: '#0f172a', color: '#e2e8f0',
          fontSize: 10, padding: '4px 8px', borderRadius: 4,
          whiteSpace: 'nowrap', zIndex: 9999, pointerEvents: 'none',
          boxShadow: '0 4px 12px rgba(0,0,0,.3)', lineHeight: 1.4,
        }}>
          {text}
        </span>
      )}
    </span>
  );
}

// ── COMPOSANT : FORMULA PREVIEW ──────────────────────────────────────────────

function FormulaPreview({ exprs }) {
  const active = [...(exprs || [])].filter(e => e.active).sort((a, b) => a.sequence - b.sequence);
  if (!active.length) return (
    <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: 10 }}>Aucune expression active</span>
  );
  return (
    <span style={{
      fontFamily: 'DM Mono, monospace', fontSize: 10, color: '#334155',
      display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center',
    }}>
      {active.map((e, i) => {
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
    </span>
  );
}

// ── COMPOSANT : EXPRESSION ROW ───────────────────────────────────────────────

function ExpressionRow({ expr, index, isFirst, lineId, onUpdate, onDelete }) {
  const isNew   = !!expr.isNew;
  const typeOpt = EXP_TYPE_OPTIONS.find(t => t.value === expr.expression_type) || EXP_TYPE_OPTIONS[0];
  const opOpt   = OPERATOR_OPTIONS.find(o => o.value === expr.operator) || OPERATOR_OPTIONS[0];
  const scOpt   = scopeOpt(expr.date_scope);
  const TypeIcon = typeOpt.icon;

  const upd = (field, val) => onUpdate(lineId, expr.id, field, val);

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '36px 36px 36px 1fr 90px 170px 28px 28px',
      gap: 4, alignItems: 'center',
      padding: '6px 10px',
      background: isNew ? '#eff6ff' : (index % 2 === 0 ? '#fafbfc' : '#fff'),
      borderBottom: '1px solid #f1f5f9',
      borderLeft: `3px solid ${isNew ? '#3b82f6' : scOpt.color}`,
    }}>

      {/* Séquence */}
      <input
        type="number" value={expr.sequence} step={10}
        onChange={e => upd('sequence', Number(e.target.value))}
        style={styles.numInput}
        title="Ordre d'évaluation"
      />

      {/* Opérateur — ACTIF dès la première expression */}
      <Tip 
        text={isFirst 
          ? "Opérateur d'initialisation : appliqué à la valeur brute de cette expression" 
          : "Opérateur de combinaison : appliqué au total accumulé"} 
        placement="top"
      >
        <select
          value={expr.operator}
          onChange={e => upd('operator', e.target.value)}
          style={{ 
            ...styles.sel, 
            width: 32, 
            fontWeight: 800, 
            color: opOpt.color, 
            fontSize: 14, 
            textAlign: 'center', 
            padding: '0 2px',
            background: isFirst ? '#f1f5f9' : '#fff',
            border: isFirst ? '1px dashed #cbd5e1' : '1px solid #e2e8f0'
          }}
          title={isFirst ? "Opérateur d'initialisation" : "Opérateur de combinaison"}
        >
          {OPERATOR_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.sym}</option>
          ))}
        </select>
      </Tip>

      {/* Type d'expression */}
      <Tip text={`${typeOpt.label} — ${typeOpt.hint}`}>
        <select
          value={expr.expression_type}
          onChange={e => upd('expression_type', e.target.value)}
          style={{ ...styles.sel, width: 32, padding: '0 2px', background: '#f8fafc' }}
        >
          {EXP_TYPE_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label.slice(0, 3)}</option>
          ))}
        </select>
      </Tip>

      {/* Formule / préfixes */}
      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
        <TypeIcon size={11} color="#64748b" style={{ flexShrink: 0 }} />
        <input
          type="text"
          value={expr.formula}
          onChange={e => upd('formula', e.target.value)}
          placeholder={typeOpt.hint}
          style={{ ...styles.inp, flex: 1, fontFamily: 'DM Mono, monospace', fontSize: 11 }}
        />
      </div>

      {/* Colonne cible (column_target) */}
{/* Colonne cible (column_target) */}
{(() => {
  const ctOpt = COLUMN_TARGET_OPTIONS.find(o => o.value === (expr.column_target || 'net'))
    || COLUMN_TARGET_OPTIONS[0];
  return (
    <Tip text={ctOpt.hint}>
      <select
        value={expr.column_target || 'net'}
        onChange={e => upd('column_target', e.target.value)}
        style={{
          ...styles.sel,
          fontSize: 10,
          fontWeight: 700,
          color: ctOpt.color,
          borderColor: ctOpt.color + '60',
          background: ctOpt.color + '10',
          padding: '2px 3px',
          width: '100%',           // ← Ajouté
          boxSizing: 'border-box', // ← Ajouté
        }}
      >
        {COLUMN_TARGET_OPTIONS.map(o => (
          <option key={o.value} value={o.value}>
            {o.badge} — {o.label}
          </option>
        ))}
      </select>
    </Tip>
  );
})()}

      {/* Colonne de balance (date_scope) */}
      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
        <ScopeBadge value={expr.date_scope} size="xs" />
        <select
          value={expr.date_scope}
          onChange={e => upd('date_scope', e.target.value)}
          style={{ ...styles.sel, flex: 1, fontSize: 10, padding: '2px 3px' }}
        >
          {DATE_SCOPE_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.col} — {o.label}</option>
          ))}
        </select>
      </div>

          
      {/* Toggle actif */}
      <button
        onClick={() => upd('active', !expr.active)}
        style={{
          width: 28, height: 26, borderRadius: 4,
          border: `1px solid ${expr.active ? '#86efac' : '#e2e8f0'}`,
          background: expr.active ? '#dcfce7' : '#f8fafc',
          cursor: 'pointer',
          color: expr.active ? '#16a34a' : '#94a3b8',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
        title={expr.active ? 'Désactiver' : 'Activer'}
      >
        {expr.active ? <FiCheck size={11} /> : <FiX size={11} />}
      </button>

      {/* Supprimer */}
      <button
        onClick={() => onDelete(lineId, expr.id, expr.isNew)}
        style={{
          width: 28, height: 26, borderRadius: 4,
          border: '1px solid #fecaca',
          background: '#fff0f0', cursor: 'pointer', color: '#ef4444',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
        title="Supprimer cette expression"
      >
        <FiTrash2 size={11} />
      </button>
    </div>
  );
}

// ── COMPOSANT : LINE CARD ─────────────────────────────────────────────────────

function LineCard({ line, exprs, isExpanded, onToggle, onAddExpr, onUpdateExpr, onDeleteExpr, onEdit }) {
  const sorted      = [...(exprs || [])].sort((a, b) => a.sequence - b.sequence);
  const cfg         = LINE_TYPE_CONFIG[line.line_type] || { label: line.line_type, bg: '#f1f5f9', text: '#475569', border: '#e2e8f0' };
  const activeExprs = sorted.filter(e => e.active);
  const lineSign = Number(line.sign) === 1 ? SIGN_OPTIONS[0] : SIGN_OPTIONS[1];

  return (
    <div style={{
      background: '#fff', borderRadius: 6,
      border: `1px solid ${isExpanded ? '#cbd5e1' : '#e2e8f0'}`,
      overflow: 'hidden', marginBottom: 3,
      boxShadow: isExpanded ? '0 2px 12px rgba(0,0,0,.07)' : 'none',
    }}>
      {/* Header */}
      <div
        onClick={onToggle}
        style={{
          display: 'grid',
          gridTemplateColumns: '28px 72px 1fr 90px 80px 80px 90px 28px', // ← +90px pour bouton Détail
          gap: 8, alignItems: 'center',
          padding: '7px 10px', cursor: 'pointer',
          background: isExpanded ? '#f8fafc' : '#fff',
          borderBottom: isExpanded ? '1px solid #e2e8f0' : 'none',
          userSelect: 'none',
        }}
      >
        <span style={{ color: '#94a3b8', display: 'flex', alignItems: 'center' }}>
          {isExpanded ? <FiChevronDown size={13} /> : <FiChevronRight size={13} />}
        </span>

        {/* Code */}
        <span style={{
          fontFamily: 'DM Mono, monospace', fontSize: 11, fontWeight: 700,
          background: '#1a3a5c', color: '#fff', padding: '2px 7px', borderRadius: 3,
          textAlign: 'center', letterSpacing: '.03em',
        }}>
          {line.code}
        </span>

        {/* Nom + formule preview */}
        <div style={{ minWidth: 0 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#0f172a' }}>{line.name}</span>
          {sorted.length > 0 && !isExpanded && (
            <div style={{ marginTop: 2 }}><FormulaPreview exprs={sorted} /></div>
          )}
        </div>

        {/* Type ligne */}
        <span style={{
          fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 10,
          background: cfg.bg, color: cfg.text, border: `1px solid ${cfg.border}`,
          textAlign: 'center', textTransform: 'uppercase', letterSpacing: '.04em', whiteSpace: 'nowrap',
        }}>
          {cfg.label}
        </span>

        {/* Signe = classification Actif/Passif */}
        <Tip text={lineSign.hint}>
          <span style={{
            fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 10,
            background: lineSign.color + '15', color: lineSign.color,
            border: `1px solid ${lineSign.color}40`,
            textAlign: 'center', whiteSpace: 'nowrap',
          }}>
            {lineSign.badge} {lineSign.label}
          </span>
        </Tip>

        {/* Compteur expressions */}
        <div style={{ textAlign: 'center' }}>
          <span style={{
            fontSize: 10,
            color: activeExprs.length > 0 ? '#16a34a' : '#94a3b8',
            fontWeight: activeExprs.length > 0 ? 700 : 400,
          }}>
            {activeExprs.length > 0 ? `✓ ${activeExprs.length} expr.` : '—'}
          </span>
        </div>

        {/* Bouton Voir & Modifier */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit?.(line);
          }}
          style={{
            padding: '2px 8px', borderRadius: 4, cursor: 'pointer',
            fontSize: 10, fontWeight: 600,
            border: '1px solid #93c5fd',
            background: '#eff6ff', color: '#1a6aab',
            display: 'inline-flex', alignItems: 'center', gap: 3,
          }}
          title="Voir et modifier cette ligne en détail"
        >
          <FiEye size={10} /> Détail
        </button>

        <span style={{ color: '#94a3b8', fontSize: 10, textAlign: 'right' }}>
          #{line.sequence}
        </span>
      </div>

      {/* Corps expressions */}
      {isExpanded && (
        <div>
          {/* En-têtes colonnes */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '36px 36px 36px 1fr 90px 170px 28px 28px',
            gap: 4, padding: '4px 10px',
            background: '#f1f5f9', borderBottom: '1px solid #e2e8f0',
          }}>
            {['Seq', 'Op', 'Type', 'Formule / Préfixes de comptes', 'Col. cible', 'Colonne de balance', '', ''].map((h, i) => (
              <span key={i} style={{
                fontSize: 9, color: '#64748b', fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '.06em',
              }}>{h}</span>
            ))}
          </div>

          {/* Expressions */}
          {sorted.length === 0 ? (
            <div style={{
              padding: '20px', textAlign: 'center',
              color: '#94a3b8', fontSize: 11, fontStyle: 'italic',
            }}>
              Aucune expression — utilisez « + Ajouter » pour commencer
            </div>
          ) : (
            sorted.map((expr, idx) => (
              <ExpressionRow
                key={expr.id || expr._uid}
                expr={expr}
                index={idx}
                isFirst={idx === 0}
                lineId={line.id}
                onUpdate={onUpdateExpr}
                onDelete={onDeleteExpr}
              />
            ))
          )}

          {/* Note explicative signe */}
          <div style={{
            padding: '6px 10px',
            background: '#fffbeb',
            borderTop: '1px dashed #fde68a',
            borderBottom: '1px dashed #e2e8f0',
            display: 'flex', alignItems: 'flex-start', gap: 6,
          }}>
            <FiInfo size={11} color="#92400e" style={{ flexShrink: 0, marginTop: 1 }} />
            <span style={{ fontSize: 10, color: '#78350f', lineHeight: 1.5 }}>
              <strong>Classification :</strong> cette ligne est {lineSign.label.toLowerCase()} (signe{' '}
              <code style={{ background: '#fef3c7', padding: '0 3px', borderRadius: 2 }}>
                {Number(line.sign) === 1 ? 'positive (+1)' : 'negative (−1)'}
              </code>
              ). Le signe détermine où la ligne apparaît dans l'état (Actif/Passif ou Charge/Produit).
              Il ne modifie pas les valeurs calculées — utilisez les <strong>opérateurs</strong> (+ − × ÷) 
              entre expressions pour composer votre calcul.
            </span>
          </div>

          {/* Footer */}
          <div style={{
            padding: '8px 10px', background: '#f8fafc',
            borderTop: '1px dashed #e2e8f0',
            display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
          }}>
            <button onClick={() => onAddExpr(line.id)} style={styles.btnAdd}>
              <FiPlus size={11} /> Ajouter expression
            </button>

            {sorted.length > 0 && (
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 9, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 3 }}>
                  Formule résultante :
                </div>
                <FormulaPreview exprs={sorted} />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── STYLES ────────────────────────────────────────────────────────────────────

const styles = {
  inp: {
    padding: '3px 6px', border: '1px solid #e2e8f0', borderRadius: 4,
    fontSize: 11, color: '#1e293b', outline: 'none', background: '#fff', height: 26,
  },
  sel: {
    padding: '3px 5px', border: '1px solid #e2e8f0', borderRadius: 4,
    fontSize: 11, color: '#1e293b', background: '#fff', height: 26, cursor: 'pointer',
  },
  numInput: {
    width: 32, padding: '2px 3px', border: '1px solid #e2e8f0', borderRadius: 4,
    fontSize: 10, textAlign: 'center', color: '#64748b', height: 26, background: '#f8fafc',
  },
  btnPrimary: {
    padding: '7px 14px', background: '#1a3a5c', color: '#fff',
    border: 'none', borderRadius: 5, cursor: 'pointer', fontSize: 12, fontWeight: 600,
    display: 'inline-flex', alignItems: 'center', gap: 5,
  },
  btnSecondary: {
    padding: '5px 10px', background: '#fff', color: '#475569',
    border: '1px solid #e2e8f0', borderRadius: 4, cursor: 'pointer',
    fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 4,
  },
  btnAdd: {
    padding: '4px 10px', background: '#eff6ff', color: '#1a6aab',
    border: '1px dashed #93c5fd', borderRadius: 4, cursor: 'pointer',
    fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 4,
  },
  btnSmall: {
    padding: '2px 8px', borderRadius: 3, cursor: 'pointer', fontSize: 10,
    display: 'inline-flex', alignItems: 'center', gap: 3, border: 'none',
  },
};

// ── COMPOSANT PRINCIPAL ───────────────────────────────────────────────────────

const REPORT_CONFIG = {
  balance_sheet: { label: 'Bilan',               color: '#1a3a5c', icon: '⚖️',  desc: 'Actif / Passif' },
  profit_loss:   { label: 'Compte de résultat',  color: '#1a5c3a', icon: '📈',  desc: 'Charges / Produits' },
  cash_flow:     { label: 'Flux de trésorerie',  color: '#3a1a5c', icon: '💸',  desc: 'TFT SYSCOHADA' },
  custom:        { label: 'Personnalisé',         color: '#5c3a1a', icon: '⚙️',  desc: 'Template libre' },
};

const TEMPLATE_CODES = ['BILAN_SYSCOHADA', 'CR_SYSCOHADA', 'TFT_SYSCOHADA'];

export default function FinancialReportConfig() {
  const navigate = useNavigate();

  // ── État global ───────────────────────────────────────────────────────────
  const [reports,           setReports]           = useState([]);
  const [selectedReport,    setSelectedReport]    = useState(null);
  const [lines,             setLines]             = useState([]);
  const [expressionsByLine, setExpressionsByLine] = useState({});
  const [expandedLines,     setExpandedLines]     = useState(new Set());
  const [loading,           setLoading]           = useState(false);
  const [saving,            setSaving]            = useState(false);
  const [toast,             setToast]             = useState(null);
  const [filterType,        setFilterType]        = useState('all');
  const [search,            setSearch]            = useState('');
  const [showHelp,          setShowHelp]          = useState(false);
  const [previewId,         setPreviewId]         = useState('');
  const [editingLine,       setEditingLine]       = useState(null); // ← NOUVEAU : ligne en édition détaillée

  // ── Toast ─────────────────────────────────────────────────────────────────
  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // ── Chargement des templates uniquement ──────────────────────────────────
  useEffect(() => {
    apiClient.get(API.reports).then(res => {
      const all = res.results || res;
      const templates = all.filter(r => {
        const hasPeriod  = r.period  !== null && r.period  !== undefined;
        const hasCompany = r.company !== null && r.company !== undefined;
        return !hasPeriod && !hasCompany && r.active;
      });
      setReports(templates);
    }).catch(() => {
      showToast('Erreur chargement des templates', 'error');
    });
  }, []);

  // ── Chargement lignes + expressions pour un rapport ───────────────────────
  const loadReportData = useCallback(async (report) => {
    if (!report) return;
    setLoading(true);
    try {
      let fetchedLines = [];

      if (Array.isArray(report.lines) && report.lines.length > 0) {
        const linesRes = await apiClient.get(API.lines, { params: { report: report.id } });
        const allLines = linesRes.results || linesRes;
        fetchedLines = allLines
          .filter(l => {
            const lineReportId = typeof l.report === 'object' ? l.report?.id : l.report;
            return lineReportId === report.id;
          })
          .sort((a, b) => a.sequence - b.sequence);

        if (fetchedLines.length === 0 && report.lines.length > 0) {
          fetchedLines = [...report.lines].sort((a, b) => a.sequence - b.sequence);
        }
      } else {
        const linesRes = await apiClient.get(API.lines, { params: { report: report.id } });
        const allLines = linesRes.results || linesRes;
        fetchedLines = allLines
          .filter(l => {
            const lineReportId = typeof l.report === 'object' ? l.report?.id : l.report;
            return lineReportId === report.id;
          })
          .sort((a, b) => a.sequence - b.sequence);
      }

      setLines(fetchedLines);
      setExpandedLines(new Set());

      const exprMap = {};
      const linesToFetchExprs = [];

      fetchedLines.forEach(line => {
        if (Array.isArray(line.expressions) && line.expressions.length > 0) {
          exprMap[line.id] = line.expressions
            .filter(e => {
              const exprLineId = typeof e.line === 'object' ? e.line?.id : e.line;
              return exprLineId === line.id;
            })
            .map(e => ({ ...e, _uid: e.id }));
        } else {
          exprMap[line.id] = [];
          linesToFetchExprs.push(line);
        }
      });

      if (linesToFetchExprs.length > 0) {
        const exprPromises = linesToFetchExprs.map(async (line) => {
          const res = await apiClient.get(API.expressions, { params: { line: line.id } });
          const exprs = res.results || res;
          return {
            lineId: line.id,
            exprs: exprs
              .filter(e => {
                const exprLineId = typeof e.line === 'object' ? e.line?.id : e.line;
                return exprLineId === line.id;
              })
              .map(e => ({ ...e, _uid: e.id })),
          };
        });
        const exprResults = await Promise.all(exprPromises);
        exprResults.forEach(({ lineId, exprs }) => {
          exprMap[lineId] = exprs;
        });
      }

      setExpressionsByLine(exprMap);
    } catch (err) {
      console.error('loadReportData error:', err);
      showToast('Erreur lors du chargement', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSelectReport = (report) => {
    setSelectedReport(report);
    setFilterType('all');
    setSearch('');
    loadReportData(report);
  };

  // ── CRUD expressions ──────────────────────────────────────────────────────
  const addExpression = (lineId) => {
    const existing = expressionsByLine[lineId] || [];
    const newExpr = {
      _uid: uid(), id: uid(),
      line: lineId,
      formula: '',
      date_scope: 'closing_balance_debit',
      sign: 'positive',
      sequence: existing.length * 10 + 10,
      operator: '+',
      expression_type: 'account_domain',
      column_target: 'net',  // ← ✅ AJOUTER CETTE LIGNE
      active: true,
      report: selectedReport.id,
      isNew: true,
    };
    setExpressionsByLine(prev => ({
      ...prev,
      [lineId]: [...(prev[lineId] || []), newExpr],
    }));
    setExpandedLines(prev => new Set(prev).add(lineId));
  };

  const updateExpression = (lineId, exprId, field, value) => {
    setExpressionsByLine(prev => ({
      ...prev,
      [lineId]: prev[lineId].map(e =>
        (e.id === exprId || e._uid === exprId) ? { ...e, [field]: value } : e
      ),
    }));
  };

  const deleteExpression = async (lineId, exprId, isNew) => {
    if (!isNew && !window.confirm('Supprimer cette expression définitivement ?')) return;
    if (!isNew) {
      try {
        await apiClient.delete(`${API.expressions}${exprId}/`);
      } catch {
        showToast('Erreur suppression', 'error');
        return;
      }
    }
    setExpressionsByLine(prev => ({
      ...prev,
      [lineId]: prev[lineId].filter(e => e.id !== exprId && e._uid !== exprId),
    }));
  };

  // ── Sauvegarde ────────────────────────────────────────────────────────────
  const saveAll = async () => {
    if (!selectedReport) return;
    setSaving(true);
    try {
      const promises = [];
      Object.values(expressionsByLine).flat().forEach(expr => {
        if (expr.isNew) {
          const { isNew, _uid, ...payload } = expr;
          payload.id = undefined;
          promises.push(apiClient.post(API.expressions, payload));
        } else {
          const { _uid, ...payload } = expr;
          promises.push(apiClient.patch(`${API.expressions}${expr.id}/`, payload));
        }
      });
      await Promise.all(promises);
      showToast('Modifications enregistrées avec succès ✓');
      loadReportData(selectedReport);
    } catch {
      showToast('Erreur lors de la sauvegarde', 'error');
    } finally {
      setSaving(false);
    }
  };

  // ── Preview ───────────────────────────────────────────────────────────────
  const handlePreview = async () => {
    if (!previewId || !selectedReport) return;
    try {
      await apiClient.get(`${API.reports}${selectedReport.id}/preview/`, {
        params: { import_id: previewId },
      });
      showToast('Prévisualisation disponible');
    } catch (err) {
      showToast(err.response?.data?.detail || 'Erreur preview', 'error');
    }
  };

  const toggleExpand  = (id) => setExpandedLines(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });
  const expandAll   = () => setExpandedLines(new Set(lines.map(l => l.id)));
  const collapseAll = () => setExpandedLines(new Set());

  // ── Filtres ───────────────────────────────────────────────────────────────
  const filteredLines = lines.filter(l => {
    const matchType   = filterType === 'all' || l.line_type === filterType;
    const matchSearch = !search ||
      l.name.toLowerCase().includes(search.toLowerCase()) ||
      l.code.toLowerCase().includes(search.toLowerCase());
    return matchType && matchSearch;
  });

  // ── Stats ─────────────────────────────────────────────────────────────────
  const totalExprs      = Object.values(expressionsByLine).reduce((s, a) => s + a.length, 0);
  const configuredLines = Object.values(expressionsByLine).filter(a => a.length > 0).length;
  const progressPct     = lines.length > 0 ? Math.round(configuredLines / lines.length * 100) : 0;
  const actifCount  = lines.filter(l => Number(l.sign) === 1).length;
  const passifCount = lines.filter(l => Number(l.sign) === -1).length;

  // ═════════════════════════════════════════════════════════════════════════
  // ÉCRAN SÉLECTION TEMPLATE
  // ═════════════════════════════════════════════════════════════════════════

  if (!selectedReport) {
    return (
      <div style={{ padding: 32, background: '#f8fafc', minHeight: '100vh' }}>
        <div style={{ maxWidth: 960, margin: '0 auto' }}>

          <div style={{ marginBottom: 32 }}>
            <div style={{
              fontSize: 10, fontWeight: 700, color: '#64748b',
              textTransform: 'uppercase', letterSpacing: '.12em', marginBottom: 6,
            }}>
              États Financiers SYSCOHADA Révisé
            </div>
            <h1 style={{ fontSize: 28, fontWeight: 700, color: '#0f172a', margin: 0, lineHeight: 1.2 }}>
              Paramétrage des templates de calcul
            </h1>
            <p style={{ fontSize: 13, color: '#64748b', marginTop: 8, maxWidth: 640 }}>
              Configurez les expressions de calcul de chaque ligne d'état financier.
              Chaque template (Bilan, CR, TFT) contient ses propres lignes — sélectionnez-en
              un pour voir et modifier uniquement ses lignes.
            </p>
          </div>

          {/* Rappel logique métier */}
          <div style={{
            background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8,
            padding: '12px 16px', marginBottom: 24,
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#92400e', marginBottom: 8 }}>
              ℹ️ Rappel — logique des expressions de calcul
            </div>
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
              <div style={{ fontSize: 11, color: '#78350f' }}>
                <strong>Expression</strong> = préfixes de comptes × colonne de balance
              </div>
              <div style={{ fontSize: 11, color: '#78350f' }}>
                <strong>Opérateur</strong> (+ − × ÷) = lien entre expressions d'une même ligne
              </div>
              <div style={{ fontSize: 11, color: '#78350f' }}>
                <strong>Signe ligne</strong> = classification Actif/Passif ou Charge/Produit
              </div>
            </div>
            <div style={{ fontSize: 10, color: '#92400e', marginTop: 8, fontStyle: 'italic' }}>
              Le signe d'une ligne ne modifie pas le calcul — il indique seulement où la valeur 
              apparaît dans l'état financier (côté actif ou passif du bilan).
            </div>
          </div>

          {/* Légende colonnes */}
          <div style={{
            background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8,
            padding: '10px 16px', marginBottom: 24,
            display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center',
          }}>
            <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Colonnes balance :</span>
            {DATE_SCOPE_OPTIONS.map(o => (
              <Tip key={o.value} text={o.label}>
                <ScopeBadge value={o.value} />
              </Tip>
            ))}
          </div>

          {/* Cards templates */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 16,
          }}>
            {reports.map(r => {
              const cfg    = REPORT_CONFIG[r.report_type] || REPORT_CONFIG.custom;
              const lCount = r.lines?.length || '?';
              return (
                <button
                  key={r.id}
                  onClick={() => handleSelectReport(r)}
                  style={{
                    background: '#fff', padding: 0, borderRadius: 10,
                    border: '1px solid #e2e8f0', cursor: 'pointer', textAlign: 'left',
                    overflow: 'hidden', transition: 'all .18s',
                    boxShadow: '0 1px 3px rgba(0,0,0,.06)',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,.12)';
                    e.currentTarget.style.borderColor = cfg.color;
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = '';
                    e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,.06)';
                    e.currentTarget.style.borderColor = '#e2e8f0';
                  }}
                >
                  <div style={{
                    background: cfg.color, padding: '16px',
                    display: 'flex', alignItems: 'center', gap: 12,
                  }}>
                    <span style={{ fontSize: 24 }}>{cfg.icon}</span>
                    <div>
                      <div style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>{r.name}</div>
                      <div style={{ color: 'rgba(255,255,255,.6)', fontSize: 10, marginTop: 2 }}>
                        {cfg.label} — {cfg.desc}
                      </div>
                    </div>
                  </div>
                  <div style={{
                    padding: '12px 16px',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  }}>
                    <span style={{ fontSize: 11, color: '#64748b' }}>
                      {lCount} lignes configurables
                    </span>
                    <span style={{
                      fontSize: 10, padding: '2px 8px', borderRadius: 10,
                      background: r.active ? '#dcfce7' : '#f1f5f9',
                      color: r.active ? '#16a34a' : '#94a3b8', fontWeight: 700,
                    }}>
                      {r.active ? '● ACTIF' : '○ INACTIF'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {reports.length === 0 && (
            <div style={{
              background: '#fff', borderRadius: 10, border: '1px dashed #cbd5e1',
              padding: 48, textAlign: 'center',
            }}>
              <FiAlertCircle size={28} color="#94a3b8" style={{ marginBottom: 12 }} />
              <div style={{ color: '#64748b', fontSize: 13, marginBottom: 10 }}>
                Aucun template trouvé. Chargez d'abord les templates SYSCOHADA :
              </div>
              <code style={{
                fontSize: 11, color: '#1a3a5c', background: '#f1f5f9',
                padding: '6px 12px', borderRadius: 4,
              }}>
                python manage.py load_syscohada_templates
              </code>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ═════════════════════════════════════════════════════════════════════════
  // ÉCRAN ÉDITION DÉTAILLÉE (LineDetailEditor)
  // ═════════════════════════════════════════════════════════════════════════

  if (editingLine) {
    return (
      <LineDetailEditor
        line={{
          ...editingLine,
          expressions: expressionsByLine[editingLine.id] || [],
        }}
        report={selectedReport}
        onClose={() => setEditingLine(null)}
        onSaved={() => {
          loadReportData(selectedReport);
          setEditingLine(null);
        }}
      />
    );
  }

  // ═════════════════════════════════════════════════════════════════════════
  // ÉCRAN CONFIGURATION (lignes du rapport sélectionné)
  // ═════════════════════════════════════════════════════════════════════════

  const reportCfg = REPORT_CONFIG[selectedReport.report_type] || REPORT_CONFIG.custom;

  return (
    <div style={{ background: '#f8fafc', minHeight: '100vh' }}>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 16, right: 16, zIndex: 1000,
          background: toast.type === 'error' ? '#fef2f2' : '#f0fdf4',
          border: `1px solid ${toast.type === 'error' ? '#fca5a5' : '#86efac'}`,
          color: toast.type === 'error' ? '#dc2626' : '#16a34a',
          padding: '10px 16px', borderRadius: 8, fontSize: 12, fontWeight: 600,
          display: 'flex', alignItems: 'center', gap: 8,
          boxShadow: '0 4px 20px rgba(0,0,0,.12)',
        }}>
          {toast.type === 'error' ? <FiAlertCircle size={14} /> : <FiCheck size={14} />}
          {toast.msg}
        </div>
      )}

      {/* Barre navigation */}
      <div style={{
        background: reportCfg.color, padding: '0 20px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        height: 52, position: 'sticky', top: 0, zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={() => setSelectedReport(null)}
            style={{
              background: 'rgba(255,255,255,.12)', border: '1px solid rgba(255,255,255,.2)',
              color: '#fff', padding: '4px 10px', borderRadius: 4, cursor: 'pointer',
              fontSize: 11, display: 'flex', alignItems: 'center', gap: 4,
            }}
          >
            <FiArrowLeft size={11} /> Retour
          </button>
          <div style={{ color: 'rgba(255,255,255,.4)', fontSize: 14 }}>|</div>
          <span style={{ fontSize: 16, marginRight: 4 }}>{reportCfg.icon}</span>
          <span style={{ color: '#fff', fontWeight: 700, fontSize: 13 }}>{selectedReport.name}</span>
          <span style={{
            background: 'rgba(255,255,255,.15)', color: 'rgba(255,255,255,.85)',
            fontSize: 10, padding: '2px 8px', borderRadius: 10,
          }}>
            {reportCfg.label}
          </span>
        </div>

        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Import ID pour preview…"
            value={previewId}
            onChange={e => setPreviewId(e.target.value)}
            style={{
              padding: '5px 10px', borderRadius: 4,
              border: '1px solid rgba(255,255,255,.2)',
              background: 'rgba(255,255,255,.1)', color: '#fff',
              fontSize: 11, width: 150,
            }}
          />
          <button onClick={handlePreview} style={{
            background: 'rgba(255,255,255,.12)', border: '1px solid rgba(255,255,255,.2)',
            color: '#fff', padding: '5px 10px', borderRadius: 4, cursor: 'pointer',
            fontSize: 11, display: 'flex', alignItems: 'center', gap: 4,
          }}>
            <FiEye size={12} /> Preview
          </button>

          <button onClick={() => loadReportData(selectedReport)} style={{
            background: 'rgba(255,255,255,.1)', border: '1px solid rgba(255,255,255,.2)',
            color: '#fff', width: 32, height: 32, borderRadius: 4, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <FiRefreshCw size={13} />
          </button>

          <button onClick={saveAll} disabled={saving} style={{
            background: saving ? 'rgba(255,255,255,.2)' : '#ffd700',
            color: saving ? '#fff' : '#1a3a5c',
            border: 'none', padding: '6px 16px', borderRadius: 5,
            cursor: saving ? 'not-allowed' : 'pointer',
            fontSize: 12, fontWeight: 700,
            display: 'flex', alignItems: 'center', gap: 5,
            opacity: saving ? .7 : 1,
          }}>
            <FiSave size={13} />
            {saving ? 'Enregistrement…' : 'Sauvegarder tout'}
          </button>
        </div>
      </div>

      {/* Barre stats */}
      <div style={{
        background: '#fff', borderBottom: '1px solid #e2e8f0',
        padding: '8px 20px', display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap',
      }}>
        <div style={{ fontSize: 11, color: '#64748b' }}>
          <span style={{ fontWeight: 700, color: '#0f172a' }}>{lines.length}</span> lignes
          <span style={{ color: '#94a3b8', margin: '0 4px' }}>dans ce template</span>
        </div>
        <div style={{ fontSize: 11, color: '#64748b' }}>
          <span style={{ fontWeight: 700, color: '#059669' }}>A: {actifCount}</span>
          {' '}actif
        </div>
        <div style={{ fontSize: 11, color: '#64748b' }}>
          <span style={{ fontWeight: 700, color: '#dc2626' }}>P: {passifCount}</span>
          {' '}passif
        </div>
        <div style={{ fontSize: 11, color: '#64748b' }}>
          <span style={{ fontWeight: 700, color: '#0f172a' }}>{configuredLines}</span> configurées
        </div>
        <div style={{ fontSize: 11, color: '#64748b' }}>
          <span style={{ fontWeight: 700, color: '#0f172a' }}>{totalExprs}</span> expressions
        </div>
        <div style={{ height: 16, width: 1, background: '#e2e8f0' }} />

        {/* Barre progression */}
        <div style={{ flex: 1, maxWidth: 220 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
            <span style={{ fontSize: 10, color: '#94a3b8' }}>Progression</span>
            <span style={{
              fontSize: 10, fontWeight: 700,
              color: progressPct === 100 ? '#16a34a' : reportCfg.color,
            }}>
              {progressPct}%
            </span>
          </div>
          <div style={{ background: '#f1f5f9', borderRadius: 4, height: 5 }}>
            <div style={{
              background: progressPct === 100 ? '#16a34a' : reportCfg.color,
              height: 5, borderRadius: 4,
              width: `${progressPct}%`, transition: 'width .4s ease',
            }} />
          </div>
        </div>

        {/* Légende colonnes */}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 5, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 10, color: '#94a3b8', marginRight: 2 }}>Colonnes :</span>
          {DATE_SCOPE_OPTIONS.map(o => (
            <Tip key={o.value} text={`${o.letter} = ${o.label}`}>
              <ScopeBadge value={o.value} size="xs" />
            </Tip>
          ))}
        </div>
      </div>

      {/* Aide */}
      <div style={{ background: '#fffbeb', borderBottom: '1px solid #fde68a', padding: '6px 20px' }}>
        <button
          onClick={() => setShowHelp(o => !o)}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 11, color: '#92400e',
            display: 'flex', alignItems: 'center', gap: 5,
          }}
        >
          <FiInfo size={12} />
          {showHelp ? '▲' : '▼'} Guide des expressions de calcul
        </button>
        {showHelp && (
          <div style={{
            marginTop: 8, paddingBottom: 8,
            display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12,
          }}>
            <div style={{
              background: '#fff', borderRadius: 6, padding: '10px 12px',
              border: '1px solid #fde68a',
            }}>
              <div style={{ fontWeight: 700, fontSize: 11, color: '#92400e', marginBottom: 6 }}>
                📋 Types d'expression
              </div>
              {EXP_TYPE_OPTIONS.map(o => {
                const Icon = o.icon;
                return (
                  <div key={o.value} style={{ fontSize: 10, color: '#78350f', marginBottom: 4, display: 'flex', gap: 6 }}>
                    <Icon size={10} style={{ flexShrink: 0, marginTop: 1 }} />
                    <span><strong>{o.label}</strong> — {o.hint}</span>
                  </div>
                );
              })}
            </div>
            <div style={{
              background: '#fff', borderRadius: 6, padding: '10px 12px',
              border: '1px solid #fde68a',
            }}>
              <div style={{ fontWeight: 700, fontSize: 11, color: '#92400e', marginBottom: 6 }}>
                🔢 Colonnes de balance
              </div>
              {DATE_SCOPE_OPTIONS.map(o => (
                <div key={o.value} style={{ fontSize: 10, color: '#78350f', marginBottom: 3, display: 'flex', gap: 6, alignItems: 'center' }}>
                  <ScopeBadge value={o.value} size="xs" />
                  <span>{o.label}</span>
                </div>
              ))}
            </div>
            <div style={{
              background: '#fff', borderRadius: 6, padding: '10px 12px',
              border: '1px solid #fde68a',
            }}>
              <div style={{ fontWeight: 700, fontSize: 11, color: '#92400e', marginBottom: 6 }}>
                ⚙️ Logique de calcul
              </div>
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: '#374151', lineHeight: 1.8 }}>
                <div><strong>Expr 1</strong> : préfixes <code style={{ background: '#f1f5f9', padding: '0 3px', borderRadius: 2 }}>24</code> → Clôt.D</div>
                <div><strong>Expr 2</strong> : <span style={{ color: '#dc2626', fontWeight: 700 }}>−</span> préfixes <code style={{ background: '#f1f5f9', padding: '0 3px', borderRadius: 2 }}>245,2495</code> → Clôt.D</div>
                <div style={{ marginTop: 4, color: '#6b7280', fontSize: 9 }}>
                  = SOMME(comptes 24*) − SOMME(245* + 2495*)<br />
                  Résultat : valeur nette du matériel
                </div>
              </div>
              <div style={{ marginTop: 8, fontSize: 10, color: '#78350f' }}>
                <strong>Signe de la ligne</strong> → classifie en Actif ou Passif, ne modifie pas le calcul.
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Toolbar filtres */}
      <div style={{
        background: '#fff', borderBottom: '1px solid #e2e8f0',
        padding: '8px 20px', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap',
      }}>
        <input
          type="text"
          placeholder="Rechercher code ou libellé…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ ...styles.inp, width: 240 }}
        />
        <div style={{ height: 20, width: 1, background: '#e2e8f0' }} />
        {[
          { key: 'all',     label: 'Tout'    },
          { key: 'account', label: 'Compte'  },
          { key: 'formula', label: 'Formule' },
          { key: 'total',   label: 'Total'   },
          { key: 'header',  label: 'Titre'   },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setFilterType(f.key)}
            style={{
              padding: '4px 12px', borderRadius: 4, border: '1px solid',
              fontSize: 11, cursor: 'pointer',
              fontWeight: filterType === f.key ? 700 : 400,
              background:   filterType === f.key ? reportCfg.color : '#fff',
              color:        filterType === f.key ? '#fff' : '#64748b',
              borderColor:  filterType === f.key ? reportCfg.color : '#e2e8f0',
            }}
          >
            {f.label}
            {f.key !== 'all' && (
              <span style={{ marginLeft: 4, opacity: .6 }}>
                ({lines.filter(l => l.line_type === f.key).length})
              </span>
            )}
          </button>
        ))}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          <button onClick={expandAll}   style={styles.btnSecondary}><FiChevronDown  size={11} /> Tout ouvrir</button>
          <button onClick={collapseAll} style={styles.btnSecondary}><FiChevronRight size={11} /> Tout fermer</button>
        </div>
      </div>

      {/* Liste des lignes */}
      <div style={{ padding: '14px 20px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8' }}>
            <FiRefreshCw size={20} style={{ animation: 'spin 1s linear infinite', marginBottom: 10 }} />
            <div style={{ fontSize: 13 }}>Chargement des lignes…</div>
          </div>
        ) : (
          <>
            {(search || filterType !== 'all') && (
              <div style={{
                fontSize: 11, color: '#64748b', marginBottom: 10,
                padding: '6px 10px', background: '#f8fafc', borderRadius: 4,
                border: '1px solid #e2e8f0',
              }}>
                {filteredLines.length} ligne{filteredLines.length !== 1 ? 's' : ''} sur {lines.length}
                {filterType !== 'all' && ` (filtre : ${filterType})`}
                {search && ` (recherche : "${search}")`}
                {' — '}
                <button
                  onClick={() => { setFilterType('all'); setSearch(''); }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#1a6aab', fontSize: 11, padding: 0 }}
                >
                  Effacer les filtres
                </button>
              </div>
            )}

            {filteredLines.length === 0 && (
              <div style={{
                textAlign: 'center', padding: 40,
                color: '#94a3b8', fontSize: 13, fontStyle: 'italic',
              }}>
                Aucune ligne ne correspond.
              </div>
            )}

            {filteredLines.map(line => (
              <LineCard
                key={line.id}
                line={line}
                exprs={expressionsByLine[line.id]}
                isExpanded={expandedLines.has(line.id)}
                onToggle={() => toggleExpand(line.id)}
                onAddExpr={addExpression}
                onUpdateExpr={updateExpression}
                onDeleteExpr={deleteExpression}
                onEdit={(line) => setEditingLine(line)}  // ← NOUVEAU
              />
            ))}
          </>
        )}
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        input:focus, select:focus { outline: 2px solid ${reportCfg.color} !important; outline-offset: -1px; }
        * { box-sizing: border-box; }
      `}</style>
    </div>
  );
}