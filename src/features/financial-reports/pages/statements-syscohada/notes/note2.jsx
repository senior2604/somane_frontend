// notes/note2.jsx — NOTE 2 : Informations obligatoires

import { OfficialHeader } from '../shared';

export default function Note2({ data, importData, pageNum = 14 }) {
  const nd = data?.notes?.note2 || {};

  const blocks = [
    {
      titre: 'A-  DECLARATION DE CONFORMITE AU SYSCOHADA',
      contenu: nd.conformite || "Les états financiers sont établis en conformité avec le Système comptable OHADA et l'acte uniforme relatif au droit comptable et à l'information financière.",
    },
    {
      titre: 'B-  REGLES ET METHODES COMPTABLES',
      contenu: nd.methodes || "Les états financiers ont été confectionnés dans le respect des postulats, des conventions et des règles d'évaluation édictées par le SYSCOHADA et l'Acte Uniforme.",
    },
    {
      titre: 'C-  DEROGATION AUX POSTULATS ET CONVENTIONS COMPTABLES',
      contenu: nd.derogations || 'Respect de tous les postulats et conventions comptables sans aucune dérogation.',
    },
    {
      titre: 'D- INFORMATIONS COMPLEMENTAIRES RELATIVES AU BILAN, AU COMPTE DE RESULTAT ET AU TABLEAU DES FLUX DE TRESORERIE',
      contenu: nd.info_complementaires || "Pas d'informations complémentaires relatives aux autres états financiers.",
    },
  ];

  return (
    <div style={{ paddingBottom: 24 }}>
      <OfficialHeader
        importData={importData}
        pageNum={pageNum}
        totalPages="47"
        docType="NOTES ANNEXES SYSTÈME NORMAL"
        title="NOTE 2"
        subtitle="INFORMATIONS OBLIGATOIRES"
      />
      <div style={{ padding: '8px 0 16px' }}>
        {blocks.map((block, i) => (
          <div key={i} className="info-block">
            <div className="info-block-header">{block.titre}</div>
            <div className="info-block-body">{block.contenu}</div>
          </div>
        ))}
      </div>
    </div>
  );
}