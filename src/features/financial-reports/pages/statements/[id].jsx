// src/features/financial-reports/pages/statements/[id].jsx
import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FiArrowLeft, FiDownload, FiRefreshCw, FiChevronDown, FiChevronRight,
         FiCheckCircle, FiAlertTriangle, FiTrendingUp, FiTrendingDown } from 'react-icons/fi';
import { apiClient } from '../../../../services/apiClient';

// ─────────────────────────────────────────────────────────────────────────────
// FORMAT
// ─────────────────────────────────────────────────────────────────────────────

function fmt(val) {
  if (val == null) return '—';
  const n = parseFloat(val);
  if (isNaN(n)) return '—';
  return n.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function fmtSigned(val) {
  const n = parseFloat(val);
  if (isNaN(n)) return '—';
  const abs = Math.abs(n).toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  return n < 0 ? `(${abs})` : abs;
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPOSANT — Ligne de poste avec detail expansible
// ─────────────────────────────────────────────────────────────────────────────

function PosteLine({ libelle, solde, detail = [], indent = 0, highlight = false, colorClass = '' }) {
  const [open, setOpen] = useState(false);
  const hasDetail = detail && detail.length > 0;

  return (
    <>
      <tr
        className={`border-b border-gray-100 transition-colors
          ${highlight ? 'bg-indigo-50 font-semibold' : 'hover:bg-gray-50'}
          ${hasDetail ? 'cursor-pointer' : ''}
        `}
        onClick={() => hasDetail && setOpen(o => !o)}
      >
        <td className="py-2.5 px-4" style={{ paddingLeft: `${16 + indent * 20}px` }}>
          <div className="flex items-center gap-2">
            {hasDetail && (
              open
                ? <FiChevronDown size={13} className="text-gray-400 shrink-0" />
                : <FiChevronRight size={13} className="text-gray-400 shrink-0" />
            )}
            <span className={`text-sm ${highlight ? 'text-gray-900' : 'text-gray-700'}`}>
              {libelle}
              {hasDetail && (
                <span className="ml-2 text-[10px] text-gray-400 font-normal">
                  ({detail.length} compte{detail.length > 1 ? 's' : ''})
                </span>
              )}
            </span>
          </div>
        </td>
        <td className={`py-2.5 px-6 text-right text-sm tabular-nums font-medium ${colorClass || (highlight ? 'text-gray-900' : 'text-gray-700')}`}>
          {fmt(solde)}
        </td>
      </tr>
      {open && hasDetail && detail.map((d, i) => (
        <tr key={i} className="bg-gray-50/70 border-b border-gray-100/60">
          <td className="py-1.5 px-4 text-xs text-gray-500" style={{ paddingLeft: `${16 + (indent + 1) * 20}px` }}>
            <span className="font-mono text-gray-400 mr-2">{d.code}</span>
            {d.label}
          </td>
          <td className="py-1.5 px-6 text-right text-xs tabular-nums text-gray-600">
            {fmt(d.solde)}
          </td>
        </tr>
      ))}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BILAN
// ─────────────────────────────────────────────────────────────────────────────

function BilanTab({ data }) {
  if (!data) return null;

  const totalActifImmo = (data.actif.immobilisations_incorporelles?.solde || 0)
    + (data.actif.immobilisations_corporelles?.solde || 0)
    + (data.actif.immobilisations_financieres?.solde || 0);

  const totalActifCirc = (data.actif.stocks?.solde || 0)
    + (data.actif.creances_clients?.solde || 0)
    + (data.actif.autres_creances?.solde || 0)
    + (data.actif.tresorerie_actif?.solde || 0);

  const totalCapitauxPropres = (data.passif.capital_reserves?.solde || 0)
    + (data.passif.report_resultat?.solde || 0);

  const totalDettes = (data.passif.dettes_financieres?.solde || 0)
    + (data.passif.dettes_fournisseurs?.solde || 0)
    + (data.passif.dettes_fiscales_sociales?.solde || 0)
    + (data.passif.autres_dettes?.solde || 0)
    + (data.passif.tresorerie_passif?.solde || 0);

  const SectionHeader = ({ label, total }) => (
    <tr className="bg-gray-100 border-y border-gray-200">
      <td className="py-2 px-4 text-xs font-bold text-gray-600 uppercase tracking-wider">{label}</td>
      <td className="py-2 px-6 text-right text-xs font-bold text-gray-700 tabular-nums">{fmt(total)}</td>
    </tr>
  );

  const TotalRow = ({ label, total, color = 'text-gray-900' }) => (
    <tr className="border-t-2 border-gray-300 bg-gray-50">
      <td className={`py-3 px-4 font-bold text-sm ${color}`}>{label}</td>
      <td className={`py-3 px-6 text-right font-bold text-sm tabular-nums ${color}`}>{fmt(total)}</td>
    </tr>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

      {/* ── ACTIF ─────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-5 py-3">
          <h3 className="text-white font-bold text-base tracking-wide">ACTIF</h3>
        </div>
        <table className="w-full">
          <tbody>
            <SectionHeader label="Actif immobilisé" total={totalActifImmo} />
            <PosteLine {...data.actif.immobilisations_incorporelles} libelle={data.actif.immobilisations_incorporelles?.libelle} indent={1} />
            <PosteLine {...data.actif.immobilisations_corporelles} libelle={data.actif.immobilisations_corporelles?.libelle} indent={1} />
            <PosteLine {...data.actif.immobilisations_financieres} libelle={data.actif.immobilisations_financieres?.libelle} indent={1} />

            <SectionHeader label="Actif circulant" total={totalActifCirc} />
            <PosteLine {...data.actif.stocks} libelle={data.actif.stocks?.libelle} indent={1} />
            <PosteLine {...data.actif.creances_clients} libelle={data.actif.creances_clients?.libelle} indent={1} />
            <PosteLine {...data.actif.autres_creances} libelle={data.actif.autres_creances?.libelle} indent={1} />
            <PosteLine {...data.actif.tresorerie_actif} libelle={data.actif.tresorerie_actif?.libelle} indent={1} />

            <TotalRow label="TOTAL ACTIF" total={data.total_actif} color="text-blue-700" />
          </tbody>
        </table>
      </div>

      {/* ── PASSIF ────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 px-5 py-3">
          <h3 className="text-white font-bold text-base tracking-wide">PASSIF</h3>
        </div>
        <table className="w-full">
          <tbody>
            <SectionHeader label="Capitaux propres" total={totalCapitauxPropres} />
            <PosteLine {...data.passif.capital_reserves} libelle={data.passif.capital_reserves?.libelle} indent={1} />
            <PosteLine {...data.passif.report_resultat} libelle={data.passif.report_resultat?.libelle} indent={1} />

            {/* Résultat net */}
            <tr className="border-b border-gray-100 bg-emerald-50/40">
              <td className="py-2.5 px-4 pl-10 text-sm text-emerald-800 font-medium">Résultat net de l'exercice</td>
              <td className={`py-2.5 px-6 text-right text-sm tabular-nums font-semibold ${data.resultat_net >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                {fmtSigned(data.resultat_net)}
              </td>
            </tr>

            <SectionHeader label="Dettes" total={totalDettes} />
            <PosteLine {...data.passif.dettes_financieres} libelle={data.passif.dettes_financieres?.libelle} indent={1} />
            <PosteLine {...data.passif.dettes_fournisseurs} libelle={data.passif.dettes_fournisseurs?.libelle} indent={1} />
            <PosteLine {...data.passif.dettes_fiscales_sociales} libelle={data.passif.dettes_fiscales_sociales?.libelle} indent={1} />
            <PosteLine {...data.passif.autres_dettes} libelle={data.passif.autres_dettes?.libelle} indent={1} />
            <PosteLine {...data.passif.tresorerie_passif} libelle={data.passif.tresorerie_passif?.libelle} indent={1} />

            <TotalRow label="TOTAL PASSIF" total={data.total_passif} color="text-emerald-700" />
          </tbody>
        </table>
      </div>

      {/* ── Équilibre ─────────────────────────────────────────────────── */}
      <div className="lg:col-span-2">
        <div className={`flex items-center gap-3 px-5 py-3 rounded-xl border-2 text-sm font-semibold
          ${data.est_equilibre
            ? 'bg-green-50 border-green-300 text-green-800'
            : 'bg-red-50 border-red-300 text-red-800'}`}>
          {data.est_equilibre
            ? <><FiCheckCircle size={18} /> Bilan équilibré — Actif = Passif = {fmt(data.total_actif)} FCFA</>
            : <><FiAlertTriangle size={18} /> Bilan non équilibré — Écart : {fmt(Math.abs(data.total_actif - data.total_passif))} FCFA</>}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPTE DE RÉSULTAT
// ─────────────────────────────────────────────────────────────────────────────

function CompteResultatTab({ data }) {
  if (!data) return null;

  const SectionHeader = ({ label, total, color }) => (
    <tr className="bg-gray-100 border-y border-gray-200">
      <td className="py-2 px-4 text-xs font-bold text-gray-600 uppercase tracking-wider">{label}</td>
      <td className={`py-2 px-6 text-right text-xs font-bold tabular-nums ${color}`}>{fmt(total)}</td>
    </tr>
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* CHARGES */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-red-500 to-red-600 px-5 py-3">
            <h3 className="text-white font-bold text-base tracking-wide">CHARGES</h3>
          </div>
          <table className="w-full">
            <tbody>
              <SectionHeader label="Charges d'exploitation" total={data.total_charges} color="text-red-700" />
              {Object.entries(data.charges).map(([key, item]) => (
                <PosteLine key={key} libelle={item.libelle} solde={item.solde} detail={item.detail} indent={1} />
              ))}
              <tr className="border-t-2 border-gray-300 bg-gray-50">
                <td className="py-3 px-4 font-bold text-sm text-red-700">TOTAL CHARGES</td>
                <td className="py-3 px-6 text-right font-bold text-sm tabular-nums text-red-700">{fmt(data.total_charges)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* PRODUITS */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-teal-500 to-teal-600 px-5 py-3">
            <h3 className="text-white font-bold text-base tracking-wide">PRODUITS</h3>
          </div>
          <table className="w-full">
            <tbody>
              <SectionHeader label="Produits d'exploitation" total={data.total_produits} color="text-teal-700" />
              {Object.entries(data.produits).map(([key, item]) => (
                <PosteLine key={key} libelle={item.libelle} solde={item.solde} detail={item.detail} indent={1} />
              ))}
              <tr className="border-t-2 border-gray-300 bg-gray-50">
                <td className="py-3 px-4 font-bold text-sm text-teal-700">TOTAL PRODUITS</td>
                <td className="py-3 px-6 text-right font-bold text-sm tabular-nums text-teal-700">{fmt(data.total_produits)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* RÉSULTAT NET */}
      <div className={`rounded-xl border-2 p-5 flex items-center justify-between
        ${data.est_benefice ? 'bg-emerald-50 border-emerald-300' : 'bg-red-50 border-red-300'}`}>
        <div className="flex items-center gap-3">
          {data.est_benefice
            ? <FiTrendingUp size={24} className="text-emerald-600" />
            : <FiTrendingDown size={24} className="text-red-600" />}
          <div>
            <p className={`font-bold text-lg ${data.est_benefice ? 'text-emerald-800' : 'text-red-800'}`}>
              {data.est_benefice ? 'Bénéfice net de l\'exercice' : 'Perte nette de l\'exercice'}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">Produits − Charges = Résultat</p>
          </div>
        </div>
        <div className={`text-2xl font-bold tabular-nums ${data.est_benefice ? 'text-emerald-700' : 'text-red-700'}`}>
          {fmtSigned(data.resultat_net)} FCFA
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TFT
// ─────────────────────────────────────────────────────────────────────────────

function TFTTab({ data }) {
  if (!data) return null;

  const FluxSection = ({ titre, items, total, colorBg, colorText, colorBorder }) => (
    <div className={`bg-white rounded-xl border-2 ${colorBorder} shadow-sm overflow-hidden`}>
      <div className={`${colorBg} px-5 py-3 flex items-center justify-between`}>
        <h3 className={`font-bold text-base tracking-wide ${colorText}`}>{titre}</h3>
        <span className={`font-bold text-sm tabular-nums ${colorText}`}>{fmtSigned(total)} FCFA</span>
      </div>
      <table className="w-full">
        <tbody>
          {Object.entries(items).map(([key, item]) => (
            <tr key={key} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="py-2.5 px-5 text-sm text-gray-700">{item.libelle}</td>
              <td className={`py-2.5 px-5 text-right text-sm tabular-nums font-medium
                ${item.solde >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                {fmtSigned(item.solde)}
              </td>
            </tr>
          ))}
          <tr className="bg-gray-50 border-t border-gray-200">
            <td className="py-2.5 px-5 text-sm font-bold text-gray-800">Sous-total</td>
            <td className={`py-2.5 px-5 text-right text-sm tabular-nums font-bold
              ${total >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
              {fmtSigned(total)} FCFA
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <FluxSection
          titre="Flux d'exploitation"
          items={data.exploitation}
          total={data.flux_exploitation}
          colorBg="bg-blue-50" colorText="text-blue-800" colorBorder="border-blue-200"
        />
        <FluxSection
          titre="Flux d'investissement"
          items={data.investissement}
          total={data.flux_investissement}
          colorBg="bg-amber-50" colorText="text-amber-800" colorBorder="border-amber-200"
        />
        <FluxSection
          titre="Flux de financement"
          items={data.financement}
          total={data.flux_financement}
          colorBg="bg-purple-50" colorText="text-purple-800" colorBorder="border-purple-200"
        />
      </div>

      {/* Synthèse trésorerie */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="bg-gray-800 px-5 py-3">
          <h3 className="text-white font-bold text-base">Synthèse de trésorerie</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-gray-100">
          {[
            { label: 'Trésorerie ouverture', val: data.tresorerie_ouverture, color: 'text-gray-700' },
            { label: 'Variation de trésorerie', val: data.variation_tresorerie, color: data.variation_tresorerie >= 0 ? 'text-emerald-600' : 'text-red-600' },
            { label: 'Trésorerie clôture', val: data.tresorerie_cloture, color: 'text-gray-900' },
            { label: 'Cohérence', val: null, color: data.est_coherent ? 'text-emerald-600' : 'text-red-600', icon: data.est_coherent },
          ].map((item, i) => (
            <div key={i} className="p-5 text-center">
              <p className="text-xs text-gray-500 mb-1">{item.label}</p>
              {item.val !== null
                ? <p className={`text-xl font-bold tabular-nums ${item.color}`}>{fmtSigned(item.val)}</p>
                : <p className={`text-sm font-bold ${item.color}`}>
                    {item.icon ? '✓ Cohérent' : '✗ Incohérent'}
                  </p>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function NotesTab({ data }) {
  if (!data) return null;

  return (
    <div className="space-y-6">
      {data.notes.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">
          Aucune note annexe générée pour cet import.
        </div>
      )}
      {data.notes.map(note => (
        <div key={note.numero} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="bg-gray-700 px-5 py-3 flex items-center gap-3">
            <span className="bg-white text-gray-700 text-xs font-bold px-2 py-0.5 rounded">
              Note {note.numero}
            </span>
            <h3 className="text-white font-semibold text-sm">{note.titre}</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  {note.colonnes.map((col, i) => (
                    <th key={i} className={`py-2.5 px-4 text-xs font-semibold text-gray-600
                      ${i === 0 ? 'text-left' : i === 1 ? 'text-left' : 'text-right'}`}>
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {note.lignes.map((ligne, i) => (
                  <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-2 px-4 font-mono text-xs text-gray-500">{ligne.code}</td>
                    <td className="py-2 px-4 text-gray-700">{ligne.label}</td>
                    {note.type === 'tableau_mouvements' ? <>
                      <td className="py-2 px-4 text-right tabular-nums text-gray-700">{fmt(ligne.val_debut)}</td>
                      <td className="py-2 px-4 text-right tabular-nums text-emerald-600">{fmt(ligne.acquisitions)}</td>
                      <td className="py-2 px-4 text-right tabular-nums text-red-500">{fmt(ligne.cessions)}</td>
                      <td className="py-2 px-4 text-right tabular-nums font-semibold text-gray-900">{fmt(ligne.val_fin)}</td>
                    </> : note.colonnes.length === 4 ? <>
                      <td className="py-2 px-4 text-right tabular-nums text-gray-600">{fmt(ligne.ouverture)}</td>
                      <td className="py-2 px-4 text-right tabular-nums font-semibold text-gray-900">{fmt(ligne.cloture)}</td>
                    </> : <>
                      <td className="py-2 px-4 text-right tabular-nums text-gray-600">{fmt(ligne.debit)}</td>
                      <td className="py-2 px-4 text-right tabular-nums text-gray-600">{fmt(ligne.credit)}</td>
                      <td className="py-2 px-4 text-right tabular-nums font-semibold text-gray-900">{fmt(ligne.solde)}</td>
                    </>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}



// ─────────────────────────────────────────────────────────────────────────────
// PAGE PRINCIPALE
// ─────────────────────────────────────────────────────────────────────────────

export default function FinancialStatements() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('bilan');
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState(null);
  const [importData, setImportData] = useState(null);

  const [bilanData, setBilanData]   = useState(null);
  const [crData, setCrData]         = useState(null);
  const [tftData, setTftData]       = useState(null);
  const [notesData, setNotesData] = useState(null);


  // Chargement des données de l'import
  useEffect(() => {
    apiClient.get(`financial-reports/raw-imports/${id}/`)
      .then(setImportData)
      .catch(() => setError('Import introuvable'));
  }, [id]);

  const loadTab = useCallback(async (tab) => {
    setActiveTab(tab);
    if (tab === 'bilan'  && bilanData) return;
    if (tab === 'cr'     && crData)    return;
    if (tab === 'tft'    && tftData)   return;
    if (tab === 'notes' && notesData) return;


    setLoading(true);
    setError(null);
    try {
      const endpoint = tab === 'bilan' ? 'bilan'
        : tab === 'cr' ? 'compte_resultat'
        : tab === 'tft'   ? 'tft'
        : 'notes';
      const data = await apiClient.get(`financial-reports/raw-imports/${id}/${endpoint}/`);
      if (tab === 'bilan') setBilanData(data);
      if (tab === 'cr')    setCrData(data);
      if (tab === 'tft')   setTftData(data);
      if (tab === 'notes') setNotesData(data);

    } catch (err) {
      setError(err.response?.data?.detail || 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, [id, bilanData, crData, tftData]);

  useEffect(() => { loadTab('bilan'); }, [loadTab]);


  const tabs = [
    { key: 'bilan', label: 'Bilan',              emoji: '⚖️' },
    { key: 'cr',    label: 'Compte de résultat', emoji: '📊' },
    { key: 'tft',   label: 'Flux de trésorerie', emoji: '💸' },
    { key: 'notes', label: 'Notes annexes',      emoji: '📋' },

  ];

    // Dans currentData :
    const currentData = activeTab === 'bilan' ? bilanData
    : activeTab === 'cr'    ? crData
    : activeTab === 'tft'   ? tftData
    : notesData;


  return (
    <div className="p-6 max-w-full bg-gray-50 min-h-screen">

      {/* En-tête */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 mb-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate(`/financial-reports/import/${id}`)}
              className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg">
              <FiArrowLeft size={20} />
            </button>
            <button onClick={() => navigate(`/financial-reports/statements-syscohada/${id}`)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-800 text-white rounded-lg hover:bg-blue-900 text-sm font-medium">
                📄 Format SYSCOHADA
              </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                États financiers
              </h1>
              {importData && (
                <p className="text-sm text-gray-500 mt-0.5">
                  {importData.name} • Période : {importData.period?.name || '—'}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setBilanData(null); setCrData(null); setTftData(null); setNotesData(null); loadTab(activeTab); }}

              className="flex items-center gap-2 px-3 py-2 text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 text-sm"
            >
              <FiRefreshCw size={14} /> Actualiser
            </button>
          </div>
        </div>
      </div>

      {/* Onglets */}
      <div className="flex gap-1 mb-6 bg-white rounded-xl border border-gray-200 p-1.5 shadow-sm w-fit">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => loadTab(tab.key)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all
              ${activeTab === tab.key
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-gray-600 hover:bg-gray-100'}`}
          >
            <span>{tab.emoji}</span> {tab.label}
          </button>
        ))}
      </div>

      {/* Erreur */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* En-tête du document courant */}
      {currentData && (
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500">
              Période : <strong>{currentData.periode_name}</strong> •
              Généré le <strong>{currentData.date_generation}</strong>
            </p>
          </div>
        </div>
      )}

      {/* Chargement */}
      {loading && (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
        </div>
      )}

      {/* Contenu */}
      {!loading && (
        <>
          {activeTab === 'bilan' && <BilanTab data={bilanData} />}
          {activeTab === 'cr'    && <CompteResultatTab data={crData} />}
          {activeTab === 'tft'   && <TFTTab data={tftData} />}
          {activeTab === 'notes' && <NotesTab data={notesData} />}
        </>
      )}

    </div>
  );



}