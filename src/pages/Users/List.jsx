import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiAlertCircle,
  FiChevronLeft,
  FiChevronRight,
  FiEdit2,
  FiEye,
  FiFilter,
  FiKey,
  FiLock,
  FiPlus,
  FiRefreshCw,
  FiSearch,
  FiShield,
  FiTrash2,
  FiUnlock,
  FiUsers,
} from 'react-icons/fi';
import { apiClient } from '../../services/apiClient';
import {
  ACCESS_TYPES,
  findById,
  getGroupName,
  getPermissionName,
  getResourceMeta,
  getUserName,
  useSecurityData,
} from './SecurityShared';

export default function SecurityList() {
  const navigate = useNavigate();
  const data = useSecurityData();
  const [activeTab, setActiveTab] = useState('users');
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterAccess, setFilterAccess] = useState('');
  const [page, setPage] = useState(1);
  const [actionError, setActionError] = useState(null);
  const [pendingId, setPendingId] = useState(null);

  const pageSize = 15;

  useEffect(() => {
    setPage(1);
    setFilterStatus('');
    setFilterAccess('');
    setActionError(null);
  }, [activeTab]);

  useEffect(() => {
    setPage(1);
  }, [search, filterStatus, filterAccess]);

  const filteredItems = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const source = activeTab === 'users' ? data.users : activeTab === 'groups' ? data.groups : data.permissions;
    return source.filter((item) => {
      let text = '';
      if (activeTab === 'users') text = [getUserName(item), item.email, item.username, item.telephone].filter(Boolean).join(' ');
      if (activeTab === 'groups') text = [item.name, item.description, item.category].filter(Boolean).join(' ');
      if (activeTab === 'permissions') text = [
        getPermissionName(item, data.groups, data.modules),
        findById(data.groups, item.groupe)?.name,
        findById(data.modules, item.module)?.nom_affiche,
        item.acces,
      ].filter(Boolean).join(' ');

      const matchesSearch = !needle || text.toLowerCase().includes(needle);
      const matchesStatus = !filterStatus || (
        activeTab === 'users'
          ? (item.statut || (item.is_active ? 'actif' : 'inactif')) === filterStatus
          : String(Boolean(item.statut)) === filterStatus
      );
      const matchesAccess = activeTab !== 'permissions' || !filterAccess || item.acces === filterAccess;
      return matchesSearch && matchesStatus && matchesAccess;
    });
  }, [activeTab, data, search, filterStatus, filterAccess]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedItems = filteredItems.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const endpointFor = (type) => (type === 'users' ? 'users' : type === 'groups' ? 'groupes' : 'permissions');

  const remove = async (item) => {
    const meta = getResourceMeta(activeTab);
    if (!window.confirm(`Supprimer ${meta.label.toLowerCase()} "${labelFor(activeTab, item, data)}" ?`)) return;
    setActionError(null);
    setPendingId(item.id);
    try {
      await apiClient.delete(`/${endpointFor(activeTab)}/${item.id}/`);
      await data.fetchData();
    } catch (err) {
      setActionError(err?.response?.data?.detail || err?.message || 'Suppression impossible');
    } finally {
      setPendingId(null);
    }
  };

  const toggleStatus = async (item) => {
    setActionError(null);
    setPendingId(item.id);
    try {
      if (activeTab === 'users') {
        const isActive = item.statut === 'actif' || item.is_active;
        const nextStatut = isActive ? 'inactif' : 'actif';
        await apiClient.patch(`/users/${item.id}/`, { statut: nextStatut, is_active: !isActive });
      } else if (activeTab === 'permissions') {
        await apiClient.patch(`/permissions/${item.id}/`, { statut: !item.statut });
      }
      await data.fetchData();
    } catch (err) {
      setActionError(err?.response?.data?.detail || err?.message || 'Mise a jour du statut impossible');
    } finally {
      setPendingId(null);
    }
  };

  const stats = {
    users: data.users.length,
    groups: data.groups.length,
    permissions: data.permissions.length,
  };

  return (
    <div className="p-4">
      <div className="bg-white border border-gray-300">
        <div className="px-4 py-3 border-b border-gray-300 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-900">Accès et permissions</h1>
            <p className="text-xs text-gray-500">
              {stats.users} utilisateur(s), {stats.groups} groupe(s), {stats.permissions} permission(s)
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={data.fetchData} className="h-8 px-3 border border-gray-300 text-xs hover:bg-gray-50 flex items-center gap-1">
              <FiRefreshCw size={13} className={data.loading ? 'animate-spin' : ''} /> Actualiser
            </button>
            <button
              onClick={() => navigate(`/security/create?type=${activeTab}`)}
              className="h-8 px-3 bg-purple-600 text-white text-xs hover:bg-purple-700 flex items-center gap-1"
            >
              <FiPlus size={13} /> Nouveau {getResourceMeta(activeTab).label.toLowerCase()}
            </button>
          </div>
        </div>

        <div className="border-b border-gray-300 px-4">
          <div className="flex gap-1">
            <Tab active={activeTab === 'users'} onClick={() => setActiveTab('users')} icon={FiUsers} label="Utilisateurs" count={stats.users} />
            <Tab active={activeTab === 'groups'} onClick={() => setActiveTab('groups')} icon={FiShield} label="Groupes" count={stats.groups} />
            <Tab active={activeTab === 'permissions'} onClick={() => setActiveTab('permissions')} icon={FiKey} label="Permissions" count={stats.permissions} />
          </div>
        </div>

        <div className="px-4 py-3 border-b border-gray-300 bg-gray-50 grid grid-cols-12 gap-2">
          <div className="col-span-6 relative">
            <FiSearch size={13} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-8 pl-7 pr-2 border border-gray-300 text-xs focus:ring-1 focus:ring-purple-500 focus:outline-none"
              placeholder="Rechercher..."
            />
          </div>
          <div className="col-span-3 flex items-center gap-1">
            <FiFilter size={13} className="text-gray-400" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full h-8 border border-gray-300 text-xs"
              disabled={activeTab === 'groups'}
            >
              <option value="">Tous les statuts</option>
              {activeTab === 'users' ? (
                <>
                  <option value="actif">Actifs</option>
                  <option value="inactif">Inactifs</option>
                </>
              ) : (
                <>
                  <option value="true">Actives</option>
                  <option value="false">Inactives</option>
                </>
              )}
            </select>
          </div>
          <div className="col-span-3">
            <select
              value={filterAccess}
              onChange={(e) => setFilterAccess(e.target.value)}
              className="w-full h-8 border border-gray-300 text-xs"
              disabled={activeTab !== 'permissions'}
            >
              <option value="">Tous les acces</option>
              {ACCESS_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
            </select>
          </div>
          {(search || filterStatus || filterAccess) && (
            <div className="col-span-12">
              <button
                onClick={() => { setSearch(''); setFilterStatus(''); setFilterAccess(''); }}
                className="h-7 px-2 border border-gray-300 bg-white text-xs hover:bg-gray-50"
              >
                Reinitialiser
              </button>
            </div>
          )}
        </div>

        {(data.error || actionError) && (
          <div className="mx-4 mt-3 bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2 flex items-center gap-2">
            <FiAlertCircle size={14} /> {actionError || data.error}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              {activeTab === 'users' && <UserHead />}
              {activeTab === 'groups' && <GroupHead />}
              {activeTab === 'permissions' && <PermissionHead />}
            </thead>
            <tbody>
              {data.loading ? (
                <Empty colSpan={6} label="Chargement..." />
              ) : pagedItems.length === 0 ? (
                <Empty colSpan={6} label="Aucun resultat" />
              ) : pagedItems.map((item) => (
                <Row
                  key={item.id}
                  type={activeTab}
                  item={item}
                  data={data}
                  pending={pendingId === item.id}
                  onView={() => navigate(`/security/${activeTab}/${item.id}`)}
                  onEdit={() => navigate(`/security/${activeTab}/${item.id}?edit=1`)}
                  onDelete={() => remove(item)}
                  onToggleStatus={() => toggleStatus(item)}
                />
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-4 py-2 border-t border-gray-300 bg-gray-50 text-xs text-gray-500 flex items-center justify-between">
          <span>{filteredItems.length} resultat(s)</span>
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1 border border-gray-300 bg-white disabled:opacity-40 hover:bg-gray-100"
              >
                <FiChevronLeft size={13} />
              </button>
              <span>Page {currentPage} / {totalPages}</span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1 border border-gray-300 bg-white disabled:opacity-40 hover:bg-gray-100"
              >
                <FiChevronRight size={13} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function labelFor(type, item, data) {
  if (type === 'users') return getUserName(item);
  if (type === 'groups') return getGroupName(item);
  return getPermissionName(item, data.groups, data.modules);
}

function Tab({ active, onClick, icon: Icon, label, count }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-3 text-xs border-b-2 flex items-center gap-2 ${
        active ? 'border-purple-600 text-purple-700 font-semibold' : 'border-transparent text-gray-600 hover:text-gray-900'
      }`}
    >
      <Icon size={14} />
      {label}
      <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600">{count}</span>
    </button>
  );
}

function TH({ children, center = false }) {
  return <th className={`border border-gray-300 px-2 py-1.5 text-xs bg-gray-100 ${center ? 'text-center' : 'text-left'}`}>{children}</th>;
}

function TD({ children, center = false }) {
  return <td className={`border border-gray-300 px-2 py-1.5 text-xs ${center ? 'text-center' : ''}`}>{children}</td>;
}

function UserHead() {
  return <tr><TH>Utilisateur</TH><TH>Contact</TH><TH>Partenaire</TH><TH>Groupes</TH><TH center>Statut</TH><TH center>Actions</TH></tr>;
}

function GroupHead() {
  return <tr><TH>Groupe</TH><TH>Description</TH><TH center>Membres</TH><TH center>Permissions</TH><TH center>Actions</TH></tr>;
}

function PermissionHead() {
  return <tr><TH>Permission</TH><TH>Groupe</TH><TH>Module</TH><TH>Entite</TH><TH center>Acces</TH><TH center>Actions</TH></tr>;
}

function Empty({ colSpan, label }) {
  return <tr><td colSpan={colSpan} className="border border-gray-300 px-3 py-8 text-center text-sm text-gray-500">{label}</td></tr>;
}

function Row({ type, item, data, pending, onView, onEdit, onDelete, onToggleStatus }) {
  if (type === 'users') {
    const groups = item.groups?.map((group) => getGroupName(findById(data.groups, group))).filter(Boolean) || [];
    const active = item.statut === 'actif' || item.is_active;
    return (
      <tr className="hover:bg-gray-50">
        <TD><div className="font-medium text-gray-900">{getUserName(item)}</div><div className="text-[11px] text-gray-500">ID: {item.id}</div></TD>
        <TD><div>{item.email || '-'}</div><div className="text-gray-500">{item.telephone || item.username || '-'}</div></TD>
        <TD>{item.partenaire?.nom || item.partenaire?.raison_sociale || '-'}</TD>
        <TD>{groups.length ? groups.join(', ') : '-'}</TD>
        <TD center><span className={`px-2 py-1 ${active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{active ? 'Actif' : 'Inactif'}</span></TD>
        <Actions onView={onView} onEdit={onEdit} onDelete={onDelete} onToggleStatus={onToggleStatus} active={active} pending={pending} />
      </tr>
    );
  }

  if (type === 'groups') {
    return (
      <tr className="hover:bg-gray-50">
        <TD><div className="font-medium text-gray-900">{item.name}</div><div className="text-[11px] text-gray-500">ID: {item.id}</div></TD>
        <TD>{item.description || '-'}</TD>
        <TD center>{item.members?.length || 0}</TD>
        <TD center>{item.permissions?.length || 0}</TD>
        <Actions onView={onView} onEdit={onEdit} onDelete={onDelete} pending={pending} />
      </tr>
    );
  }

  const group = findById(data.groups, item.groupe);
  const module = findById(data.modules, item.module);
  const entite = findById(data.entites, item.entite);
  return (
    <tr className="hover:bg-gray-50">
      <TD><div className="font-medium text-gray-900">{getPermissionName(item, data.groups, data.modules)}</div><div className="text-[11px] text-gray-500">ID: {item.id}</div></TD>
      <TD>{group?.name || '-'}</TD>
      <TD>{module?.nom_affiche || module?.name || '-'}</TD>
      <TD>{entite?.raison_sociale || '-'}</TD>
      <TD center><span className="px-2 py-1 bg-purple-50 text-purple-700 border border-purple-200">{item.acces || '-'}</span></TD>
      <Actions onView={onView} onEdit={onEdit} onDelete={onDelete} onToggleStatus={onToggleStatus} active={item.statut} pending={pending} />
    </tr>
  );
}

function Actions({ onView, onEdit, onDelete, onToggleStatus, active, pending }) {
  return (
    <td className="border border-gray-300 px-2 py-1.5">
      <div className="flex items-center justify-center gap-1">
        {onToggleStatus && (
          <button
            onClick={onToggleStatus}
            disabled={pending}
            className={`p-1 disabled:opacity-40 ${active ? 'text-orange-600 hover:bg-orange-50' : 'text-green-600 hover:bg-green-50'}`}
            title={active ? 'Désactiver' : 'Activer'}
          >
            {active ? <FiLock size={14} /> : <FiUnlock size={14} />}
          </button>
        )}
        <button onClick={onView} disabled={pending} className="p-1 text-blue-600 hover:bg-blue-50 disabled:opacity-40" title="Afficher"><FiEye size={14} /></button>
        <button onClick={onEdit} disabled={pending} className="p-1 text-purple-600 hover:bg-purple-50 disabled:opacity-40" title="Modifier"><FiEdit2 size={14} /></button>
        <button onClick={onDelete} disabled={pending} className="p-1 text-red-600 hover:bg-red-50 disabled:opacity-40" title="Supprimer">
          {pending ? <span className="block w-3.5 h-3.5 border-2 border-red-300 border-t-red-600 rounded-full animate-spin" /> : <FiTrash2 size={14} />}
        </button>
      </div>
    </td>
  );
}