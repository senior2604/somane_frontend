// src/features/comptabilite/pages/types/TypeDetail.jsx
import {
  DeleteOutlined,
  EditOutlined,
} from '@ant-design/icons';
import {
  message,
  Modal,
  Spin,
} from 'antd';
import { useCallback, useEffect, useState } from 'react';
import {
  FiInfo,
  FiPlus,
  FiSettings,
  FiX,
} from 'react-icons/fi';
import { useNavigate, useParams } from 'react-router-dom';

import useTypeStore from '../../../../stores/comptabilite/typeStore';

const { confirm } = Modal;

const CLOSING_BEHAVIOR_LABEL = {
  none: 'Aucun',
  carry_forward: 'Report à nouveau',
};

const DEFAULT_BALANCE_LABEL = {
  debit: 'Débit',
  credit: 'Crédit',
};

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

const BoolBadge = ({ value, yes = 'Oui', no = 'Non' }) => (
  <Badge className={value ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}>
    {value ? yes : no}
  </Badge>
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

const DetailLine = ({ label, children }) => (
  <div className="flex items-center" style={{ height: '26px' }}>
    <label className="text-xs text-gray-700 min-w-[160px] font-medium">{label}</label>
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

function TypeDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { fetchTypeById, deleteType } = useTypeStore();

  const [type, setType] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('infos');
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [showTraceabilityPanel, setShowTraceabilityPanel] = useState(true);

  const initPage = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchTypeById(id);
      setType(data);
    } catch {
      message.error('Impossible de charger la nature');
      navigate('/comptabilite/types');
    } finally {
      setLoading(false);
    }
  }, [id, fetchTypeById, navigate]);

  useEffect(() => {
    initPage();
  }, [initPage]);

  const handleDelete = useCallback(() => {
    confirm({
      title: 'Confirmer la suppression',
      content: (
        <span>
          Supprimer la nature <strong>{type?.code} - {type?.name}</strong> ?<br />
          <span style={{ color: '#cf1322', fontSize: 12 }}>Cette action est irréversible.</span>
        </span>
      ),
      okText: 'Supprimer',
      okType: 'danger',
      cancelText: 'Annuler',
      onOk: async () => {
        try {
          await deleteType(id);
          message.success('Nature supprimée');
          navigate('/comptabilite/types');
        } catch {
          message.error('Erreur lors de la suppression');
        }
      },
    });
  }, [type, id, deleteType, navigate]);

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

  if (!type) return null;

  const frameworkLabel = type.framework_name || (type.framework ? `Référentiel #${type.framework}` : '-');
  const groupLabel = type.internal_group_name || '-';
  const parentLabel = type.parent_name || (type.parent ? `Nature #${type.parent}` : 'Racine');
  const balanceLabel = DEFAULT_BALANCE_LABEL[type.default_balance_type] || emptyText(type.default_balance_type);
  const closingLabel = CLOSING_BEHAVIOR_LABEL[type.closing_behavior] || emptyText(type.closing_behavior);
  const typeTitle = type.code ? `${type.code} - ${type.name || ''}`.trim() : type.name;

  const traceabilityLogs = [
    {
      id: 'creation',
      action: 'Création de la nature',
      target: typeTitle,
      modelName: 'AccountType',
      date: type.created_at || type.create_date,
      user: type.created_by_name || type.create_uid_label || type.created_by,
    },
    {
      id: 'update',
      action: 'Dernière modification',
      target: typeTitle,
      modelName: 'AccountType',
      date: type.updated_at || type.write_date,
      user: type.updated_by_name || type.write_uid_label || type.updated_by,
    },
  ].filter((log) => log.date || log.user);

  const navigateToNew = () => {
    navigate('/comptabilite/types/new', {
      state: {
        frameworkId: type.framework,
        parentId: type.parent || null,
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
                <Tooltip text="Créer une nouvelle nature">
                  <button
                    type="button"
                    onClick={navigateToNew}
                    className="h-12 px-4 bg-purple-600 text-white text-sm hover:bg-purple-700 transition-all flex items-center gap-1 font-medium"
                  >
                    <FiPlus size={16} /><span>Nouveau</span>
                  </button>
                </Tooltip>
                <div className="flex flex-col h-12 justify-center">
                  <div
                    className="text-lg font-bold text-gray-900 cursor-pointer hover:text-purple-600 transition-colors"
                    onClick={() => navigate('/comptabilite/types')}
                  >
                    Natures de comptes
                  </div>
                  <span className="text-xs text-gray-600 font-medium">
                    N° {type.code || 'Nature'}
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
                          navigate(`/comptabilite/types/${id}/edit`, { state: { frameworkId: type.framework } });
                        }}
                        className="w-full px-3 py-2 text-xs text-left hover:bg-gray-50 flex items-center gap-2"
                      >
                        <EditOutlined /> Modifier
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowActionsMenu(false);
                          navigateToNew();
                        }}
                        className="w-full px-3 py-2 text-xs text-left hover:bg-gray-50 flex items-center gap-2 border-t border-gray-100"
                      >
                        <FiPlus size={12} /> Nouvelle nature
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
                          navigate('/comptabilite/types');
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
                    onClick={() => navigate(`/comptabilite/types/${id}/edit`, { state: { frameworkId: type.framework } })}
                    className="h-8 px-3 bg-purple-600 text-white text-xs hover:bg-purple-700 flex items-center gap-1"
                  >
                    <EditOutlined /><span>Modifier</span>
                  </button>
                </Tooltip>
                <Tooltip text="Retour">
                  <button
                    type="button"
                    onClick={() => navigate('/comptabilite/types')}
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
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className={type.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}>
                  {type.active ? 'Actif' : 'Inactif'}
                </Badge>
                <Badge className="bg-blue-100 text-blue-700">{frameworkLabel}</Badge>
                <Badge className="bg-purple-100 text-purple-700">{groupLabel}</Badge>
                <Badge className="bg-gray-100 text-gray-700">{parentLabel}</Badge>
              </div>
              <div className="text-xs text-gray-500">
                Solde : {balanceLabel}
              </div>
            </div>
            <div className="mt-2 ml-1">
              <span className="text-xs text-gray-600 font-medium">
                {typeTitle}
              </span>
            </div>
          </div>

          <div className="border-b border-gray-300">
            <div className="px-4 flex">
              {['infos', 'parametres', 'notes'].map((tab) => (
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
                  {tab === 'infos' ? 'Informations' : tab === 'parametres' ? 'Paramètres' : 'Notes'}
                </button>
              ))}
            </div>
          </div>

          <div className="p-4">
            {activeTab === 'infos' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <DetailLine label="Code">{emptyText(type.code)}</DetailLine>
                    <DetailLine label="Nom">{emptyText(type.name)}</DetailLine>
                    <DetailLine label="Référentiel">{frameworkLabel}</DetailLine>
                  </div>
                  <div className="space-y-2">
                    <DetailLine label="Groupe / Classe">{groupLabel}</DetailLine>
                    <DetailLine label="Nature parente">
                      {type.parent ? (
                        <button
                          type="button"
                          onClick={() => navigate(`/comptabilite/types/${type.parent}`)}
                          className="text-purple-700 hover:underline truncate"
                        >
                          {parentLabel}
                        </button>
                      ) : (
                        parentLabel
                      )}
                    </DetailLine>
                    <DetailLine label="Statut">{type.active ? 'Actif' : 'Inactif'}</DetailLine>
                  </div>
                </div>

                <div className="border border-gray-300">
                  <div className="grid grid-cols-4 bg-gray-100 border-b border-gray-300">
                    {['Solde par défaut', 'Comportement clôture', 'Lettrage', 'Bilan ouverture'].map((heading) => (
                      <div key={heading} className="border-r border-gray-300 px-2 py-1.5 text-xs font-medium text-gray-700 last:border-r-0">
                        {heading}
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-4">
                    <TableCell>
                      <Badge className={type.default_balance_type === 'debit' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}>
                        {balanceLabel}
                      </Badge>
                    </TableCell>
                    <TableCell>{closingLabel}</TableCell>
                    <TableCell><BoolBadge value={type.allow_reconciliation} /></TableCell>
                    <TableCell><BoolBadge value={type.include_in_opening_balance} /></TableCell>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'parametres' && (
              <div className="space-y-4">
                <div className="border border-gray-300">
                  <div className="grid grid-cols-4 bg-gray-100 border-b border-gray-300">
                    {['Généralement débiteur', 'Généralement créditeur', 'Lettrage autorisé', "Bilan d'ouverture"].map((heading) => (
                      <div key={heading} className="border-r border-gray-300 px-2 py-1.5 text-xs font-medium text-gray-700 last:border-r-0">
                        {heading}
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-4">
                    <TableCell><BoolBadge value={type.default_debit} /></TableCell>
                    <TableCell><BoolBadge value={type.default_credit} /></TableCell>
                    <TableCell><BoolBadge value={type.allow_reconciliation} /></TableCell>
                    <TableCell><BoolBadge value={type.include_in_opening_balance} /></TableCell>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <DetailLine label="Solde par défaut">{balanceLabel}</DetailLine>
                    <DetailLine label="Comportement clôture">{closingLabel}</DetailLine>
                  </div>
                  <div className="space-y-2">
                    <DetailLine label="Créé le">{formatDateTime(type.created_at || type.create_date)}</DetailLine>
                    <DetailLine label="Modifié le">{formatDateTime(type.updated_at || type.write_date)}</DetailLine>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'notes' && (
              <div className="border border-gray-300">
                <div className="bg-gray-100 border-b border-gray-300 px-2 py-1.5 text-xs font-medium text-gray-700">
                  Notes
                </div>
                <div className="p-3 text-xs text-gray-800 whitespace-pre-wrap min-h-[120px]">
                  {emptyText(type.note, 'Aucune note')}
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
                <div className="text-[11px] text-gray-500">Activité liée à la nature</div>
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
                <span className="text-xs font-medium text-gray-700">Activité liée à la nature</span>
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
                  <span className="text-gray-500">Statut</span>
                  <span className="font-medium">{type.active ? 'Actif' : 'Inactif'}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Groupe</span>
                  <span className="font-medium">{groupLabel}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Parent</span>
                  <span className="font-medium">{parentLabel}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Solde</span>
                  <span className="font-medium">{balanceLabel}</span>
                </div>
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}

export { TypeDetail };
export default TypeDetail;
