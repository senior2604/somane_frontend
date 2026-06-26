// src/features/financial-reports/pages/statements-syscohada/[id].jsx
// Version dynamique — consomme engine.py (actif/passif, postes/totaux)
// L'administrateur modifie les templates FinancialReportLine côté admin ;
// ce fichier s'adapte sans modification.

import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  FiArrowLeft, FiRefreshCw, FiPrinter, FiDownload,
  FiCheckCircle, FiAlertTriangle,
  FiTrendingUp, FiTrendingDown,
  FiChevronDown, FiChevronRight,
} from 'react-icons/fi';
import { apiClient } from '../../../../services/apiClient';
import {
  syscohadaStyles,
  OfficialHeader,
  fmt,
  fmtSigned,
  noteIdFromNumber,
} from './shared';

// Export Excel - SheetJS avec styles et mise en page officielle
function exportBilanToExcel(bilanData, crData, tftData, periode, entite) {
  import('xlsx-js-style').then((XLSXModule) => {
    const XLSX = XLSXModule.default || XLSXModule;
    const wb = XLSX.utils.book_new();
    const annee = periode?.date_end?.slice(0, 4) || new Date().getFullYear();
    const anneeNum = parseInt(annee, 10);
    const anneePrev = Number.isFinite(anneeNum) ? String(anneeNum - 1) : 'N-1';
    const nomEntite = entite?.raison_sociale || entite?.nom || entite?.name || 'Entite';
    const adresse = [entite?.adresse, entite?.complement_adresse].filter(Boolean).join(' - ');
    const numeroFiscal = entite?.numero_fiscal || entite?.nif || entite?.identification_fiscale || '';
    const sigle = entite?.sigle || entite?.sigle_usuel || '';
    const devise = entite?.devise_details?.symbole || entite?.devise_details?.code || entite?.devise || 'FCFA';
    const fmtNum = (v) => (v == null || v === '' ? 0 : Number(v));
    const cleanSheetName = (name) => String(name).replace(/[\\/?*[\]:]/g, ' ').slice(0, 31);
    const cleanFilePart = (value) => String(value || 'Entite').replace(/[\\/:*?"<>|\s]+/g, '_');

    const fmtDateExcel = (value) => {
      if (!value) return '';
      const raw = String(value).slice(0, 10);
      const parts = raw.split('-');
      if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
      return raw;
    };

    const dureeMoisExcel = (start, end) => {
      if (!start || !end) return '';
      const d1 = new Date(start);
      const d2 = new Date(end);
      if (Number.isNaN(d1.getTime()) || Number.isNaN(d2.getTime())) return '';
      return (d2.getFullYear() - d1.getFullYear()) * 12 + d2.getMonth() - d1.getMonth() + 1;
    };

    const border = {
      top: { style: 'thin', color: { rgb: '000000' } },
      bottom: { style: 'thin', color: { rgb: '000000' } },
      left: { style: 'thin', color: { rgb: '000000' } },
      right: { style: 'thin', color: { rgb: '000000' } },
    };
    const dottedBottom = { bottom: { style: 'dotted', color: { rgb: '666666' } } };

    const styles = {
      normal: {
        border,
        font: { name: 'Times New Roman', sz: 12, color: { rgb: '000000' } },
        alignment: { vertical: 'center', wrapText: true },
      },
      metaLabel: {
        font: { name: 'Times New Roman', sz: 11, color: { rgb: '000000' } },
        alignment: { vertical: 'center', wrapText: true },
        border: dottedBottom,
      },
      metaValue: {
        font: { name: 'Times New Roman', sz: 11, bold: true, color: { rgb: '000000' } },
        alignment: { vertical: 'center', horizontal: 'center', wrapText: true },
        border: dottedBottom,
      },
      page: {
        font: { name: 'Times New Roman', sz: 12, bold: true, color: { rgb: '000000' } },
        alignment: { horizontal: 'center', vertical: 'center' },
      },
      box: {
        font: { name: 'Times New Roman', sz: 11, bold: true, color: { rgb: '000000' } },
        alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
        border,
      },
      title: {
        font: { name: 'Times New Roman', sz: 18, bold: true, color: { rgb: '0070C0' } },
        alignment: { horizontal: 'center', vertical: 'center' },
      },
      header: {
        fill: { patternType: 'solid', fgColor: { rgb: '8EA5BD' } },
        font: { name: 'Times New Roman', sz: 12, bold: true, color: { rgb: 'FFFFFF' } },
        alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
        border,
      },
      gray: {
        fill: { patternType: 'solid', fgColor: { rgb: 'D9D9D9' } },
        font: { name: 'Times New Roman', sz: 12, bold: true, color: { rgb: '000000' } },
        alignment: { vertical: 'center', wrapText: true },
        border,
      },
      blue: {
        fill: { patternType: 'solid', fgColor: { rgb: '082B68' } },
        font: { name: 'Times New Roman', sz: 12, bold: true, color: { rgb: 'FFFFFF' } },
        alignment: { vertical: 'center', wrapText: true },
        border,
      },
      green: {
        fill: { patternType: 'solid', fgColor: { rgb: '548235' } },
        font: { name: 'Times New Roman', sz: 12, bold: true, color: { rgb: 'FFFFFF' } },
        alignment: { vertical: 'center', wrapText: true },
        border,
      },
      bold: {
        font: { name: 'Times New Roman', sz: 12, bold: true, color: { rgb: '000000' } },
        alignment: { vertical: 'center', wrapText: true },
        border,
      },
    };

    const numberStyle = (baseStyle) => ({
      ...baseStyle,
      alignment: { ...(baseStyle.alignment || {}), horizontal: 'right', vertical: 'center' },
      numFmt: '#,##0;[Red]-#,##0;-',
    });

    const styleForRef = (ref, libelle = '') => {
      const r = String(ref || '').toUpperCase().trim();
      const l = String(libelle || '').toLowerCase();
      if (['ZA', 'BZ', 'DZ', 'XI', 'ZH'].includes(r)) return styles.green;
      if (['AZ', 'BK', 'BT', 'DF', 'DP', 'DT', 'XA', 'XB', 'XC', 'XD', 'XE', 'XF', 'XG', 'XH', 'ZB', 'ZC', 'ZD', 'ZE', 'ZF', 'ZG'].includes(r)) return styles.blue;
      if (['AD', 'AI', 'AQ', 'CP', 'CV', 'DD'].includes(r)) return styles.gray;
      if (['BA', 'BB', 'BG', 'BU', 'AP'].includes(r)) return styles.bold;
      if (!r && (l.includes('flux de') || l.includes('tresorerie provenant'))) return styles.gray;
      return null;
    };

    const blankRow = (lastCol) => Array.from({ length: lastCol + 1 }, () => '');

    const addMerge = (merges, sRow, sCol, eRow, eCol) => {
      merges.push({ s: { r: sRow, c: sCol }, e: { r: eRow, c: eCol } });
    };

    const addOfficialHeader = (rows, merges, docType, title, lastCol) => {
      let row;
      const pageCol = Math.max(0, Math.floor(lastCol / 2));
      const boxStart = Math.max(0, lastCol - 1);
      const entityEnd = Math.max(1, lastCol - 3);

      row = blankRow(lastCol);
      row[pageCol] = '- 11 -';
      rows.push(row);

      row = blankRow(lastCol);
      row[boxStart] = docType;
      rows.push(row);
      addMerge(merges, 1, boxStart, 1, lastCol);

      row = blankRow(lastCol);
      row[boxStart] = 'PAGE 1/1';
      rows.push(row);
      addMerge(merges, 2, boxStart, 2, lastCol);

      row = blankRow(lastCol);
      row[0] = "Designation de l'entite :";
      row[1] = nomEntite;
      if (lastCol >= 4) {
        row[lastCol - 2] = 'Sigle usuel :';
        row[lastCol - 1] = sigle || '';
      }
      rows.push(row);
      if (entityEnd >= 1) addMerge(merges, 3, 1, 3, entityEnd);

      row = blankRow(lastCol);
      row[0] = 'Adresse :';
      row[1] = adresse || '';
      rows.push(row);
      addMerge(merges, 4, 1, 4, lastCol);

      row = blankRow(lastCol);
      row[0] = "N identification fiscale :";
      row[1] = numeroFiscal || '';
      if (lastCol >= 4) {
        row[3] = 'Exercice clos le :';
        row[4] = fmtDateExcel(periode?.date_end);
      }
      if (lastCol >= 6) {
        row[lastCol - 2] = 'Duree (en mois) :';
        row[lastCol - 1] = dureeMoisExcel(periode?.date_start, periode?.date_end);
      }
      rows.push(row);

      row = blankRow(lastCol);
      row[0] = 'Unite monetaire :';
      row[1] = devise;
      rows.push(row);

      rows.push(blankRow(lastCol));

      row = blankRow(lastCol);
      row[0] = title;
      rows.push(row);
      addMerge(merges, 8, 0, 8, lastCol);

      rows.push(blankRow(lastCol));
    };

    const appendStyledSheet = (sheetName, rows, widths, merges = []) => {
      const ws = XLSX.utils.aoa_to_sheet(rows);
      const lastCol = widths.length - 1;
      ws['!cols'] = widths.map((wch) => ({ wch }));
      ws['!rows'] = rows.map((_, idx) => {
        if (idx === 8) return { hpt: 28 };
        if (idx <= 6) return { hpt: 21 };
        return { hpt: 22 };
      });
      ws['!merges'] = merges;

      rows.forEach((row, rIdx) => {
        const ref = String(row?.[0] || '').replace('.', '').toUpperCase().trim();
        const libelle = String(row?.[1] || '');
        const isColumnHeader = ref === 'REF';
        const lineStyle = styleForRef(ref, libelle);

        for (let cIdx = 0; cIdx <= lastCol; cIdx += 1) {
          const cellRef = XLSX.utils.encode_cell({ r: rIdx, c: cIdx });
          if (!ws[cellRef]) {
            if (lineStyle || isColumnHeader || rIdx <= 8) {
              ws[cellRef] = { t: 's', v: '' };
            } else {
              continue;
            }
          }

          let style = styles.normal;
          if (rIdx === 0) style = styles.page;
          if (rIdx === 1 || rIdx === 2) style = cIdx >= Math.max(0, lastCol - 1) ? styles.box : styles.normal;
          if (rIdx >= 3 && rIdx <= 6) style = cIdx % 2 === 0 ? styles.metaLabel : styles.metaValue;
          if (rIdx === 8) style = styles.title;
          if (isColumnHeader) style = styles.header;
          if (lineStyle) style = lineStyle;
          if (typeof ws[cellRef].v === 'number' && Number.isFinite(ws[cellRef].v)) {
            style = numberStyle(style);
          }
          ws[cellRef].s = style;
        }
      });

      XLSX.utils.book_append_sheet(wb, ws, cleanSheetName(sheetName));
    };

    if (bilanData) {
      const actifRows = [];
      const actifMerges = [];
      addOfficialHeader(actifRows, actifMerges, 'BILAN ACTIF', 'BILAN', 6);

      actifRows.push(['Ref.', 'ACTIF', 'NOTE', `Exercice ${annee} - Brut`, 'Amort. / Deprec.', 'Net', `Exercice ${anneePrev} - Net`]);
      const actif = bilanData.actif || {};
      const actifN1 = bilanData.actif_n1 || {};
      Object.entries(actif).forEach(([key, entry]) => {
        const solde = entry.solde ?? 0;
        const brut = entry.brut ?? solde;
        const amort = entry.amort ?? 0;
        const soldeN1 = actifN1[key]?.solde ?? 0;
        const ref = entry.ref_code || key.toUpperCase().slice(0, 2);
        const lib = entry.libelle || key.replace(/_/g, ' ');
        const labelCalc = entry.label_calc;

        const excelLib = labelCalc
          ? `${lib}\n${labelCalc.label}        ${fmtNum(labelCalc.value ?? 0)} / ${fmtNum(labelCalc.value_n1 ?? 0)}`
          : lib;

        actifRows.push([ref, excelLib, entry.note || '', fmtNum(brut), fmtNum(amort), fmtNum(solde), fmtNum(soldeN1)]);
    });
      appendStyledSheet('Bilan Actif', actifRows, [7, 56, 9, 18, 18, 18, 18], actifMerges);

      const passifRows = [];
      const passifMerges = [];
      addOfficialHeader(passifRows, passifMerges, 'BILAN PASSIF', 'BILAN', 4);

      passifRows.push(['Ref.', 'PASSIF', 'NOTE', `Exercice ${annee}`, `Exercice ${anneePrev}`]);
      const passif = bilanData.passif || {};
      const passifN1 = bilanData.passif_n1 || {};
      Object.entries(passif).forEach(([key, entry]) => {
        const solde = entry.solde ?? 0;
        const soldeN1 = passifN1[key]?.solde ?? 0;
        const ref = entry.ref_code || key.toUpperCase().slice(0, 2);
        const lib = entry.libelle || key.replace(/_/g, ' ');
        passifRows.push([ref, lib, entry.note || '', fmtNum(solde), fmtNum(soldeN1)]);
      });
      appendStyledSheet('Bilan Passif', passifRows, [7, 64, 9, 20, 20], passifMerges);
    }

    if (crData) {
      const rows = [];
      const merges = [];
      addOfficialHeader(rows, merges, 'COMPTE DE RESULTAT', 'COMPTE DE RESULTAT', 4);
      rows.push(['Ref.', 'LIBELLES', 'NOTE', `Exercice ${annee}`, `Exercice ${anneePrev}`]);

      const postes = crData.postes || {};
      const totaux = crData.totaux || {};
      const postesN1 = crData.postes_n1 || {};
      const totauxN1 = crData.totaux_n1 || {};
      const allKeys = (crData.ordre_lignes?.length
        ? crData.ordre_lignes
        : [...new Set([...Object.keys(crData.lignes || {}), ...Object.keys(postes), ...Object.keys(totaux)])]
      ).filter((key) => key in postes || key in totaux);

      allKeys.forEach((key) => {
        const inTotaux = key in totaux;
        const entry = postes[key];
        const solde = inTotaux ? (totaux[key] ?? 0) : (entry?.solde ?? 0);
        const soldeN1 = inTotaux ? (totauxN1[key] ?? 0) : (postesN1[key]?.solde ?? 0);
        const meta = crData.lignes?.[key] || {};
        const ref = meta.ref_code || (key.length <= 3 ? key.toUpperCase() : '');
        const lib = entry?.libelle || meta.libelle || key.replace(/_/g, ' ');
        rows.push([ref, lib, entry?.note || meta.note || '', fmtNum(solde), fmtNum(soldeN1)]);
      });

      appendStyledSheet('Compte de Resultat', rows, [7, 60, 9, 18, 18], merges);
    }

    if (tftData) {
      const rows = [];
      const merges = [];
      addOfficialHeader(rows, merges, 'TABLEAU DES FLUX DE TRESORERIE', 'TABLEAU DES FLUX DE TRESORERIE', 8);

      const pushTftRow = (ref, libelle, note, valueN, valueN1) => {
        const rowIdx = rows.length;
        rows.push([ref, libelle, '', '', '', '', note || '', fmtNum(valueN), fmtNum(valueN1)]);
        addMerge(merges, rowIdx, 1, rowIdx, 5);
      };

      const pushTftSection = (libelle) => {
        const rowIdx = rows.length;
        rows.push(['', libelle, '', '', '', '', '', '', '']);
        addMerge(merges, rowIdx, 1, rowIdx, 5);
      };

      rows.push(['Ref.', 'LIBELLES', '', '', '', '', 'Note', `Exercice ${annee}`, `Exercice ${anneePrev}`]);
      addMerge(merges, rows.length - 1, 1, rows.length - 1, 5);

      const postes = tftData.postes || {};
      const totaux = tftData.totaux || {};
      const postesN1 = tftData.postes_n1 || {};
      const totauxN1 = tftData.totaux_n1 || {};

      pushTftRow('ZA', 'Tresorerie nette au 1er Janvier\n(Tresorerie actif N-1 - Tresorerie passif N-1)', 'A', tftData.tresorerie_ouverture ?? 0, postesN1.ZA?.solde ?? 0);

      const allKeys = (tftData.ordre_lignes?.length
        ? tftData.ordre_lignes
        : [...new Set([...Object.keys(tftData.lignes || {}), ...Object.keys(postes), ...Object.keys(totaux)])]
      ).filter((key) => key in postes || key in totaux).filter((key) => key !== 'ZA');

      allKeys.forEach((key) => {
        const meta = tftData.lignes?.[key] || {};
        const rawRef = meta.ref_code || (key.length <= 3 ? key.toUpperCase() : '');
        const rawLib = meta.libelle || key.replace(/_/g, ' ');
        const isSection = String(key).startsWith('TFT_SECTION') || (!rawRef && !(key in totaux));
        if (isSection) {
          pushTftSection(rawLib);
          return;
        }

        const inTotaux = key in totaux;
        const entry = postes[key];
        const solde = inTotaux ? (totaux[key] ?? 0) : (entry?.solde ?? 0);
        const soldeN1 = inTotaux ? (totauxN1[key] ?? 0) : (postesN1[key]?.solde ?? 0);
        const ref = rawRef;
        const lib = entry?.libelle || rawLib;
        pushTftRow(ref, lib, entry?.note || meta.note || '', solde, soldeN1);
      });

      appendStyledSheet('Flux de Tresorerie', rows, [7, 20, 16, 16, 16, 16, 9, 18, 18], merges);
    }

    const fileName = `EtatsFinanciers_${cleanFilePart(nomEntite)}_${annee}.xlsx`;
    XLSX.writeFile(wb, fileName);
  });
}


const EXTRA_STYLES = `
  .expand-btn {
    background: none; border: none; cursor: pointer; padding: 0 2px;
    color: #1a5a8c; display: inline-flex; align-items: center; gap: 2px;
    vertical-align: middle; line-height: 1;
  }
  .expand-btn:hover { color: #ffd700; }

  .tr-detail td {
    background: #f5f8ff !important;
    padding: 0 !important;
    border: 1px solid #dde4ed !important;
  }
  .detail-inner { padding: 4px 12px 6px 40px; }
  .detail-sub {
    display: flex; gap: 8px; align-items: center;
    padding: 3px 0; border-bottom: 1px dashed #dde4ed;
    font-size: 9.5px; color: #444;
  }
  .detail-sub:last-child { border-bottom: none; }
  .detail-code {
    font-family: 'DM Mono', 'Courier New', monospace;
    font-size: 9px; color: #7a8aa0; min-width: 68px;
  }
  .detail-label { flex: 1; color: #555; }
  .detail-amt {
    font-family: 'DM Mono', 'Courier New', monospace;
    font-size: 9.5px; font-weight: 700; color: #1a3a5c;
    text-align: right; min-width: 80px;
  }

  .note-header-bar {
    background: #1a3a5c; color: white;
    padding: 6px 12px;
    display: flex; align-items: center; gap: 10px;
    font-size: 10px; font-weight: 700;
    text-transform: uppercase; letter-spacing: .04em;
  }
  .note-num-badge {
    background: #ffd700; color: #0d2438;
    padding: 1px 8px; border-radius: 2px;
    font-family: 'DM Mono','Courier New',monospace;
    font-size: 10px; font-weight: 700; white-space: nowrap;
  }
  .note-block { border-bottom: 2px solid #1a3a5c; }

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

  .btn-excel {
    background: #1d7a3a !important;
    border-color: #1d7a3a !important;
    color: #ffffff !important;
  }
  .btn-excel:hover {
    background: #155c2a !important;
    border-color: #155c2a !important;
  }

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


.tft-bfg-row .td-lib {
  font-weight: 700;
}

.tft-bfg-lib {
  line-height: 1.25;
}

.tft-bfg-title {
  font-weight: 700;
}

.tft-bfg-formula {
  display: grid;
  grid-template-columns: 1fr auto auto auto;
  gap: 18px;
  align-items: center;
  margin-top: 6px;
  font-size: 12px;
  font-weight: 700;
}

.tft-zh-row .td-lib,
.tft-zh-row .td-num {
  background: #4f8433;
  color: #fff;
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


// ─────────────────────────────────────────────────────────────────────────────
// HELPER : détermine la classe CSS d'une ligne selon sa clé / son libellé
// ─────────────────────────────────────────────────────────────────────────────

function rowClass(key, libelle, reportType = 'generic') {
  const kUpper = String(key || '').toUpperCase();

  if (reportType === 'bilan') {
    if (['BZ', 'DZ'].includes(kUpper)) return 'tr-green-official';

    if ([
      'AZ', 'BK', 'BT',
      'DF', 'DP', 'DT',
    ].includes(kUpper)) return 'tr-blue-official';

    if ([
      'AD', 'AI', 'AQ',
      'CP', 'CV', 'DD',
    ].includes(kUpper)) return 'tr-gray-official';

    if ([
      'BA', 'BB', 'BG', 'BU',
      'AP',
    ].includes(kUpper)) return 'tr-bold-official';

    return null;
  }

  const k = String(key || '').toLowerCase();
  const l = (libelle || '').trim();
  if (
    k.startsWith('total') || k === 'bz' || k === 'dz' || k === 'az' ||
    k === 'xi' || k === 'resultat_net'
  ) return 'tr-total';
  if (k.startsWith('sous_total') || /^[a-z]{1,2}[a-z]$/.test(k)) return 'tr-subtotal';
  if (l.length > 3 && l === l.toUpperCase()) return 'tr-section';
  return null;
}

const fmtMinus = (value) => {
  const n = Number(value || 0);
  const abs = fmt(Math.abs(n));
  return n < 0 ? `-${abs}` : abs;
};


// ─────────────────────────────────────────────────────────────────────────────
// WRAPPER : ligne de données avec détail dépliable
// ─────────────────────────────────────────────────────────────────────────────

function DataRowWithDetail({ detail, colCount, children }) {
  const [open, setOpen] = useState(false);
  const hasDetail = Array.isArray(detail) && detail.length > 0;
  return (
    <>
      {children(open, setOpen, hasDetail)}
      {open && hasDetail && (
        <tr className="tr-detail">
          <td colSpan={colCount}>
            <div className="detail-inner">
              {detail.map((d, i) => (
                <div className="detail-sub" key={i}>
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


// ─────────────────────────────────────────────────────────────────────────────
// BILAN — rendu dynamique
// ─────────────────────────────────────────────────────────────────────────────

function DataRowWithCellDetails({ detail, detailN1, colCount, children }) {
  const [openKey, setOpenKey] = useState(null);
  const hasDetail = Array.isArray(detail) && detail.length > 0;
  const hasDetailN1 = Array.isArray(detailN1) && detailN1.length > 0;
  const shownDetail = openKey === 'n1' ? detailN1 : detail;
  const toggle = (key) => setOpenKey((current) => (current === key ? null : key));

  return (
    <>
      {children(openKey, toggle, hasDetail, hasDetailN1)}
      {openKey && Array.isArray(shownDetail) && shownDetail.length > 0 && (
        <tr className="tr-detail">
          <td colSpan={colCount}>
            <div className="detail-inner">
              {shownDetail.map((d, i) => (
                <div className="detail-sub" key={i}>
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
        <button className="expand-btn" onClick={() => toggle(detailKey)}
          title={open ? 'Masquer' : 'Voir le détail'}>
          {open ? <FiChevronDown size={10} /> : <FiChevronRight size={10} />}
        </button>
      )}
      {signed ? fmtMinus(value) : fmt(value)}
    </span>
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
                <div className="detail-sub" key={i}>
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

function BilanTab({ data, entite, periode, onNoteClick, section = 'actif' }) {
  if (!data) return null;

  const actif    = data.actif    || {};
  const passif   = data.passif   || {};
  const actifN1  = data.actif_n1  || {};
  const passifN1 = data.passif_n1 || {};

  const annee     = periode?.date_end?.slice(0, 4) || new Date().getFullYear();
  const anneePrev = String(parseInt(annee) - 1);

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

  const renderNote = (entry) => (
    entry.note ? (
      <span
        className={onNoteClick ? 'td-note-clickable' : ''}
        onDoubleClick={onNoteClick ? () => onNoteClick(noteIdFromNumber(entry.note)) : undefined}
        title={onNoteClick ? `Double-clic -> Note ${entry.note}` : undefined}
      >
        {entry.note}
      </span>
    ) : null
  );

  // ACTIF
  const renderActif = () => {
    let dataIdx = 0;

    return Object.entries(actif).flatMap(([key, entry]) => {
      const solde   = entry.solde ?? 0;
      const brut    = entry.brut ?? solde;
      const amort   = entry.amort ?? 0;
      const soldeN1 = actifN1[key]?.solde ?? 0;
      const ref     = entry.ref_code || key.toUpperCase().slice(0, 2);
      const lib     = entry.libelle || key.replace(/_/g, ' ');
      const detail  = entry.detail || [];

      const detailsByKey = {
        brut: entry.detail_brut || [],
        amort: entry.detail_amort || [],
        net: entry.detail_net || detail,
        n1: actifN1[key]?.detail_net || entry.detail_n1 || [],
      };

      const cls = rowClass(key, lib, 'bilan');

      if (cls) {
        return [(
          <DataRowWithMultiCellDetails key={key} detailsByKey={detailsByKey} colCount={7}>
            {(openKey, toggle, hasDetails) => (
              <tr className={cls}>
                <td className="td-ref">{ref}</td>
                <td className="td-lib" colSpan={2}>
                  {renderLibelleWithCalc(lib, entry.label_calc)}
                </td>
                <td className="td-num">
                  <AmountWithDetail value={brut} detailKey="brut" openKey={openKey} toggle={toggle} hasDetail={hasDetails('brut')} />
                </td>
                <td className="td-num">
                  <AmountWithDetail value={amort} detailKey="amort" openKey={openKey} toggle={toggle} hasDetail={hasDetails('amort')} />
                </td>
                <td className="td-num">
                  <AmountWithDetail value={solde} detailKey="net" openKey={openKey} toggle={toggle} hasDetail={hasDetails('net')} />
                </td>
                <td className="td-num">
                  <AmountWithDetail value={soldeN1} detailKey="n1" openKey={openKey} toggle={toggle} hasDetail={hasDetails('n1')} />
                </td>
              </tr>
            )}
          </DataRowWithMultiCellDetails>
        )];
      }

      const isEven = dataIdx++ % 2 === 0;

      return [(
        <DataRowWithMultiCellDetails key={key} detailsByKey={detailsByKey} colCount={7}>
          {(openKey, toggle, hasDetails) => (
            <tr className={`tr-data ${isEven ? 'tr-even' : 'tr-odd'}`}>
              <td className="td-ref">{ref}</td>
              <td className="td-lib">
                {renderLibelleWithCalc(lib, entry.label_calc)}
              </td>
              <td className="td-note">
                {renderNote(entry)}
              </td>
              <td className="td-num">
                <AmountWithDetail value={brut} detailKey="brut" openKey={openKey} toggle={toggle} hasDetail={hasDetails('brut')} />
              </td>
              <td className="td-num">
                <AmountWithDetail value={amort} detailKey="amort" openKey={openKey} toggle={toggle} hasDetail={hasDetails('amort')} />
              </td>
              <td className="td-num">
                <AmountWithDetail value={solde} detailKey="net" openKey={openKey} toggle={toggle} hasDetail={hasDetails('net')} />
              </td>
              <td className="td-num">
                <AmountWithDetail value={soldeN1} detailKey="n1" openKey={openKey} toggle={toggle} hasDetail={hasDetails('n1')} />
              </td>
            </tr>
          )}
        </DataRowWithMultiCellDetails>
      )];
    });
  };

  // PASSIF
  const renderPassif = () => {
    let dataIdx = 0;

    return Object.entries(passif).flatMap(([key, entry]) => {
      const solde   = entry.solde ?? 0;
      const soldeN1 = passifN1[key]?.solde ?? 0;
      const ref     = entry.ref_code || key.toUpperCase().slice(0, 2);
      const lib     = entry.libelle || key.replace(/_/g, ' ');
      const detail  = entry.detail || [];

      const detailsByKey = {
        net: entry.detail_net || detail,
        n1: passifN1[key]?.detail_net || entry.detail_n1 || [],
      };

      const cls = rowClass(key, lib, 'bilan');

      if (cls) {
        return [(
          <DataRowWithMultiCellDetails key={key} detailsByKey={detailsByKey} colCount={5}>
            {(openKey, toggle, hasDetails) => (
              <tr className={cls}>
                <td className="td-ref">{ref}</td>
                <td className="td-lib" colSpan={2}>{lib}</td>
                <td className="td-num">
                  <AmountWithDetail value={solde} detailKey="net" openKey={openKey} toggle={toggle} hasDetail={hasDetails('net')} />
                </td>
                <td className="td-num">
                  <AmountWithDetail value={soldeN1} detailKey="n1" openKey={openKey} toggle={toggle} hasDetail={hasDetails('n1')} />
                </td>
              </tr>
            )}
          </DataRowWithMultiCellDetails>
        )];
      }

      const isEven = dataIdx++ % 2 === 0;

      return [(
        <DataRowWithMultiCellDetails key={key} detailsByKey={detailsByKey} colCount={5}>
          {(openKey, toggle, hasDetails) => (
            <tr className={`tr-data ${isEven ? 'tr-even' : 'tr-odd'}`}>
              <td className="td-ref">{ref}</td>
              <td className="td-lib">{lib}</td>
              <td className="td-note">
                {renderNote(entry)}
              </td>
              <td className="td-num">
                <AmountWithDetail value={solde} detailKey="net" openKey={openKey} toggle={toggle} hasDetail={hasDetails('net')} />
              </td>
              <td className="td-num">
                <AmountWithDetail value={soldeN1} detailKey="n1" openKey={openKey} toggle={toggle} hasDetail={hasDetails('n1')} />
              </td>
            </tr>
          )}
        </DataRowWithMultiCellDetails>
      )];
    });
  };

  const isActifTab = section === 'actif';
  const isPassifTab = section === 'passif';

  return (
    <div style={{ paddingBottom: 24 }}>
      {isActifTab && (
        <>
          <OfficialHeader
            entite={entite}
            periode={periode}
            pageNum={1}
            totalPages={1}
            docType="BILAN ACTIF"
            title="ETATS FINANCIERS ANNUELS"
            subtitle="BILAN - ACTIF"
          />

          <table className="sysc-table">
            <thead>
              <tr>
                <th className="th-main" rowSpan={2} style={{ width: 34 }}>Ref.</th>
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
            <tbody>{renderActif()}</tbody>
          </table>
        </>
      )}

      {isPassifTab && (
        <>
          <OfficialHeader
            entite={entite}
            periode={periode}
            pageNum={1}
            totalPages={1}
            docType="BILAN PASSIF"
            title="ETATS FINANCIERS ANNUELS"
            subtitle="BILAN - PASSIF"
          />

          <table className="sysc-table">
            <thead>
              <tr>
                <th className="th-main" style={{ width: 34 }}>Ref.</th>
                <th className="th-main left">PASSIF</th>
                <th className="th-main" style={{ width: 36 }}>NOTE</th>
                <th className="th-year" style={{ width: 110 }}>Exercice {annee}</th>
                <th className="th-year" style={{ width: 110 }}>Exercice {anneePrev}</th>
              </tr>
            </thead>
            <tbody>{renderPassif()}</tbody>
          </table>

          <div className={`balance-badge ${data.est_equilibre ? 'balance-ok' : 'balance-err'}`}>
            {data.est_equilibre ? (
              <>
                <FiCheckCircle size={14} /> Bilan equilibre - Actif = Passif = {fmt(data.total_actif)} F CFA
              </>
            ) : (
              <>
                <FiAlertTriangle size={14} /> Bilan desequilibre - Ecart : {fmt(Math.abs((data.total_actif || 0) - (data.total_passif || 0)))} F CFA
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}




function CRTab({ data, entite, periode, onNoteClick }) {
  if (!data) return null;

  const postes   = data.postes    || {};
  const totaux   = data.totaux    || {};
  const postesN1 = data.postes_n1  || {};
  const totauxN1 = data.totaux_n1  || {};

  const annee     = periode?.date_end?.slice(0, 4) || new Date().getFullYear();
  const anneePrev = String(parseInt(annee) - 1);

  const allKeys = (data.ordre_lignes?.length
    ? data.ordre_lignes
    : [...new Set([...Object.keys(data.lignes || {}), ...Object.keys(postes), ...Object.keys(totaux)])]
  ).filter((key) => key in postes || key in totaux);

  let dataIdx = 0;

  const renderRows = () => allKeys.flatMap((key) => {
    const inTotaux = key in totaux;
    const entry    = postes[key];
    const solde    = inTotaux ? (totaux[key] ?? 0) : (entry?.solde ?? 0);
    const soldeN1  = inTotaux ? (totauxN1[key] ?? 0) : (postesN1[key]?.solde ?? 0);
    const detail   = entry?.detail || [];
    const detailN1 = postesN1[key]?.detail || [];
    const meta     = data.lignes?.[key] || {};
    const totalDetail = meta.detail || [];
    const totalDetailN1 = meta.detail_n1 || [];
    const ref      = meta.ref_code || (key.length <= 3 ? key.toUpperCase() : '');
    const lib      = entry?.libelle
      || meta.libelle
      || key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

    const isGrandTotal = key === 'XI' || key.toLowerCase() === 'resultat_net';

    // Grand total (résultat net)
    if (inTotaux && isGrandTotal) return [(
      <DataRowWithCellDetails key={key} detail={totalDetail} detailN1={totalDetailN1} colCount={6}>
        {(openKey, toggle, hasDetail, hasDetailN1) => (
          <tr className="tr-total">
            <td className="td-ref">{ref || 'XI'}</td>
            <td className="td-lib" colSpan={3}>
              RÉSULTAT NET DE L'EXERCICE (bénéfice + ou perte −)
            </td>
            <td className="td-num">
              <AmountWithDetail value={data.resultat_net} detailKey="n" openKey={openKey}
                toggle={toggle} hasDetail={hasDetail} signed />
            </td>
            <td className="td-num">
              <AmountWithDetail value={soldeN1} detailKey="n1" openKey={openKey}
                toggle={toggle} hasDetail={hasDetailN1} signed />
            </td>
          </tr>
        )}
      </DataRowWithCellDetails>
    )];

    // Sous-total / section
    if (inTotaux) {
      const cls = lib === lib.toUpperCase() ? 'tr-section' : 'tr-subtotal';
      return [(
        <DataRowWithCellDetails key={key} detail={totalDetail} detailN1={totalDetailN1} colCount={6}>
          {(openKey, toggle, hasDetail, hasDetailN1) => (
            <tr className={cls}>
              <td className="td-ref">{ref}</td>
              <td className="td-lib" colSpan={3}>{lib}</td>
              <td className="td-num">
                <AmountWithDetail value={solde} detailKey="n" openKey={openKey}
                  toggle={toggle} hasDetail={hasDetail} />
              </td>
              <td className="td-num">
                <AmountWithDetail value={soldeN1} detailKey="n1" openKey={openKey}
                  toggle={toggle} hasDetail={hasDetailN1} />
              </td>
            </tr>
          )}
        </DataRowWithCellDetails>
      )];
    }

    // Ligne de données
    const isEven = dataIdx++ % 2 === 0;
    return [
      <DataRowWithCellDetails key={key} detail={detail} detailN1={detailN1} colCount={6}>
        {(openKey, toggle, hasDetail, hasDetailN1) => (
          <tr className={`tr-data ${isEven ? 'tr-even' : 'tr-odd'}`}>
            <td className="td-ref">{ref}</td>
            <td className="td-lib">{lib}</td>
            <td className="td-sign">{solde < 0 ? '−' : '+'}</td>
            <td className="td-note">
              {entry?.note ? (
                <span
                  className={onNoteClick ? 'td-note-clickable' : ''}
                  onDoubleClick={onNoteClick ? () => onNoteClick(noteIdFromNumber(entry.note)) : undefined}
                  title={onNoteClick ? `Double-clic → Note ${entry.note}` : undefined}
                >
                  {entry.note}
                </span>
              ) : null}
            </td>
            <td className="td-num">
              <AmountWithDetail value={solde} detailKey="n" openKey={openKey}
                toggle={toggle} hasDetail={hasDetail} />
            </td>
            <td className="td-num">
              <AmountWithDetail value={soldeN1} detailKey="n1" openKey={openKey}
                toggle={toggle} hasDetail={hasDetailN1} signed />
            </td>
          </tr>
        )}
      </DataRowWithCellDetails>,
    ];
  });

  const resNet   = data.resultat_net ?? 0;
  const isProfit = resNet >= 0;

  return (
    <div style={{ paddingBottom: 24 }}>
      <OfficialHeader
        entite={entite}
        periode={periode}
        pageNum={1}
        totalPages={1}
        docType="COMPTE DE RÉSULTAT"
        title="ÉTATS FINANCIERS ANNUELS"
        subtitle="COMPTE DE RÉSULTAT"
      />
      <table className="sysc-table">
        <thead>
          <tr>
            <th className="th-main" style={{ width: 34 }}>Réf.</th>
            <th className="th-main left">LIBELLÉS</th>
            <th className="th-main" style={{ width: 28 }}></th>
            <th className="th-main" style={{ width: 38 }}>NOTE</th>
            <th className="th-year" style={{ width: 110 }}>
              Exercice {annee}
              <div style={{ fontWeight: 400, fontSize: 8, textTransform: 'none' }}>NET</div>
            </th>
            <th className="th-year" style={{ width: 110 }}>
              Exercice {anneePrev}
              <div style={{ fontWeight: 400, fontSize: 8, textTransform: 'none' }}>NET</div>
            </th>
          </tr>
        </thead>
        <tbody>{renderRows()}</tbody>
      </table>

      <div className={`resultat-box ${isProfit ? 'benefice' : 'perte'}`}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {isProfit
            ? <FiTrendingUp  size={20} color="#1b5e20" />
            : <FiTrendingDown size={20} color="#b71c1c" />
          }
          <div>
            <div style={{ fontWeight: 700, fontSize: 12, color: isProfit ? '#1b5e20' : '#b71c1c' }}>
              {isProfit ? "Bénéfice net de l'exercice" : "Perte nette de l'exercice"}
            </div>
            <div style={{ fontSize: 10, color: '#555', marginTop: 2 }}>
              Produits − Charges = Résultat net
            </div>
          </div>
        </div>
        <div style={{
          fontFamily: "'DM Mono','Courier New',monospace",
          fontSize: 18, fontWeight: 700,
          color: isProfit ? '#1b5e20' : '#b71c1c',
        }}>
          {fmtSigned(resNet)} F CFA
        </div>
      </div>
    </div>
  );
}


// ─────────────────────────────────────────────────────────────────────────────
// TFT — rendu dynamique
// ─────────────────────────────────────────────────────────────────────────────

function TFTTab({ data, entite, periode }) {
  if (!data) return null;

  const postes   = data.postes || {};
  const totaux   = data.totaux || {};
  const postesN1 = data.postes_n1 || {};
  const totauxN1 = data.totaux_n1 || {};

  const annee     = periode?.date_end?.slice(0, 4) || new Date().getFullYear();
  const anneePrev = String(parseInt(annee) - 1);

  const tresoOuv  = data.tresorerie_ouverture ?? postes.ZA?.solde ?? 0;
  const variation = data.variation_tresorerie ?? totaux.ZG ?? 0;

  const bfgN = (
    -(postes.FB?.solde ?? 0)
    - (postes.FC?.solde ?? 0)
    - (postes.FD?.solde ?? 0)
    + (postes.FE?.solde ?? 0)
  );

  const bfgN1 = (
    -(postesN1.FB?.solde ?? 0)
    - (postesN1.FC?.solde ?? 0)
    - (postesN1.FD?.solde ?? 0)
    + (postesN1.FE?.solde ?? 0)
  );

  const zhGA = (totaux.ZG ?? variation) + tresoOuv;
  const zhGAN1 = (totauxN1.ZG ?? 0) + (postesN1.ZA?.solde ?? 0);

  const zhControle = totaux.ZH ?? data.tresorerie_cloture ?? 0;
  const zhControleN1 = totauxN1.ZH ?? postesN1.ZH?.solde ?? 0;

  const allKeys = (data.ordre_lignes?.length
    ? data.ordre_lignes
    : [...new Set([...Object.keys(data.lignes || {}), ...Object.keys(postes), ...Object.keys(totaux)])]
  ).filter((key) => key in postes || key in totaux);

  let dataIdx = 0;

  const renderBfgRow = () => (
    <tr className="tr-data tft-bfg-row" key="TFT_BFG_VARIATION">
      <td className="td-ref"></td>
      <td className="td-lib tft-bfg-lib">
        <div className="tft-bfg-title">Variation du BFG liée aux activités opérationnelles</div>
        <div className="tft-bfg-formula">
          <span>(FB+FC+FD+FE) :</span>
          <strong>{fmt(bfgN)}</strong>
          <span>/</span>
          <strong>{fmt(bfgN1)}</strong>
        </div>
      </td>
      <td className="td-sign"></td>
      <td className="td-num"></td>
      <td className="td-num"></td>
    </tr>
  );

  const renderRows = () => allKeys.flatMap((key) => {
    if (key === 'ZA') return [];

    const inTotaux = key in totaux;
    const entry = postes[key];

    const solde = inTotaux ? (totaux[key] ?? 0) : (entry?.solde ?? 0);
    const soldeN1 = inTotaux ? (totauxN1[key] ?? 0) : (postesN1[key]?.solde ?? 0);

    const detail = entry?.detail || [];
    const detailN1 = postesN1[key]?.detail || [];

    const meta = data.lignes?.[key] || {};
    const totalDetail = meta.detail || [];
    const totalDetailN1 = meta.detail_n1 || [];

    const ref = meta.ref_code || (key.length <= 3 ? key.toUpperCase() : '');
    const lib = entry?.libelle
      || meta.libelle
      || key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

    const isVariation = key === 'ZG' || key.toLowerCase() === 'variation_tresorerie';

    if (key === 'ZH') {
      return [(
        <DataRowWithCellDetails key={key} detail={totalDetail} detailN1={totalDetailN1} colCount={5}>
          {(openKey, toggle, hasDetail, hasDetailN1) => (
            <tr className="tr-total tft-zh-row">
              <td className="td-ref">{ref || 'ZH'}</td>
              <td className="td-lib" colSpan={2}>
                <div className="tft-zh-lib">
                  <div>Trésorerie nette au 31 Décembre (G+A)</div>
                  <div>Contrôle : Trésorerie actif N - Trésorerie passif N</div>
                </div>
              </td>
              <td className="td-num">
                <div className="tft-zh-values">
                  <div>{fmt(zhGA)}</div>
                  <div>
                    <AmountWithDetail
                      value={zhControle}
                      detailKey="n"
                      openKey={openKey}
                      toggle={toggle}
                      hasDetail={hasDetail}
                    />
                  </div>
                </div>
              </td>
              <td className="td-num">
                <div className="tft-zh-values">
                  <div>{fmt(zhGAN1)}</div>
                  <div>
                    <AmountWithDetail
                      value={zhControleN1}
                      detailKey="n1"
                      openKey={openKey}
                      toggle={toggle}
                      hasDetail={hasDetailN1}
                    />
                  </div>
                </div>
              </td>
            </tr>
          )}
        </DataRowWithCellDetails>
      )];
    }

    if (inTotaux && isVariation) {
      return [(
        <DataRowWithCellDetails key={key} detail={totalDetail} detailN1={totalDetailN1} colCount={5}>
          {(openKey, toggle, hasDetail, hasDetailN1) => (
            <tr className="tr-section">
              <td className="td-ref">{ref || 'ZG'}</td>
              <td className="td-lib" colSpan={2}>
                VARIATION DE LA TRESORERIE NETTE DE LA PERIODE (B+C+F)
              </td>
              <td className="td-num">
                <AmountWithDetail
                  value={variation}
                  detailKey="n"
                  openKey={openKey}
                  toggle={toggle}
                  hasDetail={hasDetail}
                  signed
                />
              </td>
              <td className="td-num">
                <AmountWithDetail
                  value={soldeN1}
                  detailKey="n1"
                  openKey={openKey}
                  toggle={toggle}
                  hasDetail={hasDetailN1}
                  signed
                />
              </td>
            </tr>
          )}
        </DataRowWithCellDetails>
      )];
    }

    if (inTotaux) {
      const stackedValues = meta.stacked_values || [];
      const hasStackedValues = stackedValues.length > 0;

      const totalRow = (
        <DataRowWithCellDetails key={key} detail={totalDetail} detailN1={totalDetailN1} colCount={5}>
          {(openKey, toggle, hasDetail, hasDetailN1) => (
            <tr className={key === 'ZH' ? 'tr-subtotal tft-zh-row' : 'tr-subtotal'}>
              <td className="td-ref">{ref}</td>

              <td className="td-lib" colSpan={2}>
                {hasStackedValues ? (
                  <div className="stacked-label">
                    {stackedValues.map((item) => (
                      <div key={item.label}>{item.label}</div>
                    ))}
                  </div>
                ) : (
                  lib
                )}
              </td>

              <td className="td-num">
                {hasStackedValues ? (
                  <div className="stacked-values">
                    {stackedValues.map((item) => (
                      <div key={item.label}>{fmt(item.value ?? 0)}</div>
                    ))}
                  </div>
                ) : (
                  <AmountWithDetail
                    value={solde}
                    detailKey="n"
                    openKey={openKey}
                    toggle={toggle}
                    hasDetail={hasDetail}
                  />
                )}
              </td>

              <td className="td-num">
                {hasStackedValues ? (
                  <div className="stacked-values">
                    {stackedValues.map((item) => (
                      <div key={item.label}>{fmt(item.value_n1 ?? 0)}</div>
                    ))}
                  </div>
                ) : (
                  <AmountWithDetail
                    value={soldeN1}
                    detailKey="n1"
                    openKey={openKey}
                    toggle={toggle}
                    hasDetail={hasDetailN1}
                    signed
                  />
                )}
              </td>
            </tr>
          )}
        </DataRowWithCellDetails>
      );

      if (key === 'ZB') {
        return [renderBfgRow(), totalRow];
      }

      return [totalRow];
    }

    const isEven = dataIdx++ % 2 === 0;

    return [(
      <DataRowWithCellDetails key={key} detail={detail} detailN1={detailN1} colCount={5}>
        {(openKey, toggle, hasDetail, hasDetailN1) => (
          <tr className={`tr-data ${isEven ? 'tr-even' : 'tr-odd'}`}>
            <td className="td-ref">{ref}</td>
            <td className="td-lib">{lib}</td>
            <td className="td-sign">{solde < 0 ? '-' : '+'}</td>
            <td className="td-num">
              <AmountWithDetail
                value={solde}
                detailKey="n"
                openKey={openKey}
                toggle={toggle}
                hasDetail={hasDetail}
              />
            </td>
            <td className="td-num">
              <AmountWithDetail
                value={soldeN1}
                detailKey="n1"
                openKey={openKey}
                toggle={toggle}
                hasDetail={hasDetailN1}
                signed
              />
            </td>
          </tr>
        )}
      </DataRowWithCellDetails>
    )];
  });

  return (
    <div style={{ paddingBottom: 24 }}>
      <OfficialHeader
        entite={entite}
        periode={periode}
        pageNum={1}
        totalPages={1}
        docType="TABLEAU DES FLUX DE TRÉSORERIE"
        title="ÉTATS FINANCIERS ANNUELS"
        subtitle="TABLEAU DES FLUX DE TRÉSORERIE"
      />

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

        <tbody>
          <DataRowWithCellDetails detail={postes.ZA?.detail || []} detailN1={postesN1.ZA?.detail || []} colCount={5}>
            {(openKey, toggle, hasDetail, hasDetailN1) => (
              <tr className="tr-subtotal">
                <td className="td-ref">ZA</td>
                <td className="td-lib" colSpan={2}>
                  Trésorerie nette au 1er Janvier
                  <div style={{ fontSize: 9, fontWeight: 400, marginTop: 1 }}>
                    (Trésorerie actif N-1 - Trésorerie passif N-1)
                  </div>
                </td>
                <td className="td-num">
                  <AmountWithDetail
                    value={tresoOuv}
                    detailKey="n"
                    openKey={openKey}
                    toggle={toggle}
                    hasDetail={hasDetail}
                  />
                </td>
                <td className="td-num">
                  <AmountWithDetail
                    value={postesN1.ZA?.solde ?? 0}
                    detailKey="n1"
                    openKey={openKey}
                    toggle={toggle}
                    hasDetail={hasDetailN1}
                  />
                </td>
              </tr>
            )}
          </DataRowWithCellDetails>

          {renderRows()}
        </tbody>
      </table>

      <div className={`balance-badge ${data.est_coherent ? 'balance-ok' : 'balance-err'}`}>
        {data.est_coherent ? (
          <>
            <FiCheckCircle size={14} /> Flux cohérents - Trésorerie clôture = Ouverture + Variation ({fmt(zhControle)} F CFA)
          </>
        ) : (
          <>
            <FiAlertTriangle size={14} /> Incohérence détectée - Ecart : {fmt(Math.abs(zhControle - tresoOuv - variation))} F CFA
          </>
        )}
      </div>
    </div>
  );
}


// ─────────────────────────────────────────────────────────────────────────────
// NOTES ANNEXES — rendu dynamique
// ─────────────────────────────────────────────────────────────────────────────

function NotesTab({ data, entite, periode, initialNote }) {
  const noteRefs = useRef({});

  useEffect(() => {
    if (!initialNote || !data) return;
    setTimeout(() => {
      noteRefs.current[initialNote]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 150);
  }, [initialNote, data]);

  if (!data) return null;
  const notes = data.notes || [];

  if (notes.length === 0) {
    return (
      <div style={{ padding: '48px 0', textAlign: 'center', color: '#888', fontStyle: 'italic', fontSize: 12 }}>
        Aucune note annexe disponible pour cette balance.
      </div>
    );
  }

  return (
    <div style={{ paddingBottom: 24 }}>
      <OfficialHeader
        entite={entite}
        periode={periode}
        pageNum={1}
        totalPages={1}
        docType="NOTES ANNEXES"
        title="ÉTATS FINANCIERS ANNUELS"
        subtitle="NOTES ANNEXES AUX ÉTATS FINANCIERS"
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {notes.map((note) => {
          const noteId = `note-${note.numero}`;
          return (
            <div
              key={note.numero}
              id={noteId}
              className="note-block"
              ref={el => { noteRefs.current[noteId] = el; }}
            >
              {/* En-tête note */}
              <div className="note-header-bar">
                <span className="note-num-badge">Note {note.numero}</span>
                {note.titre}
              </div>

              {/* Tableau simple */}
              {note.type === 'tableau_simple' && (
                <table className="sysc-table">
                  <thead>
                    <tr>
                      {note.colonnes.map((col, i) => (
                        <th key={i} className={i < 2 ? 'th-main left' : 'th-main'} style={{ fontSize: 9 }}>
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {note.lignes.map((ligne, i) => {
                      const numVals = Object.entries(ligne).filter(([k]) => !['code', 'label'].includes(k));
                      return (
                        <tr key={i} className={`tr-data ${i % 2 === 0 ? 'tr-even' : 'tr-odd'}`}>
                          <td className="td-ref">{ligne.code}</td>
                          <td className="td-lib">{ligne.label}</td>
                          {numVals.map(([k, v], j) => (
                            <td key={j} className="td-num">{fmt(v)}</td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}

              {/* Tableau mouvements */}
              {note.type === 'tableau_mouvements' && (
                <table className="sysc-table">
                  <thead>
                    <tr>
                      {note.colonnes.map((col, i) => (
                        <th key={i} className={i < 2 ? 'th-main left' : 'th-main'} style={{ fontSize: 9 }}>
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {note.lignes.map((ligne, i) => (
                      <tr key={i} className={`tr-data ${i % 2 === 0 ? 'tr-even' : 'tr-odd'}`}>
                        <td className="td-ref">{ligne.code}</td>
                        <td className="td-lib">{ligne.label}</td>
                        <td className="td-num">{fmt(ligne.val_debut)}</td>
                        <td className="td-num">{fmt(ligne.acquisitions)}</td>
                        <td className="td-num">{fmt(ligne.cessions)}</td>
                        <td className="td-num">{fmt(ligne.val_fin)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          );
        })}
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

  const [activeTab, setActiveTab]   = useState('bilan_actif');
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

  // ── Chargement import + entité + période ─────────────────────────────────
  useEffect(() => {
    apiClient.get(`financial-reports/raw-imports/${id}/`)
      .then(res => {
        setImportData(res);
        const periodeId = res.period?.id || res.period;
        if (!periodeId) return;
        apiClient.get(`financial-reports/periods/${periodeId}/`)
          .then(per => {
            setPeriode(per);
            const entiteId = per.company?.id || per.company;
            if (entiteId) {
              apiClient.get(`entites/${entiteId}/`)
                .then(setEntite)
                .catch(() => {});
            }
          })
          .catch(() => {});
      })
      .catch(() => setError('Import introuvable ou accès refusé.'));
  }, [id]);

  // ── Chargement d'un onglet ────────────────────────────────────────────────
  const loadTab = useCallback(async (tab) => {
    setActiveTab(tab);
    if ((tab === 'bilan_actif' || tab === 'bilan_passif') && bilanData) return;
    if (tab === 'cr'    && crData)    return;
    if (tab === 'tft'   && tftData)   return;
    if (tab === 'notes' && notesData) return;

    setLoading(true);
    setError(null);
    try {
      const EP_MAP = {
        bilan_actif: 'bilan',
        bilan_passif: 'bilan',
        cr:    'compte_resultat',
        tft:   'tft',
        notes: 'notes',
      };
      const d = await apiClient.get(`financial-reports/raw-imports/${id}/${EP_MAP[tab]}/`);
      if (tab === 'bilan_actif' || tab === 'bilan_passif') setBilanData(d);
      if (tab === 'cr')    setCrData(d);
      if (tab === 'tft')   setTftData(d);
      if (tab === 'notes') setNotesData(d);
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || 'Erreur de chargement.');
    } finally {
      setLoading(false);
    }
  }, [id, bilanData, crData, tftData, notesData]);

  // Chargement initial
  useEffect(() => { loadTab('bilan_actif'); }, []); // eslint-disable-line

  // ── Navigation vers les notes depuis bilan/CR ─────────────────────────────
  const handleNoteClick = useCallback((noteId) => {
    if (!noteId) return;
    setTargetNote(noteId);
    loadTab('notes');
  }, [loadTab]);

  useEffect(() => {
    if (activeTab !== 'notes') setTargetNote(null);
  }, [activeTab]);

  // ── Rafraîchissement forcé ────────────────────────────────────────────────
  const refreshAll = () => {
    setBilanData(null); setCrData(null); setTftData(null); setNotesData(null);
    setTimeout(() => loadTab(activeTab), 50);
  };

  const handleExportExcel = () => {
    const requests = [];

    if (!bilanData) {
      requests.push(apiClient.get(`financial-reports/raw-imports/${id}/bilan/`));
    } else {
      requests.push(Promise.resolve(bilanData));
    }

    if (!crData) {
      requests.push(apiClient.get(`financial-reports/raw-imports/${id}/compte_resultat/`));
    } else {
      requests.push(Promise.resolve(crData));
    }

    if (!tftData) {
      requests.push(apiClient.get(`financial-reports/raw-imports/${id}/tft/`));
    } else {
      requests.push(Promise.resolve(tftData));
    }

    Promise.all(requests)
      .then(([loadedBilan, loadedCr, loadedTft]) => {
        if (!bilanData) setBilanData(loadedBilan);
        if (!crData) setCrData(loadedCr);
        if (!tftData) setTftData(loadedTft);
        exportBilanToExcel(loadedBilan, loadedCr, loadedTft, periode, entite);
      })
      .catch(() => {
        exportBilanToExcel(bilanData, crData, tftData, periode, entite);
      });
  };

  const TABS = [
    { key: 'bilan_actif',  label: 'Bilan actif',             emoji: '\u2696\uFE0F' },
    { key: 'bilan_passif', label: 'Bilan passif',            emoji: '\u2696\uFE0F' },
    { key: 'cr',           label: 'Compte de r\u00E9sultat', emoji: '\uD83D\uDCCA' },
    { key: 'tft',          label: 'Flux de tr\u00E9sorerie', emoji: '\uD83D\uDCB8' },
    { key: 'notes',        label: 'Notes annexes',           emoji: '\uD83D\uDCCB' },
  ];

  return (
    <div className="sysc-page">
      <style>{syscohadaStyles + EXTRA_STYLES}</style>

      {/* ── Navbar ── */}
      <div className="sysc-navbar no-print">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            className="sysc-navbar-btn"
            onClick={() => navigate(`/financial-reports/statements/${id}`)}
          >
            <FiArrowLeft size={13} /> Vue standard
          </button>
          <div style={{ color: 'white', fontSize: 12, fontWeight: 700 }}>
            📄 Format officiel SYSCOHADA
            {importData && (
              <span style={{ color: '#ffd700', marginLeft: 8, fontSize: 11, fontWeight: 400 }}>
                — {importData.name}
              </span>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="sysc-navbar-btn" onClick={refreshAll}>
            <FiRefreshCw size={12} /> Actualiser
          </button>
          <button
            className="sysc-navbar-btn btn-excel"
            onClick={handleExportExcel}
            title="Exporter tous les états en Excel (.xlsx)"
          >
            <FiDownload size={12} /> Excel
          </button>
          <button className="sysc-navbar-btn primary" onClick={() => window.print()}>
            <FiPrinter size={12} /> Imprimer
          </button>
        </div>
      </div>

      {/* ── Onglets ── */}
      <div className="sysc-tabs no-print">
        {TABS.map(tab => (
          <button
            key={tab.key}
            className={`sysc-tab ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => loadTab(tab.key)}
          >
            {tab.emoji} {tab.label}
          </button>
        ))}
      </div>

      {/* ── Erreur ── */}
      {error && <div className="sysc-error">⚠ {error}</div>}

      {/* ── Contenu ── */}
      <div className="sysc-sheet">
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
            <div className="spinner" />
          </div>
        )}



        {!loading && (
          <>
            {activeTab === 'bilan_actif' && (
              <BilanTab
                data={bilanData}
                entite={entite}
                periode={periode}
                onNoteClick={handleNoteClick}
                section="actif"
              />
            )}
            {activeTab === 'bilan_passif' && (
              <BilanTab
                data={bilanData}
                entite={entite}
                periode={periode}
                onNoteClick={handleNoteClick}
                section="passif"
              />
            )}
            {activeTab === 'cr' && (
              <CRTab
                data={crData}
                entite={entite}
                periode={periode}
                onNoteClick={handleNoteClick}
              />
            )}
            {activeTab === 'tft' && (
              <TFTTab
                data={tftData}
                entite={entite}
                periode={periode}
              />
            )}
            {activeTab === 'notes' && (
              <NotesTab
                data={notesData}
                entite={entite}
                periode={periode}
                initialNote={targetNote}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
