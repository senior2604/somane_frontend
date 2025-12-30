import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  FiArrowLeft, FiEdit, FiTrash2, FiCheck, FiX, FiCalendar,
  FiType, FiBriefcase, FiFileText, FiDollarSign, FiCreditCard,
  FiRefreshCw, FiPrinter, FiCopy
} from 'react-icons/fi';
import { piecesService } from "../../services";

export default function Show() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [piece, setPiece] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadPiece();
  }, [id]);

  const loadPiece = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await piecesService.getById(id);
      setPiece(data);
    } catch (err) {
      console.error('Erreur chargement pièce:', err);
      if (err.status === 404) {
        setError('Pièce comptable non trouvée');
      } else {
        setError(`Erreur: ${err.message || 'Inconnue'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!piece) return;
    
    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer la pièce "${piece.number || piece.label}" ?`)) {
      return;
    }
    
    setDeleting(true);
    try {
      await piecesService.delete(id);
      navigate('/comptabilite/pieces');
    } catch (err) {
      setError('Erreur lors de la suppression: ' + (err.message || 'Inconnue'));
    } finally {
      setDeleting(false);
    }
  };

  const handleValidate = async () => {
    if (!piece) return;
    
    try {
      await piecesService.validate(id);
      loadPiece(); // Recharger pour mettre à jour le statut
    } catch (err) {
      setError('Erreur lors de la validation: ' + err.message);
    }
  };

  const handleDuplicate = async () => {
    if (!piece) return;
    
    try {
      const newPiece = await piecesService.duplicate(id);
      navigate(`/comptabilite/pieces/${newPiece.id}/edit`);
    } catch (err) {
      setError('Erreur lors de la duplication: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div className="p-8 min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-white">
        <div className="text-center">
          <div className="w-12 h-12 border-3 border-violet-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement de la pièce...</p>
        </div>
      </div>
    );
  }

  if (error || !piece) {
    return (
      <div className="p-8 min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-white">
        <div className="max-w-md text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-red-100 to-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <FiX className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-2">Erreur</h2>
          <p className="text-gray-600 mb-4">{error || 'Pièce non trouvée'}</p>
          <div className="flex flex-col gap-2">
            <button
              onClick={loadPiece}
              className="px-4 py-2 bg-gradient-to-r from-gray-200 to-gray-100 text-gray-800 rounded-lg hover:from-gray-300 hover:to-gray-200 font-medium"
            >
              Réessayer
            </button>
            <button
              onClick={() => navigate('/comptabilite/pieces')}
              className="px-4 py-2 bg-gradient-to-r from-violet-600 to-violet-500 text-white rounded-lg hover:from-violet-700 hover:to-violet-600 font-medium"
            >
              Retour à la liste
            </button>
          </div>
        </div>
      </div>
    );
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'draft': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'posted': return 'bg-green-100 text-green-800 border-green-200';
      case 'canceled': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const totals = piece.lines?.reduce((acc, line) => ({
    debit: acc.debit + (line.debit || 0),
    credit: acc.credit + (line.credit || 0)
  }), { debit: 0, credit: 0 }) || { debit: 0, credit: 0 };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
      <div className="max-w-6xl mx-auto p-4">
        {/* En-tête */}
        <div className="mb-6">
          <Link
            to="/comptabilite/pieces"
            className="inline-flex items-center gap-1.5 text-gray-600 hover:text-gray-900 mb-3 text-sm hover:bg-gray-100 px-2 py-1 rounded transition-colors"
          >
            <FiArrowLeft size={14} />
            Retour à la liste
          </Link>
          
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div className="flex items-start gap-3">
              <div className="p-3 bg-gradient-to-br from-violet-600 to-violet-400 rounded-lg shadow-sm">
                <FiFileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-gray-900">
                  Pièce #{piece.number || `ID: ${piece.id}`}
                </h1>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <span className={`px-2 py-1 rounded text-xs font-medium border ${getStatusColor(piece.status)}`}>
                    {piece.status === 'draft' ? 'Brouillon' : 
                     piece.status === 'posted' ? 'Comptabilisé' : 
                     piece.status === 'canceled' ? 'Annulé' : 'Inconnu'}
                  </span>
                  <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs font-mono rounded border border-gray-200">
                    {piece.journal?.code || '---'}
                  </span>
                  {piece.date && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded border border-blue-200">
                      {new Date(piece.date).toLocaleDateString('fr-FR')}
                    </span>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={loadPiece}
                disabled={loading}
                className="p-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                title="Actualiser"
              >
                <FiRefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              </button>
              <button
                onClick={handleDuplicate}
                className="p-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50 transition-colors"
                title="Dupliquer"
              >
                <FiCopy size={16} />
              </button>
              <button
                onClick={() => window.print()}
                className="p-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50 transition-colors"
                title="Imprimer"
              >
                <FiPrinter size={16} />
              </button>
              {piece.status === 'draft' && (
                <button
                  onClick={handleValidate}
                  className="px-3 py-2 bg-gradient-to-r from-green-600 to-green-500 text-white rounded hover:from-green-700 hover:to-green-600 text-sm font-medium flex items-center gap-1"
                >
                  <FiCheck size={14} />
                  Valider
                </button>
              )}
              <Link
                to={`/comptabilite/pieces/${id}/edit`}
                className="px-3 py-2 bg-gradient-to-r from-violet-600 to-violet-500 text-white rounded hover:from-violet-700 hover:to-violet-600 text-sm font-medium flex items-center gap-1"
              >
                <FiEdit size={14} />
                Modifier
              </Link>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-3 py-2 border border-red-300 bg-gradient-to-r from-red-50 to-white text-red-700 rounded hover:from-red-100 hover:to-red-50 text-sm font-medium flex items-center gap-1 disabled:opacity-50"
              >
                <FiTrash2 size={14} />
                {deleting ? 'Suppression...' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>

        {/* Erreur */}
        {error && (
          <div className="mb-4 p-3 bg-gradient-to-r from-red-50 to-red-100 border-l-2 border-red-500 rounded-r">
            <div className="flex items-center gap-2">
              <div className="p-1 bg-red-100 rounded">
                <FiX className="text-red-600" size={12} />
              </div>
              <span className="text-red-800 text-sm font-medium">{error}</span>
            </div>
          </div>
        )}

        {/* Totaux */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-gradient-to-r from-green-50 to-green-100/30 rounded-lg border border-green-200 p-3">
            <div className="text-sm text-gray-600 mb-1">Total Débit</div>
            <div className="text-xl font-bold text-green-700">
              {totals.debit.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
            </div>
          </div>
          <div className="bg-gradient-to-r from-red-50 to-red-100/30 rounded-lg border border-red-200 p-3">
            <div className="text-sm text-gray-600 mb-1">Total Crédit</div>
            <div className="text-xl font-bold text-red-700">
              {totals.credit.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
            </div>
          </div>
        </div>

        {/* Informations principales */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Section principale */}
          <div className="lg:col-span-2 space-y-4">
            {/* Informations de la pièce */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
              <div className="bg-gradient-to-r from-gray-50 to-white border-b border-gray-200 p-3">
                <div className="flex items-center gap-1.5">
                  <div className="w-1 h-4 bg-gradient-to-b from-violet-600 to-violet-400 rounded"></div>
                  <h2 className="text-sm font-semibold text-gray-900">Informations de la pièce</h2>
                </div>
              </div>
              
              <div className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <div className="text-xs font-medium text-gray-500">Journal</div>
                    <div className="font-medium text-gray-900">
                      {piece.journal?.code} - {piece.journal?.name}
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="text-xs font-medium text-gray-500">Date</div>
                    <div className="font-medium text-gray-900">
                      {piece.date ? new Date(piece.date).toLocaleDateString('fr-FR') : '—'}
                    </div>
                  </div>
                  
                  <div className="space-y-1 md:col-span-2">
                    <div className="text-xs font-medium text-gray-500">Libellé</div>
                    <div className="font-medium text-gray-900 bg-gradient-to-r from-gray-50 to-white p-2 rounded border border-gray-200">
                      {piece.label || '—'}
                    </div>
                  </div>
                  
                  {piece.reference && (
                    <div className="space-y-1">
                      <div className="text-xs font-medium text-gray-500">Référence</div>
                      <div className="font-medium text-gray-900">{piece.reference}</div>
                    </div>
                  )}
                  
                  {piece.partner && (
                    <div className="space-y-1">
                      <div className="text-xs font-medium text-gray-500">Partenaire</div>
                      <div className="font-medium text-gray-900">{piece.partner.name}</div>
                    </div>
                  )}
                  
                  <div className="space-y-1 md:col-span-2">
                    <div className="text-xs font-medium text-gray-500">Statut</div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium border ${getStatusColor(piece.status)}`}>
                        {piece.status === 'draft' ? 'Brouillon' : 
                         piece.status === 'posted' ? 'Comptabilisé' : 
                         piece.status === 'canceled' ? 'Annulé' : 'Inconnu'}
                      </span>
                      {piece.user_created && (
                        <span className="text-xs text-gray-500">
                          Créé par: {piece.user_created}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Lignes d'écriture */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
              <div className="bg-gradient-to-r from-blue-50 to-blue-100/30 border-b border-blue-200 p-3">
                <div className="flex items-center gap-1.5">
                  <div className="w-1 h-4 bg-gradient-to-b from-blue-600 to-blue-400 rounded"></div>
                  <h2 className="text-sm font-semibold text-gray-900">Lignes d'écriture</h2>
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="p-3 text-left text-xs font-medium text-gray-500 uppercase">Compte</th>
                      <th className="p-3 text-left text-xs font-medium text-gray-500 uppercase">Libellé</th>
                      <th className="p-3 text-left text-xs font-medium text-gray-500 uppercase text-green-600">Débit</th>
                      <th className="p-3 text-left text-xs font-medium text-gray-500 uppercase text-red-600">Crédit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {piece.lines?.map((line, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="p-3">
                          <div className="font-medium text-gray-900">{line.account?.code}</div>
                          <div className="text-xs text-gray-500">{line.account?.name}</div>
                        </td>
                        <td className="p-3 text-sm text-gray-700">{line.label || '—'}</td>
                        <td className="p-3 text-sm font-medium text-green-600">
                          {line.debit ? line.debit.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €' : '—'}
                        </td>
                        <td className="p-3 text-sm font-medium text-red-600">
                          {line.credit ? line.credit.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €' : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50">
                    <tr>
                      <td colSpan="2" className="p-3 text-right font-medium">Totaux :</td>
                      <td className="p-3 font-bold text-green-700 border-t">
                        {totals.debit.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                      </td>
                      <td className="p-3 font-bold text-red-700 border-t">
                        {totals.credit.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                      </td>
                    </tr>
                    <tr>
                      <td colSpan="2" className="p-3 text-right font-medium">Différence :</td>
                      <td colSpan="2" className={`p-3 font-bold ${Math.abs(totals.debit - totals.credit) < 0.01 ? 'text-green-700' : 'text-red-700'}`}>
                        {Math.abs(totals.debit - totals.credit).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                        {Math.abs(totals.debit - totals.credit) < 0.01 ? ' (Équilibré)' : ' (Non équilibré)'}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>

          {/* Section latérale */}
          <div className="space-y-4">
            {/* Actions */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
              <div className="bg-gradient-to-r from-violet-50 to-violet-100/30 border-b border-violet-200 p-3">
                <div className="flex items-center gap-1.5">
                  <div className="w-1 h-4 bg-gradient-to-b from-violet-600 to-violet-400 rounded"></div>
                  <h2 className="text-sm font-semibold text-gray-900">Actions</h2>
                </div>
              </div>
              
              <div className="p-3">
                <div className="space-y-2">
                  <Link
                    to={`/comptabilite/pieces/${id}/edit`}
                    className="w-full px-3 py-2 bg-gradient-to-r from-violet-600 to-violet-500 text-white rounded hover:from-violet-700 hover:to-violet-600 text-sm font-medium text-center block"
                  >
                    Modifier
                  </Link>
                  <button
                    onClick={handleDuplicate}
                    className="w-full px-3 py-2 border border-gray-300 bg-gradient-to-r from-gray-50 to-white text-gray-700 rounded hover:from-gray-100 hover:to-gray-50 text-sm font-medium"
                  >
                    Dupliquer
                  </button>
                  {piece.status === 'draft' && (
                    <button
                      onClick={handleValidate}
                      className="w-full px-3 py-2 border border-green-300 bg-gradient-to-r from-green-50 to-white text-green-700 rounded hover:from-green-100 hover:to-green-50 text-sm font-medium"
                    >
                      Valider
                    </button>
                  )}
                  <button
                    onClick={() => window.print()}
                    className="w-full px-3 py-2 border border-gray-300 bg-gradient-to-r from-gray-50 to-white text-gray-700 rounded hover:from-gray-100 hover:to-gray-50 text-sm font-medium"
                  >
                    Imprimer
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="w-full px-3 py-2 border border-red-300 bg-gradient-to-r from-red-50 to-white text-red-700 rounded hover:from-red-100 hover:to-red-50 text-sm font-medium disabled:opacity-50"
                  >
                    {deleting ? 'Suppression...' : 'Supprimer'}
                  </button>
                </div>
              </div>
            </div>

            {/* Métadonnées */}
            <div className="bg-gradient-to-br from-gray-50 to-white rounded-lg border border-gray-200 shadow-sm p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <FiFileText className="text-gray-400" size={14} />
                <h3 className="text-sm font-semibold text-gray-900">Métadonnées</h3>
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-500">ID :</span>
                  <span className="font-medium">{piece.id}</span>
                </div>
                {piece.created_at && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Créé le :</span>
                    <span className="font-medium">
                      {new Date(piece.created_at).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                )}
                {piece.updated_at && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Modifié le :</span>
                    <span className="font-medium">
                      {new Date(piece.updated_at).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                )}
                <div className="mt-2 pt-2 border-t border-gray-200">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Affiché à</span>
                    <span className="font-medium">{new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}