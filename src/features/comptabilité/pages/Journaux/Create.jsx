import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiPlus, FiSave, FiX, FiCheck, FiAlertCircle, FiBriefcase } from 'react-icons/fi';
import { useEntity } from '../../../../context/EntityContext';
import { journauxService, apiClient } from "../../services";

// 🔥 CACHE AMÉLIORÉ AVEC DURÉE CONFIGURABLE
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
  
  // Cas 1 : Réponse directe (tableau)
  if (Array.isArray(response)) return response;
  
  // Cas 2 : Format paginé DRF standard (le plus courant)
  if (response.results && Array.isArray(response.results)) return response.results;
  
  // Cas 3 : Format avec .data
  if (response.data && Array.isArray(response.data)) return response.data;
  
  // Cas 4 : Objet avec count/next/previous mais sans results (rare)
  if (typeof response === 'object' && !Array.isArray(response)) {
    for (const key in response) {
      if (Array.isArray(response[key])) return response[key];
    }
  }
  
  console.warn('⚠️ Format de réponse API non reconnu:', response);
  return [];
};

export default function Create() {
  const navigate = useNavigate();
  const { activeEntity } = useEntity();
  
  // États pour le formulaire
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // États pour les données
  const [dataLoading, setDataLoading] = useState(true);
  const [journalTypes, setJournalTypes] = useState([]);
  const [comptes, setComptes] = useState([]);
  const [banques, setBanques] = useState([]);
  
  // 🔥 NOUVEAUX ÉTATS POUR LE LAZY LOADING
  const [comptesLoaded, setComptesLoaded] = useState(false);
  const [banquesLoaded, setBanquesLoaded] = useState(false);
  
  // État du formulaire
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    type: '',
    default_account: '',
    bank_account: '',
    note: '',
    active: true
  });

  // États de recherche
  const [searchType, setSearchType] = useState('');
  const [searchCompte, setSearchCompte] = useState('');
  const [searchBanque, setSearchBanque] = useState('');
  
  // 🔥 FONCTION DE VALIDATION DU CACHE CENTRALISÉE
  const isCacheValid = useCallback(() => {
    if (!DATA_CACHE.lastFetch) return false;
    return (Date.now() - DATA_CACHE.lastFetch) < DATA_CACHE.CACHE_DURATION;
  }, []);

  // 🔥 CHARGEMENT INITIAL OPTIMISÉ : SEULEMENT LES TYPES
  useEffect(() => {
    console.log('🔍 Entité active:', activeEntity);
    
    if (!activeEntity) {
      setError('Vous devez sélectionner une entité pour créer un journal');
      setDataLoading(false);
      return;
    }

    const loadJournalTypes = async () => {
      try {
        setDataLoading(true);
        
        if (isCacheValid() && DATA_CACHE.journalTypes) {
          console.log('✅ Types chargés depuis le cache:', DATA_CACHE.journalTypes.length, 'items');
          setJournalTypes(DATA_CACHE.journalTypes);
        } else {
          console.log('🔄 Chargement des types depuis l\'API...');
          const response = await journauxService.getTypes();
          const typesData = extractData(response);
          
          console.log('📊 Réponse brute API:', response);
          console.log('✅ Types extraits:', typesData.length, 'items', typesData);
          
          if (typesData.length === 0) {
            console.warn('⚠️ Aucun type de journal trouvé.');
          }
          
          DATA_CACHE.journalTypes = typesData;
          DATA_CACHE.lastFetch = Date.now();
          setJournalTypes(typesData);
        }
      } catch (err) {
        console.error('❌ Erreur chargement types:', err);
        console.error('❌ Détails erreur:', {
          message: err.message,
          response: err.response?.data,
          status: err.response?.status
        });
        setError('Erreur de chargement des types de journal. Veuillez réessayer.');
      } finally {
        setDataLoading(false);
      }
    };

    loadJournalTypes();
  }, [activeEntity, isCacheValid]);

  // 🔥 FONCTION POUR CHARGER LES COMPTES (LAZY) - VERSION RETRY-SAFE
  const loadComptes = useCallback(async (force = false) => {
    if (!force && (comptesLoaded || comptes.length > 0)) return;

    try {
      setComptesLoaded(false);
      
      if (isCacheValid() && DATA_CACHE.comptes?.length > 0) {
        console.log('✅ Comptes chargés depuis le cache:', DATA_CACHE.comptes.length);
        setComptes(DATA_CACHE.comptes);
      } else {
        console.log('🔄 Chargement des comptes depuis l\'API...');
        const response = await apiClient.get('compta/accounts/');
        const comptesData = extractData(response);
        
        console.log('✅ Comptes extraits:', comptesData.length, 'items');
        
        if (comptesData.length === 0) {
          console.warn('⚠️ Aucun compte trouvé dans la réponse API');
        }
        
        DATA_CACHE.comptes = comptesData;
        setComptes(comptesData);
      }
    } catch (err) {
      console.error('❌ Erreur chargement comptes:', err);
      setError(prev => prev || 'Impossible de charger la liste des comptes');
      setComptes([]);
    } finally {
      setComptesLoaded(true);
    }
  }, [comptesLoaded, comptes.length, isCacheValid]);

  // 🔥 FONCTION POUR CHARGER LES BANQUES (LAZY) - VERSION RETRY-SAFE
  const loadBanques = useCallback(async (force = false) => {
    if (!force && (banquesLoaded || banques.length > 0)) return;

    try {
      setBanquesLoaded(false);
      
      if (isCacheValid() && DATA_CACHE.banques?.length > 0) {
        console.log('✅ Banques chargées depuis le cache:', DATA_CACHE.banques.length);
        setBanques(DATA_CACHE.banques);
      } else {
        console.log('🔄 Chargement des banques depuis l\'API...');
        const response = await apiClient.get('banques/');
        const banquesData = extractData(response);
        
        console.log('✅ Banques extraites:', banquesData.length, 'items');
        
        if (banquesData.length === 0) {
          console.warn('⚠️ Aucune banque trouvée dans la réponse API');
        }
        
        DATA_CACHE.banques = banquesData;
        setBanques(banquesData);
      }
    } catch (err) {
      console.error('❌ Erreur chargement banques:', err);
      setError(prev => prev || 'Impossible de charger la liste des banques');
      setBanques([]);
    } finally {
      setBanquesLoaded(true);
    }
  }, [banquesLoaded, banques.length, isCacheValid]);

  // 🔥 CHARGEMENT AUTO SEULEMENT POUR BAN/CAI
  useEffect(() => {
    if (!formData.type) {
      // Réinitialiser les états quand le type est vidé
      setComptes([]);
      setBanques([]);
      setComptesLoaded(false);
      setBanquesLoaded(false);
      return;
    }

    const selectedType = journalTypes.find(type => type.id === formData.type);
    if (!selectedType) return;

    const needsAccounts = selectedType.code === 'BAN' || selectedType.code === 'CAI';
    
    if (needsAccounts) {
      // Charger automatiquement pour BAN/CAI
      if (!comptesLoaded) loadComptes();
      if (!banquesLoaded) loadBanques();
    }
  }, [formData.type, journalTypes, comptesLoaded, banquesLoaded, loadComptes, loadBanques]);

  // 🔥 CALCULS DIRECTS
  const selectedType = journalTypes.find(type => type.id === formData.type);
  const isBankAccountRequired = selectedType?.code === 'BAN' || selectedType?.code === 'CAI';
  const isDefaultAccountRequired = selectedType?.code === 'BAN' || selectedType?.code === 'CAI';

  // 🔍 DEBUG
  useEffect(() => {
    console.log('🔍 Types disponibles:', journalTypes);
    console.log('🔍 Type sélectionné:', selectedType);
    console.log('🔍 Comptes:', comptes.length, 'items | Chargé:', comptesLoaded);
    console.log('🔍 Banques:', banques.length, 'items | Chargé:', banquesLoaded);
  }, [journalTypes, selectedType, comptes, banques, comptesLoaded, banquesLoaded]);

  // Soumettre le formulaire
  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    // Validation
    if (!formData.code.trim()) {
      setError('Le code du journal est obligatoire');
      setLoading(false);
      return;
    }

    if (!formData.name.trim()) {
      setError('Le nom du journal est obligatoire');
      setLoading(false);
      return;
    }

    if (!formData.type) {
      setError('Le type de journal est obligatoire');
      setLoading(false);
      return;
    }

    // ✅ VALIDATION CONDITIONNELLE CORRECTE
    if (isDefaultAccountRequired && !formData.default_account) {
      const errorMsg = `Le compte par défaut est obligatoire pour un journal de type ${selectedType.name}`;
      setError(errorMsg);
      setLoading(false);
      return;
    }
    
    if (isBankAccountRequired && !formData.bank_account) {
      const errorMsg = `Le compte bancaire est obligatoire pour un journal de type ${selectedType.name}`;
      setError(errorMsg);
      setLoading(false);
      return;
    }

    try {
      const submitData = { 
        code: formData.code.trim().toUpperCase(),
        name: formData.name.trim(),
        type: formData.type,
        default_account: formData.default_account || null,
        bank_account: formData.bank_account || null,
        note: formData.note || '',
        active: formData.active
      };
      
      console.log('📤 Envoi des données au backend:', submitData);
      
      const response = await journauxService.create(submitData);
      
      console.log('✅ Réponse API:', response);
      
      setSuccess('Journal créé avec succès ! Redirection...');
      
      // 🔥 INVALIDER LE CACHE après création
      DATA_CACHE.lastFetch = null;
      
      setTimeout(() => {
        navigate('/comptabilite/journaux');
      }, 1500);
      
    } catch (err) {
      console.error('❌ Erreur création journal:', err);
      
      let errorMessage = 'Erreur lors de la création du journal';
      
      if (err.response) {
        errorMessage = 
          err.response.data?.detail ||
          err.response.data?.message ||
          err.response.data?.company?.[0] || 
          err.response.data?.type?.[0] || 
          err.response.data?.code?.[0] || 
          err.response.data?.name?.[0] || 
          JSON.stringify(err.response.data) ||
          `Erreur ${err.response.status}: ${err.response.statusText}`;
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      setLoading(false);
    }
  };

  // Gestion des changements de formulaire
  const handleChange = useCallback((field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (error) setError(null);
    
    // 🔥 RÉINITIALISER LES CHAMPS DÉPENDANTS QUAND LE TYPE CHANGE
    if (field === 'type') {
      setFormData(prev => ({
        ...prev,
        default_account: '',
        bank_account: ''
      }));
    }
  }, [error]);

  // Gérer l'annulation
  const handleCancel = useCallback(() => {
    navigate('/comptabilite/journaux');
  }, [navigate]);

  // Créer un nouveau journal
  const handleNewJournal = useCallback(() => {
    navigate('/comptabilite/journaux/create');
  }, [navigate]);

  // Aller à la liste
  const handleGoToList = useCallback(() => {
    navigate('/comptabilite/journaux');
  }, [navigate]);

  // Pendant le chargement des données
  if (dataLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-7xl mx-auto bg-white border border-gray-300">
          <div className="border-b border-gray-300 px-4 py-3">
            <div className="text-lg font-bold text-gray-900">Chargement...</div>
          </div>
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p className="text-sm text-gray-600">Chargement des types de journal...</p>
          </div>
        </div>
      </div>
    );
  }

  // Si pas d'entité active
  if (!activeEntity) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-7xl mx-auto bg-white border border-gray-300">
          <div className="border-b border-gray-300 px-4 py-3">
            <div className="text-lg font-bold text-gray-900">Créer un journal</div>
          </div>
          <div className="p-8">
            <div className="bg-yellow-50 border border-yellow-200 rounded p-4 text-center">
              <FiAlertCircle className="text-yellow-600 mx-auto mb-2" size={24} />
              <p className="text-yellow-800 font-medium mb-3">
                {error || 'Vous devez sélectionner une entité pour créer un journal'}
              </p>
              <p className="text-sm text-gray-600 mb-4">
                Cliquez sur l'icône <FiBriefcase className="inline text-purple-600 mx-1" size={14} /> 
                en haut à droite pour choisir une entité.
              </p>
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
                disabled={loading}
                className="px-3 py-1.5 bg-purple-600 text-white text-xs flex items-center gap-1 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FiSave size={12} />
                <span>Créer le journal</span>
              </button>
            </div>
          </div>
          
          {/* Deuxième ligne : État et Entité */}
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
              <span className="text-sm text-gray-700 font-medium">Entité:</span>
              <span className="text-sm font-medium text-purple-600">
                {activeEntity.raison_sociale || activeEntity.nom || 'Entité active'}
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
          <div className="text-lg font-bold text-gray-900 mb-4">Nouveau journal</div>
          
          <div className="space-y-3">
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
                  {journalTypes.length === 0 && !dataLoading ? (
                    <div className="text-xs text-yellow-600 bg-yellow-50 px-2 py-1 rounded border border-yellow-200">
                      Aucun type disponible. Contactez l'administrateur.
                    </div>
                  ) : (
                    <SearchableDropdown
                      value={formData.type}
                      onChange={(value) => handleChange('type', value)}
                      options={journalTypes}
                      searchValue={searchType}
                      onSearchChange={setSearchType}
                      placeholder={dataLoading ? "Chargement..." : "Sélectionnez un type..."}
                      getOptionLabel={(type) => `${type.name || 'Sans nom'} (${type.code || '???'})`}
                      getOptionValue={(type) => type.id?.toString()}
                      required={true}
                      size="xs"
                      isLoading={dataLoading}
                    />
                  )}
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
              {/* Compte par défaut - VERSION CORRIGÉE */}
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
                    disabled={!formData.type} // ✅ CORRIGÉ : Toujours activé si type sélectionné
                    isLoading={isDefaultAccountRequired && !comptesLoaded && !!formData.type}
                    onOpen={() => {
                      // ✅ Charger à la demande si pas encore chargé
                      if (!comptesLoaded && formData.type) {
                        loadComptes();
                      }
                    }}
                  />
                </div>
              </div>

              {/* Compte bancaire - VERSION CORRIGÉE */}
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
                    disabled={!formData.type} // ✅ CORRIGÉ
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
          </div>
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

// 🔥 COMPOSANT SEARCHABLE DROPDOWN AMÉLIORÉ AVEC SUPPORT onOpen
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
  onOpen, // ✅ NOUVELLE PROP
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
      
      // ✅ Appeler onOpen quand le dropdown s'ouvre
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