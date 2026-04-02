// src/components/EntityFormModal.jsx
import React, { useState, useEffect, useRef } from 'react';
import {
  FiX,
  FiSave,
  FiUserPlus,
  FiMapPin,
  FiGlobe,
  FiMail,
  FiPhone,
  FiHome,
  FiFileText,
  FiDollarSign,
  FiFlag,
  FiSettings,
  FiUsers,
  FiSearch,
  FiChevronDown,
  FiChevronUp,
  FiCalendar,
  FiCheck,
  FiActivity,
  FiUser,
  FiMap,
  FiRefreshCw
} from 'react-icons/fi';
import { TbBuildingSkyscraper } from "react-icons/tb";
import { apiClient } from '../services/apiClient';

// UTILITAIRES TÉLÉPHONE
const validatePhoneByCountry = (phone, countryData) => {
  if (!phone || !countryData) return { valid: true, message: '' };
  const indicatif = (countryData.indicatif_tel || countryData.code_tel || '').replace('+', '');
  let phoneNumber = phone.replace(/\s+/g, '');
  if (phoneNumber.startsWith(`+${indicatif}`) || phoneNumber.startsWith(indicatif)) {
    phoneNumber = phoneNumber.replace(`+${indicatif}`, '').replace(indicatif, '');
  }
  if (countryData.code_iso === 'TG') {
    if (phoneNumber.length !== 8) {
      return { valid: false, message: `Le numéro togolais doit avoir 8 chiffres (format: ${indicatif} XX XX XX XX)` };
    }
    if (!/^\d{8}$/.test(phoneNumber)) {
      return { valid: false, message: 'Le numéro ne doit contenir que des chiffres' };
    }
  }
  if (['CI', 'BJ'].includes(countryData.code_iso)) {
    if (phoneNumber.length !== 8) {
      return { valid: false, message: `Le numéro doit avoir 8 chiffres (format: ${indicatif} XX XX XX XX)` };
    }
  }
  if (countryData.code_iso === 'FR') {
    if (phoneNumber.length !== 9) {
      return { valid: false, message: `Le numéro français doit avoir 9 chiffres (format: ${indicatif} X XX XX XX XX)` };
    }
  }
  if (phoneNumber.length < 4) {
    return { valid: false, message: 'Numéro trop court (minimum 4 chiffres)' };
  }
  if (!/^\d+$/.test(phoneNumber)) {
    return { valid: false, message: 'Le numéro ne doit contenir que des chiffres' };
  }
  return { valid: true, message: '' };
};

const formatPhoneDisplay = (phone, countryData) => {
  if (!phone || !countryData) return phone;
  const indicatif = (countryData.indicatif_tel || countryData.code_tel || '').replace('+', '');
  let phoneNumber = phone.replace(/\s+/g, '');
  if (phoneNumber.startsWith(`+${indicatif}`) || phoneNumber.startsWith(indicatif)) {
    phoneNumber = phoneNumber.replace(`+${indicatif}`, '').replace(indicatif, '');
  }
  if (['TG', 'CI', 'BJ'].includes(countryData.code_iso)) {
    if (phoneNumber.length === 8) {
      return `+${indicatif} ${phoneNumber.substring(0, 2)} ${phoneNumber.substring(2, 4)} ${phoneNumber.substring(4, 6)} ${phoneNumber.substring(6, 8)}`;
    }
  } else if (countryData.code_iso === 'FR') {
    if (phoneNumber.length === 9) {
      return `+${indicatif} ${phoneNumber.charAt(0)} ${phoneNumber.substring(1, 3)} ${phoneNumber.substring(3, 5)} ${phoneNumber.substring(5, 7)} ${phoneNumber.substring(7, 9)}`;
    }
  }
  return `+${indicatif} ${phoneNumber}`;
};

// COMPOSANT RÉUTILISABLE DE RECHERCHE
const SearchableDropdown = ({
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
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);

  const filteredOptions = options.filter(option =>
    getOptionLabel(option).toLowerCase().includes(searchValue.toLowerCase())
  );

  const selectedOption = options.find(opt => getOptionValue(opt) === value);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        onSearchChange('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onSearchChange]);

  const handleToggle = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
      if (!isOpen) {
        setTimeout(() => inputRef.current?.focus(), 0);
      } else {
        onSearchChange('');
      }
    }
  };

  const handleOptionClick = (optionValue) => {
    onChange(optionValue);
    setIsOpen(false);
    onSearchChange('');
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {label && (
        <label className="block text-xs font-medium text-gray-700 mb-1">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <button
        type="button"
        onClick={handleToggle}
        disabled={disabled}
        className={`w-full text-left border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 ${
          disabled
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
            : 'bg-white hover:border-gray-400'
        } ${isOpen ? 'ring-1 ring-violet-500 border-violet-500' : 'focus:ring-violet-500 focus:border-transparent'} transition-colors`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {Icon && <Icon size={16} className="text-gray-400" />}
            {selectedOption ? (
              <span className="text-gray-900 font-medium truncate">{getOptionLabel(selectedOption)}</span>
            ) : (
              <span className="text-gray-400 truncate">{placeholder}</span>
            )}
          </div>
          {isOpen ? <FiChevronUp size={16} className="text-gray-400" /> : <FiChevronDown size={16} className="text-gray-400" />}
        </div>
      </button>

      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto">
          <div className="p-2 border-b border-gray-100">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={14} />
              <input
                ref={inputRef}
                type="text"
                value={searchValue}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full pl-8 pr-4 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-violet-500"
                placeholder="Rechercher..."
                autoFocus
              />
            </div>
          </div>
          <div className="py-1">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option, index) => (
                <div
                  key={index}
                  className="px-4 py-2 text-sm cursor-pointer hover:bg-violet-50 flex items-center gap-2 transition-colors"
                  onClick={() => handleOptionClick(getOptionValue(option))}
                >
                  {getOptionLabel(option)}
                </div>
              ))
            ) : (
              <div className="px-4 py-2 text-sm text-gray-500">Aucun résultat</div>
            )}
          </div>
        </div>
      )}

      {selectedOption && !isOpen && (
        <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
          <FiCheck size={12} />
          Sélectionné: <span className="font-medium truncate">{getOptionLabel(selectedOption)}</span>
        </p>
      )}
    </div>
  );
};

// Données fixes
const secteursActivite = [
  "Agriculture", "Agroalimentaire", "Artisanat", "Assurance", "Automobile",
  "Bancaire", "Bâtiment et Travaux Publics", "Commerce", "Communication",
  "Construction", "Consulting", "Distribution", "Éducation", "Énergie",
  "Finance", "Immobilier", "Industrie", "Informatique et Technologie",
  "Logistique", "Médical et Santé", "Restaurant et Hôtellerie", "Services",
  "Tourisme", "Transport", "Autre"
];
const formesJuridiques = [
  "Entreprise Individuelle (EI)",
  "Entreprise Unipersonnelle à Responsabilité Limitée (EURL)",
  "Société à Responsabilité Limitée (SARL)",
  "Société Anonyme (SA)",
  "Société par Actions Simplifiée (SAS)",
  "Société par Actions Simplifiée Unipersonnelle (SASU)",
  "Société en Nom Collectif (SNC)",
  "Société Civile",
  "Groupement d'Intérêt Economique (GIE)",
  "Société Coopérative",
  "Association",
  "Fondation",
  "Autre"
];

// COMPOSANT PRINCIPAL
export default function EntityFormModal({ 
  entity, 
  users = [], 
  pays, 
  devises, 
  langues, 
  onClose, 
  onSuccess 
}) {
  const isEditing = !!entity;
  const initialData = isEditing
    ? {
        ...entity,
        pays_id: entity.pays?.id || null,
        subdivision_id: entity.subdivision?.id || null,
        ville_id: entity.ville?.id || null,
        devise_id: entity.devise?.id || null,
        langue_id: entity.langue?.id || null,
        cree_par_id: entity.cree_par?.id || null,
        activite_autre: '',
        forme_juridique_autre: '',
      }
    : {
        raison_sociale: '',
        activite: '',
        activite_autre: '',
        forme_juridique: '',
        forme_juridique_autre: '',
        capital_social: '',
        date_creation: new Date().toISOString().split('T')[0],
        registre_commerce: '',
        numero_fiscal: '',
        securite_sociale: '',
        adresse: '',
        complement_adresse: '',
        code_postal: '',
        pays_id: null,
        subdivision_id: null,
        ville_id: null,
        telephone: '',
        email: '',
        site_web: '',
        devise_id: null,
        langue_id: null,
        parent_id: null,
        statut: true,
        cree_par_id: null,
      };

  const [formData, setFormData] = useState(initialData);
  const [errors, setErrors] = useState({});
  const [subdivisions, setSubdivisions] = useState([]);
  const [villes, setVilles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [phoneError, setPhoneError] = useState('');
  const [showAutreActivite, setShowAutreActivite] = useState(false);
  const [showAutreFormeJuridique, setShowAutreFormeJuridique] = useState(false);
  const [selectedPays, setSelectedPays] = useState(null);
  const [indicatif, setIndicatif] = useState('');

  // États pour la recherche
  const [searchPays, setSearchPays] = useState('');
  const [searchSubdivision, setSearchSubdivision] = useState('');
  const [searchVille, setSearchVille] = useState('');
  const [searchDevise, setSearchDevise] = useState('');
  const [searchLangue, setSearchLangue] = useState('');
  const [searchUser, setSearchUser] = useState('');
  const [searchActivite, setSearchActivite] = useState('');
  const [searchFormeJuridique, setSearchFormeJuridique] = useState('');

  // S'assurer que les données sont des tableaux
  const paysArray = Array.isArray(pays) ? pays : [];
  const devisesArray = Array.isArray(devises) ? devises : [];
  const languesArray = Array.isArray(langues) ? langues : [];

  // Charger subdivisions quand pays change
  useEffect(() => {
    if (formData.pays_id) {
      const selectedPays = paysArray.find(p => p.id === formData.pays_id);
      if (selectedPays) {
        setSelectedPays(selectedPays);
        setIndicatif(selectedPays.indicatif_tel || selectedPays.code_tel || '');
        
        const fetchSubdivisions = async () => {
          try {
            const response = await apiClient.get(`/subdivisions/?pays=${formData.pays_id}`);
            const data = Array.isArray(response)
              ? response
              : (response?.results || response?.data || []);
            setSubdivisions(data);
            setFormData(prev => ({ ...prev, subdivision_id: null, ville_id: null }));
            setVilles([]);
          } catch (err) {
            console.error('Erreur chargement subdivisions:', err);
            setSubdivisions([]);
          }
        };
        fetchSubdivisions();
      } else {
        setSubdivisions([]);
        setVilles([]);
      }
    } else {
      setSubdivisions([]);
      setVilles([]);
      setSelectedPays(null);
      setIndicatif('');
    }
  }, [formData.pays_id, paysArray]);

  // Charger villes quand subdivision change
  useEffect(() => {
    if (formData.subdivision_id) {
      const fetchVilles = async () => {
        try {
          const response = await apiClient.get(`/villes/?subdivision=${formData.subdivision_id}`);
          const data = Array.isArray(response)
            ? response
            : (response?.results || response?.data || []);
          setVilles(data);
          setFormData(prev => ({ ...prev, ville_id: null }));
        } catch (err) {
          console.error('Erreur chargement villes:', err);
          setVilles([]);
        }
      };
      fetchVilles();
    } else {
      setVilles([]);
    }
  }, [formData.subdivision_id]);

  // Gestion du choix "Autre"
  useEffect(() => {
    setShowAutreActivite(formData.activite === 'Autre');
    setShowAutreFormeJuridique(formData.forme_juridique === 'Autre');
  }, [formData.activite, formData.forme_juridique]);

  // Définir cree_par automatiquement en création
  useEffect(() => {
    if (!isEditing) {
      const userJson = localStorage.getItem('user');
      if (userJson) {
        try {
          const user = JSON.parse(userJson);
          setFormData(prev => ({ ...prev, cree_par_id: user.id }));
        } catch (e) {
          console.warn('Impossible de parser user depuis localStorage');
        }
      }
    }
  }, [isEditing]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
    if (field === 'telephone') {
      setPhoneError('');
    }
  };

  const validate = () => {
    const newErrors = {};
    const requiredFields = ['raison_sociale', 'activite', 'adresse', 'telephone', 'email', 'pays_id'];
    
    requiredFields.forEach(field => {
      if (!formData[field]) {
        newErrors[field] = 'Ce champ est requis';
      }
    });

    if (showAutreActivite && !formData.activite_autre.trim()) {
      newErrors.activite_autre = 'Ce champ est requis';
    }

    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email invalide';
    }

    if (formData.telephone && selectedPays) {
      const validation = validatePhoneByCountry(formData.telephone, selectedPays);
      if (!validation.valid) {
        newErrors.telephone = validation.message;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    if (formData.telephone && selectedPays) {
      const validation = validatePhoneByCountry(formData.telephone, selectedPays);
      if (!validation.valid) {
        setPhoneError(validation.message);
        return;
      }
    }

    setLoading(true);
    try {
      const cleanData = { ...formData };
      if (cleanData.capital_social === '') cleanData.capital_social = null;
      if (cleanData.date_creation === '') cleanData.date_creation = null;
      if (cleanData.parent_id === '') cleanData.parent_id = null;
      if (cleanData.complement_adresse === '') delete cleanData.complement_adresse;
      if (cleanData.site_web === '') delete cleanData.site_web;

      const payload = {
        ...cleanData,
        activite: showAutreActivite ? formData.activite_autre : formData.activite,
        forme_juridique: showAutreFormeJuridique ? formData.forme_juridique_autre : formData.forme_juridique,
        pays: formData.pays_id,
        subdivision: formData.subdivision_id || null,
        ville: formData.ville_id || null,
        devise: formData.devise_id || null,
        langue: formData.langue_id || null,
        cree_par: formData.cree_par_id || null,
      };

      delete payload.activite_autre;
      delete payload.forme_juridique_autre;

      if (isEditing) {
        await apiClient.put(`/entites/${entity.id}/`, payload);
      } else {
        await apiClient.post('/entites/', payload);
      }

      onSuccess();
    } catch (error) {
      console.error('Erreur API:', error);
      let errorMsg = 'Erreur lors de la sauvegarde.';
      if (error.response?.data) {
        const data = error.response.data;
        if (typeof data === 'string') {
          errorMsg = data;
        } else if (data.email) {
          errorMsg = `Email: ${Array.isArray(data.email) ? data.email[0] : data.email}`;
        } else if (data.telephone) {
          errorMsg = `Téléphone: ${Array.isArray(data.telephone) ? data.telephone[0] : data.telephone}`;
        } else if (data.non_field_errors) {
          errorMsg = Array.isArray(data.non_field_errors) ? data.non_field_errors[0] : data.non_field_errors;
        } else {
          const firstField = Object.keys(data)[0];
          errorMsg = `${firstField}: ${Array.isArray(data[firstField]) ? data[firstField][0] : data[firstField]}`;
        }
      }
      alert(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-gray-200 shadow-xl">
        <div className="sticky top-0 bg-gradient-to-r from-violet-600 to-violet-500 text-white rounded-t-lg p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-white/20 backdrop-blur-sm rounded">
                <TbBuildingSkyscraper className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold">
                  {isEditing ? 'Modifier l\'entité' : 'Créer une nouvelle entité'}
                </h2>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-white/20 rounded transition-colors"
              aria-label="Fermer"
            >
              <FiX size={18} />
            </button>
          </div>
        </div>

        {Object.keys(errors).length > 0 && (
          <div className="mx-4 mt-3 bg-gradient-to-r from-red-50 to-red-100 border-l-3 border-red-500 rounded-r-lg p-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-red-100 rounded">
                <FiX className="text-red-600" size={14} />
              </div>
              <span className="text-red-800 text-xs font-medium">
                Veuillez corriger les erreurs avant de soumettre
              </span>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Section 1: Informations de Base */}
          <div className="bg-gradient-to-br from-gray-50 to-white rounded-lg p-3 border border-gray-200">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-4 bg-gradient-to-b from-violet-600 to-violet-400 rounded"></div>
              <h3 className="text-sm font-semibold text-gray-900">Informations de Base</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Raison sociale <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <FiHome className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={formData.raison_sociale}
                    onChange={(e) => handleChange('raison_sociale', e.target.value)}
                    className={`w-full pl-9 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-1 ${
                      errors.raison_sociale ? 'focus:ring-red-500 border-red-300' : 'focus:ring-violet-500 border-gray-300'
                    }`}
                    placeholder="Ex: SARL SOMANE"
                  />
                </div>
                {errors.raison_sociale && <p className="mt-1 text-xs text-red-600">{errors.raison_sociale}</p>}
              </div>

              <div className="md:col-span-2">
                <SearchableDropdown
                  label="Secteur d'Activité"
                  value={formData.activite}
                  onChange={(value) => handleChange('activite', value)}
                  options={secteursActivite}
                  searchValue={searchActivite}
                  onSearchChange={setSearchActivite}
                  placeholder="Sélectionnez un secteur d'activité"
                  required={true}
                  icon={FiActivity}
                />
                {errors.activite && <p className="mt-1 text-xs text-red-600">{errors.activite}</p>}
                
                {showAutreActivite && (
                  <div className="mt-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Précisez le secteur d'activité <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.activite_autre}
                      onChange={(e) => handleChange('activite_autre', e.target.value)}
                      className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 ${
                        errors.activite_autre ? 'focus:ring-red-500 border-red-300' : 'focus:ring-violet-500 border-gray-300'
                      }`}
                      placeholder="Secteur d'activité"
                    />
                    {errors.activite_autre && <p className="mt-1 text-xs text-red-600">{errors.activite_autre}</p>}
                  </div>
                )}
              </div>

              <div>
                <SearchableDropdown
                  label="Forme juridique"
                  value={formData.forme_juridique}
                  onChange={(value) => handleChange('forme_juridique', value)}
                  options={formesJuridiques}
                  searchValue={searchFormeJuridique}
                  onSearchChange={setSearchFormeJuridique}
                  placeholder="Sélectionnez une forme juridique"
                  icon={FiFileText}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Capital social</label>
                <div className="relative">
                  <FiDollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="number"
                    value={formData.capital_social || ''}
                    onChange={(e) => handleChange('capital_social', e.target.value || '')}
                    className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-violet-500"
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Date de création</label>
                <div className="relative">
                  <FiCalendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="date"
                    value={formData.date_creation || ''}
                    onChange={(e) => handleChange('date_creation', e.target.value || '')}
                    className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-violet-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Localisation */}
          <div className="bg-gradient-to-br from-blue-50 to-white rounded-lg p-3 border border-blue-100">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-4 bg-gradient-to-b from-blue-600 to-blue-400 rounded"></div>
              <h3 className="text-sm font-semibold text-gray-900">Localisation</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <SearchableDropdown
                  label="Pays"
                  value={formData.pays_id}
                  onChange={(value) => handleChange('pays_id', value)}
                  options={paysArray}
                  searchValue={searchPays}
                  onSearchChange={setSearchPays}
                  placeholder="Sélectionner un pays"
                  required={true}
                  icon={FiGlobe}
                  getOptionLabel={(paysItem) => `${paysItem.emoji || '🌍'} ${paysItem.nom_fr || paysItem.nom} (${paysItem.code_iso})`}
                  getOptionValue={(paysItem) => paysItem.id}
                />
                {errors.pays_id && <p className="mt-1 text-xs text-red-600">{errors.pays_id}</p>}
              </div>

              <div>
                <SearchableDropdown
                  label="Subdivision / Région"
                  value={formData.subdivision_id}
                  onChange={(value) => handleChange('subdivision_id', value)}
                  options={subdivisions}
                  searchValue={searchSubdivision}
                  onSearchChange={setSearchSubdivision}
                  placeholder={formData.pays_id ? "Sélectionner..." : "Choisir un pays d'abord"}
                  icon={FiMap}
                  disabled={!formData.pays_id}
                  getOptionLabel={(sub) => `${sub.nom} (${sub.type_subdivision})`}
                  getOptionValue={(sub) => sub.id}
                />
              </div>

              <div>
                <SearchableDropdown
                  label="Ville"
                  value={formData.ville_id}
                  onChange={(value) => handleChange('ville_id', value)}
                  options={villes}
                  searchValue={searchVille}
                  onSearchChange={setSearchVille}
                  placeholder={formData.subdivision_id ? "Sélectionner..." : "Choisir une région d'abord"}
                  icon={FiMapPin}
                  disabled={!formData.subdivision_id}
                  getOptionLabel={(ville) => `${ville.nom} ${ville.code_postal ? `(${ville.code_postal})` : ''}`}
                  getOptionValue={(ville) => ville.id}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Code postal</label>
                <input
                  type="text"
                  value={formData.code_postal}
                  onChange={(e) => handleChange('code_postal', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Ex: 01 BP 123"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Adresse principale <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.adresse}
                  onChange={(e) => handleChange('adresse', e.target.value)}
                  rows={2}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-1 ${
                    errors.adresse ? 'focus:ring-red-500 border-red-300' : 'focus:ring-blue-500 border-gray-300'
                  }`}
                  placeholder="Ex: 123 Avenue des Nations Unies"
                />
                {errors.adresse && <p className="mt-1 text-xs text-red-600">{errors.adresse}</p>}
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">Complément d'adresse</label>
                <input
                  type="text"
                  value={formData.complement_adresse}
                  onChange={(e) => handleChange('complement_adresse', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Bâtiment, étage..."
                />
              </div>
            </div>
          </div>

          {/* Section 3: Contact */}
          <div className="bg-gradient-to-br from-cyan-50 to-white rounded-lg p-3 border border-cyan-100">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-4 bg-gradient-to-b from-cyan-600 to-cyan-400 rounded"></div>
              <h3 className="text-sm font-semibold text-gray-900">Contact</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Téléphone <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <FiPhone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="tel"
                    value={formData.telephone}
                    onChange={(e) => handleChange('telephone', e.target.value)}
                    className={`w-full pl-9 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-1 ${
                      errors.telephone || phoneError ? 'focus:ring-red-500 border-red-300' : 'focus:ring-cyan-500 border-gray-300'
                    }`}
                    placeholder="Ex: 22 12 34 56"
                  />
                </div>
                {(errors.telephone || phoneError) && (
                  <p className="mt-1 text-xs text-red-600">{errors.telephone || phoneError}</p>
                )}
                {formData.telephone && selectedPays && (
                  <p className="mt-1 text-xs text-green-600 flex items-center gap-1">
                    <FiCheck size={10} />
                    Format: {formatPhoneDisplay(formData.telephone, selectedPays)}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Email <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <FiMail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    className={`w-full pl-9 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-1 ${
                      errors.email ? 'focus:ring-red-500 border-red-300' : 'focus:ring-cyan-500 border-gray-300'
                    }`}
                    placeholder="contact@entreprise.com"
                  />
                </div>
                {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">Site web</label>
                <div className="relative">
                  <FiGlobe className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="url"
                    value={formData.site_web}
                    onChange={(e) => handleChange('site_web', e.target.value)}
                    className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-cyan-500"
                    placeholder="https://www.entreprise.com"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Informations Légales */}
          <div className="bg-gradient-to-br from-purple-50 to-white rounded-lg p-3 border border-purple-100">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-4 bg-gradient-to-b from-purple-600 to-purple-400 rounded"></div>
              <h3 className="text-sm font-semibold text-gray-900">Informations Légales</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Registre de commerce</label>
                <input
                  type="text"
                  value={formData.registre_commerce}
                  onChange={(e) => handleChange('registre_commerce', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500"
                  placeholder="RC-XXXXXX"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Numéro fiscal</label>
                <input
                  type="text"
                  value={formData.numero_fiscal}
                  onChange={(e) => handleChange('numero_fiscal', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500"
                  placeholder="IF-XXXXXX"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Sécurité sociale</label>
                <input
                  type="text"
                  value={formData.securite_sociale}
                  onChange={(e) => handleChange('securite_sociale', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500"
                  placeholder="CNSS-XXXXXX"
                />
              </div>
            </div>
          </div>

          {/* Section 5: Paramètres */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-gradient-to-br from-emerald-50 to-white rounded-lg p-3 border border-emerald-100">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-1 h-4 bg-gradient-to-b from-emerald-600 to-emerald-400 rounded"></div>
                <h3 className="text-sm font-semibold text-gray-900">Devise</h3>
              </div>
              <SearchableDropdown
                options={devisesArray}
                value={formData.devise_id}
                onChange={(value) => handleChange('devise_id', value)}
                searchValue={searchDevise}
                onSearchChange={setSearchDevise}
                placeholder="Sélectionner une devise"
                icon={FiDollarSign}
                getOptionLabel={(devise) => `${devise.code} - ${devise.nom} (${devise.symbole})`}
                getOptionValue={(devise) => devise.id}
              />
            </div>

            <div className="bg-gradient-to-br from-amber-50 to-white rounded-lg p-3 border border-amber-100">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-1 h-4 bg-gradient-to-b from-amber-600 to-amber-400 rounded"></div>
                <h3 className="text-sm font-semibold text-gray-900">Langue</h3>
              </div>
              <SearchableDropdown
                options={languesArray}
                value={formData.langue_id}
                onChange={(value) => handleChange('langue_id', value)}
                searchValue={searchLangue}
                onSearchChange={setSearchLangue}
                placeholder="Sélectionner une langue"
                icon={FiFlag}
                getOptionLabel={(langue) => `${langue.nom} (${langue.code})`}
                getOptionValue={(langue) => langue.id}
              />
            </div>

            <div className="bg-gradient-to-br from-violet-50 to-white rounded-lg p-3 border border-violet-100">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-1 h-4 bg-gradient-to-b from-violet-600 to-violet-400 rounded"></div>
                <h3 className="text-sm font-semibold text-gray-900">Statut</h3>
              </div>
              <select
                value={formData.statut}
                onChange={(e) => handleChange('statut', e.target.value === 'true')}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-violet-500"
              >
                <option value={true}>Active</option>
                <option value={false}>Inactive</option>
              </select>
            </div>
          </div>

          {/* Section 6: Administration */}
          <div className="bg-gradient-to-br from-gray-50 to-white rounded-lg p-3 border border-gray-200">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-4 bg-gradient-to-b from-gray-600 to-gray-400 rounded"></div>
              <h3 className="text-sm font-semibold text-gray-900">Administration</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Créé par</label>
                {isEditing ? (
                  <SearchableDropdown
                    options={users}
                    value={formData.cree_par_id}
                    onChange={(value) => handleChange('cree_par_id', value)}
                    searchValue={searchUser}
                    onSearchChange={setSearchUser}
                    placeholder="Sélectionner un utilisateur"
                    icon={FiUsers}
                    getOptionLabel={(user) => user.email}
                    getOptionValue={(user) => user.id}
                  />
                ) : (
                  <div className="relative">
                    <FiUser className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')).email : "Utilisateur connecté"}
                      disabled
                      className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ACTIONS */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors font-medium border border-gray-300 text-sm"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-700 hover:to-violet-600 text-white rounded-lg transition-colors font-medium flex items-center gap-2 disabled:opacity-50 shadow text-sm"
            >
              {loading ? (
                <span>Enregistrement...</span>
              ) : isEditing ? (
                <>
                  <FiSave size={14} />
                  Mettre à jour
                </>
              ) : (
                <>
                  <FiUserPlus size={14} />
                  Créer l'entité
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}