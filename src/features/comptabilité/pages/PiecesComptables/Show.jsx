// features/comptabilité/pages/PiecesComptables/Show.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  FiEdit, FiTrash2, FiCheck, FiX, FiFileText,
  FiRefreshCw, FiPrinter, FiCopy, FiMoreVertical,
  FiAlertCircle, FiRotateCcw, FiPlus
} from 'react-icons/fi';
import { useEntity } from '../../../../context/EntityContext';
import { piecesService } from "../../services";

export default function Show() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { activeEntity } = useEntity();
  
  const [piece, setPiece] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [activeTab, setActiveTab] = useState('ecritures');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [actionInProgress, setActionInProgress] = useState(false);
  
  // États pour les référentiels
  const [partnersMap, setPartnersMap] = useState({});
  const [journalsMap, setJournalsMap] = useState({});
  const [devisesMap, setDevisesMap] = useState({});
  const [accountsMap, setAccountsMap] = useState({});

  useEffect(() => {
    if (!activeEntity) {
      setError('Veuillez sélectionner une entité pour voir la pièce comptable');
      setLoading(false);
    }
  }, [activeEntity]);

  useEffect(() => {
    if (id && activeEntity) {
      loadReferentials();
    }
  }, [id, activeEntity]);

  // Charger les référentiels d'abord
  const loadReferentials = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('📥 Chargement des référentiels...');
      
      const [
        journalsData,
        accountsData,
        partnersData,
        devisesData
      ] = await Promise.all([
        piecesService.getJournals(activeEntity.id),
        piecesService.getAccounts(activeEntity.id),
        piecesService.getPartners(activeEntity.id),
        piecesService.getDevises(activeEntity.id)
      ]);

      const normalizeData = (data) => {
        if (!data) return [];
        if (Array.isArray(data)) return data;
        if (Array.isArray(data.results)) return data.results;
        if (Array.isArray(data.data)) return data.data;
        return [];
      };

      const normalizedJournals = normalizeData(journalsData);
      const normalizedAccounts = normalizeData(accountsData);
      const normalizedPartners = normalizeData(partnersData);
      const normalizedDevises = normalizeData(devisesData);

      // Créer les maps
      const journalsObj = {};
      normalizedJournals.forEach(j => { journalsObj[j.id] = j; });
      setJournalsMap(journalsObj);

      const accountsObj = {};
      normalizedAccounts.forEach(a => { accountsObj[a.id] = a; });
      setAccountsMap(accountsObj);

      const partnersObj = {};
      normalizedPartners.forEach(p => {
        partnersObj[p.id] = {
          ...p,
          displayName: p.raison_sociale || 
                      (p.nom && p.prenom ? `${p.prenom} ${p.nom}` : p.nom) ||
                      p.name ||
                      'Partenaire sans nom'
        };
      });
      setPartnersMap(partnersObj);

      const devisesObj = {};
      normalizedDevises.forEach(d => { devisesObj[d.id] = d; });
      setDevisesMap(devisesObj);

      // Maintenant charger la pièce
      await loadPiece();
      
    } catch (err) {
      console.error('❌ Erreur chargement référentiels:', err);
      setError('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const loadPiece = async () => {
    try {
      console.log('📥 Chargement pièce:', id);
      const data = await piecesService.getById(id, activeEntity.id);
      console.log('✅ Pièce chargée:', data);
      setPiece(data);
    } catch (err) {
      console.error('❌ Erreur chargement pièce:', err);
      if (err.status === 404) {
        setError('Pièce comptable non trouvée');
      } else {
        setError(`Erreur: ${err.message || 'Inconnue'}`);
      }
    }
  };

  const handleDelete = async () => {
    if (!piece) return;
    setShowConfirmDialog(true);
  };

  const confirmDelete = async () => {
    setDeleting(true);
    setShowConfirmDialog(false);
    try {
      await piecesService.delete(id, activeEntity.id);
      navigate('/comptabilite/pieces');
    } catch (err) {
      setError('Erreur lors de la suppression: ' + (err.message || 'Inconnue'));
    } finally {
      setDeleting(false);
    }
  };

  const handleValidate = async () => {
    if (!piece) return;
    setActionInProgress(true);
    try {
      await piecesService.validate(id, activeEntity.id);
      await loadPiece();
    } catch (err) {
      setError('Erreur lors de la validation: ' + err.message);
    } finally {
      setActionInProgress(false);
    }
  };

  const handleCancel = async () => {
    if (!piece) return;
    setActionInProgress(true);
    try {
      await piecesService.cancel(id, activeEntity.id);
      await loadPiece();
    } catch (err) {
      setError('Erreur lors de l\'annulation: ' + err.message);
    } finally {
      setActionInProgress(false);
    }
  };

  const handleReverse = async () => {
    if (!piece) return;
    setActionInProgress(true);
    try {
      const newPiece = await piecesService.reverse(id, activeEntity.id);
      navigate(`/comptabilite/pieces/${newPiece.id}/edit`);
    } catch (err) {
      setError('Erreur lors de l\'extourne: ' + err.message);
    } finally {
      setActionInProgress(false);
    }
  };

  const handleDuplicate = async () => {
    if (!piece) return;
    setActionInProgress(true);
    try {
      const newPiece = await piecesService.duplicate(id, activeEntity.id);
      navigate(`/comptabilite/pieces/${newPiece.id}/edit`);
    } catch (err) {
      setError('Erreur lors de la duplication: ' + err.message);
    } finally {
      setActionInProgress(false);
    }
  };

  const handleNewPiece = () => {
    navigate('/comptabilite/pieces/create');
  };

  const handleGoToList = () => {
    navigate('/comptabilite/pieces');
  };

  const formatDateForDisplay = (dateString) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric', month: 'long', year: 'numeric'
    });
  };

  // Composant pour afficher une cellule avec contenu centré
  const Cell = ({ children, className = "", align = "left" }) => {
    const alignClass = align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left";
    
    if (!children || children === '—' || children === '') {
      return (
        <div className={`px-2 py-1 text-xs text-gray-400 text-center w-full ${className}`}>
          —
        </div>
      );
    }
    
    return (
      <div className={`px-2 py-1 text-xs ${alignClass} ${className}`}>
        {children}
      </div>
    );
  };

  const getStatusConfig = (status) => {
    const config = {
      draft: { text: 'Brouillon', cls: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
      posted: { text: 'Comptabilisé', cls: 'bg-green-100 text-green-800 border-green-200' },
      cancel: { text: 'Annulé', cls: 'bg-red-100 text-red-800 border-red-200' },
      canceled: { text: 'Annulé', cls: 'bg-red-100 text-red-800 border-red-200' }
    };
    return config[status] || { text: status || 'Inconnu', cls: 'bg-gray-100 text-gray-800 border-gray-200' };
  };

  if (!activeEntity) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-7xl mx-auto bg-white border border-gray-300">
          <div className="border-b border-gray-300 px-4 py-3">
            <div className="text-lg font-bold text-gray-900">Détail de la pièce comptable</div>
          </div>
          <div className="p-8">
            <div className="bg-yellow-50 border border-yellow-200 rounded p-6 text-center">
              <FiAlertCircle className="text-yellow-600 mx-auto mb-3" size={32} />
              <p className="text-yellow-800 font-medium text-lg mb-3">Aucune entité sélectionnée</p>
              <p className="text-sm text-gray-600 mb-4">
                Veuillez sélectionner une entité pour voir la pièce comptable.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-7xl mx-auto bg-white border border-gray-300">
          <div className="border-b border-gray-300 px-4 py-3">
            <div className="text-lg font-bold text-gray-900">Détail de la pièce comptable</div>
          </div>
          <div className="p-8 flex items-center justify-center">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-violet-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="mt-4 text-gray-600 text-sm">Chargement de la pièce...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !piece) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-7xl mx-auto bg-white border border-gray-300">
          <div className="border-b border-gray-300 px-4 py-3">
            <div className="text-lg font-bold text-gray-900">Détail de la pièce comptable</div>
          </div>
          <div className="p-8">
            <div className="bg-red-50 border border-red-200 rounded p-6 text-center">
              <FiX className="text-red-600 mx-auto mb-3" size={32} />
              <p className="text-red-800 font-medium text-lg mb-2">Erreur</p>
              <p className="text-sm text-gray-600 mb-4">{error || 'Pièce non trouvée'}</p>
              <div className="flex justify-center gap-3">
                <button
                  onClick={loadReferentials}
                  className="px-4 py-2 bg-gray-200 text-gray-800 text-sm hover:bg-gray-300"
                >
                  Réessayer
                </button>
                <Link
                  to="/comptabilite/pieces"
                  className="px-4 py-2 bg-purple-600 text-white text-sm hover:bg-purple-700"
                >
                  Retour à la liste
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const statusConfig = getStatusConfig(piece.state || piece.status);
  const totals = piece?.lines?.reduce((acc, line) => ({
    debit: acc.debit + (parseFloat(line.debit) || 0),
    credit: acc.credit + (parseFloat(line.credit) || 0)
  }), { debit: 0, credit: 0 }) || { debit: 0, credit: 0 };
  const isBalanced = Math.abs(totals.debit - totals.credit) < 0.01;

  // Enrichir les données avec les maps
  const journal = piece.journal ? journalsMap[piece.journal] || journalsMap[piece.journal?.id] : null;
  const devise = piece.currency ? devisesMap[piece.currency] || devisesMap[piece.currency?.id] : null;

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto bg-white border border-gray-300">

        {/* ── En-tête ligne 1 (comme dans Create) ── */}
        <div className="border-b border-gray-300 px-4 py-3">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-start gap-3">
              {/* Bouton Nouveau (comme dans Create) */}
              <button
                onClick={handleNewPiece}
                className="px-3 py-1.5 border border-gray-300 text-gray-700 text-xs hover:bg-gray-50 flex items-center gap-1"
              >
                <FiPlus size={12} /><span>Nouveau</span>
              </button>
              <div className="flex flex-col">
                {/* Lien vers la liste (comme dans Create) */}
                <div
                  onClick={handleGoToList}
                  className="text-lg font-bold text-gray-900 cursor-pointer hover:text-purple-600"
                >
                  Pièces comptables
                </div>
                {/* État et numéro de pièce (comme dans Create) */}
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm text-gray-700 font-medium">Etat :</span>
                  <span className={`px-2 py-0.5 text-xs font-medium ${statusConfig.cls}`}>
                    {statusConfig.text}
                  </span>
                  <span className="text-sm text-gray-700 font-medium ml-2">N° :</span>
                  <span className="text-sm text-gray-900 font-medium">{piece.name || `#${piece.id}`}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={loadReferentials}
                disabled={loading}
                className="px-3 py-1.5 border border-gray-300 text-gray-700 text-xs hover:bg-gray-50 flex items-center gap-1 disabled:opacity-50"
                title="Actualiser"
              >
                <FiRefreshCw size={12} className={loading ? 'animate-spin' : ''} />
                <span>Actualiser</span>
              </button>
              
              <div className="relative">
                <button
                  onClick={() => setShowActionsMenu(!showActionsMenu)}
                  className="px-3 py-1.5 border border-gray-300 text-gray-700 text-xs hover:bg-gray-50 flex items-center gap-1"
                >
                  <FiMoreVertical size={12} />
                  <span>Actions</span>
                </button>
                
                {showActionsMenu && (
                  <div className="absolute right-0 mt-1 w-48 bg-white border border-gray-300 shadow-lg z-50">
                    <button
                      onClick={() => { handleDuplicate(); setShowActionsMenu(false); }}
                      disabled={actionInProgress}
                      className="w-full px-3 py-2 text-xs text-left hover:bg-gray-50 flex items-center gap-2 border-b border-gray-100 disabled:opacity-50"
                    >
                      <FiCopy size={12} />
                      <span>Dupliquer</span>
                    </button>
                    
                    {piece.state === 'posted' && (
                      <button
                        onClick={() => { handleReverse(); setShowActionsMenu(false); }}
                        disabled={actionInProgress}
                        className="w-full px-3 py-2 text-xs text-left hover:bg-gray-50 flex items-center gap-2 border-b border-gray-100 disabled:opacity-50"
                      >
                        <FiRotateCcw size={12} />
                        <span>Extourner</span>
                      </button>
                    )}
                    
                    <button
                      onClick={() => window.print()}
                      className="w-full px-3 py-2 text-xs text-left hover:bg-gray-50 flex items-center gap-2 border-b border-gray-100"
                    >
                      <FiPrinter size={12} />
                      <span>Imprimer</span>
                    </button>
                    
                    <button
                      onClick={() => { handleDelete(); setShowActionsMenu(false); }}
                      disabled={deleting}
                      className="w-full px-3 py-2 text-xs text-left hover:bg-red-50 flex items-center gap-2 text-red-600 disabled:opacity-50"
                    >
                      <FiTrash2 size={12} />
                      <span>Supprimer</span>
                    </button>
                  </div>
                )}
              </div>

              <Link
                to={`/comptabilite/pieces/${id}/edit`}
                className="px-3 py-1.5 bg-purple-600 text-white text-xs flex items-center gap-1 hover:bg-purple-700"
              >
                <FiEdit size={12} />
                <span>Modifier</span>
              </Link>
            </div>
          </div>
        </div>

        {/* ── En-tête ligne 2 (comme dans Create) ── */}
        <div className="border-b border-gray-300 px-4 py-3 flex items-center justify-between">
          <button
            onClick={piece.state === 'draft' ? handleValidate : handleCancel}
            disabled={actionInProgress}
            className={`px-4 py-2 font-medium text-xs flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed ${
              piece.state === 'draft' 
                ? 'bg-purple-600 text-white hover:bg-purple-700' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {piece.state === 'draft' ? <FiCheck size={12} /> : <FiX size={12} />}
            <span>{piece.state === 'draft' ? 'Comptabiliser (Valider)' : 'Remettre en brouillon'}</span>
          </button>
          
          <div className="flex items-center gap-2">
            <div className={`px-3 py-1.5 text-xs font-medium border ${piece.state === 'draft' ? 'bg-purple-100 text-purple-700 border-purple-300' : 'bg-gray-100 text-gray-500 border-gray-300'}`}>
              Brouillon
            </div>
            <div className={`px-3 py-1.5 text-xs font-medium border ${piece.state === 'posted' ? 'bg-purple-100 text-purple-700 border-purple-300' : 'bg-gray-100 text-gray-500 border-gray-300'}`}>
              Comptabilisé
            </div>
          </div>
        </div>

        {/* ── Erreur ── */}
        {error && (
          <div className="px-4 py-2 bg-red-50 text-red-700 text-xs border-b border-red-200">
            {error}
          </div>
        )}

        {/* ── Informations pièce (comme dans Create) ── */}
        <div className="px-4 py-3 border-b border-gray-300">
          <div className="grid grid-cols-2 gap-4">
            {/* Colonne gauche */}
            <div className="space-y-2">
              <div className="flex items-center" style={{ height: '26px' }}>
                <label className="text-xs text-gray-700 min-w-[140px] font-medium">Date comptable</label>
                <div className="flex-1 px-2 py-1 border border-gray-300 bg-gray-50 text-xs text-gray-900 ml-2 flex items-center justify-center" style={{ height: '26px' }}>
                  <Cell>{formatDateForDisplay(piece.date)}</Cell>
                </div>
              </div>
              <div className="flex items-center" style={{ height: '26px' }}>
                <label className="text-xs text-gray-700 min-w-[140px] font-medium">Référence</label>
                <div className="flex-1 px-2 py-1 border border-gray-300 bg-gray-50 text-xs text-gray-900 ml-2 flex items-center justify-center" style={{ height: '26px' }}>
                  <Cell>{piece.ref}</Cell>
                </div>
              </div>
              <div className="flex items-center" style={{ height: '26px' }}>
                <label className="text-xs text-gray-700 min-w-[140px] font-medium">Journal</label>
                <div className="flex-1 px-2 py-1 border border-gray-300 bg-gray-50 text-xs text-gray-900 ml-2 flex items-center justify-center" style={{ height: '26px' }}>
                  <Cell>
                    {journal ? `${journal.code} - ${journal.name}` : piece.journal}
                  </Cell>
                </div>
              </div>
            </div>
            
            {/* Colonne droite */}
            <div className="space-y-2">
              <div className="flex items-center" style={{ height: '26px' }}>
                <label className="text-xs text-gray-700 min-w-[140px] font-medium">Date enregistrement</label>
                <div className="flex-1 px-2 py-1 border border-gray-300 bg-gray-50 text-xs text-gray-900 ml-2 flex items-center justify-center" style={{ height: '26px' }}>
                  <Cell>{formatDateForDisplay(piece.created_at)}</Cell>
                </div>
              </div>
              <div className="flex items-center" style={{ height: '26px' }}>
                <label className="text-xs text-gray-700 min-w-[140px] font-medium">Devise</label>
                <div className="flex-1 px-2 py-1 border border-gray-300 bg-gray-50 text-xs text-gray-900 ml-2 flex items-center justify-center" style={{ height: '26px' }}>
                  <Cell>
                    {devise ? `${devise.code}${devise.symbole ? ` (${devise.symbole})` : ''}` : piece.currency}
                  </Cell>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Onglets ── */}
        <div className="border-b border-gray-300">
          <div className="px-4 flex">
            {['ecritures', 'notes', 'pieces-jointes'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors ${
                  activeTab === tab 
                    ? 'border-purple-600 text-purple-600' 
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab === 'ecritures' ? 'Écritures comptables' : 
                 tab === 'notes' ? 'Notes' : 'Pièces jointes'}
              </button>
            ))}
          </div>
        </div>

        {/* ── Contenu onglets ── */}
        <div className="p-4">
          {activeTab === 'ecritures' ? (
            <>
              {/* Lignes d'écriture */}
              <div className="border border-gray-300 mb-3 overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-300 px-2 py-1.5 text-xs font-medium text-gray-700 text-left">Compte Général</th>
                      <th className="border border-gray-300 px-2 py-1.5 text-xs font-medium text-gray-700 text-left">Partenaire</th>
                      <th className="border border-gray-300 px-2 py-1.5 text-xs font-medium text-gray-700 text-left">Libellé</th>
                      <th className="border border-gray-300 px-2 py-1.5 text-xs font-medium text-gray-700 text-left">Taxes</th>
                      <th className="border border-gray-300 px-2 py-1.5 text-xs font-medium text-gray-700 text-left">Débit</th>
                      <th className="border border-gray-300 px-2 py-1.5 text-xs font-medium text-gray-700 text-left">Crédit</th>
                      <th className="border border-gray-300 px-2 py-1.5 text-xs font-medium text-gray-700 text-left">Date escompte</th>
                      <th className="border border-gray-300 px-2 py-1.5 text-xs font-medium text-gray-700 text-left">Montant escompte</th>
                    </tr>
                  </thead>
                  <tbody>
                    {piece.lines && piece.lines.length > 0 ? (
                      piece.lines.map((line, lineIndex) => {
                        // Enrichir la ligne avec les données des maps
                        const account = line.account ? accountsMap[line.account] || accountsMap[line.account?.id] : null;
                        const linePartner = line.partner ? partnersMap[line.partner] || partnersMap[line.partner?.id] : null;
                        
                        return (
                          <tr key={line.id || lineIndex} className="hover:bg-gray-50">
                            <td className="border border-gray-300 p-1">
                              <Cell>
                                {account ? (
                                  <>
                                    <span className="font-medium">{account.code}</span>
                                    {account.name && (
                                      <span className="text-gray-500 ml-1">({account.name})</span>
                                    )}
                                  </>
                                ) : null}
                              </Cell>
                            </td>
                            <td className="border border-gray-300 p-1">
                              <Cell>{linePartner?.displayName}</Cell>
                            </td>
                            <td className="border border-gray-300 p-1">
                              <Cell>{line.name}</Cell>
                            </td>
                            <td className="border border-gray-300 p-1">
                              <Cell>{line.tax_line?.name || line.taxes}</Cell>
                            </td>
                            <td className="border border-gray-300 p-1">
                              <Cell align="right">
                                {line.debit ? parseFloat(line.debit).toLocaleString('fr-FR', { minimumFractionDigits: 2 }) : null}
                              </Cell>
                            </td>
                            <td className="border border-gray-300 p-1">
                              <Cell align="right">
                                {line.credit ? parseFloat(line.credit).toLocaleString('fr-FR', { minimumFractionDigits: 2 }) : null}
                              </Cell>
                            </td>
                            <td className="border border-gray-300 p-1">
                              <Cell align="center">{line.discount_date ? formatDateForDisplay(line.discount_date) : null}</Cell>
                            </td>
                            <td className="border border-gray-300 p-1">
                              <Cell align="right">
                                {line.discount_amount ? parseFloat(line.discount_amount).toLocaleString('fr-FR', { minimumFractionDigits: 2 }) : null}
                              </Cell>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan="8" className="border border-gray-300 p-4">
                          <Cell align="center">Aucune ligne d'écriture</Cell>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Totaux */}
              <div className={`px-4 py-2 flex justify-end gap-8 ${isBalanced ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                <div>
                  <span className="text-xs text-gray-600 mr-2">Total Débit:</span>
                  <span className="text-sm font-bold text-green-700">
                    {totals.debit.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} XOF
                  </span>
                </div>
                <div>
                  <span className="text-xs text-gray-600 mr-2">Total Crédit:</span>
                  <span className="text-sm font-bold text-red-700">
                    {totals.credit.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} XOF
                  </span>
                </div>
                <div>
                  <span className="text-xs text-gray-600 mr-2">Solde:</span>
                  <span className={`text-sm font-bold ${isBalanced ? 'text-green-700' : 'text-red-700'}`}>
                    {Math.abs(totals.debit - totals.credit).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} XOF
                    {isBalanced ? ' (Équilibré)' : ' (Non équilibré)'}
                  </span>
                </div>
              </div>
            </>
          ) : activeTab === 'notes' ? (
            <div className="border border-gray-300 p-3">
              <Cell align="left">{piece.notes}</Cell>
            </div>
          ) : (
            <div className="border border-gray-300 p-6">
              <div className="text-center py-8">
                <FiFileText className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                <Cell align="center">Aucune pièce jointe</Cell>
                <Cell align="center" className="text-gray-400">Cette pièce comptable n'a pas de documents joints</Cell>
              </div>
            </div>
          )}
        </div>

        {/* ── Pied de page avec métadonnées ── */}
        <div className="border-t border-gray-300 px-4 py-2 bg-gray-50 text-xs text-gray-500 flex justify-between">
          <div>
            Créé le {piece.created_at ? new Date(piece.created_at).toLocaleString('fr-FR') : '—'}
            {piece.created_by && ` par ${piece.created_by.username || piece.created_by}`}
          </div>
          <div>
            Modifié le {piece.updated_at ? new Date(piece.updated_at).toLocaleString('fr-FR') : '—'}
            {piece.updated_by && ` par ${piece.updated_by.username || piece.updated_by}`}
          </div>
        </div>
      </div>

      {/* ── Dialogue confirmation suppression ── */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-gray-900 mb-3">Confirmer la suppression</h3>
            <p className="text-sm text-gray-600 mb-6">
              Êtes-vous sûr de vouloir supprimer la pièce "{piece.name || piece.id}" ? 
              Cette action est irréversible.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowConfirmDialog(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 text-sm hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleting}
                className="px-4 py-2 bg-red-600 text-white text-sm hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? 'Suppression...' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}