// C:\python\django\somane_frontend\src\pages\Partners\List.jsx

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiAlertCircle,
  FiEdit2,
  FiEye,
  FiFilter,
  FiPlus,
  FiRefreshCw,
  FiTrash2,
} from 'react-icons/fi';

import { apiClient } from '../../services/apiClient';
import { useEntity } from '../../context/EntityContext';
import { useUi } from '../../context/UiContext';
import { useLanguage } from '../../context/LanguageContext';
import { can } from '../../services/securityAccess';
import { getConfiguredModelView } from '../../services/metadataViews';
import MetadataFieldDisplay from '../../components/MetadataFieldDisplay';
import UnifiedIndexPage from '../../components/UnifiedIndexPage';
import SomaneSelect from '../../components/SomaneSelect';
import {
  PARTNER_TYPES,
  getPartnerName,
  parseResponse,
} from './PartnerShared';

export default function PartnersList() {
  const navigate = useNavigate();
  const { activeEntity } = useEntity();
  const { security, configuration } = useUi();
  const { t } = useLanguage();

  const configuredList = useMemo(
    () =>
      getConfiguredModelView(configuration, 'core.Partenaire', 'list', {
        preferredViewKey: 'somane_ui.partners_list',
      }),
    [configuration],
  );

  const listFields = useMemo(() => {
    const fields = configuredList?.fields?.length
      ? configuredList.fields.filter((field) => !field.invisible)
      : [
          { name: 'nom', label: t('Partenaire'), type: 'char' },
          { name: 'type_partenaire', label: t('Type'), type: 'char' },
          { name: 'is_company', label: t('Société'), type: 'boolean' },
          { name: 'telephone', label: t('Téléphone'), type: 'char' },
          { name: 'email', label: t('E-mail'), type: 'char' },
          { name: 'statut', label: t('Actif'), type: 'boolean' },
        ];

    if (fields.some((field) => field.name === 'nom')) {
      return fields;
    }

    return [
      { name: 'nom', label: t('Partenaire'), type: 'char' },
      ...fields,
    ];
  }, [configuredList, t]);

  const getPartnerFieldValue = useCallback((partner, fieldName) => {
    if (fieldName === 'nom') {
      return getPartnerName(partner);
    }

    if (fieldName === 'pays') {
      return partner.pays_details || partner.pays;
    }

    if (fieldName === 'ville') {
      return (
        partner.ville_details ||
        partner.ville_legacy ||
        partner.ville
      );
    }

    return partner[fieldName];
  }, []);

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

      setPartners(
        data.filter(
          (partner) =>
            !partner.company ||
            partner.company === activeEntity.id ||
            partner.company?.id === activeEntity.id,
        ),
      );
    } catch (err) {
      setError(
        err?.response?.data?.detail ||
          err?.message ||
          t('Impossible de charger les partenaires'),
      );
    } finally {
      setLoading(false);
    }
  }, [activeEntity, t]);

  useEffect(() => {
    fetchPartners();
  }, [fetchPartners]);

  const filteredPartners = useMemo(() => {
    const needle = search.trim().toLowerCase();

    return partners.filter((partner) => {
      const text = [
        partner.nom,
        partner.raison_sociale,
        partner.name,
        partner.email,
        partner.telephone,
        partner.numero_fiscal,
        partner.registre_commerce,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      const matchSearch = !needle || text.includes(needle);
      const matchType =
        !filterType || partner.type_partenaire === filterType;
      const matchStatus =
        !filterStatus ||
        String(Boolean(partner.statut)) === filterStatus;

      return matchSearch && matchType && matchStatus;
    });
  }, [partners, search, filterType, filterStatus]);

  const stats = useMemo(
    () => ({
      total: partners.length,
      actifs: partners.filter((partner) => Boolean(partner.statut)).length,
      avecCompte: partners.filter(
        (partner) => Boolean(partner.utilisateur_details),
      ).length,
    }),
    [partners],
  );

  const deletePartner = useCallback(
    async (partner) => {
      if (!window.confirm(`${t('Supprimer')} "${getPartnerName(partner)}" ?`)) {
        return;
      }

      try {
        await apiClient.delete(`/partenaires/${partner.id}/`);
        await fetchPartners();
      } catch (err) {
        setError(
          err?.response?.data?.detail ||
            err?.message ||
            t('Suppression impossible'),
        );
      }
    },
    [fetchPartners, t],
  );

  const columns = useMemo(() => {
    const configuredColumns = listFields.map((field) => ({
      id: field.name,
      label:
        field.name === 'nom'
          ? t('Partenaire')
          : t(field.label || field.name),

      value: (partner) =>
        getPartnerFieldValue(partner, field.name),

      render: (value, partner) => {
        if (field.name === 'nom') {
          return (
            <div className="min-w-0">
              <div className="truncate font-medium text-gray-900">
                <MetadataFieldDisplay
                  value={value}
                  field={field}
                  record={partner}
                />
              </div>
              <div className="text-[10px] text-gray-500">
                ID : {partner.id}
              </div>
            </div>
          );
        }

        if (
          field.name === 'statut' ||
          field.name === 'is_company'
        ) {
          return (
            <span
              className={`inline-flex rounded px-2 py-0.5 ${
                Boolean(value)
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              <MetadataFieldDisplay
                value={Boolean(value)}
                field={field}
                record={partner}
              />
            </span>
          );
        }

        return (
          <MetadataFieldDisplay
            value={value}
            field={field}
            record={partner}
          />
        );
      },
    }));

    // Ajouter la colonne du compte utilisateur sans remplacer
    // les colonnes définies par les métadonnées.
    if (!configuredColumns.some((column) => column.id === 'compte_utilisateur')) {
      configuredColumns.push({
        id: 'compte_utilisateur',
        label: t('Compte utilisateur'),
        value: (partner) => partner.utilisateur_details,
        render: (_, partner) =>
          partner.utilisateur_details ? (
            <span className="inline-flex rounded border border-green-200 bg-green-50 px-2 py-1 text-xs text-green-700">
              {t('Compte créé')}
            </span>
          ) : (
            <span className="inline-flex rounded border border-gray-200 bg-gray-50 px-2 py-1 text-xs text-gray-600">
              {t('Aucun compte')}
            </span>
          ),
      });
    }

    configuredColumns.push({
      id: 'actions',
      label: t('Actions'),
      sortable: false,
      render: (_, partner) => (
        <div className="flex items-center justify-center gap-1">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              navigate(`/partners/${partner.id}`);
            }}
            className="rounded p-1 text-blue-600 hover:bg-blue-50"
            title={t('Afficher')}
            aria-label={t('Afficher')}
          >
            <FiEye size={14} />
          </button>

          {canWrite && (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                navigate(`/partners/${partner.id}?edit=1`);
              }}
              className="rounded p-1 text-violet-700 hover:bg-violet-50"
              title={t('Modifier')}
              aria-label={t('Modifier')}
            >
              <FiEdit2 size={14} />
            </button>
          )}

          {canDelete && (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                void deletePartner(partner);
              }}
              className="rounded p-1 text-red-600 hover:bg-red-50"
              title={t('Supprimer')}
              aria-label={t('Supprimer')}
            >
              <FiTrash2 size={14} />
            </button>
          )}
        </div>
      ),
    });

    return configuredColumns;
  }, [
    listFields,
    getPartnerFieldValue,
    canWrite,
    canDelete,
    deletePartner,
    navigate,
    t,
  ]);

  return (
    <UnifiedIndexPage
      title={t('Partenaires')}
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
      renderFilters={() => (
        <div className="space-y-3 p-4">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
            <span>
              {stats.total} {t('partenaire(s)')}
            </span>
            <span>
              {stats.actifs} {t('actif(s)')}
            </span>
            <span>
              {stats.avecCompte} {t('compte(s) utilisateur')}
            </span>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              <FiAlertCircle size={14} />
              <span>{error}</span>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-medium text-gray-700">
              <span className="mb-1 flex items-center gap-1">
                <FiFilter />
                {t('Type')}
              </span>

              <SomaneSelect
                value={filterType}
                onChange={(event) => setFilterType(event.target.value)}
                className="h-9 w-full rounded border border-gray-300 bg-white px-2 text-sm"
              >
                <option value="">{t('Tous les types')}</option>
                {PARTNER_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {t(type.label)}
                  </option>
                ))}
              </SomaneSelect>
            </label>

            <label className="text-xs font-medium text-gray-700">
              <span className="mb-1 block">{t('Statut')}</span>

              <SomaneSelect
                value={filterStatus}
                onChange={(event) => setFilterStatus(event.target.value)}
                className="h-9 w-full rounded border border-gray-300 bg-white px-2 text-sm"
              >
                <option value="">{t('Tous les statuts')}</option>
                <option value="true">{t('Actifs')}</option>
                <option value="false">{t('Inactifs')}</option>
              </SomaneSelect>
            </label>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => void fetchPartners()}
              disabled={loading}
              className="inline-flex h-8 items-center gap-2 rounded border border-gray-300 px-3 text-xs hover:bg-gray-50 disabled:opacity-50"
            >
              <FiRefreshCw size={13} />
              {t('Actualiser')}
            </button>
          </div>
        </div>
      )}
      primaryAction={
        canCreate
          ? {
              label: t('Nouveau partenaire'),
              onClick: () => navigate('/partners/create'),
              icon: <FiPlus size={14} />,
            }
          : null
      }
      trailingActions={[]}
      onRowOpen={(partner) => navigate(`/partners/${partner.id}`)}
      pageSizeOptions={[15, 25, 50, 100]}
      defaultVisibleColumnIds={columns.map((column) => column.id)}
      showHistoryNavigation={false}
      pullToHeader={0}
    />
  );
}
