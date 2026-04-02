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
  FiFileText,
  FiPlus
} from "react-icons/fi";
import { useParams, useNavigate } from 'react-router-dom';
import { journauxService } from "../../services";

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
      const journalData = await journauxService.getById(id);
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
      await journauxService.delete(id);
      navigate('/comptabilite/journaux');
    } catch (err) {
      setError('Erreur lors de la suppression: ' + (err.message || 'Inconnue'));
    } finally {
      setDeleting(false);
    }
  };

  const handleCancel = () => {
    navigate('/comptabilite/journaux');
  };

  const handleEdit = () => {
    navigate(`/comptabilite/journaux/${id}/edit`);
  };

  const handleNewJournal = () => {
    navigate('/comptabilite/journaux/create');
  };

  const handleGoToList = () => {
    navigate('/comptabilite/journaux');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-7xl mx-auto bg-white border border-gray-300">
          <div className="border-b border-gray-300 px-4 py-3">
            <div className="text-lg font-bold text-gray-900">Chargement...</div>
          </div>
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p className="text-sm text-gray-600">Chargement des informations du journal...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !journal) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-7xl mx-auto bg-white border border-gray-300">
          <div className="border-b border-gray-300 px-4 py-3">
            <div className="text-lg font-bold text-gray-900">Journal non trouvé</div>
          </div>
          <div className="p-8">
            <div className="bg-red-50 border border-red-200 rounded p-4 text-center">
              <FiX className="text-red-600 mx-auto mb-2" size={24} />
              <p className="text-red-800 font-medium mb-3">
                {error || 'Le journal demandé n\'existe pas.'}
              </p>
              <button
                onClick={loadJournal}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 mr-2"
              >
                Réessayer
              </button>
              <button
                onClick={handleCancel}
                className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
              >
                Retour aux journaux
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const journalName = journal.name || 'Sans nom';
  const journalCode = journal.code || '---';
  const typeName = journal.type?.name || journal.type_name || 'Non spécifié';
  const typeCode = journal.type?.code || journal.type_code || '';
  const accountCode = journal.default_account?.code || '';
  const accountName = journal.default_account?.name || '';
  const bankAccountName = journal.bank_account?.banque?.nom || journal.bank_account?.nom || '';
  const bankAccountNumber = journal.bank_account?.numero_compte || '';

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto bg-white border border-gray-300">
        {/* Barre d'en-tête - Ligne 1 */}
        <div className="border-b border-gray-300 px-4 py-3">
          {/* Première ligne : Titre et boutons */}
          <div className="flex items-center justify-between mb-2">
            {/* Partie gauche */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleNewJournal}
                className="px-3 py-1.5 border border-gray-300 text-gray-700 text-xs hover:bg-gray-50 flex items-center gap-1"
              >
                <FiPlus size={12} />
                <span>Nouveau</span>
              </button>
              <div 
                className="text-lg font-bold text-gray-900 cursor-pointer hover:text-purple-600"
                onClick={handleGoToList}
              >
                Journaux comptables
              </div>
            </div>
            {/* Partie droite */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleCancel}
                className="px-3 py-1.5 border border-gray-300 text-gray-700 text-xs hover:bg-gray-50 flex items-center gap-1"
              >
                <FiX size={12} />
                <span>Annuler</span>
              </button>
              <button
                onClick={handleEdit}
                className="px-3 py-1.5 bg-purple-600 text-white text-xs flex items-center gap-1 hover:bg-purple-700"
              >
                <FiEdit size={12} />
                <span>Modifier</span>
              </button>
            </div>
          </div>
          
          {/* Deuxième ligne : État et Code */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-700 font-medium">État:</span>
              <span className={`px-2 py-0.5 text-xs font-medium ${
                journal.active 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-gray-100 text-gray-600'
              }`}>
                {journal.active ? 'Actif' : 'Inactif'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-700 font-medium">Code:</span>
              <span className="text-sm font-mono font-bold text-purple-600">
                {journalCode}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-700 font-medium">Type:</span>
              <span className="text-sm font-medium">
                {typeName} ({typeCode})
              </span>
            </div>
          </div>
        </div>

        {/* Nouvelle ligne de boutons - Ligne 2 */}
        <div className="border-b border-gray-300 px-4 py-3 flex items-center justify-between">
          {/* Partie gauche : Badge d'état */}
          <div>
            <span className="text-sm text-gray-700 font-medium">Statut du journal:</span>
          </div>
          {/* Partie droite : Badges d'état (non cliquables) */}
          <div className="flex items-center gap-2">
            <div className={`px-3 py-1.5 text-xs font-medium border ${
              journal.active
                ? 'bg-purple-100 text-purple-700 border-purple-300'
                : 'bg-gray-100 text-gray-500 border-gray-300'
            }`}>
              Actif
            </div>
            <div className={`px-3 py-1.5 text-xs font-medium border ${
              !journal.active
                ? 'bg-purple-100 text-purple-700 border-purple-300'
                : 'bg-gray-100 text-gray-500 border-gray-300'
            }`}>
              Inactif
            </div>
          </div>
        </div>

        {/* Informations du journal */}
        <div className="px-4 py-3">
          <div className="text-lg font-bold text-gray-900 mb-4">Détails du journal</div>
          
          <div className="space-y-3">
            {/* Ligne 1 : Code et Type côte à côte */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
              {/* Code */}
              <div className="flex items-center min-h-[26px]">
                <label className="text-xs text-gray-700 min-w-[140px] font-medium">
                  Code
                </label>
                <div className="flex-1 px-2 py-1 bg-gray-50 border border-gray-300 text-xs ml-2 font-mono font-semibold">
                  {journalCode}
                </div>
              </div>

              {/* Type */}
              <div className="flex items-center min-h-[26px]">
                <label className="text-xs text-gray-700 min-w-[140px] font-medium">
                  Type
                </label>
                <div className="flex-1 px-2 py-1 bg-gray-50 border border-gray-300 text-xs ml-2 font-medium">
                  {typeName} ({typeCode})
                </div>
              </div>
            </div>

            {/* Ligne 2 : Nom seul sur toute la largeur */}
            <div className="flex items-center min-h-[26px]">
              <label className="text-xs text-gray-700 min-w-[140px] font-medium">
                Nom
              </label>
              <div className="flex-1 px-2 py-1 bg-gray-50 border border-gray-300 text-xs ml-2 font-medium">
                {journalName}
              </div>
            </div>

            {/* Ligne 3 : Compte par défaut et Compte bancaire côte à côte */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
              {/* Compte par défaut */}
              <div className="flex items-center min-h-[26px]">
                <label className="text-xs text-gray-700 min-w-[140px] font-medium">
                  Compte par défaut
                </label>
                <div className="flex-1 px-2 py-1 bg-gray-50 border border-gray-300 text-xs ml-2">
                  {accountCode || accountName ? (
                    <span className="font-mono">{accountCode} - {accountName}</span>
                  ) : (
                    <span className="text-gray-400 italic">Non défini</span>
                  )}
                </div>
              </div>

              {/* Compte bancaire */}
              <div className="flex items-center min-h-[26px]">
                <label className="text-xs text-gray-700 min-w-[140px] font-medium">
                  Compte bancaire
                </label>
                <div className="flex-1 px-2 py-1 bg-gray-50 border border-gray-300 text-xs ml-2">
                  {bankAccountName || bankAccountNumber ? (
                    <span>
                      {bankAccountName} {bankAccountNumber && `- ${bankAccountNumber}`}
                    </span>
                  ) : (
                    <span className="text-gray-400 italic">Non défini</span>
                  )}
                </div>
              </div>
            </div>

            {/* Ligne 4 : Notes */}
            <div className="flex items-start min-h-[48px]">
              <label className="text-xs text-gray-700 min-w-[140px] font-medium pt-1">
                Notes
              </label>
              <div className="flex-1 px-2 py-1 bg-gray-50 border border-gray-300 text-xs ml-2">
                {journal.note ? (
                  <p className="whitespace-pre-wrap">{journal.note}</p>
                ) : (
                  <span className="text-gray-400 italic">Aucune note</span>
                )}
              </div>
            </div>

            {/* Ligne 5 : Statut */}
            <div className="flex items-center pt-3 border-t border-gray-200 min-h-[26px]">
              <label className="text-xs text-gray-700 min-w-[140px] font-medium">
                Statut
              </label>
              <div className="flex items-center gap-2 ml-2">
                <input
                  type="checkbox"
                  id="active"
                  checked={journal.active}
                  disabled
                  className="w-3.5 h-3.5 text-purple-600 rounded focus:ring-purple-500 bg-gray-100 cursor-not-allowed"
                />
                <label htmlFor="active" className="text-xs font-medium text-gray-700">
                  Journal actif
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Messages d'erreur */}
        {error && (
          <div className="px-4 py-3 text-sm border-t border-gray-300 bg-red-50 text-red-700">
            <div className="flex items-center gap-2">
              <FiX size={14} />
              <span>{error}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}