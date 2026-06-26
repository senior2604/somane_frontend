import React, { useEffect, useState } from 'react';
import { apiClient } from '../../services/apiClient';

export const ACCESS_TYPES = [
  { value: 'aucun', label: 'Aucun acces', dot: 'bg-red-500', badge: 'bg-red-50 text-red-700 border-red-200' },
  { value: 'lecture', label: 'Lecture seule', dot: 'bg-blue-500', badge: 'bg-blue-50 text-blue-700 border-blue-200' },
  { value: 'ecriture', label: 'Lecture/Ecriture', dot: 'bg-green-500', badge: 'bg-green-50 text-green-700 border-green-200' },
  { value: 'validation', label: 'Validation', dot: 'bg-purple-500', badge: 'bg-purple-50 text-purple-700 border-purple-200' },
  { value: 'suppression', label: 'Suppression', dot: 'bg-orange-500', badge: 'bg-orange-50 text-orange-700 border-orange-200' },
  { value: 'personnalise', label: 'Personnalise', dot: 'bg-gray-500', badge: 'bg-gray-50 text-gray-700 border-gray-200' },
];

export const RESOURCE_TYPES = [
  { value: 'users', label: 'Utilisateur', plural: 'Utilisateurs' },
  { value: 'groups', label: 'Groupe', plural: 'Groupes' },
  { value: 'permissions', label: 'Permission', plural: 'Permissions' },
];

// Route de la liste, vers laquelle pointent tous les boutons "Retour" / "Annuler".
export const SECURITY_LIST_ROUTE = '/UsersGestions';

export const parseResponse = (response) => {
  if (!response) return [];
  if (Array.isArray(response)) return response;
  if (Array.isArray(response.results)) return response.results;
  if (Array.isArray(response.data)) return response.data;
  return [];
};

export const getResourceMeta = (type) => {
  return RESOURCE_TYPES.find((item) => item.value === type) || RESOURCE_TYPES[0];
};

export const getUserName = (user) => {
  const fullName = [user?.first_name, user?.last_name].filter(Boolean).join(' ');
  return fullName || user?.email || user?.username || 'Utilisateur sans nom';
};

export const getGroupName = (group) => group?.name || 'Groupe sans nom';

export const getPermissionName = (permission, groups = [], modules = []) => {
  if (permission?.name) return permission.name;
  const group = findById(groups, permission?.groupe);
  const module = findById(modules, permission?.module);
  return `${group?.name || 'Groupe'} - ${module?.nom_affiche || module?.name || 'Module'}`;
};

export const findById = (items, value) => {
  const id = value?.id ?? value;
  return items.find((item) => String(item.id) === String(id));
};

// Un partenaire n'est proposable a la creation d'utilisateur que s'il a au
// moins une entite rattachee.
export const getEligiblePartenaires = (partenaires = [], entites = []) => {
  return partenaires.filter((partenaire) =>
    entites.some((entite) => (entite.partenaire?.id ?? entite.partenaire) === partenaire.id)
  );
};

export const getAccessType = (value) => ACCESS_TYPES.find((type) => type.value === value);

export const initialForms = {
  users: {
    partenaire: '',
    statut: 'actif',
    groups: [],
  },
  groups: {
    name: '',
    description: '',
    category: '',
    members: [],
    permissions: [],
    inherited_groups: [],
  },
  permissions: {
    name: '',
    groupe: '',
    module: '',
    entite: '',
    acces: 'lecture',
    statut: true,
  },
};

export function itemToForm(type, item) {
  if (!item) return initialForms[type] || {};
  if (type === 'users') {
    return {
      partenaire: item.partenaire?.id || item.partenaire || '',
      statut: item.statut || (item.is_active ? 'actif' : 'inactif'),
      groups: item.groups?.map((group) => group.id ?? group) || [],
    };
  }
  if (type === 'groups') {
    return {
      name: item.name || '',
      description: item.description || '',
      category: item.category || '',
      members: item.members?.map((user) => user.id ?? user) || [],
      permissions: item.permissions?.map((permission) => permission.id ?? permission) || [],
      inherited_groups: item.inherited_groups?.map((group) => group.id ?? group) || [],
    };
  }
  return {
    name: item.name || '',
    groupe: item.groupe?.id || item.groupe || '',
    module: item.module?.id || item.module || '',
    entite: item.entite?.id || item.entite || '',
    acces: item.acces || 'lecture',
    statut: item.statut !== undefined ? item.statut : true,
  };
}

export function validateSecurityForm(type, form) {
  const errors = {};
  if (type === 'users' && !form.partenaire) errors.partenaire = 'Le partenaire est obligatoire';
  if (type === 'groups' && !form.name?.trim()) errors.name = 'Le nom du groupe est obligatoire';
  if (type === 'permissions') {
    if (!form.groupe) errors.groupe = 'Le groupe est obligatoire';
    if (!form.module) errors.module = 'Le module est obligatoire';
    if (!form.acces) errors.acces = "Le type d'acces est obligatoire";
  }
  return errors;
}

// IMPORTANT : ce payload "utilisateur en edition" est volontairement partiel
// (statut / groupes uniquement). Il doit toujours partir avec un PATCH, jamais
// un PUT, sinon l'API risque d'ecraser les champs non envoyes (email, nom...).
export function buildPayload(type, form, item = null, partenaires = []) {
  if (type === 'users') {
    if (item) {
      return {
        statut: form.statut,
        groups: form.groups,
        is_active: form.statut === 'actif',
      };
    }
    const partenaire = findById(partenaires, form.partenaire);
    return {
      partenaire: Number(form.partenaire),
      first_name: partenaire?.prenom || partenaire?.first_name || '',
      last_name: partenaire?.nom || partenaire?.last_name || '',
      telephone: partenaire?.telephone || '',
      groups: form.groups,
      send_activation_email: true,
      statut: form.statut,
    };
  }

  if (type === 'groups') {
    return {
      name: form.name?.trim() || '',
      description: form.description?.trim() || '',
      category: form.category?.trim() || '',
      members: form.members,
      permissions: form.permissions,
      inherited_groups: form.inherited_groups,
    };
  }

  return {
    name: form.name?.trim() || '',
    groupe: Number(form.groupe),
    module: Number(form.module),
    entite: form.entite ? Number(form.entite) : null,
    acces: form.acces,
    statut: !!form.statut,
  };
}

export function useSecurityData() {
  const [data, setData] = useState({
    users: [],
    groups: [],
    permissions: [],
    modules: [],
    entites: [],
    partenaires: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [users, groups, permissions, modules, entites, partenaires] = await Promise.all([
        apiClient.get('/users/'),
        apiClient.get('/groupes/'),
        apiClient.get('/permissions/'),
        apiClient.get('/modules/'),
        apiClient.get('/entites/'),
        apiClient.get('/partenaires/'),
      ]);
      setData({
        users: parseResponse(users),
        groups: parseResponse(groups),
        permissions: parseResponse(permissions),
        modules: parseResponse(modules),
        entites: parseResponse(entites),
        partenaires: parseResponse(partenaires),
      });
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || 'Chargement impossible');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const eligiblePartenaires = getEligiblePartenaires(data.partenaires, data.entites);

  return { ...data, eligiblePartenaires, loading, error, fetchData };
}

// ==========================================
// TOOLTIP (identique a la version PartnerShared)
// ==========================================
export const Tooltip = ({ children, text, position = 'top' }) => {
  const [show, setShow] = useState(false);

  return (
    <div className="relative inline-block">
      <div onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
        {children}
      </div>
      {show && (
        <div
          className={`absolute z-50 px-2 py-1 text-xs text-white bg-gray-800 rounded whitespace-nowrap ${
            position === 'top' ? 'bottom-full left-1/2 transform -translate-x-1/2 mb-1' :
            position === 'bottom' ? 'top-full left-1/2 transform -translate-x-1/2 mt-1' :
            position === 'left' ? 'right-full top-1/2 transform -translate-y-1/2 mr-1' :
            'left-full top-1/2 transform -translate-y-1/2 ml-1'
          }`}
        >
          {text}
          <div
            className={`absolute w-2 h-2 bg-gray-800 transform rotate-45 ${
              position === 'top' ? 'top-full left-1/2 -translate-x-1/2 -mt-1' :
              position === 'bottom' ? 'bottom-full left-1/2 -translate-x-1/2 -mb-1' :
              position === 'left' ? 'left-full top-1/2 -translate-y-1/2 -ml-1' :
              'right-full top-1/2 -translate-y-1/2 -mr-1'
            }`}
          />
        </div>
      )}
    </div>
  );
};

// ==========================================
// Gabarit de champ "libelle a gauche / champ a droite", identique aux pages Partenaires
// ==========================================
export function FormField({ label, required, error, children }) {
  return (
    <div>
      <div className="flex items-center" style={{ minHeight: 26 }}>
        <label className="text-xs text-gray-700 min-w-[140px] flex-shrink-0 font-medium">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        <div className="flex-1 ml-2 min-w-0">{children}</div>
      </div>
      {error && <div className="ml-[148px] mt-1 text-xs text-red-600">{error}</div>}
    </div>
  );
}

export const inputClass = (error) =>
  `w-full border px-2 py-1 text-xs focus:ring-1 focus:ring-purple-500 focus:outline-none ${
    error ? 'border-red-500' : 'border-gray-300'
  }`;

export function CheckList({ items, value, onChange, getLabel }) {
  const toggle = (id) => {
    onChange(value.includes(id) ? value.filter((item) => item !== id) : [...value, id]);
  };

  return (
    <div className="border border-gray-300 max-h-40 overflow-y-auto bg-white">
      {items.length === 0 ? (
        <div className="px-2 py-3 text-xs text-gray-500 text-center">Aucun element</div>
      ) : items.map((item) => (
        <label
          key={item.id}
          className="flex items-center gap-2 px-2 py-1.5 border-b border-gray-100 last:border-b-0 text-xs hover:bg-gray-50 cursor-pointer"
        >
          <input
            type="checkbox"
            checked={value.includes(item.id)}
            onChange={() => toggle(item.id)}
          />
          <span>{getLabel(item)}</span>
        </label>
      ))}
    </div>
  );
}

export function Section({ title, children }) {
  return (
    <div className="border border-gray-300 p-3">
      <div className="bg-gray-100 -m-3 mb-3 px-3 py-1.5 text-xs font-medium border-b border-gray-300">{title}</div>
      {children}
    </div>
  );
}