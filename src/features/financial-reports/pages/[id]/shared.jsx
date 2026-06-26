// C:\python\django\somane_fronten\somane_frontend\src\features\financial-reports\pages\statements-syscohada\shared.jsx
// shared.jsx — Composants et utilitaires partagés entre tous les fichiers SYSCOHADA

// ─────────────────────────────────────────────────────────────────────────────
// FORMAT
// ─────────────────────────────────────────────────────────────────────────────

export function fmt(val) {
  if (val == null) return '0';
  const n = parseFloat(val);
  if (isNaN(n)) return '0';
  return n.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export function fmtSigned(val) {
  const n = parseFloat(val);
  if (isNaN(n)) return '0';
  const abs = Math.abs(n).toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  return n < 0 ? `(${abs})` : abs;
}

// ─────────────────────────────────────────────────────────────────────────────
// UTILITAIRES DATE
// ─────────────────────────────────────────────────────────────────────────────

// "2024-12-31" → "31/12/2024"
export function fmtDate(d) {
  if (!d) return '—';
  const parts = String(d).split('-');
  if (parts.length !== 3) return d;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

// Calcule le nombre de mois entre date_start et date_end (inclus)
export function dureeMois(dateStart, dateEnd) {
  if (!dateStart || !dateEnd) return '—';
  const d1 = new Date(dateStart);
  const d2 = new Date(dateEnd);
  if (isNaN(d1) || isNaN(d2)) return '—';
  return (d2.getFullYear() - d1.getFullYear()) * 12 + (d2.getMonth() - d1.getMonth()) + 1;
}

// ─────────────────────────────────────────────────────────────────────────────
// CATALOGUE NOTES
// ─────────────────────────────────────────────────────────────────────────────

export const NOTES_CATALOGUE = [
  { id: 'note1',  num: 'Note 1',  title: 'Dettes garanties par des sûretés réelles',                           page: 13 },
  { id: 'note2',  num: 'Note 2',  title: 'Informations obligatoires',                                           page: 14 },
  { id: 'note3a', num: 'Note 3A', title: 'Immobilisation brute',                                                page: 15 },
  { id: 'note3b', num: 'Note 3B', title: 'Biens pris en location acquisition',                                  page: 16 },
  { id: 'note3c', num: 'Note 3C', title: 'Immobilisations (amortissements)',                                     page: 17 },
  { id: 'note3d', num: 'Note 3D', title: 'Plus-values et moins-values de cessions',                             page: 18 },
  { id: 'note3e', num: 'Note 3E', title: "Informations sur les réévaluations effectuées par l'entité",          page: 19 },
  { id: 'note4',  num: 'Note 4',  title: 'Immobilisations financières',                                         page: 20 },
  { id: 'note5',  num: 'Note 5',  title: 'Opérations hors activités ordinaires (HAO)',                          page: 21 },
  { id: 'note6',  num: 'Note 6',  title: 'Stocks et encours',                                                   page: 22 },
  { id: 'note7',  num: 'Note 7',  title: 'Clients, débiteurs et créances rattachées',                           page: 23 },
  { id: 'note8',  num: 'Note 8',  title: 'Autres créances',                                                     page: 24 },
  { id: 'note9',  num: 'Note 9',  title: 'Titres de placement',                                                 page: 25 },
  { id: 'note10', num: 'Note 10', title: 'Valeurs à encaisser',                                                  page: 26 },
  { id: 'note11', num: 'Note 11', title: 'Trésorerie actif',                                                     page: 27 },
  { id: 'note12', num: 'Note 12', title: 'Écarts de conversion',                                                 page: 28 },
  { id: 'note13', num: 'Note 13', title: 'Capital',                                                              page: 29 },
  { id: 'note14', num: 'Note 14', title: 'Réserves et résultats',                                                page: 30 },
  { id: 'note15', num: 'Note 15', title: "Subventions d'investissement et provisions réglementées",              page: 31 },
  { id: 'note16', num: 'Note 16', title: 'Emprunts et dettes financières diverses',                              page: 32 },
  { id: 'note17', num: 'Note 17', title: 'Fournisseurs et comptes rattachés',                                    page: 33 },
  { id: 'note18', num: 'Note 18', title: 'Dettes fiscales et sociales',                                          page: 34 },
  { id: 'note19', num: 'Note 19', title: 'Autres dettes et provisions pour risques à court terme',               page: 35 },
  { id: 'note20', num: 'Note 20', title: 'Trésorerie passif',                                                    page: 36 },
  { id: 'note21', num: 'Note 21', title: "Chiffre d'affaires et autres produits",                                page: 37 },
  { id: 'note22', num: 'Note 22', title: 'Achats',                                                               page: 38 },
  { id: 'note23', num: 'Note 23', title: 'Transports',                                                           page: 39 },
  { id: 'note24', num: 'Note 24', title: 'Services extérieurs',                                                  page: 40 },
  { id: 'note25', num: 'Note 25', title: 'Impôts et taxes',                                                      page: 41 },
  { id: 'note26', num: 'Note 26', title: 'Autres charges',                                                       page: 42 },
  { id: 'note27', num: 'Note 27', title: 'Charges de personnel',                                                 page: 43 },
  { id: 'note28', num: 'Note 28', title: 'Provisions et dépréciations',                                          page: 44 },
  { id: 'note29', num: 'Note 29', title: 'Revenus et frais financiers',                                          page: 45 },
  { id: 'note30', num: 'Note 30', title: 'Informations complémentaires HAO et impôt',                            page: 46 },
];

// Lookup note par numéro (ex: "21" → note21)
export function noteIdFromNumber(noteNum) {
  if (!noteNum) return null;
  const str = String(noteNum).trim().toLowerCase();
  // Cas spéciaux ex: "3C&28" → on prend "3c"
  const clean = str.split('&')[0].trim().replace(/\s+/g, '');
  const target = `note${clean}`;
  const found = NOTES_CATALOGUE.find(n => n.id === target);
  return found?.id || null;
}

// ─────────────────────────────────────────────────────────────────────────────
// EN-TÊTE OFFICIELLE
// Props :
//   entite  — objet retourné par /api/entites/{id}/  (avec devise_details)
//   periode — objet retourné par /api/financial-report-periods/{id}/
// ─────────────────────────────────────────────────────────────────────────────

export function OfficialHeader({ entite, periode, pageNum, totalPages, docType, title, subtitle }) {

  // Adresse : on concatène adresse + complement_adresse si présent
  const adresse = [entite?.adresse, entite?.complement_adresse]
    .filter(Boolean)
    .join(' — ');

  // Devise : priorité au symbole, sinon le code, sinon tiret
  const devise = entite?.devise_details?.symbole
    || entite?.devise_details?.code
    || '—';

  return (
    <>
      <div className="sysc-header">
        <div className="sysc-header-top">
          <div style={{ flex: 1 }}>
            <div className="sysc-entity-row">
              <span className="sysc-entity-label">Désignation de l'entité :</span>
              <span className="sysc-entity-value">{entite?.raison_sociale || '—'}</span>
            </div>
          </div>
          <div className="sysc-doc-type">
            <div>— {pageNum} —</div>
            <div style={{ marginTop: 2 }}>{docType}</div>
            <div>PAGE {pageNum}/{totalPages}</div>
          </div>
        </div>
        <div className="sysc-sigle-row">
          <span>Sigle usuel :</span>
        </div>
        <div className="sysc-address-row">
          Adresse : <strong>{adresse || '—'}</strong>
        </div>
        <div className="sysc-meta-row">
          <span>N° d'identification fiscale : <strong>{entite?.numero_fiscal || '—'}</strong></span>
          <span>Exercice clos le : <strong>{fmtDate(periode?.date_end)}</strong></span>
          <span>Durée (en mois) : <strong>{dureeMois(periode?.date_start, periode?.date_end)}</strong></span>
        </div>
        <div className="sysc-meta-row" style={{ marginTop: 2 }}>
          <span>Unité monétaire : <strong>{devise}</strong></span>
        </div>
      </div>

      {/* Titre centré */}
      <div style={{ textAlign: 'center', padding: '10px 16px 2px', fontWeight: 700, fontSize: 13, color: '#333', letterSpacing: '0.04em' }}>
        {title}
      </div>
      {subtitle && (
        <div style={{ textAlign: 'center', padding: '2px 16px 10px', fontWeight: 700, fontSize: 15, color: '#1a3a5c', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid #999' }}>
          {subtitle}
        </div>
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CSS GLOBAL SYSCOHADA
// ─────────────────────────────────────────────────────────────────────────────

export const syscohadaStyles = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&display=swap');

  * { box-sizing: border-box; }

  .sysc-page {
    font-family: Arial, sans-serif;
    background: #e8e8e8;
    min-height: 100vh;
    color: #1a1a1a;
  }

  .sysc-sheet {
    background: white;
    max-width: 960px;
    margin: 0 auto;
    box-shadow: 0 2px 12px rgba(0,0,0,0.15);
  }

  /* ── En-tête ── */
  .sysc-header {
    padding: 10px 16px 8px;
    border-bottom: 1px solid #333;
    font-size: 11px;
    font-family: Arial, sans-serif;
  }
  .sysc-header-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 4px; }
  .sysc-page-ref { text-align: center; font-weight: 700; font-size: 13px; border: 1px solid #333; padding: 2px 12px; min-width: 60px; }
  .sysc-doc-type { text-align: right; font-size: 10px; font-weight: 700; border: 1px solid #333; padding: 3px 8px; line-height: 1.5; }
  .sysc-entity-row { display: flex; gap: 24px; margin-bottom: 3px; font-size: 11px; }
  .sysc-entity-label { color: #333; }
  .sysc-entity-value { font-weight: 700; }
  .sysc-address-row { font-size: 10.5px; margin-bottom: 3px; }
  .sysc-meta-row { display: flex; gap: 20px; font-size: 10.5px; flex-wrap: wrap; }
  .sysc-meta-row span { white-space: nowrap; }
  .sysc-meta-row strong { font-weight: 700; }
  .sysc-sigle-row { display: flex; justify-content: flex-end; font-size: 10.5px; margin-bottom: 2px; }

  /* ── Tableau ── */
  .sysc-table { width: 100%; border-collapse: collapse; font-size: 10.5px; font-family: Arial, sans-serif; }
  .sysc-table .th-main {
    background: #1a3a5c; color: white; font-weight: 700; font-size: 10px;
    text-transform: uppercase; letter-spacing: 0.03em;
    padding: 6px 6px; border: 1px solid #0d2438; text-align: center;
  }
  .sysc-table .th-main.left { text-align: left; }
  .sysc-table .th-year {
    background: #2a5a8c; color: white; font-weight: 700; font-size: 9px;
    text-transform: uppercase; letter-spacing: 0.05em;
    padding: 5px 6px; border: 1px solid #1a3a5c; text-align: center;
    border-top: 2px solid #ffd700;
  }
  .sysc-table .th-sub {
    background: #3a6a9c; color: white; font-size: 9px;
    padding: 4px 6px; border: 1px solid #1a3a5c; text-align: center; font-style: italic;
  }

  .sysc-table td { padding: 4px 6px; border: 1px solid #ccc; font-size: 10.5px; vertical-align: middle; }
  .sysc-table td.td-ref { text-align: center; font-weight: 700; font-size: 9.5px; background: #dde4ed; color: #1a3a5c; width: 32px; white-space: nowrap; }
  .sysc-table td.td-lib { text-align: left; }
  .sysc-table td.td-sign { text-align: center; width: 24px; color: #333; font-weight: 700; }
  .sysc-table td.td-note {
    text-align: center; width: 36px; color: #1a5a8c; font-size: 9.5px; font-weight: 700;
    cursor: pointer; text-decoration: underline dotted;
    transition: background 0.1s;
  }
  .sysc-table td.td-note:hover { background: #ddeeff !important; color: #0d2438; }
  .sysc-table td.td-note[title]:hover::after { content: attr(title); }
  .sysc-table td.td-num { text-align: right; font-family: 'DM Mono', 'Courier New', monospace; font-size: 10.5px; padding-right: 8px; width: 90px; white-space: nowrap; }

  .tr-even td { background: white; }
  .tr-odd  td { background: #f5f5f5; }
  .tr-even td.td-ref, .tr-odd td.td-ref { background: #dde4ed; }
  .tr-data:hover td { background: #e8f0fb !important; }
  .tr-data:hover td.td-ref { background: #c8d8f0 !important; }

  .tr-section td { background: #1a3a5c !important; color: white !important; font-weight: 700 !important; font-size: 10px !important; text-transform: uppercase; letter-spacing: 0.03em; border-color: #0d2438 !important; }
  .tr-section td.td-ref { background: #0d2438 !important; color: #ffd700 !important; }
  .tr-section td.td-num { color: white !important; }

  .tr-total td { background: #2d6a4f !important; color: white !important; font-weight: 700 !important; font-size: 10.5px !important; text-transform: uppercase; letter-spacing: 0.04em; border-color: #1b4332 !important; }
  .tr-total td.td-ref { background: #1b4332 !important; color: #a8f0c6 !important; }
  .tr-total td.td-num { color: white !important; }

  .tr-subtotal td { background: #40916c !important; color: white !important; font-weight: 700 !important; font-size: 10px !important; text-transform: uppercase; border-color: #2d6a4f !important; }
  .tr-subtotal td.td-ref { background: #2d6a4f !important; color: #d8f3dc !important; }
  .tr-subtotal td.td-num { color: white !important; }

  .tr-group td { background: #b0bec5 !important; font-weight: 700 !important; font-size: 10px !important; color: #1a1a1a !important; border-color: #90a4ae !important; }
  .tr-note-group td { background: #37474f !important; color: white !important; font-weight: 700 !important; font-size: 10px !important; border-color: #263238 !important; }

  /* Barre nav */
  .sysc-navbar { background: #0d2438; padding: 8px 20px; display: flex; align-items: center; justify-content: space-between; gap: 12px; position: sticky; top: 0; z-index: 100; box-shadow: 0 2px 8px rgba(0,0,0,0.4); }
  .sysc-navbar-btn { display: flex; align-items: center; gap: 5px; padding: 5px 11px; border-radius: 4px; background: rgba(255,255,255,0.08); color: #ccc; border: 1px solid rgba(255,255,255,0.15); font-size: 11px; cursor: pointer; font-family: Arial, sans-serif; transition: background 0.15s; }
  .sysc-navbar-btn:hover { background: rgba(255,255,255,0.15); color: white; }
  .sysc-navbar-btn.primary { background: #ffd700; color: #0d2438; border: none; font-weight: 700; }
  .sysc-navbar-btn.primary:hover { background: #f0c800; }

  /* Onglets */
  .sysc-tabs { background: white; display: flex; border-bottom: 3px solid #1a3a5c; max-width: 960px; margin: 0 auto; }
  .sysc-tab { padding: 9px 18px; font-size: 11px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; border: none; background: none; cursor: pointer; color: #555; border-bottom: 3px solid transparent; margin-bottom: -3px; font-family: Arial, sans-serif; transition: all 0.12s; }
  .sysc-tab:hover { color: #1a3a5c; background: #f0eeea; }
  .sysc-tab.active { color: #1a3a5c; border-bottom-color: #ffd700; background: #f5f8ff; }

  /* Badges */
  .balance-badge { display: flex; align-items: center; gap: 8px; padding: 10px 16px; border-radius: 3px; font-size: 11px; font-weight: 600; margin: 12px 16px; }
  .balance-ok  { background: #e8f5e9; color: #1b5e20; border: 1px solid #66bb6a; }
  .balance-err { background: #ffebee; color: #b71c1c; border: 1px solid #ef9a9a; }
  .resultat-box { margin: 14px 16px; padding: 12px 20px; border-radius: 4px; display: flex; align-items: center; justify-content: space-between; }
  .resultat-box.benefice { background: #e8f5e9; border: 2px solid #43a047; }
  .resultat-box.perte    { background: #ffebee; border: 2px solid #e53935; }

  /* Notes nav */
  .notes-nav { background: #f0f4f8; padding: 10px 16px; border-bottom: 1px solid #ccc; display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
  .notes-nav-label { font-size: 11px; font-weight: 700; color: #1a3a5c; white-space: nowrap; }
  .notes-dropdown-wrapper { position: relative; min-width: 260px; }
  .notes-dropdown-trigger { width: 100%; display: flex; align-items: center; justify-content: space-between; padding: 6px 10px; background: white; border: 1px solid #aaa; border-radius: 3px; cursor: pointer; font-size: 11px; font-family: Arial, sans-serif; color: #1a1a1a; gap: 8px; }
  .notes-dropdown-trigger:hover { border-color: #1a3a5c; }
  .notes-dropdown-menu { position: absolute; top: calc(100% + 2px); left: 0; right: 0; background: white; border: 1px solid #aaa; border-radius: 3px; box-shadow: 0 4px 16px rgba(0,0,0,0.15); z-index: 200; max-height: 320px; overflow: hidden; display: flex; flex-direction: column; }
  .notes-search { display: flex; align-items: center; gap: 6px; padding: 6px 8px; border-bottom: 1px solid #eee; }
  .notes-search input { flex: 1; border: none; outline: none; font-size: 11px; font-family: Arial, sans-serif; color: #1a1a1a; background: transparent; }
  .notes-list { overflow-y: auto; flex: 1; }
  .notes-list-item { padding: 7px 10px; font-size: 11px; cursor: pointer; border-bottom: 1px solid #f0f0f0; color: #1a1a1a; display: flex; gap: 8px; align-items: flex-start; }
  .notes-list-item:hover { background: #e8f0fb; }
  .notes-list-item.active { background: #dde8f5; font-weight: 700; color: #1a3a5c; }
  .notes-list-item .note-num { font-weight: 700; color: #1a3a5c; min-width: 52px; font-size: 10px; background: #e0e8f5; padding: 1px 5px; border-radius: 2px; white-space: nowrap; margin-top: 1px; }
  .notes-list-item.active .note-num { background: #1a3a5c; color: #ffd700; }
  .notes-list-item .note-title { font-size: 10.5px; line-height: 1.3; }

  /* Commentaire */
  .commentaire-block { margin: 12px 16px; padding: 8px 12px; border: 1px solid #ccc; border-radius: 2px; background: #fafafa; font-size: 10.5px; }
  .commentaire-label { font-weight: 700; font-style: italic; margin-bottom: 4px; color: #333; font-size: 10.5px; }
  .commentaire-text { font-style: italic; color: #444; font-size: 10.5px; line-height: 1.5; }

  /* Info block (Note 2) */
  .info-block { margin: 0 16px 10px; border: 1px solid #1a3a5c; border-radius: 2px; overflow: hidden; }
  .info-block-header { background: #1a3a5c; color: white; font-weight: 700; font-size: 10px; text-transform: uppercase; letter-spacing: 0.04em; padding: 6px 12px; }
  .info-block-body { padding: 10px 12px; font-size: 10.5px; color: #333; line-height: 1.6; text-align: center; min-height: 48px; }

  /* BFG */
  .bfg-row td { background: #fffde7 !important; font-weight: 700 !important; font-style: italic; border-top: 2px solid #f9a825 !important; border-bottom: 2px solid #f9a825 !important; }

  /* Tooltip double-clic */
  .td-note-clickable {
    cursor: pointer !important;
    position: relative;
  }
  .td-note-clickable::after {
    content: '↗ double-clic';
    position: absolute;
    bottom: 100%;
    left: 50%;
    transform: translateX(-50%);
    background: #1a3a5c;
    color: white;
    font-size: 9px;
    padding: 2px 5px;
    border-radius: 2px;
    white-space: nowrap;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.15s;
    z-index: 10;
  }
  .td-note-clickable:hover::after { opacity: 1; }

  /* Spinner */
  @keyframes spin { to { transform: rotate(360deg); } }
  .spinner { width: 32px; height: 32px; border: 3px solid #ddd; border-top-color: #1a3a5c; border-radius: 50%; animation: spin 0.8s linear infinite; }
  .sysc-error { max-width: 960px; margin: 10px auto; padding: 10px 16px; background: #ffebee; border: 1px solid #ef9a9a; border-radius: 3px; color: #b71c1c; font-size: 12px; }

  @media print {
    .sysc-page { background: white; }
    .sysc-sheet { box-shadow: none; max-width: 100%; }
    .no-print { display: none !important; }
    .sysc-table { font-size: 9pt; }
  }
`;