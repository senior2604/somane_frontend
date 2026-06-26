// notes-tab.jsx — Container Notes avec dropdown searchable + navigation double-clic

import { useEffect, useRef, useState } from 'react';
import { FiChevronDown, FiSearch, FiX } from 'react-icons/fi';
import { NOTES_CATALOGUE, noteIdFromNumber } from './shared';
import { useEntity } from '../../../../context/EntityContext'; // adapte le chemin selon ton projet
import { apiClient } from '../../../../services/apiClient';
  // adapte le chemin selon ton projet

// Import des notes spécifiques
import Note1            from './notes/note1';
import Note2            from './notes/note2';
import { Note3A, Note3B, Note3C, Note3D, Note3E } from './notes/note3x';
import NoteGeneric      from './notes/note-generic';

// ─────────────────────────────────────────────────────────────────────────────
// DROPDOWN SEARCHABLE
// ─────────────────────────────────────────────────────────────────────────────

function NotesDropdown({ currentNote, onSelect }) {
  const [open, setOpen]     = useState(false);
  const [search, setSearch] = useState('');
  const ref      = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => { if (open && inputRef.current) inputRef.current.focus(); }, [open]);

  const filtered = NOTES_CATALOGUE.filter(n =>
    search === '' ||
    n.num.toLowerCase().includes(search.toLowerCase()) ||
    n.title.toLowerCase().includes(search.toLowerCase())
  );

  const current = NOTES_CATALOGUE.find(n => n.id === currentNote);

  return (
    <div className="notes-dropdown-wrapper" ref={ref}>
      <button className="notes-dropdown-trigger" onClick={() => setOpen(!open)}>
        <span>
          {current
            ? <><strong>{current.num}</strong> — {current.title}</>
            : 'Sélectionner une note...'}
        </span>
        <FiChevronDown size={12} style={{ flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
      </button>

      {open && (
        <div className="notes-dropdown-menu">
          <div className="notes-search">
            <FiSearch size={12} color="#999" />
            <input ref={inputRef} value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher une note..." />
            {search && <FiX size={12} color="#999" style={{ cursor: 'pointer' }} onClick={() => setSearch('')} />}
          </div>
          <div className="notes-list">
            {filtered.length === 0 && (
              <div style={{ padding: '12px 10px', fontSize: 11, color: '#999', textAlign: 'center' }}>Aucune note trouvée</div>
            )}
            {filtered.map(n => (
              <div
                key={n.id}
                className={`notes-list-item ${n.id === currentNote ? 'active' : ''}`}
                onClick={() => { onSelect(n.id); setOpen(false); setSearch(''); }}
              >
                <span className="note-num">{n.num}</span>
                <span className="note-title">{n.title}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// RENDU NOTE PAR ID
// ─────────────────────────────────────────────────────────────────────────────

function NoteRenderer({ noteId, data, entite, periode }) {
  const catalogue = NOTES_CATALOGUE.find(n => n.id === noteId);
  const pageNum = catalogue?.page || 13;
  const props = { data, entite, periode, pageNum };

  switch (noteId) {
    case 'note1':  return <Note1 {...props} />;
    case 'note2':  return <Note2 {...props} />;
    case 'note3a': return <Note3A {...props} />;
    case 'note3b': return <Note3B {...props} />;
    case 'note3c': return <Note3C {...props} />;
    case 'note3d': return <Note3D {...props} />;
    case 'note3e': return <Note3E {...props} />;
    default:
      return (
        <NoteGeneric
          {...props}
          noteId={noteId}
          num={catalogue?.num || noteId}
          title={catalogue?.title || ''}
        />
      );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CONTAINER PRINCIPAL
// Props :
//   data        — données comptables des notes
//   periodeId   — ID de la période (transmis par le parent)
//   initialNote — note à afficher au démarrage
// ─────────────────────────────────────────────────────────────────────────────

export default function NotesTab({ data, periodeId, initialNote }) {
  const { activeEntity } = useEntity();
  const [currentNote, setCurrentNote] = useState(initialNote || 'note1');
  const [periode, setPeriode]         = useState(null);

  // Fetch la période depuis l'API dès que periodeId est disponible
  useEffect(() => {
    if (!periodeId) return;
    apiClient.get(`financial-reports/periods/${periodeId}/`)
      .then(setPeriode)
      .catch(err => console.error('Impossible de charger la période :', err));
  }, [periodeId]);

  // Navigation depuis l'extérieur (double-clic sur NOTE dans un tableau)
  useEffect(() => {
    if (initialNote) setCurrentNote(initialNote);
  }, [initialNote]);

  const idx = NOTES_CATALOGUE.findIndex(n => n.id === currentNote);

  return (
    <div>
      {/* ── Barre navigation notes ── */}
      <div className="notes-nav no-print">
        <span className="notes-nav-label">📋 Note :</span>
        <NotesDropdown currentNote={currentNote} onSelect={setCurrentNote} />

        <div style={{ display: 'flex', gap: 4, marginLeft: 'auto' }}>
          <button
            disabled={idx <= 0}
            onClick={() => setCurrentNote(NOTES_CATALOGUE[idx - 1].id)}
            style={{
              padding: '5px 10px', fontSize: 11, border: '1px solid #aaa',
              borderRadius: 3, background: 'white',
              cursor: idx <= 0 ? 'not-allowed' : 'pointer',
              color: idx <= 0 ? '#aaa' : '#1a3a5c', fontWeight: 700,
            }}
          >
            ← Préc.
          </button>
          <button
            disabled={idx >= NOTES_CATALOGUE.length - 1}
            onClick={() => setCurrentNote(NOTES_CATALOGUE[idx + 1].id)}
            style={{
              padding: '5px 10px', fontSize: 11, border: '1px solid #aaa',
              borderRadius: 3, background: 'white',
              cursor: idx >= NOTES_CATALOGUE.length - 1 ? 'not-allowed' : 'pointer',
              color: idx >= NOTES_CATALOGUE.length - 1 ? '#aaa' : '#1a3a5c', fontWeight: 700,
            }}
          >
            Suiv. →
          </button>
        </div>

        {/* Indicateur de page */}
        <div style={{ fontSize: 10, color: '#666', whiteSpace: 'nowrap' }}>
          {idx + 1} / {NOTES_CATALOGUE.length}
        </div>
      </div>

      {/* ── Contenu de la note ── */}
      <NoteRenderer
        noteId={currentNote}
        data={data}
        entite={activeEntity}
        periode={periode}
      />
    </div>
  );
}

// Export de la fonction setNote pour usage externe (double-clic)
export { noteIdFromNumber };