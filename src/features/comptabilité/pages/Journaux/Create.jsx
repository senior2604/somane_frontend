// features/comptabilité/pages/Journaux/Create.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import ComptabiliteFormContainer from "../../components/ComptabiliteFormContainer";
import { 
  FiAlertCircle, FiType, FiBriefcase, FiCreditCard, 
  FiDatabase, FiSearch, FiCheck
} from "react-icons/fi";

import { journauxService, authService, apiClient } from "../../services";

export default function Create() {
  const navigate = useNavigate();
  
  // États pour le formulaire
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // États pour les données
  const [dataLoading, setDataLoading] = useState(true);
  const [companies, setCompanies] = useState([]);
  const [journalTypes, setJournalTypes] = useState([]);
  const [comptes, setComptes] = useState([]);
  const [banques, setBanques] = useState([]);
  
  // État du formulaire
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    type: '',
    company: '',
    default_account: '',
    bank_account: '',
    note: '',
    active: true
  });

  // États de recherche
  const [searchCompany, setSearchCompany] = useState('');
  const [searchType, setSearchType] = useState('');
  const [searchCompte, setSearchCompte] = useState('');
  const [searchBanque, setSearchBanque] = useState('');
  const [manualCompany, setManualCompany] = useState('');
  
  // État pour l'authentification
  const [authStatus, setAuthStatus] = useState({
    isAuthenticated: false,
    hasCompaniesAccess: false,
    showLoginPrompt: false
  });

  // Fonction pour extraire les données
  const extractData = (response) => {
    if (!response) return [];
    if (Array.isArray(response)) return response;
    if (response.data && Array.isArray(response.data)) return response.data;
    if (response.results && Array.isArray(response.results)) return response.results;
    return [];
  };

  // Charger les données nécessaires
  useEffect(() => {
    const fetchData = async () => {
      try {
        setDataLoading(true);
        setError(null);
        
        // Vérifier l'authentification
        const isAuthenticated = authService.isAuthenticated();
        
        // Charger les données de base
        const [typesRes, comptesRes, banquesRes] = await Promise.all([
          journauxService.getTypes(),
          apiClient.get('/compta/accounts/').catch(() => ({ data: [] })),
          apiClient.get('/compta/banques/').catch(() => ({ data: [] }))
        ]);

        setJournalTypes(extractData(typesRes));
        setComptes(extractData(comptesRes));
        setBanques(extractData(banquesRes));

        // Charger les entreprises si authentifié
        if (isAuthenticated) {
          try {
            const companiesRes = await apiClient.get('/entites/');
            const companiesData = extractData(companiesRes);
            setCompanies(companiesData);
            
            setAuthStatus({
              isAuthenticated: true,
              hasCompaniesAccess: companiesData.length > 0,
              showLoginPrompt: false
            });
          } catch (companyError) {
            console.warn('Erreur chargement entreprises:', companyError);
            setCompanies([]);
            setAuthStatus({
              isAuthenticated: true,
              hasCompaniesAccess: false,
              showLoginPrompt: false
            });
          }
        } else {
          setCompanies([]);
          setAuthStatus({
            isAuthenticated: false,
            hasCompaniesAccess: false,
            showLoginPrompt: true
          });
        }

      } catch (err) {
        console.error('Erreur chargement données formulaire:', err);
        setError('Erreur de chargement des données. Veuillez réessayer.');
      } finally {
        setDataLoading(false);
      }
    };

    fetchData();
  }, []);

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

    // Validation conditionnelle pour les comptes
    const selectedType = journalTypes.find(type => type.id === formData.type);
    
    // Compte par défaut obligatoire seulement pour Banque et Caisse
    if (selectedType && (selectedType.code === 'BAN' || selectedType.code === 'CAI') && !formData.default_account) {
      const errorMsg = `Le compte par défaut est obligatoire pour un journal de type ${selectedType.name}`;
      setError(errorMsg);
      setLoading(false);
      return;
    }
    
    // Compte bancaire obligatoire seulement pour Banque et Caisse
    if (selectedType && (selectedType.code === 'BAN' || selectedType.code === 'CAI') && !formData.bank_account) {
      const errorMsg = `Le compte bancaire est obligatoire pour un journal de type ${selectedType.name}`;
      setError(errorMsg);
      setLoading(false);
      return;
    }

    try {
      // Préparer les données
      const submitData = { ...formData };
      
      // Si entreprise manuelle
      if (!submitData.company && manualCompany.trim()) {
        submitData.company_name = manualCompany.trim();
      }

      // Envoyer à l'API
      await journauxService.create(submitData);
      
      // Succès
      setSuccess('Journal créé avec succès ! Redirection...');
      
      // Rediriger après un délai
      setTimeout(() => {
        navigate('/comptabilite/journaux');
      }, 1500);
      
    } catch (err) {
      console.error('Erreur création journal:', err);
      const errorMessage = err.response?.data?.detail || 
                          err.response?.data?.message || 
                          err.message || 
                          'Erreur lors de la création du journal';
      setError(errorMessage);
      setLoading(false);
    }
  };

  // Gestion des changements de formulaire
  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (error) setError(null);
  };

  // Vérifier si un type est sélectionné
  const isTypeSelected = () => {
    return !!formData.type;
  };

  // Détermine si le compte bancaire doit être obligatoire
  const isBankAccountRequired = () => {
    const selectedType = journalTypes.find(type => type.id === formData.type);
    if (!selectedType) return false;
    return selectedType.code === 'BAN' || selectedType.code === 'CAI';
  };

  // Détermine si le compte par défaut doit être obligatoire
  const isDefaultAccountRequired = () => {
    const selectedType = journalTypes.find(type => type.id === formData.type);
    if (!selectedType) return false;
    return selectedType.code === 'BAN' || selectedType.code === 'CAI';
  };

  // Gérer l'annulation
  const handleCancel = () => {
    navigate('/comptabilite/journaux');
  };

  // Gérer le retour
  const handleBack = () => {
    navigate('/comptabilite/journaux');
  };

  // Gérer la connexion
  const handleLogin = () => {
    navigate('/login', { 
      state: { 
        redirect: '/comptabilite/journaux/create' 
      } 
    });
  };

  // Actions supplémentaires pour l'en-tête
  const additionalActions = authStatus.showLoginPrompt ? [
    {
      label: 'Se connecter',
      onClick: handleLogin,
      variant: 'primary'
    }
  ] : [];

  // Pendant le chargement des données
  if (dataLoading) {
    return (
      <ComptabiliteFormContainer
        title="Créer un journal"
        moduleType="journaux"
        loading={true}
        mode="create"
        showBackButton={true}
        onBack={handleBack}
      />
    );
  }

  return (
    <ComptabiliteFormContainer
      // Configuration
      title="Créer un journal"
      subtitle="Remplissez les informations pour créer un nouveau journal comptable"
      moduleType="journaux"
      
      // Navigation
      onBack={handleBack}
      showBackButton={true}
      
      // États
      loading={false}
      error={error}
      success={success}
      
      // Actions
      onSubmit={handleSubmit}
      onCancel={handleCancel}
      
      // Modes
      mode="create"
      isSubmitting={loading}
      
      // Personnalisation
      submitLabel="Créer le journal"
      cancelLabel="Annuler"
      
      // Actions supplémentaires
      additionalActions={additionalActions}
    >
      {/* Contenu du formulaire - Version ultra compacte */}
      <div className="space-y-3 max-w-4xl mx-auto">
        {!authStatus?.hasCompaniesAccess && companies.length === 0 && (
          <div className="bg-gradient-to-r from-amber-50 to-amber-100 border-l-2 border-amber-500 rounded-r p-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1 bg-amber-100 rounded">
                  <FiAlertCircle className="text-amber-600" size={10} />
                </div>
                <p className="text-amber-800 text-xs font-medium">
                  Liste des entreprises non disponible
                </p>
              </div>
              <button
                type="button"
                onClick={handleLogin}
                className="px-2 py-0.5 bg-amber-600 text-white rounded hover:bg-amber-700 text-xs font-medium"
              >
                Se connecter
              </button>
            </div>
          </div>
        )}
        
        {/* Section unique compacte */}
        <div className="bg-gradient-to-br from-gray-50 to-white rounded-lg border border-gray-200 p-3 shadow-sm">
          {/* Titre compact */}
          <div className="flex items-center gap-1.5 mb-2">
            <div className="w-1 h-3 bg-gradient-to-b from-violet-600 to-violet-400 rounded"></div>
            <h3 className="text-xs font-semibold text-gray-900 uppercase tracking-wide">INFORMATIONS DU JOURNAL</h3>
          </div>
          
          {/* Grille compacte */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {/* Code */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-0.5">
                Code <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.code}
                onChange={(e) => handleChange('code', e.target.value)}
                className="w-full border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent bg-white text-xs"
                placeholder="Ex: VEN, ACH, BAN, CAI..."
                maxLength={8}
              />
            </div>
            
            {/* Type */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-0.5">
                Type <span className="text-red-500">*</span>
              </label>
              <SearchableDropdown
                value={formData.type}
                onChange={(value) => handleChange('type', value)}
                options={journalTypes}
                searchValue={searchType}
                onSearchChange={setSearchType}
                placeholder="Sélectionnez un type..."
                icon={FiType}
                getOptionLabel={(type) => {
                  return `${type.name || 'Sans nom'} (${type.code || 'Sans code'})`;
                }}
                getOptionValue={(type) => type.id}
                required={true}
                size="xs"
              />
            </div>
            
            {/* Nom */}
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-0.5">
                Nom <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className="w-full border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent bg-white text-xs"
                placeholder="Ex: Journal des ventes..."
              />
            </div>
            
            {/* Entreprise */}
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-0.5">
                Entreprise
              </label>
              
              {companies.length > 0 ? (
                <SearchableDropdown
                  value={formData.company}
                  onChange={(value) => handleChange('company', value)}
                  options={companies}
                  searchValue={searchCompany}
                  onSearchChange={setSearchCompany}
                  placeholder="Sélectionnez une entreprise"
                  icon={FiBriefcase}
                  getOptionLabel={(company) => company.raison_sociale || company.nom || 'Sans nom'}
                  getOptionValue={(company) => company.id}
                  size="xs"
                />
              ) : (
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <FiAlertCircle size={8} />
                    <span>Saisie manuelle</span>
                  </div>
                  <input
                    type="text"
                    value={manualCompany}
                    onChange={(e) => setManualCompany(e.target.value)}
                    className="w-full border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent bg-white text-xs"
                    placeholder="Nom de l'entreprise..."
                  />
                </div>
              )}
            </div>
            
            {/* Comptes */}
            <div>
              <label className={`block text-xs font-medium mb-0.5 ${
                !isTypeSelected() || !isDefaultAccountRequired() 
                  ? 'text-gray-700' 
                  : 'text-gray-700'
              }`}>
                Compte par défaut
                {isDefaultAccountRequired() && (
                  <span className="text-red-500">*</span>
                )}
              </label>
              <SearchableDropdown
                value={formData.default_account}
                onChange={(value) => handleChange('default_account', value)}
                options={comptes}
                searchValue={searchCompte}
                onSearchChange={setSearchCompte}
                placeholder={
                  !isTypeSelected() 
                    ? "Sélectionnez d'abord un type" 
                    : isDefaultAccountRequired()
                      ? "Sélectionnez..." 
                      : "Optionnel"
                }
                icon={FiCreditCard}
                getOptionLabel={(compte) => `${compte.code || ''} - ${compte.name || 'Sans nom'}`}
                getOptionValue={(compte) => compte.id}
                required={isDefaultAccountRequired()}
                size="xs"
                disabled={!isTypeSelected()}
                className={
                  !isTypeSelected()
                    ? "opacity-50 cursor-not-allowed bg-gray-100" 
                    : ""
                }
              />
            </div>
            
            <div>
              <label className={`block text-xs font-medium mb-0.5 ${
                !isTypeSelected() || !isBankAccountRequired() 
                  ? 'text-gray-400' 
                  : 'text-gray-700'
              }`}>
                Compte bancaire
                {isBankAccountRequired() && (
                  <span className="text-red-500">*</span>
                )}
              </label>
              <SearchableDropdown
                value={formData.bank_account}
                onChange={(value) => handleChange('bank_account', value)}
                options={banques}
                searchValue={searchBanque}
                onSearchChange={setSearchBanque}
                placeholder={
                  !isTypeSelected() 
                    ? "Sélectionnez d'abord un type" 
                    : isBankAccountRequired()
                      ? "Sélectionnez..." 
                      : "Optionnel"
                }
                icon={FiDatabase}
                getOptionLabel={(banque) => 
                  banque.numero_compte 
                    ? `${banque.banque?.nom || 'Banque'} - ${banque.numero_compte}`
                    : banque.banque?.nom || banque.nom || 'Banque'
                }
                getOptionValue={(banque) => banque.id}
                required={isBankAccountRequired()}
                size="xs"
                disabled={!isTypeSelected()}
                className={
                  !isTypeSelected()
                    ? "opacity-50 cursor-not-allowed bg-gray-100" 
                    : ""
                }
              />
            </div>
            
            {/* Note */}
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-0.5">
                Notes
              </label>
              <textarea
                value={formData.note}
                onChange={(e) => handleChange('note', e.target.value)}
                rows={1}
                className="w-full border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent bg-white text-xs"
                placeholder="Notes additionnelles..."
              />
            </div>
            
            {/* Statut */}
            <div className="md:col-span-2 pt-1 border-t border-gray-100">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="active"
                  checked={formData.active}
                  onChange={(e) => handleChange('active', e.target.checked)}
                  className="w-3 h-3 text-violet-600 rounded focus:ring-violet-500"
                />
                <label htmlFor="active" className="text-xs font-medium text-gray-700">
                  Journal actif
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Indicateur pour les types spéciaux - très compact */}
        {formData.type && isBankAccountRequired() && (
          <div className="bg-gradient-to-r from-amber-50 to-amber-100 border border-amber-200 rounded p-2">
            <div className="flex items-center gap-1.5">
              <FiAlertCircle className="text-amber-600" size={10} />
              <p className="text-amber-800 text-xs">
                <span className="font-medium">Note :</span> Les comptes sont requis pour les journaux Banque/Caisse
              </p>
            </div>
          </div>
        )}
      </div>
    </ComptabiliteFormContainer>
  );
}

// COMPOSANT SEARCHABLE DROPDOWN (version ultra compacte)
function SearchableDropdown({ 
  label, 
  value, 
  onChange, 
  options, 
  searchValue,
  onSearchChange,
  placeholder,
  required = false,
  disabled = false,
  icon: Icon,
  getOptionLabel = (option) => option,
  getOptionValue = (option) => option,
  renderOption = (option) => getOptionLabel(option),
  size = "xs",
  isError = false,
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
    if (!disabled) {
      setIsOpen(!isOpen);
      if (!isOpen) {
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
      button: 'px-2 py-1.5 text-xs',
      input: 'px-2 py-1 text-xs',
      option: 'px-2 py-1 text-xs',
      icon: 'w-2.5 h-2.5'
    },
    small: {
      button: 'px-2 py-1.5 text-xs',
      input: 'px-2 py-1 text-xs',
      option: 'px-2 py-1 text-xs',
      icon: 'w-3 h-3'
    }
  };

  const sizeClass = sizeClasses[size] || sizeClasses.xs;

  return (
    <div className="relative" ref={dropdownRef}>
      {label && (
        <label className="block text-xs font-medium text-gray-700 mb-0.5">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      
      <button
        type="button"
        onClick={handleToggle}
        onMouseDown={(e) => e.preventDefault()}
        disabled={disabled}
        className={`w-full text-left border rounded focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent transition-all ${sizeClass.button} ${className} ${
          disabled 
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-300' 
            : isError
              ? 'border-red-500 bg-red-50 hover:border-red-600'
              : 'bg-white hover:border-gray-400 border-gray-300'
        } ${isOpen ? 'ring-1 ring-violet-500 border-violet-500' : ''}`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            {Icon && <Icon className={disabled ? "text-gray-300" : "text-gray-400"} size={10} />}
            {selectedOption ? (
              <span className={`font-medium truncate text-xs ${disabled ? 'text-gray-400' : 'text-gray-900'}`}>
                {getOptionLabel(selectedOption)}
              </span>
            ) : (
              <span className={`text-xs ${disabled ? 'text-gray-400' : 'text-gray-500'}`}>{placeholder || `Sélectionnez...`}</span>
            )}
          </div>
          <svg className={`transition-transform ${isOpen ? 'transform rotate-180' : ''} ${sizeClass.icon} ${disabled ? 'text-gray-300' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {isOpen && !disabled && (
        <div className="absolute z-50 w-full mt-0.5 bg-white border border-gray-300 rounded shadow-lg overflow-hidden">
          <div className="p-1 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
            <div className="relative">
              <FiSearch className="absolute left-1.5 top-1/2 transform -translate-y-1/2 text-gray-400" size={9} />
              <input
                ref={inputRef}
                type="text"
                value={searchValue}
                onChange={(e) => onSearchChange(e.target.value)}
                className={`w-full pl-6 pr-2 ${sizeClass.input} border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent bg-white`}
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
                <div className="w-5 h-5 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-1">
                  <FiSearch className="text-gray-400" size={9} />
                </div>
                <p className="text-gray-500 text-xs">Aucun résultat</p>
              </div>
            ) : (
              <div>
                {filteredOptions.map((option, index) => (
                  <div
                    key={index}
                    className={`${sizeClass.option} cursor-pointer hover:bg-violet-50 transition-colors ${
                      value === getOptionValue(option) ? 'bg-gradient-to-r from-violet-50 to-violet-100 text-violet-700 font-medium' : 'text-gray-700'
                    } ${index < filteredOptions.length - 1 ? 'border-b border-gray-100' : ''}`}
                    onClick={() => handleOptionClick(getOptionValue(option))}
                  >
                    {renderOption(option)}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {selectedOption && !isOpen && (
        <p className="text-xs text-emerald-600 mt-0.5 flex items-center gap-0.5">
          <FiCheck size={7} />
          <span className="truncate">{getOptionLabel(selectedOption)}</span>
        </p>
      )}
    </div>
  );
}