// C:\Users\IBM\Documents\somane_frontend\src\features\comptabilité\pages\Journaux\Show.jsx

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  FiPlus,
  FiEdit, 
  FiTrash2, 
  FiX,
  FiBriefcase,
  FiMail,
  FiInfo,
  FiAlertCircle,
  FiCopy,
  FiRotateCcw,
  FiSettings,
  FiCreditCard,
  FiDollarSign,
  FiClock
} from "react-icons/fi";
import { useParams, useNavigate } from 'react-router-dom';
import { apiClient } from '../../../../services/apiClient';
import { journauxService, comptesService } from "../../services";
import { useEntity } from '../../../../context/EntityContext';

// ==========================================
// NORMALISATION DES DONNÉES API
// ==========================================
const normalizeApiResponse = (data) => {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (data.data && Array.isArray(data.data)) return data.data;
  if (data.results && Array.isArray(data.results)) return data.results;
  if (data.items && Array.isArray(data.items)) return data.items;
  console.warn('⚠️ Format de réponse non reconnu:', data);
  return [];
};

// ==========================================
// COMPOSANT TOOLTIP
// ==========================================
const Tooltip = ({ children, text, position = 'top' }) => {
  const [show, setShow] = useState(false);
  
  return (
    <div className="relative inline-block">
      <div
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
      >
        {children}
      </div>
      {show && (
        <div className={`absolute z-50 px-2 py-1 text-xs text-white bg-gray-800 rounded whitespace-nowrap ${
          position === 'top' ? 'bottom-full left-1/2 transform -translate-x-1/2 mb-1' :
          position === 'bottom' ? 'top-full left-1/2 transform -translate-x-1/2 mt-1' :
          position === 'left' ? 'right-full top-1/2 transform -translate-y-1/2 mr-1' :
          'left-full top-1/2 transform -translate-y-1/2 ml-1'
        }`}>
          {text}
          <div className={`absolute w-2 h-2 bg-gray-800 transform rotate-45 ${
            position === 'top' ? 'top-full left-1/2 -translate-x-1/2 -mt-1' :
            position === 'bottom' ? 'bottom-full left-1/2 -translate-x-1/2 -mb-1' :
            position === 'left' ? 'left-full top-1/2 -translate-y-1/2 -ml-1' :
            'right-full top-1/2 -translate-y-1/2 -mr-1'
          }`} />
        </div>
      )}
    </div>
  );
};


export default function Show() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { activeEntity } = useEntity();
  
  const [journal, setJournal] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [sequences, setSequences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [loadingSequences, setLoadingSequences] = useState(false);
  const [error, setError] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [activeTab, setActiveTab] = useState('comptable');
  const actionsMenuRef = useRef(null);
  
  const initialLoadDone = useRef(false);

  // Chargement du journal (prioritaire)
  const loadJournal = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('📦 Chargement du journal ID:', id);
      
      const journalData = await journauxService.getById(id);
      
      console.log('📦 Données brutes reçues de l\'API:', journalData);
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
  }, [id]);

  // Chargement des comptes en arrière-plan
  const loadAccounts = useCallback(async () => {
    if (accounts.length > 0) return;
    
    setLoadingAccounts(true);
    try {
      console.log('📊 Début chargement des comptes...');
      const response = await comptesService.getAll();
      // ✅ Sécurisation des données
      const accountsData = Array.isArray(response) ? response : [];
      setAccounts(accountsData);
      console.log('📊 Comptes chargés avec succès:', accountsData.length);
    } catch (err) {
      console.warn('⚠️ Erreur chargement comptes:', err);
      setAccounts([]); // ✅ Initialiser à [] en cas d'erreur
    } finally {
      setLoadingAccounts(false);
    }
  }, [accounts.length]);

  // Chargement des séquences en arrière-plan
  const loadSequences = useCallback(async () => {
    if (sequences.length > 0) return;
    
    setLoadingSequences(true);
    try {
      console.log('🔢 Début chargement des séquences...');
      const response = await apiClient.get('/core/sequences/');
      const sequencesData = normalizeApiResponse(response);
      // ✅ Sécurisation des données
      setSequences(Array.isArray(sequencesData) ? sequencesData : []);
      console.log('🔢 Séquences chargées avec succès:', sequencesData.length);
    } catch (err) {
      console.warn('⚠️ Erreur chargement séquences:', err);
      setSequences([]); // ✅ Initialiser à [] en cas d'erreur
    } finally {
      setLoadingSequences(false);
    }
  }, [sequences.length]);

  // Chargement initial
  useEffect(() => {
    if (initialLoadDone.current) {
      console.log('⏭️ Chargement déjà effectué, ignoré');
      return;
    }
    
    initialLoadDone.current = true;
    console.log('🚀 Chargement initial des données');
    
    loadJournal().then(() => {
      loadAccounts();
      loadSequences();
    });
    
    return () => {
      console.log('🧹 Nettoyage du composant');
    };
  }, [loadJournal, loadAccounts, loadSequences]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (actionsMenuRef.current && !actionsMenuRef.current.contains(e.target)) {
        setShowActionsMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ✅ CORRECTION 1: Créer un Map pour une recherche plus rapide des comptes
  const accountsMap = useMemo(() => {
    const map = new Map();
    // ✅ Vérifier que accounts est un tableau
    if (Array.isArray(accounts) && accounts.length > 0) {
      accounts.forEach(account => {
        if (account && account.id) {
          map.set(account.id, account);
        }
      });
    }
    return map;
  }, [accounts]);

  // ✅ CORRECTION 2: Créer un Map pour les séquences
  const sequencesMap = useMemo(() => {
    const map = new Map();
    // ✅ Vérifier que sequences est un tableau
    if (Array.isArray(sequences) && sequences.length > 0) {
      sequences.forEach(sequence => {
        if (sequence && sequence.id) {
          map.set(sequence.id, sequence);
        }
      });
    }
    return map;
  }, [sequences]);

  // Fonction pour obtenir le libellé d'un compte à partir de son ID
  const getAccountLabel = useCallback((accountId) => {
    if (!accountId) return null;
    
    const account = accountsMap.get(accountId);
    if (account) {
      return `${account.code} - ${account.name}`;
    }
    
    return null;
  }, [accountsMap]);

  // Fonction pour obtenir le libellé d'une séquence
  const getSequenceLabel = useCallback((sequenceId) => {
    if (!sequenceId) return null;
    
    const sequence = sequencesMap.get(sequenceId);
    if (sequence) {
      return `${sequence.prefix}...${sequence.suffix} (${sequence.current_number || 0})`;
    }
    
    return null;
  }, [sequencesMap]);

  // Extraire les IDs des comptes une seule fois
  const accountIds = useMemo(() => {
    if (!journal) return {};
    
    return {
      default: journal.default_account?.id || journal.default_account_id,
      profit: journal.profit_account?.id || journal.profit_account_id || journal.profit_account,
      loss: journal.loss_account?.id || journal.loss_account_id || journal.loss_account,
      suspense: journal.suspense_account?.id || journal.suspense_account_id || journal.suspense_account,
      suspenseIn: journal.suspense_in_account?.id || journal.suspense_in_account_id,
      suspenseOut: journal.suspense_out_account?.id || journal.suspense_out_account_id
    };
  }, [journal]);

  // Extraire les IDs des séquences
  const sequenceIds = useMemo(() => {
    if (!journal) return {};
    
    return {
      main: journal.sequence?.id || journal.sequence_id,
      refund: journal.refund_sequence?.id || journal.refund_sequence_id
    };
  }, [journal]);

  // Obtenir les libellés des comptes
  const labels = useMemo(() => {
    if (!journal) return {};
    
    return {
      default: getAccountLabel(accountIds.default) || 
        (journal.default_account && typeof journal.default_account === 'object' ? 
          `${journal.default_account.code || ''} - ${journal.default_account.name || ''}`.trim() : null),
      
      profit: getAccountLabel(accountIds.profit) || 
        (journal.profit_account && typeof journal.profit_account === 'object' ? 
          `${journal.profit_account.code || ''} - ${journal.profit_account.name || ''}`.trim() : null),
      
      loss: getAccountLabel(accountIds.loss) || 
        (journal.loss_account && typeof journal.loss_account === 'object' ? 
          `${journal.loss_account.code || ''} - ${journal.loss_account.name || ''}`.trim() : null),
      
      suspense: getAccountLabel(accountIds.suspense) || 
        (journal.suspense_account && typeof journal.suspense_account === 'object' ? 
          `${journal.suspense_account.code || ''} - ${journal.suspense_account.name || ''}`.trim() : null),
      
      suspenseIn: getAccountLabel(accountIds.suspenseIn) || 
        (journal.suspense_in_account && typeof journal.suspense_in_account === 'object' ? 
          `${journal.suspense_in_account.code || ''} - ${journal.suspense_in_account.name || ''}`.trim() : null),
      
      suspenseOut: getAccountLabel(accountIds.suspenseOut) || 
        (journal.suspense_out_account && typeof journal.suspense_out_account === 'object' ? 
          `${journal.suspense_out_account.code || ''} - ${journal.suspense_out_account.name || ''}`.trim() : null)
    };
  }, [journal, accountIds, getAccountLabel]);

  // Obtenir les libellés des séquences
  const sequenceLabels = useMemo(() => {
    if (!journal) return {};
    
    return {
      main: getSequenceLabel(sequenceIds.main) || 
        (journal.sequence && typeof journal.sequence === 'object' ? 
          `${journal.sequence.prefix || ''}...${journal.sequence.suffix || ''}`.trim() : null),
      
      refund: getSequenceLabel(sequenceIds.refund) || 
        (journal.refund_sequence && typeof journal.refund_sequence === 'object' ? 
          `${journal.refund_sequence.prefix || ''}...${journal.refund_sequence.suffix || ''}`.trim() : null)
    };
  }, [journal, sequenceIds, getSequenceLabel]);

  const handleDelete = async () => {
    if (!journal) return;
    
    setDeleting(true);
    try {
      await journauxService.delete(id);
      navigate('/comptabilite/journaux');
    } catch (err) {
      setError('Erreur lors de la suppression: ' + (err.message || 'Inconnue'));
      setShowConfirmDialog(false);
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

  const handleDuplicate = () => {
    setShowActionsMenu(false);
    navigate(`/comptabilite/journaux/create?duplicate_from=${id}`);
  };

  const handleExtourner = () => {
    setShowActionsMenu(false);
  };

  // Vérifier si le type est Banque ou Caisse
  const isBankOrCashType = useCallback(() => {
    if (!journal) return false;
    const typeCode = journal.type?.code || journal.type_code || '';
    const bankCashCodes = ['BQ', 'CA', 'BN', 'CS', 'BAN', 'CAI', 'BANQUE', 'CAISSE'];
    return bankCashCodes.includes(typeCode) || 
           typeCode?.startsWith('B') || 
           typeCode?.startsWith('C');
  }, [journal]);

  if (loading && !journal) {
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
                className="px-4 py-2 border border-gray-300 text-gray-700 text-sm hover:bg-gray-50 mr-2"
              >
                Réessayer
              </button>
              <button
                onClick={handleCancel}
                className="px-4 py-2 bg-purple-600 text-white text-sm hover:bg-purple-700"
              >
                Retour aux journaux
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const showFullAccounting = isBankOrCashType();

  // Banque
  const bankAccountName = journal.bank_account?.banque_details?.nom || 
                        journal.bank_account?.banque?.nom || 
                        journal.bank_account?.nom || 
                        journal.bank_account_name || 
                        '';
  const bankAccountNumber = journal.bank_account?.numero_compte || 
                         journal.bank_account_number || 
                         '';

  // Méthodes de paiement
  const inboundMethods = journal.inbound_payment_methods_names || 
                      journal.inbound_payment_methods?.map(m => m.name) || 
                      [];
  const outboundMethods = journal.outbound_payment_methods_names || 
                       journal.outbound_payment_methods?.map(m => m.name) || 
                       [];

  // Email
  const email = journal.email || '';

  // Import relevés bancaires
  const importBankStatements = journal.import_bank_statements || false;

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto bg-white border border-gray-300">

        {/* En-tête ligne 1 */}
        <div className="border-b border-gray-300 px-4 py-3">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-start gap-3">
              <Tooltip text="Créer un nouveau journal">
                <button 
                  onClick={handleNewJournal}
                  className="h-8 px-3 border border-gray-300 text-gray-700 text-xs hover:bg-gray-50 hover:scale-105 hover:shadow-md active:scale-95 transition-all duration-200 flex items-center gap-1"
                >
                  <FiPlus size={12} /><span>Nouveau</span>
                </button>
              </Tooltip>
              <div className="flex flex-col">
                <div 
                  className="text-lg font-bold text-gray-900 cursor-pointer hover:text-purple-600 hover:scale-105 transition-all duration-200"
                  onClick={handleGoToList}
                >
                  Journaux
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative" ref={actionsMenuRef}>
                <Tooltip text="Menu des actions">
                  <button 
                    onClick={() => setShowActionsMenu(!showActionsMenu)}
                    className="h-8 px-3 border border-gray-300 text-gray-700 text-xs hover:bg-gray-50 hover:scale-105 hover:shadow-md active:scale-95 transition-all duration-200 flex items-center gap-1"
                  >
                    <FiSettings size={12} /><span>Actions</span>
                  </button>
                </Tooltip>
                {showActionsMenu && (
                  <div className="absolute right-0 mt-1 w-48 bg-white border border-gray-300 shadow-lg rounded-sm z-50">
                    <button onClick={handleDuplicate} className="w-full px-3 py-2 text-xs text-left hover:bg-gray-50 hover:pl-4 transition-all duration-200 flex items-center gap-2 border-b border-gray-100">
                      <FiCopy size={12} /> Dupliquer
                    </button>
                    <button onClick={handleExtourner} className="w-full px-3 py-2 text-xs text-left hover:bg-gray-50 hover:pl-4 transition-all duration-200 flex items-center gap-2">
                      <FiRotateCcw size={12} /> Extourné
                    </button>
                  </div>
                )}
              </div>
              <Tooltip text="Modifier ce journal">
                <button 
                  onClick={handleEdit}
                  className="h-8 px-3 border border-gray-300 text-gray-700 text-xs hover:bg-gray-50 hover:scale-105 hover:shadow-md active:scale-95 transition-all duration-200 flex items-center gap-1"
                >
                  <FiEdit size={12} /><span>Modifier</span>
                </button>
              </Tooltip>
              <Tooltip text="Supprimer ce journal">
                <button 
                  onClick={() => setShowConfirmDialog(true)}
                  disabled={deleting}
                  className="h-8 px-3 border border-gray-300 text-gray-700 text-xs hover:bg-gray-50 hover:scale-105 hover:shadow-md active:scale-95 transition-all duration-200 flex items-center gap-1"
                >
                  <FiTrash2 size={12} /><span>Supprimer</span>
                </button>
              </Tooltip>
              <Tooltip text="Annuler et retourner à la liste">
                <button 
                  onClick={handleCancel}
                  className="w-8 h-8 rounded-full bg-black text-white hover:bg-gray-800 hover:scale-110 hover:shadow-lg active:scale-90 transition-all duration-200 flex items-center justify-center"
                >
                  <FiX size={16} />
                </button>
              </Tooltip>
            </div>
          </div>
        </div>

        {/* En-tête ligne 2 - Badges Actif/Inactif */}
        <div className="border-b border-gray-300 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className={`text-sm font-medium ${journal.active ? 'text-green-600' : 'text-gray-500'}`}>
              {journal.active ? 'Activé' : 'Désactivé'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`h-8 px-3 text-xs font-medium border transition-all duration-200 flex items-center ${
              journal.active 
                ? 'bg-green-100 text-green-700 border-green-300' 
                : 'bg-gray-100 text-gray-500 border-gray-300'
            }`}>
              Actif
            </div>
            <div className={`h-8 px-3 text-xs font-medium border transition-all duration-200 flex items-center ${
              !journal.active 
                ? 'bg-red-100 text-red-700 border-red-300' 
                : 'bg-gray-100 text-gray-500 border-gray-300'
            }`}>
              Inactif
            </div>
          </div>
        </div>

        {/* Informations de base */}
        <div className="px-4 py-3 border-b border-gray-300">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center" style={{ height: '26px' }}>
              <label className="text-xs text-gray-700 w-24 font-medium">Nom</label>
              <div className="flex-1 px-2 py-1 bg-gray-50 border border-gray-300 text-xs ml-2">
                {journal.name}
              </div>
            </div>
            <div className="flex items-center" style={{ height: '26px' }}>
              <label className="text-xs text-gray-700 w-24 font-medium">Code</label>
              <div className="flex-1 px-2 py-1 bg-gray-50 border border-gray-300 text-xs ml-2 font-mono font-semibold">
                {journal.code}
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mt-2">
            <div className="flex items-center" style={{ height: '26px' }}>
              <label className="text-xs text-gray-700 w-24 font-medium">Type</label>
              <div className="flex-1 px-2 py-1 bg-gray-50 border border-gray-300 text-xs ml-2">
                {journal.type?.name || journal.type_name} {journal.type?.code && `(${journal.type.code})`}
              </div>
            </div>
            <div className="flex items-center" style={{ height: '26px' }}>
            </div>
          </div>
        </div>

        {/* Onglets */}
        <div className="border-b border-gray-300">
          <div className="px-4 flex">
            {['comptable', 'avance', 'notes'].map(tab => (
              <button 
                key={tab} 
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-xs font-medium border-b-2 transition-all duration-200 ${
                  activeTab === tab 
                    ? 'border-purple-600 text-purple-600 hover:text-purple-800' 
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab === 'comptable' ? 'Paramètres comptables' : tab === 'avance' ? 'Paramètres avancés' : 'Notes'}
              </button>
            ))}
          </div>
        </div>

        {/* Contenu onglets */}
        <div className="p-4">
          {activeTab === 'comptable' && (
            <div className="space-y-3">
              {/* Indicateur de chargement des comptes */}
              {loadingAccounts && (
                <div className="text-xs text-purple-600 flex items-center gap-2 mb-2">
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-purple-600"></div>
                  Chargement des libellés des comptes...
                </div>
              )}
              
              {/* Première ligne - Compte d'achat par défaut */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center" style={{ height: '26px' }}>
                  <label className="text-xs text-gray-700 w-40 font-medium">
                    Compte d'achat par défaut
                    {!labels.default && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  <div className="flex-1 px-2 py-1 bg-gray-50 border border-gray-300 text-xs ml-2">
                    {labels.default ? (
                      <span className="font-mono">{labels.default}</span>
                    ) : (
                      <span className="text-gray-400 italic">
                        {loadingAccounts ? 'Chargement...' : 'Non défini'}
                      </span>
                    )}
                  </div>
                </div>
                
                {/* Deuxième colonne - Compte d'attente pour Banque/Caisse */}
                <div className="flex items-center" style={{ height: '26px' }}>
                  {showFullAccounting ? (
                    <>
                      <label className="text-xs text-gray-700 w-40 font-medium">
                        Compte d'attente
                        {!labels.suspense && <span className="text-red-500 ml-1">*</span>}
                      </label>
                      <div className="flex-1 px-2 py-1 bg-gray-50 border border-gray-300 text-xs ml-2">
                        {labels.suspense ? (
                          <span className="font-mono">{labels.suspense}</span>
                        ) : (
                          <span className="text-gray-400 italic">
                            {loadingAccounts ? 'Chargement...' : 'Non défini'}
                          </span>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="w-full"></div>
                  )}
                </div>
              </div>
              
              {/* Deuxième ligne - Comptes profit et perte pour Banque/Caisse */}
              {showFullAccounting && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center" style={{ height: '26px' }}>
                    <label className="text-xs text-gray-700 w-40 font-medium">
                      Compte de profit
                      {!labels.profit && <span className="text-red-500 ml-1">*</span>}
                    </label>
                    <div className="flex-1 px-2 py-1 bg-gray-50 border border-gray-300 text-xs ml-2">
                      {labels.profit ? (
                        <span className="font-mono">{labels.profit}</span>
                      ) : (
                        <span className="text-gray-400 italic">
                          {loadingAccounts ? 'Chargement...' : 'Non défini'}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center" style={{ height: '26px' }}>
                    <label className="text-xs text-gray-700 w-40 font-medium">
                      Compte de perte
                      {!labels.loss && <span className="text-red-500 ml-1">*</span>}
                    </label>
                    <div className="flex-1 px-2 py-1 bg-gray-50 border border-gray-300 text-xs ml-2">
                      {labels.loss ? (
                        <span className="font-mono">{labels.loss}</span>
                      ) : (
                        <span className="text-gray-400 italic">
                          {loadingAccounts ? 'Chargement...' : 'Non défini'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Message d'information */}
              <div className={`mt-2 p-2 rounded ${showFullAccounting ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50 border border-gray-200'}`}>
                <p className={`text-xs flex items-center gap-1 ${showFullAccounting ? 'text-blue-700' : 'text-gray-600'}`}>
                  <FiInfo size={12} />
                  {showFullAccounting 
                    ? "Ce journal est de type Banque/Caisse. Tous les comptes ci-dessus sont obligatoires."
                    : "Ce journal n'est pas de type Banque/Caisse. Seul le compte d'achat par défaut est requis."}
                </p>
              </div>
            </div>
          )}

          {activeTab === 'avance' && (
            <div className="space-y-3">
              {/* Indicateur de chargement des séquences */}
              {loadingSequences && (
                <div className="text-xs text-purple-600 flex items-center gap-2 mb-2">
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-purple-600"></div>
                  Chargement des séquences...
                </div>
              )}

              {/* Première ligne */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center" style={{ height: '26px' }}>
                  <label className="text-xs text-gray-700 w-40 font-medium">Société</label>
                  <div className="flex-1 px-2 py-1 bg-gray-50 border border-gray-300 text-xs ml-2 flex items-center gap-2">
                    <FiBriefcase size={12} className="text-purple-600" />
                    {activeEntity?.raison_sociale || activeEntity?.nom || 'Non définie'}
                  </div>
                </div>
                
                <div className="flex items-center" style={{ height: '26px' }}>
                  <label className="text-xs text-gray-700 w-40 font-medium">Compte bancaire</label>
                  <div className="flex-1 px-2 py-1 bg-gray-50 border border-gray-300 text-xs ml-2">
                    {bankAccountName || bankAccountNumber ? (
                      <span>{bankAccountName} {bankAccountNumber && `- ${bankAccountNumber}`}</span>
                    ) : (
                      <span className="text-gray-400 italic">Non défini</span>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Deuxième ligne */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center" style={{ height: '26px' }}>
                  <label className="text-xs text-gray-700 w-40 font-medium">E-mail</label>
                  <div className="flex-1 px-2 py-1 bg-gray-50 border border-gray-300 text-xs ml-2 flex items-center gap-2">
                    <FiMail size={12} className="text-gray-400" />
                    {email || <span className="text-gray-400 italic">Non défini</span>}
                  </div>
                </div>
                
                <div className="flex items-center" style={{ height: '26px' }}>
                  <label className="text-xs text-gray-700 w-40 font-medium">Import relevés bancaires</label>
                  <div className="flex-1 px-2 py-1 bg-gray-50 border border-gray-300 text-xs ml-2 flex items-center gap-2">
                    <FiCreditCard size={12} className="text-gray-400" />
                    {importBankStatements ? (
                      <span className="text-green-600">Activé</span>
                    ) : (
                      <span className="text-gray-400 italic">Désactivé</span>
                    )}
                  </div>
                </div>
              </div>

              {/* NOUVELLE SECTION : Numérotation */}
              <div className="border-t border-gray-200 pt-3 mt-2">
                <h3 className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1">
                  <FiClock size={12} /> Numérotation
                </h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center" style={{ height: '26px' }}>
                    <label className="text-xs text-gray-700 w-40 font-medium">
                      Séquence principale
                    </label>
                    <div className="flex-1 px-2 py-1 bg-gray-50 border border-gray-300 text-xs ml-2">
                      {sequenceLabels.main ? (
                        <span className="font-mono">{sequenceLabels.main}</span>
                      ) : (
                        <span className="text-gray-400 italic">
                          {loadingSequences ? 'Chargement...' : 'Non définie'}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center" style={{ height: '26px' }}>
                    <label className="text-xs text-gray-700 w-40 font-medium">
                      Séquence séparée avoirs
                    </label>
                    <div className="flex-1 px-2 py-1 bg-gray-50 border border-gray-300 text-xs ml-2">
                      {journal.use_refund_sequence ? (
                        sequenceLabels.refund ? (
                          <span className="font-mono">{sequenceLabels.refund}</span>
                        ) : (
                          <span className="text-gray-400 italic">
                            {loadingSequences ? 'Chargement...' : 'Non définie'}
                          </span>
                        )
                      ) : (
                        <span className="text-gray-400 italic">Non activé</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Méthodes de paiement */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center" style={{ height: '26px' }}>
                  <label className="text-xs text-gray-700 w-40 font-medium">Mode de paiement entrant</label>
                  <div className="flex-1 px-2 py-1 bg-gray-50 border border-gray-300 text-xs ml-2">
                    {inboundMethods.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {inboundMethods.map((method, idx) => (
                          <span key={idx} className="px-1.5 py-0.5 bg-purple-50 text-purple-700 rounded text-xs">
                            {method}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-gray-400 italic">Non défini</span>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center" style={{ height: '26px' }}>
                  <label className="text-xs text-gray-700 w-40 font-medium">Mode de paiement sortant</label>
                  <div className="flex-1 px-2 py-1 bg-gray-50 border border-gray-300 text-xs ml-2">
                    {outboundMethods.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {outboundMethods.map((method, idx) => (
                          <span key={idx} className="px-1.5 py-0.5 bg-purple-50 text-purple-700 rounded text-xs">
                            {method}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-gray-400 italic">Non défini</span>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Comptes de suspens */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center" style={{ height: '26px' }}>
                  <label className="text-xs text-gray-700 w-40 font-medium">Compte suspens entrant</label>
                  <div className="flex-1 px-2 py-1 bg-gray-50 border border-gray-300 text-xs ml-2">
                    {labels.suspenseIn ? (
                      <span className="font-mono">{labels.suspenseIn}</span>
                    ) : (
                      <span className="text-gray-400 italic">
                        {loadingAccounts ? 'Chargement...' : 'Non défini'}
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center" style={{ height: '26px' }}>
                  <label className="text-xs text-gray-700 w-40 font-medium">Compte suspens sortant</label>
                  <div className="flex-1 px-2 py-1 bg-gray-50 border border-gray-300 text-xs ml-2">
                    {labels.suspenseOut ? (
                      <span className="font-mono">{labels.suspenseOut}</span>
                    ) : (
                      <span className="text-gray-400 italic">
                        {loadingAccounts ? 'Chargement...' : 'Non défini'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'notes' && (
            <div className="border border-gray-300 bg-gray-50">
              <div className="px-3 py-2 text-xs min-h-[120px]">
                {journal.note ? (
                  <p className="whitespace-pre-wrap">{journal.note}</p>
                ) : (
                  <span className="text-gray-400 italic">Aucune note</span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Messages d'erreur */}
        {error && (
          <div className="px-4 py-3 text-sm border-t border-gray-300 bg-red-50 text-red-700">
            <div className="flex items-center gap-2">
              <FiAlertCircle size={14} />
              <span>{error}</span>
            </div>
          </div>
        )}
      </div>

      {/* Dialogue confirmation suppression */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-sm shadow-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-gray-900 mb-3">Confirmer la suppression</h3>
            <p className="text-sm text-gray-600 mb-6">
              Êtes-vous sûr de vouloir supprimer le journal "{journal.name || journal.code}" ? Cette action est irréversible.
            </p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setShowConfirmDialog(false)} 
                className="px-4 py-2 border border-gray-300 text-gray-700 text-sm hover:bg-gray-50 hover:scale-105 active:scale-95 transition-all duration-200"
                disabled={deleting}
              >
                Annuler
              </button>
              <button 
                onClick={handleDelete} 
                className="px-4 py-2 bg-red-600 text-white text-sm hover:bg-red-700 hover:scale-105 active:scale-95 transition-all duration-200"
                disabled={deleting}
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