// src/features/financial-reports/pages/statements-syscohada/[id].jsx
import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FiArrowLeft, FiRefreshCw, FiPrinter, FiCheckCircle, FiAlertTriangle, FiTrendingUp, FiTrendingDown } from 'react-icons/fi';
import { apiClient } from '../../../../services/apiClient';
import { syscohadaStyles, OfficialHeader, fmt, fmtSigned, noteIdFromNumber } from './shared';
import NotesTab from './notes-tab';

// ─────────────────────────────────────────────────────────────────────────────
// HELPER : cellule NOTE avec double-clic
// ─────────────────────────────────────────────────────────────────────────────

function NoteCell({ note, onNoteClick }) {
  if (!note) return <td className="td-note"></td>;
  const noteId = noteIdFromNumber(note);
  if (!noteId || !onNoteClick) return <td className="td-note">{note}</td>;
  return (
    <td
      className="td-note td-note-clickable"
      onDoubleClick={() => onNoteClick(noteId)}
      title={`Double-clic → Note ${note}`}
    >
      {note}
    </td>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BILAN
// ─────────────────────────────────────────────────────────────────────────────

function BilanTab({ data, entite, periode, onNoteClick }) {
  if (!data) return null;
  const actif  = data.actif  || {};
  const passif = data.passif || {};

  const ga = (key) => actif[key]?.solde  ?? 0;
  const gp = (key) => passif[key]?.solde ?? 0;
  const gb = (key) => actif[key]?.brut   ?? ga(key);
  const gd = (key) => actif[key]?.amort  ?? 0;

  const computed = {
    totalImmo:          ga('immobilisations_incorporelles') + ga('immobilisations_corporelles') + ga('immobilisations_financieres'),
    totalImmoB:         gb('immobilisations_incorporelles') + gb('immobilisations_corporelles') + gb('immobilisations_financieres'),
    totalImmoD:         gd('immobilisations_incorporelles') + gd('immobilisations_corporelles') + gd('immobilisations_financieres'),
    totalCirc:          ga('actif_hao') + ga('stocks') + ga('avances_fournisseurs') + ga('creances_clients') + ga('autres_creances'),
    totalTreso:         ga('titres_placement') + ga('valeurs_encaisser') + ga('tresorerie_actif'),
    totalActif:         data.total_actif || 0,
    totalCP:            (gp('capital')||0) + (gp('primes_capital')||0) + (gp('reserves_libres')||0) + (gp('reserves_indisponibles')||0) + (gp('report_resultat')||0) + (data.resultat_net||0) + (gp('subventions')||0) + (gp('provisions_reglementees')||0),
    totalDettesFin:     gp('dettes_financieres') + gp('dettes_location') + gp('provisions_risques'),
    totalPassifCirc:    gp('dettes_hao') + gp('avances_clients') + gp('dettes_fournisseurs') + gp('dettes_fiscales_sociales') + gp('autres_dettes') + gp('provisions_court_terme'),
    totalTresoPassif:   gp('tresorerie_passif_escompte') + gp('tresorerie_passif'),
    totalPassif:        data.total_passif || 0,
  };
  computed.totalRessStables = computed.totalCP + computed.totalDettesFin;

  const actifRows = [
    { type:'section', ref:'AD', label:'IMMOBILISATIONS INCORPORELLES', note:'3', key:'immobilisations_incorporelles' },
    { ref:'AE', label:'Frais de développement et de prospection' },
    { ref:'AF', label:'Brevets, licences, logiciels et droits similaires' },
    { ref:'AG', label:'Fonds commercial et droit au bail' },
    { ref:'AH', label:'Autres immobilisations incorporelles' },
    { type:'section', ref:'AI', label:'IMMOBILISATIONS CORPORELLES', note:'3', key:'immobilisations_corporelles' },
    { ref:'AJ', label:'Terrains' },
    { ref:'AK', label:'Bâtiments' },
    { ref:'AL', label:'Aménagements, Agencements et Installations' },
    { ref:'AM', label:'Matériel, mobilier et actifs biologiques' },
    { ref:'AN', label:'Matériel de transport' },
    { ref:'AP', label:'Avances et acomptes versés sur immobilisation', note:'3' },
    { type:'section', ref:'AQ', label:'IMMOBILISATIONS FINANCIÈRES', note:'4', key:'immobilisations_financieres' },
    { ref:'AR', label:'Titres de participation' },
    { ref:'AS', label:'Autres immobilisations financières' },
    { type:'subtotal', ref:'AZ', label:'TOTAL ACTIF IMMOBILISÉ', brut:computed.totalImmoB, amort:computed.totalImmoD, net:computed.totalImmo },
    { type:'section', ref:'BA', label:'ACTIF CIRCULANT H.A.O.', note:'5', key:'actif_hao' },
    { type:'section', ref:'BB', label:'STOCKS ET ENCOURS', note:'6', key:'stocks' },
    { type:'group',   ref:'BG', label:'CRÉANCES ET EMPLOIS ASSIMILÉS' },
    { ref:'BH', label:'Fournisseurs avances versées', note:'17', key:'avances_fournisseurs' },
    { ref:'BI', label:'Clients', note:'7', key:'creances_clients' },
    { ref:'BJ', label:'Autres créances', note:'8', key:'autres_creances' },
    { type:'subtotal', ref:'BK', label:'TOTAL ACTIF CIRCULANT', net:computed.totalCirc },
    { ref:'BQ', label:'Titres de placement', note:'9', key:'titres_placement' },
    { ref:'BR', label:'Valeurs à encaisser', note:'10', key:'valeurs_encaisser' },
    { ref:'BS', label:'Banques, chèques postaux, caisse et assimilés', note:'11', key:'tresorerie_actif' },
    { type:'subtotal', ref:'BT', label:'TOTAL TRÉSORERIE - ACTIF', net:computed.totalTreso },
    { ref:'BU', label:'Écart de conversion - Actif', note:'12', key:'ecart_conversion_actif' },
    { type:'total', ref:'BZ', label:'TOTAL GÉNÉRAL', net:computed.totalActif },
  ];

  const passifRows = [
    { ref:'CA', label:'Capital', note:'13', key:'capital' },
    { ref:'CB', label:'Apporteurs capital non appelé (-)', note:'13', key:'apporteurs_non_appele' },
    { ref:'CD', label:'Primes liées au capital social', note:'14', key:'primes_capital' },
    { ref:'CE', label:'Écart de réévaluation', note:'3e', key:'ecart_reevaluation' },
    { ref:'CF', label:'Réserves indisponibles', note:'14', key:'reserves_indisponibles' },
    { ref:'CG', label:'Réserves libres', note:'14', key:'reserves_libres' },
    { ref:'CH', label:'Report à nouveau (+ou-)', note:'14', key:'report_resultat' },
    { ref:'CJ', label:"Résultat net de l'exercice (bénéfice + ou perte -)", isResultat:true },
    { ref:'CL', label:"Subventions d'investissement", note:'15', key:'subventions' },
    { ref:'CM', label:'Provisions réglementées', note:'15', key:'provisions_reglementees' },
    { type:'subtotal', ref:'CP', label:'TOTAL CAPITAUX PROPRES ET RESSOURCES ASSIMILÉES', val:computed.totalCP },
    { ref:'DA', label:'Emprunts et dettes financières diverses', note:'16', key:'dettes_financieres' },
    { ref:'DB', label:'Dettes de location acquisition', note:'16', key:'dettes_location' },
    { ref:'DC', label:'Provisions pour risques et charges', note:'16', key:'provisions_risques' },
    { type:'subtotal', ref:'DD', label:'TOTAL DETTES FINANCIÈRES ET RESSOURCES ASSIMILÉES', val:computed.totalDettesFin },
    { type:'total',   ref:'DF', label:'TOTAL RESSOURCES STABLES', val:computed.totalRessStables },
    { ref:'DH', label:'Dettes circulantes H.A.O.', note:'5', key:'dettes_hao' },
    { ref:'DI', label:'Clients, avances reçues', note:'7', key:'avances_clients' },
    { ref:'DJ', label:"Fournisseurs d'exploitation", note:'17', key:'dettes_fournisseurs' },
    { ref:'DK', label:'Dettes fiscales et sociales', note:'18', key:'dettes_fiscales_sociales' },
    { ref:'DM', label:'Autres dettes', note:'19', key:'autres_dettes' },
    { ref:'DN', label:'Provisions pour risques à court terme', note:'19', key:'provisions_court_terme' },
    { type:'subtotal', ref:'DP', label:'TOTAL PASSIF CIRCULANT', val:computed.totalPassifCirc },
    { ref:'DQ', label:"Banques, crédit d'escompte", note:'20', key:'tresorerie_passif_escompte' },
    { ref:'DR', label:'Banques, établissements financiers et crédit de trésorerie', note:'20', key:'tresorerie_passif' },
    { type:'subtotal', ref:'DT', label:'TOTAL TRÉSORERIE-PASSIF', val:computed.totalTresoPassif },
    { ref:'DV', label:'Écart de conversion - Passif', note:'12', key:'ecart_conversion_passif' },
    { type:'total', ref:'DZ', label:'TOTAL GÉNÉRAL', val:computed.totalPassif },
  ];

  let ai = 0;
  const renderActif = (row) => {
    const isEven = ai++ % 2 === 0;
    if (row.type === 'section') {
      const v = row.key ? ga(row.key) : 0;
      return (
        <tr key={row.ref} className="tr-section">
          <td className="td-ref">{row.ref}</td>
          <td className="td-lib">{row.label}</td>
          <NoteCell note={row.note} onNoteClick={onNoteClick} />
          <td className="td-num">{fmt(v)}</td><td className="td-num">{fmt(v)}</td>
          <td className="td-num">{fmt(v)}</td><td className="td-num">0</td>
        </tr>
      );
    }
    if (row.type === 'group') return (
      <tr key={row.ref} className="tr-group">
        <td className="td-ref">{row.ref}</td>
        <td className="td-lib">{row.label}</td>
        <td className="td-note"></td>
        <td className="td-num">—</td><td className="td-num">—</td>
        <td className="td-num">—</td><td className="td-num">—</td>
      </tr>
    );
    if (row.type === 'subtotal') return (
      <tr key={row.ref} className="tr-subtotal">
        <td className="td-ref">{row.ref}</td>
        <td className="td-lib">{row.label}</td>
        <td className="td-note"></td>
        <td className="td-num">{fmt(row.brut ?? row.net)}</td>
        <td className="td-num">{fmt(row.amort ?? 0)}</td>
        <td className="td-num">{fmt(row.net)}</td>
        <td className="td-num">0</td>
      </tr>
    );
    if (row.type === 'total') return (
      <tr key={row.ref} className="tr-total">
        <td className="td-ref">{row.ref}</td><td className="td-lib">{row.label}</td>
        <td className="td-note"></td>
        <td className="td-num">{fmt(row.net)}</td><td className="td-num">0</td>
        <td className="td-num">{fmt(row.net)}</td><td className="td-num">0</td>
      </tr>
    );
    const val = row.key ? ga(row.key) : 0;
    return (
      <tr key={row.ref} className={`tr-data ${isEven?'tr-even':'tr-odd'}`}>
        <td className="td-ref">{row.ref}</td>
        <td className="td-lib">{row.label}</td>
        <NoteCell note={row.note} onNoteClick={onNoteClick} />
        <td className="td-num">{fmt(val)}</td><td className="td-num">0</td>
        <td className="td-num">{fmt(val)}</td><td className="td-num">0</td>
      </tr>
    );
  };

  let pi = 0;
  const renderPassif = (row) => {
    const isEven = pi++ % 2 === 0;
    if (row.type === 'subtotal') return (
      <tr key={row.ref} className="tr-subtotal">
        <td className="td-ref">{row.ref}</td><td className="td-lib">{row.label}</td>
        <td className="td-note"></td>
        <td className="td-num">{fmt(row.val)}</td><td className="td-num">0</td>
      </tr>
    );
    if (row.type === 'total') return (
      <tr key={row.ref} className="tr-total">
        <td className="td-ref">{row.ref}</td><td className="td-lib">{row.label}</td>
        <td className="td-note"></td>
        <td className="td-num">{fmt(row.val)}</td><td className="td-num">0</td>
      </tr>
    );
    const val = row.isResultat ? (data.resultat_net||0) : gp(row.key);
    return (
      <tr key={row.ref} className={`tr-data ${isEven?'tr-even':'tr-odd'}`}>
        <td className="td-ref">{row.ref}</td>
        <td className="td-lib">{row.label}</td>
        <NoteCell note={row.note} onNoteClick={onNoteClick} />
        <td className="td-num">{fmt(val)}</td><td className="td-num">0</td>
      </tr>
    );
  };

  return (
    <div style={{ paddingBottom: 24 }}>
      <OfficialHeader entite={entite} periode={periode} pageNum={1} totalPages={2} docType="BILAN" title="BILAN" />
      <table className="sysc-table">
        <thead>
          <tr>
            <th className="th-main" rowSpan={2} style={{width:32}}>Réf.</th>
            <th className="th-main left" rowSpan={2}>ACTIF</th>
            <th className="th-main" rowSpan={2} style={{width:36}}>NOTE</th>
            <th colSpan={3} className="th-year">Exercice {periode?.date_end?.slice(0,4) || '2024'}</th>
            <th className="th-year" style={{width:90}}>Exercice {periode?.date_start?.slice(0,4) ? String(parseInt(periode.date_start.slice(0,4))-1) : '2023'}</th>
          </tr>
          <tr>
            <th className="th-sub" style={{width:90}}>Brut</th>
            <th className="th-sub" style={{width:90}}>Amort. / Déprec.</th>
            <th className="th-sub" style={{width:90}}>Net</th>
            <th className="th-sub" style={{width:90}}>Net</th>
          </tr>
        </thead>
        <tbody>{actifRows.map(renderActif)}</tbody>
      </table>

      <div style={{ marginTop:32, borderTop:'3px solid #1a3a5c' }}>
        <OfficialHeader entite={entite} periode={periode} pageNum={2} totalPages={2} docType="BILAN" title="BILAN" />
      </div>
      <table className="sysc-table">
        <thead>
          <tr>
            <th className="th-main" style={{width:32}}>Réf.</th>
            <th className="th-main left">PASSIF</th>
            <th className="th-main" style={{width:36}}>Note</th>
            <th className="th-year" style={{width:90}}>Exercice {periode?.date_end?.slice(0,4) || '2024'}</th>
            <th className="th-year" style={{width:90}}>Exercice {periode?.date_start?.slice(0,4) ? String(parseInt(periode.date_start.slice(0,4))-1) : '2023'}</th>
          </tr>
        </thead>
        <tbody>{passifRows.map(renderPassif)}</tbody>
      </table>

      <div className={`balance-badge ${data.est_equilibre ? 'balance-ok' : 'balance-err'}`}>
        {data.est_equilibre
          ? <><FiCheckCircle size={14}/> Bilan équilibré — Actif = Passif = {fmt(data.total_actif)} F CFA</>
          : <><FiAlertTriangle size={14}/> Bilan non équilibré — Écart : {fmt(Math.abs((data.total_actif||0)-(data.total_passif||0)))} F CFA</>
        }
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPTE DE RÉSULTAT
// ─────────────────────────────────────────────────────────────────────────────

function CRTab({ data, entite, periode, onNoteClick }) {
  if (!data) return null;
  const g = (key) => data.postes?.[key]?.solde ?? 0;

  const rows = [
    { ref:'TA', label:'Ventes de marchandises', sign:'A', signOp:'+', note:'21', key:'ventes_marchandises' },
    { ref:'RA', label:'Achats de marchandises', signOp:'-', note:'22', key:'achats_marchandises' },
    { ref:'RB', label:'Variation de stocks de marchandises', signOp:'-/+', note:'6', key:'variation_stocks_marchandises' },
    { type:'section', ref:'XA', label:'MARGE COMMERCIALE (Somme TA à RB)', computedKey:'marge_commerciale' },
    { ref:'TB', label:'Ventes de produits fabriqués', sign:'B', signOp:'+', note:'21', key:'ventes_produits_fabriques' },
    { ref:'TC', label:'Travaux, services vendus', sign:'C', signOp:'+', note:'21', key:'travaux_services_vendus' },
    { ref:'TD', label:'Produits accessoires', sign:'D', signOp:'+', note:'21', key:'produits_accessoires' },
    { type:'section', ref:'XB', label:"CHIFFRE D'AFFAIRES (A+B+C+D)", computedKey:'chiffre_affaires' },
    { ref:'TE', label:'Production stockée (ou déstockage)', signOp:'-/+', note:'6', key:'production_stockee' },
    { ref:'TF', label:'Production immobilisée', signOp:'+', note:'21', key:'production_immobilisee' },
    { ref:'TG', label:"Subvention d'exploitation", signOp:'+', note:'21', key:'subvention_exploitation' },
    { ref:'TH', label:'Autres produits', signOp:'+', note:'21', key:'autres_produits' },
    { ref:'TI', label:"Transfert de charges d'exploitation", signOp:'+', note:'12', key:'transfert_charges_exploitation' },
    { ref:'RC', label:'Achats de matières et fournitures liées', signOp:'-', note:'22', key:'achats_matieres' },
    { ref:'RD', label:'Variation de stocks de matières premières et fournitures liées', signOp:'-/+', note:'6', key:'variation_stocks_matieres' },
    { ref:'RE', label:'Autres achats', signOp:'-', note:'22', key:'autres_achats' },
    { ref:'RF', label:"Variation de stocks d'autres approvisionnements", signOp:'-/+', note:'6', key:'variation_stocks_appro' },
    { ref:'RG', label:'Transport', signOp:'-', note:'23', key:'transport' },
    { ref:'RH', label:'Services extérieurs', signOp:'-', note:'24', key:'services_exterieurs' },
    { ref:'RI', label:'Impôts et taxes', signOp:'-', note:'25', key:'impots_taxes' },
    { ref:'RJ', label:'Autres charges', signOp:'-', note:'26', key:'autres_charges' },
    { type:'section', ref:'XC', label:'VALEUR AJOUTEE (XB+RA+RB) + (Somme TE à RJ)', computedKey:'valeur_ajoutee' },
    { ref:'RK', label:'Charges de personnel', signOp:'-', note:'27', key:'charges_personnel' },
    { type:'section', ref:'XD', label:"EXCEDENT BRUT D'EXPLOITATION (XC+RK)", note:'28', computedKey:'excedent_brut' },
    { ref:'TJ', label:"Reprises d'amortissements, provisions et dépréciations", signOp:'+', note:'28', key:'reprises_amort' },
    { ref:'RL', label:'Dotations aux amortissements, aux provisions et dépréciations', signOp:'-', note:'3C&28', key:'dotations_amort' },
    { type:'section', ref:'XE', label:"RESULTAT D'EXPLOITATION (XD+TJ+RL)", computedKey:'resultat_exploitation' },
    { ref:'TK', label:'Revenus financiers et assimilés', signOp:'+', note:'29', key:'revenus_financiers' },
    { ref:'TL', label:'Reprises de provisions et dépréciations financières', signOp:'+', note:'28', key:'reprises_prov_fin' },
    { ref:'TM', label:'Transfert de charges financières', signOp:'+', note:'12', key:'transfert_charges_fin' },
    { ref:'RM', label:'Frais financiers et charges assimilés', signOp:'-', note:'29', key:'frais_financiers' },
    { ref:'RN', label:'Dotations aux provisions et aux dépréciations financières', signOp:'-', note:'3C&28', key:'dotations_prov_fin' },
    { type:'section', ref:'XF', label:'RESULTAT FINANCIER (Somme TK à RN)', computedKey:'resultat_financier' },
    { type:'section', ref:'XG', label:'RESULTAT DES ACTIVITES ORDINAIRES (XE+XF)', computedKey:'resultat_ao' },
    { ref:'TN', label:"Produits des cessions d'immobilisations", signOp:'+', note:'3D', key:'produits_cessions' },
    { ref:'TO', label:'Autres produits HAO', signOp:'+', note:'30', key:'autres_produits_hao' },
    { ref:'RO', label:"Valeur comptable des cessions d'immobilisations", signOp:'-', note:'3D', key:'valeur_comptable_cessions' },
    { ref:'RP', label:'Autres charges HAO', signOp:'-', note:'30', key:'autres_charges_hao' },
    { type:'section', ref:'XH', label:'RESULTAT HORS ACTIVITES ORDINAIRES (Somme TN à RP)', computedKey:'resultat_hao' },
    { ref:'RQ', label:'Participation des travailleurs', signOp:'-', note:'30', key:'participation_travailleurs' },
    { ref:'RS', label:'Impôts sur le résultat', signOp:'-', key:'impots_resultat' },
    { type:'total', ref:'XI', label:'RESULTAT NET (XG+XH+RQ+RS)', isResultat:true },
  ];

  let ci = 0;
  const renderRow = (row) => {
    const isEven = ci++ % 2 === 0;
    if (row.type === 'section') {
      const val = data.totaux?.[row.computedKey] ?? 0;
      return (
        <tr key={row.ref} className="tr-section">
          <td className="td-ref">{row.ref}</td>
          <td className="td-lib">{row.label}</td>
          <td className="td-sign"></td>
          <NoteCell note={row.note} onNoteClick={onNoteClick} />
          <td className="td-num">{fmt(val)}</td><td className="td-num">0</td>
        </tr>
      );
    }
    if (row.type === 'total') return (
      <tr key={row.ref} className="tr-total">
        <td className="td-ref">{row.ref}</td><td className="td-lib">{row.label}</td>
        <td className="td-sign"></td><td className="td-note"></td>
        <td className="td-num">{fmt(data.resultat_net??0)}</td><td className="td-num">0</td>
      </tr>
    );
    const val = g(row.key);
    return (
      <tr key={row.ref} className={`tr-data ${isEven?'tr-even':'tr-odd'}`}>
        <td className="td-ref">{row.ref}</td>
        <td className="td-lib">
          {row.label}
          {row.sign && <span style={{ marginLeft:10, fontWeight:700, color:'#555' }}>{row.sign}</span>}
        </td>
        <td className="td-sign">{row.signOp||''}</td>
        <NoteCell note={row.note} onNoteClick={onNoteClick} />
        <td className="td-num">{fmt(val)}</td><td className="td-num">0</td>
      </tr>
    );
  };

  return (
    <div style={{ paddingBottom:24 }}>
      <OfficialHeader entite={entite} periode={periode} pageNum={1} totalPages={1} docType="COMPTE DE RESULTAT" title="COMPTE DE RÉSULTAT" />
      <table className="sysc-table">
        <thead>
          <tr>
            <th className="th-main" style={{width:32}}>Réf</th>
            <th className="th-main left">LIBELLÉS</th>
            <th className="th-main" style={{width:28}}></th>
            <th className="th-main" style={{width:40}}>NOTE</th>
            <th className="th-year" style={{width:90}}>Exercice {periode?.date_end?.slice(0,4) || '2024'}<br/><span style={{fontSize:8,fontWeight:400}}>NET</span></th>
            <th className="th-year" style={{width:90}}>Exercice {periode?.date_start?.slice(0,4) ? String(parseInt(periode.date_start.slice(0,4))-1) : '2023'}<br/><span style={{fontSize:8,fontWeight:400}}>NET</span></th>
          </tr>
        </thead>
        <tbody>{rows.map(renderRow)}</tbody>
      </table>
      <div className={`resultat-box ${(data.resultat_net||0)>=0?'benefice':'perte'}`}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          {(data.resultat_net||0)>=0 ? <FiTrendingUp size={20} color="#2e7d32"/> : <FiTrendingDown size={20} color="#c62828"/>}
          <div>
            <div style={{ fontWeight:700, fontSize:12, color:(data.resultat_net||0)>=0?'#1b5e20':'#b71c1c' }}>
              {(data.resultat_net||0)>=0 ? "Bénéfice net de l'exercice" : "Perte nette de l'exercice"}
            </div>
            <div style={{ fontSize:10, color:'#666', marginTop:2 }}>Produits − Charges = Résultat</div>
          </div>
        </div>
        <div style={{ fontFamily:'DM Mono,monospace', fontSize:18, fontWeight:700, color:(data.resultat_net||0)>=0?'#2e7d32':'#c62828' }}>
          {fmtSigned(data.resultat_net)} F CFA
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TFT
// ─────────────────────────────────────────────────────────────────────────────

function TFTTab({ data, entite, periode, onNoteClick }) {
  if (!data) return null;
  const g = (key) => data.postes?.[key]?.solde ?? 0;
  const t = (key) => data.totaux?.[key] ?? 0;

  const rows = [
    { type:'section-green', ref:'ZA', label:"Trésorerie nette au 1er Janvier\n(Trésorerie actif N-1 − Trésorerie passif N-1)", sign:'A', key:'tresorerie_nette_ouverture' },
    { type:'group-header', label:'Flux de trésorerie provenant des activités opérationnelles' },
    { ref:'FA', label:"Capacité d'Autofinancement Global (CAFG)", type:'section', computedKey:'cafg', bold:true },
    { ref:'FB', label:"- Variation de l'actif circulant HAO (1)", key:'variation_actif_hao' },
    { ref:'FC', label:'- Variation des stocks', key:'variation_stocks' },
    { ref:'FD', label:'- Variation des créances et emplois assimilés', key:'variation_creances' },
    { ref:'FE', label:'+ Variation du passif circulant (1)', key:'variation_passif_circ' },
    { type:'bfg', label:'Variation du BFG liée aux activités opérationnelles\n(FB+FC+FD+FE) :', computedKey:'variation_bfg' },
    { type:'subtotal', ref:'ZB', label:'Flux de trésorerie provenant des activités opérationnelles (somme FA à FE)', sign:'B', computedKey:'flux_operationnel' },
    { type:'group-header', label:"Flux de trésorerie provenant des activités d'investissement" },
    { ref:'FF', label:"- Décaissements liés aux acquisitions d'immobilisations incorporelles", key:'decaiss_immo_incorp' },
    { ref:'FG', label:"- Décaissements liés aux acquisitions d'immobilisations corporelles", key:'decaiss_immo_corp' },
    { ref:'FH', label:"- Décaissements liés aux acquisitions d'immobilisations financières", key:'decaiss_immo_fin' },
    { ref:'FI', label:"+ Encaissements liés aux cessions d'immobilisations incorporelles et corporelles", key:'encaiss_cessions_incorp_corp' },
    { ref:'FJ', label:"+ Encaissements liés aux cessions d'immobilisations financières", key:'encaiss_cessions_fin' },
    { type:'subtotal', ref:'ZC', label:"Flux de trésorerie provenant des opérations d'investissements (somme FE à FJ)", sign:'C', computedKey:'flux_investissement' },
    { type:'group-header', label:'Flux de trésorerie provenant du financement par capitaux propres' },
    { ref:'FK', label:'+ Augmentations de capital par apports nouveaux', key:'aug_capital' },
    { ref:'FL', label:"+ Subventions d'investissement reçues", key:'subventions_recues' },
    { ref:'FM', label:'- Prélèvements sur le capital', key:'prelevements_capital' },
    { ref:'FN', label:'- Dividendes versés', key:'dividendes' },
    { type:'subtotal', ref:'ZD', label:'Flux de trésorerie provenant des capitaux propres (somme FK à FN)', sign:'D', computedKey:'flux_cap_propres' },
    { type:'group-header', label:'Trésorerie provenant du financement par capitaux étrangers' },
    { ref:'FO', label:'+ Emprunts', key:'emprunts' },
    { ref:'FP', label:'+ Autres dettes financières', key:'autres_dettes_fin' },
    { ref:'FQ', label:'- Remboursements des emprunts et autres dettes financières', key:'remb_emprunts' },
    { ref:'FR', label:'- Remboursements des dettes de location-acquisition', key:'remb_location' },
    { type:'subtotal', ref:'ZE', label:'Trésorerie provenant du financement par capitaux étrangers (somme FO à FQ)', sign:'E', computedKey:'flux_cap_etrangers' },
    { type:'subtotal', ref:'ZF', label:'Flux de trésorerie provenant des activités de financement (D+E)', sign:'F', computedKey:'flux_financement' },
    { type:'section', ref:'ZG', label:'VARIATION DE LA TRESORERIE NETTE DE LA PERIODE (B+C+F)', sign:'G', computedKey:'variation_tresorerie' },
    { type:'total', ref:'ZH', label:"Trésorerie nette au 31 Décembre (G+A)\nContrôle : Trésorerie actif N − Trésorerie passif N", sign:'H', computedKey:'tresorerie_cloture' },
  ];

  let ti = 0;
  const renderRow = (row, i) => {
    const isEven = ti % 2 === 0;
    if (row.type === 'group-header') return (
      <tr key={`gh-${i}`} style={{ background:'#e8eef5' }}>
        <td colSpan={5} style={{ padding:'6px 10px', fontWeight:700, fontSize:10.5, color:'#1a3a5c', borderBottom:'1px solid #c0c8d8' }}>{row.label}</td>
      </tr>
    );
    if (row.type === 'bfg') return (
      <tr key={`bfg-${i}`} className="bfg-row">
        <td colSpan={3} style={{ padding:'5px 10px', fontWeight:700, fontSize:10, fontStyle:'italic', whiteSpace:'pre-line' }}>{row.label}</td>
        <td className="td-num" style={{ fontWeight:700 }}>{fmt(t(row.computedKey))}</td>
        <td className="td-num">0</td>
      </tr>
    );
    if (row.type === 'section-green') { ti++;
      return (
        <tr key={row.ref} className="tr-subtotal">
          <td className="td-ref" style={{ background:'#1b4332', color:'#a8f0c6' }}>{row.ref}</td>
          <td className="td-lib" style={{ whiteSpace:'pre-line' }}>{row.label}</td>
          <td className="td-sign" style={{ fontWeight:700 }}>{row.sign}</td>
          <td className="td-num">{fmt(g(row.key))}</td><td className="td-num">0</td>
        </tr>
      );
    }
    if (row.type === 'section') { ti++;
      return (
        <tr key={`s-${i}`} className="tr-section">
          <td className="td-ref">{row.ref||''}</td>
          <td className="td-lib" style={{ whiteSpace:'pre-line' }}>{row.label}</td>
          <td className="td-sign" style={{ fontWeight:700 }}>{row.sign||''}</td>
          <td className="td-num">{fmt(t(row.computedKey))}</td><td className="td-num">0</td>
        </tr>
      );
    }
    if (row.type === 'subtotal') { ti++;
      return (
        <tr key={row.ref||`st-${i}`} className="tr-subtotal">
          <td className="td-ref">{row.ref}</td>
          <td className="td-lib" style={{ whiteSpace:'pre-line' }}>{row.label}</td>
          <td className="td-sign" style={{ fontWeight:700 }}>{row.sign}</td>
          <td className="td-num">{fmt(t(row.computedKey))}</td><td className="td-num">0</td>
        </tr>
      );
    }
    if (row.type === 'total') { ti++;
      return (
        <tr key={row.ref} className="tr-total">
          <td className="td-ref">{row.ref}</td>
          <td className="td-lib" style={{ whiteSpace:'pre-line' }}>{row.label}</td>
          <td className="td-sign" style={{ fontWeight:700 }}>{row.sign}</td>
          <td className="td-num">{fmt(t(row.computedKey))}</td><td className="td-num">0</td>
        </tr>
      );
    }
    ti++;
    return (
      <tr key={row.ref} className={`tr-data ${isEven?'tr-even':'tr-odd'}`}>
        <td className="td-ref">{row.ref}</td>
        <td className="td-lib">{row.label}</td>
        <td className="td-sign">{row.sign||''}</td>
        <td className="td-num">{fmt(g(row.key))}</td><td className="td-num">0</td>
      </tr>
    );
  };

  return (
    <div style={{ paddingBottom:24 }}>
      <OfficialHeader entite={entite} periode={periode} pageNum={1} totalPages={1} docType="TABLEAU DES FLUX DE TRESORERIE" title="TABLEAU DES FLUX DE TRÉSORERIE" />
      <table className="sysc-table">
        <thead>
          <tr>
            <th className="th-main" style={{width:32}}>Réf</th>
            <th className="th-main left">LIBELLÉS</th>
            <th className="th-main" style={{width:28}}>Note</th>
            <th className="th-year" style={{width:90}}>Exercice {periode?.date_end?.slice(0,4) || '2024'}</th>
            <th className="th-year" style={{width:90}}>Exercice {periode?.date_start?.slice(0,4) ? String(parseInt(periode.date_start.slice(0,4))-1) : '2023'}</th>
          </tr>
        </thead>
        <tbody>{rows.map((row, i) => renderRow(row, i))}</tbody>
      </table>
      <div className={`balance-badge ${data.est_coherent?'balance-ok':'balance-err'}`}>
        {data.est_coherent
          ? <><FiCheckCircle size={14}/> Flux cohérents — Variation = Clôture − Ouverture</>
          : <><FiAlertTriangle size={14}/> Incohérence détectée dans les flux</>
        }
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

  const [activeTab, setActiveTab]   = useState('bilan');
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState(null);
  const [importData, setImportData] = useState(null);
  const [entite, setEntite]         = useState(null);
  const [periode, setPeriode]       = useState(null);
  const [targetNote, setTargetNote] = useState(null);

  const [bilanData, setBilanData] = useState(null);
  const [crData, setCrData]       = useState(null);
  const [tftData, setTftData]     = useState(null);
  const [notesData, setNotesData] = useState(null);

  // ── Chargement import + entite + periode ─────────────────────────────────
  useEffect(() => {
    apiClient.get(`financial-reports/raw-imports/${id}/`)
      .then(res => {
        setImportData(res);

        // Fetch période
        const periodeId = res.period?.id || res.period;
        if (periodeId) {
          apiClient.get(`financial-reports/periods/${periodeId}/`)
            .then(per => {
              setPeriode(per);
              // Fetch entité depuis la période (company)
              const entiteId = per.company?.id || per.company;
              if (entiteId) {
                apiClient.get(`entites/${entiteId}/`)
                  .then(setEntite)
                  .catch(err => console.error('Erreur fetch entite:', err));
              }
            })
            .catch(err => console.error('Erreur fetch periode:', err));
        }
      })
      .catch(() => setError('Import introuvable'));
  }, [id]);

  const loadTab = useCallback(async (tab) => {
    setActiveTab(tab);
    if (tab === 'bilan' && bilanData) return;
    if (tab === 'cr'    && crData)    return;
    if (tab === 'tft'   && tftData)   return;
    if (tab === 'notes' && notesData) return;

    setLoading(true); setError(null);
    try {
      const ep = tab === 'bilan' ? 'bilan'
        : tab === 'cr'    ? 'compte_resultat'
        : tab === 'tft'   ? 'tft'
        : 'notes';
      const d = await apiClient.get(`financial-reports/raw-imports/${id}/${ep}/`);
      if (tab === 'bilan') setBilanData(d);
      if (tab === 'cr')    setCrData(d);
      if (tab === 'tft')   setTftData(d);
      if (tab === 'notes') setNotesData(d);
    } catch (err) {
      setError(err.response?.data?.detail || 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, [id, bilanData, crData, tftData, notesData]);

  useEffect(() => { loadTab('bilan'); }, [loadTab]);

  const handleNoteClick = useCallback((noteId) => {
    setTargetNote(noteId);
    loadTab('notes');
  }, [loadTab]);

  useEffect(() => {
    if (activeTab !== 'notes') setTargetNote(null);
  }, [activeTab]);

  const tabs = [
    { key:'bilan', label:'Bilan',              emoji:'⚖️' },
    { key:'cr',    label:'Compte de résultat', emoji:'📊' },
    { key:'tft',   label:'Flux de trésorerie', emoji:'💸' },
    { key:'notes', label:'Notes annexes',      emoji:'📋' },
  ];

  return (
    <div className="sysc-page">
      <style>{syscohadaStyles}</style>

      {/* Nav */}
      <div className="sysc-navbar no-print">
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <button className="sysc-navbar-btn" onClick={() => navigate(`/financial-reports/import/${id}`) }>
            <FiArrowLeft size={13}/> Vue standard
          </button>
          <div style={{ color:'white', fontSize:12, fontWeight:700 }}>
            📄 Format officiel SYSCOHADA
            {importData && <span style={{ color:'#ffd700', marginLeft:8, fontSize:11, fontWeight:400 }}>— {importData.name}</span>}
          </div>
        </div>
        <div style={{ display:'flex', gap:6 }}>
          <button className="sysc-navbar-btn" onClick={() => { setBilanData(null); setCrData(null); setTftData(null); setNotesData(null); loadTab(activeTab); }}>
            <FiRefreshCw size={12}/> Actualiser
          </button>
          <button className="sysc-navbar-btn primary" onClick={() => window.print()}>
            <FiPrinter size={12}/> Imprimer
          </button>
        </div>
      </div>

      {/* Onglets */}
      <div className="sysc-tabs no-print">
        {tabs.map(tab => (
          <button key={tab.key} onClick={() => loadTab(tab.key)} className={`sysc-tab ${activeTab===tab.key?'active':''}`}>
            {tab.emoji} {tab.label}
          </button>
        ))}
      </div>

      {error && <div className="sysc-error">{error}</div>}

      {loading && (
        <div style={{ display:'flex', justifyContent:'center', alignItems:'center', height:180 }}>
          <div className="spinner"/>
        </div>
      )}

      {!loading && (
        <div className="sysc-sheet">
          {activeTab === 'bilan' && <BilanTab data={bilanData} entite={entite} periode={periode} onNoteClick={handleNoteClick} />}
          {activeTab === 'cr'    && <CRTab    data={crData}    entite={entite} periode={periode} onNoteClick={handleNoteClick} />}
          {activeTab === 'tft'   && <TFTTab   data={tftData}   entite={entite} periode={periode} onNoteClick={handleNoteClick} />}
          {activeTab === 'notes' && (
            <NotesTab
              data={notesData}
              periodeId={importData?.period?.id || importData?.period}
              initialNote={targetNote}
            />
          )}
        </div>
      )}
    </div>
  );
}