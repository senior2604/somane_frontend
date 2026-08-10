// C:\python\django\somane_fronten\somane_frontend\src\pages\Users\List.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  FiEdit2,
  FiEye,
  FiFilter,
  FiKey,
  FiRefreshCw,
  FiSearch,
  FiShield,
  FiTrash2,
  FiUsers,
  FiX,
} from 'react-icons/fi';
import { apiClient } from '../../services/apiClient';
import {
  ACCESS_TYPES,
  PERMISSION_MODES,
  PERMISSION_TARGET_TYPES,
  SECURITY_LIST_ROUTE,
  getGroupName,
  getPermissionName,
  getResourceMeta,
  getUserName,
  useSecurityData,
} from './SecurityShared';

const EMPTY_SECURITY_DATA = {
  users: [],
  groups: [],
  permissions: [],
  modules: [],
  models: [],
  entites: [],
  partenaires: [],
  loading: false,
  error: '',
  fetchData: () => {},
};

const TABS = [
  { id: 'users', label: 'Utilisateurs', icon: FiUsers },
  { id: 'groups', label: 'Groupes', icon: FiShield },
  { id: 'permissions', label: 'Permissions', icon: FiKey },
];

const RIGHT_FIELDS = [
  { key: 'perm_read', label: 'Lire' },
  { key: 'perm_create', label: 'Creer' },
  { key: 'perm_write', label: 'Modifier' },
  { key: 'perm_unlink', label: 'Supprimer' },
  { key: 'perm_validate', label: 'Valider' },
  { key: 'perm_cancel', label: 'Annuler' },
  { key: 'perm_export', label: 'Exporter' },
  { key: 'perm_import', label: 'Importer' },
  { key: 'perm_print', label: 'Imprimer' },
];

const ACCESS_RIGHTS = {
  aucun: {
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
  lecture: {
    perm_read: true,
    perm_create: false,
    perm_write: false,
    perm_unlink: false,
    perm_validate: false,
    perm_cancel: false,
    perm_export: false,
    perm_import: false,
    perm_print: false,
  },
  ecriture: {
    perm_read: true,
    perm_create: true,
    perm_write: true,
    perm_unlink: false,
    perm_validate: false,
    perm_cancel: false,
    perm_export: false,
    perm_import: false,
    perm_print: false,
  },
  validation: {
    perm_read: true,
    perm_create: true,
    perm_write: true,
    perm_unlink: false,
    perm_validate: true,
    perm_cancel: false,
    perm_export: false,
    perm_import: false,
    perm_print: false,
  },
  suppression: {
    perm_read: true,
    perm_create: true,
    perm_write: true,
    perm_unlink: true,
    perm_validate: true,
    perm_cancel: true,
    perm_export: true,
    perm_import: true,
    perm_print: true,
  },
};

function normalizeText(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function valueId(value) {
  if (!value) return null;
  if (typeof value === 'object') return value.id ?? null;
  return value;
}

function sameId(left, right) {
  const leftId = valueId(left);
  const rightId = valueId(right);

  if (!leftId && !rightId) return true;
  if (!leftId || !rightId) return false;

  return String(leftId) === String(rightId);
}

function endpointFor(type) {
  if (type === 'users') return 'users';
  if (type === 'groups') return 'groupes';
  return 'permissions';
}

function getInitialTab(searchParams) {
  const tab = searchParams.get('tab') || searchParams.get('type');

  if (tab === 'users') return 'users';
  if (tab === 'groups') return 'groups';
  if (tab === 'permissions') return 'permissions';

  return 'permissions';
}

function permissionPatchBase(permission) {
  return {
    groupe: valueId(permission.groupe),
    user: valueId(permission.user),
    module: valueId(permission.module),
    model_id: valueId(permission.model_id),
    entite: valueId(permission.entite),
    mode: permission.mode || 'allow',
  };
}

function getPermissionTargetTypeValue(permission) {
  if (permission.user) return 'user';
  if (permission.groupe) return 'group';
  return 'global';
}

function getPermissionTargetType(permission) {
  const type = getPermissionTargetTypeValue(permission);
  return PERMISSION_TARGET_TYPES.find((item) => item.value === type)?.label || type;
}

function getPermissionTargetName(permission, data) {
  const type = getPermissionTargetTypeValue(permission);

  if (type === 'user') {
    const userId = valueId(permission.user);
    const user = (data.users || []).find((item) => sameId(item.id, userId));

    return user
      ? getUserName(user)
      : permission.user_details?.email || permission.user_nom || `Utilisateur ${userId}`;
  }

  if (type === 'group') {
    const groupId = valueId(permission.groupe);
    const group = (data.groups || []).find((item) => sameId(item.id, groupId));

    return group
      ? getGroupName(group)
      : permission.groupe_details?.name || permission.groupe_nom || `Groupe ${groupId}`;
  }

  return 'Tous les utilisateurs';
}

function getModelLabel(model) {
  if (!model) return '';
  return model.name || model.model || model.model_name || model.display_name || `Modele ${model.id}`;
}

function getModuleLabel(module) {
  if (!module) return '';
  return module.nom_affiche || module.nom || module.name || module.code || `Module ${module.id}`;
}

function getEntityLabel(entite) {
  if (!entite) return '';
  return entite.raison_sociale || entite.nom || entite.name || `Entite ${entite.id}`;
}

function PermissionCheckbox({ checked, disabled, onChange }) {
  return (
    <input
      type="checkbox"
      checked={Boolean(checked)}
      disabled={disabled}
      onChange={(event) => onChange(event.target.checked)}
      className="h-3.5 w-3.5 cursor-pointer accent-purple-600 disabled:cursor-not-allowed disabled:opacity-50"
    />
  );
}

function StatusBadge({ active }) {
  return (
    <span className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
      {active ? 'Actif' : 'Inactif'}
    </span>
  );
}

function ModeBadge({ mode }) {
  const isDeny = mode === 'deny';

  return (
    <span className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${isDeny ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
      {isDeny ? 'Refuser' : 'Autoriser'}
    </span>
  );
}

function SecurityList() {
  const navigate = useNavigate();
  const filterRef = useRef(null);
  const [searchParams] = useSearchParams();

  const securityData = useSecurityData();
  const data = { ...EMPTY_SECURITY_DATA, ...(securityData || {}) };
  const loading = data.loading || false;
  const error = data.error || '';
  const refetch = typeof data.fetchData === 'function' ? data.fetchData : () => {};

  const [activeTab, setActiveTab] = useState(() => getInitialTab(searchParams));
  const [search, setSearch] = useState('');
  const [activeFilters, setActiveFilters] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [savingId, setSavingId] = useState(null);
  const [deleteId, setDeleteId] = useState(null);

  useEffect(() => {
    const onClickOutside = (event) => {
      if (filterRef.current && !filterRef.current.contains(event.target)) {
        setShowFilters(false);
      }
    };

    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  useEffect(() => {
    const tab = searchParams.get('tab') || searchParams.get('type');
    const groupId = searchParams.get('group');
    const userId = searchParams.get('user');

    if (groupId) {
      const group = (data.groups || []).find((item) => sameId(item.id, groupId));

      setActiveTab('permissions');
      setSearch('');
      setShowFilters(false);
      setActiveFilters([
        { id: 'target-group', type: 'target_type', value: 'group', label: 'Type: Groupe' },
        {
          id: `group-${groupId}`,
          type: 'group',
          value: groupId,
          label: `Groupe: ${group ? getGroupName(group) : `Groupe ${groupId}`}`,
        },
      ]);
      return;
    }

    if (userId) {
      const user = (data.users || []).find((item) => sameId(item.id, userId));

      setActiveTab('permissions');
      setSearch('');
      setShowFilters(false);
      setActiveFilters([
        { id: 'target-user', type: 'target_type', value: 'user', label: 'Type: Utilisateur' },
        {
          id: `user-${userId}`,
          type: 'user',
          value: userId,
          label: `Utilisateur: ${user ? getUserName(user) : `Utilisateur ${userId}`}`,
        },
      ]);
      return;
    }

    if (tab === 'users' || tab === 'groups' || tab === 'permissions') {
      setActiveTab(tab);
    }
  }, [searchParams, data.groups, data.users]);

  const currentItems = useMemo(() => {
    if (activeTab === 'users') return data.users || [];
    if (activeTab === 'groups') return data.groups || [];
    return data.permissions || [];
  }, [activeTab, data.users, data.groups, data.permissions]);

  const removeFilter = (filterId) => {
    setActiveFilters((prev) => prev.filter((filter) => filter.id !== filterId));
  };

  const upsertFilter = (filter) => {
    setActiveFilters((prev) => {
      let next = prev.filter((item) => item.type !== filter.type);

      if (filter.type === 'group') {
        next = next.filter((item) => item.type !== 'user' && item.type !== 'target_type');
        next.push({ id: 'target-group', type: 'target_type', value: 'group', label: 'Type: Groupe' });
      }

      if (filter.type === 'user') {
        next = next.filter((item) => item.type !== 'group' && item.type !== 'target_type');
        next.push({ id: 'target-user', type: 'target_type', value: 'user', label: 'Type: Utilisateur' });
      }

      if (filter.type === 'target_type') {
        if (filter.value === 'group') next = next.filter((item) => item.type !== 'user');
        if (filter.value === 'user') next = next.filter((item) => item.type !== 'group');
        if (filter.value === 'global') next = next.filter((item) => item.type !== 'group' && item.type !== 'user');
      }

      return [...next, filter];
    });

    setShowFilters(true);
  };

  const hasFilter = (type, value) => activeFilters.some((filter) => (
    filter.type === type && String(filter.value) === String(value)
  ));

  const getFilterValue = (type) => (
    activeFilters.find((filter) => filter.type === type)?.value || ''
  );

  const clearFilters = () => {
    setSearch('');
    setActiveFilters([]);
    setShowFilters(false);
    navigate(`${SECURITY_LIST_ROUTE}?tab=${activeTab}`);
  };

  const filteredItems = useMemo(() => {
    let next = [...currentItems];

    if (search.trim()) {
      const value = normalizeText(search);

      next = next.filter((item) => {
        if (activeTab === 'users') {
          return normalizeText([item.email, item.first_name, item.last_name, item.telephone].filter(Boolean).join(' ')).includes(value);
        }

        if (activeTab === 'groups') {
          return normalizeText([item.name, item.nom, item.description].filter(Boolean).join(' ')).includes(value);
        }

        return normalizeText([
          item.name,
          item.nom,
          item.groupe_nom,
          item.user_nom,
          item.module_nom,
          item.model_name,
          item.entite_nom,
          item.groupe_details?.name,
          item.user_details?.email,
          item.module_details?.nom,
          item.model_details?.model,
          item.entite_details?.raison_sociale,
          getPermissionName(item, data.groups, data.modules, data.users),
        ].filter(Boolean).join(' ')).includes(value);
      });
    }

    activeFilters.forEach((filter) => {
      if (activeTab === 'permissions') {
        if (filter.type === 'target_type') next = next.filter((item) => getPermissionTargetTypeValue(item) === filter.value);
        if (filter.type === 'mode') next = next.filter((item) => (item.mode || 'allow') === filter.value);
        if (filter.type === 'group') next = next.filter((item) => sameId(item.groupe, filter.value));
        if (filter.type === 'user') next = next.filter((item) => sameId(item.user, filter.value));
        if (filter.type === 'module') next = next.filter((item) => sameId(item.module, filter.value));
        if (filter.type === 'model') next = next.filter((item) => sameId(item.model_id, filter.value));

        if (filter.type === 'entite') {
          next = next.filter((item) => (
            filter.value === '__global__' ? !item.entite : sameId(item.entite, filter.value)
          ));
        }

        if (filter.type === 'access') next = next.filter((item) => item.acces === filter.value);
        if (filter.type === 'right') next = next.filter((item) => Boolean(item[filter.value]));

        if (filter.type === 'status') {
          next = next.filter((item) => {
            const active = item.active !== false && item.statut !== false;
            return filter.value === 'active' ? active : !active;
          });
        }
      }

      if (activeTab === 'users' && filter.type === 'status') {
        next = next.filter((item) => {
          const active = item.statut !== false && item.is_active !== false;
          return filter.value === 'active' ? active : !active;
        });
      }

      if (activeTab === 'groups' && filter.type === 'status') {
        next = next.filter((item) => {
          const active = item.active !== false && item.statut !== false;
          return filter.value === 'active' ? active : !active;
        });
      }
    });

    return next;
  }, [activeFilters, activeTab, currentItems, search, data.groups, data.modules, data.users]);

  const counts = {
    users: (data.users || []).length,
    groups: (data.groups || []).length,
    permissions: (data.permissions || []).length,
  };

  const updatePermissionRight = async (permission, field, nextValue) => {
    setSavingId(`${permission.id}-${field}`);

    try {
      await apiClient.patch(`/permissions/${permission.id}/`, {
        ...permissionPatchBase(permission),
        [field]: nextValue,
        acces: 'personnalise',
      });
      await refetch();
    } catch (err) {
      console.error('Erreur mise a jour droit', err);
      alert('Impossible de modifier ce droit.');
    } finally {
      setSavingId(null);
    }
  };

  const updatePermissionAccess = async (permission, acces) => {
    setSavingId(`${permission.id}-acces`);

    try {
      await apiClient.patch(`/permissions/${permission.id}/`, {
        ...permissionPatchBase(permission),
        acces,
        ...(ACCESS_RIGHTS[acces] || {}),
      });
      await refetch();
    } catch (err) {
      console.error('Erreur mise a jour acces', err);
      alert("Impossible de modifier l'acces.");
    } finally {
      setSavingId(null);
    }
  };

  const toggleStatus = async (item) => {
    setSavingId(`${item.id}-status`);

    try {
      if (activeTab === 'permissions') {
        const nextStatus = !(item.active !== false && item.statut !== false);
        await apiClient.patch(`/permissions/${item.id}/`, {
          ...permissionPatchBase(item),
          statut: nextStatus,
          active: nextStatus,
        });
      }

      if (activeTab === 'users') {
        const isActive = item.statut !== false && item.is_active !== false;
        await apiClient.patch(`/users/${item.id}/`, {
          statut: !isActive,
          is_active: !isActive,
        });
      }

      if (activeTab === 'groups') {
        const isActive = item.active !== false && item.statut !== false;
        await apiClient.patch(`/groupes/${item.id}/`, {
          statut: !isActive,
        });
      }

      await refetch();
    } catch (err) {
      console.error('Erreur statut', err);
      alert('Impossible de modifier le statut.');
    } finally {
      setSavingId(null);
    }
  };

  const deleteItem = async (item) => {
    const meta = getResourceMeta(activeTab);

    if (!window.confirm(`Supprimer ${meta.label.toLowerCase()} ?`)) return;

    setDeleteId(item.id);

    try {
      await apiClient.delete(`/${endpointFor(activeTab)}/${item.id}/`);
      await refetch();
    } catch (err) {
      console.error('Erreur suppression', err);
      alert('Impossible de supprimer cet element.');
    } finally {
      setDeleteId(null);
    }
  };

  const goToCreate = () => {
    navigate(`/security/create?type=${activeTab}`);
  };

  const goToShow = (item) => {
    navigate(`/security/${activeTab}/${item.id}`);
  };

  const goToEdit = (item) => {
    navigate(`/security/${activeTab}/${item.id}?edit=1`);
  };

  const filterOptions = useMemo(() => {
    if (activeTab !== 'permissions') {
      return {
        simple: [
          { id: 'status-active', type: 'status', value: 'active', label: 'Actifs' },
          { id: 'status-inactive', type: 'status', value: 'inactive', label: 'Inactifs' },
        ],
      };
    }

    return {
      targetTypes: PERMISSION_TARGET_TYPES.map((item) => ({
        id: `target-${item.value}`,
        type: 'target_type',
        value: item.value,
        label: `Type: ${item.label}`,
      })),
      modes: PERMISSION_MODES.map((item) => ({
        id: `mode-${item.value}`,
        type: 'mode',
        value: item.value,
        label: `Mode: ${item.label}`,
      })),
      groups: (data.groups || []).map((group) => ({
        id: `group-${group.id}`,
        type: 'group',
        value: group.id,
        label: `Groupe: ${getGroupName(group)}`,
      })),
      users: (data.users || []).map((user) => ({
        id: `user-${user.id}`,
        type: 'user',
        value: user.id,
        label: `Utilisateur: ${getUserName(user)}`,
      })),
      modules: (data.modules || []).map((module) => ({
        id: `module-${module.id}`,
        type: 'module',
        value: module.id,
        label: `Module: ${getModuleLabel(module)}`,
      })),
      models: (data.models || []).map((model) => ({
        id: `model-${model.id}`,
        type: 'model',
        value: model.id,
        label: `Table: ${getModelLabel(model)}`,
      })),
      entites: [
        { id: 'entite-global', type: 'entite', value: '__global__', label: 'Entite: Toutes' },
        ...(data.entites || []).map((entite) => ({
          id: `entite-${entite.id}`,
          type: 'entite',
          value: entite.id,
          label: `Entite: ${getEntityLabel(entite)}`,
        })),
      ],
      access: ACCESS_TYPES.map((item) => ({
        id: `access-${item.value}`,
        type: 'access',
        value: item.value,
        label: `Acces: ${item.label}`,
      })),
      rights: RIGHT_FIELDS.map((item) => ({
        id: `right-${item.key}`,
        type: 'right',
        value: item.key,
        label: `Droit: ${item.label}`,
      })),
      status: [
        { id: 'status-active', type: 'status', value: 'active', label: 'Statut: Actif' },
        { id: 'status-inactive', type: 'status', value: 'inactive', label: 'Statut: Inactif' },
      ],
    };
  }, [activeTab, data.groups, data.users, data.modules, data.models, data.entites]);

  const renderFilterButton = (filter) => (
    <button
      key={filter.id}
      type="button"
      onClick={() => upsertFilter(filter)}
      className="flex w-full items-center gap-2 rounded px-2 py-1 text-left text-xs hover:bg-gray-100"
    >
      <span className="w-4 text-purple-600">{hasFilter(filter.type, filter.value) ? '✓' : ''}</span>
      <span className="truncate">{filter.label}</span>
    </button>
  );

  const renderUsersTable = () => (
    <table className="w-full border-collapse text-sm">
      <thead>
        <tr className="border-b border-gray-300 bg-gray-100">
          <th className="border-r border-gray-300 px-2 py-2 text-left text-xs font-medium text-gray-700">Utilisateur</th>
          <th className="border-r border-gray-300 px-2 py-2 text-left text-xs font-medium text-gray-700">Email</th>
          <th className="border-r border-gray-300 px-2 py-2 text-left text-xs font-medium text-gray-700">Telephone</th>
          <th className="border-r border-gray-300 px-2 py-2 text-center text-xs font-medium text-gray-700">Statut</th>
          <th className="px-2 py-2 text-center text-xs font-medium text-gray-700">Actions</th>
        </tr>
      </thead>

      <tbody>
        {filteredItems.length === 0 ? (
          <tr>
            <td colSpan={5} className="px-4 py-10 text-center text-sm text-gray-500">Aucun utilisateur trouve</td>
          </tr>
        ) : filteredItems.map((user) => (
          <tr key={user.id} className="border-b border-gray-200 hover:bg-gray-50">
            <td className="border-r border-gray-200 px-2 py-2 text-xs font-medium">{getUserName(user)}</td>
            <td className="border-r border-gray-200 px-2 py-2 text-xs">{user.email || '-'}</td>
            <td className="border-r border-gray-200 px-2 py-2 text-xs">{user.telephone || '-'}</td>

            <td className="border-r border-gray-200 px-2 py-2 text-center">
              <button type="button" onClick={() => toggleStatus(user)} disabled={savingId === `${user.id}-status`}>
                <StatusBadge active={user.statut !== false && user.is_active !== false} />
              </button>
            </td>

            <td className="px-2 py-2">
              <div className="flex items-center justify-center gap-2">
                <button type="button" onClick={() => goToShow(user)} className="text-blue-600 hover:text-blue-800">
                  <FiEye size={14} />
                </button>
                <button type="button" onClick={() => goToEdit(user)} className="text-purple-600 hover:text-purple-800">
                  <FiEdit2 size={14} />
                </button>
                <button type="button" onClick={() => deleteItem(user)} disabled={deleteId === user.id} className="text-red-600 hover:text-red-800 disabled:opacity-50">
                  <FiTrash2 size={14} />
                </button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  const renderGroupsTable = () => (
    <table className="w-full border-collapse text-sm">
      <thead>
        <tr className="border-b border-gray-300 bg-gray-100">
          <th className="border-r border-gray-300 px-2 py-2 text-left text-xs font-medium text-gray-700">Groupe</th>
          <th className="border-r border-gray-300 px-2 py-2 text-left text-xs font-medium text-gray-700">Description</th>
          <th className="border-r border-gray-300 px-2 py-2 text-center text-xs font-medium text-gray-700">Membres</th>
          <th className="border-r border-gray-300 px-2 py-2 text-center text-xs font-medium text-gray-700">Permissions</th>
          <th className="px-2 py-2 text-center text-xs font-medium text-gray-700">Actions</th>
        </tr>
      </thead>

      <tbody>
        {filteredItems.length === 0 ? (
          <tr>
            <td colSpan={5} className="px-4 py-10 text-center text-sm text-gray-500">Aucun groupe trouve</td>
          </tr>
        ) : filteredItems.map((group) => (
          <tr key={group.id} className="border-b border-gray-200 hover:bg-gray-50">
            <td className="border-r border-gray-200 px-2 py-2 text-xs font-medium">
              {getGroupName(group)}
              <div className="text-[11px] text-gray-500">ID: {group.id}</div>
            </td>

            <td className="border-r border-gray-200 px-2 py-2 text-xs">{group.description || '-'}</td>

            <td className="border-r border-gray-200 px-2 py-2 text-center text-xs">
              {group.users_count ?? group.membres_count ?? group.users?.length ?? 0}
            </td>

            <td className="border-r border-gray-200 px-2 py-2 text-center text-xs">
              {group.permissions_count ?? (data.permissions || []).filter((permission) => sameId(permission.groupe, group.id)).length}
            </td>

            <td className="px-2 py-2">
              <div className="flex items-center justify-center gap-2">
                <button type="button" onClick={() => goToShow(group)} className="text-blue-600 hover:text-blue-800">
                  <FiEye size={14} />
                </button>
                <button type="button" onClick={() => goToEdit(group)} className="text-purple-600 hover:text-purple-800">
                  <FiEdit2 size={14} />
                </button>
                <button type="button" onClick={() => deleteItem(group)} disabled={deleteId === group.id} className="text-red-600 hover:text-red-800 disabled:opacity-50">
                  <FiTrash2 size={14} />
                </button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  const renderPermissionsTable = () => (
    <table className="w-full border-collapse text-sm">
      <thead>
        <tr className="border-b border-gray-300 bg-gray-100">
          <th className="border-r border-gray-300 px-2 py-2 text-left text-xs font-medium text-gray-700">Permission</th>
          <th className="border-r border-gray-300 px-2 py-2 text-left text-xs font-medium text-gray-700">Type</th>
          <th className="border-r border-gray-300 px-2 py-2 text-left text-xs font-medium text-gray-700">Cible</th>
          <th className="border-r border-gray-300 px-2 py-2 text-center text-xs font-medium text-gray-700">Mode</th>
          <th className="border-r border-gray-300 px-2 py-2 text-left text-xs font-medium text-gray-700">Module</th>
          <th className="border-r border-gray-300 px-2 py-2 text-left text-xs font-medium text-gray-700">Table</th>
          <th className="border-r border-gray-300 px-2 py-2 text-left text-xs font-medium text-gray-700">Entite</th>
          <th className="border-r border-gray-300 px-2 py-2 text-center text-xs font-medium text-gray-700">Acces</th>

          {RIGHT_FIELDS.map((right) => (
            <th key={right.key} className="border-r border-gray-300 px-2 py-2 text-center text-xs font-medium text-gray-700">
              {right.label}
            </th>
          ))}

          <th className="border-r border-gray-300 px-2 py-2 text-center text-xs font-medium text-gray-700">Statut</th>
          <th className="px-2 py-2 text-center text-xs font-medium text-gray-700">Actions</th>
        </tr>
      </thead>

      <tbody>
        {filteredItems.length === 0 ? (
          <tr>
            <td colSpan={19} className="px-4 py-10 text-center text-sm text-gray-500">Aucune permission trouvee</td>
          </tr>
        ) : filteredItems.map((permission) => {
          const module = (data.modules || []).find((item) => sameId(item.id, permission.module));
          const model = (data.models || []).find((item) => sameId(item.id, permission.model_id));
          const entite = (data.entites || []).find((item) => sameId(item.id, permission.entite));
          const isSavingAccess = savingId === `${permission.id}-acces`;

          return (
            <tr key={permission.id} className="border-b border-gray-200 hover:bg-gray-50">
              <td className="border-r border-gray-200 px-2 py-2 text-xs font-medium">
                {getPermissionName(permission, data.groups, data.modules, data.users)}
                <div className="text-[11px] text-gray-500">ID: {permission.id}</div>
              </td>

              <td className="border-r border-gray-200 px-2 py-2 text-xs">{getPermissionTargetType(permission)}</td>
              <td className="border-r border-gray-200 px-2 py-2 text-xs">{getPermissionTargetName(permission, data)}</td>

              <td className="border-r border-gray-200 px-2 py-2 text-center">
                <ModeBadge mode={permission.mode || 'allow'} />
              </td>

              <td className="border-r border-gray-200 px-2 py-2 text-xs">{permission.module_nom || getModuleLabel(module) || '-'}</td>
              <td className="border-r border-gray-200 px-2 py-2 text-xs">{permission.model_name || getModelLabel(model) || '-'}</td>
              <td className="border-r border-gray-200 px-2 py-2 text-xs">{permission.entite_nom || getEntityLabel(entite) || 'Toutes les entites'}</td>

              <td className="border-r border-gray-200 px-2 py-2 text-center">
                <select
                  value={permission.acces || 'personnalise'}
                  disabled={isSavingAccess}
                  onChange={(event) => updatePermissionAccess(permission, event.target.value)}
                  className="h-7 rounded border border-gray-300 px-1 text-xs outline-none focus:ring-1 focus:ring-purple-500 disabled:opacity-50"
                >
                  {ACCESS_TYPES.map((access) => (
                    <option key={access.value} value={access.value}>{access.label}</option>
                  ))}
                </select>
              </td>

              {RIGHT_FIELDS.map((right) => (
                <td key={right.key} className="border-r border-gray-200 px-2 py-2 text-center">
                  <PermissionCheckbox
                    checked={permission[right.key]}
                    disabled={savingId === `${permission.id}-${right.key}`}
                    onChange={(nextValue) => updatePermissionRight(permission, right.key, nextValue)}
                  />
                </td>
              ))}

              <td className="border-r border-gray-200 px-2 py-2 text-center">
                <button
                  type="button"
                  onClick={() => toggleStatus(permission)}
                  disabled={savingId === `${permission.id}-status`}
                  className="disabled:opacity-50"
                >
                  <StatusBadge active={permission.active !== false && permission.statut !== false} />
                </button>
              </td>

              <td className="px-2 py-2">
                <div className="flex items-center justify-center gap-2">
                  <button type="button" onClick={() => goToShow(permission)} className="text-blue-600 hover:text-blue-800">
                    <FiEye size={14} />
                  </button>
                  <button type="button" onClick={() => goToEdit(permission)} className="text-purple-600 hover:text-purple-800">
                    <FiEdit2 size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteItem(permission)}
                    disabled={deleteId === permission.id}
                    className="text-red-600 hover:text-red-800 disabled:opacity-50"
                  >
                    <FiTrash2 size={14} />
                  </button>
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="mx-auto max-w-full border border-gray-300 bg-white">
        <div className="border-b border-gray-300 px-4 py-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <h1 className="text-lg font-bold text-gray-900">Acces et permissions</h1>

              <button
                type="button"
                onClick={refetch}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-300 text-gray-700 transition hover:bg-gray-50"
                title="Actualiser"
              >
                <FiRefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>

            <div className="flex min-w-[320px] flex-1 justify-center">
              <div className="relative w-full max-w-4xl" ref={filterRef}>
                <div className="flex min-h-[38px] items-center gap-1 rounded border border-gray-300 bg-white p-1">
                  <FiSearch size={16} className="ml-2 text-gray-500" />

                  {activeFilters.map((filter) => (
                    <span key={filter.id} className="inline-flex items-center gap-1 rounded bg-gray-100 px-2 py-1 text-xs text-gray-700">
                      {filter.label}
                      <button type="button" onClick={() => removeFilter(filter.id)} className="text-gray-500 hover:text-red-600">
                        <FiX size={12} />
                      </button>
                    </span>
                  ))}

                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Rechercher..."
                    className="min-w-[140px] flex-1 px-2 py-1 text-sm outline-none"
                  />

                  <button
                    type="button"
                    onClick={() => setShowFilters((value) => !value)}
                    className={`rounded p-1.5 ${showFilters ? 'bg-gray-100 text-purple-700' : 'text-gray-500 hover:bg-gray-100'}`}
                    title="Filtres"
                  >
                    <FiFilter size={15} />
                  </button>
                </div>

                {showFilters && (
                  <div className="absolute right-0 z-50 mt-1 w-80 max-h-[70vh] overflow-y-auto rounded border border-gray-300 bg-white shadow-lg">
                    {activeTab !== 'permissions' && (
                      <div className="border-b border-gray-200 p-2">
                        <p className="mb-2 text-xs font-medium text-gray-700">Statut</p>
                        <div className="space-y-1">{filterOptions.simple.map(renderFilterButton)}</div>
                      </div>
                    )}

                    {activeTab === 'permissions' && (
                      <>
                        <div className="border-b border-gray-200 p-2">
                          <p className="mb-2 text-xs font-medium text-gray-700">Cible</p>
                          <div className="space-y-1">{filterOptions.targetTypes.map(renderFilterButton)}</div>
                        </div>

                        <div className="border-b border-gray-200 p-2">
                          <p className="mb-2 text-xs font-medium text-gray-700">Mode</p>
                          <div className="space-y-1">{filterOptions.modes.map(renderFilterButton)}</div>
                        </div>

                        {getFilterValue('target_type') !== 'user' && (
                          <div className="border-b border-gray-200 p-2">
                            <p className="mb-2 text-xs font-medium text-gray-700">Groupes</p>
                            <div className="max-h-44 space-y-1 overflow-y-auto">{filterOptions.groups.map(renderFilterButton)}</div>
                          </div>
                        )}

                        {getFilterValue('target_type') !== 'group' && (
                          <div className="border-b border-gray-200 p-2">
                            <p className="mb-2 text-xs font-medium text-gray-700">Utilisateurs</p>
                            <div className="max-h-44 space-y-1 overflow-y-auto">{filterOptions.users.map(renderFilterButton)}</div>
                          </div>
                        )}

                        <div className="border-b border-gray-200 p-2">
                          <p className="mb-2 text-xs font-medium text-gray-700">Module</p>
                          <div className="max-h-44 space-y-1 overflow-y-auto">{filterOptions.modules.map(renderFilterButton)}</div>
                        </div>

                        <div className="border-b border-gray-200 p-2">
                          <p className="mb-2 text-xs font-medium text-gray-700">Table / Modele</p>
                          <div className="max-h-44 space-y-1 overflow-y-auto">{filterOptions.models.map(renderFilterButton)}</div>
                        </div>

                        <div className="border-b border-gray-200 p-2">
                          <p className="mb-2 text-xs font-medium text-gray-700">Entite</p>
                          <div className="max-h-44 space-y-1 overflow-y-auto">{filterOptions.entites.map(renderFilterButton)}</div>
                        </div>

                        <div className="border-b border-gray-200 p-2">
                          <p className="mb-2 text-xs font-medium text-gray-700">Acces</p>
                          <div className="space-y-1">{filterOptions.access.map(renderFilterButton)}</div>
                        </div>

                        <div className="border-b border-gray-200 p-2">
                          <p className="mb-2 text-xs font-medium text-gray-700">Droits coches</p>
                          <div className="grid grid-cols-2 gap-1">{filterOptions.rights.map(renderFilterButton)}</div>
                        </div>

                        <div className="border-b border-gray-200 p-2">
                          <p className="mb-2 text-xs font-medium text-gray-700">Statut</p>
                          <div className="space-y-1">{filterOptions.status.map(renderFilterButton)}</div>
                        </div>
                      </>
                    )}

                    {(activeFilters.length > 0 || search.trim()) && (
                      <div className="p-2">
                        <button type="button" onClick={clearFilters} className="w-full py-1 text-center text-xs text-red-600 hover:text-red-700">
                          Effacer les filtres
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={goToCreate}
              className="inline-flex h-8 items-center gap-2 rounded bg-purple-600 px-3 text-xs font-medium text-white transition hover:bg-purple-700"
            >
              + Nouveau {getResourceMeta(activeTab).label.toLowerCase()}
            </button>
          </div>
        </div>

        <div className="border-b border-gray-300 px-4">
          <div className="flex gap-1">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(tab.id);
                    setSearch('');
                    setActiveFilters([]);
                    setShowFilters(false);
                    navigate(`${SECURITY_LIST_ROUTE}?tab=${tab.id}`);
                  }}
                  className={`inline-flex items-center gap-2 border-b-2 px-4 py-3 text-xs ${
                    active
                      ? 'border-purple-600 text-purple-700 font-semibold'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Icon size={14} />
                  {tab.label}
                  <span className="rounded bg-gray-100 px-1.5 py-0.5 text-gray-600">{counts[tab.id]}</span>
                </button>
              );
            })}
          </div>
        </div>

        {error && (
          <div className="mx-4 mt-3 flex items-center gap-2 rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            {error}
          </div>
        )}

        <div className="border-b border-gray-300 bg-gray-50 px-4 py-2 text-xs text-gray-600">
          {filteredItems.length} resultat(s)
        </div>

        <div className="overflow-x-auto">
          {loading && currentItems.length === 0 ? (
            <div className="px-4 py-16 text-center text-sm text-gray-500">Chargement...</div>
          ) : (
            <>
              {activeTab === 'users' && renderUsersTable()}
              {activeTab === 'groups' && renderGroupsTable()}
              {activeTab === 'permissions' && renderPermissionsTable()}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default SecurityList;