// src/features/comptabilite/pages/groups/GroupDetail.jsx
import { DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { Modal, Spin } from 'antd';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { FiInfo, FiPlus, FiSettings } from 'react-icons/fi';
import { useLocation, useNavigate, useParams } from 'react-router-dom';

import UnifiedFormPage from '../../../../components/UnifiedFormPage';
import useGroupStore from '../../../../stores/comptabilite/groupStore';

const { confirm } = Modal;

const relationId = (value) => {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'object') return value.id ?? value.value ?? null;
  return value;
};

const relationLabel = (value, fallback = '-') => {
  if (value === null || value === undefined || value === '') return fallback;
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  return [value.code, value.name, value.label, value.display_name].filter(Boolean).join(' - ') || fallback;
};

const normalizeList = (value) => (Array.isArray(value) ? value : []);

const formatDateTime = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString('fr-FR');
};

const DetailField = ({ label, children }) => (
  <div className="grid min-h-[30px] grid-cols-[150px_minmax(0,1fr)] items-center border-b border-gray-200 last:border-b-0">
    <div className="px-3 py-2 text-xs font-semibold text-gray-700">{label}</div>
    <div className="min-w-0 border-l border-gray-200 px-3 py-2 text-xs text-gray-900">{children}</div>
  </div>
);

const Badge = ({ children, tone = 'gray' }) => {
  const tones = {
    gray: 'bg-gray-100 text-gray-700',
    purple: 'bg-purple-100 text-purple-700',
    green: 'bg-emerald-100 text-emerald-700',
  };
  return <span className={`inline-flex px-2 py-1 text-[11px] font-medium ${tones[tone]}`}>{children}</span>;
};

export default function GroupDetail() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const { fetchGroupById, fetchGroups, groups = [], deleteGroup } = useGroupStore();

  const cachedGroup = useMemo(() => {
    const candidate = location.state?.groupRecord;
    return candidate && String(candidate.id) === String(id) ? candidate : null;
  }, [id, location.state]);

  const [group, setGroup] = useState(cachedGroup);
  const [loading, setLoading] = useState(!cachedGroup);
  const [activeTab, setActiveTab] = useState('information');
  const [actionsOpen, setActionsOpen] = useState(false);
  const [traceabilityOpen, setTraceabilityOpen] = useState(true);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      if (!cachedGroup) setLoading(true);
      try {
        const freshGroup = await fetchGroupById(id);
        if (!active || !freshGroup) return;
        setGroup(freshGroup);
        const frameworkId = relationId(freshGroup.framework);
        if (frameworkId) {
          sessionStorage.setItem('group_list_selected_framework', String(frameworkId));
          fetchGroups({ framework: frameworkId }).catch(() => {});
        }
      } catch (error) {
        if (!active) return;
        setFeedback({
          type: cachedGroup ? 'warning' : 'error',
          message: cachedGroup
            ? 'La classe est affichée depuis la liste, mais sa synchronisation a échoué.'
            : 'Impossible de charger cette classe.',
        });
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => { active = false; };
  }, [cachedGroup, fetchGroupById, fetchGroups, id]);

  const frameworkId = relationId(group?.framework) || location.state?.frameworkId || null;
  const scopedGroups = useMemo(() => groups.filter((item) => {
    const itemFramework = relationId(item.framework) ?? item.framework_id;
    return !frameworkId || !itemFramework || String(itemFramework) === String(frameworkId);
  }), [frameworkId, groups]);

  const parentId = relationId(group?.parent);
  const parent = useMemo(
    () => scopedGroups.find((item) => String(item.id) === String(parentId)),
    [parentId, scopedGroups],
  );
  const children = useMemo(
    () => scopedGroups.filter((item) => String(relationId(item.parent)) === String(group?.id)),
    [group?.id, scopedGroups],
  );
  const excludedAccounts = normalizeList(group?.excluded_accounts_detail);
  const companies = normalizeList(group?.company_detail?.length ? group.company_detail : group?.company);
  const isLeaf = children.length === 0;
  const listPath = frameworkId ? `/comptabilite/groups?framework=${frameworkId}` : '/comptabilite/groups';

  const traceabilityLogs = useMemo(() => [
    {
      id: 'creation',
      title: 'Création de la classe',
      date: group?.created_at || group?.create_date,
      user: group?.created_by_name || group?.create_uid_label || group?.created_by,
    },
    {
      id: 'update',
      title: 'Dernière modification',
      date: group?.updated_at || group?.write_date,
      user: group?.updated_by_name || group?.write_uid_label || group?.updated_by,
    },
  ].filter((item) => item.date || item.user), [group]);

  const handleDelete = useCallback(() => {
    confirm({
      title: 'Supprimer cette classe ?',
      content: `La classe ${[group?.code, group?.name].filter(Boolean).join(' - ')} sera supprimée définitivement.`,
      okText: 'Supprimer',
      okType: 'danger',
      cancelText: 'Annuler',
      onOk: async () => {
        try {
          await deleteGroup(id);
          navigate(listPath, { state: { restoredFromSmartBack: true, refreshGroups: true } });
        } catch (error) {
          setFeedback({ type: 'error', message: error?.response?.data?.detail || 'Erreur lors de la suppression.' });
        }
      },
    });
  }, [deleteGroup, group, id, listPath, navigate]);

  const traceabilityContent = (
    <div className="p-3">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-medium text-gray-700">Activité liée à cette classe</span>
        <span className="text-[11px] text-gray-500">{traceabilityLogs.length} événement(s)</span>
      </div>
      {traceabilityLogs.length ? traceabilityLogs.map((log) => (
        <div key={log.id} className="mb-2 border border-gray-200 bg-white px-3 py-2 last:mb-0">
          <div className="text-xs font-semibold text-gray-900">{log.title}</div>
          <div className="mt-1 text-[11px] text-gray-600">{[group?.code, group?.name].filter(Boolean).join(' - ')}</div>
          <div className="mt-1 text-[11px] text-gray-500">Par {relationLabel(log.user, 'Utilisateur')}</div>
          <div className="text-[11px] text-gray-400">{formatDateTime(log.date)}</div>
        </div>
      )) : (
        <div className="border border-gray-200 bg-white p-5 text-center text-xs text-gray-500">
          Aucune traçabilité disponible pour cette classe.
        </div>
      )}
    </div>
  );

  const actionsMenu = group ? (
    <div className="relative">
      <button
        type="button"
        onClick={() => setActionsOpen((open) => !open)}
        className="flex h-8 items-center gap-1 border border-gray-300 px-3 text-xs text-gray-700 transition-all hover:border-purple-500 hover:bg-purple-50 hover:text-purple-700"
      >
        <FiSettings size={12} /> Actions
      </button>
      {actionsOpen && (
        <div className="absolute right-0 top-full z-50 mt-1 w-56 border border-gray-300 bg-white shadow-lg">
          <button type="button" onClick={() => navigate(`/comptabilite/groups/${id}/edit`, { state: { groupRecord: group, frameworkId, returnTo: location.pathname } })} className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-purple-50">
            <EditOutlined /> Modifier
          </button>
          <button type="button" onClick={() => navigate('/comptabilite/groups/new', { state: { frameworkId, parentId: group.id, returnTo: location.pathname } })} className="flex w-full items-center gap-2 border-t border-gray-100 px-3 py-2 text-left text-xs hover:bg-purple-50">
            <FiPlus size={12} /> Ajouter une sous-classe
          </button>
          <button type="button" onClick={() => { setTraceabilityOpen((open) => !open); setActionsOpen(false); }} className="flex w-full items-center gap-2 border-t border-gray-100 px-3 py-2 text-left text-xs hover:bg-purple-50">
            <FiInfo size={12} /> {traceabilityOpen ? 'Masquer' : 'Afficher'} la traçabilité
          </button>
          <button type="button" onClick={handleDelete} className="flex w-full items-center gap-2 border-t border-gray-100 px-3 py-2 text-left text-xs text-red-600 hover:bg-red-50">
            <DeleteOutlined /> Supprimer
          </button>
        </div>
      )}
    </div>
  ) : null;

  if (loading && !group) {
    return <div className="flex h-full items-center justify-center bg-white"><Spin size="large" tip="Chargement de la classe..." /></div>;
  }

  return (
    <UnifiedFormPage
      title="Classes / Groupes"
      recordLabel={[group?.code, group?.name].filter(Boolean).join(' - ') || 'Classe introuvable'}
      pageLabel="Détail d’une classe comptable"
      mode="show"
      fallbackPath={listPath}
      primaryAction={{ label: 'Nouveau', icon: <FiPlus size={12} />, path: '/comptabilite/groups/new', state: { frameworkId } }}
      headerActions={group ? [{
        id: 'edit',
        label: 'Modifier',
        icon: <EditOutlined />,
        path: `/comptabilite/groups/${id}/edit`,
        state: { groupRecord: group, frameworkId },
      }] : []}
      actionsMenu={actionsMenu}
      feedback={feedback}
      onDismissFeedback={() => setFeedback(null)}
      messageDuration={15000}
      traceability={group ? {
        open: traceabilityOpen,
        onOpen: () => setTraceabilityOpen(true),
        onClose: () => setTraceabilityOpen(false),
        title: 'Traçabilité',
        content: traceabilityContent,
      } : undefined}
      noContext={!group ? <div className="text-center text-sm text-gray-500">Cette classe est introuvable.</div> : undefined}
    >
      {group && (
        <div className="min-h-full bg-white">
          <div className="flex items-center justify-between border-b border-gray-300 px-4 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={isLeaf ? 'gray' : 'purple'}>{isLeaf ? 'Feuille' : 'Groupe'}</Badge>
              <Badge tone="purple">{group.framework_name || `Plan #${frameworkId}`}</Badge>
              <Badge tone="green">{children.length} sous-classe(s)</Badge>
            </div>
            <div className="text-xs text-gray-500">
              Plage : {[group.code_prefix_start, group.code_prefix_end].filter(Boolean).join(' à ') || '-'}
            </div>
          </div>

          <div className="flex border-b border-gray-300 px-4">
            {[
              ['information', 'Informations'],
              ['children', 'Sous-classes'],
              ['excluded', 'Exclusions'],
              ['notes', 'Notes'],
            ].map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setActiveTab(key)}
                className={`border-b-2 px-4 py-2 text-xs font-medium transition-colors ${activeTab === key ? 'border-purple-600 text-purple-700' : 'border-transparent text-gray-500 hover:text-purple-700'}`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="p-4">
            {activeTab === 'information' && (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div className="border border-gray-300">
                  <DetailField label="Code">{group.code || '-'}</DetailField>
                  <DetailField label="Nom">{group.name || '-'}</DetailField>
                  <DetailField label="Séquence">{group.sequence ?? 0}</DetailField>
                  <DetailField label="Plan comptable">{group.framework_name || `Plan #${frameworkId}`}</DetailField>
                </div>
                <div className="border border-gray-300">
                  <DetailField label="Classe parente">
                    {parent ? (
                      <button type="button" onClick={() => navigate(`/comptabilite/groups/${parent.id}`, { state: { groupRecord: parent, frameworkId, returnTo: location.pathname } })} className="text-purple-700 hover:underline">
                        {parent.code} - {parent.name}
                      </button>
                    ) : 'Racine'}
                  </DetailField>
                  <DetailField label="Début de plage">{group.code_prefix_start || '-'}</DetailField>
                  <DetailField label="Fin de plage">{group.code_prefix_end || '-'}</DetailField>
                  <DetailField label="Sociétés">{companies.length ? companies.map((company) => relationLabel(company)).join(', ') : 'Toutes'}</DetailField>
                </div>
              </div>
            )}

            {activeTab === 'children' && (
              <div className="border border-gray-300">
                <div className="grid grid-cols-[160px_minmax(0,1fr)_220px] bg-gray-100 text-xs font-semibold text-gray-700">
                  <div className="border-r border-gray-300 px-3 py-2">Code</div><div className="border-r border-gray-300 px-3 py-2">Nom</div><div className="px-3 py-2">Plage</div>
                </div>
                {children.length ? children.map((child) => (
                  <button key={child.id} type="button" onClick={() => navigate(`/comptabilite/groups/${child.id}`, { state: { groupRecord: child, frameworkId, returnTo: location.pathname } })} className="grid w-full grid-cols-[160px_minmax(0,1fr)_220px] border-t border-gray-200 text-left text-xs hover:bg-purple-50">
                    <span className="border-r border-gray-200 px-3 py-2 font-mono font-semibold text-purple-700">{child.code}</span>
                    <span className="border-r border-gray-200 px-3 py-2">{child.name}</span>
                    <span className="px-3 py-2">{[child.code_prefix_start, child.code_prefix_end].filter(Boolean).join(' à ') || '-'}</span>
                  </button>
                )) : <div className="p-6 text-center text-xs text-gray-500">Aucune sous-classe.</div>}
              </div>
            )}

            {activeTab === 'excluded' && (
              <div className="border border-gray-300">
                <div className="grid grid-cols-[180px_minmax(0,1fr)] bg-gray-100 text-xs font-semibold text-gray-700">
                  <div className="border-r border-gray-300 px-3 py-2">Numéro de compte</div><div className="px-3 py-2">Nom</div>
                </div>
                {excludedAccounts.length ? excludedAccounts.map((account) => (
                  <div key={account.id || account.code} className="grid grid-cols-[180px_minmax(0,1fr)] border-t border-gray-200 text-xs">
                    <div className="border-r border-gray-200 px-3 py-2 font-mono font-semibold text-red-700">{account.code || '-'}</div>
                    <div className="px-3 py-2">{account.name || '-'}</div>
                  </div>
                )) : <div className="p-6 text-center text-xs text-gray-500">Aucun compte exclu.</div>}
              </div>
            )}

            {activeTab === 'notes' && (
              <div className="min-h-[140px] border border-gray-300 p-4 text-xs leading-5 text-gray-700 whitespace-pre-wrap">
                {group.note || 'Aucune note.'}
              </div>
            )}
          </div>
        </div>
      )}
    </UnifiedFormPage>
  );
}

export { GroupDetail };
