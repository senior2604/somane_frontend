import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FiAlertTriangle,
  FiCheckCircle,
  FiChevronDown,
  FiChevronRight,
  FiDownload,
  FiPrinter,
  FiRefreshCw,
  FiTrendingDown,
  FiTrendingUp,
} from 'react-icons/fi';
import { apiClient } from '../../../../services/apiClient';
import { useEntity } from '../../../../context/EntityContext';
import {
  syscohadaStyles,
  OfficialHeader,
  fmt,
  fmtSigned,
} from '../../../financial-reports/pages/statements-syscohada/shared';

const getYearStart = () => `${new Date().getFullYear()}-01-01`;
const getYearEnd = () => `${new Date().getFullYear()}-12-31`;

const normalizeList = (value) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.results)) return value.results;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.records)) return value.records;
  if (Array.isArray(value?.data?.results)) return value.data.results;
  return [];
};

const toNumber = (value) => {
  const number = Number(value || 0);
  return Number.isFinite(number) ? number : 0;
};

const getDebit = (account) => account.total_debit ?? account.movement_debit ?? account.debit ?? 0;
const getCredit = (account) => account.total_credit ?? account.movement_credit ?? account.credit ?? 0;
const getOpeningBalance = (account) => account.opening_balance ?? account.initial_balance ?? account.balance_initial ?? 0;
const getClosingBalance = (account) => (
  account.balance ??
  account.closing_balance ??
  account.current_balance ??
  (toNumber(getOpeningBalance(account)) + toNumber(getDebit(account)) - toNumber(getCredit(account)))
);

const codeOf = (account) => String(account.account_code || account.code || '').trim();
const labelOf = (account) => account.account_name || account.name || account.label || codeOf(account);
const startsAny = (code, prefixes) => prefixes.some((prefix) => code.startsWith(prefix));
const debitBalance = (account) => Math.max(toNumber(getClosingBalance(account)), 0);
const creditBalance = (account) => Math.max(-toNumber(getClosingBalance(account)), 0);

const detail = (accounts, prefixes, amountGetter) => accounts
  .filter((account) => startsAny(codeOf(account), prefixes))
  .map((account) => ({
    code: codeOf(account),
    label: labelOf(account),
    solde: toNumber(amountGetter(account)),
  }))
  .filter((item) => item.code)
  .sort((a, b) => a.code.localeCompare(b.code, 'fr'));

const sumDetail = (rows) => rows.reduce((total, item) => total + toNumber(item.solde), 0);

const makeEntry = (libelle, options = {}) => ({
  libelle,
  ref_code: options.ref_code || '',
  note: options.note || '',
  solde: toNumber(options.solde),
  brut: toNumber(options.brut ?? options.solde),
  amort: toNumber(options.amort),
  detail: options.detail || [],
  detail_net: options.detail_net || options.detail || [],
  detail_brut: options.detail_brut || [],
  detail_amort: options.detail_amort || [],
  line_type: options.line_type || 'account',
  label_calc: options.label_calc || null,
});

const makePoste = (libelle, options = {}) => ({
  libelle,
  ref_code: options.ref_code || '',
  note: options.note || '',
  solde: toNumber(options.solde),
  detail: options.detail || [],
  line_type: options.line_type || 'account',
});

const rowClass = (key, libelle = '') => {
  const ref = String(key || '').toUpperCase();
  const label = String(libelle || '').toUpperCase();
  if (['BZ', 'DZ', 'XI', 'ZH'].includes(ref)) return 'tr-green-official';
  if (['AZ', 'BK', 'BT', 'DF', 'DP', 'DT', 'XA', 'XB', 'XC', 'XD', 'XE', 'XF', 'XG', 'XH', 'ZB', 'ZC', 'ZD', 'ZE', 'ZF', 'ZG'].includes(ref)) return 'tr-blue-official';
  if (['AD', 'AI', 'AQ', 'CP', 'CV', 'DD'].includes(ref)) return 'tr-gray-official';
  if (['BA', 'BB', 'BG', 'BU', 'AP'].includes(ref)) return 'tr-bold-official';
  if (!ref && (label.includes('FLUX DE') || label.includes('ACTIF') || label.includes('PASSIF'))) return 'tr-gray-official';
  return '';
};

function DataRowWithCellDetails({ detail: detailN, detailN1, colCount, children }) {
  const [openKey, setOpenKey] = useState(null);
  const hasDetail = Array.isArray(detailN) && detailN.length > 0;
  const hasDetailN1 = Array.isArray(detailN1) && detailN1.length > 0;
  const shownDetail = openKey === 'n1' ? detailN1 : detailN;
  const toggle = (key) => setOpenKey((current) => (current === key ? null : key));

  return (
    <>
      {children(openKey, toggle, hasDetail, hasDetailN1)}
      {openKey && shownDetail?.length > 0 && (
        <tr className="tr-detail">
          <td colSpan={colCount}>
            <div className="detail-inner">
              {shownDetail.map((d, i) => (
                <div className="detail-sub" key={`${d.code}-${i}`}>
                  <span className="detail-code">{d.code}</span>
                  <span className="detail-label">{d.label}</span>
                  <span className="detail-amt">{fmt(d.solde)}</span>
                </div>
              ))}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function DataRowWithMultiCellDetails({ detailsByKey, colCount, children }) {
  const [openKey, setOpenKey] = useState(null);
  const shownDetail = openKey ? (detailsByKey?.[openKey] || []) : [];
  const hasDetails = (key) => Array.isArray(detailsByKey?.[key]) && detailsByKey[key].length > 0;
  const toggle = (key) => setOpenKey((current) => (current === key ? null : key));

  return (
    <>
      {children(openKey, toggle, hasDetails)}
      {openKey && shownDetail.length > 0 && (
        <tr className="tr-detail">
          <td colSpan={colCount}>
            <div className="detail-inner">
              {shownDetail.map((d, i) => (
                <div className="detail-sub" key={`${d.code}-${i}`}>
                  <span className="detail-code">{d.code}</span>
                  <span className="detail-label">{d.label}</span>
                  <span className="detail-amt">{fmt(d.solde)}</span>
                </div>
              ))}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function AmountWithDetail({ value, detailKey, openKey, toggle, hasDetail, signed = false }) {
  const open = openKey === detailKey;
  return (
    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
      {hasDetail && (
        <button className="expand-btn" onClick={() => toggle(detailKey)} title={open ? 'Masquer' : 'Voir le détail'}>
          {open ? <FiChevronDown size={10} /> : <FiChevronRight size={10} />}
        </button>
      )}
      {signed ? fmtSigned(value) : fmt(value)}
    </span>
  );
}

function buildComptabiliteReports(accounts) {
  const d21 = detail(accounts, ['21'], debitBalance);
  const d22 = detail(accounts, ['22'], debitBalance);
  const d23 = detail(accounts, ['23'], debitBalance);
  const d24 = detail(accounts, ['24'], debitBalance);
  const d25 = detail(accounts, ['25'], debitBalance);
  const d26 = detail(accounts, ['26'], debitBalance);
  const d27 = detail(accounts, ['27'], debitBalance);
  const d3 = detail(accounts, ['3'], debitBalance);
  const d41 = detail(accounts, ['41'], debitBalance);
  const d4Debit = accounts
    .filter((account) => codeOf(account).startsWith('4') && !codeOf(account).startsWith('41'))
    .map((account) => ({ code: codeOf(account), label: labelOf(account), solde: debitBalance(account) }))
    .filter((row) => row.code);
  const d5Debit = detail(accounts, ['5'], debitBalance);

  const c10 = detail(accounts, ['10'], creditBalance);
  const c11To15 = detail(accounts, ['11', '12', '13', '14', '15'], creditBalance);
  const c16To18 = detail(accounts, ['16', '17', '18'], creditBalance);
  const c40 = detail(accounts, ['40'], creditBalance);
  const c4Credit = accounts
    .filter((account) => codeOf(account).startsWith('4') && !codeOf(account).startsWith('40'))
    .map((account) => ({ code: codeOf(account), label: labelOf(account), solde: creditBalance(account) }))
    .filter((row) => row.code);
  const c5Credit = detail(accounts, ['5'], creditBalance);

  const charge = (account) => toNumber(getDebit(account)) - toNumber(getCredit(account));
  const produit = (account) => toNumber(getCredit(account)) - toNumber(getDebit(account));
  const p70 = detail(accounts, ['70'], produit);
  const p71To79 = detail(accounts, ['71', '72', '73', '74', '75', '77', '78', '79'], produit);
  const ch60 = detail(accounts, ['60'], charge);
  const ch61To63 = detail(accounts, ['61', '62', '63'], charge);
  const ch64To65 = detail(accounts, ['64', '65'], charge);
  const ch66 = detail(accounts, ['66'], charge);
  const ch67To69 = detail(accounts, ['67', '68', '69'], charge);
  const ch8 = detail(accounts, ['8'], charge);

  const chiffreAffaires = sumDetail(p70);
  const production = chiffreAffaires + sumDetail(p71To79);
  const achats = sumDetail(ch60);
  const services = sumDetail(ch61To63);
  const autresCharges = sumDetail(ch64To65) + sumDetail(ch67To69) + sumDetail(ch8);
  const personnel = sumDetail(ch66);
  const resultat = production - achats - services - autresCharges - personnel;

  const actif = {};
  [
    ['AD', 'IMMOBILISATIONS INCORPORELLES', sumDetail(d21), d21, '3A'],
    ['AE', 'Frais de développement et de prospection', 0, [], '3A'],
    ['AF', 'Brevets, licences, logiciels et droits similaires', 0, [], '3A'],
    ['AG', 'Fonds commercial et droit au bail', 0, [], '3A'],
    ['AH', 'Autres immobilisations incorporelles', sumDetail(d21), d21, '3A'],
    ['AI', 'IMMOBILISATIONS CORPORELLES', sumDetail([...d22, ...d23, ...d24]), [...d22, ...d23, ...d24], '3A'],
    ['AJ', 'Terrains', sumDetail(d22), d22, '3A'],
    ['AK', 'Bâtiments', sumDetail(d23), d23, '3A'],
    ['AL', 'Aménagements, agencements et installations', 0, [], '3A'],
    ['AM', 'Matériel, mobilier et actifs biologiques', sumDetail(d24), d24, '3A'],
    ['AN', 'Matériel de transport', 0, [], '3A'],
    ['AP', 'Avances et acomptes versés sur immobilisations', 0, [], '3A'],
    ['AQ', 'IMMOBILISATIONS FINANCIÈRES', sumDetail([...d25, ...d26, ...d27]), [...d25, ...d26, ...d27], '4'],
    ['AR', 'Titres de participation', sumDetail(d26), d26, '4'],
    ['AS', 'Autres immobilisations financières', sumDetail([...d25, ...d27]), [...d25, ...d27], '4'],
  ].forEach(([ref, label, value, rows, note]) => {
    const labelCalc = ['AJ', 'AK'].includes(ref)
      ? { label: '(1) dont Placement en Net', value: 0, value_n1: 0 }
      : null;
    actif[ref] = makeEntry(label, { ref_code: ref, note, solde: value, brut: value, net: value, detail: rows, detail_net: rows, detail_brut: rows, label_calc: labelCalc });
  });
  actif.AZ = makeEntry('TOTAL ACTIF IMMOBILISÉ', { ref_code: 'AZ', solde: sumDetail([...d21, ...d22, ...d23, ...d24, ...d25, ...d26, ...d27]), line_type: 'total' });
  actif.BA = makeEntry('Actif circulant HAO', { ref_code: 'BA', solde: 0, note: '5' });
  actif.BB = makeEntry('Stocks et en-cours', { ref_code: 'BB', note: '6', solde: sumDetail(d3), brut: sumDetail(d3), net: sumDetail(d3), detail: d3, detail_net: d3, detail_brut: d3 });
  actif.BG = makeEntry('Créances et emplois assimilés', { ref_code: 'BG', note: '7&8', solde: sumDetail([...d41, ...d4Debit]), brut: sumDetail([...d41, ...d4Debit]), net: sumDetail([...d41, ...d4Debit]), detail: [...d41, ...d4Debit], detail_net: [...d41, ...d4Debit], detail_brut: [...d41, ...d4Debit] });
  actif.BK = makeEntry('TOTAL ACTIF CIRCULANT', { ref_code: 'BK', solde: actif.BA.solde + actif.BB.solde + actif.BG.solde, line_type: 'total' });
  actif.BQ = makeEntry('Titres de placement', { ref_code: 'BQ', note: '9', solde: 0 });
  actif.BR = makeEntry('Valeurs à encaisser', { ref_code: 'BR', note: '10', solde: 0 });
  actif.BS = makeEntry('Banques, chèques postaux, caisse et assimilés', { ref_code: 'BS', note: '11', solde: sumDetail(d5Debit), brut: sumDetail(d5Debit), net: sumDetail(d5Debit), detail: d5Debit, detail_net: d5Debit, detail_brut: d5Debit });
  actif.BT = makeEntry('TOTAL TRÉSORERIE-ACTIF', { ref_code: 'BT', solde: actif.BQ.solde + actif.BR.solde + actif.BS.solde, line_type: 'total' });
  actif.BU = makeEntry('Écarts de conversion-Actif', { ref_code: 'BU', note: '12', solde: 0 });
  actif.BZ = makeEntry('TOTAL GÉNÉRAL ACTIF', { ref_code: 'BZ', solde: actif.AZ.solde + actif.BK.solde + actif.BT.solde + actif.BU.solde, line_type: 'total' });

  const passif = {};
  passif.CA = makeEntry('Capital', { ref_code: 'CA', note: '13', solde: sumDetail(c10), detail: c10, detail_net: c10 });
  passif.CB = makeEntry('Apporteurs capital non appelé', { ref_code: 'CB', solde: 0 });
  passif.CC = makeEntry('Primes liées au capital social', { ref_code: 'CC', solde: 0 });
  passif.CD = makeEntry('Écarts de réévaluation', { ref_code: 'CD', solde: 0 });
  passif.CE = makeEntry('Réserves indisponibles', { ref_code: 'CE', solde: 0, note: '14' });
  passif.CF = makeEntry('Réserves libres', { ref_code: 'CF', solde: sumDetail(c11To15), note: '14', detail: c11To15, detail_net: c11To15 });
  passif.CG = makeEntry('Report à nouveau', { ref_code: 'CG', solde: 0 });
  passif.CH = makeEntry('Résultat net de l\'exercice', { ref_code: 'CH', solde: resultat });
  passif.CI = makeEntry('Autres capitaux propres', { ref_code: 'CI', solde: 0 });
  passif.CJ = makeEntry('Subventions d\'investissement', { ref_code: 'CJ', note: '15', solde: 0 });
  passif.CK = makeEntry('Provisions réglementées', { ref_code: 'CK', note: '15', solde: 0 });
  passif.CP = makeEntry('TOTAL CAPITAUX PROPRES ET RESSOURCES ASSIMILÉES', { ref_code: 'CP', solde: sumDetail(c10) + sumDetail(c11To15) + resultat, line_type: 'total' });
  passif.DA = makeEntry('Emprunts et dettes financières diverses', { ref_code: 'DA', note: '16', solde: sumDetail(c16To18), detail: c16To18, detail_net: c16To18 });
  passif.DB = makeEntry('Dettes de location acquisition', { ref_code: 'DB', solde: 0 });
  passif.DC = makeEntry('Provisions pour risques et charges', { ref_code: 'DC', solde: 0 });
  passif.DD = makeEntry('TOTAL DETTES FINANCIÈRES', { ref_code: 'DD', solde: passif.DA.solde, line_type: 'total' });
  passif.DE = makeEntry('Ressources assimilées', { ref_code: 'DE', solde: 0 });
  passif.DF = makeEntry('TOTAL DETTES FINANCIÈRES ET RESSOURCES ASSIMILÉES', { ref_code: 'DF', solde: passif.DD.solde, line_type: 'total' });
  passif.DH = makeEntry('Dettes circulantes HAO', { ref_code: 'DH', solde: 0 });
  passif.DI = makeEntry('Clients, avances reçues', { ref_code: 'DI', solde: 0 });
  passif.DJ = makeEntry('Fournisseurs d\'exploitation', { ref_code: 'DJ', note: '17', solde: sumDetail(c40), detail: c40, detail_net: c40 });
  passif.DK = makeEntry('Dettes fiscales et sociales', { ref_code: 'DK', note: '18', solde: sumDetail(c4Credit), detail: c4Credit, detail_net: c4Credit });
  passif.DL = makeEntry('Autres dettes', { ref_code: 'DL', note: '19', solde: 0 });
  passif.DM = makeEntry('TOTAL PASSIF CIRCULANT', { ref_code: 'DM', solde: passif.DH.solde + passif.DI.solde + passif.DJ.solde + passif.DK.solde + passif.DL.solde, line_type: 'total' });
  passif.DN = makeEntry('Banques, crédits d\'escompte', { ref_code: 'DN', note: '20', solde: sumDetail(c5Credit), detail: c5Credit, detail_net: c5Credit });
  passif.DO = makeEntry('Banques, établissements financiers et crédits de trésorerie', { ref_code: 'DO', note: '20', solde: 0 });
  passif.DP = makeEntry('TOTAL TRÉSORERIE-PASSIF', { ref_code: 'DP', solde: passif.DN.solde + passif.DO.solde, line_type: 'total' });
  passif.DQ = makeEntry('Écarts de conversion-Passif', { ref_code: 'DQ', solde: 0 });
  passif.DZ = makeEntry('TOTAL GÉNÉRAL PASSIF', { ref_code: 'DZ', solde: passif.CP.solde + passif.DF.solde + passif.DM.solde + passif.DP.solde + passif.DQ.solde, line_type: 'total' });

  const crRows = [
    ['TA', 'Ventes de marchandises', sumDetail(p70), p70, '21', 'postes'],
    ['TB', 'Ventes de produits fabriqués', 0, [], '21', 'postes'],
    ['TC', 'Travaux, services vendus', 0, [], '21', 'postes'],
    ['TD', 'Produits accessoires', sumDetail(p71To79), p71To79, '21', 'postes'],
    ['XA', 'CHIFFRE D\'AFFAIRES', chiffreAffaires, [], '', 'totaux'],
    ['TE', 'Production stockée ou déstockage', 0, [], '', 'postes'],
    ['TF', 'Production immobilisée', 0, [], '', 'postes'],
    ['TG', 'Subventions d\'exploitation', 0, [], '', 'postes'],
    ['TH', 'Autres produits', sumDetail(p71To79), p71To79, '', 'postes'],
    ['TI', 'Transferts de charges d\'exploitation', 0, [], '', 'postes'],
    ['TJ', 'Reprises de provisions, dépréciations et autres', 0, [], '', 'postes'],
    ['XB', 'PRODUCTION DE L\'EXERCICE', production, [], '', 'totaux'],
    ['RA', 'Achats de marchandises', sumDetail(ch60), ch60, '22', 'postes'],
    ['RB', 'Variation de stocks de marchandises', 0, [], '22', 'postes'],
    ['RC', 'Achats de matières premières et fournitures liées', 0, [], '22', 'postes'],
    ['RD', 'Variation de stocks de matières premières et fournitures liées', 0, [], '22', 'postes'],
    ['RE', 'Autres achats', 0, [], '22', 'postes'],
    ['RF', 'Variation de stocks d\'autres approvisionnements', 0, [], '22', 'postes'],
    ['RG', 'Transports', 0, [], '23', 'postes'],
    ['RH', 'Services extérieurs', sumDetail(ch61To63), ch61To63, '24', 'postes'],
    ['RI', 'Impôts et taxes', 0, [], '25', 'postes'],
    ['RJ', 'Autres charges', sumDetail([...ch64To65, ...ch67To69, ...ch8]), [...ch64To65, ...ch67To69, ...ch8], '26', 'postes'],
    ['XC', 'VALEUR AJOUTÉE', production - achats - services, [], '', 'totaux'],
    ['RK', 'Charges de personnel', sumDetail(ch66), ch66, '27', 'postes'],
    ['XD', 'EXCÉDENT BRUT D\'EXPLOITATION', production - achats - services - personnel, [], '', 'totaux'],
    ['RL', 'Dotations aux amortissements, aux provisions et dépréciations', 0, [], '28', 'postes'],
    ['XE', 'RÉSULTAT D\'EXPLOITATION', production - achats - services - personnel - autresCharges, [], '', 'totaux'],
    ['TK', 'Revenus financiers et produits assimilés', 0, [], '29', 'postes'],
    ['TL', 'Reprises de provisions et dépréciations financières', 0, [], '29', 'postes'],
    ['TM', 'Transferts de charges financières', 0, [], '29', 'postes'],
    ['RN', 'Frais financiers et charges assimilées', 0, [], '29', 'postes'],
    ['RO', 'Dotations aux provisions et dépréciations financières', 0, [], '29', 'postes'],
    ['XF', 'RÉSULTAT FINANCIER', 0, [], '', 'totaux'],
    ['XG', 'RÉSULTAT DES ACTIVITÉS ORDINAIRES', resultat, [], '', 'totaux'],
    ['TN', 'Produits des cessions d\'immobilisations', 0, [], '30', 'postes'],
    ['TO', 'Autres produits HAO', 0, [], '30', 'postes'],
    ['RP', 'Valeurs comptables des cessions d\'immobilisations', 0, [], '30', 'postes'],
    ['RQ', 'Autres charges HAO', 0, [], '30', 'postes'],
    ['XH', 'RÉSULTAT HORS ACTIVITÉS ORDINAIRES', 0, [], '', 'totaux'],
    ['RS', 'Participation des travailleurs', 0, [], '', 'postes'],
    ['RT', 'Impôts sur le résultat', 0, [], '', 'postes'],
    ['XI', 'RÉSULTAT NET DE L\'EXERCICE', resultat, [], '', 'totaux'],
  ];

  const cr = { postes: {}, totaux: {}, postes_n1: {}, totaux_n1: {}, lignes: {}, ordre_lignes: [], resultat_net: resultat, est_benefice: resultat >= 0 };
  crRows.forEach(([ref, label, value, rows, note, bucket]) => {
    cr.ordre_lignes.push(ref);
    cr.lignes[ref] = { libelle: label, ref_code: ref, line_type: bucket === 'totaux' ? 'total' : 'account', detail: rows };
    if (bucket === 'totaux') cr.totaux[ref] = value;
    else cr.postes[ref] = makePoste(label, { ref_code: ref, note, solde: value, detail: rows });
  });

  const cash = accounts.filter((account) => codeOf(account).startsWith('5'));
  const opening = cash.reduce((total, account) => total + toNumber(getOpeningBalance(account)), 0);
  const inflows = cash.reduce((total, account) => total + toNumber(getDebit(account)), 0);
  const outflows = cash.reduce((total, account) => total + toNumber(getCredit(account)), 0);
  const variation = inflows - outflows;
  const closing = opening + variation;
  const cashDetail = cash.map((account) => ({ code: codeOf(account), label: labelOf(account), solde: toNumber(getClosingBalance(account)) }));

  const tftRows = [
    ['ZA', 'Trésorerie nette au 1er Janvier', opening, cashDetail, 'postes'],
    ['', 'Flux de trésorerie provenant des activités opérationnelles', 0, [], 'section'],
    ['FA', 'Capacité d\'Autofinancement Globale', resultat, [], 'postes'],
    ['FB', '- Variation de l\'actif circulant HAO', 0, [], 'postes'],
    ['FC', '- Variation des stocks', 0, [], 'postes'],
    ['FD', '- Variation des créances et emplois assimilés', 0, [], 'postes'],
    ['FE', '+ Variation du passif circulant', 0, [], 'postes'],
    ['ZB', 'Flux de trésorerie provenant des activités opérationnelles', resultat, [], 'totaux'],
    ['', 'Flux de trésorerie provenant des activités d\'investissement', 0, [], 'section'],
    ['FF', '- Décaissements liés aux acquisitions d\'immobilisations incorporelles', 0, [], 'postes'],
    ['FG', '- Décaissements liés aux acquisitions d\'immobilisations corporelles', 0, [], 'postes'],
    ['FH', '- Décaissements liés aux acquisitions d\'immobilisations financières', 0, [], 'postes'],
    ['FI', '+ Encaissements liés aux cessions d\'immobilisations incorporelles et corporelles', 0, [], 'postes'],
    ['FJ', '+ Encaissements liés aux cessions d\'immobilisations financières', 0, [], 'postes'],
    ['ZC', 'Flux de trésorerie provenant des opérations d\'investissements', 0, [], 'totaux'],
    ['', 'Flux de trésorerie provenant du financement par capitaux propres', 0, [], 'section'],
    ['ZD', 'Flux de trésorerie provenant des capitaux propres', 0, [], 'totaux'],
    ['', 'Trésorerie provenant du financement par capitaux étrangers', 0, [], 'section'],
    ['ZE', 'Flux de trésorerie provenant des capitaux étrangers', 0, [], 'totaux'],
    ['ZF', 'Flux de trésorerie provenant des activités de financement', 0, [], 'totaux'],
    ['ZG', 'VARIATION DE LA TRESORERIE NETTE DE LA PERIODE (B+C+F)', variation, [], 'totaux'],
    ['ZH', 'Trésorerie nette au 31 Décembre', closing, cashDetail, 'totaux'],
  ];
  const tft = { postes: {}, totaux: {}, postes_n1: {}, totaux_n1: {}, lignes: {}, ordre_lignes: [], tresorerie_ouverture: opening, variation_tresorerie: variation, tresorerie_cloture: closing, est_coherent: true };
  tftRows.forEach(([ref, label, value, rows, bucket], index) => {
    const key = ref || `TFT_SECTION_${index}`;
    tft.ordre_lignes.push(key);
    tft.lignes[key] = {
      libelle: label,
      ref_code: ref,
      line_type: bucket === 'totaux' ? 'total' : bucket,
      detail: rows,
      stacked_values: ref === 'ZH'
        ? [
            { label: 'Trésorerie nette au 31 Décembre (G+A)', value: closing, value_n1: 0 },
            { label: 'Contrôle : Trésorerie actif N - Trésorerie passif N', value: closing, value_n1: 0 },
          ]
        : undefined,
    };
    if (bucket === 'totaux') tft.totaux[ref] = value;
    else if (bucket === 'postes') tft.postes[ref] = makePoste(label, { ref_code: ref, solde: value, detail: rows });
  });

  return {
    bilan: {
      type: 'bilan',
      actif,
      passif,
      actif_n1: {},
      passif_n1: {},
      total_actif: actif.BZ.solde,
      total_passif: passif.DZ.solde,
      est_equilibre: Math.abs(actif.BZ.solde - passif.DZ.solde) <= 1,
    },
    cr,
    tft,
  };
}

function BilanTab({ data, entite, periode, section = 'actif' }) {
  if (!data) return null;
  const source = section === 'actif' ? data.actif : data.passif;
  const sourceN1 = section === 'actif' ? data.actif_n1 || {} : data.passif_n1 || {};
  const annee = periode?.date_end?.slice(0, 4) || new Date().getFullYear();
  const anneePrev = String(parseInt(annee, 10) - 1);
  let dataIdx = 0;

  const renderLibelleWithCalc = (lib, labelCalc) => (
    <div className="bilan-libelle-wrap">
      <div>{lib}</div>
      {labelCalc && (
        <div className="bilan-label-calc">
          <span>{labelCalc.label}</span>
          <strong>{fmt(labelCalc.value ?? 0)}</strong>
          <span>/</span>
          <strong>{fmt(labelCalc.value_n1 ?? 0)}</strong>
        </div>
      )}
    </div>
  );

  const renderRows = () => Object.entries(source).flatMap(([key, entry]) => {
    const solde = entry.solde ?? 0;
    const brut = entry.brut ?? solde;
    const amort = entry.amort ?? 0;
    const soldeN1 = sourceN1[key]?.solde ?? 0;
    const ref = entry.ref_code ?? key;
    const lib = entry.libelle || key;
    const cls = rowClass(ref, lib);
    const detailsByKey = {
      brut: entry.detail_brut || [],
      amort: entry.detail_amort || [],
      net: entry.detail_net || entry.detail || [],
      n1: sourceN1[key]?.detail_net || [],
    };

    if (section === 'actif') {
      const row = (
        <DataRowWithMultiCellDetails key={key} detailsByKey={detailsByKey} colCount={7}>
          {(openKey, toggle, hasDetails) => (
            <tr className={cls || `tr-data ${dataIdx++ % 2 === 0 ? 'tr-even' : 'tr-odd'}`}>
              <td className="td-ref">{ref}</td>
              <td className="td-lib">{renderLibelleWithCalc(lib, entry.label_calc)}</td>
              <td className="td-note">{entry.note || ''}</td>
              <td className="td-num"><AmountWithDetail value={brut} detailKey="brut" openKey={openKey} toggle={toggle} hasDetail={hasDetails('brut')} /></td>
              <td className="td-num"><AmountWithDetail value={amort} detailKey="amort" openKey={openKey} toggle={toggle} hasDetail={hasDetails('amort')} /></td>
              <td className="td-num"><AmountWithDetail value={solde} detailKey="net" openKey={openKey} toggle={toggle} hasDetail={hasDetails('net')} /></td>
              <td className="td-num"><AmountWithDetail value={soldeN1} detailKey="n1" openKey={openKey} toggle={toggle} hasDetail={hasDetails('n1')} /></td>
            </tr>
          )}
        </DataRowWithMultiCellDetails>
      );
      return [row];
    }

    return [(
      <DataRowWithMultiCellDetails key={key} detailsByKey={detailsByKey} colCount={5}>
        {(openKey, toggle, hasDetails) => (
          <tr className={cls || `tr-data ${dataIdx++ % 2 === 0 ? 'tr-even' : 'tr-odd'}`}>
            <td className="td-ref">{ref}</td>
            <td className="td-lib">{renderLibelleWithCalc(lib, entry.label_calc)}</td>
            <td className="td-note">{entry.note || ''}</td>
            <td className="td-num"><AmountWithDetail value={solde} detailKey="net" openKey={openKey} toggle={toggle} hasDetail={hasDetails('net')} /></td>
            <td className="td-num"><AmountWithDetail value={soldeN1} detailKey="n1" openKey={openKey} toggle={toggle} hasDetail={hasDetails('n1')} /></td>
          </tr>
        )}
      </DataRowWithMultiCellDetails>
    )];
  });

  return (
    <div style={{ paddingBottom: 24 }}>
      <OfficialHeader
        entite={entite}
        periode={periode}
        pageNum={1}
        totalPages={1}
        docType={section === 'actif' ? 'BILAN ACTIF' : 'BILAN PASSIF'}
        title="ÉTATS FINANCIERS ANNUELS"
        subtitle={section === 'actif' ? 'BILAN - ACTIF' : 'BILAN - PASSIF'}
      />

      {section === 'actif' ? (
        <table className="sysc-table">
          <thead>
            <tr>
              <th className="th-main" rowSpan={2} style={{ width: 34 }}>Réf.</th>
              <th className="th-main left" rowSpan={2}>ACTIF</th>
              <th className="th-main" rowSpan={2} style={{ width: 36 }}>NOTE</th>
              <th className="th-year" colSpan={3}>Exercice {annee}</th>
              <th className="th-year" style={{ width: 90 }}>Exercice {anneePrev}</th>
            </tr>
            <tr>
              <th className="th-sub" style={{ width: 90 }}>BRUT</th>
              <th className="th-sub" style={{ width: 90 }}>AMORT./DEPREC.</th>
              <th className="th-sub" style={{ width: 90 }}>NET</th>
              <th className="th-sub" style={{ width: 90 }}>NET</th>
            </tr>
          </thead>
          <tbody>{renderRows()}</tbody>
        </table>
      ) : (
        <>
          <table className="sysc-table">
            <thead>
              <tr>
                <th className="th-main" style={{ width: 34 }}>Réf.</th>
                <th className="th-main left">PASSIF</th>
                <th className="th-main" style={{ width: 36 }}>NOTE</th>
                <th className="th-year" style={{ width: 110 }}>Exercice {annee}</th>
                <th className="th-year" style={{ width: 110 }}>Exercice {anneePrev}</th>
              </tr>
            </thead>
            <tbody>{renderRows()}</tbody>
          </table>
          <div className={`balance-badge ${data.est_equilibre ? 'balance-ok' : 'balance-err'}`}>
            {data.est_equilibre ? (
              <><FiCheckCircle size={14} /> Bilan équilibré - Actif = Passif = {fmt(data.total_actif)} F CFA</>
            ) : (
              <><FiAlertTriangle size={14} /> Bilan déséquilibré - Écart : {fmt(Math.abs((data.total_actif || 0) - (data.total_passif || 0)))} F CFA</>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function CRTab({ data, entite, periode }) {
  if (!data) return null;
  const annee = periode?.date_end?.slice(0, 4) || new Date().getFullYear();
  const anneePrev = String(parseInt(annee, 10) - 1);
  let dataIdx = 0;

  const renderRows = () => data.ordre_lignes.flatMap((key) => {
    const inTotaux = key in data.totaux;
    const entry = data.postes[key];
    const solde = inTotaux ? data.totaux[key] ?? 0 : entry?.solde ?? 0;
    const soldeN1 = inTotaux ? data.totaux_n1?.[key] ?? 0 : data.postes_n1?.[key]?.solde ?? 0;
    const meta = data.lignes[key] || {};
    const ref = meta.ref_code || key;
    const lib = entry?.libelle || meta.libelle || key;
    const cls = rowClass(ref, lib);

    if (inTotaux) {
      return [(
        <DataRowWithCellDetails key={key} detail={meta.detail || []} detailN1={[]} colCount={6}>
          {(openKey, toggle, hasDetail, hasDetailN1) => (
            <tr className={cls || 'tr-subtotal'}>
              <td className="td-ref">{ref}</td>
              <td className="td-lib" colSpan={3}>{ref === 'XI' ? "RÉSULTAT NET DE L'EXERCICE (bénéfice + ou perte −)" : lib}</td>
              <td className="td-num"><AmountWithDetail value={ref === 'XI' ? data.resultat_net : solde} detailKey="n" openKey={openKey} toggle={toggle} hasDetail={hasDetail} signed={ref === 'XI'} /></td>
              <td className="td-num"><AmountWithDetail value={soldeN1} detailKey="n1" openKey={openKey} toggle={toggle} hasDetail={hasDetailN1} signed /></td>
            </tr>
          )}
        </DataRowWithCellDetails>
      )];
    }

    const isEven = dataIdx++ % 2 === 0;
    return [(
      <DataRowWithCellDetails key={key} detail={entry?.detail || []} detailN1={[]} colCount={6}>
        {(openKey, toggle, hasDetail, hasDetailN1) => (
          <tr className={`tr-data ${isEven ? 'tr-even' : 'tr-odd'}`}>
            <td className="td-ref">{ref}</td>
            <td className="td-lib">{lib}</td>
            <td className="td-sign">{solde < 0 ? '−' : '+'}</td>
            <td className="td-note">{entry?.note || ''}</td>
            <td className="td-num"><AmountWithDetail value={solde} detailKey="n" openKey={openKey} toggle={toggle} hasDetail={hasDetail} /></td>
            <td className="td-num"><AmountWithDetail value={soldeN1} detailKey="n1" openKey={openKey} toggle={toggle} hasDetail={hasDetailN1} signed /></td>
          </tr>
        )}
      </DataRowWithCellDetails>
    )];
  });

  return (
    <div style={{ paddingBottom: 24 }}>
      <OfficialHeader entite={entite} periode={periode} pageNum={1} totalPages={1} docType="COMPTE DE RÉSULTAT" title="ÉTATS FINANCIERS ANNUELS" subtitle="COMPTE DE RÉSULTAT" />
      <table className="sysc-table">
        <thead>
          <tr>
            <th className="th-main" style={{ width: 34 }}>Réf.</th>
            <th className="th-main left">LIBELLÉS</th>
            <th className="th-main" style={{ width: 28 }}></th>
            <th className="th-main" style={{ width: 38 }}>NOTE</th>
            <th className="th-year" style={{ width: 110 }}>Exercice {annee}<div style={{ fontWeight: 400, fontSize: 8, textTransform: 'none' }}>NET</div></th>
            <th className="th-year" style={{ width: 110 }}>Exercice {anneePrev}<div style={{ fontWeight: 400, fontSize: 8, textTransform: 'none' }}>NET</div></th>
          </tr>
        </thead>
        <tbody>{renderRows()}</tbody>
      </table>

      <div className={`resultat-box ${data.resultat_net >= 0 ? 'benefice' : 'perte'}`}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {data.resultat_net >= 0 ? <FiTrendingUp size={20} color="#1b5e20" /> : <FiTrendingDown size={20} color="#b71c1c" />}
          <div>
            <div style={{ fontWeight: 700, fontSize: 12, color: data.resultat_net >= 0 ? '#1b5e20' : '#b71c1c' }}>
              {data.resultat_net >= 0 ? "Bénéfice net de l'exercice" : "Perte nette de l'exercice"}
            </div>
            <div style={{ fontSize: 10, color: '#555', marginTop: 2 }}>Produits − Charges = Résultat net</div>
          </div>
        </div>
        <div style={{ fontFamily: "'DM Mono','Courier New',monospace", fontSize: 18, fontWeight: 700, color: data.resultat_net >= 0 ? '#1b5e20' : '#b71c1c' }}>
          {fmtSigned(data.resultat_net)} F CFA
        </div>
      </div>
    </div>
  );
}

function TFTTab({ data, entite, periode }) {
  if (!data) return null;
  const annee = periode?.date_end?.slice(0, 4) || new Date().getFullYear();
  const anneePrev = String(parseInt(annee, 10) - 1);
  let dataIdx = 0;

  const renderRows = () => data.ordre_lignes.flatMap((key) => {
    const inTotaux = key in data.totaux;
    const entry = data.postes[key];
    const solde = inTotaux ? data.totaux[key] ?? 0 : entry?.solde ?? 0;
    const meta = data.lignes[key] || {};
    const ref = meta.ref_code ?? (key.startsWith('TFT_SECTION_') ? '' : key);
    const lib = entry?.libelle || meta.libelle || key;
    const cls = rowClass(ref, lib);

    if (meta.line_type === 'section') {
      return [(
        <tr key={key} className="tr-gray-official">
          <td className="td-ref"></td>
          <td className="td-lib" colSpan={4}>{lib}</td>
        </tr>
      )];
    }

    if (inTotaux) {
      if (ref === 'ZH') {
        const stackedValues = meta.stacked_values || [];
        return [(
          <DataRowWithCellDetails key={key} detail={meta.detail || []} detailN1={[]} colCount={5}>
            {(openKey, toggle, hasDetail) => (
              <tr className="tr-total tft-zh-row">
                <td className="td-ref">ZH</td>
                <td className="td-lib" colSpan={2}>
                  <div className="tft-zh-lib">
                    <div>{stackedValues[0]?.label || 'Trésorerie nette au 31 Décembre (G+A)'}</div>
                    <div>{stackedValues[1]?.label || 'Contrôle : Trésorerie actif N - Trésorerie passif N'}</div>
                  </div>
                </td>
                <td className="td-num">
                  <div className="tft-zh-values">
                    <div>{fmt(stackedValues[0]?.value ?? solde)}</div>
                    <div>
                      <AmountWithDetail value={stackedValues[1]?.value ?? solde} detailKey="n" openKey={openKey} toggle={toggle} hasDetail={hasDetail} />
                    </div>
                  </div>
                </td>
                <td className="td-num">
                  <div className="tft-zh-values">
                    <div>{fmt(stackedValues[0]?.value_n1 ?? 0)}</div>
                    <div>{fmt(stackedValues[1]?.value_n1 ?? 0)}</div>
                  </div>
                </td>
              </tr>
            )}
          </DataRowWithCellDetails>
        )];
      }

      return [(
        <DataRowWithCellDetails key={key} detail={meta.detail || []} detailN1={[]} colCount={5}>
          {(openKey, toggle, hasDetail) => (
            <tr className={cls || 'tr-subtotal'}>
              <td className="td-ref">{ref}</td>
              <td className="td-lib" colSpan={2}>{lib}</td>
              <td className="td-num"><AmountWithDetail value={solde} detailKey="n" openKey={openKey} toggle={toggle} hasDetail={hasDetail} signed={['ZG', 'ZH'].includes(ref)} /></td>
              <td className="td-num">{fmt(0)}</td>
            </tr>
          )}
        </DataRowWithCellDetails>
      )];
    }

    const isEven = dataIdx++ % 2 === 0;
    return [(
      <DataRowWithCellDetails key={key} detail={entry?.detail || []} detailN1={[]} colCount={5}>
        {(openKey, toggle, hasDetail) => (
          <tr className={`tr-data ${isEven ? 'tr-even' : 'tr-odd'}`}>
            <td className="td-ref">{ref}</td>
            <td className="td-lib">{lib}</td>
            <td className="td-sign">{solde < 0 ? '-' : '+'}</td>
            <td className="td-num"><AmountWithDetail value={solde} detailKey="n" openKey={openKey} toggle={toggle} hasDetail={hasDetail} /></td>
            <td className="td-num">{fmt(0)}</td>
          </tr>
        )}
      </DataRowWithCellDetails>
    )];
  });

  return (
    <div style={{ paddingBottom: 24 }}>
      <OfficialHeader entite={entite} periode={periode} pageNum={1} totalPages={1} docType="TABLEAU DES FLUX DE TRÉSORERIE" title="ÉTATS FINANCIERS ANNUELS" subtitle="TABLEAU DES FLUX DE TRÉSORERIE" />
      <table className="sysc-table">
        <thead>
          <tr>
            <th className="th-main" style={{ width: 34 }}>Réf.</th>
            <th className="th-main left">LIBELLÉS</th>
            <th className="th-main" style={{ width: 28 }}></th>
            <th className="th-year" style={{ width: 110 }}>Exercice {annee}</th>
            <th className="th-year" style={{ width: 110 }}>Exercice {anneePrev}</th>
          </tr>
        </thead>
        <tbody>{renderRows()}</tbody>
      </table>
    </div>
  );
}

export default function EtatsFinanciersComptabiliteSyscohadaExact() {
  const { activeEntity } = useEntity();
  const [activeTab, setActiveTab] = useState('bilan_actif');
  const [filters, setFilters] = useState({ date_from: getYearStart(), date_to: getYearEnd(), state: 'posted' });
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const periode = useMemo(() => ({
    date_start: filters.date_from,
    date_end: filters.date_to,
  }), [filters]);

  const loadData = useCallback(async () => {
    if (!activeEntity?.id) {
      setAccounts([]);
      setError('Veuillez sélectionner une entité.');
      return;
    }
    try {
      setLoading(true);
      setError('');
      const response = await apiClient.get('/compta/move-lines/grand-livre/', {
        params: {
          company: activeEntity.id,
          date_from: filters.date_from,
          date_to: filters.date_to,
          state: filters.state,
        },
      });
      const data = response?.data || response;
      setAccounts(normalizeList(data?.results || data));
    } catch (err) {
      console.error('Erreur chargement états financiers comptabilité:', err);
      setAccounts([]);
      setError('Impossible de charger les écritures comptables.');
    } finally {
      setLoading(false);
    }
  }, [activeEntity, filters]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const reports = useMemo(() => buildComptabiliteReports(accounts), [accounts]);

  const exportCsv = () => {
    const rows = [['Etat', activeTab], ['Date début', filters.date_from], ['Date fin', filters.date_to]];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(';')).join('\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `etat-financier-${activeTab}-${filters.date_from}-${filters.date_to}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="sysc-page">
      <style>{syscohadaStyles + EXTRA_STYLES}</style>

      <div className="sysc-navbar no-print">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ color: 'white', fontSize: 12, fontWeight: 700 }}>
            Format officiel SYSCOHADA
            <span style={{ color: '#ffd700', marginLeft: 8, fontSize: 11, fontWeight: 400 }}>— Comptabilité</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <input className="sysc-filter-input" type="date" value={filters.date_from} onChange={(event) => setFilters((prev) => ({ ...prev, date_from: event.target.value }))} />
          <input className="sysc-filter-input" type="date" value={filters.date_to} onChange={(event) => setFilters((prev) => ({ ...prev, date_to: event.target.value }))} />
          <select className="sysc-filter-input" value={filters.state} onChange={(event) => setFilters((prev) => ({ ...prev, state: event.target.value }))}>
            <option value="posted">Comptabilisées</option>
            <option value="draft">Brouillons</option>
            <option value="all">Toutes</option>
          </select>
          <button className="sysc-navbar-btn" onClick={loadData} disabled={loading}><FiRefreshCw size={12} /> Actualiser</button>
          <button className="sysc-navbar-btn" onClick={exportCsv}><FiDownload size={12} /> CSV</button>
          <button className="sysc-navbar-btn primary" onClick={() => window.print()}><FiPrinter size={12} /> Imprimer</button>
        </div>
      </div>

      <div className="sysc-tabs no-print">
        {[
          ['bilan_actif', 'Bilan actif'],
          ['bilan_passif', 'Bilan passif'],
          ['cr', 'Compte de résultat'],
          ['tft', 'Flux de trésorerie'],
        ].map(([key, label]) => (
          <button key={key} className={`sysc-tab ${activeTab === key ? 'active' : ''}`} onClick={() => setActiveTab(key)}>
            {label}
          </button>
        ))}
      </div>

      {error && <div className="sysc-error">⚠ {error}</div>}

      <div className="sysc-sheet">
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
            <div className="spinner" />
          </div>
        )}
        {!loading && activeTab === 'bilan_actif' && <BilanTab data={reports.bilan} entite={activeEntity} periode={periode} section="actif" />}
        {!loading && activeTab === 'bilan_passif' && <BilanTab data={reports.bilan} entite={activeEntity} periode={periode} section="passif" />}
        {!loading && activeTab === 'cr' && <CRTab data={reports.cr} entite={activeEntity} periode={periode} />}
        {!loading && activeTab === 'tft' && <TFTTab data={reports.tft} entite={activeEntity} periode={periode} />}
      </div>
    </div>
  );
}

const EXTRA_STYLES = `
  .tr-gray-official td {
    background: #d9d9d9 !important;
    color: #000 !important;
    font-weight: 800 !important;
  }
  .tr-blue-official td {
    background: #082b68 !important;
    color: #fff !important;
    font-weight: 800 !important;
  }
  .tr-green-official td {
    background: #548235 !important;
    color: #fff !important;
    font-weight: 800 !important;
  }
  .tr-bold-official td {
    background: #fff !important;
    color: #000 !important;
    font-weight: 800 !important;
  }
  .tr-detail td {
    background: #f5f8ff !important;
    padding: 0 !important;
    border: 1px solid #dde4ed !important;
  }
  .detail-inner { padding: 4px 12px 6px 40px; }
  .detail-sub {
    display: flex;
    gap: 8px;
    align-items: center;
    padding: 3px 0;
    border-bottom: 1px dashed #dde4ed;
    font-size: 9.5px;
    color: #444;
  }
  .detail-code {
    font-family: 'DM Mono', 'Courier New', monospace;
    font-size: 9px;
    color: #7a8aa0;
    min-width: 68px;
  }
  .detail-label { flex: 1; color: #555; }
  .detail-amt {
    font-family: 'DM Mono', 'Courier New', monospace;
    font-size: 9.5px;
    font-weight: 700;
    color: #1a3a5c;
    text-align: right;
    min-width: 80px;
  }
  .expand-btn {
    background: none;
    border: none;
    cursor: pointer;
    padding: 0 2px;
    color: #1a5a8c;
    display: inline-flex;
    align-items: center;
    gap: 2px;
    vertical-align: middle;
    line-height: 1;
  }
  .sysc-filter-input {
    height: 28px;
    border: 1px solid rgba(255,255,255,.2);
    background: rgba(255,255,255,.08);
    color: white;
    font-size: 11px;
    padding: 0 8px;
    border-radius: 3px;
  }
  .sysc-filter-input option { color: #111; }
  .bilan-libelle-wrap {
    white-space: normal;
    line-height: 1.25;
  }
  .bilan-label-calc {
    display: grid;
    grid-template-columns: 1fr auto auto auto;
    gap: 18px;
    align-items: center;
    margin-top: 4px;
    font-size: 12px;
    font-style: italic;
    font-weight: 700;
  }
  .bilan-label-calc strong {
    font-style: normal;
  }
  .tft-zh-row .td-lib,
  .tft-zh-row .td-num {
    background: #4f8433 !important;
    color: #fff !important;
    font-weight: 700;
  }
  .tft-zh-lib,
  .tft-zh-values {
    display: grid;
    grid-template-rows: auto auto;
    gap: 2px;
    line-height: 1.15;
  }
  .tft-zh-values {
    text-align: right;
  }
`;
