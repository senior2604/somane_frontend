import React, { useEffect, useRef, useState } from 'react';
import {
  FiAlertCircle,
  FiChevronDown,
  FiChevronUp,
  FiGlobe,
  FiMap,
  FiMapPin,
  FiSearch,
} from 'react-icons/fi';
import { apiClient } from '../../services/apiClient';

export const parseResponse = (response) => {
  if (!response) return [];
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.results)) return response.results;
  if (Array.isArray(response?.entites)) return response.entites;
  return [];
};

export const INITIAL_ENTITY_FORM = {
  raison_sociale: '',
  sigle: '',
  forme_juridique: '',
  activite: '',
  email: '',
  telephone: '',
  site_web: '',
  adresse: '',
  complement_adresse: '',
  pays: '',
  region: '',
  ville: '',
  ville_legacy: '',
  code_postal: '',
  numero_fiscal: '',
  registre_commerce: '',
  devise: '',
  langue: '',
  parent_id: '',
  statut: true,
  logo: '',
  notes: '',
};

export const STATUT_OPTIONS = [
  { value: true, label: 'Actif' },
  { value: false, label: 'Inactif' },
];

export function validateEntityForm(formData) {
  const errors = {};
  if (!formData.raison_sociale?.trim()) errors.raison_sociale = 'La raison sociale est obligatoire';
  if (!formData.activite?.trim()) errors.activite = "L'activite est obligatoire";
  if (!formData.email?.trim()) errors.email = "L'email est obligatoire";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) errors.email = "L'adresse email n'est pas valide";
  if (!formData.telephone?.trim()) errors.telephone = 'Le telephone est obligatoire';
  return errors;
}

export function entityToForm(entity) {
  if (!entity) return INITIAL_ENTITY_FORM;
  return {
    raison_sociale: entity.raison_sociale || '',
    sigle: entity.sigle || '',
    forme_juridique: entity.forme_juridique || '',
    activite: entity.activite || '',
    email: entity.email || '',
    telephone: entity.telephone || '',
    site_web: entity.site_web || '',
    adresse: entity.adresse || '',
    complement_adresse: entity.complement_adresse || '',
    pays: entity.pays_details?.id ?? entity.pays ?? '',
    region: entity.region_details?.id ?? entity.region ?? '',
    ville: entity.ville_details?.id ?? entity.ville ?? '',
    ville_legacy: entity.ville_legacy || '',
    code_postal: entity.code_postal || '',
    numero_fiscal: entity.numero_fiscal || '',
    registre_commerce: entity.registre_commerce || '',
    devise: entity.devise_details?.id ?? entity.devise ?? '',
    langue: entity.langue_details?.id ?? entity.langue ?? '',
    parent_id: entity.parent_details?.id ?? entity.parent_id ?? '',
    statut: entity.statut !== undefined ? entity.statut : true,
    logo: entity.logo || '',
    notes: entity.notes || '',
  };
}

const intOrNull = (value) => (value ? parseInt(value, 10) : null);

export function buildEntityPayload(formData) {
  return {
    raison_sociale: formData.raison_sociale?.trim() || '',
    sigle: formData.sigle?.trim() || '',
    forme_juridique: formData.forme_juridique?.trim() || '',
    activite: formData.activite?.trim() || '',
    email: formData.email?.trim() || '',
    telephone: formData.telephone?.trim() || '',
    site_web: formData.site_web?.trim() || '',
    adresse: formData.adresse?.trim() || '',
    complement_adresse: formData.complement_adresse?.trim() || '',
    pays: intOrNull(formData.pays),
    region: intOrNull(formData.region),
    ville: intOrNull(formData.ville),
    ville_legacy: formData.ville_legacy?.trim() || '',
    code_postal: formData.code_postal?.trim() || '',
    numero_fiscal: formData.numero_fiscal?.trim() || '',
    registre_commerce: formData.registre_commerce?.trim() || '',
    devise: intOrNull(formData.devise),
    langue: intOrNull(formData.langue),
    parent_id: intOrNull(formData.parent_id),
    statut: !!formData.statut,
    logo: formData.logo?.trim() || '',
    notes: formData.notes?.trim() || '',
  };
}

export function getEntityName(entity) {
  return entity?.raison_sociale || entity?.nom || entity?.name || 'Entite sans nom';
}

export function getVilleName(entity) {
  if (!entity) return '';
  if (entity.ville_details?.nom) return entity.ville_details.nom;
  if (entity.ville_legacy) return entity.ville_legacy;
  if (typeof entity.ville === 'string') return entity.ville;
  if (typeof entity.ville === 'object') return entity.ville.nom || entity.ville.name || '';
  return '';
}

export function SearchableDropdown({
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
  errorClass = '',
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);
  const filteredOptions = options.filter((option) =>
    getOptionLabel(option).toLowerCase().includes((searchValue || '').toLowerCase())
  );
  const selectedOption = options.find((option) => String(getOptionValue(option)) === String(value));

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
            setIsOpen((current) => !current);
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
            {selectedOption ? (
              <span className="text-gray-900 font-medium truncate">{getOptionLabel(selectedOption)}</span>
            ) : (
              <span className="text-gray-400 truncate">{placeholder}</span>
            )}
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
                onChange={(event) => onSearchChange(event.target.value)}
                className="w-full pl-7 pr-2 py-1 text-xs border border-gray-200 focus:outline-none focus:ring-1 focus:ring-purple-500"
                placeholder="Rechercher..."
                onClick={(event) => event.stopPropagation()}
              />
            </div>
          </div>
          <div className="py-1">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option, index) => (
                <button
                  type="button"
                  key={`${getOptionValue(option)}-${index}`}
                  onClick={() => {
                    onChange(getOptionValue(option));
                    setIsOpen(false);
                    onSearchChange('');
                  }}
                  className={`w-full text-left px-3 py-2 text-xs hover:bg-purple-50 ${
                    String(getOptionValue(option)) === String(value) ? 'bg-purple-50 text-purple-700 font-medium' : 'text-gray-700'
                  }`}
                >
                  {getOptionLabel(option)}
                </button>
              ))
            ) : (
              <div className="px-3 py-2 text-xs text-gray-500">Aucun resultat</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function FieldError({ message }) {
  if (!message) return null;
  return (
    <p className="mt-1 text-xs text-red-600 flex items-center gap-1 ml-[148px]">
      <FiAlertCircle size={12} />
      {message}
    </p>
  );
}

function FormField({ label, required, error, children }) {
  return (
    <div>
      <div className="flex items-center" style={{ minHeight: 26 }}>
        <label className="text-xs text-gray-700 min-w-[140px] flex-shrink-0 font-medium">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        <div className="flex-1 ml-2 min-w-0">
          {children}
        </div>
      </div>
      <FieldError message={error} />
    </div>
  );
}

const inputClass = (hasError) =>
  `w-full h-7 px-2 text-xs border focus:outline-none focus:ring-1 ${
    hasError ? 'border-red-400 focus:ring-red-500' : 'border-gray-300 focus:ring-purple-500'
  }`;

const getLabel = (option) => option?.nom || option?.name || option?.label || option?.raison_sociale || '';
const getId = (option) => option?.id;

export function EntityForm({
  formData,
  setFormData,
  fieldErrors = {},
  mode = 'main',
  entities = [],
  onDirty,
}) {
  const [pays, setPays] = useState([]);
  const [regions, setRegions] = useState([]);
  const [villes, setVilles] = useState([]);
  const [devises, setDevises] = useState([]);
  const [langues, setLangues] = useState([]);
  const [search, setSearch] = useState({
    pays: '',
    region: '',
    ville: '',
    devise: '',
    langue: '',
    parent: '',
  });

  useEffect(() => {
    let active = true;
    Promise.all([
      apiClient.get('/pays/'),
      apiClient.get('/devises/'),
      apiClient.get('/langues/'),
    ])
      .then(([paysRes, devisesRes, languesRes]) => {
        if (!active) return;
        setPays(parseResponse(paysRes));
        setDevises(parseResponse(devisesRes));
        setLangues(parseResponse(languesRes));
      })
      .catch(() => {
        if (!active) return;
        setPays([]);
        setDevises([]);
        setLangues([]);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!formData.pays) {
      setRegions([]);
      return;
    }
    let active = true;
    apiClient.get(`/subdivisions/?pays=${formData.pays}`)
      .then((res) => {
        if (active) setRegions(parseResponse(res));
      })
      .catch(() => {
        if (active) setRegions([]);
      });
    return () => {
      active = false;
    };
  }, [formData.pays]);

  useEffect(() => {
    if (!formData.region) {
      setVilles([]);
      return;
    }
    let active = true;
    apiClient.get(`/villes/?subdivision=${formData.region}`)
      .then((res) => {
        if (active) setVilles(parseResponse(res));
      })
      .catch(() => {
        if (active) setVilles([]);
      });
    return () => {
      active = false;
    };
  }, [formData.region]);

  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    onDirty?.();
  };

  if (mode === 'users') {
    return (
      <div className="border border-gray-300 bg-white">
        <div className="bg-gray-50 border-b border-gray-300 px-3 py-2 text-sm font-semibold text-gray-900">
          Utilisateurs rattaches
        </div>
        <div className="p-4 text-sm text-gray-600">
          La liaison utilisateur peut rester geree par votre module utilisateur. Cette zone est reservee pour afficher les utilisateurs rattaches a cette entite.
        </div>
      </div>
    );
  }

  if (mode === 'notes') {
    return (
      <div className="border border-gray-300 bg-white">
        <div className="bg-gray-50 border-b border-gray-300 px-3 py-2 text-sm font-semibold text-gray-900">
          Notes internes
        </div>
        <textarea
          value={formData.notes}
          onChange={(event) => updateField('notes', event.target.value)}
          className="w-full min-h-[160px] p-3 text-sm border-0 focus:outline-none focus:ring-1 focus:ring-purple-500"
          placeholder="Ajouter une note..."
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="border border-gray-300 p-3">
        <div className="bg-gray-100 -m-3 mb-3 px-3 py-1.5 text-xs font-medium border-b border-gray-300">
          Identite
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
          <FormField label="Raison sociale" required error={fieldErrors.raison_sociale}>
            <input
              value={formData.raison_sociale}
              onChange={(event) => updateField('raison_sociale', event.target.value)}
              className={inputClass(fieldErrors.raison_sociale)}
            />
          </FormField>
          <FormField label="Sigle">
            <input value={formData.sigle} onChange={(event) => updateField('sigle', event.target.value)} className={inputClass()} />
          </FormField>
          <FormField label="Forme juridique">
            <input value={formData.forme_juridique} onChange={(event) => updateField('forme_juridique', event.target.value)} className={inputClass()} />
          </FormField>
          <FormField label="Activite" required error={fieldErrors.activite}>
            <input
              value={formData.activite}
              onChange={(event) => updateField('activite', event.target.value)}
              className={inputClass(fieldErrors.activite)}
            />
          </FormField>
          </div>
          <div className="space-y-2">
          <FormField label="Statut">
            <select
              value={String(formData.statut)}
              onChange={(event) => updateField('statut', event.target.value === 'true')}
              className={inputClass()}
            >
              {STATUT_OPTIONS.map((option) => (
                <option key={String(option.value)} value={String(option.value)}>{option.label}</option>
              ))}
            </select>
          </FormField>
          <FormField label="Entite parente">
            <SearchableDropdown
              value={formData.parent_id}
              onChange={(value) => updateField('parent_id', value)}
              options={entities}
              searchValue={search.parent}
              onSearchChange={(value) => setSearch((prev) => ({ ...prev, parent: value }))}
              placeholder="Aucune"
              getOptionLabel={getEntityName}
              getOptionValue={getId}
            />
          </FormField>
          <FormField label="Logo URL">
            <input value={formData.logo} onChange={(event) => updateField('logo', event.target.value)} className={inputClass()} />
          </FormField>
          </div>
        </div>
      </div>

      <div className="border border-gray-300 p-3">
        <div className="bg-gray-100 -m-3 mb-3 px-3 py-1.5 text-xs font-medium border-b border-gray-300">
          Contact
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
          <FormField label="Email" required error={fieldErrors.email}>
            <input
              type="email"
              value={formData.email}
              onChange={(event) => updateField('email', event.target.value)}
              className={inputClass(fieldErrors.email)}
            />
          </FormField>
          <FormField label="Site web">
            <input value={formData.site_web} onChange={(event) => updateField('site_web', event.target.value)} className={inputClass()} />
          </FormField>
          </div>
          <div className="space-y-2">
          <FormField label="Telephone" required error={fieldErrors.telephone}>
            <input value={formData.telephone} onChange={(event) => updateField('telephone', event.target.value)} className={inputClass(fieldErrors.telephone)} />
          </FormField>
          </div>
        </div>
      </div>

      <div className="border border-gray-300 p-3">
        <div className="bg-gray-100 -m-3 mb-3 px-3 py-1.5 text-xs font-medium border-b border-gray-300">
          Localisation
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
          <FormField label="Pays">
            <SearchableDropdown
              value={formData.pays}
              onChange={(value) => {
                updateField('pays', value);
                updateField('region', '');
                updateField('ville', '');
              }}
              options={pays}
              searchValue={search.pays}
              onSearchChange={(value) => setSearch((prev) => ({ ...prev, pays: value }))}
              placeholder="Choisir un pays"
              icon={FiGlobe}
              getOptionLabel={(option) => `${option?.emoji ? `${option.emoji} ` : ''}${getLabel(option)}`}
              getOptionValue={getId}
            />
          </FormField>
          <FormField label="Region">
            <SearchableDropdown
              value={formData.region}
              onChange={(value) => {
                updateField('region', value);
                updateField('ville', '');
              }}
              options={regions}
              searchValue={search.region}
              onSearchChange={(value) => setSearch((prev) => ({ ...prev, region: value }))}
              placeholder="Choisir une region"
              disabled={!formData.pays}
              icon={FiMap}
              getOptionLabel={getLabel}
              getOptionValue={getId}
            />
          </FormField>
          <FormField label="Ville">
            <SearchableDropdown
              value={formData.ville}
              onChange={(value) => updateField('ville', value)}
              options={villes}
              searchValue={search.ville}
              onSearchChange={(value) => setSearch((prev) => ({ ...prev, ville: value }))}
              placeholder="Choisir une ville"
              disabled={!formData.region}
              icon={FiMapPin}
              getOptionLabel={getLabel}
              getOptionValue={getId}
            />
          </FormField>
          </div>
          <div className="space-y-2">
          <FormField label="Ville libre">
            <input value={formData.ville_legacy} onChange={(event) => updateField('ville_legacy', event.target.value)} className={inputClass()} />
          </FormField>
          <FormField label="Adresse">
            <input value={formData.adresse} onChange={(event) => updateField('adresse', event.target.value)} className={inputClass()} />
          </FormField>
          <FormField label="Complement adresse">
            <input value={formData.complement_adresse} onChange={(event) => updateField('complement_adresse', event.target.value)} className={inputClass()} />
          </FormField>
          <FormField label="Code postal">
            <input value={formData.code_postal} onChange={(event) => updateField('code_postal', event.target.value)} className={inputClass()} />
          </FormField>
          </div>
        </div>
      </div>

      <div className="border border-gray-300 p-3">
        <div className="bg-gray-100 -m-3 mb-3 px-3 py-1.5 text-xs font-medium border-b border-gray-300">
          Fiscal et juridique
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
          <FormField label="Numero fiscal">
            <input value={formData.numero_fiscal} onChange={(event) => updateField('numero_fiscal', event.target.value)} className={inputClass()} />
          </FormField>
          <FormField label="Registre commerce">
            <input value={formData.registre_commerce} onChange={(event) => updateField('registre_commerce', event.target.value)} className={inputClass()} />
          </FormField>
          </div>
          <div className="space-y-2">
          <FormField label="Devise">
            <SearchableDropdown
              value={formData.devise}
              onChange={(value) => updateField('devise', value)}
              options={devises}
              searchValue={search.devise}
              onSearchChange={(value) => setSearch((prev) => ({ ...prev, devise: value }))}
              placeholder="Choisir une devise"
              getOptionLabel={(option) => option?.code ? `${option.code} - ${getLabel(option)}` : getLabel(option)}
              getOptionValue={getId}
            />
          </FormField>
          <FormField label="Langue">
            <SearchableDropdown
              value={formData.langue}
              onChange={(value) => updateField('langue', value)}
              options={langues}
              searchValue={search.langue}
              onSearchChange={(value) => setSearch((prev) => ({ ...prev, langue: value }))}
              placeholder="Choisir une langue"
              getOptionLabel={getLabel}
              getOptionValue={getId}
            />
          </FormField>
          </div>
        </div>
      </div>
    </div>
  );
}
