import React, { useState, useEffect } from 'react';
import { FiArrowLeft } from "react-icons/fi";
import { useParams } from 'react-router-dom';
import JournalForm from './components/JournalForm';
import { apiClient } from './services'; // <-- Changé

export default function Edit() { // <-- Nom corrigé
  const { id } = useParams();
  const [journal, setJournal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
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

  const handleSubmit = async (formData) => {
    setSubmitLoading(true);
    setError(null);
    
    try {
      await apiClient.put(`/compta/journals/${id}/`, formData);
      window.location.href = `/comptabilite/journaux/${id}`; // <-- URL corrigée
    } catch (err) {
      setError(err.message || 'Erreur lors de la mise à jour');
      setSubmitLoading(false);
    }
  };

  if (loading) return <div>Chargement...</div>;
  if (error) return <div>{error}</div>;
  if (!journal) return <div>Journal non trouvé</div>;

  return (
    <div className="p-4 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        {/* En-tête */}
        <div className="mb-6">
          <button
            onClick={() => window.location.href = `/comptabilite/journaux/${id}`} // <-- URL corrigée
            className="inline-flex items-center gap-1 text-gray-600 hover:text-gray-900 mb-3"
          >
            <FiArrowLeft size={14} />
            Retour au journal
          </button>
          
          <h1 className="text-2xl font-bold text-gray-900">Modifier le journal comptable</h1>
          <p className="text-gray-600 mt-1">
            Modifiez les informations du journal {journal.name}
          </p>
        </div>

        {/* Formulaire */}
        <JournalForm
          initialData={journal}
          onSubmit={handleSubmit}
          loading={submitLoading}
          error={error}
          onCancel={() => window.location.href = `/comptabilite/journaux/${id}`} // <-- URL corrigée
        />
      </div>
    </div>
  );
}