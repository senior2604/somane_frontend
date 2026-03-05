import React, { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../../services/apiClient';
import { useEntity } from '../../context/EntityContext';
import {
  FiPlus, FiEdit2, FiTrash2, FiSearch, FiEye,
  FiUserPlus, FiMail, FiCheckCircle, FiXCircle,
  FiAlertCircle, FiRefreshCw, FiChevronLeft, FiChevronRight,
  FiUsers, FiPhone, FiX, FiCheck, FiBriefcase,
  FiSave, FiMapPin, FiGlobe, FiCreditCard, FiUser,
  FiDownload, FiPackage, FiHome
} from "react-icons/fi";

// ============================================================================
// HELPER POUR PARSING RÉPONSES API
// ============================================================================
const parseResponse = (response) => {
  if (!response) return [];
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.results)) return response.results;
  if (Array.isArray(response?.partenaires)) return response.partenaires;
  return [];
};

// ============================================================================
// MODAL DE CRÉATION DE PARTENAIRE
// ============================================================================
function CreatePartnerModal({ open, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [paysList, setPaysList] = useState([]);
  const [villesList, setVillesList] = useState([]);
  const [regionsList, setRegionsList] = useState([]);
  const { activeEntity } = useEntity();
  
  const [formData, setFormData] = useState({
    nom: '',
    type_partenaire: 'client',
    email: '',
    telephone: '',
    adresse: '',
    complement_adresse: '',
    statut: true,
    is_company: true,
    ville: '',
    pays: '',
    region: '',
    code_postal: '',
    site_web: '',
    notes: '',
    numero_fiscal: '',
    registre_commerce: '',
    securite_sociale: '',
    ville_legacy: '',
    region_legacy: ''
  });

  const partnerTypes = [
    { value: 'client', label: 'Client' },
    { value: 'fournisseur', label: 'Fournisseur' },
    { value: 'employe', label: 'Employé' },
    { value: 'debiteur', label: 'Débiteur divers' },
    { value: 'crediteur', label: 'Créditeur divers' },
  ];

  const resetForm = () => {
    setFormData({
      nom: '',
      type_partenaire: 'client',
      email: '',
      telephone: '',
      adresse: '',
      complement_adresse: '',
      statut: true,
      is_company: true,
      ville: '',
      pays: '',
      region: '',
      code_postal: '',
      site_web: '',
      notes: '',
      numero_fiscal: '',
      registre_commerce: '',
      securite_sociale: '',
      ville_legacy: '',
      region_legacy: ''
    });
    setError(null);
    setFieldErrors({});
  };

  useEffect(() => {
    if (open) {
      resetForm();
    }
  }, [open]);

  useEffect(() => {
    let isMounted = true;
    
    const fetchData = async () => {
      try {
        const [paysRes, villesRes, regionsRes] = await Promise.all([
          apiClient.get('/pays/'),
          apiClient.get('/villes/'),
          apiClient.get('/subdivisions/')
        ]);
        
        if (isMounted) {
          setPaysList(parseResponse(paysRes));
          setVillesList(parseResponse(villesRes));
          setRegionsList(parseResponse(regionsRes));
        }
      } catch (err) {
        console.error('Erreur chargement données:', err);
      }
    };

    if (open) {
      fetchData();
    }

    return () => { isMounted = false; };
  }, [open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setFieldErrors({});
    
    try {
      if (!formData.nom?.trim()) {
        throw new Error('Le nom est obligatoire');
      }
      
      if (!activeEntity?.id) {
        throw new Error('Sélectionnez une entité');
      }

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

      console.log('📤 Données envoyées:', JSON.stringify(requestData, null, 2));
      
      const response = await apiClient.post('/partenaires/', requestData);
      console.log('✅ Réponse succès:', response.data);
      
      onSuccess?.();
      onClose?.();
    } catch (err) {
      console.error('❌ Erreur:', err);
      
      const errorData = err?.response?.data;
      
      if (errorData && typeof errorData === 'object') {
        const fieldErrorMap = {};
        const errorMessages = [];
        
        Object.entries(errorData).forEach(([field, messages]) => {
          if (Array.isArray(messages)) {
            fieldErrorMap[field] = messages[0];
            errorMessages.push(`${field}: ${messages[0]}`);
          } else if (typeof messages === 'string') {
            fieldErrorMap[field] = messages;
            errorMessages.push(`${field}: ${messages}`);
          }
        });
        
        setFieldErrors(fieldErrorMap);
        setError(errorMessages.join(' | '));
      } else if (errorData?.detail) {
        setError(errorData.detail);
      } else if (err?.message) {
        setError(err.message);
      } else {
        setError('Erreur lors de la création du partenaire');
      }
    } finally {
      setLoading(false);
    }
  };

  const getFieldErrorClass = (fieldName) => {
    return fieldErrors[fieldName] ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-violet-500';
  };

  const renderFieldError = (fieldName) => {
    if (fieldErrors[fieldName]) {
      return (
        <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
          <FiAlertCircle className="w-3 h-3" />
          {fieldErrors[fieldName]}
        </p>
      );
    }
    return null;
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-4xl flex flex-col" style={{ maxHeight: '90vh' }}>
        {/* Header - Fixe */}
        <div className="bg-violet-600 text-white rounded-t-lg p-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white bg-opacity-20 rounded-lg">
                <FiPlus className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-bold text-lg">Nouveau partenaire</h2>
                <p className="text-violet-100 text-sm">
                  {activeEntity ? activeEntity.raison_sociale : 'Sélectionnez une entité'}
                </p>
              </div>
            </div>
            <button 
              type="button"
              onClick={onClose} 
              className="p-2 hover:bg-white hover:bg-opacity-20 rounded transition-colors"
              disabled={loading}
            >
              <FiX size={20} />
            </button>
          </div>
        </div>
        
        {/* Body - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Alertes */}
          {!activeEntity && (
            <div className="mb-6 bg-amber-50 border-l-4 border-amber-500 rounded-r p-4">
              <div className="flex items-start gap-3">
                <FiAlertCircle className="text-amber-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-amber-700 font-medium">Entité requise</p>
                  <p className="text-amber-600 text-sm mt-1">
                    Veuillez sélectionner une entité avant de créer un partenaire
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {error && !Object.keys(fieldErrors).length && (
            <div className="mb-6 bg-red-50 border-l-4 border-red-500 rounded-r p-4">
              <div className="flex items-start gap-3">
                <FiAlertCircle className="text-red-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-red-700 font-medium">Erreur de validation</p>
                  <p className="text-red-600 text-sm mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Section 1: Informations obligatoires */}
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
                      if (fieldErrors.nom) {
                        setFieldErrors(prev => ({ ...prev, nom: null }));
                      }
                    }}
                    className={`w-full border rounded-lg px-4 py-2.5 focus:ring-2 transition-colors ${getFieldErrorClass('nom')}`}
                    placeholder="Ex: ENTREPRISE SARL"
                    required
                    disabled={!activeEntity || loading}
                  />
                  {renderFieldError('nom')}
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
                      if (fieldErrors.type_partenaire) {
                        setFieldErrors(prev => ({ ...prev, type_partenaire: null }));
                      }
                    }}
                    className={`w-full border rounded-lg px-4 py-2.5 focus:ring-2 transition-colors ${getFieldErrorClass('type_partenaire')}`}
                    required
                    disabled={!activeEntity || loading}
                  >
                    {partnerTypes.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                  {renderFieldError('type_partenaire')}
                </div>
                
                {/* Type de personne */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Type de personne</label>
                  <select
                    value={formData.is_company ? 'company' : 'person'}
                    onChange={(e) => {
                      setFormData(prev => ({ 
                        ...prev, 
                        is_company: e.target.value === 'company' 
                      }));
                    }}
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
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, statut: e.target.value === 'actif' }));
                    }}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-violet-500"
                    disabled={!activeEntity || loading}
                  >
                    <option value="actif">Actif</option>
                    <option value="inactif">Inactif</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Section 2: Contact */}
            <div className="bg-gray-50 bg-opacity-50 rounded-lg p-5 border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <FiMail className="w-5 h-5" />
                Contact
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, email: e.target.value }));
                      if (fieldErrors.email) {
                        setFieldErrors(prev => ({ ...prev, email: null }));
                      }
                    }}
                    className={`w-full border rounded-lg px-4 py-2.5 focus:ring-2 transition-colors ${getFieldErrorClass('email')}`}
                    placeholder="contact@entreprise.com"
                    disabled={!activeEntity || loading}
                  />
                  {renderFieldError('email')}
                </div>
                
                {/* Téléphone */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Téléphone</label>
                  <input
                    type="tel"
                    value={formData.telephone}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, telephone: e.target.value }));
                      if (fieldErrors.telephone) {
                        setFieldErrors(prev => ({ ...prev, telephone: null }));
                      }
                    }}
                    className={`w-full border rounded-lg px-4 py-2.5 focus:ring-2 transition-colors ${getFieldErrorClass('telephone')}`}
                    placeholder="+228 XX XX XX XX"
                    disabled={!activeEntity || loading}
                  />
                  {renderFieldError('telephone')}
                </div>
                
                {/* Site web */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Site web</label>
                  <input
                    type="url"
                    value={formData.site_web}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, site_web: e.target.value }));
                      if (fieldErrors.site_web) {
                        setFieldErrors(prev => ({ ...prev, site_web: null }));
                      }
                    }}
                    className={`w-full border rounded-lg px-4 py-2.5 focus:ring-2 transition-colors ${getFieldErrorClass('site_web')}`}
                    placeholder="https://www.entreprise.com"
                    disabled={!activeEntity || loading}
                  />
                  {renderFieldError('site_web')}
                </div>
              </div>
            </div>

            {/* Section 3: Localisation */}
            <div className="bg-gray-50 bg-opacity-50 rounded-lg p-5 border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <FiMapPin className="w-5 h-5" />
                Localisation
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Pays */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Pays</label>
                  <select
                    value={formData.pays}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, pays: e.target.value }));
                      if (fieldErrors.pays) {
                        setFieldErrors(prev => ({ ...prev, pays: null }));
                      }
                    }}
                    className={`w-full border rounded-lg px-4 py-2.5 focus:ring-2 transition-colors ${getFieldErrorClass('pays')}`}
                    disabled={!activeEntity || loading}
                  >
                    <option value="">Sélectionnez un pays</option>
                    {paysList.map(pays => (
                      <option key={pays.id} value={pays.id}>
                        {pays.emoji} {pays.nom_fr || pays.nom} ({pays.code_iso})
                      </option>
                    ))}
                  </select>
                  {renderFieldError('pays')}
                </div>
                
                {/* Région */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Région</label>
                  <select
                    value={formData.region}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, region: e.target.value }));
                      if (fieldErrors.region) {
                        setFieldErrors(prev => ({ ...prev, region: null }));
                      }
                    }}
                    className={`w-full border rounded-lg px-4 py-2.5 focus:ring-2 transition-colors ${getFieldErrorClass('region')}`}
                    disabled={!activeEntity || loading}
                  >
                    <option value="">Sélectionnez une région</option>
                    {regionsList.map(region => (
                      <option key={region.id} value={region.id}>
                        {region.nom} ({region.type_subdivision})
                      </option>
                    ))}
                  </select>
                  {renderFieldError('region')}
                </div>
                
                {/* Ville */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Ville</label>
                  <select
                    value={formData.ville}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, ville: e.target.value }));
                      if (fieldErrors.ville) {
                        setFieldErrors(prev => ({ ...prev, ville: null }));
                      }
                    }}
                    className={`w-full border rounded-lg px-4 py-2.5 focus:ring-2 transition-colors ${getFieldErrorClass('ville')}`}
                    disabled={!activeEntity || loading}
                  >
                    <option value="">Sélectionnez une ville</option>
                    {villesList.map(ville => (
                      <option key={ville.id} value={ville.id}>
                        {ville.nom} {ville.subdivision_nom ? `(${ville.subdivision_nom})` : ''}
                      </option>
                    ))}
                  </select>
                  {renderFieldError('ville')}
                </div>
                
                {/* Code postal */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Code postal</label>
                  <input
                    type="text"
                    value={formData.code_postal}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, code_postal: e.target.value }));
                      if (fieldErrors.code_postal) {
                        setFieldErrors(prev => ({ ...prev, code_postal: null }));
                      }
                    }}
                    className={`w-full border rounded-lg px-4 py-2.5 focus:ring-2 transition-colors ${getFieldErrorClass('code_postal')}`}
                    placeholder="00000"
                    disabled={!activeEntity || loading}
                  />
                  {renderFieldError('code_postal')}
                </div>
                
                {/* Adresse */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Adresse</label>
                  <textarea
                    value={formData.adresse}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, adresse: e.target.value }));
                      if (fieldErrors.adresse) {
                        setFieldErrors(prev => ({ ...prev, adresse: null }));
                      }
                    }}
                    className={`w-full border rounded-lg px-4 py-2.5 focus:ring-2 transition-colors ${getFieldErrorClass('adresse')}`}
                    placeholder="Adresse principale"
                    rows="2"
                    disabled={!activeEntity || loading}
                  />
                  {renderFieldError('adresse')}
                </div>
                
                {/* Complément d'adresse */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Complément d'adresse</label>
                  <input
                    type="text"
                    value={formData.complement_adresse}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, complement_adresse: e.target.value }));
                      if (fieldErrors.complement_adresse) {
                        setFieldErrors(prev => ({ ...prev, complement_adresse: null }));
                      }
                    }}
                    className={`w-full border rounded-lg px-4 py-2.5 focus:ring-2 transition-colors ${getFieldErrorClass('complement_adresse')}`}
                    placeholder="Bâtiment, appartement, BP..."
                    disabled={!activeEntity || loading}
                  />
                  {renderFieldError('complement_adresse')}
                </div>
              </div>
            </div>

            {/* Section 4: Informations légales */}
            <div className="bg-gray-50 bg-opacity-50 rounded-lg p-5 border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <FiHome className="w-5 h-5" />
                Informations légales
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* NIF */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Numéro fiscal (NIF)</label>
                  <input
                    type="text"
                    value={formData.numero_fiscal}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, numero_fiscal: e.target.value }));
                      if (fieldErrors.numero_fiscal) {
                        setFieldErrors(prev => ({ ...prev, numero_fiscal: null }));
                      }
                    }}
                    className={`w-full border rounded-lg px-4 py-2.5 focus:ring-2 transition-colors ${getFieldErrorClass('numero_fiscal')}`}
                    placeholder="NIF"
                    disabled={!activeEntity || loading}
                  />
                  {renderFieldError('numero_fiscal')}
                </div>
                
                {/* Registre commerce */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Registre de commerce</label>
                  <input
                    type="text"
                    value={formData.registre_commerce}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, registre_commerce: e.target.value }));
                      if (fieldErrors.registre_commerce) {
                        setFieldErrors(prev => ({ ...prev, registre_commerce: null }));
                      }
                    }}
                    className={`w-full border rounded-lg px-4 py-2.5 focus:ring-2 transition-colors ${getFieldErrorClass('registre_commerce')}`}
                    placeholder="RCCM"
                    disabled={!activeEntity || loading}
                  />
                  {renderFieldError('registre_commerce')}
                </div>
                
                {/* Sécurité sociale */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Sécurité sociale</label>
                  <input
                    type="text"
                    value={formData.securite_sociale}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, securite_sociale: e.target.value }));
                      if (fieldErrors.securite_sociale) {
                        setFieldErrors(prev => ({ ...prev, securite_sociale: null }));
                      }
                    }}
                    className={`w-full border rounded-lg px-4 py-2.5 focus:ring-2 transition-colors ${getFieldErrorClass('securite_sociale')}`}
                    placeholder="N° sécurité sociale"
                    disabled={!activeEntity || loading}
                  />
                  {renderFieldError('securite_sociale')}
                </div>
              </div>
            </div>

            {/* Section 5: Notes */}
            <div className="bg-gray-50 bg-opacity-50 rounded-lg p-5 border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <FiBriefcase className="w-5 h-5" />
                Notes
              </h3>
              
              <div>
                <textarea
                  value={formData.notes}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, notes: e.target.value }));
                    if (fieldErrors.notes) {
                      setFieldErrors(prev => ({ ...prev, notes: null }));
                    }
                  }}
                  className={`w-full border rounded-lg px-4 py-2.5 focus:ring-2 transition-colors ${getFieldErrorClass('notes')}`}
                  placeholder="Informations supplémentaires..."
                  rows="3"
                  disabled={!activeEntity || loading}
                />
                {renderFieldError('notes')}
              </div>
            </div>

            {/* Boutons */}
            <div className="flex justify-end gap-3 pt-6 border-t sticky bottom-0 bg-white">
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
                {loading ? (
                  <>
                    <FiRefreshCw className="animate-spin" />
                    Création en cours...
                  </>
                ) : (
                  <>
                    <FiSave />
                    Créer le partenaire
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MODAL D'ÉDITION DE PARTENAIRE
// ============================================================================
function EditPartnerModal({ open, onClose, partner, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [paysList, setPaysList] = useState([]);
  const [villesList, setVillesList] = useState([]);
  const [regionsList, setRegionsList] = useState([]);
  
  const [formData, setFormData] = useState({
    nom: '',
    type_partenaire: 'client',
    email: '',
    telephone: '',
    adresse: '',
    complement_adresse: '',
    statut: true,
    is_company: true,
    ville: '',
    pays: '',
    region: '',
    code_postal: '',
    site_web: '',
    notes: '',
    numero_fiscal: '',
    registre_commerce: '',
    securite_sociale: '',
    ville_legacy: '',
    region_legacy: ''
  });

  const partnerTypes = [
    { value: 'client', label: 'Client' },
    { value: 'fournisseur', label: 'Fournisseur' },
    { value: 'employe', label: 'Employé' },
    { value: 'debiteur', label: 'Débiteur divers' },
    { value: 'crediteur', label: 'Créditeur divers' },
  ];

  useEffect(() => {
    let isMounted = true;
    
    const fetchData = async () => {
      try {
        const [paysRes, villesRes, regionsRes] = await Promise.all([
          apiClient.get('/pays/'),
          apiClient.get('/villes/'),
          apiClient.get('/subdivisions/')
        ]);
        
        if (isMounted) {
          setPaysList(parseResponse(paysRes));
          setVillesList(parseResponse(villesRes));
          setRegionsList(parseResponse(regionsRes));
        }
      } catch (err) {
        console.error('Erreur chargement données:', err);
      }
    };

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
        ville: partner.ville?.id || partner.ville || '',
        pays: partner.pays?.id || partner.pays || '',
        region: partner.region?.id || partner.region || '',
        code_postal: partner.code_postal || '',
        site_web: partner.site_web || '',
        notes: partner.notes || '',
        numero_fiscal: partner.numero_fiscal || '',
        registre_commerce: partner.registre_commerce || '',
        securite_sociale: partner.securite_sociale || '',
        ville_legacy: partner.ville_legacy || '',
        region_legacy: partner.region_legacy || ''
      });
      
      fetchData();
    }

    return () => { isMounted = false; };
  }, [open, partner]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setFieldErrors({});
    
    try {
      if (!formData.nom?.trim()) {
        throw new Error('Le nom est obligatoire');
      }
      
      if (!partner?.id) {
        throw new Error('Partenaire invalide');
      }

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

      console.log('📤 Données modification:', JSON.stringify(requestData, null, 2));
      
      const response = await apiClient.put(`/partenaires/${partner.id}/`, requestData);
      console.log('✅ Modification réussie:', response.data);
      
      onSuccess?.();
      onClose?.();
    } catch (err) {
      console.error('❌ Erreur modification:', err);
      
      const errorData = err?.response?.data;
      
      if (errorData && typeof errorData === 'object') {
        const fieldErrorMap = {};
        const errorMessages = [];
        
        Object.entries(errorData).forEach(([field, messages]) => {
          if (Array.isArray(messages)) {
            fieldErrorMap[field] = messages[0];
            errorMessages.push(`${field}: ${messages[0]}`);
          } else if (typeof messages === 'string') {
            fieldErrorMap[field] = messages;
            errorMessages.push(`${field}: ${messages}`);
          }
        });
        
        setFieldErrors(fieldErrorMap);
        setError(errorMessages.join(' | '));
      } else if (errorData?.detail) {
        setError(errorData.detail);
      } else if (err?.message) {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const getFieldErrorClass = (fieldName) => {
    return fieldErrors[fieldName] ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-violet-500';
  };

  const renderFieldError = (fieldName) => {
    if (fieldErrors[fieldName]) {
      return (
        <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
          <FiAlertCircle className="w-3 h-3" />
          {fieldErrors[fieldName]}
        </p>
      );
    }
    return null;
  };

  if (!open || !partner) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-4xl flex flex-col" style={{ maxHeight: '90vh' }}>
        {/* Header */}
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
            <button onClick={onClose} className="p-2 hover:bg-white hover:bg-opacity-20 rounded" disabled={loading}>
              <FiX size={20} />
            </button>
          </div>
        </div>
        
        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-6 bg-red-50 border-l-4 border-red-500 rounded-r p-4">
              <div className="flex items-start gap-3">
                <FiAlertCircle className="text-red-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-red-700 font-medium">Erreur de validation</p>
                  <p className="text-red-600 text-sm mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Section 1: Informations obligatoires */}
            <div className="bg-violet-50 bg-opacity-50 rounded-lg p-5 border border-violet-200">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <FiBriefcase className="w-5 h-5 text-violet-600" />
                Informations obligatoires
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Nom */}
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
                    className={`w-full border rounded-lg px-4 py-2.5 focus:ring-2 transition-colors ${getFieldErrorClass('nom')}`}
                    required
                    disabled={loading}
                  />
                  {renderFieldError('nom')}
                </div>
                
                {/* Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Type</label>
                  <select
                    value={formData.type_partenaire}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, type_partenaire: e.target.value }));
                      if (fieldErrors.type_partenaire) {
                        setFieldErrors(prev => ({ ...prev, type_partenaire: null }));
                      }
                    }}
                    className={`w-full border rounded-lg px-4 py-2.5 focus:ring-2 transition-colors ${getFieldErrorClass('type_partenaire')}`}
                    disabled={loading}
                  >
                    {partnerTypes.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                  {renderFieldError('type_partenaire')}
                </div>
                
                {/* Statut */}
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

            {/* Section 2: Contact */}
            <div className="bg-gray-50 bg-opacity-50 rounded-lg p-5 border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <FiMail className="w-5 h-5" />
                Contact
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, email: e.target.value }));
                      if (fieldErrors.email) setFieldErrors(prev => ({ ...prev, email: null }));
                    }}
                    className={`w-full border rounded-lg px-4 py-2.5 focus:ring-2 transition-colors ${getFieldErrorClass('email')}`}
                    disabled={loading}
                  />
                  {renderFieldError('email')}
                </div>
                
                {/* Téléphone */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Téléphone</label>
                  <input
                    type="tel"
                    value={formData.telephone}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, telephone: e.target.value }));
                      if (fieldErrors.telephone) setFieldErrors(prev => ({ ...prev, telephone: null }));
                    }}
                    className={`w-full border rounded-lg px-4 py-2.5 focus:ring-2 transition-colors ${getFieldErrorClass('telephone')}`}
                    disabled={loading}
                  />
                  {renderFieldError('telephone')}
                </div>
              </div>
            </div>

            {/* Section 3: Localisation */}
            <div className="bg-gray-50 bg-opacity-50 rounded-lg p-5 border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <FiMapPin className="w-5 h-5" />
                Localisation
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Pays */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Pays</label>
                  <select
                    value={formData.pays}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, pays: e.target.value }));
                      if (fieldErrors.pays) setFieldErrors(prev => ({ ...prev, pays: null }));
                    }}
                    className={`w-full border rounded-lg px-4 py-2.5 focus:ring-2 transition-colors ${getFieldErrorClass('pays')}`}
                    disabled={loading}
                  >
                    <option value="">Sélectionnez un pays</option>
                    {paysList.map(pays => (
                      <option key={pays.id} value={pays.id}>
                        {pays.emoji} {pays.nom_fr || pays.nom}
                      </option>
                    ))}
                  </select>
                  {renderFieldError('pays')}
                </div>
                
                {/* Ville */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Ville</label>
                  <select
                    value={formData.ville}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, ville: e.target.value }));
                      if (fieldErrors.ville) setFieldErrors(prev => ({ ...prev, ville: null }));
                    }}
                    className={`w-full border rounded-lg px-4 py-2.5 focus:ring-2 transition-colors ${getFieldErrorClass('ville')}`}
                    disabled={loading}
                  >
                    <option value="">Sélectionnez une ville</option>
                    {villesList.map(ville => (
                      <option key={ville.id} value={ville.id}>{ville.nom}</option>
                    ))}
                  </select>
                  {renderFieldError('ville')}
                </div>
              </div>
            </div>

            {/* Boutons */}
            <div className="flex justify-end gap-3 pt-6 border-t sticky bottom-0 bg-white">
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
                {loading ? (
                  <>
                    <FiRefreshCw className="animate-spin" />
                    Enregistrement...
                  </>
                ) : (
                  <>
                    <FiSave />
                    Enregistrer
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MODAL DE CRÉATION D'UTILISATEUR DEPUIS PARTENAIRE
// ============================================================================
function UserFromPartenaireModal({ open, onClose, partenaire, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [groupesList, setGroupesList] = useState([]);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    telephone: '',
    groups: [],
    send_activation_email: true,
    statut: 'actif'
  });

  useEffect(() => {
    let isMounted = true;
    
    const fetchGroupes = async () => {
      try {
        const response = await apiClient.get('/groupes/');
        if (isMounted) {
          setGroupesList(parseResponse(response));
        }
      } catch (err) {
        console.error('Erreur groupes:', err);
      }
    };

    if (open && partenaire) {
      const nomParts = partenaire?.nom?.split(' ') || [];
      setFormData({
        first_name: nomParts[0] || '',
        last_name: nomParts.slice(1).join(' ') || '',
        telephone: partenaire?.telephone || '',
        groups: [],
        send_activation_email: true,
        statut: 'actif'
      });
      setError(null);
      setSuccess(false);
      fetchGroupes();
    }

    return () => { isMounted = false; };
  }, [open, partenaire]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      if (!partenaire?.email) throw new Error('Email manquant');
      if (partenaire?.user) throw new Error('Compte déjà existant');
      if (!partenaire?.id) throw new Error('Partenaire invalide');

      const requestData = {
        partenaire: partenaire.id,
        first_name: formData.first_name?.trim() || partenaire.nom?.split(' ')[0] || '',
        last_name: formData.last_name?.trim() || partenaire.nom?.split(' ').slice(1).join(' ') || '',
        telephone: formData.telephone?.trim() || '',
        groups: formData.groups,
        send_activation_email: formData.send_activation_email,
        statut: formData.statut
      };

      const response = await apiClient.post('/users/create-from-partenaire/', requestData);
      
      if (response?.success === false) throw new Error(response.error);
      
      setSuccess(true);
      setTimeout(() => { 
        onSuccess?.(); 
        onClose?.(); 
      }, 3000);
    } catch (err) {
      let errorMsg = 'Erreur création';
      const errorData = err?.response?.data;
      
      if (errorData) {
        if (errorData?.email?.[0]) errorMsg = errorData.email[0];
        else if (errorData?.detail) errorMsg = errorData.detail;
        else if (typeof errorData === 'string') errorMsg = errorData;
      } else if (err?.message) {
        errorMsg = err.message;
      }
      
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const toggleGroup = (groupId) => {
    setFormData(prev => ({
      ...prev,
      groups: prev.groups.includes(groupId)
        ? prev.groups.filter(id => id !== groupId)
        : [...prev.groups, groupId]
    }));
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-2xl flex flex-col" style={{ maxHeight: '90vh' }}>
        {/* Header */}
        <div className="bg-violet-600 text-white rounded-t-lg p-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white bg-opacity-20 rounded-lg">
                <FiUserPlus className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-bold text-lg">Créer compte</h2>
                <p className="text-violet-100 text-sm">
                  {partenaire?.nom} ({partenaire?.email})
                </p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white hover:bg-opacity-20 rounded" disabled={loading && !success}>
              <FiX size={20} />
            </button>
          </div>
        </div>
        
        {/* Body */}
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
              <h3 className="font-bold text-xl text-gray-900 mb-2">✅ Compte créé</h3>
              <p className="font-bold text-lg text-violet-600 mb-4">{partenaire?.email}</p>
              {formData.send_activation_email ? (
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <p className="font-medium text-blue-900 mb-2">Email envoyé</p>
                  <p className="text-sm text-blue-700">Lien d'activation envoyé.</p>
                </div>
              ) : (
                <p className="text-amber-600">Activation manuelle</p>
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
                    <label className="block text-sm text-gray-700 mb-1">Prénom *</label>
                    <input
                      type="text"
                      value={formData.first_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, first_name: e.target.value }))}
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">Nom *</label>
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
                    <p className="text-gray-500 text-sm italic">Aucun groupe</p>
                  ) : (
                    groupesList.map(groupe => (
                      <label key={groupe.id} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.groups.includes(groupe.id)}
                          onChange={() => toggleGroup(groupe.id)}
                          className="text-violet-600"
                        />
                        <span className="text-sm text-gray-700">{groupe.name}</span>
                      </label>
                    ))
                  )}
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
                  {loading ? (
                    <>
                      <FiRefreshCw className="animate-spin" />
                      Création...
                    </>
                  ) : (
                    <>
                      <FiUserPlus />
                      Créer
                    </>
                  )}
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
// MODAL DE DÉTAILS DU PARTENAIRE
// ============================================================================
function PartnerDetailModal({ partner, onClose, onCreateUser }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleCreateUserClick = async () => {
    setLoading(true);
    setError(null);
    try {
      await onCreateUser?.(partner);
    } catch (err) {
      setError(err?.message || 'Erreur lors de la création');
    } finally {
      setLoading(false);
    }
  };

  if (!partner) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-3xl flex flex-col" style={{ maxHeight: '90vh' }}>
        {/* Header */}
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
        
        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 rounded-r p-3">
              <div className="flex items-start gap-2">
                <FiAlertCircle className="text-red-500 mt-0.5" />
                <p className="text-red-700 text-sm">{error}</p>
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
                <p className="font-medium">{partner.email || 'Non renseigné'}</p>
              </div>
              <div className="col-span-2">
                <p className="text-gray-600">Téléphone</p>
                <p className="font-medium">{partner.telephone || 'Non renseigné'}</p>
              </div>
              {partner.adresse && (
                <div className="col-span-2">
                  <p className="text-gray-600">Adresse</p>
                  <p className="font-medium">{partner.adresse}</p>
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
                      Créé le {partner.user.date_joined ? new Date(partner.user.date_joined).toLocaleDateString('fr-FR') : 'Non spécifié'}
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
                {partner.email ? (
                  <button
                    onClick={handleCreateUserClick}
                    disabled={loading}
                    className="px-4 py-2 bg-violet-600 text-white rounded hover:bg-violet-700 font-medium flex items-center justify-center gap-2 mx-auto"
                  >
                    {loading ? <FiRefreshCw className="animate-spin" /> : <FiUserPlus />}
                    Créer un compte
                  </button>
                ) : (
                  <div className="bg-red-50 p-3 rounded">
                    <p className="font-medium text-red-800">Email requis</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        
        {/* Footer */}
        <div className="p-4 border-t flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2 bg-violet-600 text-white rounded hover:bg-violet-700">
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// PAGE PRINCIPALE DES PARTENAIRES
// ============================================================================
export default function PartnersPage() {
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [selectedPartner, setSelectedPartner] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const { activeEntity } = useEntity();

  const partnerTypes = [
    { value: '', label: 'Tous' },
    { value: 'client', label: 'Client' },
    { value: 'fournisseur', label: 'Fournisseur' },
    { value: 'employe', label: 'Employé' },
    { value: 'debiteur', label: 'Débiteur divers' },
    { value: 'crediteur', label: 'Créditeur divers' },
  ];

  const statusOptions = [
    { value: '', label: 'Tous' },
    { value: 'active', label: 'Actifs' },
    { value: 'inactive', label: 'Inactifs' },
  ];

  useEffect(() => {
    setCurrentPage(1);
  }, [activeEntity]);

  const fetchPartners = useCallback(async () => {
    let isMounted = true;
    
    try {
      setLoading(true);
      setError(null);
      
      if (!activeEntity?.id) {
        if (isMounted) {
          setPartners([]);
          setLoading(false);
        }
        return;
      }

      console.log('🔍 Fetching partners for entity:', activeEntity.id);
      const response = await apiClient.get('/partenaires/');
      console.log('📥 Réponse API:', response);
      
      if (!isMounted) return;
      
      const data = parseResponse(response);
      
      const filteredData = data.filter(partner => 
        partner && (
          partner.company_id === activeEntity.id ||
          partner.company_id?.id === activeEntity.id
        )
      );
      
      console.log('✅ Partenaires filtrés:', filteredData.length);
      
      if (isMounted) {
        setPartners(filteredData);
      }
    } catch (err) {
      console.error('❌ Erreur fetchPartners:', err);
      
      if (!isMounted) return;
      
      let errorMessage = 'Impossible de charger les partenaires';
      const errorData = err?.response?.data;
      
      if (err?.response?.status === 400) {
        errorMessage = 'Paramètre incorrect. Chargement sans filtre...';
        
        try {
          const fallbackResponse = await apiClient.get('/partenaires/');
          const fallbackData = parseResponse(fallbackResponse);
          
          const filtered = fallbackData.filter(p => 
            p && (
              p.company_id === activeEntity.id || 
              p.company_id?.id === activeEntity.id
            )
          );
          
          if (isMounted) {
            setPartners(filtered);
          }
          return;
        } catch (fallbackErr) {
          console.error('Fallback aussi échoué:', fallbackErr);
        }
      } else if (errorData?.detail) {
        errorMessage = errorData.detail;
      } else if (err?.message) {
        errorMessage = err.message;
      }
      
      if (isMounted) {
        setError(errorMessage);
      }
    } finally {
      if (isMounted) {
        setLoading(false);
      }
    }
    
    return () => { isMounted = false; };
  }, [activeEntity?.id]);

  useEffect(() => {
    fetchPartners();
  }, [fetchPartners]);

  const filteredPartners = partners.filter(partner => {
    if (!partner) return false;
    
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch =
      (partner.nom || '').toLowerCase().includes(searchLower) ||
      (partner.email || '').toLowerCase().includes(searchLower) ||
      (partner.telephone || '').includes(searchTerm);
    
    const matchesType = !filterType || partner.type_partenaire === filterType;
    const matchesStatus = !filterStatus ||
      (filterStatus === 'active' && partner.statut === true) ||
      (filterStatus === 'inactive' && partner.statut === false);
    
    return matchesSearch && matchesType && matchesStatus;
  });

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentPartners = filteredPartners.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.max(1, Math.ceil(filteredPartners.length / itemsPerPage));

  const handleCreateUser = (partner) => {
    if (!partner?.email) {
      setError('Le partenaire doit avoir un email pour créer un compte');
      return;
    }
    if (partner?.user) {
      setError('Ce partenaire a déjà un compte utilisateur');
      return;
    }
    setSelectedPartner(partner);
    setShowUserModal(true);
  };

  const handleViewDetails = (partner) => {
    setSelectedPartner(partner);
    setShowDetailModal(true);
  };

  const handleEdit = (partner) => {
    setSelectedPartner(partner);
    setShowEditModal(true);
  };

  const handleDelete = async (partner) => {
    if (!window.confirm(`Supprimer "${partner?.nom}" ?`)) return;
    
    try {
      await apiClient.delete(`/partenaires/${partner.id}/`);
      await fetchPartners();
    } catch (err) {
      console.error('Erreur suppression:', err);
      setError(err?.response?.data?.detail || 'Erreur lors de la suppression');
    }
  };

  const handleRefresh = () => {
    fetchPartners();
    setSearchTerm('');
    setFilterType('');
    setFilterStatus('');
    setCurrentPage(1);
    setError(null);
  };

  const handleCreateSuccess = () => {
    fetchPartners();
    setShowCreateModal(false);
  };

  const handleEditSuccess = () => {
    fetchPartners();
    setShowEditModal(false);
  };

  const handleUserCreateSuccess = () => {
    fetchPartners();
  };

  const stats = {
    total: partners.length,
    actifs: partners.filter(p => p?.statut).length,
    inactifs: partners.filter(p => !p?.statut).length,
    avecEmail: partners.filter(p => p?.email).length,
    avecCompte: partners.filter(p => p?.user).length,
  };

  const getTypeIcon = (type) => {
    switch(type) {
      case 'client': return <FiUser className="w-4 h-4 text-blue-600" />;
      case 'fournisseur': return <FiPackage className="w-4 h-4 text-orange-600" />;
      case 'employe': return <FiUsers className="w-4 h-4 text-purple-600" />;
      case 'debiteur': return <FiCreditCard className="w-4 h-4 text-red-600" />;
      case 'crediteur': return <FiCreditCard className="w-4 h-4 text-green-600" />;
      default: return <FiUsers className="w-4 h-4 text-gray-600" />;
    }
  };

  const getTypeColor = (type) => {
    switch(type) {
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
      <div className="p-6">
        <div className="flex flex-col items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600"></div>
          <p className="mt-4 text-gray-600">Chargement des partenaires...</p>
        </div>
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
              title="Actualiser la liste"
            >
              <FiRefreshCw className={loading ? 'animate-spin' : ''} /> 
              Actualiser
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              disabled={!activeEntity}
              className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 ${
                !activeEntity ? 'bg-gray-400 cursor-not-allowed' : 'bg-violet-600 hover:bg-violet-700 text-white'
              }`}
            >
              <FiPlus /> Nouveau partenaire
            </button>
          </div>
        </div>
      </div>

      {/* Error */}
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

      {/* Statistiques */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <div className="bg-white p-3 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600">Total</p>
              <p className="text-lg font-bold text-gray-900">{stats.total}</p>
            </div>
            <div className="p-1.5 bg-violet-100 rounded">
              <FiUsers className="w-4 h-4 text-violet-600" />
            </div>
          </div>
        </div>
        <div className="bg-white p-3 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600">Actifs</p>
              <p className="text-lg font-bold text-green-600">{stats.actifs}</p>
            </div>
            <div className="p-1.5 bg-green-100 rounded">
              <FiCheck className="w-4 h-4 text-green-600" />
            </div>
          </div>
        </div>
        <div className="bg-white p-3 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600">Avec compte</p>
              <p className="text-lg font-bold text-blue-600">{stats.avecCompte}</p>
            </div>
            <div className="p-1.5 bg-blue-100 rounded">
              <FiUserPlus className="w-4 h-4 text-blue-600" />
            </div>
          </div>
        </div>
        <div className="bg-white p-3 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600">Avec email</p>
              <p className="text-lg font-bold text-emerald-600">{stats.avecEmail}</p>
            </div>
            <div className="p-1.5 bg-emerald-100 rounded">
              <FiMail className="w-4 h-4 text-emerald-600" />
            </div>
          </div>
        </div>
        <div className="bg-white p-3 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600">Inactifs</p>
              <p className="text-lg font-bold text-amber-600">{stats.inactifs}</p>
            </div>
            <div className="p-1.5 bg-amber-100 rounded">
              <FiXCircle className="w-4 h-4 text-amber-600" />
            </div>
          </div>
        </div>
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
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <select
              value={filterType}
              onChange={(e) => {
                setFilterType(e.target.value);
                setCurrentPage(1);
              }}
              className="border border-gray-300 rounded-lg px-3 py-3 focus:ring-2 focus:ring-violet-500"
            >
              {partnerTypes.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
            <select
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="border border-gray-300 rounded-lg px-3 py-3 focus:ring-2 focus:ring-violet-500"
            >
              {statusOptions.map(status => (
                <option key={status.value} value={status.value}>{status.label}</option>
              ))}
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
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Nom</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Type</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Contact</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Compte</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Statut</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Actions</th>
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
              ) : (
                currentPartners.map((partner) => (
                  <tr key={partner.id} className="hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-medium text-gray-900">{partner.nom || 'Non spécifié'}</p>
                        <p className="text-xs text-gray-500">ID: {partner.id}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {getTypeIcon(partner.type_partenaire)}
                        <span className={`px-2 py-1 rounded text-xs font-medium capitalize ${getTypeColor(partner.type_partenaire)}`}>
                          {partner.type_partenaire || 'Non spécifié'}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="space-y-1">
                        {partner.email && (
                          <div className="flex items-center gap-2 text-sm">
                            <FiMail className="w-3 h-3 text-gray-400" />
                            <span className="text-gray-700 truncate max-w-[150px]">{partner.email}</span>
                          </div>
                        )}
                        {partner.telephone && (
                          <div className="flex items-center gap-2 text-sm">
                            <FiPhone className="w-3 h-3 text-gray-400" />
                            <span className="text-gray-700">{partner.telephone}</span>
                          </div>
                        )}
                        {(!partner.email && !partner.telephone) && (
                          <span className="text-xs text-gray-400 italic">Aucun contact</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {partner.user ? (
                        <div className="flex items-center gap-2">
                          <FiCheckCircle className="w-4 h-4 text-green-500" />
                          <span className="text-sm text-green-700">Compte actif</span>
                        </div>
                      ) : partner.email ? (
                        <button
                          onClick={() => handleCreateUser(partner)}
                          className="px-3 py-1 bg-violet-100 text-violet-700 rounded text-sm hover:bg-violet-200 flex items-center gap-1"
                        >
                          <FiUserPlus className="w-3 h-3" />
                          Créer compte
                        </button>
                      ) : (
                        <span className="text-xs text-gray-400 italic">Email requis</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        partner.statut ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {partner.statut ? 'Actif' : 'Inactif'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleViewDetails(partner)}
                          className="p-1.5 text-gray-600 hover:text-violet-600 hover:bg-violet-50 rounded"
                          title="Voir les détails"
                        >
                          <FiEye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEdit(partner)}
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
                ))
              )}
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
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className={`p-2 rounded-lg border ${
                currentPage === 1
                  ? "border-gray-200 text-gray-400 cursor-not-allowed"
                  : "border-gray-300 text-gray-700 hover:bg-gray-50"
              }`}
            >
              <FiChevronLeft className="w-5 h-5" />
            </button>
            <span className="text-sm text-gray-700">
              Page {currentPage} sur {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className={`p-2 rounded-lg border ${
                currentPage === totalPages
                  ? "border-gray-200 text-gray-400 cursor-not-allowed"
                  : "border-gray-300 text-gray-700 hover:bg-gray-50"
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
        onSuccess={handleCreateSuccess}
      />
      <EditPartnerModal
        open={showEditModal}
        onClose={() => setShowEditModal(false)}
        partner={selectedPartner}
        onSuccess={handleEditSuccess}
      />
      <PartnerDetailModal
        partner={selectedPartner}
        onClose={() => setShowDetailModal(false)}
        onCreateUser={handleCreateUser}
      />
      <UserFromPartenaireModal
        open={showUserModal}
        onClose={() => setShowUserModal(false)}
        partenaire={selectedPartner}
        onSuccess={handleUserCreateSuccess}
      />
    </div>
  );
}