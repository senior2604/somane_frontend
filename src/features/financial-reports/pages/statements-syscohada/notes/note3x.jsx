// notes/note3x.jsx — Notes 3A, 3B, 3C, 3D, 3E

import { OfficialHeader } from '../shared';
import { fmt } from '../shared';

// ── COLONNES COMMUNES NOTE 3A / 3B ──
const ColsAugDim = () => (
  <>
    <th className="th-sub" style={{ width: 75 }}>Acquisitions Apports Créations</th>
    <th className="th-sub" style={{ width: 75 }}>Virement de poste à poste</th>
    <th className="th-sub" style={{ width: 75 }}>Suite à une réévaluation pratiquée au cours de l'exercice</th>
    <th className="th-sub" style={{ width: 75, background: '#7a4040' }}>Cession Scission Hors service</th>
    <th className="th-sub" style={{ width: 75, background: '#7a4040' }}>Virement de poste à poste</th>
  </>
);

const zeroRow7 = () => [0, 0, 0, 0, 0, 0, 0].map((_, i) => <td key={i} className="td-num">0</td>);

// ─────────────────────────────────────────────────────────────────────────────
// NOTE 3A — Immobilisation brute
// ─────────────────────────────────────────────────────────────────────────────

export function Note3A({ data, importData, pageNum = 15 }) {
  const nd = data?.notes?.note3a || {};

  const cats = [
    {
      label: 'IMMOBILISATIONS INCORPORELLES',
      key: 'incorporelles',
      items: [
        'Frais de développement et de prospection',
        'Brevets, licences, logiciels, et droits similaires',
        'Fonds commercial et droit au bail',
        'Autres immobilisations incorporelles',
      ],
    },
    {
      label: 'IMMOBILISATIONS CORPORELLES',
      key: 'corporelles',
      items: [
        'Terrains hors immeuble de placement',
        'Terrain - immeuble de placement',
        'Bâtiments hors immeuble de placement',
        'Bâtiment - immeuble de placement',
        'Aménagements, agencements et installations',
        'Matériel, mobilier et actifs biologiques',
        'Matériel de transport',
      ],
    },
    {
      label: 'AVANCES ET ACOMPTES VERSES SUR IMMOBILISATION',
      key: 'avances',
      items: [],
    },
    {
      label: 'IMMOBILISATIONS FINANCIERES',
      key: 'financieres',
      items: [
        'Titres de participation',
        'Autres immobilisations financières',
      ],
    },
  ];

  const getItem = (catKey, itemIdx, field) => nd.categories?.[catKey]?.items?.[itemIdx]?.[field] ?? 0;
  const getCatTotal = (catKey, field) => nd.categories?.[catKey]?.total?.[field] ?? 0;
  const getGrandTotal = (field) => nd.total?.[field] ?? 0;

  const fields = ['ouv', 'acq', 'vir_aug', 'reev', 'cess', 'vir_dim', 'clot'];

  return (
    <div style={{ paddingBottom: 24 }}>
      <OfficialHeader importData={importData} pageNum={pageNum} totalPages="47"
        docType="NOTES ANNEXES SYSTÈME NORMAL" title="NOTE 3A" subtitle="IMMOBILISATION BRUTE" />

      <div style={{ padding: '4px 8px', fontSize: 9, color: '#666', fontStyle: 'italic', background: '#fffde7', borderBottom: '1px solid #f9a825' }}>
        ⚠ Les virements de poste à poste sont à renseigner manuellement
      </div>

      <table className="sysc-table">
        <thead>
          <tr>
            <th className="th-main left" rowSpan={2} style={{ width: '26%' }}>SITUATIONS ET MOUVEMENTS</th>
            <th className="th-main" style={{ width: 75 }}>A — MONTANT BRUT A L'OUVERTURE</th>
            <th colSpan={4} className="th-year">AUGMENTATIONS B</th>
            <th colSpan={2} className="th-year" style={{ background: '#6b3a3a' }}>DIMINUTIONS C</th>
            <th className="th-main" style={{ width: 75 }}>D = A+B-C — MONTANT BRUT A LA CLOTURE</th>
          </tr>
          <tr>
            <th className="th-sub"></th>
            <ColsAugDim />
            <th className="th-sub"></th>
          </tr>
        </thead>
        <tbody>
          {cats.map((cat) => (
            <>
              <tr key={`cat-${cat.key}`} className="tr-section">
                <td className="td-lib">{cat.label}</td>
                {fields.map(f => <td key={f} className="td-num">{fmt(getCatTotal(cat.key, f))}</td>)}
              </tr>
              {cat.items.map((item, ii) => (
                <tr key={`${cat.key}-${ii}`} className={`tr-data ${ii % 2 === 0 ? 'tr-even' : 'tr-odd'}`}>
                  <td className="td-lib" style={{ paddingLeft: 16 }}>{item}</td>
                  {fields.map(f => <td key={f} className="td-num">{fmt(getItem(cat.key, ii, f))}</td>)}
                </tr>
              ))}
            </>
          ))}
          <tr className="tr-total">
            <td className="td-lib">TOTAL GENERAL</td>
            {fields.map(f => <td key={f} className="td-num">{fmt(getGrandTotal(f))}</td>)}
          </tr>
        </tbody>
      </table>
      <div className="commentaire-block">
        <div className="commentaire-label">Commentaire:</div>
        <div className="commentaire-text">{nd.commentaire || "Aucune immobilisation n'a été acquise au cours de l'exercice"}</div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// NOTE 3B — Biens pris en location acquisition
// ─────────────────────────────────────────────────────────────────────────────

export function Note3B({ data, importData, pageNum = 16 }) {
  const nd = data?.notes?.note3b || {};

  const cats = [
    {
      label: 'IMMOBILISATIONS INCORPORELLES', key: 'incorporelles',
      items: ['Brevets, licences, logiciels, et droits similaires', 'Fonds commercial et droit au bail', 'Autres immobilisations incorporelles'],
    },
    {
      label: 'IMMOBILISATIONS CORPORELLES', key: 'corporelles',
      items: ['Terrains', 'Bâtiments', 'Aménagements, agencements et installations', 'Matériel, mobilier et actifs biologiques', 'Matériel de Transport'],
    },
  ];

  const fields = ['nature', 'ouv', 'acq', 'vir_aug', 'reev', 'cess', 'vir_dim', 'clot'];

  return (
    <div style={{ paddingBottom: 24 }}>
      <OfficialHeader importData={importData} pageNum={pageNum} totalPages="47"
        docType="NOTES ANNEXES SYSTÈME NORMAL" title="NOTE 3B" subtitle="BIENS PRIS EN LOCATION ACQUISITION" />
      <table className="sysc-table">
        <thead>
          <tr>
            <th className="th-main left" rowSpan={2} style={{ width: '26%' }}>RUBRIQUES</th>
            <th className="th-main" rowSpan={2} style={{ width: 55 }}>NATURE DU CONTRAT (I; M; A)</th>
            <th className="th-main" style={{ width: 75 }}>A — MONTANT BRUT A L'OUVERTURE</th>
            <th colSpan={3} className="th-year">AUGMENTATIONS B</th>
            <th colSpan={2} className="th-year" style={{ background: '#6b3a3a' }}>DIMINUTIONS C</th>
            <th className="th-main" style={{ width: 75 }}>D = A+B-C</th>
          </tr>
          <tr>
            <th className="th-sub"></th>
            <ColsAugDim />
            <th className="th-sub"></th>
          </tr>
        </thead>
        <tbody>
          {cats.map((cat) => (
            <>
              <tr key={cat.key} className="tr-section">
                <td className="td-lib" colSpan={2}>{cat.label}</td>
                {[0,0,0,0,0,0,0].map((_,i)=><td key={i} className="td-num">0</td>)}
              </tr>
              {cat.items.map((item, ii) => (
                <tr key={`${cat.key}-${ii}`} className={`tr-data ${ii%2===0?'tr-even':'tr-odd'}`}>
                  <td className="td-lib" style={{ paddingLeft: 16 }}>{item}</td>
                  <td className="td-num"></td>
                  {[0,0,0,0,0,0,0].map((_,i)=><td key={i} className="td-num">0</td>)}
                </tr>
              ))}
            </>
          ))}
          <tr className="tr-total">
            <td className="td-lib" colSpan={2}>TOTAL GENERAL</td>
            {[0,0,0,0,0,0,0].map((_,i)=><td key={i} className="td-num">0</td>)}
          </tr>
        </tbody>
      </table>
      <div className="commentaire-block">
        <div className="commentaire-label">Commentaire:</div>
        <div className="commentaire-text">{nd.commentaire || "Aucune immobilisation n'a été pris en location acquisition"}</div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// NOTE 3C — Amortissements
// ─────────────────────────────────────────────────────────────────────────────

export function Note3C({ data, importData, pageNum = 17 }) {
  const nd = data?.notes?.note3c || {};

  const incorporelles = [
    'Frais de développement et de prospection',
    'Brevets, licences, logiciels, et droits similaires',
    'Fonds commercial et droit au bail',
    'Autres immobilisations incorporelles',
  ];
  const corporelles = [
    'Terrains hors immeuble de placement',
    'Terrain - immeuble de placement',
    'Bâtiments hors immeuble de placement',
    'Bâtiment - immeuble de placement',
    'Aménagements, agencements et installations',
    'Matériel, mobilier et actifs biologiques',
    'Matériel de transport',
  ];

  return (
    <div style={{ paddingBottom: 24 }}>
      <OfficialHeader importData={importData} pageNum={pageNum} totalPages="47"
        docType="NOTES ANNEXES SYSTÈME NORMAL" title="NOTE 3C" subtitle="IMMOBILISATIONS (AMORTISSEMENTS)" />
      <table className="sysc-table">
        <thead>
          <tr>
            <th className="th-main left" style={{ width: '36%' }}>SITUATIONS ET MOUVEMENTS — RUBRIQUES</th>
            <th className="th-main" style={{ width: 110 }}>A — AMORTISSEMENTS CUMULES A L'OUVERTURE DE L'EXERCICE</th>
            <th className="th-main" style={{ width: 110 }}>B — AUGMENTATIONS: DOTATIONS DE L'EXERCICE</th>
            <th className="th-main" style={{ width: 110 }}>C — DIMINUTIONS: Amortissements relatifs aux éléments sortis de</th>
            <th className="th-main" style={{ width: 110 }}>D = A+B-C — CUMULS DES AMORTISSEMENTS A LA CLOTURE DE</th>
          </tr>
        </thead>
        <tbody>
          {incorporelles.map((item, i) => (
            <tr key={i} className={`tr-data ${i%2===0?'tr-even':'tr-odd'}`}>
              <td className="td-lib" style={{ paddingLeft: 16 }}>{item}</td>
              {[0,0,0,0].map((_,j)=><td key={j} className="td-num">0</td>)}
            </tr>
          ))}
          <tr className="tr-subtotal">
            <td className="td-lib">SOUS-TOTAL: IMMOBILISATIONS INCORPORELLES</td>
            {[0,0,0,0].map((_,i)=><td key={i} className="td-num">0</td>)}
          </tr>
          {corporelles.map((item, i) => (
            <tr key={`c${i}`} className={`tr-data ${i%2===0?'tr-even':'tr-odd'}`}>
              <td className="td-lib" style={{ paddingLeft: 16 }}>{item}</td>
              {[0,0,0,0].map((_,j)=><td key={j} className="td-num">0</td>)}
            </tr>
          ))}
          <tr className="tr-subtotal">
            <td className="td-lib">SOUS-TOTAL: IMMOBILISATIONS CORPORELLES</td>
            {[0,0,0,0].map((_,i)=><td key={i} className="td-num">0</td>)}
          </tr>
          <tr><td colSpan={5} style={{ height: 6, background: 'white', border: 'none' }}></td></tr>
          <tr className="tr-total">
            <td className="td-lib">TOTAL GENERAL</td>
            {[0,0,0,0].map((_,i)=><td key={i} className="td-num">0</td>)}
          </tr>
        </tbody>
      </table>
      <div className="commentaire-block">
        <div className="commentaire-label">Commentaire:</div>
        <div className="commentaire-text">{nd.commentaire || "Etant donné qu'aucune immobilisation n'a été acquise au cours de l'exerce donc pas d'amortissement"}</div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// NOTE 3D — Plus/Moins-values de cessions
// ─────────────────────────────────────────────────────────────────────────────

export function Note3D({ data, importData, pageNum = 18 }) {
  const nd = data?.notes?.note3d || {};

  const sections = [
    {
      items: ['Frais de développement et de prospection','Brevets, licences, logiciels, et droits similaires','Fonds commercial et droit au bail','Autres immobilisations incorporelles'],
      subtotal: 'SOUS-TOTAL IMMOBILISATIONS INCORPORELLES',
    },
    {
      items: ['Terrains','Bâtiments','Aménagements, agencements et installations','Matériel, mobilier et actifs biologiques','Matériel de Transport'],
      subtotal: 'SOUS-TOTAL IMMOBILISATIONS CORPORELLES',
    },
    {
      items: ['Titres de participation','Autres immobilisations financières'],
      subtotal: 'SOUS-TOTAL IMMOBILISATIONS FINANCIERES',
    },
  ];

  return (
    <div style={{ paddingBottom: 24 }}>
      <OfficialHeader importData={importData} pageNum={pageNum} totalPages="47"
        docType="NOTES ANNEXES SYSTÈME NORMAL" title="NOTE 3D" subtitle="PLUS - VALUES ET MOINS - VALUES DE CESSIONS" />
      <table className="sysc-table">
        <thead>
          <tr>
            <th className="th-main left" style={{ width: '30%' }}></th>
            <th className="th-main" style={{ width: 90 }}>MONTANT BRUT A</th>
            <th className="th-main" style={{ width: 90 }}>AMORTISSEMENTS PRATIQUES B</th>
            <th className="th-main" style={{ width: 90 }}>VALEUR COMPTABLE NETTE C = A - B</th>
            <th className="th-main" style={{ width: 90 }}>PRIX DE CESSION D</th>
            <th className="th-main" style={{ width: 90 }}>PLUS-VALUE OU MOINS VALUE E = D - C</th>
          </tr>
        </thead>
        <tbody>
          {sections.map((sec, si) => (
            <>
              {sec.items.map((item, ii) => (
                <tr key={`${si}-${ii}`} className={`tr-data ${ii%2===0?'tr-even':'tr-odd'}`}>
                  <td className="td-lib">{item}</td>
                  {[0,0,0,0,0].map((_,j)=><td key={j} className="td-num">0</td>)}
                </tr>
              ))}
              <tr key={`sub-${si}`} className="tr-subtotal">
                <td className="td-lib">{sec.subtotal}</td>
                {[0,0,0,0,0].map((_,i)=><td key={i} className="td-num">0</td>)}
              </tr>
            </>
          ))}
          <tr className="tr-total">
            <td className="td-lib">TOTAL GENERAL</td>
            {[0,0,0,0,0].map((_,i)=><td key={i} className="td-num">0</td>)}
          </tr>
        </tbody>
      </table>
      <div className="commentaire-block">
        <div className="commentaire-label">Commentaire:</div>
        <div className="commentaire-text">{nd.commentaire || "Aucun bien n'a été acheté et/ou cédé au cours de l'exercice"}</div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// NOTE 3E — Informations sur les réévaluations
// ─────────────────────────────────────────────────────────────────────────────

export function Note3E({ data, importData, pageNum = 19 }) {
  const nd = data?.notes?.note3e || {};

  const items = ['Terrains','Bâtiments','Agencements aménagement, installations','Matériel, mobilier actifs biologiques','Matériel de transport'];

  return (
    <div style={{ paddingBottom: 24 }}>
      <OfficialHeader importData={importData} pageNum={pageNum} totalPages="47"
        docType="NOTES ANNEXES SYSTÈME NORMAL" title="NOTE 3E" subtitle="INFORMATIONS SUR LES REEVALUATIONS EFFECTUEES PAR L'ENTITE" />

      <div style={{ padding: '8px 16px 4px', fontWeight: 700, fontSize: 10.5 }}>Nature et dates des réévaluations :</div>
      <div style={{ padding: '4px 16px 10px', fontStyle: 'italic', fontSize: 10.5, color: '#444', minHeight: 48, borderBottom: '1px solid #ddd' }}>
        {nd.nature_reevaluation || "Aucun bien n'a été réévalué"}
      </div>

      <table className="sysc-table" style={{ marginTop: 0 }}>
        <thead>
          <tr>
            <th className="th-main left">Eléments réévaluées par postes du bilan</th>
            <th className="th-main" style={{ width: 130 }}>Montants coûts historiques</th>
            <th className="th-main" style={{ width: 130 }}>Ecart et provisions spéciales de réévaluation</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr key={i} className={`tr-data ${i%2===0?'tr-even':'tr-odd'}`}>
              <td className="td-lib">{item}</td>
              <td className="td-num">{fmt(nd.items?.[i]?.cout ?? 0)}</td>
              <td className="td-num">{fmt(nd.items?.[i]?.ecart ?? 0)}</td>
            </tr>
          ))}
          <tr className="tr-subtotal">
            <td className="td-lib">Total ecart de réévaluation</td>
            <td className="td-num"></td>
            <td className="td-num">0</td>
          </tr>
          <tr className="tr-subtotal">
            <td className="td-lib">Total provisions spéciales de réévaluation</td>
            <td className="td-num"></td>
            <td className="td-num">0</td>
          </tr>
        </tbody>
      </table>

      <div style={{ padding: '6px 16px', fontWeight: 700, fontSize: 10.5, borderTop: '1px solid #ccc', marginTop: 8 }}>
        Méthode de réévaluation utilisée :
      </div>
      <div style={{ padding: '4px 16px 12px', fontStyle: 'italic', fontSize: 10.5, color: '#444', minHeight: 36 }}>
        {nd.methode || ''}
      </div>
      <div style={{ padding: '6px 16px', fontWeight: 700, fontSize: 10.5, borderTop: '1px solid #ccc', display: 'flex', justifyContent: 'space-between' }}>
        <span>Traitement fiscal de l'écart de réévaluation et des amortissements supplémentaires :</span>
        <span>0</span>
      </div>
      <div style={{ padding: '6px 16px 12px', fontWeight: 700, fontSize: 10.5, borderTop: '1px solid #ccc', display: 'flex', justifyContent: 'space-between' }}>
        <span>Montant de l'écart incorporé au capital :</span>
        <span>0</span>
      </div>
    </div>
  );
}