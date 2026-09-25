// C:\python\django\somane_fronten\somane_frontend\src\pages\Users\SecurityShared.jsx
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

export const PERMISSION_TARGET_TYPES = [
  { value: 'group', label: "Droit d'acces groupe" },
  { value: 'user', label: 'Permission utilisateur' },
  { value: 'global', label: 'Permission globale' },
];

export const PERMISSION_MODES = [
  { value: 'allow', label: 'Autoriser' },
  { value: 'deny', label: 'Refuser' },
];

export const RESOURCE_TYPES = [
  { value: 'users', label: 'Utilisateur', plural: 'Utilisateurs' },
  { value: 'groups', label: 'Groupe', plural: 'Groupes' },
  { value: 'permissions', label: 'Permission', plural: 'Permissions' },
];

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

export const findById = (items = [], value) => {
  const id = value?.id ?? value;
  if (!id && id !== 0) return null;
  return items.find((item) => String(item.id) === String(id)) || null;
};

export const normalizeIds = (value) => {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => item?.id ?? item)
    .filter(Boolean);
};

export const getUserName = (user) => {
  if (!user) return '';

  const fullName = [user?.first_name, user?.last_name]
    .filter(Boolean)
    .join(' ')
    .trim();

  return fullName || user?.email || user?.username || `Utilisateur ${user.id}`;
};

export const getGroupName = (group) => {
  if (!group) return '';
  return group?.name || group?.nom || `Groupe ${group.id}`;
};

export const getPermissionName = (permission, groups = [], modules = [], users = []) => {
  if (permission?.name) return permission.name;
  if (permission?.nom) return permission.nom;

  const group = findById(groups, permission?.groupe);
  const user = findById(users, permission?.user);
  const module = findById(modules, permission?.module);

  let target = 'Global';

  if (permission?.user_nom) {
    target = permission.user_nom;
  } else if (user) {
    target = getUserName(user);
  } else if (permission?.groupe_nom) {
    target = permission.groupe_nom;
  } else if (group) {
    target = getGroupName(group);
  }

  const moduleName =
    permission?.module_nom ||
    module?.nom_affiche ||
    module?.nom ||
    module?.name ||
    'Module';

  return `${target} - ${moduleName}`;
};

export const getEligiblePartenaires = (partenaires = [], entites = []) => {
  return partenaires.filter((partenaire) =>
    entites.some((entite) => (entite.partenaire?.id ?? entite.partenaire) === partenaire.id)
  );
};

export const getAccessType = (value) => ACCESS_TYPES.find((type) => type.value === value);

export const initialForms = {
users: {
  email: '',
  first_name: '',
  last_name: '',
  telephone: '',
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
    target_type: 'group',
    groupe: '',
    user: '',
    module: '',
    model_id: '',
    entite: '',
    mode: 'allow',
    acces: 'personnalise',
    statut: true,
    active: true,
    perm_read: false,
    perm_create: false,
    perm_write: false,
    perm_unlink: false,
    perm_validate: false,
    perm_cancel: false,
    perm_export: false,
    perm_import: false,
    perm_print: false,
  },
};

export function itemToForm(type, item) {
  if (!item) return { ...(initialForms[type] || {}) };

  if (type === 'users') {
    return {
      email: item.email || '',
      first_name: item.first_name || '',
      last_name: item.last_name || '',
      telephone: item.telephone || '',
      statut: item.statut || (
        item.is_active ? 'actif' : 'inactif'
      ),
      groups: normalizeIds(
        item.groups ||
        item.groupes ||
        item.groupes_details
      ),
    };
  }

  if (type === 'groups') {
    return {
      id: item.id,
      name: item.name || '',
      description: item.description || '',
      category: item.category || '',
      members: normalizeIds(item.members || item.users || item.users_details),
      permissions: normalizeIds(item.permissions || item.permissions_fines || item.permissions_details),
      inherited_groups: normalizeIds(item.inherited_groups || item.implied_ids || item.implied_details),
    };
  }

  const targetType = item.user ? 'user' : item.groupe ? 'group' : 'global';

  return {
    ...initialForms.permissions,
    id: item.id,
    name: item.name || '',
    target_type: targetType,
    groupe: item.groupe?.id || item.groupe || '',
    user: item.user?.id || item.user || '',
    module: item.module?.id || item.module || '',
    model_id: item.model_id?.id || item.model_id || '',
    entite: item.entite?.id || item.entite || '',
    mode: item.mode || 'allow',
    acces: item.acces || 'personnalise',
    statut: item.statut !== undefined ? item.statut : true,
    active: item.active !== undefined ? item.active : true,
    perm_read: !!item.perm_read,
    perm_create: !!item.perm_create,
    perm_write: !!item.perm_write,
    perm_unlink: !!item.perm_unlink,
    perm_validate: !!item.perm_validate,
    perm_cancel: !!item.perm_cancel,
    perm_export: !!item.perm_export,
    perm_import: !!item.perm_import,
    perm_print: !!item.perm_print,
  };
}

export function validateSecurityForm(type, form) {
  const errors = {};

if (type === 'users') {
  if (!form.email?.trim()) {
    errors.email = "L'adresse email est obligatoire";
  } else {
    const emailValide = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailValide.test(form.email.trim())) {
      errors.email = "L'adresse email n'est pas valide";
    }
  }

  if (!form.first_name?.trim()) {
    errors.first_name = 'Le prénom est obligatoire';
  }

  if (!form.last_name?.trim()) {
    errors.last_name = 'Le nom est obligatoire';
  }
}

  if (type === 'groups' && !form.name?.trim()) {
    errors.name = 'Le nom du groupe est obligatoire';
  }

  if (type === 'permissions') {
    if (form.target_type === 'group' && !form.groupe) {
      errors.groupe = 'Le groupe est obligatoire';
    }

    if (form.target_type === 'user' && !form.user) {
      errors.user = "L'utilisateur est obligatoire";
    }

    if (!form.module) errors.module = 'Le module est obligatoire';
    if (!form.model_id) errors.model_id = 'Le modele / table est obligatoire';
    if (!form.mode) errors.mode = 'Le mode est obligatoire';
    if (!form.acces) errors.acces = "Le type d'acces est obligatoire";
  }

  return errors;
}
export function buildPayload(type, form, item = null, partenaires = []) {
if (type === 'users') {
  const payload = {
    email: form.email?.trim() || '',
    first_name: form.first_name?.trim() || '',
    last_name: form.last_name?.trim() || '',
    telephone: form.telephone?.trim() || '',
    statut: form.statut || 'actif',
    is_active: form.statut === 'actif',
    groups: normalizeIds(form.groups),
  };

  // L'email ne doit normalement pas être changé
  // depuis la fiche d'un utilisateur existant.
  if (item) {
    delete payload.email;
  }

  return payload;
}

  if (type === 'groups') {
    return {
      name: form.name?.trim() || '',
      description: form.description?.trim() || '',
      category: form.category?.trim() || '',
      members: form.members,
      users: form.members,
      permissions: form.permissions,
      permissions_fines: form.permissions,
      inherited_groups: form.inherited_groups,
      implied_ids: form.inherited_groups,
    };
  }

  const isGroup = form.target_type === 'group';
  const isUser = form.target_type === 'user';

  return {
    name: form.name?.trim() || '',
    groupe: isGroup && form.groupe ? Number(form.groupe) : null,
    user: isUser && form.user ? Number(form.user) : null,
    module: form.module ? Number(form.module) : null,
    model_id: form.model_id ? Number(form.model_id) : null,
    entite: form.entite ? Number(form.entite) : null,
    mode: form.mode || 'allow',
    acces: form.acces || 'personnalise',
    statut: !!form.statut,
    active: form.active !== false,
    perm_read: !!form.perm_read,
    perm_create: !!form.perm_create,
    perm_write: !!form.perm_write,
    perm_unlink: !!form.perm_unlink,
    perm_validate: !!form.perm_validate,
    perm_cancel: !!form.perm_cancel,
    perm_export: !!form.perm_export,
    perm_import: !!form.perm_import,
    perm_print: !!form.perm_print,
  };
}

export function useSecurityData() {
  const [data, setData] = useState({
    users: [],
    groups: [],
    permissions: [],
    modules: [],
    models: [],
    entites: [],
    partenaires: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      const [users, groups, permissions, modules, models, entites, partenaires] = await Promise.all([
        apiClient.get('/users/'),
        apiClient.get('/groupes/'),
        apiClient.get('/permissions/'),
        apiClient.get('/modules/'),
        apiClient.get('/ir-models/'),
        apiClient.get('/entites/'),
        apiClient.get('/partenaires/'),
      ]);

      setData({
        users: parseResponse(users),
        groups: parseResponse(groups),
        permissions: parseResponse(permissions),
        modules: parseResponse(modules),
        models: parseResponse(models),
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

export const Tooltip = ({ children, text, position = 'top' }) => {
  const [show, setShow] = useState(false);

  return (
    <div className="relative inline-block">
      <div onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
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
        </div>
      )}
    </div>
  );
};

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

export function CheckList({ items = [], value = [], onChange, getLabel }) {
  const selected = normalizeIds(value);

  const toggle = (id) => {
    onChange(
      selected.includes(id)
        ? selected.filter((item) => item !== id)
        : [...selected, id]
    );
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
            checked={selected.includes(item.id)}
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