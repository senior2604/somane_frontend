// notes/note1.jsx — NOTE 1 : Dettes garanties par des sûretés réelles

import { OfficialHeader, fmt } from '../shared';

export default function Note1({ data, entite, periode, pageNum = 13 }) {
  const nd = data?.notes?.note1 || {};

  const sectionFinancieres = {
    label: 'Dettes financières et ressources assimilées',
    items: [
      { label: 'Emprunts obligataires convertibles',              key: 'emprunts_oblig_conv' },
      { label: 'Autres emprunts obligataires',                    key: 'autres_emprunts_oblig' },
      { label: 'Emprunts et dettes des établissements de crédit', key: 'emprunts_etab_credit' },
      { label: 'Autres dettes financières',                       key: 'autres_dettes_fin' },
    ],
    subtotalKey: 'sous_total_1',
    subtotalLabel: 'SOUS TOTAL (1)',
  };

  const sectionLocation = {
    label: 'Dettes de location-acquisition:',
    items: [
      { label: 'Dettes de crédit-bail immobilier',                   key: 'credit_bail_immo' },
      { label: 'Dettes de crédit-bail mobilier',                     key: 'credit_bail_mobilier' },
      { label: 'Dettes sur contrats de location-vente',              key: 'location_vente' },
      { label: 'Dettes sur autres contrats de location-acquisition', key: 'autres_location' },
    ],
    subtotalKey: 'sous_total_2',
    subtotalLabel: 'SOUS TOTAL (2)',
  };

  const sectionCirculant = {
    label: 'Dettes du passif circulant:',
    items: [
      { label: 'Fournisseurs et comptes rattachés',       key: 'fournisseurs' },
      { label: 'Clients avance reçue',                   key: 'clients_avance' },
      { label: 'Personnel',                              key: 'personnel' },
      { label: 'Sécurité sociale et organismes sociaux', key: 'securite_sociale' },
      { label: 'Etat',                                   key: 'etat' },
      { label: 'Organismes internationaux',              key: 'organismes_int' },
      { label: 'Associé et groupe',                      key: 'associe_groupe' },
      { label: 'Créditeurs divers',                      key: 'crediteurs_divers' },
    ],
    subtotalKey: 'sous_total_3',
    subtotalLabel: 'SOUS TOTAL (3)',
  };

  const engagements = [
    'Engagements consentis à des entités liées',
    'Primes de remboursement non échues',
    'Avals, cautions, garanties',
    'Hypothèques, nantissements, gages, autres',
    'Effets escomptés non échus',
    'Créances commerciales et professionnelles cédées',
    'Abandons de créances conditionnels',
  ];

  const getVal = (key) => nd[key] ?? 0;
  const getSubTotal = (items) => items.reduce((s, it) => s + (nd[it.key] ?? 0), 0);

  const renderSection = (section, idx) => (
    <>
      {idx > 0 && (
        <tr>
          <td colSpan={5} style={{ height: 8, borderLeft: 'none', borderRight: 'none', background: 'white' }}></td>
        </tr>
      )}
      <tr className="tr-note-group">
        <td className="td-lib" style={{ fontWeight: 700, fontStyle: 'italic' }}>{section.label}</td>
        <td className="td-note"></td>
        <td className="td-num"></td>
        <td className="td-num"></td>
        <td className="td-num"></td>
        <td className="td-num"></td>
      </tr>
      {section.items.map((item, i) => (
        <tr key={item.key} className={`tr-data ${i % 2 === 0 ? 'tr-even' : 'tr-odd'}`}>
          <td className="td-lib" style={{ paddingLeft: 16 }}>{item.label}</td>
          <td className="td-note"></td>
          <td className="td-num">{fmt(getVal(item.key))}</td>
          <td className="td-num"></td>
          <td className="td-num"></td>
          <td className="td-num"></td>
        </tr>
      ))}
      <tr className="tr-section">
        <td className="td-lib">{section.subtotalLabel}</td>
        <td className="td-note"></td>
        <td className="td-num">{fmt(getSubTotal(section.items))}</td>
        <td className="td-num">0</td>
        <td className="td-num">0</td>
        <td className="td-num">0</td>
      </tr>
    </>
  );

  const grandTotal = getSubTotal(sectionFinancieres.items)
    + getSubTotal(sectionLocation.items)
    + getSubTotal(sectionCirculant.items);

  return (
    <div style={{ paddingBottom: 24 }}>
      <OfficialHeader
        entite={entite}
        periode={periode}
        pageNum={pageNum}
        totalPages="47"
        docType="NOTES ANNEXES SYSTÈME NORMAL"
        title="NOTE 1"
        subtitle="DETTES GARANTIES PAR DES SURETES REELLES"
      />

      <table className="sysc-table">
        <thead>
          <tr>
            <th className="th-main left" rowSpan={2}>LIBELLES</th>
            <th className="th-main" rowSpan={2} style={{ width: 40 }}>NOTE</th>
            <th className="th-main" rowSpan={2} style={{ width: 90 }}>MONTANT BRUT</th>
            <th colSpan={2} className="th-year">SURETES REELLES</th>
            <th className="th-year" style={{ width: 90 }}>GAGES<br />AUTRES</th>
          </tr>
          <tr>
            <th className="th-sub" style={{ width: 90 }}>HYPOTHEQUES</th>
            <th className="th-sub" style={{ width: 90 }}>NANTISSEMENTS</th>
          </tr>
        </thead>
        <tbody>
          {[sectionFinancieres, sectionLocation, sectionCirculant].map((s, i) => renderSection(s, i))}

          <tr className="tr-total">
            <td className="td-lib">TOTAL (1) + (2) + (3)</td>
            <td className="td-note"></td>
            <td className="td-num">{fmt(grandTotal)}</td>
            <td className="td-num">0</td>
            <td className="td-num">0</td>
            <td className="td-num">0</td>
          </tr>

          <tr style={{ height: 8 }}>
            <td colSpan={6} style={{ border: 'none', background: 'white' }}></td>
          </tr>
          <tr>
            <td
              className="td-lib"
              colSpan={2}
              style={{ textAlign: 'center', fontWeight: 700, background: '#dde4ed', color: '#1a3a5c', fontSize: 10.5, letterSpacing: '0.04em', textTransform: 'uppercase' }}
            >
              ENGAGEMENTS FINANCIERS
            </td>
            <td className="td-num" style={{ background: '#dde4ed' }}></td>
            <td className="td-num" style={{ background: '#dde4ed', fontWeight: 700, fontSize: 10, color: '#1a3a5c', textAlign: 'center' }}>Engagements<br />données</td>
            <td className="td-num" style={{ background: '#dde4ed', fontWeight: 700, fontSize: 10, color: '#1a3a5c', textAlign: 'center' }}>Engagements<br />reçus</td>
          </tr>
          {engagements.map((eng, i) => (
            <tr key={i} className={`tr-data ${i % 2 === 0 ? 'tr-even' : 'tr-odd'}`}>
              <td className="td-lib" colSpan={3}>{eng}</td>
              <td className="td-num"></td>
              <td className="td-num"></td>
            </tr>
          ))}
          <tr className="tr-total">
            <td className="td-lib" colSpan={3}>TOTAL</td>
            <td className="td-num">0</td>
            <td className="td-num">0</td>
          </tr>
        </tbody>
      </table>

      <div className="commentaire-block">
        <div className="commentaire-label">Commentaire:</div>
        <div className="commentaire-text">{nd.commentaire || "Aucune dette n'a été garantie par des sûretés réelles"}</div>
      </div>
    </div>
  );
}