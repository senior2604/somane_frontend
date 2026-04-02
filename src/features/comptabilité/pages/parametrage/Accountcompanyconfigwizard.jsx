// src/features/comptabilité/pages/parametrage/AccountCompanyConfigWizard.jsx

import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import useFrameworkStore from "../../../../stores/comptabilite/frameworkStore";
import axiosInstance from "../../../../config/axiosInstance";
import { ENDPOINTS } from "../../../../config/api";
import { useEntity } from "../../../../context/EntityContext";

const DASHBOARD_PATH = "/comptabilite/dashboard";

// ─── Icônes ───────────────────────────────────────────────────────────────────
const Icon = {
  Check:         () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-4 h-4"><polyline points="20 6 9 17 4 12" /></svg>,
  ChevronRight:  () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4"><polyline points="9 18 15 12 9 6" /></svg>,
  ChevronLeft:   () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4"><polyline points="15 18 9 12 15 6" /></svg>,
  Book:          () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></svg>,
  Hash:          () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5"><line x1="4" y1="9" x2="20" y2="9" /><line x1="4" y1="15" x2="20" y2="15" /><line x1="10" y1="3" x2="8" y2="21" /><line x1="16" y1="3" x2="14" y2="21" /></svg>,
  Eye:           () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>,
  Rocket:        () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" /><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" /><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" /><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" /></svg>,
  X:             () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>,
  Loader:        () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 animate-spin"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>,
  AlertTriangle: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>,
  Briefcase:     () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4"><rect x="2" y="7" width="20" height="14" rx="2" ry="2" /><path d="M16 21V5a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v16" /></svg>,
  Refresh:       () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></svg>,
};

const STEP_META = [
  { label: "Référentiel", icon: Icon.Book   },
  { label: "Longueur",    icon: Icon.Hash   },
  { label: "Aperçu",      icon: Icon.Eye    },
  { label: "Terminé",     icon: Icon.Rocket },
];

const LENGTH_OPTIONS = [8, 9, 10, 11, 12, 13];

function getEntityIdFromStorage() {
  const raw = localStorage.getItem("entiteActive");
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") return String(parsed.id ?? "");
  } catch { /* raw est un ID brut */ }
  return String(raw);
}

// ====================== COMPOSANT PRINCIPAL ======================
export default function AccountCompanyConfigWizard({ onClose }) {
  const navigate = useNavigate();
  const { activeEntity } = useEntity();

  const handleClose = () => {
    if (onClose) onClose();
    navigate(DASHBOARD_PATH);
  };

  const [step,            setStep]            = useState(0);
  const [selectedFW,      setSelectedFW]      = useState(null);
  const [selectedLen,     setSelectedLen]     = useState(null);
  const [preview,         setPreview]         = useState(null);
  const [result,          setResult]          = useState(null);
  const [createdConfigId, setCreatedConfigId] = useState(null);
  const [isUpdate,        setIsUpdate]        = useState(false); // indique si c'est un update

  const [loadingPreview, setLoadingPreview] = useState(false);
  const [loadingSubmit,  setLoadingSubmit]  = useState(false);
  const [error,          setError]          = useState(null);

  const { frameworks, loading: loadingFW, error: storeError, fetchFrameworks } = useFrameworkStore();

  useEffect(() => { fetchFrameworks(); }, [fetchFrameworks]);
  useEffect(() => { if (storeError) setError(storeError); }, [storeError]);

  // ── Prévisualisation ──────────────────────────────────────────────────────
  const loadPreview = useCallback(async (configId) => {
    const id = parseInt(configId, 10);
    if (!id || isNaN(id)) {
      setError(`ID de configuration invalide : "${configId}"`);
      return;
    }
    setLoadingPreview(true);
    setError(null);
    const base = ENDPOINTS.COMPTA.ACCOUNT_COMPANY_CONFIGS.replace(/\/$/, "");
    const url  = `${base}/${id}/preview/`;
    try {
      const response = await axiosInstance.get(url);
      setPreview(response.data);
    } catch (err) {
      const status = err.response?.status;
      if (status === 404)      setError(`Config introuvable (ID ${id}).`);
      else if (status === 403) setError("Accès refusé. Vérifiez que l'entité active est correcte.");
      else                     setError(err.response?.data?.detail || "Impossible de charger la prévisualisation.");
    } finally {
      setLoadingPreview(false);
    }
  }, []);

  // ── Création / Mise à jour du config ──────────────────────────────────────
  const handleCreate = async () => {
    const entityId = activeEntity?.id ?? getEntityIdFromStorage();
    if (!entityId) {
      setError("Aucune entité active détectée.");
      return;
    }
    setLoadingSubmit(true);
    setError(null);

    const payload = {
      framework:           selectedFW.id,
      account_code_length: selectedLen,
    };

    try {
      const response = await axiosInstance.post(
        ENDPOINTS.COMPTA.ACCOUNT_COMPANY_CONFIGS,
        payload
      );
      const data  = response.data;
      const newId = data?.id;

      if (!newId || isNaN(parseInt(newId, 10))) {
        throw new Error(`L'API n'a pas retourné d'ID valide. Réponse : ${JSON.stringify(data)}`);
      }

      setCreatedConfigId(newId);
      // Détecter si c'est une mise à jour (le backend retourne le même id avec un config existant)
      setIsUpdate(data?.was_updated === true);

      // Délai pour laisser Django finaliser la génération
      await new Promise(resolve => setTimeout(resolve, 600));
      await loadPreview(newId);
      setStep(2);

    } catch (err) {
      const errData = err.response?.data;
      let msg;
      if (!errData)                    msg = err.message || "Erreur lors de la création.";
      else if (typeof errData === "string") msg = errData;
      else if (errData.detail)         msg = errData.detail;
      else if (errData.non_field_errors) msg = errData.non_field_errors.join(" — ");
      else msg = Object.entries(errData).map(([f, e]) => `${f} : ${Array.isArray(e) ? e.join(", ") : e}`).join(" | ");
      setError(msg);
    } finally {
      setLoadingSubmit(false);
    }
  };

  // ── Confirmation finale ───────────────────────────────────────────────────
  const handleConfirm = async () => {
    setLoadingSubmit(true);
    setError(null);
    try {
      setResult({
        framework:  selectedFW?.name || "Inconnu",
        length:     selectedLen,
        generated:  preview?.to_create        ?? 0,
        existing:   preview?.already_existing ?? 0,
        total:      preview?.total            ?? 0,
        isUpdate,
      });
      setStep(3);
    } catch (e) {
      setError(e.message || "Erreur lors de la confirmation.");
    } finally {
      setLoadingSubmit(false);
    }
  };

  const canNext = () => {
    if (step === 0) return !!selectedFW;
    if (step === 1) return !!selectedLen;
    return true;
  };

  const goNext = async () => {
    setError(null);
    if (step === 0) { setStep(1); return; }
    if (step === 1) { await handleCreate(); return; }
    if (step === 2) { await handleConfirm(); return; }
  };

  const goBack = () => {
    setError(null);
    if (step === 2 && createdConfigId && !isUpdate) {
      // Annuler la création si c'est un nouveau config (pas une mise à jour)
      const base = ENDPOINTS.COMPTA.ACCOUNT_COMPANY_CONFIGS.replace(/\/$/, "");
      axiosInstance.delete(`${base}/${createdConfigId}/`).catch(() => {});
      setCreatedConfigId(null);
      setPreview(null);
    }
    setStep(s => Math.max(0, s - 1));
  };

  const entityLabel =
    activeEntity?.raison_sociale ||
    activeEntity?.nom ||
    activeEntity?.code ||
    (() => {
      try {
        const raw = localStorage.getItem("entiteActive");
        if (!raw) return null;
        const p = JSON.parse(raw);
        return p?.raison_sociale || p?.nom || null;
      } catch { return null; }
    })() ||
    null;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      {/* 
        max-w-xl (576px) au lieu de max-w-2xl (672px)
        On garde une largeur raisonnable sans que la longueur déborde 
      */}
      <div
        className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        style={{ maxHeight: "90vh", fontFamily: "'DM Sans', 'Segoe UI', sans-serif" }}
      >
        {/* ── En-tête ────────────────────────────────────────────────────── */}
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 px-6 pt-6 pb-0 flex-shrink-0">
          {/* Titre + bouton fermer */}
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-slate-400 text-[10px] uppercase tracking-widest font-semibold mb-0.5">
                Comptabilité · Paramétrage
              </p>
              <h2 className="text-white text-xl font-bold leading-tight">Plan comptable entité</h2>
            </div>
            <button
              onClick={handleClose}
              className="text-slate-400 hover:text-white transition-colors mt-1"
              title="Fermer"
            >
              <Icon.X />
            </button>
          </div>

          {/* Bandeau entité */}
          <div className={`rounded-lg px-3 py-1.5 mb-4 text-xs flex items-center gap-2 ${
            entityLabel
              ? "bg-emerald-900/40 border border-emerald-700/50 text-emerald-200"
              : "bg-amber-900/40 border border-amber-700/50 text-amber-200"
          }`}>
            <Icon.Briefcase />
            {entityLabel
              ? <span><strong>Entité :</strong> {entityLabel}</span>
              : <span className="text-amber-300 font-medium">⚠️ Aucune entité active</span>
            }
          </div>

          {/* Stepper horizontal compact */}
          <div className="flex items-center">
            {STEP_META.map((meta, i) => {
              const done   = i < step;
              const active = i === step;
              const IconCmp = meta.icon;
              return (
                <div key={i} className="flex items-center flex-1 last:flex-none">
                  <div className="flex flex-col items-center gap-1 min-w-0">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-300 flex-shrink-0
                      ${done   ? "bg-emerald-500 border-emerald-500 text-white" : ""}
                      ${active ? "bg-white border-white text-slate-800" : ""}
                      ${!done && !active ? "bg-transparent border-slate-600 text-slate-500" : ""}`}
                    >
                      {done ? <Icon.Check /> : <IconCmp />}
                    </div>
                    <span className={`text-[10px] font-semibold whitespace-nowrap ${
                      active ? "text-white" : done ? "text-emerald-400" : "text-slate-500"
                    }`}>
                      {meta.label}
                    </span>
                  </div>
                  {i < STEP_META.length - 1 && (
                    <div className={`flex-1 h-[2px] mx-1.5 mb-4 rounded transition-all duration-500 ${
                      i < step ? "bg-emerald-500" : "bg-slate-700"
                    }`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Corps scrollable ───────────────────────────────────────────── */}
        <div className="px-6 py-5 overflow-y-auto flex-1">
          {error && (
            <div className="mb-4 flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">
              <span className="text-red-500 mt-0.5 shrink-0"><Icon.AlertTriangle /></span>
              <p className="text-red-700 text-xs leading-relaxed">{error}</p>
            </div>
          )}

          {step === 0 && (
            <StepFramework
              frameworks={frameworks}
              loading={loadingFW}
              selected={selectedFW}
              onSelect={setSelectedFW}
            />
          )}
          {step === 1 && (
            <StepLength
              framework={selectedFW}
              selected={selectedLen}
              onSelect={setSelectedLen}
              defaultHint={selectedFW?.account_code_length}
            />
          )}
          {step === 2 && (
            <StepPreview
              preview={preview}
              loading={loadingPreview}
              isUpdate={isUpdate}
            />
          )}
          {step === 3 && (
            <StepResult result={result} onClose={handleClose} />
          )}
        </div>

        {/* ── Navigation ────────────────────────────────────────────────── */}
        {step < 3 && (
          <div className="px-6 pb-5 flex items-center justify-between border-t border-slate-100 pt-4 flex-shrink-0">
            <button
              onClick={step === 0 ? handleClose : goBack}
              className="flex items-center gap-1.5 text-slate-500 hover:text-slate-800 text-sm font-medium transition-colors"
            >
              <Icon.ChevronLeft />
              {step === 0 ? "Annuler" : "Retour"}
            </button>

            <button
              onClick={goNext}
              disabled={!canNext() || loadingSubmit || loadingPreview}
              className={`flex items-center gap-2 px-5 py-2 rounded-xl font-semibold text-sm transition-all duration-200
                ${canNext() && !loadingSubmit && !loadingPreview
                  ? "bg-slate-800 hover:bg-slate-700 text-white shadow-md"
                  : "bg-slate-100 text-slate-400 cursor-not-allowed"
                }`}
            >
              {(loadingSubmit || loadingPreview) && <Icon.Loader />}
              {step === 1
                ? (loadingSubmit ? "Traitement…" : "Créer & Prévisualiser")
                : step === 2
                  ? "Confirmer"
                  : "Suivant"
              }
              {!loadingSubmit && !loadingPreview && <Icon.ChevronRight />}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Étape 0 : Choix du référentiel ──────────────────────────────────────────
function StepFramework({ frameworks, loading, selected, onSelect }) {
  const [search, setSearch] = useState("");
  const filtered = frameworks.filter(fw =>
    fw.name.toLowerCase().includes(search.toLowerCase()) ||
    fw.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <h3 className="text-slate-800 font-bold text-base mb-0.5">Choisir le référentiel comptable</h3>
      <p className="text-slate-500 text-xs mb-4">Sélectionnez le plan comptable applicable à cette entité.</p>

      <input
        type="text"
        placeholder="Rechercher…"
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-slate-400 mb-3 transition-colors"
      />

      {loading ? (
        <div className="flex justify-center py-8 text-slate-400"><Icon.Loader /></div>
      ) : filtered.length === 0 ? (
        <p className="text-center text-slate-400 text-sm py-6">Aucun référentiel trouvé.</p>
      ) : (
        <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
          {filtered.map(fw => (
            <button
              key={fw.id}
              onClick={() => onSelect(fw)}
              className={`w-full text-left px-3 py-3 rounded-xl border-2 transition-all flex items-center justify-between gap-2
                ${selected?.id === fw.id
                  ? "border-slate-800 bg-slate-50"
                  : "border-slate-100 hover:border-slate-300 bg-white"
                }`}
            >
              <div className="min-w-0">
                <span className="font-bold text-slate-800 text-sm">{fw.code}</span>
                <span className="text-slate-500 text-sm ml-1.5 truncate">— {fw.name}</span>
                {fw.version && (
                  <span className="ml-1.5 text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full">
                    v{fw.version}
                  </span>
                )}
              </div>
              {selected?.id === fw.id && (
                <span className="text-emerald-500 shrink-0"><Icon.Check /></span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Étape 1 : Longueur des codes ────────────────────────────────────────────
function StepLength({ framework, selected, onSelect, defaultHint }) {
  const descriptions = {
    8:  "Très compact",
    9:  "Compact — PME simples",
    10: "Standard SYSCOHADA",
    11: "Étendu",
    12: "Large — grandes structures",
    13: "Maximum",
  };

  return (
    <div>
      <h3 className="text-slate-800 font-bold text-base mb-0.5">Longueur des codes de comptes</h3>
      <p className="text-slate-500 text-xs mb-0.5">
        Référentiel : <span className="font-semibold text-slate-700">{framework?.code} — {framework?.name}</span>
      </p>
      {defaultHint && (
        <p className="text-slate-400 text-xs mb-4">
          Longueur suggérée par le référentiel : <strong>{defaultHint} car.</strong>
        </p>
      )}

      {/* Grille 3×2 — plus compacte pour éviter le débordement */}
      <div className="grid grid-cols-3 gap-2 mt-2">
        {LENGTH_OPTIONS.map(len => {
          const isSelected = selected === len;
          const isSuggested = defaultHint === len;
          // Exemple de code généré tronqué pour rester dans la carte
          const exampleCode = "1011" + "0".repeat(Math.max(0, len - 4));

          return (
            <button
              key={len}
              onClick={() => onSelect(len)}
              className={`relative flex flex-col items-center justify-center py-4 px-2 rounded-xl border-2 transition-all
                ${isSelected
                  ? "border-slate-800 bg-slate-800 text-white"
                  : "border-slate-100 hover:border-slate-300 bg-white text-slate-700"
                }`}
            >
              {/* Badge "Suggéré" */}
              {isSuggested && (
                <span className={`absolute top-1.5 right-1.5 text-[9px] font-bold uppercase px-1 py-0.5 rounded
                  ${isSelected ? "bg-white/20 text-white" : "bg-amber-100 text-amber-600"}`}>
                  ★
                </span>
              )}

              {/* Chiffre principal */}
              <span className={`text-2xl font-black mb-0.5 ${isSelected ? "text-white" : "text-slate-800"}`}>
                {len}
              </span>

              {/* Description courte */}
              <span className={`text-[10px] text-center leading-tight mb-2 ${
                isSelected ? "text-slate-200" : "text-slate-400"
              }`}>
                {descriptions[len]}
              </span>

              {/* Exemple de code — tronqué avec ellipsis si trop long */}
              <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded w-full text-center truncate
                ${isSelected ? "bg-white/10 text-slate-100" : "bg-slate-50 text-slate-500"}`}
                title={exampleCode}
              >
                {exampleCode}
              </span>
            </button>
          );
        })}
      </div>

      <p className="text-slate-400 text-[10px] mt-3 text-center">
        ⚠️ Ce choix sera verrouillé dès qu'un compte sera mouvementé.
      </p>
    </div>
  );
}

// ─── Étape 2 : Prévisualisation ───────────────────────────────────────────────
function StepPreview({ preview, loading, isUpdate }) {
  const [showAll, setShowAll] = useState(false);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-2 text-slate-400">
        <Icon.Loader />
        <p className="text-xs">Chargement de la prévisualisation…</p>
      </div>
    );
  }

  if (!preview) {
    return <p className="text-center text-slate-400 py-8 text-sm">Aucune donnée disponible.</p>;
  }

  const accounts  = preview.accounts || [];
  const displayed = showAll ? accounts : accounts.slice(0, 6);

  return (
    <div>
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-slate-800 font-bold text-base mb-0.5">Prévisualisation des comptes</h3>
          <p className="text-slate-500 text-xs">
            {isUpdate
              ? "Mise à jour du paramétrage — comptes à générer avec la nouvelle longueur."
              : "Comptes opérationnels qui seront générés pour votre entité."
            }
          </p>
        </div>
        {isUpdate && (
          <span className="text-[10px] bg-blue-100 text-blue-700 font-bold px-2 py-0.5 rounded-full shrink-0 ml-2">
            Mise à jour
          </span>
        )}
      </div>

      {/* Compteurs */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        {[
          { label: "Total",    value: preview.total,            bg: "bg-slate-50",    text: "text-slate-700"    },
          { label: "À créer",  value: preview.to_create,        bg: "bg-emerald-50",  text: "text-emerald-700"  },
          { label: "Existants",value: preview.already_existing, bg: "bg-amber-50",    text: "text-amber-700"    },
        ].map(({ label, value, bg, text }) => (
          <div key={label} className={`rounded-xl p-2.5 text-center ${bg}`}>
            <p className={`text-xl font-black ${text}`}>{value ?? 0}</p>
            <p className="text-[10px] font-medium text-slate-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Table des comptes */}
      {accounts.length === 0 ? (
        <p className="text-center text-slate-400 text-xs py-4">
          Aucun nouveau compte à générer.
        </p>
      ) : (
        <>
          <div className="border border-slate-100 rounded-xl overflow-hidden">
            {/* En-tête table */}
            <div className="grid grid-cols-12 bg-slate-50 px-3 py-2 text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
              <span className="col-span-3">Racine</span>
              <span className="col-span-5">Libellé</span>
              <span className="col-span-3">Code généré</span>
              <span className="col-span-1 text-center">St.</span>
            </div>
            {/* Lignes */}
            <div className="divide-y divide-slate-50 max-h-40 overflow-y-auto">
              {displayed.map((acc, i) => (
                <div key={i} className="grid grid-cols-12 px-3 py-2 items-center hover:bg-slate-50 transition-colors">
                  <span className="col-span-3 font-mono text-slate-600 text-[11px]">{acc.root_code}</span>
                  <span className="col-span-5 text-slate-700 truncate text-[11px]" title={acc.root_name}>
                    {acc.root_name}
                  </span>
                  <span className="col-span-3 font-mono font-semibold text-slate-800 text-[11px] truncate" title={acc.generated_code}>
                    {acc.generated_code}
                  </span>
                  <span className="col-span-1 flex justify-center">
                    {acc.already_exists
                      ? <span className="w-4 h-4 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-[9px] font-bold">~</span>
                      : <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center"><Icon.Check /></span>
                    }
                  </span>
                </div>
              ))}
            </div>
          </div>

          {accounts.length > 6 && (
            <button
              onClick={() => setShowAll(v => !v)}
              className="mt-1.5 text-[11px] text-slate-400 hover:text-slate-600 transition-colors w-full text-center"
            >
              {showAll ? "Réduire" : `Voir les ${accounts.length - 6} autres…`}
            </button>
          )}
        </>
      )}
    </div>
  );
}

// ─── Étape 3 : Résultat ───────────────────────────────────────────────────────
function StepResult({ result, onClose }) {
  return (
    <div className="flex flex-col items-center justify-center py-6 text-center">
      {/* Icône succès */}
      <div className="relative mb-5">
        <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center">
          <div className="w-11 h-11 rounded-full bg-emerald-100 flex items-center justify-center">
            <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white">
              <Icon.Check />
            </div>
          </div>
        </div>
      </div>

      <h3 className="text-slate-800 font-black text-lg mb-1">
        {result?.isUpdate ? "Paramétrage mis à jour !" : "Paramétrage réussi !"}
      </h3>
      <p className="text-slate-500 text-xs mb-5 max-w-xs">
        {result?.isUpdate
          ? "La longueur des codes a été modifiée et les nouveaux comptes ont été générés."
          : "Le plan comptable a été configuré et les comptes opérationnels ont été générés automatiquement."
        }
      </p>

      {result && (
        <div className="bg-slate-50 rounded-2xl px-5 py-4 text-left w-full max-w-xs mb-5 space-y-2">
          <Row label="Référentiel"    value={result.framework} />
          <Row label="Longueur codes" value={`${result.length} caractères`} />
          <Row label="Comptes créés"  value={result.generated} highlight />
          <Row label="Déjà existants" value={result.existing} />
          <Row label="Total racines"  value={result.total} />
        </div>
      )}

      <button
        onClick={onClose}
        className="px-7 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-semibold text-sm transition-colors shadow-md"
      >
        Terminer
      </button>
    </div>
  );
}

function Row({ label, value, highlight }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-500 text-xs">{label}</span>
      <span className={`text-xs font-bold ${highlight ? "text-emerald-600" : "text-slate-800"}`}>{value}</span>
    </div>
  );
}