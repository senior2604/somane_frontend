import React, { useState } from 'react';
import { FiArrowLeft, FiSave } from "react-icons/fi";
import { apiClient } from './services'; // <-- Import local
import JournalForm from './components/JournalForm';

export default function Create() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (formData) => {
    setLoading(true);
    setError(null);
    
    try {
      // Appel API
      const response = await apiClient.post('/compta/journals/', formData);
      
      // Redirection vers l'index
      window.location.href = '/comptabilite/journaux';
      
    } catch (err) {
      setError(err.message || 'Erreur lors de la création');
      setLoading(false);
    }
  };

  return (
    <div className="p-4 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        {/* En-tête */}
        <div className="mb-6">
          <button
            onClick={() => window.location.href = '/comptabilite/journaux'}
            className="inline-flex items-center gap-1 text-gray-600 hover:text-gray-900 mb-3"
          >
            <FiArrowLeft size={14} />
            Retour aux journaux
          </button>
          
          <h1 className="text-2xl font-bold text-gray-900">Créer un nouveau journal comptable</h1>
          <p className="text-gray-600 mt-1">
            Remplissez les informations ci-dessous pour créer un nouveau journal
          </p>
        </div>

        {/* Formulaire */}
        <JournalForm
          onSubmit={handleSubmit}
          loading={loading}
          error={error}
          onCancel={() => window.location.href = '/comptabilite/journaux'}
        />
      </div>
    </div>
  );
}