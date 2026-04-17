// src/features/financial-reports/pages/statements-syscohada/[id].jsx
// Affichage des états financiers au format officiel SYSCOHADA

import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FiArrowLeft, FiRefreshCw, FiChevronDown, FiChevronRight,
         FiCheckCircle, FiAlertTriangle, FiTrendingUp, FiTrendingDown,
         FiPrinter } from 'react-icons/fi';
import { apiClient } from '../../../../services/apiClient';

// ─────────────────────────────────────────────────────────────────────────────
// FORMAT
// ─────────────────────────────────────────────────────────────────────────────

function fmt(val) {
  if (val == null) return '0';
  const n = parseFloat(val);
  if (isNaN(n)) return '0';
  return n.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function fmtSigned(val) {
  const n = parseFloat(val);
  if (isNaN(n)) return '0';
  const abs = Math.abs(n).toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  return n < 0 ? `(${abs})` : abs;
}

// ─────────────────────────────────────────────────────────────────────────────
// STYLES SYSCOHADA — CSS injecté
// ─────────────────────────────────────────────────────────────────────────────

const syscohadaStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Source+Serif+4:ital,wght@0,300;0,400;0,600;0,700;1,400&family=DM+Mono:wght@400;500&display=swap');

  .syscohada-page {
    font-family: 'Source Serif 4', Georgia, serif;
    background: #f5f2ed;
    min-height: 100vh;
    color: #1a1a1a;
  }

  .syscohada-sheet {
    background: white;
    max-width: 900px;
    margin: 0 auto;
    box-shadow: 0 4px 24px rgba(0,0,0,0.12);
  }

  /* ── En-tête officiel ── */
  .syscohada-header {
    border-bottom: 3px solid #1a3a5c;
    padding: 20px 32px 16px;
    position: relative;
  }
  .syscohada-header-top {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 12px;
  }
  .syscohada-entity-name {
    font-size: 15px;
    font-weight: 700;
    color: #1a1a1a;
    letter-spacing: 0.02em;
  }
  .syscohada-doc-ref {
    text-align: right;
    font-family: 'DM Mono', monospace;
    font-size: 10px;
    color: #666;
    line-height: 1.6;
  }
  .syscohada-address {
    font-size: 11px;
    color: #444;
    margin-bottom: 8px;
  }
  .syscohada-meta {
    display: flex;
    gap: 32px;
    font-size: 11px;
    color: #444;
  }
  .syscohada-meta span strong {
    color: #1a1a1a;
  }
  .syscohada-title {
    text-align: center;
    padding: 16px 32px;
    font-size: 22px;
    font-weight: 700;
    letter-spacing: 0.12em;
    color: #1a3a5c;
    border-bottom: 1px solid #ddd;
    text-transform: uppercase;
  }

  /* ── Tableau ── */
  .syscohada-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 11.5px;
  }

  .syscohada-table thead tr {
    background: #1a3a5c;
    color: white;
  }
  .syscohada-table thead th {
    padding: 8px 10px;
    font-weight: 600;
    letter-spacing: 0.04em;
    font-size: 10px;
    text-transform: uppercase;
    border: 1px solid rgba(255,255,255,0.15);
  }
  .syscohada-table thead th.col-ref  { width: 38px; text-align: center; }
  .syscohada-table thead th.col-lib  { text-align: left; }
  .syscohada-table thead th.col-note { width: 40px; text-align: center; }
  .syscohada-table thead th.col-num  { width: 100px; text-align: right; }

  .syscohada-table th.year-header {
    background: #2a5a8c;
    text-align: center;
    font-size: 10px;
    letter-spacing: 0.06em;
    border-bottom: 2px solid #ffd700;
  }

  /* Lignes */
  .syscohada-table tbody tr td {
    padding: 5px 10px;
    border: 1px solid #d4cfc8;
  }
  .syscohada-table tbody tr td.col-ref {
    text-align: center;
    font-family: 'DM Mono', monospace;
    font-weight: 700;
    font-size: 10px;
    color: #1a3a5c;
    background: #f0eeea;
  }
  .syscohada-table tbody tr td.col-note {
    text-align: center;
    font-family: 'DM Mono', monospace;
    font-size: 10px;
    color: #666;
  }
  .syscohada-table tbody tr td.col-num {
    text-align: right;
    font-family: 'DM Mono', monospace;
    font-size: 11px;
    color: #222;
    padding-right: 12px;
  }
  .syscohada-table tbody tr td.col-lib {
    color: #1a1a1a;
    padding-left: 10px;
  }

  /* Lignes de section (totaux intermédiaires) */
  .row-section td {
    background: #1a3a5c !important;
    color: white !important;
    font-weight: 700 !important;
    font-size: 10.5px !important;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }
  .row-section td.col-ref {
    background: #132d47 !important;
    color: #ffd700 !important;
  }
  .row-section td.col-num {
    color: white !important;
  }

  /* Totaux principaux */
  .row-total td {
    background: #0d2438 !important;
    color: #ffd700 !important;
    font-weight: 700 !important;
    font-size: 11px !important;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }
  .row-total td.col-num {
    color: #ffd700 !important;
  }

  /* Lignes alternées */
  .syscohada-table tbody tr.row-even td { background: white; }
  .syscohada-table tbody tr.row-odd td  { background: #faf9f7; }
  .syscohada-table tbody tr.row-odd td.col-ref,
  .syscohada-table tbody tr.row-even td.col-ref { background: #f0eeea; }

  /* Hover */
  .syscohada-table tbody tr.row-data:hover td { background: #eef4fb !important; }
  .syscohada-table tbody tr.row-data:hover td.col-ref { background: #dde8f5 !important; }

  /* Équilibre */
  .balance-badge {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 20px;
    border-radius: 4px;
    font-size: 12px;
    font-weight: 600;
    margin: 16px 32px;
  }
  .balance-ok  { background: #e8f5e9; color: #2e7d32; border: 1px solid #a5d6a7; }
  .balance-err { background: #ffebee; color: #c62828; border: 1px solid #ef9a9a; }

  /* Onglets */
  .syscohada-tabs {
    display: flex;
    gap: 0;
    border-bottom: 2px solid #1a3a5c;
  }
  .syscohada-tab {
    padding: 10px 20px;
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    border: none;
    background: none;
    cursor: pointer;
    color: #666;
    border-bottom: 3px solid transparent;
    margin-bottom: -2px;
    transition: all 0.15s;
  }
  .syscohada-tab:hover { color: #1a3a5c; background: #f0eeea; }
  .syscohada-tab.active {
    color: #1a3a5c;
    border-bottom-color: #ffd700;
    background: white;
  }

  /* Résultat CR */
  .resultat-box {
    margin: 20px 32px;
    padding: 16px 24px;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .resultat-box.benefice {
    background: #e8f5e9;
    border: 2px solid #4caf50;
  }
  .resultat-box.perte {
    background: #ffebee;
    border: 2px solid #f44336;
  }

  @media print {
    .syscohada-page { background: white; }
    .syscohada-sheet { box-shadow: none; }
    .no-print { display: none !important; }
  }
`;

// ─────────────────────────────────────────────────────────────────────────────
// HEADER OFFICIEL
// ─────────────────────────────────────────────────────────────────────────────

function OfficialHeader({ importData, pageNum, totalPages, title }) {
  return (
    <>
      <div className="syscohada-header">
        <div className="syscohada-header-top">
          <div>
            <div style={{ fontSize: 11, color: '#666', marginBottom: 3 }}>Désignation de l'entité :</div>
            <div className="syscohada-entity-name">{importData?.name || '—'}</div>
          </div>
          <div className="syscohada-doc-ref">
            <div style={{ fontSize: 13, fontWeight: 700, color: '#1a3a5c' }}>- {pageNum} -</div>
            <div>{title?.toUpperCase()}</div>
            <div>PAGE {pageNum}/{totalPages}</div>
          </div>
        </div>
        <div className="syscohada-address">
          Adresse : <strong>IMMEUBLE EROS 5330 - ROUTE DE KPALIMÉ - 08 BP 80171, TEL: 22 50 02 40 LOMÉ - TOGO</strong>
        </div>
        <div className="syscohada-meta">
          <span>N° d'identification fiscale : <strong>{importData?.fiscal_id || '—'}</strong></span>
          <span>Exercice clos le : <strong>{importData?.period?.end_date || '31/12/2024'}</strong></span>
          <span>Durée (en mois) : <strong>12</strong></span>
          <span>Unité monétaire : <strong>F CFA</strong></span>
        </div>
      </div>
      <div className="syscohada-title">{title}</div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BILAN SYSCOHADA
// ─────────────────────────────────────────────────────────────────────────────

// Mapping: structure SYSCOHADA → clés de l'API existante
// L'API retourne des postes groupés. On mappe les refs SYSCOHADA.
// Si ta vraie API retourne une structure différente, adapter ici.

function BilanSyscohadaTab({ data, importData }) {
  if (!data) return null;

  const actif = data.actif || {};
  const passif = data.passif || {};

  // Lignes ACTIF — format SYSCOHADA
  const actifRows = [
    // ── IMMOBILISATIONS INCORPORELLES ──
    { type: 'section', ref: 'AD', label: 'IMMOBILISATIONS INCORPORELLES', note: '3', key: 'immobilisations_incorporelles' },
    { ref: 'AE', label: 'Frais de développement et de prospection',              note: '',  sub: 'immobilisations_incorporelles', subLabel: 'frais_dev' },
    { ref: 'AF', label: 'Brevets, licences, logiciels et droits similaires',      note: '',  sub: 'immobilisations_incorporelles', subLabel: 'brevets' },
    { ref: 'AG', label: 'Fonds commercial et droit au bail',                      note: '',  sub: 'immobilisations_incorporelles', subLabel: 'fonds_commercial' },
    { ref: 'AH', label: 'Autres immobilisations incorporelles',                   note: '',  sub: 'immobilisations_incorporelles', subLabel: 'autres' },
    // ── IMMOBILISATIONS CORPORELLES ──
    { type: 'section', ref: 'AI', label: 'IMMOBILISATIONS CORPORELLES', note: '3', key: 'immobilisations_corporelles' },
    { ref: 'AJ', label: 'Terrains',                                               note: '',  sub: 'immobilisations_corporelles', subLabel: 'terrains' },
    { ref: 'AK', label: 'Bâtiments',                                              note: '',  sub: 'immobilisations_corporelles', subLabel: 'batiments' },
    { ref: 'AL', label: 'Aménagements, Agencements et Installations',             note: '',  sub: 'immobilisations_corporelles', subLabel: 'amenagements' },
    { ref: 'AM', label: 'Matériel, mobilier et actifs biologiques',               note: '',  sub: 'immobilisations_corporelles', subLabel: 'materiel' },
    { ref: 'AN', label: 'Matériel de transport',                                  note: '',  sub: 'immobilisations_corporelles', subLabel: 'transport' },
    { ref: 'AP', label: 'Avances et acomptes versés sur immobilisation',          note: '3', sub: 'immobilisations_corporelles', subLabel: 'avances' },
    // ── IMMOBILISATIONS FINANCIÈRES ──
    { type: 'section', ref: 'AQ', label: 'IMMOBILISATIONS FINANCIÈRES', note: '4', key: 'immobilisations_financieres' },
    { ref: 'AR', label: 'Titres de participation',                                note: '',  sub: 'immobilisations_financieres', subLabel: 'titres' },
    { ref: 'AS', label: 'Autres immobilisations financières',                     note: '',  sub: 'immobilisations_financieres', subLabel: 'autres' },
    // ── TOTAL IMMOBILISÉ ──
    { type: 'total', ref: 'AZ', label: 'TOTAL ACTIF IMMOBILISÉ', computedKey: 'totalImmo' },
    // ── ACTIF CIRCULANT ──
    { ref: 'BA', label: 'ACTIF CIRCULANT H.A.O.',                                 note: '5', key: 'actif_hao', type: 'section' },
    { ref: 'BB', label: 'STOCKS ET ENCOURS',                                      note: '6', key: 'stocks', type: 'section' },
    { ref: 'BG', label: 'CRÉANCES ET EMPLOIS ASSIMILÉS',                          note: '',  type: 'section-light' },
    { ref: 'BH', label: 'Fournisseurs avances versées',                           note: '17', key: 'avances_fournisseurs' },
    { ref: 'BI', label: 'Clients',                                                note: '7',  key: 'creances_clients' },
    { ref: 'BJ', label: 'Autres créances',                                        note: '8',  key: 'autres_creances' },
    { type: 'total', ref: 'BK', label: 'TOTAL ACTIF CIRCULANT', computedKey: 'totalCirc' },
    // ── TRÉSORERIE ACTIF ──
    { ref: 'BQ', label: 'Titres de placement',                                    note: '9',  key: 'titres_placement' },
    { ref: 'BR', label: 'Valeurs à encaisser',                                    note: '10', key: 'valeurs_encaisser' },
    { ref: 'BS', label: 'Banques, chèques postaux, caisse et assimilés',          note: '11', key: 'tresorerie_actif' },
    { type: 'total', ref: 'BT', label: 'TOTAL TRÉSORERIE - ACTIF', computedKey: 'totalTreso' },
    { ref: 'BU', label: 'Écart de conversion - Actif',                            note: '12', key: 'ecart_conversion_actif' },
    { type: 'grand-total', ref: 'BZ', label: 'TOTAL GÉNÉRAL', computedKey: 'totalActif' },
  ];

  const passifRows = [
    { ref: 'CA', label: 'Capital',                                               note: '13', key: 'capital' },
    { ref: 'CB', label: 'Apporteurs capital non appelé (-)',                     note: '13', key: 'apporteurs_non_appele' },
    { ref: 'CD', label: 'Primes liées au capital social',                        note: '14', key: 'primes_capital' },
    { ref: 'CE', label: 'Écart de réévaluation',                                 note: '3e', key: 'ecart_reevaluation' },
    { ref: 'CF', label: 'Réserves indisponibles',                                note: '14', key: 'reserves_indisponibles' },
    { ref: 'CG', label: 'Réserves libres',                                       note: '14', key: 'reserves_libres' },
    { ref: 'CH', label: 'Report à nouveau (+ou-)',                               note: '14', key: 'report_resultat' },
    { ref: 'CJ', label: "Résultat net de l'exercice (bénéfice + ou perte -)",   note: '',   key: 'resultat_net_passif' },
    { ref: 'CL', label: "Subventions d'investissement",                          note: '15', key: 'subventions' },
    { ref: 'CM', label: 'Provisions réglementées',                               note: '15', key: 'provisions_reglementees' },
    { type: 'total', ref: 'CP', label: 'TOTAL CAPITAUX PROPRES ET RESSOURCES ASSIMILÉES', computedKey: 'totalCP' },
    { ref: 'DA', label: 'Emprunts et dettes financières diverses',               note: '16', key: 'dettes_financieres' },
    { ref: 'DB', label: 'Dettes de location acquisition',                        note: '16', key: 'dettes_location' },
    { ref: 'DC', label: 'Provisions pour risques et charges',                    note: '16', key: 'provisions_risques' },
    { type: 'total', ref: 'DD', label: 'TOTAL DETTES FINANCIÈRES ET RESSOURCES ASSIMILÉES', computedKey: 'totalDettesFinancieres' },
    { type: 'grand-total', ref: 'DF', label: 'TOTAL RESSOURCES STABLES', computedKey: 'totalRessourcesStables' },
    // ── PASSIF CIRCULANT ──
    { ref: 'DH', label: 'Dettes circulantes H.A.O.',                            note: '5',  key: 'dettes_hao' },
    { ref: 'DI', label: 'Clients, avances reçues',                              note: '7',  key: 'avances_clients' },
    { ref: 'DJ', label: "Fournisseurs d'exploitation",                           note: '17', key: 'dettes_fournisseurs' },
    { ref: 'DK', label: 'Dettes fiscales et sociales',                          note: '18', key: 'dettes_fiscales_sociales' },
    { ref: 'DM', label: 'Autres dettes',                                         note: '19', key: 'autres_dettes' },
    { ref: 'DN', label: 'Provisions pour risques à court terme',                 note: '19', key: 'provisions_court_terme' },
    { type: 'total', ref: 'DP', label: 'TOTAL PASSIF CIRCULANT', computedKey: 'totalPassifCirc' },
    // ── TRÉSORERIE PASSIF ──
    { ref: 'DQ', label: "Banques, crédit d'escompte",                            note: '20', key: 'tresorerie_passif_escompte' },
    { ref: 'DR', label: 'Banques, établissements financiers et crédit de trésorerie', note: '20', key: 'tresorerie_passif' },
    { type: 'total', ref: 'DT', label: 'TOTAL TRÉSORERIE-PASSIF', computedKey: 'totalTresoPassif' },
    { ref: 'DV', label: 'Écart de conversion - Passif',                          note: '12', key: 'ecart_conversion_passif' },
    { type: 'grand-total', ref: 'DZ', label: 'TOTAL GÉNÉRAL', computedKey: 'totalPassif' },
  ];

  // Fonctions de récupération de valeurs depuis l'API
  const getActifVal = (key) => actif[key]?.solde ?? 0;
  const getPassifVal = (key) => passif[key]?.solde ?? 0;
  const getDetail = (key) => actif[key]?.detail || passif[key]?.detail || [];

  // Calculés
  const computed = {
    totalImmo: (actif.immobilisations_incorporelles?.solde || 0)
             + (actif.immobilisations_corporelles?.solde || 0)
             + (actif.immobilisations_financieres?.solde || 0),
    totalCirc: (actif.actif_hao?.solde || 0)
             + (actif.stocks?.solde || 0)
             + (actif.avances_fournisseurs?.solde || 0)
             + (actif.creances_clients?.solde || 0)
             + (actif.autres_creances?.solde || 0),
    totalTreso: (actif.titres_placement?.solde || 0)
              + (actif.valeurs_encaisser?.solde || 0)
              + (actif.tresorerie_actif?.solde || 0),
    totalActif: data.total_actif || 0,
    totalCP: (passif.capital_reserves?.solde || 0) + (passif.report_resultat?.solde || 0) + (data.resultat_net || 0),
    totalDettesFinancieres: (passif.dettes_financieres?.solde || 0),
    totalRessourcesStables: (passif.capital_reserves?.solde || 0) + (passif.report_resultat?.solde || 0) + (data.resultat_net || 0) + (passif.dettes_financieres?.solde || 0),
    totalPassifCirc: (passif.dettes_fournisseurs?.solde || 0) + (passif.dettes_fiscales_sociales?.solde || 0) + (passif.autres_dettes?.solde || 0),
    totalTresoPassif: (passif.tresorerie_passif?.solde || 0),
    totalPassif: data.total_passif || 0,
  };

  // Rendu d'une cellule valeur (Brut / Amort / Net)
  // Pour l'instant on n'a pas le brut/amort distincts → on affiche Net seulement
  const renderRow = (row, idx, getVal, computedVals) => {
    const isEven = idx % 2 === 0;
    const baseClass = `row-data ${isEven ? 'row-even' : 'row-odd'}`;

    if (row.type === 'section') {
      const val = row.key ? getVal(row.key) : (computedVals[row.computedKey] ?? 0);
      return (
        <tr key={row.ref} className="row-section">
          <td className="col-ref">{row.ref}</td>
          <td className="col-lib">{row.label}</td>
          <td className="col-note">{row.note || ''}</td>
          <td className="col-num">{fmt(val)}</td>
          <td className="col-num">{fmt(val)}</td>
          <td className="col-num">{fmt(val)}</td>
          <td className="col-num">0</td>
        </tr>
      );
    }

    if (row.type === 'section-light') {
      return (
        <tr key={row.ref} style={{ background: '#e8e4dd' }}>
          <td className="col-ref" style={{ color: '#1a3a5c', fontWeight: 700, fontSize: 10, background: '#ddd9d2' }}>{row.ref}</td>
          <td className="col-lib" style={{ fontWeight: 700, fontSize: 10.5, color: '#1a3a5c', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{row.label}</td>
          <td className="col-note">{row.note || ''}</td>
          <td className="col-num" style={{ fontWeight: 700 }}>—</td>
          <td className="col-num" style={{ fontWeight: 700 }}>—</td>
          <td className="col-num" style={{ fontWeight: 700 }}>—</td>
          <td className="col-num" style={{ fontWeight: 700 }}>—</td>
        </tr>
      );
    }

    if (row.type === 'total') {
      const val = computedVals[row.computedKey] ?? 0;
      return (
        <tr key={row.ref} className="row-section">
          <td className="col-ref">{row.ref}</td>
          <td className="col-lib">{row.label}</td>
          <td className="col-note"></td>
          <td className="col-num">{fmt(val)}</td>
          <td className="col-num">0</td>
          <td className="col-num">{fmt(val)}</td>
          <td className="col-num">0</td>
        </tr>
      );
    }

    if (row.type === 'grand-total') {
      const val = computedVals[row.computedKey] ?? 0;
      return (
        <tr key={row.ref} className="row-total">
          <td className="col-ref">{row.ref}</td>
          <td className="col-lib">{row.label}</td>
          <td className="col-note"></td>
          <td className="col-num">{fmt(val)}</td>
          <td className="col-num">0</td>
          <td className="col-num">{fmt(val)}</td>
          <td className="col-num">0</td>
        </tr>
      );
    }

    // Ligne normale
    const val = row.key ? getVal(row.key) : 0;
    return (
      <tr key={row.ref} className={baseClass}>
        <td className="col-ref">{row.ref}</td>
        <td className="col-lib">{row.label}</td>
        <td className="col-note">{row.note || ''}</td>
        <td className="col-num">{fmt(val)}</td>
        <td className="col-num">0</td>
        <td className="col-num">{fmt(val)}</td>
        <td className="col-num">0</td>
      </tr>
    );
  };

  return (
    <div style={{ padding: '0 0 32px' }}>
      {/* ── PAGE 1 : ACTIF ── */}
      <OfficialHeader importData={importData} pageNum={1} totalPages={2} title="BILAN" />

      <table className="syscohada-table">
        <thead>
          <tr>
            <th className="col-ref" rowSpan={2}>Réf.</th>
            <th className="col-lib" rowSpan={2}>ACTIF</th>
            <th className="col-note" rowSpan={2}>NOTE</th>
            <th colSpan={3} className="year-header">Exercice 2024</th>
            <th className="col-num year-header">Exercice 2023</th>
          </tr>
          <tr>
            <th className="col-num">Brut</th>
            <th className="col-num">Amort. / Déprec.</th>
            <th className="col-num">Net</th>
            <th className="col-num">Net</th>
          </tr>
        </thead>
        <tbody>
          {actifRows.map((row, idx) => renderRow(row, idx, getActifVal, computed))}
        </tbody>
      </table>

      {/* ── PAGE 2 : PASSIF ── */}
      <div style={{ marginTop: 40, borderTop: '3px solid #1a3a5c', paddingTop: 0 }}>
        <OfficialHeader importData={importData} pageNum={2} totalPages={2} title="BILAN" />
      </div>

      <table className="syscohada-table">
        <thead>
          <tr>
            <th className="col-ref">Réf.</th>
            <th className="col-lib">PASSIF</th>
            <th className="col-note">Note</th>
            <th className="col-num year-header">Exercice 2024</th>
            <th className="col-num year-header">Exercice 2023</th>
          </tr>
        </thead>
        <tbody>
          {passifRows.map((row, idx) => {
            const isEven = idx % 2 === 0;

            if (row.type === 'total') {
              const val = computed[row.computedKey] ?? 0;
              return (
                <tr key={row.ref} className="row-section">
                  <td className="col-ref">{row.ref}</td>
                  <td className="col-lib">{row.label}</td>
                  <td className="col-note"></td>
                  <td className="col-num">{fmt(val)}</td>
                  <td className="col-num">0</td>
                </tr>
              );
            }
            if (row.type === 'grand-total') {
              const val = computed[row.computedKey] ?? 0;
              return (
                <tr key={row.ref} className="row-total">
                  <td className="col-ref">{row.ref}</td>
                  <td className="col-lib">{row.label}</td>
                  <td className="col-note"></td>
                  <td className="col-num">{fmt(val)}</td>
                  <td className="col-num">0</td>
                </tr>
              );
            }

            // Ligne normale passif (2 colonnes valeur seulement)
            const val = row.key === 'resultat_net_passif'
              ? (data.resultat_net || 0)
              : getPassifVal(row.key);

            return (
              <tr key={row.ref} className={`row-data ${isEven ? 'row-even' : 'row-odd'}`}>
                <td className="col-ref">{row.ref}</td>
                <td className="col-lib">{row.label}</td>
                <td className="col-note">{row.note || ''}</td>
                <td className="col-num">{fmt(val)}</td>
                <td className="col-num">0</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Équilibre */}
      <div className={`balance-badge ${data.est_equilibre ? 'balance-ok' : 'balance-err'}`}>
        {data.est_equilibre
          ? <><FiCheckCircle size={16} /> Bilan équilibré — Actif = Passif = {fmt(data.total_actif)} F CFA</>
          : <><FiAlertTriangle size={16} /> Bilan non équilibré — Écart : {fmt(Math.abs((data.total_actif || 0) - (data.total_passif || 0)))} F CFA</>
        }
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPTE DE RÉSULTAT SYSCOHADA
// ─────────────────────────────────────────────────────────────────────────────

function CRSyscohadaTab({ data, importData }) {
  if (!data) return null;

  const chargeRows = Object.entries(data.charges || {}).map(([key, item]) => ({ key, ...item }));
  const produitRows = Object.entries(data.produits || {}).map(([key, item]) => ({ key, ...item }));

  return (
    <div style={{ padding: '0 0 32px' }}>
      <OfficialHeader importData={importData} pageNum={1} totalPages={1} title="COMPTE DE RÉSULTAT" />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
        {/* CHARGES */}
        <div style={{ borderRight: '2px solid #1a3a5c' }}>
          <div style={{ background: '#c62828', color: 'white', padding: '8px 16px', fontWeight: 700, fontSize: 12, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            CHARGES
          </div>
          <table className="syscohada-table">
            <thead>
              <tr>
                <th className="col-lib" style={{ textAlign: 'left' }}>Libellé</th>
                <th className="col-num year-header">2024</th>
                <th className="col-num year-header">2023</th>
              </tr>
            </thead>
            <tbody>
              {chargeRows.map((item, idx) => (
                <tr key={item.key} className={`row-data ${idx % 2 === 0 ? 'row-even' : 'row-odd'}`}>
                  <td className="col-lib">{item.libelle}</td>
                  <td className="col-num">{fmt(item.solde)}</td>
                  <td className="col-num">0</td>
                </tr>
              ))}
              <tr className="row-section">
                <td className="col-lib">TOTAL CHARGES</td>
                <td className="col-num">{fmt(data.total_charges)}</td>
                <td className="col-num">0</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* PRODUITS */}
        <div>
          <div style={{ background: '#1a6b3c', color: 'white', padding: '8px 16px', fontWeight: 700, fontSize: 12, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            PRODUITS
          </div>
          <table className="syscohada-table">
            <thead>
              <tr>
                <th className="col-lib" style={{ textAlign: 'left' }}>Libellé</th>
                <th className="col-num year-header">2024</th>
                <th className="col-num year-header">2023</th>
              </tr>
            </thead>
            <tbody>
              {produitRows.map((item, idx) => (
                <tr key={item.key} className={`row-data ${idx % 2 === 0 ? 'row-even' : 'row-odd'}`}>
                  <td className="col-lib">{item.libelle}</td>
                  <td className="col-num">{fmt(item.solde)}</td>
                  <td className="col-num">0</td>
                </tr>
              ))}
              <tr className="row-section">
                <td className="col-lib">TOTAL PRODUITS</td>
                <td className="col-num">{fmt(data.total_produits)}</td>
                <td className="col-num">0</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Résultat net */}
      <div className={`resultat-box ${data.est_benefice ? 'benefice' : 'perte'}`}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {data.est_benefice
            ? <FiTrendingUp size={22} color="#2e7d32" />
            : <FiTrendingDown size={22} color="#c62828" />
          }
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: data.est_benefice ? '#1b5e20' : '#b71c1c' }}>
              {data.est_benefice ? "Bénéfice net de l'exercice" : "Perte nette de l'exercice"}
            </div>
            <div style={{ fontSize: 11, color: '#666', marginTop: 2 }}>Produits − Charges = Résultat</div>
          </div>
        </div>
        <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 20, fontWeight: 700, color: data.est_benefice ? '#2e7d32' : '#c62828' }}>
          {fmtSigned(data.resultat_net)} F CFA
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TFT SYSCOHADA
// ─────────────────────────────────────────────────────────────────────────────

function TFTSyscohadaTab({ data, importData }) {
  if (!data) return null;

  const FluxTable = ({ titre, items, total, refTotal, color }) => (
    <div style={{ marginBottom: 24 }}>
      <div style={{ background: color, color: 'white', padding: '8px 16px', fontWeight: 700, fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
        {titre}
      </div>
      <table className="syscohada-table">
        <thead>
          <tr>
            <th className="col-lib" style={{ textAlign: 'left' }}>Libellé</th>
            <th className="col-num year-header">2024</th>
            <th className="col-num year-header">2023</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(items).map(([key, item], idx) => (
            <tr key={key} className={`row-data ${idx % 2 === 0 ? 'row-even' : 'row-odd'}`}>
              <td className="col-lib">{item.libelle}</td>
              <td className="col-num" style={{ color: item.solde >= 0 ? '#2e7d32' : '#c62828' }}>{fmtSigned(item.solde)}</td>
              <td className="col-num">0</td>
            </tr>
          ))}
          <tr className="row-section">
            <td className="col-lib">{refTotal} — Flux net</td>
            <td className="col-num" style={{ color: total >= 0 ? 'white' : '#ffcdd2' }}>{fmtSigned(total)}</td>
            <td className="col-num">0</td>
          </tr>
        </tbody>
      </table>
    </div>
  );

  return (
    <div style={{ padding: '0 0 32px' }}>
      <OfficialHeader importData={importData} pageNum={1} totalPages={1} title="TABLEAU DES FLUX DE TRÉSORERIE" />
      <div style={{ padding: '0 32px' }}>
        <FluxTable titre="Flux de trésorerie liés aux activités opérationnelles" items={data.exploitation} total={data.flux_exploitation} refTotal="FA" color="#1a3a5c" />
        <FluxTable titre="Flux de trésorerie liés aux activités d'investissement" items={data.investissement} total={data.flux_investissement} refTotal="FB" color="#795548" />
        <FluxTable titre="Flux de trésorerie liés aux activités de financement" items={data.financement} total={data.flux_financement} refTotal="FC" color="#4a148c" />

        {/* Synthèse */}
        <table className="syscohada-table" style={{ marginTop: 8 }}>
          <thead>
            <tr>
              <th className="col-lib" style={{ textAlign: 'left' }}>Synthèse de trésorerie</th>
              <th className="col-num year-header">2024</th>
              <th className="col-num year-header">2023</th>
            </tr>
          </thead>
          <tbody>
            <tr className="row-data row-even">
              <td className="col-lib">Trésorerie à l'ouverture de l'exercice</td>
              <td className="col-num">{fmtSigned(data.tresorerie_ouverture)}</td>
              <td className="col-num">0</td>
            </tr>
            <tr className="row-data row-odd">
              <td className="col-lib">Variation nette de trésorerie</td>
              <td className="col-num" style={{ color: data.variation_tresorerie >= 0 ? '#2e7d32' : '#c62828' }}>{fmtSigned(data.variation_tresorerie)}</td>
              <td className="col-num">0</td>
            </tr>
            <tr className="row-section">
              <td className="col-lib">TRÉSORERIE À LA CLÔTURE DE L'EXERCICE</td>
              <td className="col-num">{fmtSigned(data.tresorerie_cloture)}</td>
              <td className="col-num">0</td>
            </tr>
          </tbody>
        </table>
        <div className={`balance-badge ${data.est_coherent ? 'balance-ok' : 'balance-err'}`} style={{ margin: '16px 0' }}>
          {data.est_coherent
            ? <><FiCheckCircle size={16} /> Flux cohérents — Variation = Clôture − Ouverture</>
            : <><FiAlertTriangle size={16} /> Incohérence détectée dans les flux</>
          }
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// NOTES SYSCOHADA
// ─────────────────────────────────────────────────────────────────────────────

function NotesSyscohadaTab({ data, importData }) {
  if (!data) return null;

  return (
    <div style={{ padding: '0 0 32px' }}>
      <OfficialHeader importData={importData} pageNum={1} totalPages={1} title="NOTES ANNEXES" />
      <div style={{ padding: '0 32px' }}>
        {data.notes.length === 0 && (
          <div style={{ textAlign: 'center', padding: 40, color: '#999', fontSize: 13 }}>
            Aucune note annexe générée pour cet import.
          </div>
        )}
        {data.notes.map(note => (
          <div key={note.numero} style={{ marginBottom: 28 }}>
            <div style={{ background: '#1a3a5c', color: 'white', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ background: '#ffd700', color: '#1a3a5c', fontWeight: 700, fontSize: 10, padding: '2px 8px', borderRadius: 2 }}>
                Note {note.numero}
              </span>
              <span style={{ fontWeight: 600, fontSize: 12, letterSpacing: '0.04em' }}>{note.titre}</span>
            </div>
            <table className="syscohada-table">
              <thead>
                <tr>
                  {note.colonnes.map((col, i) => (
                    <th key={i} className={i < 2 ? 'col-lib' : 'col-num'} style={{ textAlign: i < 2 ? 'left' : 'right' }}>
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {note.lignes.map((ligne, i) => (
                  <tr key={i} className={`row-data ${i % 2 === 0 ? 'row-even' : 'row-odd'}`}>
                    <td className="col-ref" style={{ fontFamily: 'DM Mono, monospace', fontSize: 10 }}>{ligne.code}</td>
                    <td className="col-lib">{ligne.label}</td>
                    {note.type === 'tableau_mouvements' ? <>
                      <td className="col-num">{fmt(ligne.val_debut)}</td>
                      <td className="col-num" style={{ color: '#2e7d32' }}>{fmt(ligne.acquisitions)}</td>
                      <td className="col-num" style={{ color: '#c62828' }}>{fmt(ligne.cessions)}</td>
                      <td className="col-num" style={{ fontWeight: 700 }}>{fmt(ligne.val_fin)}</td>
                    </> : note.colonnes.length === 4 ? <>
                      <td className="col-num">{fmt(ligne.ouverture)}</td>
                      <td className="col-num" style={{ fontWeight: 700 }}>{fmt(ligne.cloture)}</td>
                    </> : <>
                      <td className="col-num">{fmt(ligne.debit)}</td>
                      <td className="col-num">{fmt(ligne.credit)}</td>
                      <td className="col-num" style={{ fontWeight: 700 }}>{fmt(ligne.solde)}</td>
                    </>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE PRINCIPALE
// ─────────────────────────────────────────────────────────────────────────────

export default function FinancialStatementsSyscohada() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('bilan');
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState(null);
  const [importData, setImportData] = useState(null);

  const [bilanData, setBilanData] = useState(null);
  const [crData, setCrData]       = useState(null);
  const [tftData, setTftData]     = useState(null);
  const [notesData, setNotesData] = useState(null);

  useEffect(() => {
    apiClient.get(`financial-reports/raw-imports/${id}/`)
      .then(setImportData)
      .catch(() => setError('Import introuvable'));
  }, [id]);

  const loadTab = useCallback(async (tab) => {
    setActiveTab(tab);
    if (tab === 'bilan' && bilanData) return;
    if (tab === 'cr'    && crData)    return;
    if (tab === 'tft'   && tftData)   return;
    if (tab === 'notes' && notesData) return;

    setLoading(true);
    setError(null);
    try {
      const endpoint = tab === 'bilan' ? 'bilan'
        : tab === 'cr'    ? 'compte_resultat'
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
  }, [id, bilanData, crData, tftData, notesData]);

  useEffect(() => { loadTab('bilan'); }, [loadTab]);

  const tabs = [
    { key: 'bilan', label: 'Bilan',               emoji: '⚖️' },
    { key: 'cr',    label: 'Compte de résultat',  emoji: '📊' },
    { key: 'tft',   label: 'Flux de trésorerie',  emoji: '💸' },
    { key: 'notes', label: 'Notes annexes',        emoji: '📋' },
  ];

  const currentData = activeTab === 'bilan' ? bilanData
    : activeTab === 'cr'    ? crData
    : activeTab === 'tft'   ? tftData
    : notesData;

  return (
    <div className="syscohada-page">
      <style>{syscohadaStyles}</style>

      {/* Barre de navigation — hors de la feuille imprimable */}
      <div className="no-print" style={{
        background: '#0d2438',
        padding: '10px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        position: 'sticky',
        top: 0,
        zIndex: 50,
        boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => navigate(`/financial-reports/statements/${id}`)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 12px', borderRadius: 6,
              background: 'rgba(255,255,255,0.08)',
              color: '#ccc', border: '1px solid rgba(255,255,255,0.12)',
              fontSize: 12, cursor: 'pointer', fontFamily: 'inherit'
            }}
          >
            <FiArrowLeft size={14} /> Vue standard
          </button>
          <div style={{ color: 'white', fontSize: 13, fontWeight: 600, fontFamily: 'Source Serif 4, serif' }}>
            📄 Format officiel SYSCOHADA
            {importData && (
              <span style={{ color: '#ffd700', marginLeft: 8, fontSize: 11, fontWeight: 400 }}>
                — {importData.name}
              </span>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => { setBilanData(null); setCrData(null); setTftData(null); setNotesData(null); loadTab(activeTab); }}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 12px', borderRadius: 6,
              background: 'rgba(255,255,255,0.08)',
              color: '#ccc', border: '1px solid rgba(255,255,255,0.12)',
              fontSize: 12, cursor: 'pointer', fontFamily: 'inherit'
            }}
          >
            <FiRefreshCw size={13} /> Actualiser
          </button>
          <button
            onClick={() => window.print()}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 14px', borderRadius: 6,
              background: '#ffd700', color: '#0d2438',
              border: 'none', fontSize: 12, fontWeight: 700,
              cursor: 'pointer', fontFamily: 'inherit'
            }}
          >
            <FiPrinter size={13} /> Imprimer
          </button>
        </div>
      </div>

      {/* Onglets */}
      <div className="no-print" style={{ background: 'white', borderBottom: '2px solid #1a3a5c', padding: '0 24px', maxWidth: 900, margin: '0 auto' }}>
        <div className="syscohada-tabs">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => loadTab(tab.key)}
              className={`syscohada-tab ${activeTab === tab.key ? 'active' : ''}`}
            >
              {tab.emoji} {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Erreur */}
      {error && (
        <div className="no-print" style={{ maxWidth: 900, margin: '12px auto', padding: '12px 20px', background: '#ffebee', border: '1px solid #ef9a9a', borderRadius: 6, color: '#c62828', fontSize: 13 }}>
          {error}
        </div>
      )}

      {/* Spinner */}
      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
          <div style={{ width: 36, height: 36, border: '3px solid #ddd', borderTopColor: '#1a3a5c', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {/* Contenu principal — la feuille officielle */}
      {!loading && (
        <div className="syscohada-sheet" style={{ marginTop: 0 }}>
          {activeTab === 'bilan' && <BilanSyscohadaTab data={bilanData} importData={importData} />}
          {activeTab === 'cr'    && <CRSyscohadaTab    data={crData}    importData={importData} />}
          {activeTab === 'tft'   && <TFTSyscohadaTab   data={tftData}   importData={importData} />}
          {activeTab === 'notes' && <NotesSyscohadaTab data={notesData} importData={importData} />}
        </div>
      )}
    </div>
    
  );
  
}