// C:\python\django\somane_frontend\src\pages\Partners\PartnerShared.jsx
import React, { useEffect, useRef, useState } from 'react';
import { FiAlertCircle, FiCheck, FiChevronDown, FiChevronUp, FiGlobe, FiMap, FiMapPin, FiSearch } from 'react-icons/fi';
import { apiClient } from '../../services/apiClient';
import { useUi } from '../../context/UiContext';
import SomaneSelect from '../../components/SomaneSelect';

// ==========================================
// COMPOSANT TOOLTIP
// ==========================================
export const Tooltip = ({ children, text }) => (
  <span className="somane-tooltip" data-tooltip={text}>{children}</span>
);

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
  mobile: '',
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
  vat: '',
  registre_commerce: '',
  securite_sociale: '',
  ville_legacy: '',
  region_legacy: '',
};

export const PARTNER_TYPES = [
  { value: 'client', label: 'Client' },
  { value: 'fournisseur', label: 'Fournisseur' },
  { value: 'employe', label: 'Employé' },
  { value: 'debiteur', label: 'Débiteur divers' },
  { value: 'crediteur', label: 'Créditeur divers' },
];

function getPartnerFormSchema(configuration) {
  if (typeof DOMParser === 'undefined') return null;
  const actions = Object.values(configuration?.actions || {});
  const candidates = [];
  for (const action of actions) {
    if (action.model !== 'core.Partenaire') continue;
    const formRef = (action.views || []).find((item) => item.mode === 'form');
    const view = formRef && configuration?.views?.[String(formRef.view_id)];
    if (view?.architecture) candidates.push({ action, view });
  }
  candidates.sort((left, right) => Number(right.view.key === 'somane_ui.clients_form') - Number(left.view.key === 'somane_ui.clients_form'));

  for (const { action, view } of candidates) {
    const document = new DOMParser().parseFromString(view.architecture, 'application/xml');
    if (document.querySelector('parsererror')) continue;
    const definitions = new Map((action.fields || []).map((field) => [field.name, field]));
    const sections = Array.from(document.querySelectorAll('form > group')).map((group, index) => ({
      title: group.getAttribute('string') || `Informations ${index + 1}`,
      fields: Array.from(group.querySelectorAll(':scope > field')).map((node) => {
        const name = node.getAttribute('name');
        const definition = definitions.get(name);
        if (!name || !definition) return null;
        return {
          name,
          label: node.getAttribute('string') || definition.label || name,
          type: definition.type || 'char',
          state: definition.state || 'base',
          relation: definition.relation || '',
          size: definition.size || null,
          defaultValue: definition.default_value ?? null,
          selection: Array.isArray(definition.selection) ? definition.selection : [],
          help: node.getAttribute('help') || definition.help || PARTNER_FIELD_HELP[name] || '',
          required: node.hasAttribute('required')
            ? ['1', 'true'].includes(node.getAttribute('required').toLowerCase())
            : Boolean(definition.required),
          readonly: node.hasAttribute('readonly')
            ? ['1', 'true'].includes(node.getAttribute('readonly').toLowerCase())
            : Boolean(definition.readonly),
        };
      }).filter(Boolean),
    })).filter((section) => section.fields.length);

    if (sections.length) return sections;
  }
  return null;
}

export function getRequiredPartnerCustomFields(configuration) {
  const fieldsByName = new Map();
  for (const action of Object.values(configuration?.actions || {})) {
    if (action.model !== 'core.Partenaire') continue;
    for (const field of action.fields || []) {
      if (field.state === 'manual' && field.required && field.name?.startsWith('x_')) {
        fieldsByName.set(field.name, { name: field.name, label: field.label || field.name });
      }
    }
  }
  return Array.from(fieldsByName.values());
}

export function getPartnerFieldDefaults(configuration) {
  const defaults = {};
  for (const action of Object.values(configuration?.actions || {})) {
    if (action.model !== 'core.Partenaire') continue;
    for (const field of action.fields || []) {
      if (field.default_value !== null && field.default_value !== undefined) {
        defaults[field.name] = field.default_value;
      }
    }
  }
  return defaults;
}

export function validateRequiredPartnerCustomFields(formData, requiredCustomFields = []) {
  const errors = {};
  for (const field of requiredCustomFields) {
    const value = formData[field.name];
    if (value === undefined || value === null || (typeof value === 'string' && !value.trim())) {
      errors[field.name] = `${field.label} est obligatoire`;
    }
  }
  return errors;
}

export function validatePartnerForm(formData, requiredCustomFields = []) {
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
  return { ...errors, ...validateRequiredPartnerCustomFields(formData, requiredCustomFields) };
}

export function partnerToForm(partner) {
  if (!partner) return INITIAL_FORM;
  return {
    nom: partner.nom || '',
    type_partenaire: partner.type_partenaire || 'client',
    email: partner.email || '',
    telephone: partner.telephone || '',
    mobile: partner.mobile || '',
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
    vat: partner.vat || '',
    registre_commerce: partner.registre_commerce || '',
    securite_sociale: partner.securite_sociale || '',
    ville_legacy: partner.ville_legacy || '',
    region_legacy: partner.region_legacy || '',
    ...(partner.custom_fields && typeof partner.custom_fields === 'object' ? partner.custom_fields : {}),
  };
}

export function buildPartnerPayload(formData) {
  return {
    nom: formData.nom?.trim() || '',
    type_partenaire: formData.type_partenaire,
    email: formData.email?.trim() || '',
    telephone: formData.telephone?.trim() || '',
    mobile: formData.mobile?.trim() || '',
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
    vat: formData.vat?.trim() || '',
    registre_commerce: formData.registre_commerce?.trim() || '',
    securite_sociale: formData.securite_sociale?.trim() || '',
    ville_legacy: formData.ville_legacy?.trim() || null,
    region_legacy: formData.region_legacy?.trim() || null,
    custom_fields: Object.fromEntries(
      Object.entries(formData).filter(([name]) => name.startsWith('x_')),
    ),
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
const PARTNER_FIELD_HELP = {
  nom: 'Nom de la personne ou raison sociale de l’organisation. Ce nom sert à retrouver et identifier le partenaire.',
  is_company: 'Indique si ce partenaire représente une organisation ou une personne physique.',
  type_partenaire: 'Catégorie utilisée pour distinguer les clients, fournisseurs et autres partenaires.',
  statut: 'Un partenaire inactif reste dans l’historique, mais peut être masqué des choix courants.',
  email: 'Adresse de contact de ce partenaire. Elle est enregistrée sur sa fiche Partenaire ; un email d’un autre modèle reste indépendant sans lien explicite.',
  site_web: 'Adresse du site web du partenaire, par exemple https://exemple.com.',
  telephone: 'Numéro de téléphone principal à utiliser pour contacter ce partenaire.',
  pays: 'Pays de l’adresse principale du partenaire.',
  region: 'Région, province ou subdivision administrative du pays sélectionné.',
  ville: 'Ville du partenaire, dans la région sélectionnée.',
  code_postal: 'Code postal associé à l’adresse du partenaire, s’il existe.',
  complement_adresse: 'Précision complémentaire : bâtiment, étage, quartier ou boîte postale.',
  adresse: 'Adresse principale du partenaire : rue, numéro et autres indications utiles.',
  numero_fiscal: 'Identifiant fiscal attribué au partenaire par l’administration compétente.',
  securite_sociale: 'Numéro d’immatriculation à la sécurité sociale, si cela s’applique à ce partenaire.',
  registre_commerce: 'Numéro d’inscription de l’entreprise au registre du commerce.',
};

function FormField({ label, required, error, help, children }) {
  return (
    <div>
      <div className="flex items-center" style={{ minHeight: '26px' }}>
        <div className="text-xs text-gray-700 min-w-[140px] flex-shrink-0 font-medium flex items-center gap-1">
          <span>{label} {required && <span className="text-red-500">*</span>}</span>
          {help && (
            <details className="group relative flex-shrink-0">
              <summary
                aria-label={`Aide pour ${label}`}
                data-tooltip={help}
                className="list-none cursor-pointer select-none w-4 h-4 rounded-full border border-gray-400 text-gray-500 hover:border-purple-500 hover:text-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-400 flex items-center justify-center text-[10px] leading-none"
              >
                ?
              </summary>
            </details>
          )}
        </div>
        <div className="flex-1 ml-2">
          {children}
        </div>
      </div>
      <FieldError message={error} />
    </div>
  );
}

export function PartnerForm({ formData, setFormData, fieldErrors, setFieldErrors, mode = 'all', readOnly = false }) {
  const { configuration } = useUi();
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

  const viewSections = mode === 'main' ? getPartnerFormSchema(configuration) : null;
  if (viewSections) {
    const renderField = (field) => {
      const { name, type, label, required, readonly, help } = field;
      const disabled = readOnly || readonly;
      const commonProps = {
        className: inputClass(name),
        disabled,
        onChange: (event) => setField(name, event.target.value),
      };
      let control;

      if (name === 'pays') {
        control = <SearchableDropdown value={formData.pays || null} onChange={(value) => setFormData((previous) => ({ ...previous, pays: value, region: '', ville: '' }))} options={paysList} searchValue={searchPays} onSearchChange={setSearchPays} placeholder={label} disabled={disabled} icon={FiGlobe} getOptionLabel={(country) => `${country.emoji || ''} ${country.nom_fr || country.nom || ''} (${country.code_iso || ''})`} getOptionValue={(country) => country.id} errorClass={fieldErrors?.[name] ? 'border-red-500' : ''} />;
      } else if (name === 'region') {
        control = <SearchableDropdown value={formData.region || null} onChange={(value) => setFormData((previous) => ({ ...previous, region: value, ville: '' }))} options={regionsList} searchValue={searchRegion} onSearchChange={setSearchRegion} placeholder={label} disabled={disabled || !formData.pays} icon={FiMap} getOptionLabel={(region) => `${region.nom || ''} (${region.type_subdivision || ''})`} getOptionValue={(region) => region.id} errorClass={fieldErrors?.[name] ? 'border-red-500' : ''} />;
      } else if (name === 'ville') {
        control = <SearchableDropdown value={formData.ville || null} onChange={(value) => setField(name, value)} options={villesList} searchValue={searchVille} onSearchChange={setSearchVille} placeholder={label} disabled={disabled || !formData.region} icon={FiMapPin} getOptionLabel={(city) => `${city.nom || ''}${city.subdivision_nom ? ` (${city.subdivision_nom})` : ''}`} getOptionValue={(city) => city.id} errorClass={fieldErrors?.[name] ? 'border-red-500' : ''} />;
      } else if (name === 'type_partenaire') {
        const options = field.selection.length
          ? field.selection.map((option) => ({ value: option.value, label: option.label || option.name || option.value }))
          : PARTNER_TYPES;
        control = <SomaneSelect value={formData[name] || ''} onChange={(event) => setField(name, event.target.value)} className={inputClass(name)} disabled={disabled}>
          {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </SomaneSelect>;
      } else if (name === 'statut' || name === 'is_company') {
        const trueLabel = name === 'statut' ? 'Actif' : 'Société';
        const falseLabel = name === 'statut' ? 'Inactif' : 'Personne';
        control = <SomaneSelect value={formData[name] ? 'true' : 'false'} onChange={(event) => setField(name, event.target.value === 'true')} className={inputClass(name)} disabled={disabled}>
          <option value="true">{trueLabel}</option><option value="false">{falseLabel}</option>
        </SomaneSelect>;
      } else if (type === 'selection') {
        control = <SomaneSelect value={formData[name] ?? ''} onChange={(event) => setField(name, event.target.value)} className={inputClass(name)} disabled={disabled}>
          <option value="">— Sélectionner —</option>
          {field.selection.map((option) => <option key={option.value} value={option.value}>{option.label || option.name || option.value}</option>)}
        </SomaneSelect>;
      } else if (type === 'boolean') {
        const booleanValue = formData[name] === true ? 'true' : formData[name] === false ? 'false' : '';
        control = <SomaneSelect value={booleanValue} onChange={(event) => setField(name, event.target.value === '' ? '' : event.target.value === 'true')} className={inputClass(name)} disabled={disabled}>
          <option value="">— Sélectionner —</option><option value="true">Oui</option><option value="false">Non</option>
        </SomaneSelect>;
      } else if (type === 'text' || type === 'html') {
        control = <textarea {...commonProps} value={formData[name] ?? ''} rows={3} readOnly={disabled} />;
      } else {
        const inputType = name === 'email' ? 'email' : name === 'site_web' ? 'url' : name === 'telephone' || name === 'mobile' ? 'tel' : type === 'date' ? 'date' : type === 'datetime' ? 'datetime-local' : ['integer', 'float', 'decimal', 'monetary'].includes(type) ? 'number' : 'text';
        const step = type === 'integer' ? '1' : ['float', 'decimal', 'monetary'].includes(type) ? 'any' : undefined;
        control = <input {...commonProps} type={inputType} step={step} maxLength={type === 'char' && field.size ? field.size : undefined} value={formData[name] ?? ''} readOnly={disabled} style={{ height: 26 }} />;
      }

      return <FormField key={name} label={label} required={required} error={fieldErrors?.[name]} help={help}>{control}</FormField>;
    };

    return (
      <fieldset disabled={readOnly} className={`w-full min-w-0 border-0 p-0 m-0 space-y-4 ${readOnly ? 'pointer-events-none opacity-80' : ''}`}>
        {viewSections.map((section) => (
          <section key={section.title} className="border border-gray-300 p-3">
            <h3 className="-m-3 mb-3 border-b border-gray-300 bg-gray-100 px-3 py-1.5 text-xs font-medium">{section.title}</h3>
            <div className="grid grid-cols-1 gap-x-4 gap-y-2 md:grid-cols-2">{section.fields.map(renderField)}</div>
          </section>
        ))}
      </fieldset>
    );
  }

  return (
    <fieldset disabled={readOnly} className={`w-full min-w-0 border-0 p-0 m-0 space-y-4 ${readOnly ? 'pointer-events-none opacity-80' : ''}`}>
      {(mode === 'all' || mode === 'main' || mode === 'identity') && (
        <div className="border border-gray-300 p-3">
          <div className="bg-gray-100 -m-3 mb-3 px-3 py-1.5 text-xs font-medium border-b border-gray-300">Identité</div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <FormField label="Nom / Raison sociale" required error={fieldErrors?.nom} help={PARTNER_FIELD_HELP.nom}>
                <input value={formData.nom} onChange={(e) => setField('nom', e.target.value)} className={inputClass('nom')} style={{ height: 26 }} />
              </FormField>
              <FormField label="Nature" help={PARTNER_FIELD_HELP.is_company}>
                <SomaneSelect value={formData.is_company ? 'company' : 'person'} onChange={(e) => setField('is_company', e.target.value === 'company')} className={inputClass('is_company')} style={{ height: 26 }}>
                  <option value="company">Société</option>
                  <option value="person">Personne</option>
                </SomaneSelect>
              </FormField>
            </div>
            <div className="space-y-2">
              <FormField label="Type" required error={fieldErrors?.type_partenaire} help={PARTNER_FIELD_HELP.type_partenaire}>
                <SomaneSelect value={formData.type_partenaire} onChange={(e) => setField('type_partenaire', e.target.value)} className={inputClass('type_partenaire')} style={{ height: 26 }}>
                  {PARTNER_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </SomaneSelect>
              </FormField>
              <FormField label="Statut" help={PARTNER_FIELD_HELP.statut}>
                <SomaneSelect value={formData.statut ? 'actif' : 'inactif'} onChange={(e) => setField('statut', e.target.value === 'actif')} className={inputClass('statut')} style={{ height: 26 }}>
                  <option value="actif">Actif</option>
                  <option value="inactif">Inactif</option>
                </SomaneSelect>
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
              <FormField label="Email" required error={fieldErrors?.email} help={PARTNER_FIELD_HELP.email}>
                <input type="email" value={formData.email} onChange={(e) => setField('email', e.target.value)} className={inputClass('email')} style={{ height: 26 }} />
              </FormField>
              <FormField label="Site web" help={PARTNER_FIELD_HELP.site_web}>
                <input value={formData.site_web} onChange={(e) => setField('site_web', e.target.value)} className={inputClass('site_web')} style={{ height: 26 }} />
              </FormField>
            </div>
            <div className="space-y-2">
              <FormField label="Téléphone" required error={fieldErrors?.telephone} help={PARTNER_FIELD_HELP.telephone}>
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
              <FormField label="Pays" required error={fieldErrors?.pays} help={PARTNER_FIELD_HELP.pays}>
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
              <FormField label="Région" required error={fieldErrors?.region} help={PARTNER_FIELD_HELP.region}>
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
              <FormField label="Ville" required error={fieldErrors?.ville} help={PARTNER_FIELD_HELP.ville}>
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
              <FormField label="Code postal" help={PARTNER_FIELD_HELP.code_postal}>
                <input value={formData.code_postal} onChange={(e) => setField('code_postal', e.target.value)} className={inputClass('code_postal')} style={{ height: 26 }} />
              </FormField>
              <FormField label="Complément adresse" help={PARTNER_FIELD_HELP.complement_adresse}>
                <input value={formData.complement_adresse} onChange={(e) => setField('complement_adresse', e.target.value)} className={inputClass('complement_adresse')} style={{ height: 26 }} />
              </FormField>
              <FormField label="Adresse" required error={fieldErrors?.adresse} help={PARTNER_FIELD_HELP.adresse}>
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
              <FormField label="Numéro fiscal" help={PARTNER_FIELD_HELP.numero_fiscal}>
                <input value={formData.numero_fiscal} onChange={(e) => setField('numero_fiscal', e.target.value)} className={inputClass('numero_fiscal')} style={{ height: 26 }} />
              </FormField>
              <FormField label="Sécurité sociale" help={PARTNER_FIELD_HELP.securite_sociale}>
                <input value={formData.securite_sociale} onChange={(e) => setField('securite_sociale', e.target.value)} className={inputClass('securite_sociale')} style={{ height: 26 }} />
              </FormField>
            </div>
            <div className="space-y-2">
              <FormField label="Registre commerce" help={PARTNER_FIELD_HELP.registre_commerce}>
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
    </fieldset>
  );
}
