import React, { useEffect, useRef, useState } from 'react';
import { FiAlertCircle, FiCheck, FiChevronDown, FiChevronUp, FiGlobe, FiMap, FiMapPin, FiSearch } from 'react-icons/fi';
import { apiClient } from '../../services/apiClient';

// ==========================================
// COMPOSANT TOOLTIP
// ==========================================
export const Tooltip = ({ children, text, position = 'top' }) => {
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

export const parseResponse = (response) => {
  if (!response) return [];
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.results)) return response.results;
  if (Array.isArray(response?.partenaires)) return response.partenaires;
  return [];
};

export const INITIAL_FORM = {
  nom: '',
  type_partenaire: 'client',
  email: '',
  telephone: '',
  adresse: '',
  complement_adresse: '',
  statut: true,
  is_company: true,
  pays: '',
  region: '',
  ville: '',
  code_postal: '',
  site_web: '',
  notes: '',
  numero_fiscal: '',
  registre_commerce: '',
  securite_sociale: '',
  ville_legacy: '',
  region_legacy: '',
};

export const PARTNER_TYPES = [
  { value: 'client', label: 'Client' },
  { value: 'fournisseur', label: 'Fournisseur' },
  { value: 'client_fournisseur', label: 'Client / Fournisseur' },
  { value: 'autre', label: 'Autre' },
];

export function validatePartnerForm(formData) {
  const errors = {};
  if (!formData.nom?.trim()) errors.nom = 'Le nom / raison sociale est obligatoire';
  if (!formData.type_partenaire) errors.type_partenaire = 'Le type de partenaire est obligatoire';
  if (!formData.email?.trim()) errors.email = "L'email est obligatoire";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) errors.email = "L'adresse email n'est pas valide";
  if (!formData.telephone?.trim()) errors.telephone = 'Le telephone est obligatoire';
  if (!formData.pays) errors.pays = 'Le pays est obligatoire';
  if (!formData.region) errors.region = 'La region est obligatoire';
  if (!formData.ville) errors.ville = 'La ville est obligatoire';
  if (!formData.adresse?.trim()) errors.adresse = "L'adresse est obligatoire";
  return errors;
}

export function partnerToForm(partner) {
  if (!partner) return INITIAL_FORM;
  return {
    nom: partner.nom || '',
    type_partenaire: partner.type_partenaire || 'client',
    email: partner.email || '',
    telephone: partner.telephone || '',
    adresse: partner.adresse || '',
    complement_adresse: partner.complement_adresse || '',
    statut: partner.statut !== undefined ? partner.statut : true,
    is_company: partner.is_company !== undefined ? partner.is_company : true,
    pays: partner.pays_details?.id ?? partner.pays ?? '',
    region: partner.region_details?.id ?? partner.region ?? '',
    ville: partner.ville_details?.id ?? partner.ville ?? '',
    code_postal: partner.code_postal || '',
    site_web: partner.site_web || '',
    notes: partner.notes || '',
    numero_fiscal: partner.numero_fiscal || '',
    registre_commerce: partner.registre_commerce || '',
    securite_sociale: partner.securite_sociale || '',
    ville_legacy: partner.ville_legacy || '',
    region_legacy: partner.region_legacy || '',
  };
}

export function buildPartnerPayload(formData) {
  return {
    nom: formData.nom?.trim() || '',
    type_partenaire: formData.type_partenaire,
    email: formData.email?.trim() || '',
    telephone: formData.telephone?.trim() || '',
    adresse: formData.adresse?.trim() || '',
    complement_adresse: formData.complement_adresse?.trim() || '',
    statut: formData.statut,
    is_company: formData.is_company,
    pays: formData.pays ? parseInt(formData.pays, 10) : null,
    region: formData.region ? parseInt(formData.region, 10) : null,
    ville: formData.ville ? parseInt(formData.ville, 10) : null,
    code_postal: formData.code_postal?.trim() || '',
    site_web: formData.site_web?.trim() || '',
    notes: formData.notes?.trim() || '',
    numero_fiscal: formData.numero_fiscal?.trim() || '',
    registre_commerce: formData.registre_commerce?.trim() || '',
    securite_sociale: formData.securite_sociale?.trim() || '',
    ville_legacy: formData.ville_legacy?.trim() || null,
    region_legacy: formData.region_legacy?.trim() || null,
  };
}

export function getPartnerName(partner) {
  return partner?.nom || partner?.raison_sociale || partner?.name || 'Partenaire sans nom';
}

export function SearchableDropdown({
  label, value, onChange, options, searchValue, onSearchChange,
  placeholder, required = false, disabled = false, icon: Icon,
  getOptionLabel = (o) => o, getOptionValue = (o) => o, errorClass = '',
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);
  const filteredOptions = options.filter(o =>
    getOptionLabel(o).toLowerCase().includes((searchValue || '').toLowerCase())
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

  return (
    <div className="relative" ref={dropdownRef}>
      {label && (
        <label className="block text-xs font-medium text-gray-700 mb-1">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <button
        type="button"
        onClick={() => {
          if (!disabled) {
            setIsOpen(v => !v);
            setTimeout(() => inputRef.current?.focus(), 0);
          }
        }}
        disabled={disabled}
        className={`w-full text-left border px-2 py-1 text-xs focus:outline-none focus:ring-1 ${
          disabled ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200' : 'bg-white hover:border-gray-400'
        } ${isOpen ? 'ring-1 ring-purple-500 border-purple-500' : errorClass || 'border-gray-300 focus:ring-purple-500'}`}
        style={{ height: 26 }}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {Icon && <Icon size={13} className="text-gray-400 flex-shrink-0" />}
            {selectedOption
              ? <span className="text-gray-900 font-medium truncate">{getOptionLabel(selectedOption)}</span>
              : <span className="text-gray-400 truncate">{placeholder}</span>}
          </div>
          {isOpen ? <FiChevronUp size={13} /> : <FiChevronDown size={13} />}
        </div>
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 shadow-xl max-h-60 overflow-auto">
          <div className="p-2 border-b border-gray-100 sticky top-0 bg-white">
            <div className="relative">
              <FiSearch className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" size={12} />
              <input
                ref={inputRef}
                type="text"
                value={searchValue}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full pl-7 pr-2 py-1 text-xs border border-gray-200 focus:outline-none focus:ring-1 focus:ring-purple-500"
                placeholder="Rechercher..."
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>
          <div className="py-1">
            {filteredOptions.length > 0 ? filteredOptions.map((option, i) => (
              <button
                type="button"
                key={i}
                className={`w-full px-3 py-1.5 text-xs text-left cursor-pointer hover:bg-purple-50 flex items-center gap-2 ${
                  getOptionValue(option) === value ? 'bg-purple-50 text-purple-700 font-medium' : 'text-gray-700'
                }`}
                onClick={() => {
                  onChange(getOptionValue(option));
                  setIsOpen(false);
                  onSearchChange('');
                }}
              >
                {getOptionLabel(option)}
                {getOptionValue(option) === value && <FiCheck size={12} className="ml-auto text-purple-600" />}
              </button>
            )) : <div className="px-4 py-3 text-xs text-gray-500 text-center">Aucun resultat</div>}
          </div>
        </div>
      )}
    </div>
  );
}

function useLocationData({ paysId, regionId }) {
  const [paysList, setPaysList] = useState([]);
  const [regionsList, setRegionsList] = useState([]);
  const [villesList, setVillesList] = useState([]);

  useEffect(() => {
    let mounted = true;
    apiClient.get('/pays/').then(res => { if (mounted) setPaysList(parseResponse(res)); }).catch(console.error);
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!paysId) { setRegionsList([]); setVillesList([]); return; }
    let mounted = true;
    apiClient.get(`/subdivisions/?pays=${paysId}`).then(res => { if (mounted) setRegionsList(parseResponse(res)); }).catch(console.error);
    return () => { mounted = false; };
  }, [paysId]);

  useEffect(() => {
    if (!regionId) { setVillesList([]); return; }
    let mounted = true;
    apiClient.get(`/villes/?subdivision=${regionId}`).then(res => { if (mounted) setVillesList(parseResponse(res)); }).catch(console.error);
    return () => { mounted = false; };
  }, [regionId]);

  return { paysList, regionsList, villesList };
}

function FieldError({ message }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-red-600 flex items-center gap-1 ml-[148px]"><FiAlertCircle size={12} />{message}</p>;
}

// ==========================================
// LIGNE "LIBELLE DEVANT LE CHAMP"
// (meme gabarit que la section infos de la piece comptable :
//  label a gauche, largeur fixe, champ a droite, hauteur 26px)
// ==========================================
function FormField({ label, required, error, children }) {
  return (
    <div>
      <div className="flex items-center" style={{ minHeight: '26px' }}>
        <label className="text-xs text-gray-700 min-w-[140px] flex-shrink-0 font-medium">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        <div className="flex-1 ml-2">
          {children}
        </div>
      </div>
      <FieldError message={error} />
    </div>
  );
}

export function PartnerForm({ formData, setFormData, fieldErrors, setFieldErrors, mode = 'all' }) {
  const [searchPays, setSearchPays] = useState('');
  const [searchRegion, setSearchRegion] = useState('');
  const [searchVille, setSearchVille] = useState('');
  const { paysList, regionsList, villesList } = useLocationData({
    paysId: formData.pays || null,
    regionId: formData.region || null,
  });

  const setField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (fieldErrors?.[field]) setFieldErrors(prev => ({ ...prev, [field]: null }));
  };

  const inputClass = (field) =>
    `w-full border px-2 py-1 text-xs focus:ring-1 focus:ring-purple-500 focus:outline-none ${fieldErrors?.[field] ? 'border-red-500' : 'border-gray-300'}`;

  return (
    <div className="space-y-4">
      {(mode === 'all' || mode === 'main' || mode === 'identity') && (
        <div className="border border-gray-300 p-3">
          <div className="bg-gray-100 -m-3 mb-3 px-3 py-1.5 text-xs font-medium border-b border-gray-300">Identité</div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <FormField label="Nom / Raison sociale" required error={fieldErrors?.nom}>
                <input value={formData.nom} onChange={(e) => setField('nom', e.target.value)} className={inputClass('nom')} style={{ height: 26 }} />
              </FormField>
              <FormField label="Nature">
                <select value={formData.is_company ? 'company' : 'person'} onChange={(e) => setField('is_company', e.target.value === 'company')} className={inputClass('is_company')} style={{ height: 26 }}>
                  <option value="company">Société</option>
                  <option value="person">Personne</option>
                </select>
              </FormField>
            </div>
            <div className="space-y-2">
              <FormField label="Type" required error={fieldErrors?.type_partenaire}>
                <select value={formData.type_partenaire} onChange={(e) => setField('type_partenaire', e.target.value)} className={inputClass('type_partenaire')} style={{ height: 26 }}>
                  {PARTNER_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </FormField>
              <FormField label="Statut">
                <select value={formData.statut ? 'actif' : 'inactif'} onChange={(e) => setField('statut', e.target.value === 'actif')} className={inputClass('statut')} style={{ height: 26 }}>
                  <option value="actif">Actif</option>
                  <option value="inactif">Inactif</option>
                </select>
              </FormField>
            </div>
          </div>
        </div>
      )}

      {(mode === 'all' || mode === 'main' || mode === 'identity') && (
        <div className="border border-gray-300 p-3">
          <div className="bg-gray-100 -m-3 mb-3 px-3 py-1.5 text-xs font-medium border-b border-gray-300">Contact</div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <FormField label="Email" required error={fieldErrors?.email}>
                <input type="email" value={formData.email} onChange={(e) => setField('email', e.target.value)} className={inputClass('email')} style={{ height: 26 }} />
              </FormField>
              <FormField label="Site web">
                <input value={formData.site_web} onChange={(e) => setField('site_web', e.target.value)} className={inputClass('site_web')} style={{ height: 26 }} />
              </FormField>
            </div>
            <div className="space-y-2">
              <FormField label="Téléphone" required error={fieldErrors?.telephone}>
                <input value={formData.telephone} onChange={(e) => setField('telephone', e.target.value)} className={inputClass('telephone')} style={{ height: 26 }} />
              </FormField>
            </div>
          </div>
        </div>
      )}

      {(mode === 'all' || mode === 'main' || mode === 'location') && (
        <div className="border border-gray-300 p-3">
          <div className="bg-gray-100 -m-3 mb-3 px-3 py-1.5 text-xs font-medium border-b border-gray-300">Localisation</div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <FormField label="Pays" required error={fieldErrors?.pays}>
                <SearchableDropdown
                  value={formData.pays || null}
                  onChange={(v) => setFormData(prev => ({ ...prev, pays: v, region: '', ville: '' }))}
                  options={paysList}
                  searchValue={searchPays}
                  onSearchChange={setSearchPays}
                  placeholder="Pays"
                  icon={FiGlobe}
                  getOptionLabel={(p) => `${p.emoji || ''} ${p.nom_fr || p.nom || ''} (${p.code_iso || ''})`}
                  getOptionValue={(p) => p.id}
                  errorClass={fieldErrors?.pays ? 'border-red-500' : ''}
                />
              </FormField>
              <FormField label="Région" required error={fieldErrors?.region}>
                <SearchableDropdown
                  value={formData.region || null}
                  onChange={(v) => setFormData(prev => ({ ...prev, region: v, ville: '' }))}
                  options={regionsList}
                  searchValue={searchRegion}
                  onSearchChange={setSearchRegion}
                  placeholder="Région"
                  disabled={!formData.pays}
                  icon={FiMap}
                  getOptionLabel={(r) => `${r.nom || ''} (${r.type_subdivision || ''})`}
                  getOptionValue={(r) => r.id}
                  errorClass={fieldErrors?.region ? 'border-red-500' : ''}
                />
              </FormField>
              <FormField label="Ville" required error={fieldErrors?.ville}>
                <SearchableDropdown
                  value={formData.ville || null}
                  onChange={(v) => setField('ville', v)}
                  options={villesList}
                  searchValue={searchVille}
                  onSearchChange={setSearchVille}
                  placeholder="Ville"
                  disabled={!formData.region}
                  icon={FiMapPin}
                  getOptionLabel={(v) => `${v.nom || ''}${v.subdivision_nom ? ` (${v.subdivision_nom})` : ''}`}
                  getOptionValue={(v) => v.id}
                  errorClass={fieldErrors?.ville ? 'border-red-500' : ''}
                />
              </FormField>
            </div>
            <div className="space-y-2">
              <FormField label="Code postal">
                <input value={formData.code_postal} onChange={(e) => setField('code_postal', e.target.value)} className={inputClass('code_postal')} style={{ height: 26 }} />
              </FormField>
              <FormField label="Complément adresse">
                <input value={formData.complement_adresse} onChange={(e) => setField('complement_adresse', e.target.value)} className={inputClass('complement_adresse')} style={{ height: 26 }} />
              </FormField>
              <FormField label="Adresse" required error={fieldErrors?.adresse}>
                <textarea value={formData.adresse} onChange={(e) => setField('adresse', e.target.value)} className={inputClass('adresse')} rows={2} />
              </FormField>
            </div>
          </div>
        </div>
      )}

      {(mode === 'all' || mode === 'main' || mode === 'fiscal') && (
        <div className="border border-gray-300 p-3">
          <div className="bg-gray-100 -m-3 mb-3 px-3 py-1.5 text-xs font-medium border-b border-gray-300">Informations fiscales</div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <FormField label="Numéro fiscal">
                <input value={formData.numero_fiscal} onChange={(e) => setField('numero_fiscal', e.target.value)} className={inputClass('numero_fiscal')} style={{ height: 26 }} />
              </FormField>
              <FormField label="Sécurité sociale">
                <input value={formData.securite_sociale} onChange={(e) => setField('securite_sociale', e.target.value)} className={inputClass('securite_sociale')} style={{ height: 26 }} />
              </FormField>
            </div>
            <div className="space-y-2">
              <FormField label="Registre commerce">
                <input value={formData.registre_commerce} onChange={(e) => setField('registre_commerce', e.target.value)} className={inputClass('registre_commerce')} style={{ height: 26 }} />
              </FormField>
            </div>
          </div>
        </div>
      )}

      {(mode === 'all' || mode === 'notes') && (
        <div className="border border-gray-300">
          <div className="bg-gray-100 border-b border-gray-300 px-2 py-1.5 text-xs font-medium">Notes</div>
          <textarea value={formData.notes} onChange={(e) => setField('notes', e.target.value)} className="w-full border-0 px-2 py-2 text-xs focus:ring-1 focus:ring-purple-500" rows={4} />
        </div>
      )}
    </div>
  );
}