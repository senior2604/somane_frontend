// notes/note-generic.jsx — Rendu générique pour les notes 4 à 30

import { OfficialHeader, fmt } from '../shared';

export default function NoteGeneric({ data, entite, periode, noteId, pageNum, num, title }) {
  const nd = data?.notes?.[noteId] || {};

  return (
    <div style={{ paddingBottom: 24 }}>
      <OfficialHeader
        entite={entite}
        periode={periode}
        pageNum={pageNum}
        totalPages="47"
        docType="NOTES ANNEXES SYSTÈME NORMAL"
        title={num}
        subtitle={title}
      />

      {nd.colonnes ? (
        <table className="sysc-table">
          <thead>
            <tr>
              {nd.colonnes.map((col, i) => (
                <th key={i} className={i === 0 ? 'th-main left' : 'th-main'}>
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(nd.lignes || []).map((ligne, i) => {
              if (ligne.type === 'group') return (
                <tr key={i} className="tr-note-group">
                  <td className="td-lib" colSpan={nd.colonnes.length} style={{ fontWeight: 700, fontStyle: 'italic' }}>{ligne.label}</td>
                </tr>
              );
              if (ligne.type === 'subtotal') return (
                <tr key={i} className="tr-subtotal">
                  {nd.colonnes.map((_, j) => (
                    <td key={j} className={j === 0 ? 'td-lib' : 'td-num'}>
                      {j === 0 ? ligne.label : fmt(ligne.valeurs?.[j] ?? 0)}
                    </td>
                  ))}
                </tr>
              );
              if (ligne.type === 'total') return (
                <tr key={i} className="tr-total">
                  {nd.colonnes.map((_, j) => (
                    <td key={j} className={j === 0 ? 'td-lib' : 'td-num'}>
                      {j === 0 ? ligne.label : fmt(ligne.valeurs?.[j] ?? 0)}
                    </td>
                  ))}
                </tr>
              );
              const isEven = i % 2 === 0;
              return (
                <tr key={i} className={`tr-data ${isEven ? 'tr-even' : 'tr-odd'}`}>
                  {nd.colonnes.map((_, j) => (
                    <td key={j} className={j === 0 ? 'td-lib' : 'td-num'}>
                      {j === 0 ? ligne.label : fmt(ligne.valeurs?.[j] ?? 0)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      ) : (
        <div style={{ padding: '20px 16px', textAlign: 'center', color: '#999', fontSize: 11, fontStyle: 'italic' }}>
          Données non disponibles pour cette note.
        </div>
      )}

      {nd.commentaire !== undefined && (
        <div className="commentaire-block">
          <div className="commentaire-label">Commentaire:</div>
          <div className="commentaire-text">{nd.commentaire || '\u00a0'}</div>
        </div>
      )}
    </div>
  );
}