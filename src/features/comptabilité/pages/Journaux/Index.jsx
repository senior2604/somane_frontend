import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiCheck,
  FiCreditCard,
  FiDollarSign,
  FiPlus,
  FiXCircle,
} from 'react-icons/fi';
import UnifiedIndexPage from '../../../../components/UnifiedIndexPage';
import { useEntity } from '../../../../context/EntityContext';
import { apiClient } from '../../../../services/apiClient';

const JOURNALS_MEMORY_KEY = 'comptabilite:journaux:index:v3';
const DEFAULT_VISIBLE_COLUMN_IDS = [
  'code',
  'nom',
  'type',
  'compte',
  'banque',
  'statut',
];

const normalizeApiResponse = (response) => {
  const data = response?.data ?? response;
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.results)) return data.results;
  if (Array.isArray(data.items)) return data.items;
  if (Array.isArray(data.data)) return data.data;
  return [];
};

const getErrorMessage = (error, fallback) => {
  const payload = error?.response?.data;
  if (typeof payload === 'string' && payload.trim()) return payload;
  if (payload?.detail) return payload.detail;
  if (payload && typeof payload === 'object') {
    const firstEntry = Object.entries(payload)[0];
    if (firstEntry) {
      const [field, value] = firstEntry;
      const message = Array.isArray(value) ? value.join(' ') : String(value);
      return `${field} : ${message}`;
    }
  }
  return error?.message || fallback;
};

const getTypeCode = (journal) => (
  journal?.type?.code
  || journal?.type_code
  || journal?.journal_type?.code
  || ''
);

const getTypeName = (journal) => (
  journal?.type?.name
  || journal?.type?.nom
  || journal?.type_name
  || journal?.journal_type?.name
  || ''
);

const isBankType = (journal) => {
  const code = getTypeCode(journal).toUpperCase();
  return ['BQ', 'BN', 'BAN', 'BANK', 'BANQUE'].includes(code)
    || code.startsWith('BQ')
    || code.startsWith('BN');
};

const isCashType = (journal) => {
  const code = getTypeCode(journal).toUpperCase();
  return ['CA', 'CS', 'CAI', 'CAISSE'].includes(code)
    || code.startsWith('CA')
    || code.startsWith('CS');
};

const getDefaultAccount = (journal) => {
  const account = journal?.default_account_details
    || journal?.default_account
    || journal?.account_details
    || null;

  if (account && typeof account === 'object') return account;

  const code = journal?.default_account_code || journal?.default_account_id_label || '';
  if (!code) return null;
  return {
    code,
    name: journal?.default_account_name || '',
  };
};

const getDefaultAccountId = (journal) => {
  const account = journal?.default_account_details
    || journal?.default_account
    || journal?.account_details
    || null;

  if (account && typeof account === 'object') {
    return account.id || account.pk || null;
  }
  return journal?.default_account_id
    || journal?.account_id
    || account
    || null;
};

const getBankAccountLabel = (journal) => {
  const bankAccount = journal?.bank_account_details
    || journal?.bank_account
    || journal?.compte_bancaire
    || null;

  if (!bankAccount || typeof bankAccount !== 'object') {
    return journal?.bank_account_label || journal?.bank_account_id_label || '';
  }

  const bank = bankAccount.banque_details || bankAccount.banque || {};
  const bankName = bank.nom
    || bank.name
    || bank.raison_sociale
    || bankAccount.banque_nom
    || bankAccount.nom_banque
    || bankAccount.nom
    || bankAccount.name
    || '';
  const accountNumber = bankAccount.numero_compte
    || bankAccount.account_number
    || bankAccount.number
    || '';
  const partnerName = bankAccount.partenaire?.nom
    || bankAccount.partenaire_nom
    || '';

  return [
    bankName,
    accountNumber,
    partnerName ? `(${partnerName})` : '',
  ].filter(Boolean).join(' - ').replace(' - (', ' (');
};

const StateBadge = ({ active }) => (
  <span
    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
      active
        ? 'bg-green-100 text-green-700'
        : 'bg-gray-100 text-gray-700'
    }`}
  >
    {active ? <FiCheck size={11} /> : <FiXCircle size={11} />}
    {active ? 'Actif' : 'Inactif'}
  </span>
);

const TypeDisplay = ({ journal }) => (
  <div
    className="flex min-w-0 items-center gap-1.5 overflow-hidden whitespace-nowrap"
    title={[getTypeCode(journal), getTypeName(journal)].filter(Boolean).join(' - ')}
  >
    {isBankType(journal) && <FiCreditCard className="shrink-0 text-blue-600" size={13} />}
    {isCashType(journal) && <FiDollarSign className="shrink-0 text-green-600" size={13} />}
    <span className="shrink-0 font-medium text-gray-800">{getTypeCode(journal) || '-'}</span>
    {getTypeName(journal) && (
      <span className="truncate text-gray-500">{getTypeName(journal)}</span>
    )}
  </div>
);

const AccountDisplay = ({ journal, onOpen }) => {
  const account = getDefaultAccount(journal);
  if (!account) return <span className="text-xs italic text-gray-400">Non défini</span>;

  const accountId = getDefaultAccountId(journal);
  const accountCode = account.code || account.numero || '-';
  const accountName = account.name || account.nom || '';

  if (accountId) {
    return (
      <div
        className="flex min-w-0 max-w-full items-center gap-1.5 overflow-hidden whitespace-nowrap"
        title={`${accountCode} - ${accountName}`}
      >
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onOpen(accountId);
          }}
          onDoubleClick={(event) => event.stopPropagation()}
          className="shrink-0 font-mono text-xs font-semibold text-teal-700 transition-colors hover:text-purple-700 hover:underline"
          title={`Ouvrir le compte ${accountCode}`}
        >
          {accountCode}
        </button>
        <span className="truncate text-gray-500">{accountName}</span>
      </div>
    );
  }

  return (
    <div
      className="flex min-w-0 items-center gap-1.5 overflow-hidden whitespace-nowrap"
      title={[accountCode, accountName].filter(Boolean).join(' - ')}
    >
      <span className="shrink-0 font-mono text-xs font-semibold text-violet-700">{accountCode}</span>
      <span className="truncate text-gray-500">{accountName}</span>
    </div>
  );
};

const BankDisplay = ({ journal }) => {
  if (!isBankType(journal)) return <span className="text-gray-400">-</span>;
  const label = getBankAccountLabel(journal);
  if (!label) return <span className="text-xs italic text-gray-400">Non défini</span>;
  return <span className="block truncate" title={label}>{label}</span>;
};

const JOURNALS_INDEX_CACHE_DURATION = 5 * 60 * 1000;
const journalsIndexCache = new Map();

const getCachedJournalsIndex = entityId => {
  const cached = journalsIndexCache.get(String(entityId || ''));
  if (!cached || Date.now() - cached.loadedAt >= JOURNALS_INDEX_CACHE_DURATION) return null;
  return cached;
};

export default function JournauxPage() {
  const navigate = useNavigate();
  const { activeEntity, entities = [] } = useEntity();

  const initialCache = getCachedJournalsIndex(activeEntity?.id);

  const [journals, setJournals] = useState(initialCache?.journals || []);
  const [journalTypes, setJournalTypes] = useState(initialCache?.types || []);
  const [loading, setLoading] = useState(!initialCache);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [activeFilters, setActiveFilters] = useState([]);
  const [visibleColumnIds, setVisibleColumnIds] = useState(DEFAULT_VISIBLE_COLUMN_IDS);
  const [entityId, setEntityId] = useState(activeEntity?.id || '');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  useEffect(() => {
    if (activeEntity?.id) setEntityId(activeEntity.id);
  }, [activeEntity?.id]);

  const loadData = useCallback(async (targetEntityId) => {
    if (!targetEntityId) {
      setJournals([]);
      setLoading(false);
      setError('Veuillez sélectionner une entité pour afficher les journaux.');
      return;
    }

    const cachedData = getCachedJournalsIndex(targetEntityId);
    if (cachedData) {
      setJournals(cachedData.journals);
      setJournalTypes(cachedData.types);
      setLoading(false);
    } else {
      setLoading(true);
    }

    try {
      setError('');
      const [journalsResponse, typesResponse] = await Promise.all([
        apiClient.get(`/compta/journals/?company_id=${targetEntityId}`),
        apiClient.get('/compta/journal-types/'),
      ]);

      const types = normalizeApiResponse(typesResponse);
      const typesById = new Map(types.map((type) => [String(type.id), type]));
      const enrichedJournals = normalizeApiResponse(journalsResponse).map((journal) => {
        const currentType = journal.type && typeof journal.type === 'object'
          ? journal.type
          : typesById.get(String(journal.type || journal.type_id || ''));

        return {
          ...journal,
          type: currentType || {
            id: journal.type || journal.type_id,
            code: journal.type_code || '',
            name: journal.type_name || 'Type inconnu',
          },
        };
      });

      setJournalTypes(types);
      setJournals(enrichedJournals);
      journalsIndexCache.set(String(targetEntityId), {
        journals: enrichedJournals,
        types,
        loadedAt: Date.now(),
      });
      setSelectedIds([]);
    } catch (requestError) {
      if (!cachedData) {
        setJournals([]);
        setError(getErrorMessage(requestError, 'Impossible de charger les journaux.'));
      } else {
        console.warn('Actualisation silencieuse des journaux impossible:', requestError);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData(entityId);
  }, [entityId, loadData]);

  const addFilter = useCallback((field, value, label) => {
    setActiveFilters((current) => [
      ...current.filter((filter) => filter.field !== field),
      { id: `${field}:${value}`, field, value: String(value), label },
    ]);
    setCurrentPage(1);
  }, []);

  const removeFilter = useCallback((filterToRemove) => {
    setActiveFilters((current) => current.filter((filter) => filter.id !== filterToRemove.id));
    setCurrentPage(1);
  }, []);

  const filteredJournals = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('fr');

    return journals.filter((journal) => {
      const matchesSearch = !query || [
        journal.code,
        journal.name,
        journal.email,
        getTypeCode(journal),
        getTypeName(journal),
        getDefaultAccount(journal)?.code,
        getDefaultAccount(journal)?.name,
        getBankAccountLabel(journal),
      ].filter(Boolean).join(' ').toLocaleLowerCase('fr').includes(query);

      if (!matchesSearch) return false;

      return activeFilters.every((filter) => {
        if (filter.field === 'status') {
          return String(Boolean(journal.active)) === filter.value;
        }
        if (filter.field === 'type') {
          return String(journal.type?.id || journal.type_id || '') === filter.value
            || getTypeCode(journal) === filter.value;
        }
        return true;
      });
    });
  }, [activeFilters, journals, search]);

  const runBulkUpdate = useCallback(async (payload, successMessage) => {
    if (!selectedIds.length) return;
    try {
      setError('');
      await Promise.all(selectedIds.map((id) => (
        apiClient.patch(`/compta/journals/${id}/`, payload)
      )));
      setSuccess(successMessage);
      setSelectedIds([]);
      await loadData(entityId, true);
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Impossible de modifier les journaux sélectionnés.'));
    }
  }, [entityId, loadData, selectedIds]);

  const handleBulkDelete = useCallback(async () => {
    if (!selectedIds.length) return;
    const confirmed = window.confirm(
      `Supprimer ${selectedIds.length} journal${selectedIds.length > 1 ? 'aux' : ''} ?`,
    );
    if (!confirmed) return;

    try {
      setError('');
      await Promise.all(selectedIds.map((id) => apiClient.delete(`/compta/journals/${id}/`)));
      setSuccess(`${selectedIds.length} journal(aux) supprime(s).`);
      setSelectedIds([]);
      await loadData(entityId, true);
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Impossible de supprimer les journaux sélectionnés.'));
    }
  }, [entityId, loadData, selectedIds]);

  const columns = useMemo(() => [
    {
      id: 'code',
      label: 'Préfixe',
      minWidth: 90,
      value: (journal) => journal.code || '',
      render: (_, journal) => (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            navigate(`/comptabilite/journaux/${journal.id}`, {
              state: { journalRecord: journal },
            });
          }}
          onDoubleClick={(event) => event.stopPropagation()}
          className="block w-full truncate text-left font-mono font-semibold text-teal-700 hover:text-purple-700 hover:underline"
          title={`Ouvrir le journal ${journal.code || ''}`}
        >
          {journal.code || '-'}
        </button>
      ),
    },
    {
      id: 'nom',
      label: 'Nom',
      value: (journal) => journal.name || '',
      render: (_, journal) => (
        <div
          className="truncate font-medium text-gray-900"
          title={[journal.name, journal.email].filter(Boolean).join(' - ')}
        >
          {journal.name || '-'}
        </div>
      ),
    },
    {
      id: 'type',
      label: 'Type',
      value: (journal) => `${getTypeCode(journal)} ${getTypeName(journal)}`,
      sortValue: (journal) => getTypeName(journal),
      render: (_, journal) => <TypeDisplay journal={journal} />,
    },
    {
      id: 'compte',
      label: 'Compte par défaut',
      minWidth: 130,
      value: (journal) => {
        const account = getDefaultAccount(journal);
        return account ? `${account.code || ''} ${account.name || account.nom || ''}` : '';
      },
      sortValue: (journal) => getDefaultAccount(journal)?.code || '',
      render: (_, journal) => (
        <AccountDisplay
          journal={journal}
          onOpen={(accountId) => navigate(`/comptabilite/accounts/${accountId}`)}
        />
      ),
    },
    {
      id: 'banque',
      label: 'Infos bancaires',
      value: (journal) => getBankAccountLabel(journal),
      render: (_, journal) => <BankDisplay journal={journal} />,
    },
    {
      id: 'statut',
      label: 'Statut',
      width: 82,
      value: (journal) => (journal.active ? 'Actif' : 'Inactif'),
      sortValue: (journal) => (journal.active ? 1 : 0),
      render: (_, journal) => <StateBadge active={journal.active} />,
    },
  ], [navigate]);

  const filterChips = useMemo(() => activeFilters.map((filter) => ({
    id: filter.id,
    label: filter.label,
    source: filter,
  })), [activeFilters]);

  const renderFilters = useCallback(({ close }) => (
    <div className="grid grid-cols-1 text-xs text-gray-700 md:grid-cols-[minmax(220px,0.8fr)_minmax(360px,1.4fr)]">
      <div className="border-b border-gray-200 p-3 md:border-b-0 md:border-r">
        <p className="mb-2 font-semibold text-gray-800">Ajouter un filtre</p>
        <div className="space-y-1">
          {[
            { value: 'true', label: 'Actifs' },
            { value: 'false', label: 'Inactifs' },
          ].map((option) => {
            const selected = activeFilters.some(
              (filter) => filter.field === 'status' && filter.value === option.value,
            );
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => addFilter('status', option.value, option.label)}
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left hover:bg-gray-100"
              >
                <span className="w-4 font-semibold text-purple-600">{selected ? '✓' : ''}</span>
                <span>{option.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="p-3">
        <p className="mb-2 font-semibold text-gray-800">Type de journal</p>
        <div className="max-h-52 space-y-1 overflow-y-auto">
          {journalTypes.map((type) => {
            const value = String(type.id || type.code);
            const selected = activeFilters.some(
              (filter) => filter.field === 'type' && filter.value === value,
            );
            return (
              <button
                key={value}
                type="button"
                onClick={() => addFilter('type', value, type.name || type.nom || type.code)}
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left hover:bg-gray-100"
              >
                <span className="w-4 shrink-0 font-semibold text-purple-600">{selected ? '✓' : ''}</span>
                <span className="truncate">{type.name || type.nom || type.code}</span>
              </button>
            );
          })}
        </div>

        {entities.length > 1 && (
          <div className="mt-3 border-t border-gray-200 pt-3">
            <p className="mb-2 font-semibold text-gray-800">Entité</p>
            <div className="max-h-40 space-y-1 overflow-y-auto">
              {entities.map((entity) => (
                <button
                  key={entity.id}
                  type="button"
                  onClick={() => {
                    setEntityId(entity.id);
                    setSelectedIds([]);
                    setCurrentPage(1);
                  }}
                  className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left hover:bg-gray-100"
                >
                  <span className="w-4 shrink-0 font-semibold text-purple-600">
                    {String(entityId) === String(entity.id) ? '✓' : ''}
                  </span>
                  <span className="truncate">{entity.nom || entity.name || entity.raison_sociale}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {(activeFilters.length > 0 || search.trim()) && (
        <div className="border-t border-gray-200 p-3 md:col-span-2">
          <button
            type="button"
            onClick={() => {
              setActiveFilters([]);
              setSearch('');
              setCurrentPage(1);
              close();
            }}
            className="w-full rounded py-1.5 text-center text-red-600 hover:bg-red-50"
          >
            Effacer les filtres
          </button>
        </div>
      )}
    </div>
  ), [activeFilters, addFilter, entities, entityId, journalTypes, search]);

  const memoryState = useMemo(() => ({
    activeFilters,
    entityId,
  }), [activeFilters, entityId]);

  const restoreMemoryState = useCallback((customState, savedState) => {
    if (Array.isArray(customState?.activeFilters)) {
      setActiveFilters(customState.activeFilters);
    }
    if (customState?.entityId) setEntityId(customState.entityId);
    if (Array.isArray(savedState?.visibleColumnIds) && savedState.visibleColumnIds.length) {
      setVisibleColumnIds(savedState.visibleColumnIds);
    }
  }, []);

  const selectionActions = useMemo(() => [
    {
      id: 'activate',
      label: 'Activer',
      variant: 'success',
      onClick: () => runBulkUpdate({ active: true }, 'Journaux actives avec succes.'),
    },
    {
      id: 'deactivate',
      label: 'Désactiver',
      onClick: () => runBulkUpdate({ active: false }, 'Journaux désactivés avec succès.'),
    },
    {
      id: 'delete',
      label: 'Supprimer',
      variant: 'danger',
      onClick: handleBulkDelete,
    },
  ], [handleBulkDelete, runBulkUpdate]);

  const renderJournalRow = useCallback((journal, rowIndex, context) => {
    const selected = context.selectedRowKeys.includes(journal.id);

    return (
      <tr
        key={journal.id}
        className={`cursor-pointer border-b border-gray-200 transition-colors duration-150 ${
          selected
            ? 'bg-purple-50'
            : `${context.getStripeClassName(rowIndex)} hover:bg-purple-50/40`
        }`}
      >
        <td className="border-r border-gray-100 px-2 py-1.5 text-center">
          <input
            type="checkbox"
            checked={selected}
            onClick={(event) => {
              event.stopPropagation();
            }}
            onChange={() => context.toggleRow(journal.id)}
            className="h-3.5 w-3.5 cursor-pointer accent-teal-700"
            aria-label="Sélectionner ce journal"
          />
        </td>

        {context.columns.map((column) => {
          const value = typeof column.value === 'function'
            ? column.value(journal)
            : journal[column.dataIndex || column.id];
          const content = column.render
            ? column.render(value, journal, rowIndex)
            : (value ?? '-');
          const title = typeof value === 'string' || typeof value === 'number'
            ? String(value)
            : '';

          return (
            <td
              key={`${journal.id}-${column.id}`}
              title={title}
              className="max-w-0 border-r border-gray-100 px-2 py-1.5 text-left text-xs text-gray-700"
            >
              <div className="block min-w-0 truncate text-left">{content}</div>
            </td>
          );
        })}

        <td className="w-6 border-r border-gray-100 px-0.5 py-1.5" />
      </tr>
    );
  }, []);

  return (
    <UnifiedIndexPage
      title="Journaux Comptables"
      memoryKey={JOURNALS_MEMORY_KEY}
      memoryState={memoryState}
      onRestoreMemoryState={restoreMemoryState}
      rows={filteredJournals}
      rowKey="id"
      columns={columns}
      loading={loading}
      error={error}
      success={success}
      messageDuration={30000}
      onDismissError={() => setError('')}
      onDismissSuccess={() => setSuccess('')}
      emptyText="Aucun journal comptable"
      searchValue={search}
      onSearchChange={(value) => {
        setSearch(value);
        setCurrentPage(1);
      }}
      searchPlaceholder="Rechercher un journal..."
      filterChips={filterChips}
      onRemoveFilterChip={(chip) => removeFilter(chip.source)}
      renderFilters={renderFilters}
      filterPanelWidth={720}
      primaryAction={{
        label: 'Nouveau journal',
        icon: <FiPlus size={14} />,
        onClick: () => navigate('/comptabilite/journaux/create'),
      }}
      selectedRowKeys={selectedIds}
      onSelectionChange={(keys) => setSelectedIds(keys)}
      selectionActions={selectionActions}
      renderSelectionSummary={() => (
        <span>{selectedIds.length} journal(aux) sélectionné(s)</span>
      )}
      onRowOpen={(journal) => navigate(`/comptabilite/journaux/${journal.id}`, {
        state: { journalRecord: journal },
      })}
      renderRow={renderJournalRow}
      page={currentPage}
      onPageChange={setCurrentPage}
      pageSize={pageSize}
      onPageSizeChange={setPageSize}
      pageSizeOptions={[25, 50, 100, 200]}
      visibleColumnIds={visibleColumnIds}
      defaultVisibleColumnIds={DEFAULT_VISIBLE_COLUMN_IDS}
      onVisibleColumnsChange={setVisibleColumnIds}
      defaultSortColumn="code"
      defaultSortDirection="asc"
    />
  );
}
