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
  FiRefreshCw,
  FiFileText
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
      const journalData = await apiClient.get(`/compta/journals/${id}/`);
      setJournal(journalData);
    } catch (err) {
      if (err.status === 404) {
        setError('Journal non trouvé');
      } else if (err.status === 401) {
        setError('Accès non autorisé. Vérifiez votre connexion.');
      } else if (err.status === 403) {
        setError('Accès refusé. Permissions insuffisantes.');
      } else {
        setError(`Erreur: ${err.message || 'Inconnue'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!journal) return;
    
    const journalName = journal.name || journal.code || 'ce journal';
    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer "${journalName}" ?`)) {
      return;
    }
    
    setDeleting(true);
    try {
      await apiClient.delete(`/compta/journals/${id}/`);
      navigate('/comptabilite/journaux');
    } catch (err) {
      setError('Erreur lors de la suppression: ' + (err.message || 'Inconnue'));
    } finally {
      setDeleting(false);
    }
  };

  const getJournalIcon = () => {
    if (!journal) return FiBriefcase;
    
    const typeCode = journal.type?.code || journal.type_code || '';
    
    switch (typeCode.toUpperCase()) {
      case 'BAN':
      case 'CAI': return FiDollarSign;
      case 'VEN': return FiTrendingUp;
      case 'ACH': return FiShoppingCart;
      default: return FiBriefcase;
    }
  };

  const getJournalColor = () => {
    if (!journal) return 'from-gray-600 to-gray-400';
    
    const typeCode = journal.type?.code || journal.type_code || '';
    
    switch (typeCode.toUpperCase()) {
      case 'BAN':
      case 'CAI': return 'from-blue-600 to-blue-400';
      case 'VEN': return 'from-green-600 to-green-400';
      case 'ACH': return 'from-amber-600 to-amber-400';
      default: return 'from-violet-600 to-violet-400';
    }
  };

  if (loading) {
    return (
      <div className="p-8 min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-white">
        <div className="text-center">
          <div className="w-12 h-12 border-3 border-violet-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement du journal...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-white">
        <div className="max-w-md text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-red-100 to-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <FiX className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-2">Erreur</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <div className="flex flex-col gap-2">
            <button
              onClick={loadJournal}
              className="px-4 py-2 bg-gradient-to-r from-gray-200 to-gray-100 text-gray-800 rounded-lg hover:from-gray-300 hover:to-gray-200 font-medium transition-all"
            >
              Réessayer
            </button>
            <button
              onClick={() => navigate('/comptabilite/journaux')}
              className="px-4 py-2 bg-gradient-to-r from-violet-600 to-violet-500 text-white rounded-lg hover:from-violet-700 hover:to-violet-600 font-medium transition-all"
            >
              Retour aux journaux
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!journal) {
    return (
      <div className="p-8 min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-white">
        <div className="max-w-md text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <FiInfo className="w-8 h-8 text-gray-400" />
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-2">Journal non trouvé</h2>
          <p className="text-gray-600 mb-4">Le journal demandé n'existe pas.</p>
          <button
            onClick={() => navigate('/comptabilite/journaux')}
            className="px-4 py-2 bg-gradient-to-r from-violet-600 to-violet-500 text-white rounded-lg hover:from-violet-700 hover:to-violet-600 font-medium transition-all"
          >
            Retour à la liste
          </button>
        </div>
      </div>
    );
  }

  const JournalIcon = getJournalIcon();
  const journalColor = getJournalColor();
  const typeName = journal.type_name || 'Non spécifié';
  const typeCode = journal.code || '';
  const companyName = journal.company_name || '';
  const accountCode = journal.default_account?.code || '';
  const accountName = journal.default_account?.name || '';
  const journalName = journal.name || 'Sans nom';
  const journalCode = journal.code || '---';

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
      <div className="max-w-6xl mx-auto p-4">
        {/* En-tête */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/comptabilite/journaux')}
            className="inline-flex items-center gap-1.5 text-gray-600 hover:text-gray-900 mb-3 text-sm hover:bg-gray-100 px-2 py-1 rounded transition-colors"
          >
            <FiArrowLeft size={14} />
            Retour aux journaux
          </button>
          
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div className="flex items-start gap-3">
              <div className={`p-3 bg-gradient-to-br ${journalColor} rounded-lg shadow-sm`}>
                <JournalIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-gray-900">
                  {journalName}
                </h1>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <span className="px-2 py-1 bg-gradient-to-r from-gray-100 to-gray-50 text-gray-800 text-xs font-mono rounded border border-gray-200">
                    {journalCode}
                  </span>
                  <span className={`px-2 py-1 rounded text-xs font-medium border ${
                    journal.active 
                      ? 'bg-gradient-to-r from-green-100 to-green-50 text-green-800 border-green-200' 
                      : 'bg-gradient-to-r from-gray-100 to-gray-50 text-gray-800 border-gray-200'
                  }`}>
                    {journal.active ? 'Actif' : 'Inactif'}
                  </span>
                  <span className="px-2 py-1 bg-gradient-to-r from-blue-100 to-blue-50 text-blue-800 text-xs rounded border border-blue-200">
                    {typeName}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={loadJournal}
                disabled={loading}
                className="p-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                title="Actualiser"
              >
                <FiRefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              </button>
              <button
                onClick={() => navigate(`/comptabilite/journaux/${id}/edit`)}
                className="px-3 py-2 bg-gradient-to-r from-violet-600 to-violet-500 text-white rounded hover:from-violet-700 hover:to-violet-600 text-sm font-medium flex items-center gap-1 transition-all"
              >
                <FiEdit size={14} />
                Modifier
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-3 py-2 border border-red-300 bg-gradient-to-r from-red-50 to-white text-red-700 hover:from-red-100 hover:to-red-50 rounded text-sm font-medium flex items-center gap-1 disabled:opacity-50 transition-all"
              >
                <FiTrash2 size={14} />
                {deleting ? 'Suppression...' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>

        {/* Contenu */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Section principale - 2/3 de largeur */}
          <div className="lg:col-span-2 space-y-4">
            {/* Carte : Informations principales */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
              <div className="bg-gradient-to-r from-gray-50 to-white border-b border-gray-200 p-3">
                <div className="flex items-center gap-1.5">
                  <div className={`w-1 h-4 bg-gradient-to-b ${journalColor} rounded`}></div>
                  <h2 className="text-sm font-semibold text-gray-900">Informations du Journal</h2>
                </div>
              </div>
              
              <div className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Code */}
                  <div className="space-y-1">
                    <div className="text-xs font-medium text-gray-500">Code</div>
                    <div className="font-mono font-semibold text-gray-900 bg-gradient-to-r from-gray-50 to-white px-2 py-1 rounded border border-gray-200">
                      {journalCode}
                    </div>
                  </div>
                  
                  {/* Nom */}
                  <div className="space-y-1">
                    <div className="text-xs font-medium text-gray-500">Nom</div>
                    <div className="font-semibold text-gray-900 bg-gradient-to-r from-gray-50 to-white px-2 py-1 rounded border border-gray-200">
                      {journalName}
                    </div>
                  </div>
                  
                  {/* Type */}
                  <div className="space-y-1">
                    <div className="text-xs font-medium text-gray-500">Type</div>
                    <div className="inline-flex items-center gap-1.5">
                      <span className="px-2 py-1 bg-gradient-to-r from-blue-50 to-blue-100 text-blue-800 text-sm rounded border border-blue-200 font-medium">
                        {typeCode} {typeName && `- ${typeName}`}
                      </span>
                    </div>
                  </div>
                  
                  {/* Statut */}
                  <div className="space-y-1">
                    <div className="text-xs font-medium text-gray-500">Statut</div>
                    <div className="flex items-center gap-1.5">
                      {journal.active ? (
                        <span className="inline-flex items-center gap-1 text-green-700 font-medium">
                          <div className="w-2 h-2 bg-gradient-to-br from-green-500 to-green-400 rounded-full"></div>
                          Actif
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-gray-600 font-medium">
                          <div className="w-2 h-2 bg-gradient-to-br from-gray-400 to-gray-300 rounded-full"></div>
                          Inactif
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* Entreprise */}
                  {companyName && (
                    <div className="space-y-1 md:col-span-2">
                      <div className="text-xs font-medium text-gray-500">Entreprise</div>
                      <div className="font-semibold text-gray-900 bg-gradient-to-r from-green-50 to-green-100/30 px-2 py-1 rounded border border-green-200">
                        {companyName}
                      </div>
                    </div>
                  )}
                  
                  {/* Dates */}
                  <div className="space-y-1 md:col-span-2 grid grid-cols-2 gap-4">
                    {journal.created_at && (
                      <div className="space-y-1">
                        <div className="text-xs font-medium text-gray-500">Créé le</div>
                        <div className="text-sm text-gray-700 bg-gradient-to-r from-gray-50 to-white px-2 py-1 rounded border border-gray-200">
                          {new Date(journal.created_at).toLocaleDateString('fr-FR', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </div>
                      </div>
                    )}
                    
                    {journal.updated_at && (
                      <div className="space-y-1">
                        <div className="text-xs font-medium text-gray-500">Dernière modification</div>
                        <div className="text-sm text-gray-700 bg-gradient-to-r from-gray-50 to-white px-2 py-1 rounded border border-gray-200">
                          {new Date(journal.updated_at).toLocaleDateString('fr-FR', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Carte : Compte par défaut */}
            {(accountCode || accountName) && (
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                <div className="bg-gradient-to-r from-blue-50 to-blue-100/30 border-b border-blue-200 p-3">
                  <div className="flex items-center gap-1.5">
                    <div className="w-1 h-4 bg-gradient-to-b from-blue-600 to-blue-400 rounded"></div>
                    <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
                      <FiBook size={14} />
                      Compte par défaut
                    </h2>
                  </div>
                </div>
                
                <div className="p-4">
                  <div className="bg-gradient-to-r from-blue-50 to-blue-100/20 rounded border border-blue-200 p-3">
                    {accountCode && (
                      <div className="mb-2">
                        <div className="text-xs font-medium text-gray-500 mb-0.5">Code</div>
                        <div className="font-mono font-semibold text-blue-700">{accountCode}</div>
                      </div>
                    )}
                    {accountName && (
                      <div>
                        <div className="text-xs font-medium text-gray-500 mb-0.5">Nom</div>
                        <div className="font-medium text-gray-900">{accountName}</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Carte : Notes */}
            {journal.note && (
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                <div className="bg-gradient-to-r from-amber-50 to-amber-100/30 border-b border-amber-200 p-3">
                  <div className="flex items-center gap-1.5">
                    <div className="w-1 h-4 bg-gradient-to-b from-amber-600 to-amber-400 rounded"></div>
                    <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
                      <FiFileText size={14} />
                      Notes
                    </h2>
                  </div>
                </div>
                
                <div className="p-4">
                  <div className="bg-gradient-to-r from-amber-50 to-amber-100/20 rounded border border-amber-200 p-3">
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{journal.note}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Section latérale - 1/3 de largeur */}
          <div className="space-y-4">
            {/* Carte : Actions */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
              <div className="bg-gradient-to-r from-violet-50 to-violet-100/30 border-b border-violet-200 p-3">
                <div className="flex items-center gap-1.5">
                  <div className="w-1 h-4 bg-gradient-to-b from-violet-600 to-violet-400 rounded"></div>
                  <h2 className="text-sm font-semibold text-gray-900">Actions</h2>
                </div>
              </div>
              
              <div className="p-3">
                <div className="space-y-2">
                  <button
                    onClick={() => navigate(`/comptabilite/journaux/${id}/edit`)}
                    className="w-full px-3 py-2 bg-gradient-to-r from-violet-600 to-violet-500 text-white rounded hover:from-violet-700 hover:to-violet-600 text-sm font-medium transition-all"
                  >
                    Modifier
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="w-full px-3 py-2 border border-red-300 bg-gradient-to-r from-red-50 to-white text-red-700 rounded hover:from-red-100 hover:to-red-50 text-sm font-medium disabled:opacity-50 transition-all"
                  >
                    {deleting ? 'Suppression en cours...' : 'Supprimer'}
                  </button>
                </div>
              </div>
            </div>

            {/* Carte : Résumé */}
            <div className="bg-gradient-to-br from-gray-50 to-white rounded-lg border border-gray-200 shadow-sm p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <FiInfo className="text-gray-400" size={14} />
                <h3 className="text-sm font-semibold text-gray-900">Résumé</h3>
              </div>
              <p className="text-xs text-gray-600">
                Journal <span className="font-medium">{journalCode}</span> de type{' '}
                <span className="font-medium">{typeName}</span>.{' '}
                {journal.active ? 'Actuellement actif.' : 'Actuellement inactif.'}
              </p>
              <div className="mt-2 pt-2 border-t border-gray-200 text-xs text-gray-500">
                <div className="flex justify-between">
                  <span>Chargé à</span>
                  <span>{new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}