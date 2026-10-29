import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiEdit2, FiEye, FiFilter, FiTrash2 } from 'react-icons/fi';
import { TbBuildingSkyscraper } from 'react-icons/tb';
import { apiClient } from '../../services/apiClient';
import { useUi } from '../../context/UiContext';
import { can } from '../../services/securityAccess';
import { getConfiguredModelView } from '../../services/metadataViews';
import MetadataFieldDisplay from '../../components/MetadataFieldDisplay';
import UnifiedIndexPage from '../../components/UnifiedIndexPage';
import { getEntityName, getVilleName, parseResponse } from './EntityShared';
import SomaneSelect from '../../components/SomaneSelect';

const FALLBACK_LIST_FIELDS = [
  { name: 'raison_sociale', label: 'Raison sociale', type: 'char' },
  { name: 'activite', label: 'Activité', type: 'char' },
  { name: 'telephone', label: 'Téléphone', type: 'char' },
  { name: 'email', label: 'E-mail', type: 'char' },
  { name: 'statut', label: 'Active', type: 'boolean' },
];

function getEntityFieldValue(entity, fieldName) {
  if (fieldName === 'raison_sociale') return getEntityName(entity);
  if (fieldName === 'ville') return entity.ville_details || getVilleName(entity);
  if (fieldName === 'pays') return entity.pays_details || entity.pays;
  if (fieldName === 'subdivision' || fieldName === 'region') return entity.subdivision_details || entity.region_details || entity.subdivision || entity.region;
  if (fieldName === 'parent_id') return entity.parent_details || entity.parent_id;
  return entity[fieldName];
}

export default function EntitiesList() {
  const navigate = useNavigate();
  const { security, configuration } = useUi();
  const configuredList = useMemo(
    () => getConfiguredModelView(configuration, 'core.Entite', 'list'),
    [configuration],
  );
  const listFields = configuredList?.fields?.length ? configuredList.fields : FALLBACK_LIST_FIELDS;
  const canCreate = can(security, 'core.Entite', 'create');
  const canWrite = can(security, 'core.Entite', 'write');
  const canDelete = can(security, 'core.Entite', 'delete');
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

  const deleteEntity = useCallback(async (entity) => {
    if (!canDelete || !window.confirm(`Supprimer "${getEntityName(entity)}" ?`)) return;
    try {
      await apiClient.delete(`/entites/${entity.id}/`);
      await fetchEntities();
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || 'Suppression impossible');
    }
  }, [canDelete, fetchEntities]);

  const columns = useMemo(() => [
    ...listFields.map((field) => ({
      id: field.name,
      label: field.label,
      className: field.name === 'raison_sociale' ? 'somane-list-table__cell--entity-logo' : undefined,
      value: (entity) => getEntityFieldValue(entity, field.name),
      render: (value, entity) => field.name === 'raison_sociale' ? (
        <div className="flex min-w-0 items-center gap-2">
          {entity.logo ? <img src={entity.logo} alt={`Logo ${getEntityName(entity)}`} className="h-7 w-7 shrink-0 rounded-full border border-gray-300 object-cover" /> : <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-violet-200 bg-violet-50"><TbBuildingSkyscraper size={15} className="text-violet-700" /></span>}
          <span className="min-w-0"><span className="block max-w-[220px] truncate font-medium text-gray-900"><MetadataFieldDisplay value={value} field={field} record={entity} /></span><span className="block text-[10px] text-gray-500">ID : {entity.id}{entity.sigle ? ` · ${entity.sigle}` : ''}</span></span>
        </div>
      ) : <MetadataFieldDisplay value={value} field={field} record={entity} />,
    })),
    {
      id: 'actions', label: 'Actions', sortable: false,
      render: (_, entity) => <div className="flex items-center justify-center gap-1">
        <button type="button" onClick={(event) => { event.stopPropagation(); navigate(`/entities/${entity.id}`); }} className="rounded p-1 text-blue-600 hover:bg-blue-50" title="Afficher" aria-label="Afficher"><FiEye size={14} /></button>
        {canWrite && <button type="button" onClick={(event) => { event.stopPropagation(); navigate(`/entities/${entity.id}?edit=1`); }} className="rounded p-1 text-violet-700 hover:bg-violet-50" title="Modifier" aria-label="Modifier"><FiEdit2 size={14} /></button>}
        {canDelete && <button type="button" onClick={(event) => { event.stopPropagation(); void deleteEntity(entity); }} className="rounded p-1 text-red-600 hover:bg-red-50" title="Supprimer" aria-label="Supprimer"><FiTrash2 size={14} /></button>}
      </div>,
    },
  ], [listFields, canWrite, canDelete, deleteEntity, navigate]);

  return (
    <UnifiedIndexPage
      title="Entités"
      rows={filteredEntities}
      columns={columns}
      rowKey="id"
      loading={loading}
      error={error || ''}
      onDismissError={() => setError(null)}
      emptyText="Aucune entité trouvée"
      searchValue={search}
      onSearchChange={setSearch}
      searchPlaceholder="Rechercher une entité…"
      renderFilters={() => <div className="grid gap-3 p-4 sm:grid-cols-2">
        <label className="text-xs font-medium text-gray-700"><span className="mb-1 flex items-center gap-1"><FiFilter /> Pays</span><select value={filterCountry} onChange={(event) => setFilterCountry(event.target.value)} className="h-9 w-full rounded border border-gray-300 bg-white px-2 text-sm"><option value="">Tous les pays</option>{pays.map((country) => <option key={country.id} value={country.id}>{country.emoji ? `${country.emoji} ` : ''}{country.nom || country.name}</option>)}</select></label>
        <label className="text-xs font-medium text-gray-700">Statut<select value={filterStatus} onChange={(event) => setFilterStatus(event.target.value)} className="mt-1 h-9 w-full rounded border border-gray-300 bg-white px-2 text-sm"><option value="">Tous les statuts</option><option value="true">Actives</option><option value="false">Inactives</option></select></label>
      </div>}
      primaryAction={canCreate ? { label: 'Nouvelle entité', onClick: () => navigate('/entities/create') } : null}
      trailingActions={[{ id: 'refresh', label: 'Actualiser', variant: 'default', onClick: fetchEntities }]}
      onRowOpen={(entity) => navigate(`/entities/${entity.id}`)}
      pageSizeOptions={[15, 25, 50, 100]}
      defaultVisibleColumnIds={columns.map((column) => column.id)}
      showHistoryNavigation={false}
    />  );
}
