import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiAlertCircle,
  FiEdit2,
  FiEye,
  FiFilter,
  FiPlus,
  FiRefreshCw,
  FiSearch,
  FiTrash2,
} from 'react-icons/fi';
import { TbBuildingSkyscraper } from 'react-icons/tb';
import { apiClient } from '../../services/apiClient';
import { getEntityName, getVilleName, parseResponse } from './EntityShared';

export default function EntitiesList() {
  const navigate = useNavigate();
  const [entities, setEntities] = useState([]);
  const [pays, setPays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [filterCountry, setFilterCountry] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const fetchEntities = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [entitiesRes, paysRes] = await Promise.all([
        apiClient.get('/entites/'),
        apiClient.get('/pays/'),
      ]);
      setEntities(parseResponse(entitiesRes));
      setPays(parseResponse(paysRes));
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || 'Impossible de charger les entites');
      setEntities([]);
      setPays([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEntities();
  }, [fetchEntities]);

  const filteredEntities = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return entities.filter((entity) => {
      const text = [
        getEntityName(entity),
        entity.sigle,
        entity.forme_juridique,
        entity.activite,
        entity.email,
        entity.telephone,
        entity.numero_fiscal,
        entity.registre_commerce,
        getVilleName(entity),
        entity.pays_details?.nom,
        entity.pays_details?.name,
      ].filter(Boolean).join(' ').toLowerCase();

      const matchSearch = !needle || text.includes(needle);
      const matchCountry = !filterCountry || String(entity.pays_details?.id ?? entity.pays ?? '') === String(filterCountry);
      const matchStatus = !filterStatus || String(Boolean(entity.statut)) === filterStatus;

      return matchSearch && matchCountry && matchStatus;
    });
  }, [entities, search, filterCountry, filterStatus]);

  const deleteEntity = async (entity) => {
    if (!window.confirm(`Supprimer "${getEntityName(entity)}" ?`)) return;
    try {
      await apiClient.delete(`/entites/${entity.id}/`);
      await fetchEntities();
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || 'Suppression impossible');
    }
  };

  const stats = {
    total: entities.length,
    actifs: entities.filter((entity) => entity.statut).length,
    parents: entities.filter((entity) => entity.parent_id).length,
  };

  return (
    <div className="p-4">
      <div className="bg-white border border-gray-300">
        <div className="px-4 py-3 border-b border-gray-300 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-900">Entites</h1>
            <p className="text-xs text-gray-500">
              {stats.total} entite(s), {stats.actifs} active(s), {stats.parents} avec entite parente
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchEntities}
              className="h-8 px-3 border border-gray-300 text-xs hover:bg-gray-50 flex items-center gap-1"
            >
              <FiRefreshCw size={13} />
              Actualiser
            </button>
            <button
              onClick={() => navigate('/entities/create')}
              className="h-8 px-3 bg-purple-600 text-white text-xs hover:bg-purple-700 flex items-center gap-1"
            >
              <FiPlus size={13} />
              Nouvelle entite
            </button>
          </div>
        </div>

        <div className="px-4 py-3 border-b border-gray-300 bg-gray-50 grid grid-cols-12 gap-2">
          <div className="col-span-12 md:col-span-6 relative">
            <FiSearch size={13} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="w-full h-8 pl-7 pr-2 border border-gray-300 text-xs focus:ring-1 focus:ring-purple-500 focus:outline-none"
              placeholder="Rechercher raison sociale, email, telephone, numero fiscal..."
            />
          </div>
          <div className="col-span-6 md:col-span-3 flex items-center gap-1">
            <FiFilter size={13} className="text-gray-400" />
            <select
              value={filterCountry}
              onChange={(event) => setFilterCountry(event.target.value)}
              className="w-full h-8 border border-gray-300 text-xs"
            >
              <option value="">Tous les pays</option>
              {pays.map((country) => (
                <option key={country.id} value={country.id}>
                  {country.emoji ? `${country.emoji} ` : ''}{country.nom || country.name}
                </option>
              ))}
            </select>
          </div>
          <div className="col-span-6 md:col-span-3">
            <select
              value={filterStatus}
              onChange={(event) => setFilterStatus(event.target.value)}
              className="w-full h-8 border border-gray-300 text-xs"
            >
              <option value="">Tous les statuts</option>
              <option value="true">Actives</option>
              <option value="false">Inactives</option>
            </select>
          </div>
        </div>

        {error && (
          <div className="mx-4 mt-3 bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2 flex items-center gap-2">
            <FiAlertCircle size={14} />
            {error}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 px-2 py-1.5 text-xs text-left">Entite</th>
                <th className="border border-gray-300 px-2 py-1.5 text-xs text-left">Activite</th>
                <th className="border border-gray-300 px-2 py-1.5 text-xs text-left">Contact</th>
                <th className="border border-gray-300 px-2 py-1.5 text-xs text-left">Localisation</th>
                <th className="border border-gray-300 px-2 py-1.5 text-xs text-left">Fiscal</th>
                <th className="border border-gray-300 px-2 py-1.5 text-xs text-center">Statut</th>
                <th className="border border-gray-300 px-2 py-1.5 text-xs text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="border border-gray-300 px-3 py-8 text-center text-sm text-gray-500">
                    Chargement...
                  </td>
                </tr>
              ) : filteredEntities.length === 0 ? (
                <tr>
                  <td colSpan={7} className="border border-gray-300 px-3 py-8 text-center text-sm text-gray-500">
                    Aucune entite trouvee
                  </td>
                </tr>
              ) : filteredEntities.map((entity) => (
                <tr key={entity.id} className="hover:bg-gray-50">
                  <td className="border border-gray-300 px-2 py-1.5">
                    <div className="flex items-center gap-2">
                      {entity.logo ? (
                        <img
                          src={entity.logo}
                          alt={getEntityName(entity)}
                          className="w-7 h-7 rounded-full object-cover border border-gray-300"
                        />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-purple-50 border border-purple-200 flex items-center justify-center">
                          <TbBuildingSkyscraper size={15} className="text-purple-700" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="text-xs font-medium text-gray-900 truncate max-w-[220px]">
                          {getEntityName(entity)}
                        </div>
                        <div className="text-[11px] text-gray-500">
                          ID: {entity.id}{entity.sigle ? ` - ${entity.sigle}` : ''}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="border border-gray-300 px-2 py-1.5 text-xs">
                    <div>{entity.activite || '-'}</div>
                    <div className="text-gray-500">{entity.forme_juridique || '-'}</div>
                  </td>
                  <td className="border border-gray-300 px-2 py-1.5 text-xs">
                    <div>{entity.email || '-'}</div>
                    <div className="text-gray-500">{entity.telephone || '-'}</div>
                  </td>
                  <td className="border border-gray-300 px-2 py-1.5 text-xs">
                    <div>{getVilleName(entity) || '-'}</div>
                    <div className="text-gray-500">
                      {entity.pays_details?.emoji ? `${entity.pays_details.emoji} ` : ''}
                      {entity.pays_details?.nom || entity.pays_details?.name || ''}
                    </div>
                  </td>
                  <td className="border border-gray-300 px-2 py-1.5 text-xs">
                    <div>{entity.numero_fiscal || '-'}</div>
                    <div className="text-gray-500">{entity.registre_commerce || '-'}</div>
                  </td>
                  <td className="border border-gray-300 px-2 py-1.5 text-center text-xs">
                    <span className={`px-2 py-1 ${entity.statut ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {entity.statut ? 'Actif' : 'Inactif'}
                    </span>
                  </td>
                  <td className="border border-gray-300 px-2 py-1.5">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => navigate(`/entities/${entity.id}`)}
                        className="p-1 text-blue-600 hover:bg-blue-50"
                        title="Afficher"
                      >
                        <FiEye size={14} />
                      </button>
                      <button
                        onClick={() => navigate(`/entities/${entity.id}?edit=1`)}
                        className="p-1 text-purple-600 hover:bg-purple-50"
                        title="Modifier"
                      >
                        <FiEdit2 size={14} />
                      </button>
                      <button
                        onClick={() => deleteEntity(entity)}
                        className="p-1 text-red-600 hover:bg-red-50"
                        title="Supprimer"
                      >
                        <FiTrash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-4 py-2 border-t border-gray-300 bg-gray-50 text-xs text-gray-500">
          {filteredEntities.length} resultat(s)
        </div>
      </div>
    </div>
  );
}
