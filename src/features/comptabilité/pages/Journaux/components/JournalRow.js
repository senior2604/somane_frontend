import React from 'react';

export default function JournalRow({ journal, selected, onSelect }) {
  console.log('JournalRow rendering:', { journal, selected });
  
  return (
    <tr>
      <td className="px-4 py-3">
        <input
          type="checkbox"
          checked={selected}
          onChange={(e) => onSelect(e.target.checked)}
          className="w-4 h-4"
        />
        <span className="ml-2">{journal?.name || 'Sans nom'}</span>
      </td>
      <td className="px-4 py-3">{journal?.type?.name || '—'}</td>
      <td className="px-4 py-3">{journal?.company?.name || '—'}</td>
      <td className="px-4 py-3">
        <span className={`px-2 py-1 rounded text-xs ${journal?.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
          {journal?.active ? 'Actif' : 'Inactif'}
        </span>
      </td>
      <td className="px-4 py-3">
        <button className="text-blue-600 hover:text-blue-800 text-sm">
          Éditer
        </button>
      </td>
    </tr>
  );
}