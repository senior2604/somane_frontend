import React, { useState, useEffect, useRef } from 'react';
import { 
  FiArrowLeft, FiX, FiCheck, FiAlertCircle, FiType, 
  FiBriefcase, FiCreditCard, FiDatabase, FiBook, FiSearch 
} from "react-icons/fi";
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
  const [comptes, setComptes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchCompany, setSearchCompany] = useState('');
  const [searchType, setSearchType] = useState('');
  const [searchCompte, setSearchCompte] = useState('');
  const [manualCompany, setManualCompany] = useState('');

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Charger le journal à éditer
      const journal = await apiClient.get(`/compta/journals/${id}/`);
      
      // Pré-remplir le formulaire
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
        setJournalTypes(typesRes || []);
      } catch (err) {
        setJournalTypes([]);
      }

      try {
        const companiesRes = await apiClient.get('/entites/');
        setCompanies(companiesRes || []);
      } catch (err) {
        setCompanies([]);
      }

      try {
        const comptesRes = await apiClient.get('/compta/comptes/');
        setComptes(comptesRes || []);
      } catch (err) {
        setComptes([]);
      }

    } catch (err) {
      if (err.status === 404) {
        setError('Journal non trouvé');
      } else {
        setError(`Erreur de chargement: ${err.message || 'Inconnue'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  // Récupérer le type de journal sélectionné
  const getSelectedJournalType = () => {
    return journalTypes.find(type => type.id === formData.type);
  };

  // Détermine si le compte par défaut doit être obligatoire (BAN ou CAI)
  const isDefaultAccountRequired = () => {
    const selectedType = getSelectedJournalType();
    if (!selectedType) return false;
    return selectedType.code === 'BAN' || selectedType.code === 'CAI';
  };

  // Vérifier si un type est sélectionné
  const isTypeSelected = () => {
    return !!formData.type;
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitLoading(true);
    setError(null);

    // Validation de base
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
    const selectedType = getSelectedJournalType();
    
    // Compte par défaut obligatoire seulement pour Banque et Caisse
    if (isDefaultAccountRequired() && !formData.default_account) {
      const typeName = selectedType?.name || 'Banque/Caisse';
      setError(`Le compte par défaut est obligatoire pour un journal de type ${typeName}`);
      setSubmitLoading(false);
      return;
    }

    try {
      // Préparer les données
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

      // Si company_name est fourni (entreprise manuelle)
      if (!formData.company && manualCompany.trim()) {
        submitData.company_name = manualCompany.trim();
      }

      await apiClient.put(`/compta/journals/${id}/`, submitData);
      navigate(`/comptabilite/journaux/${id}`);
      
    } catch (err) {
      setError(err.message || 'Erreur lors de la mise à jour');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleCancel = () => {
    navigate(`/comptabilite/journaux/${id}`);
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

  if (error?.includes('non trouvé')) {
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
      <div className="max-w-2xl mx-auto">
        {/* En-tête */}
        <div className="mb-6">
          <button
            onClick={handleCancel}
            className="inline-flex items-center gap-1.5 text-gray-600 hover:text-gray-900 mb-3 text-sm hover:bg-gray-100 px-2 py-1 rounded transition-colors"
          >
            <FiArrowLeft size={14} />
            Retour au journal
          </button>
          
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-gray-900">
                Modifier le journal
              </h1>
              <p className="text-gray-600 mt-1 text-sm">
                Modifiez les informations du journal <span className="font-medium text-violet-700">{formData.code}</span>
              </p>
            </div>
            <div>
              <button
                onClick={handleCancel}
                className="px-3 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50 flex items-center gap-1.5 text-sm transition-colors"
              >
                <FiX size={14} />
                Annuler
              </button>
            </div>
          </div>
        </div>

        {/* Carte principale avec le style JournalForm */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
          <form onSubmit={handleSubmit} className="space-y-3">
            
            {error && (
              <div className="bg-gradient-to-r from-red-50 to-red-100 border-l-2 border-red-500 rounded-r p-2">
                <div className="flex items-center gap-2">
                  <div className="p-1 bg-red-100 rounded">
                    <FiX className="text-red-600" size={12} />
                  </div>
                  <span className="text-red-800 text-xs font-medium">{error}</span>
                </div>
              </div>
            )}
            
            {/* Section 1: Informations de Base */}
            <div className="bg-gradient-to-br from-gray-50 to-white rounded border border-gray-200 p-2">
              <div className="flex items-center gap-1.5 mb-2">
                <div className="w-1 h-3 bg-gradient-to-b from-violet-600 to-violet-400 rounded"></div>
                <h3 className="text-sm font-semibold text-gray-900">Informations de Base</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {/* Code */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-0.5">
                    Code du Journal <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => handleChange('code', e.target.value)}
                    className="w-full border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent bg-white text-sm"
                    placeholder="Ex: VEN, ACH, BAN, CAI..."
                    maxLength={8}
                  />
                </div>
                
                {/* Nom */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-0.5">
                    Nom du Journal <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    className="w-full border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent bg-white text-sm"
                    placeholder="Ex: Journal des ventes..."
                  />
                </div>
                
                {/* Type */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-0.5">
                    Type de Journal <span className="text-red-500">*</span>
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
                    size="small"
                  />
                  {formData.type && isDefaultAccountRequired() && (
                    <p className="text-xs text-amber-600 mt-1">
                      Compte par défaut requis pour ce type
                    </p>
                  )}
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
                    className="w-full border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent bg-white text-sm"
                    placeholder="Notes additionnelles..."
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Entreprise */}
            <div className="bg-gradient-to-br from-green-50 to-white rounded border border-green-100 p-2">
              <div className="flex items-center gap-1.5 mb-2">
                <div className="w-1 h-3 bg-gradient-to-b from-green-600 to-green-400 rounded"></div>
                <h3 className="text-sm font-semibold text-gray-900">Entreprise</h3>
              </div>
              
              <div>
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
                    size="small"
                  />
                ) : (
                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <FiAlertCircle size={10} />
                      <span>Saisie manuelle</span>
                    </div>
                    <input
                      type="text"
                      value={manualCompany}
                      onChange={(e) => setManualCompany(e.target.value)}
                      className="w-full border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent bg-white text-sm"
                      placeholder="Nom de l'entreprise..."
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Section 3: Configuration des Comptes */}
            <div className="bg-gradient-to-br from-blue-50 to-white rounded border border-blue-100 p-2">
              <div className="flex items-center gap-1.5 mb-2">
                <div className="w-1 h-3 bg-gradient-to-b from-blue-600 to-blue-400 rounded"></div>
                <h3 className="text-sm font-semibold text-gray-900">Configuration des Comptes</h3>
              </div>
              
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
                        ? "Sélectionnez un compte par défaut..." 
                        : "Optionnel"
                  }
                  icon={FiCreditCard}
                  getOptionLabel={(compte) => `${compte.code || ''} - ${compte.name || 'Sans nom'}`}
                  getOptionValue={(compte) => compte.id}
                  required={isDefaultAccountRequired()}
                  size="small"
                  disabled={!isTypeSelected()}
                  className={
                    !isTypeSelected()
                      ? "opacity-50 cursor-not-allowed bg-gray-100" 
                      : ""
                  }
                />
              </div>
            </div>

            {/* Section 4: Statut */}
            <div className="bg-gradient-to-br from-amber-50 to-white rounded border border-amber-100 p-2">
              <div className="flex items-center gap-1.5 mb-2">
                <div className="w-1 h-3 bg-gradient-to-b from-amber-600 to-amber-400 rounded"></div>
                <h3 className="text-sm font-semibold text-gray-900">Statut</h3>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="active"
                    checked={formData.active}
                    onChange={(e) => handleChange('active', e.target.checked)}
                    className="w-3.5 h-3.5 text-violet-600 rounded focus:ring-violet-500"
                  />
                  <label htmlFor="active" className="text-xs font-medium text-gray-700">
                    Journal actif
                  </label>
                </div>
              </div>
            </div>
            
            {/* Boutons d'action */}
            <div className="flex justify-end gap-2 pt-2 border-t border-gray-200">
              <button
                type="button"
                onClick={handleCancel}
                className="px-3 py-1 border border-gray-300 rounded text-gray-700 hover:bg-gray-50 transition-all duration-200 font-medium text-sm"
                disabled={submitLoading}
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={submitLoading}
                className="px-3 py-1 bg-gradient-to-r from-violet-600 to-violet-500 text-white rounded hover:from-violet-700 hover:to-violet-600 disabled:opacity-50 transition-all duration-200 font-medium flex items-center gap-1 text-sm"
              >
                {submitLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                    <span>Sauvegarde...</span>
                  </>
                ) : (
                  <>
                    <FiCheck size={12} />
                    <span>Mettre à jour</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Informations additionnelles */}
        <div className="mt-4 text-xs text-gray-500">
          <p>Journal ID: {id} • Dernière mise à jour: {new Date().toLocaleTimeString('fr-FR')}</p>
        </div>
      </div>
    </div>
  );
}

// COMPOSANT SEARCHABLE DROPDOWN (identique à celui de JournalForm)
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
  size = "small",
  isError = false,
  className = ""
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);

  // S'assurer que options est un tableau
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

  // Classes de taille
  const sizeClasses = {
    small: {
      button: 'px-2 py-1.5 text-sm',
      input: 'px-2 py-1.5 text-sm',
      option: 'px-2 py-1.5 text-sm',
      icon: 'w-3.5 h-3.5'
    },
    default: {
      button: 'px-3 py-2 text-sm',
      input: 'px-3 py-2 text-sm',
      option: 'px-3 py-2 text-sm',
      icon: 'w-4 h-4'
    }
  };

  const sizeClass = sizeClasses[size] || sizeClasses.default;

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
          <div className="flex items-center gap-1.5">
            {Icon && <Icon className={disabled ? "text-gray-300" : "text-gray-400"} size={14} />}
            {selectedOption ? (
              <span className={`font-medium truncate ${disabled ? 'text-gray-400' : 'text-gray-900'}`}>
                {getOptionLabel(selectedOption)}
              </span>
            ) : (
              <span className={disabled ? 'text-gray-400' : 'text-gray-500'}>{placeholder || `Sélectionnez...`}</span>
            )}
          </div>
          <svg className={`transition-transform ${isOpen ? 'transform rotate-180' : ''} ${sizeClass.icon} ${disabled ? 'text-gray-300' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {isOpen && !disabled && (
        <div className="absolute z-50 w-full mt-0.5 bg-white border border-gray-300 rounded shadow-lg overflow-hidden">
          <div className="p-1.5 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
            <div className="relative">
              <FiSearch className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" size={12} />
              <input
                ref={inputRef}
                type="text"
                value={searchValue}
                onChange={(e) => onSearchChange(e.target.value)}
                className={`w-full pl-7 pr-2 ${sizeClass.input} border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent bg-white`}
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
              maxHeight: '200px',
              minHeight: '40px'
            }}
          >
            {filteredOptions.length === 0 ? (
              <div className="py-4 text-center">
                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-1">
                  <FiSearch className="text-gray-400" size={12} />
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
          <FiCheck size={10} />
          <span className="truncate">{getOptionLabel(selectedOption)}</span>
        </p>
      )}
    </div>
  );
}