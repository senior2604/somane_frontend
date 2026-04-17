// src/features/financial-reports/pages/import/[id].jsx
import { useCallback, useEffect, useRef, useState, memo } from 'react';
import {
  FiAlertCircle, FiArrowLeft, FiCheckCircle, FiRefreshCw,
  FiAlertTriangle, FiUpload, FiShield, FiInfo,
} from 'react-icons/fi';
import { useNavigate, useParams } from 'react-router-dom';
import { apiClient } from '../../../../services/apiClient';

// ============================================================================
// UTILITAIRES DE FORMATAGE
// ============================================================================

function formatNumberDisplay(value) {
  if (value == null || value === '') return '';
  const cleaned = String(value).trim().replace(',', '.');
  const num = parseFloat(cleaned);
  if (isNaN(num)) return String(value);
  if (Number.isInteger(num))
    return num.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  return num.toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 2 })
            .replace(/[.,]00$/, '');
}

function formatNumberForEdit(value) {
  if (value == null || value === '') return '';
  const num = parseFloat(String(value).replace(',', '.'));
  if (isNaN(num)) return String(value);
  if (Number.isInteger(num)) return String(num);
  return num.toFixed(2).replace(/\.?0+$/, '').replace('.', ',');
}

function parseNumberForSave(value) {
  if (value == null || value === '') return 0;
  const num = parseFloat(String(value).replace(/\s/g, '').replace(',', '.'));
  return isNaN(num) ? 0 : num;
}

// ============================================================================
// AFFICHAGE DES ERREURS — badges R1 / R2 / R3 / R4 / R5 / R6 / ERR
// ============================================================================

const BADGE_CONFIG = {
  prefixe:          { label: 'R1', bg: 'bg-orange-100', text: 'text-orange-700' },
  intangibilite:    { label: 'R2', bg: 'bg-red-100',    text: 'text-red-700' },
  solde_unique:     { label: 'R3', bg: 'bg-yellow-100', text: 'text-yellow-700' },
  equilibre_global: { label: 'R4', bg: 'bg-pink-100',   text: 'text-pink-700' },
  resultat_ouverture: { label: 'R5', bg: 'bg-purple-100', text: 'text-purple-700' },
  equilibre_ligne:  { label: 'R6', bg: 'bg-blue-100',   text: 'text-blue-700' },
  error:            { label: 'ERR', bg: 'bg-gray-100',  text: 'text-gray-600' },
};

function ErrorCell({ errorDetails }) {
  if (!errorDetails) 
    return <span className="text-gray-400 text-xs">—</span>;

  let details = errorDetails;

  // Si c'est une string JSON
  if (typeof details === 'string') {
    try { 
      details = JSON.parse(details); 
    } catch {
      return <span className="text-red-600 text-xs">{details}</span>;
    }
  }

  // Si c'est un objet vide ou invalide
  if (!details || typeof details !== 'object' || Object.keys(details).length === 0) {
    return <span className="text-gray-400 text-xs">—</span>;
  }

  const parts = Object.entries(BADGE_CONFIG)
    .filter(([key]) => details[key] != null && details[key] !== '')  // ignorer les valeurs vides
    .map(([key, cfg]) => (
      <div key={key} className="flex items-start gap-1.5 mb-1 last:mb-0">
        <span className={`shrink-0 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ${cfg.bg} ${cfg.text}`}>
          {cfg.label}
        </span>
        <span className={`${cfg.text} text-xs leading-snug`}>{details[key]}</span>
      </div>
    ));

  return parts.length > 0 
    ? <div>{parts}</div> 
    : <span className="text-gray-400 text-xs">—</span>;
}

// ============================================================================
// ExcelCell (mémorisé)
// ============================================================================

const ExcelCell = memo(({
  line, field, lineIndex, fieldIndex,
  type = 'text', align = 'left', maxWidth,
  isActive, isSaving, editValue,
  onEditChange, onBlur, onKeyDown, onClick,
}) => {
  const inputRef = useRef(null);
  useEffect(() => { if (isActive && inputRef.current) inputRef.current.focus(); }, [isActive]);

  const value = line[field];
  const displayValue = type === 'number' ? formatNumberDisplay(value) : (value ?? '');
  const base = `px-4 py-2.5 border-r border-b border-gray-300 transition-all cursor-cell select-none
    ${align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left'}`;

  if (isActive) return (
    <td className={`${base} ring-2 ring-blue-500 ring-inset bg-white z-10`}
        style={maxWidth ? { maxWidth, minWidth: maxWidth } : undefined}>
      <input
        ref={inputRef}
        type="text"
        inputMode={type === 'number' ? 'decimal' : 'text'}
        value={editValue}
        onChange={e => {
          let v = e.target.value;
          if (type === 'number') {
            v = v.replace(',', '.');
            if (/^-?[\d.]*$/.test(v) || v === '') onEditChange(v);
          } else onEditChange(v);
        }}
        onBlur={onBlur}
        onKeyDown={e => onKeyDown(e, line.id, field, lineIndex, fieldIndex)}
        className={`w-full h-full bg-transparent outline-none ${align === 'right' ? 'text-right' : ''}`}
        autoComplete="off" spellCheck="false" autoFocus
      />
    </td>
  );

  return (
    <td
      className={`${base} ${isSaving ? 'bg-yellow-50 animate-pulse' : 'hover:bg-blue-50'}`}
      style={maxWidth ? { maxWidth, minWidth: maxWidth } : undefined}
      onClick={() => onClick(line.id, field, value)}
      title={value ? String(value) : 'Cliquez pour éditer'}
    >
      <div className={`min-h-[24px] truncate whitespace-nowrap overflow-hidden
        ${align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : ''}`}>
        {displayValue}
      </div>
    </td>
  );
});

// ============================================================================
// COMPOSANT PRINCIPAL
// ============================================================================

export default function ImportDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [importData, setImportData]         = useState(null);
  const [stagingLines, setStagingLines]     = useState([]);
  const [loading, setLoading]               = useState(true);
  const [error, setError]                   = useState(null);
  const [processing, setProcessing]         = useState(false);
  const [checking, setChecking]             = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [checkResult, setCheckResult]       = useState(null);

  const [activeCell, setActiveCell] = useState(null);
  const [editValue, setEditValue]   = useState('');
  const [savingCell, setSavingCell] = useState(null);
  const [bilanData, setBilanData] = useState(null);
  const [loadingBilan, setLoadingBilan] = useState(false);
  const isEditingRef = useRef(false);

  // ── Chargement ──────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const importRes = await apiClient.get(`financial-reports/raw-imports/${id}/`);
      setImportData(importRes);

      let lines = [];
      try {
        const r = await apiClient.get(`financial-reports/raw-imports/${id}/staging_lines/`);
        lines = r.results || r || [];
      } catch {
        const r = await apiClient.get('financial-reports/staging/', {
          params: { import_run: id, ordering: 'account_code' },
        });
        lines = r.results || r || [];
      }
      setStagingLines(Array.from(new Map(lines.map(l => [l.id, l])).values()));
    } catch {
      setError('Impossible de charger les détails');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Colonnes numériques & totaux ──────────────────────────────────────────
  const NUMERIC = [
    'opening_debit', 'opening_credit',
    'movement_debit', 'movement_credit',
    'closing_debit', 'closing_credit',
  ];
  const FIELDS = ['account_code', 'account_label', ...NUMERIC];

  const totals = NUMERIC.reduce((acc, field) => {
    acc[field] = stagingLines.reduce((sum, l) => sum + (parseFloat(l[field]) || 0), 0);
    return acc;
  }, {});

  // Déséquilibre ouverture (R4) — affiché dans le footer
  const desequilibreOuverture = Math.abs(totals.opening_debit - totals.opening_credit);
  const desequilibreCloture   = Math.abs(totals.closing_debit - totals.closing_credit);

  // ── Cellules ─────────────────────────────────────────────────────────────
  const handleCellClick = (lineId, field, val) => {
    if (isEditingRef.current) return;
    setActiveCell({ lineId, field });
    setEditValue(NUMERIC.includes(field) ? formatNumberForEdit(val) : (val ?? ''));
    isEditingRef.current = true;
  };

const saveCell = async (lineId, field, newVal, oldVal) => {
  const line = stagingLines.find(l => l.id === lineId);
  if (!line) return;

  const toSave = NUMERIC.includes(field) 
    ? parseNumberForSave(newVal) 
    : newVal;

  const orig = NUMERIC.includes(field) 
    ? (oldVal ?? 0) 
    : oldVal;

  if (toSave === orig) return;

  setSavingCell({ lineId, field });

  try {
    // ── Toujours passer par update_line pour avoir les vérifications R1/R3/R5/R6
    const resp = await apiClient.patch(
      `financial-reports/staging/${lineId}/update_line/`,
      { [field]: toSave }
    );

    setStagingLines(prev => 
      prev.map(l => l.id === lineId ? { ...l, ...resp } : l)
    );

    setSuccessMessage('Cellule mise à jour');

    setTimeout(async () => {
      try {
        const r = await apiClient.get(`financial-reports/raw-imports/${id}/staging_lines/`);
        const lines = r.results || r || [];
        setStagingLines(Array.from(new Map(lines.map(l => [l.id, l])).values()));
      } catch {
        await fetchData();
      }
      setSuccessMessage('');
    }, 400);

  } catch (err) {
    console.error(err);
    setError(`Erreur : ${err.response?.data?.detail || err.message || 'Erreur inconnue'}`);
    await fetchData();
  } finally {
    setSavingCell(null);
  }
};

  const exitEditMode = (save = true) => {
    if (!activeCell) return;
    const { lineId, field } = activeCell;
    const line = stagingLines.find(l => l.id === lineId);
    if (save && line) saveCell(lineId, field, editValue, line[field]);
    setActiveCell(null); setEditValue(''); isEditingRef.current = false;
  };

  const handleKeyDown = (e, lineId, field, li, fi) => {
    if (e.key === 'Enter')  { e.preventDefault(); exitEditMode(true); }
    else if (e.key === 'Escape') { e.preventDefault(); exitEditMode(false); }
    else if (e.key === 'Tab') {
      e.preventDefault(); exitEditMode(true);
      const nfi = (fi + 1) % FIELDS.length;
      const nli = nfi === 0 ? li + 1 : li;
      if (nli < stagingLines.length) {
        const nl = stagingLines[nli];
        setTimeout(() => handleCellClick(nl.id, FIELDS[nfi], nl[FIELDS[nfi]]), 50);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault(); exitEditMode(true);
      if (li < stagingLines.length - 1) {
        const nl = stagingLines[li + 1];
        setTimeout(() => handleCellClick(nl.id, field, nl[field]), 50);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault(); exitEditMode(true);
      if (li > 0) {
        const pl = stagingLines[li - 1];
        setTimeout(() => handleCellClick(pl.id, field, pl[field]), 50);
      }
    }
  };

  // ── Actions ────────────────────────────────────────────────────────────── bilan
  const handleValidateImport = async () => {
    if (!window.confirm("Valider cet import ?")) return;
    setProcessing(true); setError(null);
    try {
      const r = await apiClient.post(`financial-reports/raw-imports/${id}/validate/`);
      setSuccessMessage(r.detail || 'Import validé avec succès !');
      await fetchData();
    } catch (err) {
      const data = err.response?.data;
      setError(data?.detail || err.message || 'Erreur de validation');
      if (data?.opening_balance_warning) await fetchData();
    } finally { setProcessing(false); }
  };

  const handleReprocess = async () => {
    if (!window.confirm("Re-traiter ce fichier ? Les anciennes lignes seront supprimées.")) return;
    setProcessing(true); setError(null);
    try {
      const r = await apiClient.post(`financial-reports/raw-imports/${id}/reprocess/`);
      setSuccessMessage(r.detail || 'Fichier retraité avec succès !');
      setCheckResult(null);
      await fetchData();
    } catch (err) {
      setError(`Erreur : ${err.response?.data?.detail || err.message}`);
    } finally { setProcessing(false); }
  };

  const handleCheckIntangibility = async () => {
    setChecking(true); setError(null); setCheckResult(null);
    try {
      const r = await apiClient.post(`financial-reports/raw-imports/${id}/check_intangibility/`);
      setCheckResult(r);
      setSuccessMessage(r.detail || 'Vérification terminée');
      setTimeout(() => setSuccessMessage(''), 5000);
      await fetchData();
    } catch (err) {
      setError(`Erreur : ${err.response?.data?.detail || err.message}`);
    } finally { setChecking(false); }
  };

    const handleLoadBilan = async () => {
    if (!importData || importData.state !== 'validated') {
      setError("Le Bilan n'est disponible que pour les imports validés.");
      return;
    }

    setLoadingBilan(true);
    setError(null);

    try {
      const response = await apiClient.get(`financial-reports/raw-imports/${id}/bilan/`);
      setBilanData(response);
      setSuccessMessage("Bilan chargé avec succès");
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || "Impossible de charger le Bilan");
    } finally {
      setLoadingBilan(false);
    }
  };

  const handleGoImportN1 = () => {
    navigate('/financial-reports/import', {
      state: {
        prefillPeriod: importData?.period,
        n1Warning:     true,
        fromImportId:  id,
      }
    });
  };

  // ── Stats ─────────────────────────────────────────────────────────────────
  const stats = {
    total:     stagingLines.length,
    validated: stagingLines.filter(l => l.validation_status === 'validated').length,
    pending:   stagingLines.filter(l => l.validation_status === 'pending').length,
    error:     stagingLines.filter(l => l.validation_status === 'error').length,
  };

  const hasErrors   = stats.error > 0;
  const hasWarning  = importData?.opening_balance_warning === true;
  const canValidate = !processing && 
                      !hasErrors && 
                      !hasWarning && 
                      stagingLines.length > 0 &&
                      (stats.pending === 0 || stats.error === 0); // ← changer ici

  // ── Render ────────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600" />
    </div>
  );

  if (error && !importData) return (
    <div className="p-8 text-center">
      <p className="text-red-600 text-xl mb-4">{error}</p>
      <button onClick={() => navigate('/financial-reports/import')}
        className="px-6 py-3 bg-violet-600 text-white rounded-lg">
        Retour aux imports
      </button>
    </div>
  );

  return (
    <div className="p-6 max-w-full bg-gray-50 min-h-screen">

      {/* ── Messages globaux ────────────────────────────────────────────── */}
      {successMessage && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 flex items-center gap-3">
          <FiCheckCircle size={18} /> {successMessage}
          <button onClick={() => setSuccessMessage('')} className="ml-auto text-lg">×</button>
        </div>
      )}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-center gap-3">
          <FiAlertCircle size={18} /> {error}
          <button onClick={() => setError(null)} className="ml-auto text-lg">×</button>
        </div>
      )}

      {/* ── Résultat vérification ────────────────────────────────────────── */}
      {checkResult && (
        <div className={`mb-4 p-4 rounded-lg border flex items-start gap-3 ${
          checkResult.skipped          ? 'bg-blue-50 border-blue-200 text-blue-800' :
          checkResult.errors_count > 0 ? 'bg-red-50 border-red-200 text-red-800' :
          'bg-green-50 border-green-200 text-green-800'
        }`}>
          {checkResult.skipped
            ? <FiInfo size={17} className="mt-0.5 shrink-0" />
            : checkResult.errors_count > 0
            ? <FiAlertTriangle size={17} className="mt-0.5 shrink-0" />
            : <FiCheckCircle size={17} className="mt-0.5 shrink-0" />}
          <div className="flex-1">
            <p className="font-semibold text-sm">{checkResult.detail}</p>
            {!checkResult.skipped && (
              <p className="text-xs mt-1 opacity-75">
                {checkResult.checked} compte(s) vérifiés — {checkResult.ok} OK — {checkResult.errors_count} erreur(s)
                {checkResult.reference_import_name && ` — N-1 : « ${checkResult.reference_import_name} »`}
              </p>
            )}
          </div>
          <button onClick={() => setCheckResult(null)} className="text-lg leading-none opacity-50 hover:opacity-100">×</button>
        </div>
      )}

      {/* ══ BANDEAU OPENING BALANCE WARNING ════════════════════════════════ */}
      {hasWarning && (
        <div className="mb-4 rounded-xl border-2 border-amber-300 bg-amber-50 overflow-hidden shadow-sm">
          <div className="flex items-center gap-3 px-5 py-3 bg-amber-100 border-b border-amber-200">
            <div className="w-8 h-8 rounded-lg bg-amber-200 flex items-center justify-center shrink-0">
              <FiAlertTriangle size={16} className="text-amber-700" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-sm text-amber-900">
                Soldes d'ouverture non nuls — balance N-1 requise
              </p>
              <p className="text-xs text-amber-700 mt-0.5">La validation est bloquée jusqu'à résolution</p>
            </div>
            <span className="px-3 py-1 bg-amber-200 text-amber-800 rounded-full text-xs font-bold">
              Action requise
            </span>
          </div>
          <div className="px-5 py-4 space-y-3">
            <p className="text-sm text-amber-800 leading-relaxed">
              Vos soldes d'ouverture des comptes de bilan (classes 1 à 5) ne sont <strong>pas tous à zéro</strong>.
              Cela indique que cette balance n'est probablement <strong>pas votre première balance</strong>.
            </p>
            <div className="bg-white border border-amber-200 rounded-lg p-4 space-y-2">
              <p className="text-xs font-bold text-amber-900 uppercase tracking-wide mb-3">Comment résoudre ?</p>
              {[
                { num: '1', text: `Importez la balance de l'exercice précédent dans la même période « ${importData?.period?.code || importData?.period || '—'} »` },
                { num: '2', text: "Cochez « Balance de référence N-1 » lors de l'import — ses soldes de clôture serviront de référence" },
                { num: '3', text: "Revenez sur cet import et cliquez sur « Vérifier N-1 » — la vérification d'intangibilité s'effectuera automatiquement" },
              ].map(step => (
                <div key={step.num} className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-amber-100 border border-amber-300 flex items-center justify-center shrink-0 text-xs font-bold text-amber-700">
                    {step.num}
                  </span>
                  <p className="text-sm text-amber-800 leading-snug">{step.text}</p>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-3 pt-1">
              <button onClick={handleGoImportN1}
                className="flex items-center gap-2 px-5 py-2.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 text-sm font-semibold transition-colors shadow-sm">
                <FiUpload size={15} /> Importer la balance N-1
              </button>
              <button onClick={handleCheckIntangibility} disabled={checking}
                className="flex items-center gap-2 px-4 py-2.5 bg-white border border-amber-300 text-amber-700 rounded-lg hover:bg-amber-50 text-sm font-medium transition-colors disabled:opacity-50">
                <FiShield size={14} className={checking ? 'animate-pulse' : ''} />
                {checking ? 'Vérification…' : 'Re-vérifier (si N-1 importé)'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── En-tête ──────────────────────────────────────────────────────── */}
      <div className="bg-white p-6 rounded-lg shadow-sm mb-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/financial-reports/import')}
              className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg">
              <FiArrowLeft size={22} />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{importData.name}</h1>
              <p className="text-gray-500 text-sm mt-1">
                {new Date(importData.import_date).toLocaleString('fr-FR')} •
                Source : {importData.data_source?.name || '—'} •
                Période : {importData.period?.name || importData.period || '—'}
                {importData.is_reference_balance && (
                  <span className="ml-2 px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded text-xs font-semibold">
                    Balance N-1 de référence
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap justify-end">
            <span className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 ${
              importData.state === 'processed' ? 'bg-green-100 text-green-800' :
              importData.state === 'validated' ? 'bg-blue-100 text-blue-800' :
              importData.state === 'error'     ? 'bg-red-100 text-red-800' :
              'bg-yellow-100 text-yellow-800'
            }`}>
              {importData.state === 'draft'     ? 'Brouillon' :
               importData.state === 'validated' ? 'Validé' :
               importData.state === 'processed' ? 'Traité' : 'Erreur'}
              {importData.state === 'processed' && <FiCheckCircle size={13} />}
              {importData.state === 'error'     && <FiAlertCircle size={13} />}
            </span>

            {importData.state !== 'validated' && (
              <button onClick={handleCheckIntangibility} disabled={checking || processing}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 text-sm font-medium">
                <FiShield size={14} className={checking ? 'animate-pulse' : ''} />
                {checking ? 'Vérification…' : 'Vérifier N-1'}
              </button>
            )}

            {importData.state === 'error' && (
              <button onClick={handleReprocess} disabled={processing}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm">
                <FiRefreshCw size={14} className={processing ? 'animate-spin' : ''} />
                Re-traiter
              </button>
            )}

            {(importData.state === 'processed' || importData.state === 'draft') && (
              <button onClick={handleValidateImport} disabled={!canValidate}
                title={
                  hasWarning ? 'Importez la balance N-1 avant de valider' :
                  hasErrors  ? `${stats.error} erreur(s) à corriger avant validation` :
                  stagingLines.length === 0 ? 'Aucune ligne importée' : ''
                }
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium">
                <FiCheckCircle size={14} />
                {processing ? 'Validation…' : "Valider l'import"}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Statistiques ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Lignes importées', value: stats.total,     color: 'text-gray-900' },
          { label: 'Validées',         value: stats.validated, color: 'text-green-600' },
          { label: 'En attente',       value: stats.pending,   color: 'text-yellow-600' },
          { label: 'Erreurs',          value: stats.error,     color: 'text-red-600' },
        ].map(st => (
          <div key={st.label} className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
            <div className="text-xs text-gray-500 mb-1">{st.label}</div>
            <div className={`text-2xl font-bold ${st.color}`}>{st.value}</div>
          </div>
        ))}
      </div>

      {/* ── Tableau Excel ─────────────────────────────────────────────────── */}
      <div className="bg-white rounded-lg shadow-lg border border-gray-300 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">

            {/* ── En-tête ─────────────────────────────────────────────── */}
            <thead>
              <tr className="bg-gradient-to-b from-gray-100 to-gray-200 border-b-2 border-gray-400">
                {[
                  { label: 'Code compte',  align: 'left',   sticky: true },
                  { label: 'Libellé',      align: 'left',   w: 100 },
                  { label: 'Ouv. Débit',   align: 'right',  w: 110 },
                  { label: 'Ouv. Crédit',  align: 'right',  w: 110 },
                  { label: 'Mvt Débit',    align: 'right',  w: 110 },
                  { label: 'Mvt Crédit',   align: 'right',  w: 110 },
                  { label: 'Clôt. Débit',  align: 'right',  w: 110 },
                  { label: 'Clôt. Crédit', align: 'right',  w: 110 },
                  { label: 'Statut',       align: 'center', w: 100 },
                  { label: 'Erreurs',      align: 'left',   w: 260 },
                ].map((h, i) => (
                  <th key={i}
                    className={`px-4 py-3 text-xs font-bold text-gray-700 border-r border-gray-300
                      ${h.align === 'right' ? 'text-right' : h.align === 'center' ? 'text-center' : 'text-left'}
                      ${h.sticky ? 'sticky left-0 bg-gradient-to-b from-gray-100 to-gray-200 z-20' : ''}
                    `}
                    style={h.w ? { minWidth: h.w, maxWidth: h.w } : undefined}
                  >
                    {h.label}
                  </th>
                ))}
              </tr>
            </thead>

            {/* ── Corps ───────────────────────────────────────────────── */}
            <tbody>
              {stagingLines.length === 0 ? (
                <tr>
                  <td colSpan="10" className="py-12 text-center text-gray-400 border-b border-gray-300">
                    Aucune ligne importée pour cet import
                  </td>
                </tr>
              ) : (
                stagingLines.map((line, li) => {
                  const cp = (field, fi, type = 'text', align = 'left', mw) => ({
                    line, field, lineIndex: li, fieldIndex: fi, type, align, maxWidth: mw,
                    isActive:  activeCell?.lineId === line.id && activeCell?.field === field,
                    isSaving:  savingCell?.lineId === line.id && savingCell?.field === field,
                    editValue: activeCell?.lineId === line.id && activeCell?.field === field ? editValue : '',
                    onEditChange: setEditValue,
                    onBlur: () => {
                      // Petit délai pour laisser le temps au click de se propager si besoin
                      setTimeout(() => {
                        if (isEditingRef.current) {
                          exitEditMode(true);
                        }
                      }, 150);
                    },
                    onKeyDown: handleKeyDown,
                    onClick: handleCellClick,
                  });
                  return (
                    <tr key={line.id}
                      className={`hover:bg-gray-50 ${line.validation_status === 'error' ? 'bg-red-50/30' : ''}`}>
                      <ExcelCell {...cp('account_code',    0)} />
                      <ExcelCell {...cp('account_label',   1, 'text',   'left',  '100px')} />
                      <ExcelCell {...cp('opening_debit',   2, 'number', 'right')} />
                      <ExcelCell {...cp('opening_credit',  3, 'number', 'right')} />
                      <ExcelCell {...cp('movement_debit',  4, 'number', 'right')} />
                      <ExcelCell {...cp('movement_credit', 5, 'number', 'right')} />
                      <ExcelCell {...cp('closing_debit',   6, 'number', 'right')} />
                      <ExcelCell {...cp('closing_credit',  7, 'number', 'right')} />
                      <td className="px-4 py-2.5 text-center border-r border-b border-gray-300">
                        <span className={`px-2 py-1 rounded-full text-[10px] font-semibold ${
                          line.validation_status === 'validated' ? 'bg-green-100 text-green-800' :
                          line.validation_status === 'error'     ? 'bg-red-100 text-red-800' :
                          line.validation_status === 'warning'   ? 'bg-orange-100 text-orange-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {line.validation_status === 'pending'   ? 'En attente' :
                           line.validation_status === 'validated' ? 'Validé' :
                           line.validation_status === 'warning'   ? 'Avert.' : 'Erreur'}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 border-b border-gray-300" style={{ minWidth: 260, maxWidth: 260 }}>
                        <ErrorCell errorDetails={line.error_details} />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>

            {/* ── Pied de tableau — totaux ─────────────────────────────── */}
            {stagingLines.length > 0 && (
              <tfoot>
                <tr className="bg-gray-800 border-t-2 border-gray-600">
                  {/* Code — sticky */}
                  <td className="px-4 py-3 text-xs font-bold text-white border-r border-gray-600 sticky left-0 bg-gray-800 z-20 whitespace-nowrap">
                    TOTAL
                  </td>
                  {/* Libellé — nb lignes */}
                  <td className="px-4 py-3 border-r border-gray-600 text-xs text-gray-400 whitespace-nowrap"
                      style={{ minWidth: 100, maxWidth: 100 }}>
                    {stagingLines.length} ligne{stagingLines.length > 1 ? 's' : ''}
                  </td>

                  {/* opening_debit */}
                  <td className={`px-4 py-3 border-r border-gray-600 text-right text-xs font-bold tabular-nums whitespace-nowrap ${
                    desequilibreOuverture > 0.005 ? 'text-red-400' : 'text-white'
                  }`} style={{ minWidth: 110, maxWidth: 110 }}>
                    {formatNumberDisplay(totals.opening_debit)}
                  </td>
                  {/* opening_credit */}
                  <td className={`px-4 py-3 border-r border-gray-600 text-right text-xs font-bold tabular-nums whitespace-nowrap ${
                    desequilibreOuverture > 0.005 ? 'text-red-400' : 'text-white'
                  }`} style={{ minWidth: 110, maxWidth: 110 }}>
                    <div>{formatNumberDisplay(totals.opening_credit)}</div>
                    {desequilibreOuverture > 0.005 && (
                      <div className="text-red-400 text-[10px] font-normal mt-0.5">
                        Écart : {formatNumberDisplay(desequilibreOuverture)}
                      </div>
                    )}
                  </td>

                  {/* movement_debit / movement_credit */}
                  {['movement_debit', 'movement_credit'].map(field => (
                    <td key={field}
                      className="px-4 py-3 border-r border-gray-600 text-right text-xs font-bold text-white tabular-nums whitespace-nowrap"
                      style={{ minWidth: 110, maxWidth: 110 }}>
                      {formatNumberDisplay(totals[field])}
                    </td>
                  ))}

                  {/* closing_debit */}
                  <td className={`px-4 py-3 border-r border-gray-600 text-right text-xs font-bold tabular-nums whitespace-nowrap ${
                    desequilibreCloture > 0.005 ? 'text-red-400' : 'text-white'
                  }`} style={{ minWidth: 110, maxWidth: 110 }}>
                    {formatNumberDisplay(totals.closing_debit)}
                  </td>
                  {/* closing_credit */}
                  <td className={`px-4 py-3 border-r border-gray-600 text-right text-xs font-bold tabular-nums whitespace-nowrap ${
                    desequilibreCloture > 0.005 ? 'text-red-400' : 'text-white'
                  }`} style={{ minWidth: 110, maxWidth: 110 }}>
                    <div>{formatNumberDisplay(totals.closing_credit)}</div>
                    {desequilibreCloture > 0.005 && (
                      <div className="text-red-400 text-[10px] font-normal mt-0.5">
                        Écart : {formatNumberDisplay(desequilibreCloture)}
                      </div>
                    )}
                  </td>

                  {/* Statut + Erreurs — vides */}
                  <td className="px-4 py-3 border-r border-gray-600" style={{ minWidth: 100, maxWidth: 100 }} />
                  <td className="px-4 py-3" style={{ minWidth: 260 }} />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
                  {/* ====================== AFFICHAGE DU BILAN ====================== */}
      {bilanData && (
        <div className="mt-8 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-4 text-white">
            <h2 className="text-xl font-bold">Bilan Comptable</h2>
            <p className="text-sm opacity-90">
              {bilanData.periode_name} • Généré le {bilanData.date_generation}
            </p>
          </div>

          <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* ACTIF */}
            <div>
              <h3 className="text-lg font-semibold text-emerald-700 mb-4 border-b pb-2">ACTIF</h3>
              {Object.entries(bilanData.actif).map(([key, item]) => (
                <div key={key} className="flex justify-between py-2 border-b last:border-0">
                  <span className="text-gray-700">{item.libelle}</span>
                  <span className="font-medium tabular-nums">
                    {item.solde.toLocaleString('fr-FR')} FCFA
                  </span>
                </div>
              ))}
              <div className="flex justify-between py-3 mt-4 font-bold text-lg border-t border-emerald-200">
                <span>Total Actif</span>
                <span>{bilanData.total_actif.toLocaleString('fr-FR')} FCFA</span>
              </div>
            </div>

            {/* PASSIF */}
            <div>
              <h3 className="text-lg font-semibold text-red-700 mb-4 border-b pb-2">PASSIF</h3>
              {Object.entries(bilanData.passif).map(([key, item]) => (
                <div key={key} className="flex justify-between py-2 border-b last:border-0">
                  <span className="text-gray-700">{item.libelle}</span>
                  <span className="font-medium tabular-nums">
                    {item.solde.toLocaleString('fr-FR')} FCFA
                  </span>
                </div>
              ))}
              <div className="flex justify-between py-3 mt-4 font-bold text-lg border-t border-red-200">
                <span>Total Passif</span>
                <span>{bilanData.total_passif.toLocaleString('fr-FR')} FCFA</span>
              </div>

              {/* Résultat Net */}
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <div className="flex justify-between text-lg">
                  <span className="font-medium">Résultat Net de l'exercice</span>
                  <span className={`font-bold ${bilanData.resultat_net >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {bilanData.resultat_net.toLocaleString('fr-FR')} FCFA
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 px-6 py-3 text-center text-sm text-gray-500 border-t">
            {bilanData.est_equilibre 
              ? "✅ Bilan équilibré" 
              : "⚠️ Bilan non équilibré — vérifiez les données"}
          </div>
        </div>
      )}
      {/* Instructions */}
      <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800 flex flex-wrap gap-x-4 gap-y-1 items-center">
        <span><strong>💡 Navigation :</strong> Cliquez pour éditer</span>
        <span>
          <kbd className="mx-0.5 px-1.5 py-0.5 bg-white border border-blue-300 rounded text-xs font-mono">Tab</kbd>
          <kbd className="mx-0.5 px-1.5 py-0.5 bg-white border border-blue-300 rounded text-xs font-mono">Enter</kbd>
          <kbd className="mx-0.5 px-1.5 py-0.5 bg-white border border-blue-300 rounded text-xs font-mono">Esc</kbd>
          <kbd className="mx-0.5 px-1.5 py-0.5 bg-white border border-blue-300 rounded text-xs font-mono">↑↓</kbd>
        </span>
        <span className="text-gray-400">|</span>
        {Object.entries(BADGE_CONFIG).filter(([k]) => k !== 'error').map(([key, cfg]) => (
          <span key={key} className="flex items-center gap-1">
            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ${cfg.bg} ${cfg.text}`}>
              {cfg.label}
            </span>
            <span className="text-xs text-gray-600">{
              key === 'prefixe'           ? 'Préfixe invalide' :
              key === 'intangibilite'     ? 'Intangibilité N-1' :
              key === 'solde_unique'      ? 'Solde double sens' :
              key === 'equilibre_global'  ? 'Déséquilibre global' :
              key === 'resultat_ouverture'? 'Ouv. résultat non nul' :
              key === 'equilibre_ligne'   ? 'Déséquilibre ligne' : ''
            }</span>
          </span>
        ))}
      </div>

      {/* Actions bas de page */}
      <div className="flex justify-between items-center pt-6">
        <button onClick={() => navigate('/financial-reports/import')}
          className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 shadow-sm text-sm">
          ← Retour à la liste
        </button>
        <div className="flex gap-3">
          {importData.state === 'error' && (
            <button onClick={handleReprocess} disabled={processing}
              className="flex items-center gap-2 px-5 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 shadow-sm text-sm">
              <FiRefreshCw size={15} className={processing ? 'animate-spin' : ''} />
              {processing ? 'Re-traitement…' : 'Re-traiter le fichier'}
            </button>
          )}
          {(importData.state === 'processed' || importData.state === 'draft') && stagingLines.length > 0 && (
            <button onClick={handleValidateImport} disabled={!canValidate}
              title={
                hasWarning ? 'Importez la balance N-1 avant de valider' :
                hasErrors  ? `${stats.error} erreur(s) à corriger` : ''
              }
              className="flex items-center gap-2 px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm text-sm font-medium">
              <FiCheckCircle size={15} />
              {processing ? 'Validation…' : 'Valider toutes les lignes'}
            </button>
          )}
          {importData.state === 'validated' && (
            <>
              <button onClick={() => navigate(`/financial-reports/statements/${id}`)}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium">
                📊 États financiers
              </button>
              <button onClick={() => navigate(`/financial-reports/statements-syscohada/${id}`)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-800 text-white rounded-lg hover:bg-blue-900 text-sm font-medium">
                📄 Format SYSCOHADA
              </button>
            </>
          )}
        </div>
      </div>

    </div>
  );
}