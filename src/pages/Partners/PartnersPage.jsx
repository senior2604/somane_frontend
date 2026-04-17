import React, { useState, useEffect, useCallback, useRef } from 'react';
import { apiClient } from '../../services/apiClient';
import { useEntity } from '../../context/EntityContext';
import {
  FiPlus, FiEdit2, FiTrash2, FiSearch, FiEye,
  FiUserPlus, FiMail, FiCheckCircle, FiXCircle,
  FiAlertCircle, FiRefreshCw, FiChevronLeft, FiChevronRight,
  FiUsers, FiPhone, FiX, FiCheck, FiBriefcase,
  FiSave, FiMapPin, FiGlobe, FiCreditCard, FiUser,
  FiPackage, FiHome, FiChevronDown, FiChevronUp, FiMap
} from "react-icons/fi";

const parseResponse = (response) => {
  if (!response) return [];
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.results)) return response.results;
  if (Array.isArray(response?.partenaires)) return response.partenaires;
  return [];
};

// ============================================================================
// SEARCHABLE DROPDOWN
// ============================================================================
const SearchableDropdown = ({
  label, value, onChange, options, searchValue, onSearchChange,
  placeholder, required = false, disabled = false, icon: Icon,
  getOptionLabel = (o) => o, getOptionValue = (o) => o, errorClass = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);
  const filteredOptions = options.filter(o =>
    getOptionLabel(o).toLowerCase().includes(searchValue.toLowerCase())
  );
  const selectedOption = options.find(o => getOptionValue(o) === value);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
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
      if (!isOpen) setTimeout(() => inputRef.current?.focus(), 0);
      else onSearchChange('');
    }
  };

  const handleOptionClick = (val) => {
    onChange(val);
    setIsOpen(false);
    onSearchChange('');
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <button
        type="button"
        onClick={handleToggle}
        disabled={disabled}
        className={`w-full text-left border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 transition-colors ${
          disabled
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200'
            : 'bg-white hover:border-gray-400'
        } ${isOpen
            ? 'ring-2 ring-violet-500 border-violet-500'
            : errorClass || 'border-gray-300 focus:ring-violet-500'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            {Icon && <Icon size={16} className="text-gray-400 flex-shrink-0" />}
            {selectedOption
              ? <span className="text-gray-900 font-medium truncate">{getOptionLabel(selectedOption)}</span>
              : <span className="text-gray-400 truncate">{placeholder}</span>
            }
          </div>
          {isOpen
            ? <FiChevronUp size={16} className="text-gray-400 flex-shrink-0" />
            : <FiChevronDown size={16} className="text-gray-400 flex-shrink-0" />
          }
        </div>
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-60 overflow-auto">
          <div className="p-2 border-b border-gray-100 sticky top-0 bg-white">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={14} />
              <input
                ref={inputRef}
                type="text"
                value={searchValue}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full pl-8 pr-4 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-violet-500"
                placeholder="Rechercher..."
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>
          <div className="py-1">
            {filteredOptions.length > 0
              ? filteredOptions.map((option, i) => (
                <div
                  key={i}
                  className={`px-4 py-2 text-sm cursor-pointer hover:bg-violet-50 flex items-center gap-2 transition-colors ${
                    getOptionValue(option) === value
                      ? 'bg-violet-50 text-violet-700 font-medium'
                      : 'text-gray-700'
                  }`}
                  onClick={() => handleOptionClick(getOptionValue(option))}
                >
                  {getOptionLabel(option)}
                  {getOptionValue(option) === value && (
                    <FiCheck size={12} className="ml-auto text-violet-600" />
                  )}
                </div>
              ))
              : <div className="px-4 py-3 text-sm text-gray-500 text-center">Aucun résultat</div>
            }
          </div>
        </div>
      )}

      {selectedOption && !isOpen && (
        <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
          <FiCheck size={11} />
          <span className="truncate">{getOptionLabel(selectedOption)}</span>
        </p>
      )}
    </div>
  );
};

// ============================================================================
// HOOK LOCALISATION
// ============================================================================
function useLocationData({ paysId, regionId, open }) {
  const [paysList, setPaysList] = useState([]);
  const [regionsList, setRegionsList] = useState([]);
  const [villesList, setVillesList] = useState([]);

  useEffect(() => {
    if (!open) return;
    let mounted = true;
    apiClient.get('/pays/')
      .then(res => { if (mounted) setPaysList(parseResponse(res)); })
      .catch(console.error);
    return () => { mounted = false; };
  }, [open]);

  useEffect(() => {
    if (!paysId) { setRegionsList([]); setVillesList([]); return; }
    let mounted = true;
    apiClient.get(`/subdivisions/?pays=${paysId}`)
      .then(res => { if (mounted) setRegionsList(parseResponse(res)); })
      .catch(console.error);
    return () => { mounted = false; };
  }, [paysId]);

  useEffect(() => {
    if (!regionId) { setVillesList([]); return; }
    let mounted = true;
    apiClient.get(`/villes/?subdivision=${regionId}`)
      .then(res => { if (mounted) setVillesList(parseResponse(res)); })
      .catch(console.error);
    return () => { mounted = false; };
  }, [regionId]);

  return { paysList, regionsList, villesList };
}

// ============================================================================
// SECTION LOCALISATION — pays, région, ville sont OBLIGATOIRES
// ============================================================================
function LocalisationSection({ formData, setFormData, fieldErrors, setFieldErrors }) {
  const [searchPays, setSearchPays] = useState('');
  const [searchRegion, setSearchRegion] = useState('');
  const [searchVille, setSearchVille] = useState('');

  const { paysList, regionsList, villesList } = useLocationData({
    paysId: formData.pays || null,
    regionId: formData.region || null,
    open: true,
  });

  const clearError = (field) => {
    if (fieldErrors?.[field]) setFieldErrors(prev => ({ ...prev, [field]: null }));
  };

  return (
    <div className="bg-gray-50 bg-opacity-50 rounded-lg p-5 border border-gray-200">
      <h3 className="font-semibold text-gray-900 mb-1 flex items-center gap-2">
        <FiMapPin className="w-5 h-5" />
        Localisation
      </h3>
      <p className="text-xs text-gray-500 mb-4">
        Pays, région et ville sont requis pour la création d'un compte utilisateur.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

        {/* Pays — OBLIGATOIRE */}
        <div>
          <SearchableDropdown
            label="Pays"
            required={true}
            value={formData.pays || null}
            onChange={(v) => {
              setFormData(prev => ({ ...prev, pays: v, region: '', ville: '' }));
              clearError('pays');
            }}
            options={paysList}
            searchValue={searchPays}
            onSearchChange={setSearchPays}
            placeholder="Sélectionnez un pays"
            icon={FiGlobe}
            getOptionLabel={(p) => `${p.emoji || '🌍'} ${p.nom_fr || p.nom} (${p.code_iso})`}
            getOptionValue={(p) => p.id}
            errorClass={fieldErrors?.pays ? 'border-red-500' : ''}
          />
          {fieldErrors?.pays && (
            <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
              <FiAlertCircle className="w-3 h-3" />{fieldErrors.pays}
            </p>
          )}
        </div>

        {/* Région — OBLIGATOIRE */}
        <div>
          <SearchableDropdown
            label="Région / Subdivision"
            required={true}
            value={formData.region || null}
            onChange={(v) => {
              setFormData(prev => ({ ...prev, region: v, ville: '' }));
              clearError('region');
            }}
            options={regionsList}
            searchValue={searchRegion}
            onSearchChange={setSearchRegion}
            placeholder={formData.pays ? "Sélectionnez une région" : "Choisir un pays d'abord"}
            icon={FiMap}
            disabled={!formData.pays}
            getOptionLabel={(r) => `${r.nom} (${r.type_subdivision})`}
            getOptionValue={(r) => r.id}
            errorClass={fieldErrors?.region ? 'border-red-500' : ''}
          />
          {fieldErrors?.region && (
            <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
              <FiAlertCircle className="w-3 h-3" />{fieldErrors.region}
            </p>
          )}
        </div>

        {/* Ville — OBLIGATOIRE */}
        <div>
          <SearchableDropdown
            label="Ville"
            required={true}
            value={formData.ville || null}
            onChange={(v) => {
              setFormData(prev => ({ ...prev, ville: v }));
              clearError('ville');
            }}
            options={villesList}
            searchValue={searchVille}
            onSearchChange={setSearchVille}
            placeholder={formData.region ? "Sélectionnez une ville" : "Choisir une région d'abord"}
            icon={FiMapPin}
            disabled={!formData.region}
            getOptionLabel={(v) => `${v.nom}${v.subdivision_nom ? ` (${v.subdivision_nom})` : ''}`}
            getOptionValue={(v) => v.id}
            errorClass={fieldErrors?.ville ? 'border-red-500' : ''}
          />
          {fieldErrors?.ville && (
            <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
              <FiAlertCircle className="w-3 h-3" />{fieldErrors.ville}
            </p>
          )}
        </div>

        {/* Code postal */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Code postal</label>
          <input
            type="text"
            value={formData.code_postal}
            onChange={(e) => setFormData(prev => ({ ...prev, code_postal: e.target.value }))}
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-violet-500"
            placeholder="00000"
          />
        </div>

        {/* Adresse principale — OBLIGATOIRE */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Adresse principale <span className="text-red-500">*</span>
          </label>
          <textarea
            value={formData.adresse}
            onChange={(e) => {
              setFormData(prev => ({ ...prev, adresse: e.target.value }));
              if (fieldErrors?.adresse) setFieldErrors(prev => ({ ...prev, adresse: null }));
            }}
            className={`w-full border rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-violet-500 transition-colors ${
              fieldErrors?.adresse ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Rue, avenue, quartier..."
            rows="2"
          />
          {fieldErrors?.adresse ? (
            <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
              <FiAlertCircle className="w-3 h-3" />{fieldErrors.adresse}
            </p>
          ) : (
            <p className="mt-1 text-xs text-gray-400">
              Adresse complète nécessaire pour la facturation et la création de compte
            </p>
          )}
        </div>

        {/* Complément d'adresse */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Complément d'adresse
          </label>
          <input
            type="text"
            value={formData.complement_adresse}
            onChange={(e) => setFormData(prev => ({ ...prev, complement_adresse: e.target.value }))}
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-violet-500"
            placeholder="Bâtiment, appartement, BP..."
          />
        </div>

      </div>
    </div>
  );
}

// ============================================================================
// VALIDATION CÔTÉ CLIENT — tous les champs obligatoires
// ============================================================================
function validatePartnerForm(formData) {
  const errors = {};

  // Champs obligatoires de base
  if (!formData.nom?.trim()) {
    errors.nom = 'Le nom / raison sociale est obligatoire';
  }
  if (!formData.type_partenaire) {
    errors.type_partenaire = 'Le type de partenaire est obligatoire';
  }

  // Email — obligatoire (nécessaire pour créer un compte utilisateur)
  if (!formData.email?.trim()) {
    errors.email = "L'email est obligatoire (requis pour la création de compte utilisateur)";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
    errors.email = "L'adresse email n'est pas valide";
  }

  // Téléphone — obligatoire
  if (!formData.telephone?.trim()) {
    errors.telephone = 'Le numéro de téléphone est obligatoire';
  }

  // Localisation — obligatoire
  if (!formData.pays) {
    errors.pays = 'Le pays est obligatoire';
  }
  if (!formData.region) {
    errors.region = 'La région / subdivision est obligatoire';
  }
  if (!formData.ville) {
    errors.ville = 'La ville est obligatoire';
  }

  // Adresse principale — obligatoire
  if (!formData.adresse?.trim()) {
    errors.adresse = "L'adresse principale est obligatoire";
  }

  return errors;
}

// ============================================================================
// INITIAL FORM STATE
// ============================================================================
const INITIAL_FORM = {
  nom: '', type_partenaire: 'client', email: '', telephone: '',
  adresse: '', complement_adresse: '', statut: true, is_company: true,
  ville: '', pays: '', region: '', code_postal: '', site_web: '',
  notes: '', numero_fiscal: '', registre_commerce: '', securite_sociale: '',
  ville_legacy: '', region_legacy: ''
};

const PARTNER_TYPES = [
  { value: 'client', label: 'Client' },
  { value: 'fournisseur', label: 'Fournisseur' },
  { value: 'employe', label: 'Employé' },
  { value: 'debiteur', label: 'Débiteur divers' },
  { value: 'crediteur', label: 'Créditeur divers' },
];

// ============================================================================
// BADGE CHAMPS REQUIS
// ============================================================================
const RequiredBadge = () => (
  <span className="inline-flex items-center gap-1 ml-2 px-1.5 py-0.5 bg-red-50 border border-red-200 rounded text-xs text-red-600 font-normal">
    <FiAlertCircle size={10} />requis
  </span>
);

// ============================================================================
// MODAL CRÉATION
// ============================================================================
function CreatePartnerModal({ open, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const { activeEntity } = useEntity();
  const [formData, setFormData] = useState(INITIAL_FORM);

  useEffect(() => {
    if (open) {
      setFormData(INITIAL_FORM);
      setError(null);
      setFieldErrors({});
    }
  }, [open]);

  const getErrClass = (f) =>
    fieldErrors[f]
      ? 'border-red-500 focus:ring-red-500'
      : 'border-gray-300 focus:ring-violet-500';

  const renderErr = (f) =>
    fieldErrors[f] ? (
      <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
        <FiAlertCircle className="w-3 h-3" />{fieldErrors[f]}
      </p>
    ) : null;

  const handleSubmit = async (e) => {
    e.preventDefault();

    const clientErrors = validatePartnerForm(formData);
    if (Object.keys(clientErrors).length > 0) {
      setFieldErrors(clientErrors);
      setError(
        `Veuillez remplir les ${Object.keys(clientErrors).length} champ(s) obligatoire(s) manquant(s) avant de continuer.`
      );
      // Scroll vers le haut pour voir l'erreur
      document.querySelector('.modal-scroll-area')?.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (!activeEntity?.id) {
      setError('Veuillez sélectionner une entité.');
      return;
    }

    setLoading(true);
    setError(null);
    setFieldErrors({});

    try {
      const requestData = {
        nom: formData.nom.trim(),
        type_partenaire: formData.type_partenaire,
        company_id: activeEntity.id,
        pays: formData.pays ? parseInt(formData.pays) : null,
        region: formData.region ? parseInt(formData.region) : null,
        ville: formData.ville ? parseInt(formData.ville) : null,
        is_company: formData.is_company,
        statut: formData.statut,
        email: formData.email?.trim() || '',
        telephone: formData.telephone?.trim() || '',
        adresse: formData.adresse?.trim() || '',
        complement_adresse: formData.complement_adresse?.trim() || '',
        code_postal: formData.code_postal?.trim() || '',
        site_web: formData.site_web?.trim() || '',
        numero_fiscal: formData.numero_fiscal?.trim() || '',
        registre_commerce: formData.registre_commerce?.trim() || '',
        securite_sociale: formData.securite_sociale?.trim() || '',
        ville_legacy: formData.ville_legacy?.trim() || null,
        region_legacy: formData.region_legacy?.trim() || null,
        notes: formData.notes?.trim() || ''
      };
      await apiClient.post('/partenaires/', requestData);
      onSuccess?.();
      onClose?.();
    } catch (err) {
      const errorData = err?.response?.data;
      if (errorData && typeof errorData === 'object' && !errorData.detail) {
        const fieldErrorMap = {};
        const errorMessages = [];
        Object.entries(errorData).forEach(([field, messages]) => {
          const msg = Array.isArray(messages) ? messages[0] : messages;
          fieldErrorMap[field] = msg;
          errorMessages.push(`${field}: ${msg}`);
        });
        setFieldErrors(fieldErrorMap);
        setError('Erreur de validation : ' + errorMessages.join(' | '));
      } else {
        setError(errorData?.detail || err?.message || 'Erreur lors de la création du partenaire');
      }
    } finally {
      setLoading(false);
    }
  };

  // Calcul du nombre d'erreurs pour affichage
  const errCount = Object.keys(fieldErrors).length;

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-4xl flex flex-col" style={{ maxHeight: '90vh' }}>

        {/* Header */}
        <div className="bg-violet-600 text-white rounded-t-lg p-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white bg-opacity-20 rounded-lg">
                <FiPlus className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-bold text-lg">Nouveau partenaire</h2>
                <p className="text-violet-100 text-sm">
                  {activeEntity?.raison_sociale || 'Sélectionnez une entité'}
                </p>
              </div>
            </div>
            <button
              type="button" onClick={onClose}
              className="p-2 hover:bg-white hover:bg-opacity-20 rounded"
              disabled={loading}
            >
              <FiX size={20} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 modal-scroll-area">

          {/* Alerte entité manquante */}
          {!activeEntity && (
            <div className="mb-6 bg-amber-50 border-l-4 border-amber-500 rounded-r p-4">
              <div className="flex items-start gap-3">
                <FiAlertCircle className="text-amber-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-amber-700 font-medium">Entité requise</p>
                  <p className="text-amber-600 text-sm mt-1">
                    Sélectionnez une entité avant de créer un partenaire
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Alerte erreurs de validation */}
          {error && (
            <div className="mb-6 bg-red-50 border-l-4 border-red-500 rounded-r p-4">
              <div className="flex items-start gap-3">
                <FiAlertCircle className="text-red-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-red-700 font-medium">
                    {errCount > 0 ? `${errCount} champ(s) obligatoire(s) manquant(s)` : 'Erreur de validation'}
                  </p>
                  <p className="text-red-600 text-sm mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Info champs obligatoires */}
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
            <FiAlertCircle className="text-blue-500 flex-shrink-0 mt-0.5" size={15} />
            <p className="text-blue-700 text-sm">
              Les champs marqués <span className="text-red-500 font-bold">*</span> sont obligatoires.
              L'email, le téléphone et la localisation complète sont requis pour la création d'un compte utilisateur.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">

            {/* ── Section 1 : Informations obligatoires ── */}
            <div className="bg-violet-50 bg-opacity-50 rounded-lg p-5 border border-violet-200">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <FiBriefcase className="w-5 h-5 text-violet-600" />
                Informations obligatoires
                <span className="text-sm font-normal text-gray-500 ml-2">(* Champs requis)</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                {/* Nom */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Nom / Raison sociale <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.nom}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, nom: e.target.value }));
                      if (fieldErrors.nom) setFieldErrors(prev => ({ ...prev, nom: null }));
                    }}
                    className={`w-full border rounded-lg px-4 py-2.5 focus:ring-2 transition-colors ${getErrClass('nom')}`}
                    placeholder="Ex: ENTREPRISE SARL"
                    disabled={!activeEntity || loading}
                  />
                  {renderErr('nom')}
                </div>

                {/* Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.type_partenaire}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, type_partenaire: e.target.value }));
                      if (fieldErrors.type_partenaire) setFieldErrors(prev => ({ ...prev, type_partenaire: null }));
                    }}
                    className={`w-full border rounded-lg px-4 py-2.5 focus:ring-2 transition-colors ${getErrClass('type_partenaire')}`}
                    disabled={!activeEntity || loading}
                  >
                    {PARTNER_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                  {renderErr('type_partenaire')}
                </div>

                {/* Type personne */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Type de personne</label>
                  <select
                    value={formData.is_company ? 'company' : 'person'}
                    onChange={(e) => setFormData(prev => ({ ...prev, is_company: e.target.value === 'company' }))}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-violet-500"
                    disabled={!activeEntity || loading}
                  >
                    <option value="company">Entreprise / Organisation</option>
                    <option value="person">Particulier / Personne physique</option>
                  </select>
                </div>

                {/* Statut */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Statut</label>
                  <select
                    value={formData.statut ? 'actif' : 'inactif'}
                    onChange={(e) => setFormData(prev => ({ ...prev, statut: e.target.value === 'actif' }))}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-violet-500"
                    disabled={!activeEntity || loading}
                  >
                    <option value="actif">Actif</option>
                    <option value="inactif">Inactif</option>
                  </select>
                </div>

              </div>
            </div>

            {/* ── Section 2 : Contact (email + tel OBLIGATOIRES) ── */}
            <div className="bg-gray-50 bg-opacity-50 rounded-lg p-5 border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-1 flex items-center gap-2">
                <FiMail className="w-5 h-5" />Contact
              </h3>
              <p className="text-xs text-gray-500 mb-4">
                L'email et le téléphone sont nécessaires pour la création d'un compte utilisateur.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                {/* Email — OBLIGATOIRE */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => {
                        setFormData(prev => ({ ...prev, email: e.target.value }));
                        if (fieldErrors.email) setFieldErrors(prev => ({ ...prev, email: null }));
                      }}
                      className={`w-full pl-9 border rounded-lg px-4 py-2.5 focus:ring-2 transition-colors ${getErrClass('email')}`}
                      placeholder="contact@entreprise.com"
                      disabled={!activeEntity || loading}
                    />
                  </div>
                  {renderErr('email')}
                </div>

                {/* Téléphone — OBLIGATOIRE */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Téléphone <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <FiPhone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
                    <input
                      type="tel"
                      value={formData.telephone}
                      onChange={(e) => {
                        setFormData(prev => ({ ...prev, telephone: e.target.value }));
                        if (fieldErrors.telephone) setFieldErrors(prev => ({ ...prev, telephone: null }));
                      }}
                      className={`w-full pl-9 border rounded-lg px-4 py-2.5 focus:ring-2 transition-colors ${getErrClass('telephone')}`}
                      placeholder="+228 XX XX XX XX"
                      disabled={!activeEntity || loading}
                    />
                  </div>
                  {renderErr('telephone')}
                </div>

                {/* Site web */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Site web</label>
                  <input
                    type="url"
                    value={formData.site_web}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, site_web: e.target.value }));
                      if (fieldErrors.site_web) setFieldErrors(prev => ({ ...prev, site_web: null }));
                    }}
                    className={`w-full border rounded-lg px-4 py-2.5 focus:ring-2 transition-colors ${getErrClass('site_web')}`}
                    placeholder="https://www.entreprise.com"
                    disabled={!activeEntity || loading}
                  />
                  {renderErr('site_web')}
                </div>

              </div>
            </div>

            {/* ── Section 3 : Localisation (pays + région + ville + adresse OBLIGATOIRES) ── */}
            <LocalisationSection
              formData={formData}
              setFormData={setFormData}
              fieldErrors={fieldErrors}
              setFieldErrors={setFieldErrors}
            />

            {/* ── Section 4 : Informations légales ── */}
            <div className="bg-gray-50 bg-opacity-50 rounded-lg p-5 border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <FiHome className="w-5 h-5" />Informations légales
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Numéro fiscal (NIF)</label>
                  <input
                    type="text"
                    value={formData.numero_fiscal}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, numero_fiscal: e.target.value }));
                      if (fieldErrors.numero_fiscal) setFieldErrors(prev => ({ ...prev, numero_fiscal: null }));
                    }}
                    className={`w-full border rounded-lg px-4 py-2.5 focus:ring-2 transition-colors ${getErrClass('numero_fiscal')}`}
                    placeholder="NIF"
                    disabled={!activeEntity || loading}
                  />
                  {renderErr('numero_fiscal')}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Registre de commerce</label>
                  <input
                    type="text"
                    value={formData.registre_commerce}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, registre_commerce: e.target.value }));
                      if (fieldErrors.registre_commerce) setFieldErrors(prev => ({ ...prev, registre_commerce: null }));
                    }}
                    className={`w-full border rounded-lg px-4 py-2.5 focus:ring-2 transition-colors ${getErrClass('registre_commerce')}`}
                    placeholder="RCCM"
                    disabled={!activeEntity || loading}
                  />
                  {renderErr('registre_commerce')}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Sécurité sociale</label>
                  <input
                    type="text"
                    value={formData.securite_sociale}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, securite_sociale: e.target.value }));
                      if (fieldErrors.securite_sociale) setFieldErrors(prev => ({ ...prev, securite_sociale: null }));
                    }}
                    className={`w-full border rounded-lg px-4 py-2.5 focus:ring-2 transition-colors ${getErrClass('securite_sociale')}`}
                    placeholder="N° sécurité sociale"
                    disabled={!activeEntity || loading}
                  />
                  {renderErr('securite_sociale')}
                </div>
              </div>
            </div>

            {/* ── Section 5 : Notes ── */}
            <div className="bg-gray-50 bg-opacity-50 rounded-lg p-5 border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <FiBriefcase className="w-5 h-5" />Notes
              </h3>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-violet-500"
                placeholder="Informations supplémentaires..."
                rows="3"
                disabled={!activeEntity || loading}
              />
            </div>

            {/* ── Boutons ── */}
            <div className="flex justify-end gap-3 pt-6 border-t sticky bottom-0 bg-white pb-2">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors"
                disabled={loading}
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={loading || !activeEntity}
                className={`px-6 py-2.5 rounded-lg font-medium flex items-center gap-2 transition-colors ${
                  loading || !activeEntity
                    ? 'bg-gray-400 cursor-not-allowed text-white'
                    : 'bg-violet-600 hover:bg-violet-700 text-white'
                }`}
              >
                {loading
                  ? <><FiRefreshCw className="animate-spin" />Création en cours...</>
                  : <><FiSave />Créer le partenaire</>
                }
              </button>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MODAL ÉDITION
// ============================================================================
function EditPartnerModal({ open, onClose, partner, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formData, setFormData] = useState(INITIAL_FORM);

  useEffect(() => {
    if (open && partner) {
      setFormData({
        nom: partner.nom || '',
        type_partenaire: partner.type_partenaire || 'client',
        email: partner.email || '',
        telephone: partner.telephone || '',
        adresse: partner.adresse || '',
        complement_adresse: partner.complement_adresse || '',
        statut: partner.statut !== undefined ? partner.statut : true,
        is_company: partner.is_company !== undefined ? partner.is_company : true,
        ville: partner.ville_details?.id ?? '',
        pays: partner.pays_details?.id ?? '',
        region: partner.region_details?.id ?? '',
        code_postal: partner.code_postal || '',
        site_web: partner.site_web || '',
        notes: partner.notes || '',
        numero_fiscal: partner.numero_fiscal || '',
        registre_commerce: partner.registre_commerce || '',
        securite_sociale: partner.securite_sociale || '',
        ville_legacy: partner.ville_legacy || '',
        region_legacy: partner.region_legacy || ''
      });
      setError(null);
      setFieldErrors({});
    }
  }, [open, partner]);

  const getErrClass = (f) =>
    fieldErrors[f]
      ? 'border-red-500 focus:ring-red-500'
      : 'border-gray-300 focus:ring-violet-500';

  const renderErr = (f) =>
    fieldErrors[f] ? (
      <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
        <FiAlertCircle className="w-3 h-3" />{fieldErrors[f]}
      </p>
    ) : null;

  const handleSubmit = async (e) => {
    e.preventDefault();

    const clientErrors = validatePartnerForm(formData);
    if (Object.keys(clientErrors).length > 0) {
      setFieldErrors(clientErrors);
      setError(
        `Veuillez remplir les ${Object.keys(clientErrors).length} champ(s) obligatoire(s) manquant(s).`
      );
      document.querySelector('.edit-modal-scroll')?.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (!partner?.id) { setError('Partenaire invalide'); return; }

    setLoading(true);
    setError(null);
    setFieldErrors({});

    try {
      const requestData = {
        nom: formData.nom.trim(),
        type_partenaire: formData.type_partenaire,
        email: formData.email?.trim() || '',
        telephone: formData.telephone?.trim() || '',
        adresse: formData.adresse?.trim() || '',
        complement_adresse: formData.complement_adresse?.trim() || '',
        statut: formData.statut,
        is_company: formData.is_company,
        pays: formData.pays ? parseInt(formData.pays) : null,
        region: formData.region ? parseInt(formData.region) : null,
        ville: formData.ville ? parseInt(formData.ville) : null,
        code_postal: formData.code_postal?.trim() || '',
        site_web: formData.site_web?.trim() || '',
        notes: formData.notes?.trim() || '',
        numero_fiscal: formData.numero_fiscal?.trim() || '',
        registre_commerce: formData.registre_commerce?.trim() || '',
        securite_sociale: formData.securite_sociale?.trim() || '',
        ville_legacy: formData.ville_legacy?.trim() || null,
        region_legacy: formData.region_legacy?.trim() || null
      };
      await apiClient.put(`/partenaires/${partner.id}/`, requestData);
      onSuccess?.();
      onClose?.();
    } catch (err) {
      const errorData = err?.response?.data;
      if (errorData && typeof errorData === 'object' && !errorData.detail) {
        const fieldErrorMap = {};
        const errorMessages = [];
        Object.entries(errorData).forEach(([field, messages]) => {
          const msg = Array.isArray(messages) ? messages[0] : messages;
          fieldErrorMap[field] = msg;
          errorMessages.push(`${field}: ${msg}`);
        });
        setFieldErrors(fieldErrorMap);
        setError('Erreur de validation : ' + errorMessages.join(' | '));
      } else {
        setError(errorData?.detail || err?.message || 'Erreur lors de la modification');
      }
    } finally {
      setLoading(false);
    }
  };

  const errCount = Object.keys(fieldErrors).length;

  if (!open || !partner) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-4xl flex flex-col" style={{ maxHeight: '90vh' }}>

        <div className="bg-violet-600 text-white rounded-t-lg p-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white bg-opacity-20 rounded-lg">
                <FiEdit2 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-bold text-lg">Modifier le partenaire</h2>
                <p className="text-violet-100 text-sm">{partner.nom}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white hover:bg-opacity-20 rounded"
              disabled={loading}
            >
              <FiX size={20} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 edit-modal-scroll">

          {error && (
            <div className="mb-6 bg-red-50 border-l-4 border-red-500 rounded-r p-4">
              <div className="flex items-start gap-3">
                <FiAlertCircle className="text-red-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-red-700 font-medium">
                    {errCount > 0 ? `${errCount} champ(s) obligatoire(s) manquant(s)` : 'Erreur de validation'}
                  </p>
                  <p className="text-red-600 text-sm mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Info champs obligatoires */}
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
            <FiAlertCircle className="text-blue-500 flex-shrink-0 mt-0.5" size={15} />
            <p className="text-blue-700 text-sm">
              Les champs marqués <span className="text-red-500 font-bold">*</span> sont obligatoires.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">

            {/* ── Section 1 ── */}
            <div className="bg-violet-50 bg-opacity-50 rounded-lg p-5 border border-violet-200">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <FiBriefcase className="w-5 h-5 text-violet-600" />
                Informations obligatoires
                <span className="text-sm font-normal text-gray-500 ml-2">(* Champs requis)</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Nom <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.nom}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, nom: e.target.value }));
                      if (fieldErrors.nom) setFieldErrors(prev => ({ ...prev, nom: null }));
                    }}
                    className={`w-full border rounded-lg px-4 py-2.5 focus:ring-2 transition-colors ${getErrClass('nom')}`}
                    disabled={loading}
                  />
                  {renderErr('nom')}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.type_partenaire}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, type_partenaire: e.target.value }));
                      if (fieldErrors.type_partenaire) setFieldErrors(prev => ({ ...prev, type_partenaire: null }));
                    }}
                    className={`w-full border rounded-lg px-4 py-2.5 focus:ring-2 transition-colors ${getErrClass('type_partenaire')}`}
                    disabled={loading}
                  >
                    {PARTNER_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                  {renderErr('type_partenaire')}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Statut</label>
                  <select
                    value={formData.statut ? 'actif' : 'inactif'}
                    onChange={(e) => setFormData(prev => ({ ...prev, statut: e.target.value === 'actif' }))}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-violet-500"
                    disabled={loading}
                  >
                    <option value="actif">Actif</option>
                    <option value="inactif">Inactif</option>
                  </select>
                </div>

              </div>
            </div>

            {/* ── Section 2 : Contact ── */}
            <div className="bg-gray-50 bg-opacity-50 rounded-lg p-5 border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-1 flex items-center gap-2">
                <FiMail className="w-5 h-5" />Contact
              </h3>
              <p className="text-xs text-gray-500 mb-4">
                Requis pour la création de compte utilisateur.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                {/* Email — OBLIGATOIRE */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => {
                        setFormData(prev => ({ ...prev, email: e.target.value }));
                        if (fieldErrors.email) setFieldErrors(prev => ({ ...prev, email: null }));
                      }}
                      className={`w-full pl-9 border rounded-lg px-4 py-2.5 focus:ring-2 transition-colors ${getErrClass('email')}`}
                      disabled={loading}
                    />
                  </div>
                  {renderErr('email')}
                </div>

                {/* Téléphone — OBLIGATOIRE */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Téléphone <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <FiPhone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
                    <input
                      type="tel"
                      value={formData.telephone}
                      onChange={(e) => {
                        setFormData(prev => ({ ...prev, telephone: e.target.value }));
                        if (fieldErrors.telephone) setFieldErrors(prev => ({ ...prev, telephone: null }));
                      }}
                      className={`w-full pl-9 border rounded-lg px-4 py-2.5 focus:ring-2 transition-colors ${getErrClass('telephone')}`}
                      disabled={loading}
                    />
                  </div>
                  {renderErr('telephone')}
                </div>

              </div>
            </div>

            {/* ── Section 3 : Localisation ── */}
            <LocalisationSection
              formData={formData}
              setFormData={setFormData}
              fieldErrors={fieldErrors}
              setFieldErrors={setFieldErrors}
            />

            {/* ── Boutons ── */}
            <div className="flex justify-end gap-3 pt-6 border-t sticky bottom-0 bg-white pb-2">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors"
                disabled={loading}
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2.5 rounded-lg font-medium bg-violet-600 hover:bg-violet-700 text-white flex items-center gap-2 transition-colors disabled:bg-gray-400"
              >
                {loading
                  ? <><FiRefreshCw className="animate-spin" />Enregistrement...</>
                  : <><FiSave />Enregistrer</>
                }
              </button>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MODAL CRÉATION UTILISATEUR
// ============================================================================
function UserFromPartenaireModal({ open, onClose, partenaire, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [groupesList, setGroupesList] = useState([]);
  const [formData, setFormData] = useState({
    first_name: '', last_name: '', telephone: '',
    groups: [], send_activation_email: true, statut: 'actif'
  });

  useEffect(() => {
    let mounted = true;
    if (open && partenaire) {
      const parts = partenaire?.nom?.split(' ') || [];
      setFormData({
        first_name: parts[0] || '',
        last_name: parts.slice(1).join(' ') || '',
        telephone: partenaire?.telephone || '',
        groups: [], send_activation_email: true, statut: 'actif'
      });
      setError(null);
      setSuccess(false);
      apiClient.get('/groupes/')
        .then(res => { if (mounted) setGroupesList(parseResponse(res)); })
        .catch(console.error);
    }
    return () => { mounted = false; };
  }, [open, partenaire]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (!partenaire?.email) throw new Error('Email manquant sur ce partenaire');
      if (partenaire?.user) throw new Error('Ce partenaire a déjà un compte utilisateur');
      if (!partenaire?.id) throw new Error('Partenaire invalide');
      const response = await apiClient.post('/users/create-from-partenaire/', {
        partenaire: partenaire.id,
        first_name: formData.first_name?.trim() || '',
        last_name: formData.last_name?.trim() || '',
        telephone: formData.telephone?.trim() || '',
        groups: formData.groups,
        send_activation_email: formData.send_activation_email,
        statut: formData.statut
      });
      if (response?.success === false) throw new Error(response.error);
      setSuccess(true);
      setTimeout(() => { onSuccess?.(); onClose?.(); }, 3000);
    } catch (err) {
      const errorData = err?.response?.data;
      let msg = 'Erreur création';
      if (errorData?.email?.[0]) msg = errorData.email[0];
      else if (errorData?.detail) msg = errorData.detail;
      else if (typeof errorData === 'string') msg = errorData;
      else if (err?.message) msg = err.message;
      setError(msg);
    } finally { setLoading(false); }
  };

  const toggleGroup = (id) => {
    setFormData(prev => ({
      ...prev,
      groups: prev.groups.includes(id)
        ? prev.groups.filter(g => g !== id)
        : [...prev.groups, id]
    }));
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-2xl flex flex-col" style={{ maxHeight: '90vh' }}>
        <div className="bg-violet-600 text-white rounded-t-lg p-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white bg-opacity-20 rounded-lg">
                <FiUserPlus className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-bold text-lg">Créer compte</h2>
                <p className="text-violet-100 text-sm">{partenaire?.nom} ({partenaire?.email})</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white hover:bg-opacity-20 rounded"
              disabled={loading && !success}
            >
              <FiX size={20} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {error && (
            <div className="mb-4 bg-red-50 border-l-4 border-red-500 rounded-r p-3">
              <div className="flex items-start gap-2">
                <FiAlertCircle className="text-red-500 mt-0.5" />
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            </div>
          )}

          {success ? (
            <div className="text-center py-6">
              <FiCheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h3 className="font-bold text-xl text-gray-900 mb-2">Compte créé</h3>
              <p className="font-bold text-lg text-violet-600 mb-4">{partenaire?.email}</p>
              {formData.send_activation_email ? (
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <p className="font-medium text-blue-900 mb-2">Email envoyé</p>
                  <p className="text-sm text-blue-700">Lien d'activation envoyé.</p>
                </div>
              ) : (
                <p className="text-amber-600">Activation manuelle requise</p>
              )}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <h4 className="font-medium text-gray-900 mb-2">Email</h4>
                <div className="bg-white rounded p-3">
                  <p className="font-bold text-lg text-blue-700">{partenaire?.email}</p>
                  <label className="flex items-center gap-2 mt-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.send_activation_email}
                      onChange={(e) => setFormData(prev => ({ ...prev, send_activation_email: e.target.checked }))}
                      className="text-violet-600"
                    />
                    <span className="text-sm">Envoyer email d'activation</span>
                  </label>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <h4 className="font-medium text-gray-900 mb-2">Informations</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">
                      Prénom <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.first_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, first_name: e.target.value }))}
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">
                      Nom <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.last_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, last_name: e.target.value }))}
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                      required
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm text-gray-700 mb-1">Téléphone</label>
                    <input
                      type="tel"
                      value={formData.telephone}
                      onChange={(e) => setFormData(prev => ({ ...prev, telephone: e.target.value }))}
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-violet-50 rounded-lg p-4 border border-violet-200">
                <h4 className="font-medium text-gray-900 mb-2">Groupes</h4>
                <div className="max-h-40 overflow-y-auto border border-gray-200 rounded p-2">
                  {groupesList.length === 0 ? (
                    <p className="text-gray-500 text-sm italic">Aucun groupe disponible</p>
                  ) : groupesList.map(g => (
                    <label key={g.id} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.groups.includes(g.id)}
                        onChange={() => toggleGroup(g.id)}
                        className="text-violet-600"
                      />
                      <span className="text-sm text-gray-700">{g.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t sticky bottom-0 bg-white">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
                  disabled={loading}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-violet-600 text-white rounded hover:bg-violet-700 flex items-center gap-2"
                >
                  {loading
                    ? <><FiRefreshCw className="animate-spin" />Création...</>
                    : <><FiUserPlus />Créer</>
                  }
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MODAL DÉTAILS
// ============================================================================
function PartnerDetailModal({ partner, onClose, onCreateUser }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!partner) return null;

  // Vérifie si le partenaire est complet pour créer un compte
  const missingFields = [];
  if (!partner.email) missingFields.push('email');
  if (!partner.telephone) missingFields.push('téléphone');
  if (!partner.pays_details) missingFields.push('pays');
  if (!partner.region_details) missingFields.push('région');
  if (!partner.ville_details) missingFields.push('ville');
  if (!partner.adresse) missingFields.push('adresse');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-3xl flex flex-col" style={{ maxHeight: '90vh' }}>
        <div className="bg-violet-600 text-white rounded-t-lg p-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white bg-opacity-20 rounded-lg">
                <FiBriefcase className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-bold text-lg">{partner.nom}</h2>
                <p className="text-violet-100 text-sm capitalize">
                  {partner.type_partenaire} • {partner.statut ? 'Actif' : 'Inactif'}
                </p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white hover:bg-opacity-20 rounded">
              <FiX size={20} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">

          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 rounded-r p-3">
              <div className="flex items-start gap-2">
                <FiAlertCircle className="text-red-500 mt-0.5" />
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            </div>
          )}

          {/* Alerte champs manquants pour création de compte */}
          {!partner.user && missingFields.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <FiAlertCircle className="text-amber-500 mt-0.5 flex-shrink-0" size={15} />
                <div>
                  <p className="text-amber-800 font-medium text-sm">
                    Profil incomplet pour la création de compte
                  </p>
                  <p className="text-amber-700 text-xs mt-1">
                    Champs manquants : <strong>{missingFields.join(', ')}</strong>
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <h3 className="font-medium text-gray-900 mb-3">Informations principales</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-gray-600">Type</p>
                <p className="font-medium capitalize">{partner.type_partenaire || 'Non spécifié'}</p>
              </div>
              <div>
                <p className="text-gray-600">Statut</p>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  partner.statut ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {partner.statut ? 'Actif' : 'Inactif'}
                </span>
              </div>
              <div className="col-span-2">
                <p className="text-gray-600">Email</p>
                <p className={`font-medium ${!partner.email ? 'text-red-400 italic' : ''}`}>
                  {partner.email || '⚠ Non renseigné (requis)'}
                </p>
              </div>
              <div className="col-span-2">
                <p className="text-gray-600">Téléphone</p>
                <p className={`font-medium ${!partner.telephone ? 'text-red-400 italic' : ''}`}>
                  {partner.telephone || '⚠ Non renseigné (requis)'}
                </p>
              </div>
              {partner.pays_details && (
                <div>
                  <p className="text-gray-600">Pays</p>
                  <p className="font-medium">{partner.pays_details.emoji} {partner.pays_details.nom}</p>
                </div>
              )}
              {partner.ville_details && (
                <div>
                  <p className="text-gray-600">Ville</p>
                  <p className="font-medium">{partner.ville_details.nom}</p>
                </div>
              )}
              {partner.region_details && (
                <div>
                  <p className="text-gray-600">Région</p>
                  <p className="font-medium">{partner.region_details.nom}</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-violet-50 rounded-lg p-4 border border-violet-200">
            <h3 className="font-medium text-gray-900 mb-3">Compte utilisateur</h3>
            {partner.user ? (
              <div className="bg-white rounded p-3">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium text-gray-900">{partner.user.email || 'Non renseigné'}</p>
                    <p className="text-sm text-gray-500 mt-1">
                      Créé le {partner.user.date_joined
                        ? new Date(partner.user.date_joined).toLocaleDateString('fr-FR')
                        : 'Non spécifié'}
                    </p>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    partner.user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {partner.user.is_active ? 'Actif' : 'Inactif'}
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                {missingFields.length === 0 ? (
                  <button
                    onClick={async () => {
                      setLoading(true);
                      setError(null);
                      try { await onCreateUser?.(partner); }
                      catch (err) { setError(err?.message || 'Erreur'); }
                      finally { setLoading(false); }
                    }}
                    disabled={loading}
                    className="px-4 py-2 bg-violet-600 text-white rounded hover:bg-violet-700 font-medium flex items-center justify-center gap-2 mx-auto"
                  >
                    {loading ? <FiRefreshCw className="animate-spin" /> : <FiUserPlus />}
                    Créer un compte
                  </button>
                ) : (
                  <div className="bg-amber-50 p-3 rounded border border-amber-200">
                    <p className="font-medium text-amber-800 text-sm">
                      Complétez le profil avant de créer un compte
                    </p>
                    <p className="text-amber-700 text-xs mt-1">
                      Manquant : {missingFields.join(', ')}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

        </div>

        <div className="p-4 border-t flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-violet-600 text-white rounded hover:bg-violet-700"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// PAGE PRINCIPALE
// ============================================================================
export default function PartnersPage() {
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [selectedPartner, setSelectedPartner] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const { activeEntity } = useEntity();

  const partnerTypeOptions = [{ value: '', label: 'Tous' }, ...PARTNER_TYPES];
  const statusOptions = [
    { value: '', label: 'Tous' },
    { value: 'active', label: 'Actifs' },
    { value: 'inactive', label: 'Inactifs' },
  ];

  useEffect(() => { setCurrentPage(1); }, [activeEntity]);

  const fetchPartners = useCallback(async () => {
    if (!activeEntity?.id) { setPartners([]); setLoading(false); return; }
    try {
      setLoading(true); setError(null);
      const response = await apiClient.get('/partenaires/');
      const data = parseResponse(response);
      setPartners(data.filter(p =>
        p && (p.company_id === activeEntity.id || p.company_id?.id === activeEntity.id)
      ));
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || 'Impossible de charger les partenaires');
    } finally { setLoading(false); }
  }, [activeEntity?.id]);

  useEffect(() => { fetchPartners(); }, [fetchPartners]);

  const filteredPartners = partners.filter(p => {
    if (!p) return false;
    const sl = searchTerm.toLowerCase();
    const matchSearch =
      (p.nom || '').toLowerCase().includes(sl) ||
      (p.email || '').toLowerCase().includes(sl) ||
      (p.telephone || '').includes(searchTerm);
    const matchType = !filterType || p.type_partenaire === filterType;
    const matchStatus =
      !filterStatus ||
      (filterStatus === 'active' && p.statut === true) ||
      (filterStatus === 'inactive' && p.statut === false);
    return matchSearch && matchType && matchStatus;
  });

  const totalPages = Math.max(1, Math.ceil(filteredPartners.length / itemsPerPage));
  const currentPartners = filteredPartners.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleCreateUser = (partner) => {
    if (!partner?.email) { setError('Le partenaire doit avoir un email pour créer un compte'); return; }
    if (partner?.user) { setError('Ce partenaire a déjà un compte utilisateur'); return; }
    setSelectedPartner(partner);
    setShowUserModal(true);
  };

  const handleDelete = async (partner) => {
    if (!window.confirm(`Supprimer "${partner?.nom}" ?`)) return;
    try {
      await apiClient.delete(`/partenaires/${partner.id}/`);
      await fetchPartners();
    } catch (err) {
      setError(err?.response?.data?.detail || 'Erreur lors de la suppression');
    }
  };

  const handleRefresh = () => {
    fetchPartners();
    setSearchTerm(''); setFilterType(''); setFilterStatus('');
    setCurrentPage(1); setError(null);
  };

  const stats = {
    total: partners.length,
    actifs: partners.filter(p => p?.statut).length,
    inactifs: partners.filter(p => !p?.statut).length,
    avecEmail: partners.filter(p => p?.email).length,
    avecCompte: partners.filter(p => p?.user).length,
  };

  // Partenaires avec profil incomplet (pour la colonne compte)

const isProfileComplete = (p) =>
  p?.email && p?.telephone && p?.pays_details && p?.region_details && p?.ville_details && p?.adresse;


  const getTypeIcon = (type) => {
    switch (type) {
      case 'client': return <FiUser className="w-4 h-4 text-blue-600" />;
      case 'fournisseur': return <FiPackage className="w-4 h-4 text-orange-600" />;
      case 'employe': return <FiUsers className="w-4 h-4 text-purple-600" />;
      case 'debiteur': return <FiCreditCard className="w-4 h-4 text-red-600" />;
      case 'crediteur': return <FiCreditCard className="w-4 h-4 text-green-600" />;
      default: return <FiUsers className="w-4 h-4 text-gray-600" />;
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'client': return 'bg-blue-100 text-blue-800';
      case 'fournisseur': return 'bg-orange-100 text-orange-800';
      case 'employe': return 'bg-purple-100 text-purple-800';
      case 'debiteur': return 'bg-red-100 text-red-800';
      case 'crediteur': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading && partners.length === 0) {
    return (
      <div className="p-6 flex flex-col items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600"></div>
        <p className="mt-4 text-gray-600">Chargement des partenaires...</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 bg-gray-50 min-h-screen">

      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Partenaires</h1>
            <p className="text-gray-600">{activeEntity?.raison_sociale || 'Sélectionnez une entité'}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleRefresh}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center gap-2"
            >
              <FiRefreshCw className={loading ? 'animate-spin' : ''} />Actualiser
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              disabled={!activeEntity}
              className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 ${
                !activeEntity
                  ? 'bg-gray-400 cursor-not-allowed text-white'
                  : 'bg-violet-600 hover:bg-violet-700 text-white'
              }`}
            >
              <FiPlus />Nouveau partenaire
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border-l-4 border-red-500 rounded-r-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FiAlertCircle className="text-red-500" />
              <p className="text-red-700">{error}</p>
            </div>
            <button onClick={() => setError(null)} className="text-red-600 hover:text-red-800 p-1">
              <FiX />
            </button>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        {[
          { label: 'Total', value: stats.total, color: 'violet', Icon: FiUsers },
          { label: 'Actifs', value: stats.actifs, color: 'green', Icon: FiCheck },
          { label: 'Avec compte', value: stats.avecCompte, color: 'blue', Icon: FiUserPlus },
          { label: 'Avec email', value: stats.avecEmail, color: 'emerald', Icon: FiMail },
          { label: 'Inactifs', value: stats.inactifs, color: 'amber', Icon: FiXCircle },
        ].map(({ label, value, color, Icon }) => (
          <div key={label} className="bg-white p-3 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">{label}</p>
                <p className={`text-lg font-bold text-${color}-${color === 'violet' ? '900' : '600'}`}>
                  {value}
                </p>
              </div>
              <div className={`p-1.5 bg-${color}-100 rounded`}>
                <Icon className={`w-4 h-4 text-${color}-600`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filtres */}
      <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher par nom, email ou téléphone..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <select
              value={filterType}
              onChange={(e) => { setFilterType(e.target.value); setCurrentPage(1); }}
              className="border border-gray-300 rounded-lg px-3 py-3 focus:ring-2 focus:ring-violet-500"
            >
              {partnerTypeOptions.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <select
              value={filterStatus}
              onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }}
              className="border border-gray-300 rounded-lg px-3 py-3 focus:ring-2 focus:ring-violet-500"
            >
              {statusOptions.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Tableau */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-6">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Nom', 'Type', 'Contact', 'Compte', 'Statut', 'Actions'].map(h => (
                  <th key={h} className="text-left py-3 px-4 text-sm font-medium text-gray-700">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {currentPartners.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-gray-500">
                    {loading ? (
                      <div className="flex flex-col items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600 mb-2"></div>
                        <p>Chargement...</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center">
                        <FiUsers className="w-12 h-12 text-gray-300 mb-2" />
                        <p className="text-gray-400">Aucun partenaire trouvé</p>
                        {!activeEntity && (
                          <p className="text-sm text-amber-600 mt-1">Sélectionnez une entité pour commencer</p>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ) : currentPartners.map((partner) => {
                const complete = isProfileComplete(partner);
                return (
                  <tr key={partner.id} className="hover:bg-gray-50">

                    {/* Nom */}
                    <td className="py-3 px-4">
                      <p className="font-medium text-gray-900">{partner.nom || 'Non spécifié'}</p>
                      <p className="text-xs text-gray-500">ID: {partner.id}</p>
                      {/* Alerte profil incomplet dans la liste */}
                      {!complete && !partner.user && (
                        <span className="inline-flex items-center gap-1 mt-0.5 text-xs text-amber-600">
                          <FiAlertCircle size={10} />Profil incomplet
                        </span>
                      )}
                    </td>

                    {/* Type */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {getTypeIcon(partner.type_partenaire)}
                        <span className={`px-2 py-1 rounded text-xs font-medium capitalize ${getTypeColor(partner.type_partenaire)}`}>
                          {partner.type_partenaire || 'Non spécifié'}
                        </span>
                      </div>
                    </td>

                    {/* Contact */}
                    <td className="py-3 px-4">
                      <div className="space-y-1">
                        {partner.email ? (
                          <div className="flex items-center gap-2 text-sm">
                            <FiMail className="w-3 h-3 text-gray-400" />
                            <span className="text-gray-700 truncate max-w-[150px]">{partner.email}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-xs text-red-400">
                            <FiAlertCircle size={10} />Email manquant
                          </div>
                        )}
                        {partner.telephone ? (
                          <div className="flex items-center gap-2 text-sm">
                            <FiPhone className="w-3 h-3 text-gray-400" />
                            <span className="text-gray-700">{partner.telephone}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-xs text-red-400">
                            <FiAlertCircle size={10} />Tél. manquant
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Compte */}
                    <td className="py-3 px-4">
                      {partner.user ? (
                        <div className="flex items-center gap-2">
                          <FiCheckCircle className="w-4 h-4 text-green-500" />
                          <span className="text-sm text-green-700">Compte actif</span>
                        </div>
                      ) : complete ? (
                        <button
                          onClick={() => handleCreateUser(partner)}
                          className="px-3 py-1 bg-violet-100 text-violet-700 rounded text-sm hover:bg-violet-200 flex items-center gap-1"
                        >
                          <FiUserPlus className="w-3 h-3" />Créer compte
                        </button>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">
                          <FiAlertCircle size={10} />Profil incomplet
                        </span>
                      )}
                    </td>

                    {/* Statut */}
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        partner.statut ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {partner.statut ? 'Actif' : 'Inactif'}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => { setSelectedPartner(partner); setShowDetailModal(true); }}
                          className="p-1.5 text-gray-600 hover:text-violet-600 hover:bg-violet-50 rounded"
                          title="Voir les détails"
                        >
                          <FiEye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => { setSelectedPartner(partner); setShowEditModal(true); }}
                          className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded"
                          title="Modifier"
                        >
                          <FiEdit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(partner)}
                          className="p-1.5 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded"
                          title="Supprimer"
                        >
                          <FiTrash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>

                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {filteredPartners.length > 0 && (
        <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="text-sm text-gray-600">
            {filteredPartners.length} partenaire{filteredPartners.length > 1 ? 's' : ''}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className={`p-2 rounded-lg border ${
                currentPage === 1
                  ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <FiChevronLeft className="w-5 h-5" />
            </button>
            <span className="text-sm text-gray-700">Page {currentPage} sur {totalPages}</span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className={`p-2 rounded-lg border ${
                currentPage === totalPages
                  ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <FiChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Modaux */}
      <CreatePartnerModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => { fetchPartners(); setShowCreateModal(false); }}
      />
      <EditPartnerModal
        open={showEditModal}
        onClose={() => setShowEditModal(false)}
        partner={selectedPartner}
        onSuccess={() => { fetchPartners(); setShowEditModal(false); }}
      />
      {showDetailModal && (
        <PartnerDetailModal
          partner={selectedPartner}
          onClose={() => setShowDetailModal(false)}
          onCreateUser={handleCreateUser}
        />
      )}
      <UserFromPartenaireModal
        open={showUserModal}
        onClose={() => setShowUserModal(false)}
        partenaire={selectedPartner}
        onSuccess={() => fetchPartners()}
      />

    </div>
  );
}