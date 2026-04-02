import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  FiArrowLeft, 
  FiX, 
  FiCheck, 
  FiAlertCircle, 
  FiPlus,
  FiSave,
  FiEdit
} from "react-icons/fi";
import { useParams, useNavigate } from 'react-router-dom';
import { journauxService, apiClient } from "../../services";
import { useEntity } from '../../../../context/EntityContext';

// 🔥 CACHE POUR ÉVITER LES REQUÊTES MULTIPLES
const DATA_CACHE = {
  journalTypes: null,
  comptes: null,
  banques: null,
  lastFetch: null,
  CACHE_DURATION: 10 * 60 * 1000 // 10 minutes
};

// 🔥 FONCTION D'EXTRACTION ROBUSTE DES DONNÉES API
const extractData = (response) => {
  if (!response) return [];
  if (Array.isArray(response)) return response;
  if (Array.isArray(response.results)) return response.results;
  if (Array.isArray(response.data)) return response.data;
  return [];
};

export default function Edit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { activeEntity } = useEntity();
  
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    type: '',
    default_account: '',
    bank_account: '',
    note: '',
    active: true
  });
  
  const [journal, setJournal] = useState(null);
  const [journalTypes, setJournalTypes] = useState([]);
  const [comptes, setComptes] = useState([]);
  const [banques, setBanques] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // États de recherche
  const [searchType, setSearchType] = useState('');
  const [searchCompte, setSearchCompte] = useState('');
  const [searchBanque, setSearchBanque] = useState('');
  
  // États pour le lazy loading
  const [comptesLoaded, setComptesLoaded] = useState(false);
  const [banquesLoaded, setBanquesLoaded] = useState(false);

  // 🔥 FONCTION DE VALIDATION DU CACHE CENTRALISÉE
  const isCacheValid = useCallback(() => {
    if (!DATA_CACHE.lastFetch) return false;
    return (Date.now() - DATA_CACHE.lastFetch) < DATA_CACHE.CACHE_DURATION;
  }, []);

  useEffect(() => {
    if (activeEntity) {
      loadData();
    } else {
      setError('Aucune entité active sélectionnée');
      setLoading(false);
    }
  }, [id, activeEntity]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔍 [Edit] Chargement du journal ID:', id);
      
      // Charger le journal à éditer
      const journalData = await journauxService.getById(id);
      console.log('📋 [Edit] Journal chargé:', JSON.stringify(journalData, null, 2));
      setJournal(journalData);
      
      // 🔥 CORRECTION : Extraction robuste des IDs
      const defaultAccountId = journalData.default_account?.id || 
                               journalData.default_account_id || 
                               (typeof journalData.default_account === 'object' && journalData.default_account !== null
                                 ? journalData.default_account.id 
                                 : journalData.default_account) || '';

      const bankAccountId = journalData.bank_account?.id || 
                            journalData.bank_account_id || 
                            (typeof journalData.bank_account === 'object' && journalData.bank_account !== null
                              ? journalData.bank_account.id 
                              : journalData.bank_account) || '';

      const typeId = journalData.type?.id || 
                     journalData.type_id || 
                     (typeof journalData.type === 'object' && journalData.type !== null
                       ? journalData.type.id 
                       : journalData.type) || '';
      
      // Pré-remplir le formulaire
      setFormData({
        code: journalData.code || '',
        name: journalData.name || '',
        type: typeId,
        default_account: defaultAccountId,
        bank_account: bankAccountId,
        note: journalData.note || '',
        active: journalData.active !== false
      });

      console.log('📝 [Edit] Formulaire pré-rempli:', {
        code: journalData.code,
        name: journalData.name,
        typeId: typeId,
        defaultAccountId: defaultAccountId,
        bankAccountId: bankAccountId,
        active: journalData.active
      });

      // Charger les types de journal
      if (isCacheValid() && DATA_CACHE.journalTypes) {
        setJournalTypes(DATA_CACHE.journalTypes);
      } else {
        const typesRes = await journauxService.getTypes();
        const typesData = extractData(typesRes);
        DATA_CACHE.journalTypes = typesData;
        DATA_CACHE.lastFetch = Date.now();
        setJournalTypes(typesData);
      }

    } catch (err) {
      console.error('❌ [Edit] Erreur loadData:', err);
      if (err.response?.status === 404) {
        setError('Journal non trouvé');
      } else {
        setError(`Erreur de chargement: ${err.message || 'Inconnue'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  // 🔥 FONCTION POUR CHARGER LES COMPTES (LAZY) - CORRIGÉE AVEC activeEntity
  const loadComptes = useCallback(async (force = false) => {
    if (!activeEntity) {
      console.warn('⚠️ [Edit] Tentative de chargement des comptes sans entité active');
      return;
    }

    if (!force && (comptesLoaded || comptes.length > 0)) return;

    try {
      console.log('🔄 [Edit] Chargement des comptes pour entité:', activeEntity.id);
      setComptesLoaded(false);
      
      if (isCacheValid() && DATA_CACHE.comptes?.length > 0) {
        setComptes(DATA_CACHE.comptes);
      } else {
        // 🔥 UTILISER activeEntity.id DU CONTEXTE
        const response = await apiClient.get(`compta/accounts/?entity_id=${activeEntity.id}`);
        const comptesData = extractData(response);
        console.log('📊 [Edit] Comptes chargés:', comptesData.length, 'items');
        DATA_CACHE.comptes = comptesData;
        setComptes(comptesData);
      }
    } catch (err) {
      console.error('❌ [Edit] Erreur chargement comptes:', err);
      setError(prev => prev || 'Impossible de charger la liste des comptes');
      setComptes([]);
    } finally {
      setComptesLoaded(true);
    }
  }, [comptesLoaded, comptes.length, isCacheValid, activeEntity]);

  // 🔥 FONCTION POUR CHARGER LES BANQUES (LAZY)
  const loadBanques = useCallback(async (force = false) => {
    if (!force && (banquesLoaded || banques.length > 0)) return;

    try {
      console.log('🔄 [Edit] Chargement des banques...');
      setBanquesLoaded(false);
      
      if (isCacheValid() && DATA_CACHE.banques?.length > 0) {
        setBanques(DATA_CACHE.banques);
      } else {
        const response = await apiClient.get('banques/');
        const banquesData = extractData(response);
        console.log('🏦 [Edit] Banques chargées:', banquesData.length, 'items');
        DATA_CACHE.banques = banquesData;
        setBanques(banquesData);
      }
    } catch (err) {
      console.error('❌ [Edit] Erreur chargement banques:', err);
      setError(prev => prev || 'Impossible de charger la liste des banques');
      setBanques([]);
    } finally {
      setBanquesLoaded(true);
    }
  }, [banquesLoaded, banques.length, isCacheValid]);

  // 🔥 CHARGEMENT AUTO SEULEMENT POUR BAN/CAI
  useEffect(() => {
    console.log('🔧 [Edit] useEffect - formData.type:', formData.type, '(type:', typeof formData.type, ')');
    console.log('🔧 [Edit] Comptes chargés:', comptesLoaded, 'Banques chargées:', banquesLoaded);
    
    if (!formData.type) {
      setComptes([]);
      setBanques([]);
      setComptesLoaded(false);
      setBanquesLoaded(false);
      return;
    }

    const selectedType = journalTypes.find(type => type.id === formData.type);
    if (!selectedType) return;

    console.log('🔧 [Edit] Type sélectionné:', selectedType.code, '-', selectedType.name);
    const needsAccounts = selectedType.code === 'BAN' || selectedType.code === 'CAI';
    
    if (needsAccounts) {
      if (!comptesLoaded) {
        console.log('🔄 [Edit] Déclenchement loadComptes');
        loadComptes();
      }
      if (!banquesLoaded) {
        console.log('🔄 [Edit] Déclenchement loadBanques');
        loadBanques();
      }
    }
  }, [formData.type, journalTypes, comptesLoaded, banquesLoaded, loadComptes, loadBanques]);

  // 🔥 CALCULS DIRECTS
  const selectedType = journalTypes.find(type => type.id === formData.type);
  const isBankAccountRequired = selectedType?.code === 'BAN' || selectedType?.code === 'CAI';
  const isDefaultAccountRequired = selectedType?.code === 'BAN' || selectedType?.code === 'CAI';

  // 🔥 TROUVER LE COMPTE SÉLECTIONNÉ POUR L'AFFICHAGE
  const selectedCompte = comptes.find(c => c.id === formData.default_account || 
                                          c.id?.toString() === formData.default_account?.toString());
  
  const selectedBanque = banques.find(b => b.id === formData.bank_account || 
                                          b.id?.toString() === formData.bank_account?.toString());

  console.log('🔍 [Edit] Sélections actuelles:', {
    typeId: formData.type,
    typeValue: typeof formData.type,
    compteId: formData.default_account,
    compteValue: typeof formData.default_account,
    banqueId: formData.bank_account,
    banqueValue: typeof formData.bank_account,
    selectedCompte: selectedCompte?.code || 'Aucun',
    selectedBanque: selectedBanque?.numero_compte || 'Aucun'
  });

  const handleChange = useCallback((field, value) => {
    console.log('✏️ [Edit] Changement:', field, '=', value, '(type:', typeof value, ')');
    setFormData(prev => ({ ...prev, [field]: value }));
    if (error) setError(null);
    
    if (field === 'type') {
      setFormData(prev => ({
        ...prev,
        default_account: '',
        bank_account: ''
      }));
    }
  }, [error]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitLoading(true);
    setError(null);
    setSuccess(null);

    console.log('📤 [Edit] Envoi des données - formData:', JSON.stringify(formData, null, 2));

    // 🔥 VÉRIFICATION CRITIQUE : Entité active obligatoire
    if (!activeEntity) {
      const errorMsg = 'Aucune entité active sélectionnée. Veuillez choisir une entité.';
      console.error('❌ [Edit]', errorMsg);
      setError(errorMsg);
      setSubmitLoading(false);
      return;
    }

    // Validation
    if (!formData.code.trim()) {
      setError('Le code du journal est obligatoire');
      setSubmitLoading(false);
      return;
    }

    if (!formData.name.trim()) {
      setError('Le nom du journal est obligatoire');
      setSubmitLoading(false);
      return;
    }

    if (!formData.type) {
      setError('Le type de journal est obligatoire');
      setSubmitLoading(false);
      return;
    }

    // Validation conditionnelle pour les comptes
    if (isDefaultAccountRequired && !formData.default_account) {
      const errorMsg = `Le compte par défaut est obligatoire pour un journal de type ${selectedType.name}`;
      setError(errorMsg);
      setSubmitLoading(false);
      return;
    }
    
    if (isBankAccountRequired && !formData.bank_account) {
      const errorMsg = `Le compte bancaire est obligatoire pour un journal de type ${selectedType.name}`;
      setError(errorMsg);
      setSubmitLoading(false);
      return;
    }

    try {
      // 🔥 CORRECTION MAJEURE : Utiliser activeEntity.id du contexte + conversion en nombres
      const submitData = { 
        code: formData.code.trim().toUpperCase(),
        name: formData.name.trim(),
        type_id: formData.type ? parseInt(formData.type, 10) : null,
        company_id: activeEntity.id,
        default_account_id: formData.default_account ? parseInt(formData.default_account, 10) : null,
        bank_account_id: formData.bank_account ? parseInt(formData.bank_account, 10) : null,
        note: formData.note || '',
        active: formData.active
      };
      
      console.log('📦 [Edit] Données envoyées à l\'API:', JSON.stringify(submitData, null, 2));
      console.log('📊 [Edit] Types des données envoyées:', {
        code: typeof submitData.code,
        name: typeof submitData.name,
        type_id: typeof submitData.type_id + ' (' + submitData.type_id + ')',
        company_id: typeof submitData.company_id + ' (' + submitData.company_id + ')',
        default_account_id: typeof submitData.default_account_id + ' (' + submitData.default_account_id + ')',
        bank_account_id: typeof submitData.bank_account_id + ' (' + submitData.bank_account_id + ')',
        note: typeof submitData.note,
        active: typeof submitData.active
      });
      
      await journauxService.update(id, submitData);
      
      setSuccess('Journal mis à jour avec succès !');
      
      // Invalider le cache
      DATA_CACHE.lastFetch = null;
      
      setTimeout(() => {
        navigate(`/comptabilite/journaux/${id}`);
      }, 1500);
      
    } catch (err) {
      console.error('❌ [Edit] Erreur soumission:', err);
      
      // 🔥 EXTRACTION DÉTAILLÉE DE L'ERREUR
      let errorMessage = 'Erreur lors de la mise à jour du journal';
      let errorDetails = null;
      
      if (err.response) {
        errorDetails = err.response.data;
        console.error('📄 [Edit] Réponse complète du serveur (400):', JSON.stringify(err.response.data, null, 2));
        
        // Extraire le message d'erreur spécifique
        if (err.response.data?.detail) {
          errorMessage = 'Erreur serveur: ' + err.response.data.detail;
        } else if (err.response.data?.message) {
          errorMessage = 'Erreur: ' + err.response.data.message;
        } else if (err.response.data?.type) {
          errorMessage = 'Type invalide: ' + (Array.isArray(err.response.data.type) ? err.response.data.type[0] : err.response.data.type);
        } else if (err.response.data?.code) {
          errorMessage = 'Code invalide: ' + (Array.isArray(err.response.data.code) ? err.response.data.code[0] : err.response.data.code);
        } else if (err.response.data?.name) {
          errorMessage = 'Nom invalide: ' + (Array.isArray(err.response.data.name) ? err.response.data.name[0] : err.response.data.name);
        } else if (err.response.data?.company_id) {
          errorMessage = 'Entité invalide: ' + (Array.isArray(err.response.data.company_id) ? err.response.data.company_id[0] : err.response.data.company_id);
        } else if (err.response.data?.default_account_id) {
          errorMessage = 'Compte par défaut invalide: ' + (Array.isArray(err.response.data.default_account_id) ? err.response.data.default_account_id[0] : err.response.data.default_account_id);
        } else if (err.response.data?.bank_account_id) {
          errorMessage = 'Compte bancaire invalide: ' + (Array.isArray(err.response.data.bank_account_id) ? err.response.data.bank_account_id[0] : err.response.data.bank_account_id);
        } else {
          errorMessage = 'Erreur ' + err.response.status + ': ' + JSON.stringify(err.response.data);
        }
      } else if (err.message) {
        errorMessage = 'Erreur: ' + err.message;
      }
      
      console.error('🔴 [Edit] Message d\'erreur final:', errorMessage);
      if (errorDetails) {
        console.error('🔴 [Edit] Détails techniques:', errorDetails);
      }
      
      setError(errorMessage);
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleCancel = () => {
    navigate(`/comptabilite/journaux/${id}`);
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

  if (error?.includes('non trouvé') || !journal) {
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
                onClick={loadData}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 mr-2"
              >
                Réessayer
              </button>
              <button
                onClick={handleCancel}
                className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
              >
                Retour au journal
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 🔥 PROTECTION : Si pas d'entité active, afficher un message clair
  if (!activeEntity) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-7xl mx-auto bg-white border border-gray-300">
          <div className="border-b border-gray-300 px-4 py-3">
            <div className="text-lg font-bold text-gray-900">Entité requise</div>
          </div>
          <div className="p-8">
            <div className="bg-yellow-50 border border-yellow-200 rounded p-4 text-center">
              <FiAlertCircle className="text-yellow-600 mx-auto mb-2" size={24} />
              <p className="text-yellow-800 font-medium mb-3">
                Aucune entité sélectionnée
              </p>
              <p className="text-sm text-gray-600 mb-4">
                Veuillez sélectionner une entité dans le menu principal pour pouvoir modifier ce journal.
              </p>
              <button
                onClick={handleGoToList}
                className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
              >
                Retour à la liste des journaux
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
                onClick={handleSubmit}
                disabled={submitLoading}
                className="px-3 py-1.5 bg-purple-600 text-white text-xs flex items-center gap-1 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FiSave size={12} />
                <span>{submitLoading ? 'Sauvegarde...' : 'Enregistrer'}</span>
              </button>
            </div>
          </div>
          
          {/* Deuxième ligne : État et Code */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-700 font-medium">État:</span>
              <span className={`px-2 py-0.5 text-xs font-medium ${
                formData.active 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-gray-100 text-gray-600'
              }`}>
                {formData.active ? 'Actif' : 'Inactif'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-700 font-medium">Code:</span>
              <span className="text-sm font-mono font-bold text-purple-600">
                {formData.code || '---'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-700 font-medium">Type:</span>
              <span className="text-sm font-medium">
                {selectedType?.name || 'Non spécifié'} ({selectedType?.code || '???'})
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-700 font-medium">Entité:</span>
              <span className="text-sm font-medium text-blue-600">
                {activeEntity.name || 'Non spécifiée'}
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
              formData.active
                ? 'bg-purple-100 text-purple-700 border-purple-300'
                : 'bg-gray-100 text-gray-500 border-gray-300'
            }`}>
              Actif
            </div>
            <div className={`px-3 py-1.5 text-xs font-medium border ${
              !formData.active
                ? 'bg-purple-100 text-purple-700 border-purple-300'
                : 'bg-gray-100 text-gray-500 border-gray-300'
            }`}>
              Inactif
            </div>
          </div>
        </div>

        {/* Informations du journal */}
        <div className="px-4 py-3">
          <div className="text-lg font-bold text-gray-900 mb-4">Modifier le journal</div>
          
          <form onSubmit={handleSubmit} className="space-y-3">
            {/* Ligne 1 : Code et Type côte à côte */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
              {/* Code */}
              <div className="flex items-center min-h-[26px]">
                <label className="text-xs text-gray-700 min-w-[140px] font-medium">
                  Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => handleChange('code', e.target.value)}
                  className="flex-1 px-2 py-1 border border-gray-300 text-xs ml-2"
                  style={{ height: '26px' }}
                  placeholder="Ex: VEN, ACH, BAN, CAI..."
                  maxLength={8}
                />
              </div>

              {/* Type */}
              <div className="flex items-center min-h-[26px]">
                <label className="text-xs text-gray-700 min-w-[140px] font-medium">
                  Type <span className="text-red-500">*</span>
                </label>
                <div className="flex-1 ml-2">
                  <SearchableDropdown
                    value={formData.type}
                    onChange={(value) => handleChange('type', value)}
                    options={journalTypes}
                    searchValue={searchType}
                    onSearchChange={setSearchType}
                    placeholder="Sélectionnez un type..."
                    getOptionLabel={(type) => `${type.name || 'Sans nom'} (${type.code || 'Sans code'})`}
                    getOptionValue={(type) => type.id?.toString()}
                    required={true}
                    size="xs"
                  />
                </div>
              </div>
            </div>

            {/* Ligne 2 : Nom seul sur toute la largeur */}
            <div className="flex items-center min-h-[26px]">
              <label className="text-xs text-gray-700 min-w-[140px] font-medium">
                Nom <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className="flex-1 px-2 py-1 border border-gray-300 text-xs ml-2"
                style={{ height: '26px' }}
                placeholder="Ex: Journal des ventes..."
              />
            </div>

            {/* Ligne 3 : Compte par défaut et Compte bancaire côte à côte */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
              {/* Compte par défaut */}
              <div className="flex items-center min-h-[26px]">
                <label className={`text-xs text-gray-700 min-w-[140px] font-medium`}>
                  Compte par défaut
                  {isDefaultAccountRequired && <span className="text-red-500">*</span>}
                </label>
                <div className="flex-1 ml-2">
                  <SearchableDropdown
                    value={formData.default_account}
                    onChange={(value) => handleChange('default_account', value)}
                    options={comptes}
                    searchValue={searchCompte}
                    onSearchChange={setSearchCompte}
                    placeholder={
                      !formData.type 
                        ? "Sélectionnez d'abord un type" 
                        : isDefaultAccountRequired
                          ? "Sélectionnez un compte (obligatoire)" 
                          : "Optionnel - Cliquez pour choisir"
                    }
                    getOptionLabel={(compte) => `${compte.code || ''} - ${compte.name || compte.nom || 'Sans nom'}`}
                    getOptionValue={(compte) => compte.id?.toString()}
                    required={isDefaultAccountRequired}
                    size="xs"
                    disabled={!formData.type}
                    isLoading={isDefaultAccountRequired && !comptesLoaded && !!formData.type}
                    onOpen={() => {
                      if (!comptesLoaded && formData.type) {
                        loadComptes();
                      }
                    }}
                  />
                </div>
              </div>

              {/* Compte bancaire */}
              <div className="flex items-center min-h-[26px]">
                <label className={`text-xs text-gray-700 min-w-[140px] font-medium`}>
                  Compte bancaire
                  {isBankAccountRequired && <span className="text-red-500">*</span>}
                </label>
                <div className="flex-1 ml-2">
                  <SearchableDropdown
                    value={formData.bank_account}
                    onChange={(value) => handleChange('bank_account', value)}
                    options={banques}
                    searchValue={searchBanque}
                    onSearchChange={setSearchBanque}
                    placeholder={
                      !formData.type 
                        ? "Sélectionnez d'abord un type" 
                        : isBankAccountRequired
                          ? "Sélectionnez un compte (obligatoire)" 
                          : "Optionnel - Cliquez pour choisir"
                    }
                    getOptionLabel={(banque) => 
                      banque.numero_compte 
                        ? `${banque.banque?.nom || 'Banque'} - ${banque.numero_compte}`
                        : banque.banque?.nom || banque.nom || 'Banque'
                    }
                    getOptionValue={(banque) => banque.id?.toString()}
                    required={isBankAccountRequired}
                    size="xs"
                    disabled={!formData.type}
                    isLoading={isBankAccountRequired && !banquesLoaded && !!formData.type}
                    onOpen={() => {
                      if (!banquesLoaded && formData.type) {
                        loadBanques();
                      }
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Ligne 4 : Notes */}
            <div className="flex items-start min-h-[48px]">
              <label className="text-xs text-gray-700 min-w-[140px] font-medium pt-1">
                Notes
              </label>
              <textarea
                value={formData.note}
                onChange={(e) => handleChange('note', e.target.value)}
                className="flex-1 px-2 py-1 border border-gray-300 text-xs ml-2"
                rows={2}
                placeholder="Notes additionnelles..."
              />
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
                  checked={formData.active}
                  onChange={(e) => handleChange('active', e.target.checked)}
                  className="w-3.5 h-3.5 text-purple-600 rounded focus:ring-purple-500"
                />
                <label htmlFor="active" className="text-xs font-medium text-gray-700">
                  Journal actif
                </label>
              </div>
            </div>
          </form>
        </div>

        {/* Messages d'erreur/succès */}
        {(error || success) && (
          <div className={`px-4 py-3 text-sm border-t border-gray-300 ${
            error ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
          }`}>
            <div className="flex items-center gap-2">
              {error ? <FiAlertCircle size={14} /> : <FiCheck size={14} />}
              <span>{error || success}</span>
            </div>
          </div>
        )}

        {/* Indicateur pour les types spéciaux */}
        {formData.type && isBankAccountRequired && (
          <div className="px-4 py-2 bg-yellow-50 border border-yellow-200">
            <div className="flex items-center gap-2 text-xs text-yellow-800">
              <FiAlertCircle size={12} />
              <span>
                <span className="font-medium">Note :</span> Les comptes sont obligatoires pour les journaux Banque/Caisse
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// 🔥 COMPOSANT SEARCHABLE DROPDOWN IDENTIQUE À CREATE
function SearchableDropdown({ 
  value, 
  onChange, 
  options, 
  searchValue,
  onSearchChange,
  placeholder,
  required = false,
  disabled = false,
  isLoading = false,
  onOpen,
  getOptionLabel = (option) => option,
  getOptionValue = (option) => option,
  size = "xs",
  className = ""
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);

  const safeOptions = Array.isArray(options) ? options : [];

  const filteredOptions = safeOptions.filter(option =>
    getOptionLabel(option).toLowerCase().includes(searchValue.toLowerCase())
  );

  const selectedOption = safeOptions.find(opt => getOptionValue(opt) === value);

  useEffect(() => {
    const handleMouseDown = (event) => {
      if (!dropdownRef.current?.contains(event.target)) {
        setIsOpen(false);
        onSearchChange('');
      }
    };

    document.addEventListener('mousedown', handleMouseDown, true);
    
    return () => {
      document.removeEventListener('mousedown', handleMouseDown, true);
    };
  }, [onSearchChange]);

  const handleToggle = () => {
    if (!disabled && !isLoading) {
      const willOpen = !isOpen;
      setIsOpen(willOpen);
      
      if (willOpen && onOpen) {
        onOpen();
      }
      
      if (willOpen) {
        setTimeout(() => {
          inputRef.current?.focus();
        }, 0);
      } else {
        onSearchChange('');
      }
    }
  };

  const handleOptionClick = (optionValue) => {
    if (!disabled) {
      onChange(optionValue);
      setIsOpen(false);
      onSearchChange('');
    }
  };

  const sizeClasses = {
    xs: {
      button: 'px-2 py-1 text-xs',
      input: 'px-2 py-1 text-xs',
      option: 'px-2 py-1 text-xs',
      icon: 'w-2.5 h-2.5'
    }
  };

  const sizeClass = sizeClasses[size] || sizeClasses.xs;

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <button
        type="button"
        onClick={handleToggle}
        onMouseDown={(e) => e.preventDefault()}
        disabled={disabled || isLoading}
        className={`w-full text-left border rounded focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-transparent transition-all ${sizeClass.button} ${className} ${
          disabled || isLoading
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-300' 
            : 'bg-white hover:border-gray-400 border-gray-300'
        } ${isOpen ? 'ring-1 ring-purple-500 border-purple-500' : ''}`}
      >
        <div className="flex items-center justify-between">
          <span className={`truncate text-xs ${
            disabled || isLoading 
              ? 'text-gray-400' 
              : selectedOption 
                ? 'text-gray-900 font-medium' 
                : 'text-gray-500'
          }`}>
            {isLoading 
              ? 'Chargement...' 
              : selectedOption 
                ? getOptionLabel(selectedOption) 
                : (placeholder || 'Sélectionnez...')}
          </span>
          {!isLoading && (
            <svg className={`transition-transform ${isOpen ? 'transform rotate-180' : ''} ${sizeClass.icon} ${disabled ? 'text-gray-300' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          )}
          {isLoading && (
            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-purple-600"></div>
          )}
        </div>
      </button>

      {isOpen && !disabled && !isLoading && (
        <div className="absolute z-50 w-full mt-0.5 bg-white border border-gray-300 rounded shadow-lg overflow-hidden">
          <div className="p-1 border-b border-gray-200 bg-gray-50">
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                value={searchValue}
                onChange={(e) => onSearchChange(e.target.value)}
                className={`w-full pl-6 pr-2 ${sizeClass.input} border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-transparent bg-white`}
                placeholder={`Rechercher...`}
                autoFocus
              />
            </div>
            <p className="text-xs text-gray-500 mt-0.5 px-1">
              {filteredOptions.length} résultat(s)
            </p>
          </div>
          
          <div 
            className="overflow-y-auto"
            style={{ 
              maxHeight: '140px',
              minHeight: '40px'
            }}
          >
            {filteredOptions.length === 0 ? (
              <div className="py-2 text-center">
                <p className="text-gray-500 text-xs">Aucun résultat</p>
              </div>
            ) : (
              <div>
                {filteredOptions.map((option, index) => (
                  <div
                    key={getOptionValue(option)}
                    className={`${sizeClass.option} cursor-pointer hover:bg-purple-50 transition-colors ${
                      value === getOptionValue(option) ? 'bg-purple-100 text-purple-700 font-medium' : 'text-gray-700'
                    } ${index < filteredOptions.length - 1 ? 'border-b border-gray-100' : ''}`}
                    onClick={() => handleOptionClick(getOptionValue(option))}
                  >
                    {getOptionLabel(option)}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}