import React, { useState, useEffect } from 'react';
import { 
  FiArrowLeft, 
  FiEdit, 
  FiTrash2, 
  FiCheck, 
  FiX,
  FiDollarSign,
  FiBriefcase,
  FiShoppingCart,
  FiTrendingUp,
  FiBook,
  FiInfo,
  FiRefreshCw
} from "react-icons/fi";
import { useParams, useNavigate } from 'react-router-dom';
import { apiClient } from './services';

export default function Show() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [journal, setJournal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadJournal();
  }, [id]);

  const loadJournal = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiClient.get(`/compta/journals/${id}/`);
      console.log('Données journal API:', response.data);
      setJournal(response.data);
      
    } catch (err) {
      console.error('Erreur API:', err);
      if (err.response?.status === 404) {
        setError('Journal non trouvé');
      } else {
        setError(`Erreur: ${err.response?.data?.detail || err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!journal) return;
    
    if (!window.confirm(`Supprimer "${journal.name}" ?`)) {
      return;
    }
    
    setDeleting(true);
    try {
      await apiClient.delete(`/compta/journals/${id}/`);
      navigate('/comptabilite/journaux');
    } catch (err) {
      setError('Erreur lors de la suppression');
    } finally {
      setDeleting(false);
    }
  };

  // Déterminer l'icône selon le type
  const getJournalIcon = () => {
    const typeCode = journal?.type?.code || journal?.type_code || '';
    
    switch (typeCode) {
      case 'BAN': return FiDollarSign;
      case 'CAI': return FiDollarSign;
      case 'VEN': return FiTrendingUp;
      case 'ACH': return FiShoppingCart;
      default: return FiBriefcase;
    }
  };

  // Chargement
  if (loading) {
    return (
      <div className="p-8 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-3 border-violet-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  // Erreur
  if (error) {
    return (
      <div className="p-8 min-h-screen flex items-center justify-center">
        <div className="max-w-md text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FiX className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-2">Erreur</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => navigate('/comptabilite/journaux')}
            className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 font-medium"
          >
            Retour aux journaux
          </button>
        </div>
      </div>
    );
  }

  // Journal non trouvé
  if (!journal) {
    return (
      <div className="p-8 min-h-screen flex items-center justify-center">
        <div className="max-w-md text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FiInfo className="w-8 h-8 text-gray-400" />
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-2">Journal non trouvé</h2>
          <p className="text-gray-600 mb-4">Le journal demandé n'existe pas.</p>
          <button
            onClick={() => navigate('/comptabilite/journaux')}
            className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 font-medium"
          >
            Retour à la liste
          </button>
        </div>
      </div>
    );
  }

  const JournalIcon = getJournalIcon();
  const typeName = journal.type?.name || journal.type_name || 'Non spécifié';
  const typeCode = journal.type?.code || journal.type_code || '';
  const companyName = journal.company?.raison_sociale || 
                     journal.company?.nom || 
                     journal.company?.name || 
                     journal.company_name || 
                     '';
  const accountCode = journal.default_account?.code || '';
  const accountName = journal.default_account?.name || journal.default_account_name || '';

  return (
    <div className="p-4 min-h-screen">
      <div className="max-w-6xl mx-auto">
        {/* En-tête */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/comptabilite/journaux')}
            className="inline-flex items-center gap-1.5 text-gray-600 hover:text-gray-900 mb-3 text-sm"
          >
            <FiArrowLeft size={14} />
            Retour aux journaux
          </button>
          
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-3 bg-gray-100 rounded-lg">
                <JournalIcon className="w-6 h-6 text-gray-700" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-gray-900">
                  {journal.name || 'Sans nom'}
                </h1>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs font-mono rounded">
                    {journal.code || '---'}
                  </span>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    journal.active 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {journal.active ? 'Actif' : 'Inactif'}
                  </span>
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                    {typeName}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={loadJournal}
                className="p-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
                title="Actualiser"
              >
                <FiRefreshCw size={16} />
              </button>
              <button
                onClick={() => navigate(`/comptabilite/journaux/${id}/edit`)}
                className="px-3 py-2 bg-violet-600 text-white rounded hover:bg-violet-700 text-sm font-medium flex items-center gap-1"
              >
                <FiEdit size={14} />
                Modifier
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-3 py-2 border border-red-300 text-red-700 hover:bg-red-50 rounded text-sm font-medium flex items-center gap-1"
              >
                <FiTrash2 size={14} />
                Supprimer
              </button>
            </div>
          </div>
        </div>

        {/* Contenu */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Informations principales */}
          <div className="lg:col-span-2 space-y-4">
            {/* Carte info */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Informations</h2>
              
              <div className="space-y-3">
                {/* Code */}
                <div>
                  <div className="text-xs text-gray-500 mb-1">Code</div>
                  <div className="font-medium">{journal.code || '—'}</div>
                </div>
                
                {/* Type */}
                <div>
                  <div className="text-xs text-gray-500 mb-1">Type</div>
                  <div className="flex items-center gap-2">
                    <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-sm">
                      {typeCode} {typeName && `- ${typeName}`}
                    </span>
                  </div>
                </div>
                
                {/* Entreprise */}
                {companyName && (
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Entreprise</div>
                    <div className="font-medium">{companyName}</div>
                  </div>
                )}
                
                {/* Statut */}
                <div>
                  <div className="text-xs text-gray-500 mb-1">Statut</div>
                  <div className="flex items-center gap-2">
                    {journal.active ? (
                      <span className="inline-flex items-center text-green-700">
                        <FiCheck className="mr-1" size={14} />
                        Actif
                      </span>
                    ) : (
                      <span className="inline-flex items-center text-gray-700">
                        <FiX className="mr-1" size={14} />
                        Inactif
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Compte par défaut */}
            {(accountCode || accountName) && (
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <FiBook size={18} />
                  Compte par défaut
                </h2>
                
                <div className="bg-gray-50 rounded p-3">
                  {accountCode && (
                    <div className="mb-1">
                      <div className="text-xs text-gray-500">Code</div>
                      <div className="font-mono font-semibold text-violet-700">{accountCode}</div>
                    </div>
                  )}
                  {accountName && (
                    <div>
                      <div className="text-xs text-gray-500">Nom</div>
                      <div className="font-medium">{accountName}</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Notes */}
            {journal.note && (
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <h2 className="text-lg font-semibold text-gray-900 mb-3">Notes</h2>
                <div className="bg-gray-50 rounded p-3">
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{journal.note}</p>
                </div>
              </div>
            )}

            {/* Pour debug : afficher les données brutes */}
            <details className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
              <summary className="p-3 text-sm font-medium text-gray-700 cursor-pointer">
                Voir les données brutes (debug)
              </summary>
              <pre className="p-3 text-xs bg-white overflow-auto max-h-60">
                {JSON.stringify(journal, null, 2)}
              </pre>
            </details>
          </div>

          {/* Actions */}
          <div className="space-y-4">
            {/* Actions rapides */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Actions</h2>
              <div className="space-y-2">
                <button
                  onClick={() => navigate(`/comptabilite/ecritures/create?journal=${id}`)}
                  className="w-full px-3 py-2 bg-violet-600 text-white rounded hover:bg-violet-700 text-sm font-medium text-center"
                >
                  Nouvelle écriture
                </button>
                <button
                  onClick={() => navigate(`/comptabilite/journaux/${id}/edit`)}
                  className="w-full px-3 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 rounded text-sm font-medium text-center"
                >
                  Modifier
                </button>
              </div>
            </div>

            {/* Métadonnées */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Métadonnées</h2>
              <div className="space-y-2">
                <div>
                  <div className="text-xs text-gray-500">ID</div>
                  <div className="text-sm font-mono">{journal.id}</div>
                </div>
                
                {/* Dates si elles existent */}
                {journal.created_at && (
                  <div>
                    <div className="text-xs text-gray-500">Créé le</div>
                    <div className="text-sm">{new Date(journal.created_at).toLocaleDateString('fr-FR')}</div>
                  </div>
                )}
                
                {journal.updated_at && (
                  <div>
                    <div className="text-xs text-gray-500">Modifié le</div>
                    <div className="text-sm">{new Date(journal.updated_at).toLocaleDateString('fr-FR')}</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Pied de page */}
        <div className="mt-6 pt-4 border-t border-gray-200 text-center text-xs text-gray-500">
          <div>Journal ID: {journal.id}</div>
        </div>
      </div>
    </div>
  );
}