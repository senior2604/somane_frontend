import React, { useState, useEffect } from 'react';
import { FiArrowLeft, FiEdit, FiTrash2 } from "react-icons/fi";
import { useParams } from 'react-router-dom';
import { apiClient } from './services'; // <-- CORRIGÉ

export default function Show() { // <-- Nom corrigé
  const { id } = useParams();
  const [journal, setJournal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadJournal();
  }, [id]);

  const loadJournal = async () => {
    try {
      const response = await apiClient.get(`/compta/journals/${id}/`);
      setJournal(response.data);
    } catch (err) {
      setError('Impossible de charger le journal');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce journal ?')) {
      await apiClient.delete(`/compta/journals/${id}/`);
      window.location.href = '/comptabilite/journaux'; // <-- URL corrigée
    }
  };

  if (loading) return <div>Chargement...</div>;
  if (error) return <div>{error}</div>;
  if (!journal) return <div>Journal non trouvé</div>;

  return (
    <div className="p-4 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        {/* En-tête avec actions */}
        <div className="mb-6">
          <button
            onClick={() => window.location.href = '/comptabilite/journaux'} // <-- URL corrigée
            className="inline-flex items-center gap-1 text-gray-600 hover:text-gray-900 mb-3"
          >
            <FiArrowLeft size={14} />
            Retour aux journaux
          </button>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{journal.name}</h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm font-mono text-gray-500">{journal.code}</span>
                <span className={`px-2 py-0.5 text-xs rounded-full ${
                  journal.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {journal.active ? 'Actif' : 'Inactif'}
                </span>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => window.location.href = `/comptabilite/journaux/${id}/edit`} // <-- URL corrigée
                className="px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-1 text-sm"
              >
                <FiEdit size={14} />
                Modifier
              </button>
              <button
                onClick={handleDelete}
                className="px-3 py-1.5 bg-red-600 text-white rounded hover:bg-red-700 flex items-center gap-1 text-sm"
              >
                <FiTrash2 size={14} />
                Supprimer
              </button>
            </div>
          </div>
        </div>

        {/* Détails du journal */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          {/* Contenu des détails... */}
          <pre>{JSON.stringify(journal, null, 2)}</pre>
        </div>
      </div>
    </div>
  );
}