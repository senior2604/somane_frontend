// C:\python\django\somane_frontend\src\pages\Partners\List.jsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiEdit2, FiEye, FiFilter, FiTrash2 } from 'react-icons/fi';
import { apiClient } from '../../services/apiClient';
import { useEntity } from '../../context/EntityContext';
import { useUi } from '../../context/UiContext';
import { useLanguage } from '../../context/LanguageContext';
import { can } from '../../services/securityAccess';
import { getConfiguredModelView } from '../../services/metadataViews';
import { PARTNER_TYPES, getPartnerName, parseResponse } from './PartnerShared';
import MetadataFieldDisplay from '../../components/MetadataFieldDisplay';
import UnifiedIndexPage from '../../components/UnifiedIndexPage';

export default function PartnersList() {
  const navigate = useNavigate();
  const { activeEntity } = useEntity();
  const { security, configuration } = useUi();
  const { t } = useLanguage();
  const configuredList = useMemo(
    () => getConfiguredModelView(configuration, 'core.Partenaire', 'list', {
      preferredViewKey: 'somane_ui.partners_list',
    }),
    [configuration],
  );
  const listFields = useMemo(() => {
    const fields = configuredList?.fields?.length ? configuredList.fields : [
      { name: 'nom', label: t('Partenaire'), type: 'char' },
      { name: 'type_partenaire', label: t('Type'), type: 'char' },
      { name: 'is_company', label: t('Société'), type: 'boolean' },
      { name: 'telephone', label: t('Téléphone'), type: 'char' },
      { name: 'email', label: t('E-mail'), type: 'char' },
      { name: 'statut', label: t('Actif'), type: 'boolean' },
    ];
    if (fields.some((field) => field.name === 'nom')) return fields;
    return [{ name: 'nom', label: t('Partenaire'), type: 'char' }, ...fields];
  }, [configuredList, t]);
  const getPartnerFieldValue = (partner, fieldName) => {
    if (fieldName === 'nom') return getPartnerName(partner);
    if (fieldName === 'pays') return partner.pays_details || partner.pays;
    if (fieldName === 'ville') return partner.ville_details || partner.ville_legacy || partner.ville;
    return partner[fieldName];
  };
  const canCreate = can(security, 'core.Partenaire', 'create');
  const canWrite = can(security, 'core.Partenaire', 'write');
  const canDelete = can(security, 'core.Partenaire', 'delete');
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const fetchPartners = useCallback(async () => {
    if (!activeEntity?.id) {
      setPartners([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get('/partenaires/');
      const data = parseResponse(response);
      setPartners(data.filter(p => !p.company || p.company === activeEntity.id || p.company?.id === activeEntity.id));
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || 'Impossible de charger les partenaires');
    } finally {
      setLoading(false);
    }
  }, [activeEntity]);

  useEffect(() => { fetchPartners(); }, [fetchPartners]);

  const filteredPartners = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return partners.filter(p => {
      const text = [
        p.nom, p.raison_sociale, p.name, p.email, p.telephone,
        p.numero_fiscal, p.registre_commerce,
      ].filter(Boolean).join(' ').toLowerCase();
      const matchSearch = !needle || text.includes(needle);
      const matchType = !filterType || p.type_partenaire === filterType;
      const matchStatus = !filterStatus || String(Boolean(p.statut)) === filterStatus;
      return matchSearch && matchType && matchStatus;
    });
  }, [partners, search, filterType, filterStatus]);

  const deletePartner = useCallback(async (partner) => {
    if (!window.confirm(`Supprimer "${getPartnerName(partner)}" ?`)) return;
    try {
      await apiClient.delete(`/partenaires/${partner.id}/`);
      await fetchPartners();
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || 'Suppression impossible');
    }
  }, [fetchPartners]);

  const columns = useMemo(() => [
    ...listFields.map((field) => ({
      id: field.name,
      label: field.name === 'nom' ? t('Partenaire') : t(field.label),
      value: (partner) => getPartnerFieldValue(partner, field.name),
      render: (value, partner) => field.name === 'nom' ? (
        <div className="min-w-0"><div className="truncate font-medium text-gray-900"><MetadataFieldDisplay value={value} field={field} record={partner} /></div><div className="text-[10px] text-gray-500">ID : {partner.id}</div></div>
      ) : field.name === 'statut' || field.name === 'is_company' ? (
        <span className={`inline-flex rounded px-2 py-0.5 ${Boolean(value) ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'}`}><MetadataFieldDisplay value={Boolean(value)} field={field} record={partner} /></span>
      ) : <MetadataFieldDisplay value={value} field={field} record={partner} />,
    })),
    {
      id: 'actions', label: 'Actions', sortable: false,
      render: (_, partner) => <div className="flex items-center justify-center gap-1">
        <button type="button" onClick={(event) => { event.stopPropagation(); navigate(`/partners/${partner.id}`); }} className="rounded p-1 text-blue-600 hover:bg-blue-50" title="Afficher" aria-label="Afficher"><FiEye size={14} /></button>
        {canWrite && <button type="button" onClick={(event) => { event.stopPropagation(); navigate(`/partners/${partner.id}?edit=1`); }} className="rounded p-1 text-violet-700 hover:bg-violet-50" title="Modifier" aria-label="Modifier"><FiEdit2 size={14} /></button>}
        {canDelete && <button type="button" onClick={(event) => { event.stopPropagation(); void deletePartner(partner); }} className="rounded p-1 text-red-600 hover:bg-red-50" title="Supprimer" aria-label="Supprimer"><FiTrash2 size={14} /></button>}
      </div>,
    },
  ], [listFields, canWrite, canDelete, deletePartner, navigate, t]);

  return (
    <UnifiedIndexPage
      title="Partenaires"
      rows={filteredPartners}
      columns={columns}
      rowKey="id"
      loading={loading}
      error={error || ''}
      onDismissError={() => setError(null)}
      emptyText={t('Aucun partenaire trouvé')}
      searchValue={search}
      onSearchChange={setSearch}
      searchPlaceholder={t('Rechercher un partenaire…')}
      renderFilters={() => <div className="grid gap-3 p-4 sm:grid-cols-2">
        <label className="text-xs font-medium text-gray-700"><span className="mb-1 flex items-center gap-1"><FiFilter /> {t('Type')}</span><select value={filterType} onChange={(event) => setFilterType(event.target.value)} className="h-9 w-full rounded border border-gray-300 bg-white px-2 text-sm"><option value="">{t('Tous les types')}</option>{PARTNER_TYPES.map((type) => <option key={type.value} value={type.value}>{t(type.label)}</option>)}</select></label>
        <label className="text-xs font-medium text-gray-700">{t('Statut')}<select value={filterStatus} onChange={(event) => setFilterStatus(event.target.value)} className="mt-1 h-9 w-full rounded border border-gray-300 bg-white px-2 text-sm"><option value="">{t('Tous les statuts')}</option><option value="true">{t('Actifs')}</option><option value="false">{t('Inactifs')}</option></select></label>
      </div>}
      primaryAction={canCreate ? { label: t('Nouveau partenaire'), onClick: () => navigate('/partners/create') } : null}
      trailingActions={[{ id: 'refresh', label: t('Actualiser'), title: t('Actualiser'), variant: 'default', onClick: fetchPartners }]}
      onRowOpen={(partner) => navigate(`/partners/${partner.id}`)}
      pageSizeOptions={[15, 25, 50, 100]}
      defaultVisibleColumnIds={columns.map((column) => column.id)}
      showHistoryNavigation={false}
      pullToHeader={0}
    />
  );
}
