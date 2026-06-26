// src/features/comptabilite/pages/groups/GroupDetail.jsx
import {
  DeleteOutlined,
  EditOutlined,
} from '@ant-design/icons';
import {
  message,
  Modal,
  Spin,
} from 'antd';
import { useEffect, useState } from 'react';
import {
  FiInfo,
  FiPlus,
  FiSettings,
  FiX,
} from 'react-icons/fi';
import { useNavigate, useParams } from 'react-router-dom';

import useGroupStore from '../../../../stores/comptabilite/groupStore';

const { confirm } = Modal;

const Tooltip = ({ children, text, position = 'top' }) => {
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
          <div className={`absolute w-2 h-2 bg-gray-800 transform rotate-45 ${
            position === 'top' ? 'top-full left-1/2 -translate-x-1/2 -mt-1' :
            position === 'bottom' ? 'bottom-full left-1/2 -translate-x-1/2 -mb-1' :
            position === 'left' ? 'left-full top-1/2 -translate-y-1/2 -ml-1' :
            'right-full top-1/2 -translate-y-1/2 -mr-1'
          }`} />
        </div>
      )}
    </div>
  );
};

const Badge = ({ children, className = '' }) => (
  <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium ${className}`}>
    {children}
  </span>
);

const formatDateTime = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('fr-FR');
};

const emptyText = (value, fallback = '-') => {
  if (value === null || value === undefined || value === '') return fallback;
  return value;
};

const relationId = (value) => {
  if (!value) return null;
  if (typeof value === 'object') return value.id ?? value.value ?? null;
  return value;
};

const relationLabel = (value, fallback = '-') => {
  if (value === null || value === undefined || value === '') return fallback;
  if (typeof value === 'string' || typeof value === 'number') return value;
  return [
    value.code,
    value.name,
    value.label,
    value.display_name,
  ].filter(Boolean).join(' - ') || fallback;
};

const getRangeLabel = (group) => {
  if (group.code_prefix_start && group.code_prefix_end) {
    return `${group.code_prefix_start} a ${group.code_prefix_end}`;
  }
  return '-';
};

const getCompanyLabel = (company) => (
  relationLabel(company, '') || `Société #${company}`
);

const DetailLine = ({ label, children }) => (
  <div className="flex items-center" style={{ height: '26px' }}>
    <label className="text-xs text-gray-700 min-w-[150px] font-medium">{label}</label>
    <div
      className="flex-1 px-2 py-1 border border-gray-300 bg-gray-50 text-xs text-gray-900 ml-2 flex items-center truncate"
      style={{ height: '26px' }}
    >
      {children}
    </div>
  </div>
);

const TableCell = ({ children, className = '' }) => (
  <div className={`border-r border-gray-300 p-1 last:border-r-0 ${className}`}>
    <div className="px-2 py-1 text-xs text-gray-800 flex items-center min-h-[24px]">
      {children}
    </div>
  </div>
);

function GroupDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { fetchGroupById, fetchGroups, groups, deleteGroup } = useGroupStore();

  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('infos');
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [showTraceabilityPanel, setShowTraceabilityPanel] = useState(true);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        const data = await fetchGroupById(id);
        setGroup(data);
        if (data.framework) {
          await fetchGroups({ framework: data.framework });
        }
      } catch {
        message.error('Impossible de charger la classe');
        navigate('/comptabilite/groups');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [id, fetchGroupById, fetchGroups, navigate]);

  const handleDelete = () => {
    confirm({
      title: 'Confirmer la suppression',
      content: (
        <span>
          Supprimer la classe <strong>{group?.code} - {group?.name}</strong> ?<br />
          <span style={{ color: '#cf1322', fontSize: 12 }}>Cette action est irréversible.</span>
        </span>
      ),
      okText: 'Supprimer',
      okType: 'danger',
      cancelText: 'Annuler',
      onOk: async () => {
        try {
          await deleteGroup(id);
          message.success('Classe supprimée');
          navigate('/comptabilite/groups');
        } catch {
          message.error('Erreur lors de la suppression');
        }
      },
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-7xl mx-auto bg-white border border-gray-300 p-8">
          <div className="flex items-center justify-center py-16">
            <Spin size="large" tip="Chargement..." />
          </div>
        </div>
      </div>
    );
  }

  if (!group) return null;

  const parentId = relationId(group.parent);
  const parent = parentId
    ? groups.find((item) => String(item.id) === String(parentId))
    : null;
  const children = groups.filter((item) => String(relationId(item.parent)) === String(group.id));
  const frameworkLabel = group.framework_name || (group.framework ? `Référentiel #${group.framework}` : '-');
  const companyList = Array.isArray(group.company) ? group.company : [];
  const excludedAccounts = group.excluded_accounts_detail || [];
  const isLeaf = children.length === 0;

  const traceabilityLogs = [
    {
      id: 'creation',
      action: 'Création de la classe',
      target: group.code ? `${group.code} - ${group.name || ''}`.trim() : group.name,
      modelName: 'AccountGroup',
      date: group.created_at || group.create_date,
      user: group.created_by_name || group.create_uid_label || group.created_by,
    },
    {
      id: 'update',
      action: 'Dernière modification',
      target: group.code ? `${group.code} - ${group.name || ''}`.trim() : group.name,
      modelName: 'AccountGroup',
      date: group.updated_at || group.write_date,
      user: group.updated_by_name || group.write_uid_label || group.updated_by,
    },
  ].filter((log) => log.date || log.user);

  const navigateToNewChild = () => {
    navigate('/comptabilite/groups/new', {
      state: {
        frameworkId: group.framework,
        parentId: group.id,
      },
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className={`max-w-7xl mx-auto grid gap-4 ${showTraceabilityPanel ? 'lg:grid-cols-[1fr_320px]' : 'grid-cols-1'}`}>
        <div className="bg-white border border-gray-300">
          <div className="border-b border-gray-300 px-4 py-3">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-start gap-3">
                <Tooltip text="Créer une nouvelle classe">
                  <button
                    type="button"
                    onClick={() => navigate('/comptabilite/groups/new', { state: { frameworkId: group.framework } })}
                    className="h-12 px-4 bg-purple-600 text-white text-sm hover:bg-purple-700 transition-all flex items-center gap-1 font-medium"
                  >
                    <FiPlus size={16} /><span>Nouveau</span>
                  </button>
                </Tooltip>
                <div className="flex flex-col h-12 justify-center">
                  <div
                    className="text-lg font-bold text-gray-900 cursor-pointer hover:text-purple-600 transition-colors"
                    onClick={() => navigate('/comptabilite/groups')}
                  >
                    Classes / Groupes
                  </div>
                  <span className="text-xs text-gray-600 font-medium">
                    N° {group.code || 'Classe'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative">
                  <Tooltip text="Menu des actions">
                    <button
                      type="button"
                      onClick={() => setShowActionsMenu(!showActionsMenu)}
                      className="h-8 px-3 border border-gray-300 text-gray-700 text-xs hover:bg-gray-50 flex items-center gap-1"
                    >
                      <FiSettings size={12} /><span>Actions</span>
                    </button>
                  </Tooltip>
                  {showActionsMenu && (
                    <div className="absolute right-0 mt-1 w-56 bg-white border border-gray-300 shadow-lg rounded-sm z-50">
                      <button
                        type="button"
                        onClick={() => {
                          setShowActionsMenu(false);
                          navigate(`/comptabilite/groups/${id}/edit`, { state: { frameworkId: group.framework } });
                        }}
                        className="w-full px-3 py-2 text-xs text-left hover:bg-gray-50 flex items-center gap-2"
                      >
                        <EditOutlined /> Modifier
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowActionsMenu(false);
                          navigateToNewChild();
                        }}
                        className="w-full px-3 py-2 text-xs text-left hover:bg-gray-50 flex items-center gap-2 border-t border-gray-100"
                      >
                        <FiPlus size={12} /> Ajouter une sous-classe
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowActionsMenu(false);
                          setShowTraceabilityPanel((prev) => !prev);
                        }}
                        className="w-full px-3 py-2 text-xs text-left hover:bg-gray-50 flex items-center gap-2 border-t border-gray-100"
                      >
                        <FiInfo size={12} /> {showTraceabilityPanel ? 'Masquer' : 'Afficher'} la traçabilité
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowActionsMenu(false);
                          handleDelete();
                        }}
                        className="w-full px-3 py-2 text-xs text-left hover:bg-red-50 hover:text-red-600 flex items-center gap-2 border-t border-gray-100"
                      >
                        <DeleteOutlined /> Supprimer
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowActionsMenu(false);
                          navigate('/comptabilite/groups');
                        }}
                        className="w-full px-3 py-2 text-xs text-left hover:bg-gray-50 flex items-center gap-2 border-t border-gray-100"
                      >
                        <FiInfo size={12} /> Retour à la liste
                      </button>
                    </div>
                  )}
                </div>
                <Tooltip text="Modifier">
                  <button
                    type="button"
                    onClick={() => navigate(`/comptabilite/groups/${id}/edit`, { state: { frameworkId: group.framework } })}
                    className="h-8 px-3 bg-purple-600 text-white text-xs hover:bg-purple-700 flex items-center gap-1"
                  >
                    <EditOutlined /><span>Modifier</span>
                  </button>
                </Tooltip>
                <Tooltip text="Retour">
                  <button
                    type="button"
                    onClick={() => navigate('/comptabilite/groups')}
                    className="w-8 h-8 rounded-full bg-black text-white hover:bg-gray-800 flex items-center justify-center"
                  >
                    <FiX size={16} />
                  </button>
                </Tooltip>
              </div>
            </div>
          </div>

          <div className="border-b border-gray-300 px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge className={isLeaf ? 'bg-gray-100 text-gray-700' : 'bg-amber-100 text-amber-700'}>
                  {isLeaf ? 'Feuille' : 'Groupe'}
                </Badge>
                <Badge className="bg-blue-100 text-blue-700">{frameworkLabel}</Badge>
                <Badge className="bg-green-100 text-green-700">{children.length} sous-classe(s)</Badge>
              </div>
              <div className="text-xs text-gray-500">
                Plage : {getRangeLabel(group)}
              </div>
            </div>
            <div className="mt-2 ml-1">
              <span className="text-xs text-gray-600 font-medium">
                {group.code} - {group.name}
              </span>
            </div>
          </div>

          <div className="border-b border-gray-300">
            <div className="px-4 flex">
              {['infos', 'children', 'excluded', 'notes'].map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 text-xs font-medium border-b-2 transition-all ${
                    activeTab === tab
                      ? 'border-purple-600 text-purple-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab === 'infos' ? 'Informations' : tab === 'children' ? 'Sous-classes' : tab === 'excluded' ? 'Exclusions' : 'Notes'}
                </button>
              ))}
            </div>
          </div>

          <div className="p-4">
            {activeTab === 'infos' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <DetailLine label="Code">{emptyText(group.code)}</DetailLine>
                    <DetailLine label="Nom">{emptyText(group.name)}</DetailLine>
                    <DetailLine label="Séquence">{emptyText(group.sequence ?? 0)}</DetailLine>
                  </div>
                  <div className="space-y-2">
                    <DetailLine label="Référentiel">{frameworkLabel}</DetailLine>
                    <DetailLine label="Classe parente">
                      {parent ? (
                        <button
                          type="button"
                          onClick={() => navigate(`/comptabilite/groups/${parent.id}`)}
                          className="text-purple-700 hover:underline truncate"
                        >
                          {parent.code} - {parent.name}
                        </button>
                      ) : (
                        'Racine'
                      )}
                    </DetailLine>
                    <DetailLine label="Type">{isLeaf ? 'Feuille' : 'Groupe'}</DetailLine>
                  </div>
                </div>

                <div className="border border-gray-300">
                  <div className="grid grid-cols-4 bg-gray-100 border-b border-gray-300">
                    {['Début plage', 'Fin plage', 'Sous-classes', 'Comptes exclus'].map((heading) => (
                      <div key={heading} className="border-r border-gray-300 px-2 py-1.5 text-xs font-medium text-gray-700 last:border-r-0">
                        {heading}
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-4">
                    <TableCell>{emptyText(group.code_prefix_start)}</TableCell>
                    <TableCell>{emptyText(group.code_prefix_end)}</TableCell>
                    <TableCell>{children.length}</TableCell>
                    <TableCell>{excludedAccounts.length}</TableCell>
                  </div>
                </div>

                {companyList.length > 0 && (
                  <div className="border border-gray-300">
                    <div className="bg-gray-100 border-b border-gray-300 px-2 py-1.5 text-xs font-medium text-gray-700">
                      Sociétés
                    </div>
                    <div className="p-2 flex flex-wrap gap-2">
                      {companyList.map((company) => (
                        <Badge key={relationId(company) || company} className="bg-blue-100 text-blue-700">
                          {getCompanyLabel(company)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {group.code_prefix_start && group.code_prefix_end && (
                  <div className="border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-700 flex items-start gap-2">
                    <FiInfo size={14} className="mt-0.5" />
                    <span>
                      Cette classe couvre les comptes de <strong>{group.code_prefix_start}</strong> à <strong>{group.code_prefix_end}</strong>
                      {excludedAccounts.length > 0 ? `, avec ${excludedAccounts.length} exclusion(s).` : '.'}
                    </span>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'children' && (
              <div className="border border-gray-300">
                <div className="grid grid-cols-3 bg-gray-100 border-b border-gray-300">
                  {['Code', 'Nom', 'Plage'].map((heading) => (
                    <div key={heading} className="border-r border-gray-300 px-2 py-1.5 text-xs font-medium text-gray-700 last:border-r-0">
                      {heading}
                    </div>
                  ))}
                </div>
                {children.length === 0 ? (
                  <div className="p-6 text-center text-xs text-gray-500">
                    Aucune sous-classe
                  </div>
                ) : children.map((child) => (
                  <div
                    key={child.id}
                    className="grid grid-cols-3 border-b border-gray-200 last:border-b-0 hover:bg-gray-50 cursor-pointer"
                    onDoubleClick={() => navigate(`/comptabilite/groups/${child.id}`)}
                  >
                    <TableCell>
                      <span className="font-mono font-semibold text-purple-700">{child.code}</span>
                    </TableCell>
                    <TableCell>{child.name}</TableCell>
                    <TableCell>{getRangeLabel(child)}</TableCell>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'excluded' && (
              <div className="border border-gray-300">
                <div className="grid grid-cols-2 bg-gray-100 border-b border-gray-300">
                  {['Code', 'Nom'].map((heading) => (
                    <div key={heading} className="border-r border-gray-300 px-2 py-1.5 text-xs font-medium text-gray-700 last:border-r-0">
                      {heading}
                    </div>
                  ))}
                </div>
                {excludedAccounts.length === 0 ? (
                  <div className="p-6 text-center text-xs text-gray-500">
                    Aucun compte exclu
                  </div>
                ) : excludedAccounts.map((account) => (
                  <div key={account.id || account.code} className="grid grid-cols-2 border-b border-gray-200 last:border-b-0">
                    <TableCell>
                      <span className="font-mono font-semibold text-red-700">{account.code}</span>
                    </TableCell>
                    <TableCell>{account.name}</TableCell>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'notes' && (
              <div className="border border-gray-300">
                <div className="bg-gray-100 border-b border-gray-300 px-2 py-1.5 text-xs font-medium text-gray-700">
                  Notes
                </div>
                <div className="p-3 text-xs text-gray-800 whitespace-pre-wrap min-h-[120px]">
                  {emptyText(group.note, 'Aucune note')}
                </div>
              </div>
            )}
          </div>
        </div>

        {showTraceabilityPanel && (
          <aside className="bg-gray-50 border border-gray-300 h-fit">
            <div className="border-b border-gray-300 px-3 py-2 flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-gray-900">Traçabilité</div>
                <div className="text-[11px] text-gray-500">Activité liée à la classe</div>
              </div>
              <button
                type="button"
                onClick={() => setShowTraceabilityPanel(false)}
                className="h-7 px-2 text-xs border border-gray-300 bg-white hover:bg-gray-100"
              >
                Fermer
              </button>
            </div>
            <div className="p-3">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-gray-700">Activité liée à la classe</span>
                <span className="text-[11px] text-gray-500">{traceabilityLogs.length} événement(s)</span>
              </div>
              {traceabilityLogs.length > 0 ? (
                <div className="space-y-2 max-h-[calc(100vh-240px)] overflow-y-auto pr-1">
                  {traceabilityLogs.map((log) => (
                    <div key={log.id} className="bg-white border border-gray-200 px-3 py-2">
                      <div className="text-xs font-medium text-gray-900">{log.action}</div>
                      <div className="text-[11px] text-gray-600 mt-0.5">{log.target || '-'}</div>
                      <div className="text-[11px] text-gray-500 mt-1">{log.modelName}</div>
                      <div className="text-[11px] text-gray-500 mt-1">
                        Par {emptyText(log.user, 'Utilisateur inconnu')}
                      </div>
                      <div className="text-[11px] text-gray-400">{formatDateTime(log.date)}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-gray-500 bg-white border border-gray-200 p-3">
                  Aucune activité disponible.
                </div>
              )}
            </div>

            <div className="border-t border-gray-300 p-3">
              <div className="text-xs font-medium text-gray-700 mb-2">Informations rapides</div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Type</span>
                  <span className="font-medium">{isLeaf ? 'Feuille' : 'Groupe'}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Sous-classes</span>
                  <span className="font-medium">{children.length}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Sociétés</span>
                  <span className="font-medium">{companyList.length}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Comptes exclus</span>
                  <span className="font-medium">{excludedAccounts.length}</span>
                </div>
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}

export { GroupDetail };
export default GroupDetail;
