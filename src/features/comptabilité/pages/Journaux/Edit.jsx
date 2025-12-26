import React, { useState, useEffect } from 'react';
import { FiArrowLeft, FiSave, FiX } from "react-icons/fi";
import { useParams, useNavigate } from 'react-router-dom';
import { apiClient } from "./services";

export default function Edit() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    type: '',
    company: '',
    default_account: '',
    note: '',
    active: true
  });
  
  const [journalTypes, setJournalTypes] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Charger le journal à éditer
      const journalRes = await apiClient.get(`/compta/journals/${id}/`);
      
      // VÉRIFICATION CRITIQUE
      if (!journalRes.data) {
        throw new Error('Aucune donnée reçue du serveur');
      }
      
      const journal = journalRes.data;
      
      console.log('Journal à éditer:', journal); // Pour debug
      
      // Pré-remplir AVEC CE QUI EXISTE
      setFormData({
        code: journal.code || '',
        name: journal.name || '',
        type: journal.type?.id || journal.type || '',
        company: journal.company?.id || journal.company || '',
        default_account: journal.default_account?.id || journal.default_account || '',
        note: journal.note || '',
        active: journal.active !== false
      });

      // Charger les options disponibles
      try {
        const typesRes = await apiClient.get('/compta/journal-types/');
        setJournalTypes(typesRes.data || []);
      } catch (err) {
        console.log('Types non chargés:', err);
        setJournalTypes([]);
      }

      try {
        const companiesRes = await apiClient.get('/entites/');
        setCompanies(companiesRes.data || []);
      } catch (err) {
        console.log('Entreprises non chargées:', err);
        setCompanies([]);
      }

      try {
        const accountsRes = await apiClient.get('/compta/comptes/');
        setAccounts(accountsRes.data || []);
      } catch (err) {
        console.log('Comptes non chargés:', err);
        setAccounts([]);
      }

    } catch (err) {
      console.error('Erreur détaillée:', err);
      console.error('Erreur réponse:', err.response);
      
      if (err.response?.status === 404) {
        setError('Journal non trouvé');
      } else if (err.message === 'Aucune donnée reçue du serveur') {
        setError('Le serveur n\'a pas retourné de données');
      } else {
        setError(`Erreur de chargement: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitLoading(true);
    setError(null);

    try {
      // Préparer les données - SEULEMENT CE QUI EST SAISI
      const submitData = {
        code: formData.code.trim(),
        name: formData.name.trim(),
        note: formData.note.trim(),
        active: formData.active
      };

      // Ajouter seulement si renseigné
      if (formData.type) submitData.type = parseInt(formData.type);
      if (formData.company) submitData.company = parseInt(formData.company);
      if (formData.default_account) submitData.default_account = parseInt(formData.default_account);

      console.log('Données envoyées à l\'API:', submitData);
      
      await apiClient.put(`/compta/journals/${id}/`, submitData);
      navigate(`/comptabilite/journaux/${id}`);
      
    } catch (err) {
      console.error('Erreur mise à jour:', err);
      console.error('Détails erreur:', err.response?.data);
      
      setError(err.response?.data?.detail || err.response?.data?.message || 'Erreur lors de la mise à jour');
    } finally {
      setSubmitLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-12 h-12 border-3 border-violet-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  if (error?.includes('non trouvé') || error?.includes('Aucune donnée')) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md">
          <h2 className="text-lg font-bold text-gray-900 mb-2">Journal introuvable</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <div className="space-y-2">
            <button
              onClick={() => navigate('/comptabilite/journaux')}
              className="w-full px-4 py-2 bg-violet-600 text-white rounded hover:bg-violet-700"
            >
              Retour à la liste
            </button>
            <button
              onClick={loadData}
              className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
            >
              Réessayer
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 min-h-screen">
      <div className="max-w-4xl mx-auto">
        {/* En-tête */}
        <div className="mb-6">
          <button
            onClick={() => navigate(`/comptabilite/journaux/${id}`)}
            className="inline-flex items-center gap-1.5 text-gray-600 hover:text-gray-900 mb-3 text-sm"
          >
            <FiArrowLeft size={14} />
            Retour
          </button>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-gray-900">Modifier le journal</h1>
              <p className="text-gray-600 mt-1">Modifiez les informations</p>
            </div>
            <div>
              <button
                onClick={() => navigate(`/comptabilite/journaux/${id}`)}
                className="px-3 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50 flex items-center gap-1.5 text-sm"
              >
                <FiX size={14} />
                Annuler
              </button>
            </div>
          </div>
        </div>

        {/* Erreur */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-800">
            <div className="flex items-start gap-2">
              <span className="font-medium">Erreur :</span>
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Formulaire */}
        <div className="bg-white rounded border border-gray-200">
          <form onSubmit={handleSubmit} className="p-4 md:p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              {/* Code */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Code *
                </label>
                <input
                  type="text"
                  name="code"
                  value={formData.code}
                  onChange={handleChange}
                  required
                  maxLength="8"
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-violet-500 text-sm"
                  placeholder="BAN, CAI, VEN..."
                />
              </div>

              {/* Nom */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nom *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  maxLength="64"
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-violet-500 text-sm"
                />
              </div>

              {/* Type */}
              {journalTypes.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Type *
                  </label>
                  <select
                    name="type"
                    value={formData.type}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-violet-500 text-sm bg-white"
                  >
                    <option value="">Sélectionnez</option>
                    {journalTypes.map(type => (
                      <option key={type.id} value={type.id}>
                        {type.code} - {type.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Entreprise */}
              {companies.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Entreprise
                  </label>
                  <select
                    name="company"
                    value={formData.company}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-violet-500 text-sm bg-white"
                  >
                    <option value="">Sélectionnez</option>
                    {companies.map(company => (
                      <option key={company.id} value={company.id}>
                        {company.raison_sociale || company.nom || `Entreprise ${company.id}`}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Compte par défaut */}
              {accounts.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Compte par défaut
                  </label>
                  <select
                    name="default_account"
                    value={formData.default_account}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-violet-500 text-sm bg-white"
                  >
                    <option value="">Sélectionnez</option>
                    {accounts.map(account => (
                      <option key={account.id} value={account.id}>
                        {account.code} - {account.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Statut */}
              <div className="flex items-center">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    name="active"
                    checked={formData.active}
                    onChange={handleChange}
                    className="w-4 h-4 text-violet-600 rounded focus:ring-1 focus:ring-violet-500 border-gray-300"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Actif
                  </span>
                </label>
              </div>

              {/* Note */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Note
                </label>
                <textarea
                  name="note"
                  value={formData.note}
                  onChange={handleChange}
                  rows="2"
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-violet-500 text-sm"
                />
              </div>
            </div>

            {/* Boutons */}
            <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={() => navigate(`/comptabilite/journaux/${id}`)}
                className="px-3 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50 font-medium text-sm"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={submitLoading}
                className="px-3 py-2 bg-violet-600 text-white rounded hover:bg-violet-700 font-medium text-sm flex items-center gap-1.5 disabled:opacity-50"
              >
                <FiSave size={14} />
                {submitLoading ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </form>
        </div>

        {/* Section debug */}
        <details className="mt-6 border border-gray-200 rounded">
          <summary className="p-2 text-sm text-gray-600 cursor-pointer">
            Debug: Voir les données du formulaire
          </summary>
          <div className="p-3 bg-gray-50">
            <pre className="text-xs overflow-auto max-h-60">
              {JSON.stringify({
                formData,
                journalTypesCount: journalTypes.length,
                companiesCount: companies.length,
                accountsCount: accounts.length
              }, null, 2)}
            </pre>
          </div>
        </details>
      </div>
    </div>
  );
}