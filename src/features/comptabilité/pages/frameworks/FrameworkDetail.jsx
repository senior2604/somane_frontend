// src/features/comptabilite/pages/frameworks/FrameworkDetail.jsx
import { EditOutlined } from '@ant-design/icons';
import { message, Spin } from 'antd';
import { useCallback, useEffect, useState } from 'react';
import {
  FiBriefcase,
  FiFolder,
  FiInfo,
  FiPlus,
  FiSettings,
  FiTag,
  FiX,
} from 'react-icons/fi';
import { useNavigate, useParams } from 'react-router-dom';

import { ENDPOINTS } from '../../../../config/api';
import axiosInstance from '../../../../config/axiosInstance';
import useFrameworkStore from '../../../../stores/comptabilite/frameworkStore';

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

const relationLabel = (value, fallback = '-') => {
  if (value === null || value === undefined || value === '') return fallback;
  if (typeof value === 'string' || typeof value === 'number') return value;
  return [
    value.code,
    value.nom,
    value.name,
    value.label,
    value.display_name,
  ].filter(Boolean).join(' - ') || fallback;
};

const countFromResponse = (data) => {
  if (typeof data?.count === 'number') return data.count;
  const list = data?.results || data || [];
  return Array.isArray(list) ? list.length : 0;
};

const getCompanyNames = (framework) => {
  if (Array.isArray(framework.company_names) && framework.company_names.length) {
    return framework.company_names;
  }

  if (Array.isArray(framework.company)) {
    return framework.company
      .map((company) => relationLabel(company, ''))
      .filter(Boolean);
  }

  return [];
};

const getCountryLabel = (framework) => (
  relationLabel(framework.country, '') ||
  framework.country_name ||
  framework.country_label ||
  framework.country_code ||
  '-'
);

const getLengthLabel = (framework) => (
  framework.account_code_length ||
  framework.code_length ||
  framework.length ||
  '-'
);

const Badge = ({ children, className = '' }) => (
  <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium ${className}`}>
    {children}
  </span>
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

function FrameworkDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentFramework, fetchFrameworkById, loading } = useFrameworkStore();

  const [stats, setStats] = useState({
    groupsCount: 0,
    typesCount: 0,
    accountsCount: 0,
  });
  const [loadingStats, setLoadingStats] = useState(false);
  const [activeTab, setActiveTab] = useState('infos');
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [showTraceabilityPanel, setShowTraceabilityPanel] = useState(true);
  const [pageLoading, setPageLoading] = useState(true);

  const loadStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const [groupsRes, typesRes, accountsRes] = await Promise.all([
        axiosInstance.get(ENDPOINTS.COMPTA.GROUPS, { params: { framework: id, page_size: 1 } }),
        axiosInstance.get(ENDPOINTS.COMPTA.TYPES, { params: { framework: id, page_size: 1 } }),
        axiosInstance.get(ENDPOINTS.COMPTA.ACCOUNTS, { params: { framework: id, page_size: 1 } }),
      ]);

      setStats({
        groupsCount: countFromResponse(groupsRes.data),
        typesCount: countFromResponse(typesRes.data),
        accountsCount: countFromResponse(accountsRes.data),
      });
    } catch (caughtError) {
      console.error('Erreur stats:', caughtError);
    } finally {
      setLoadingStats(false);
    }
  }, [id]);

  const initPage = useCallback(async () => {
    setPageLoading(true);
    try {
      await fetchFrameworkById(id);
      await loadStats();
    } catch (caughtError) {
      console.error('Erreur chargement plan comptable:', caughtError);
      message.error('Impossible de charger le plan comptable');
      navigate('/comptabilite/frameworks');
    } finally {
      setPageLoading(false);
    }
  }, [id, fetchFrameworkById, loadStats, navigate]);

  useEffect(() => {
    initPage();
  }, [initPage]);

  if (loading || pageLoading) {
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

  if (!currentFramework) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-7xl mx-auto bg-white border border-red-200 bg-red-50 p-4">
          <div className="flex items-center gap-2 text-sm text-red-700">
            <FiInfo size={16} />
            <span>Le plan comptable demandé n'existe pas ou a été supprimé.</span>
          </div>
        </div>
      </div>
    );
  }

  const framework = currentFramework;
  const companyNames = getCompanyNames(framework);
  const isShared = companyNames.length === 0;
  const scopeLabel = isShared ? 'Partagé - Toutes les entités' : `Spécifique - ${companyNames.length} entité(s)`;
  const traceabilityLogs = [
    {
      id: 'creation',
      action: 'Création du plan comptable',
      target: framework.code ? `${framework.code} - ${framework.name || ''}`.trim() : framework.name,
      modelName: 'FinanceAccountFramework',
      date: framework.created_at || framework.create_date,
      user: framework.created_by_name || framework.create_uid_label || framework.created_by,
    },
    {
      id: 'update',
      action: 'Dernière modification',
      target: framework.code ? `${framework.code} - ${framework.name || ''}`.trim() : framework.name,
      modelName: 'FinanceAccountFramework',
      date: framework.updated_at || framework.write_date,
      user: framework.updated_by_name || framework.write_uid_label || framework.updated_by,
    },
  ].filter((log) => log.date || log.user);

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className={`max-w-7xl mx-auto grid gap-4 ${showTraceabilityPanel ? 'lg:grid-cols-[1fr_320px]' : 'grid-cols-1'}`}>
        <div className="bg-white border border-gray-300">
          <div className="border-b border-gray-300 px-4 py-3">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-start gap-3">
                <Tooltip text="Créer un nouveau plan comptable">
                  <button
                    type="button"
                    onClick={() => navigate('/comptabilite/frameworks/new')}
                    className="h-12 px-4 bg-purple-600 text-white text-sm hover:bg-purple-700 transition-all flex items-center gap-1 font-medium"
                  >
                    <FiPlus size={16} /><span>Nouveau</span>
                  </button>
                </Tooltip>
                <div className="flex flex-col h-12 justify-center">
                  <div
                    className="text-lg font-bold text-gray-900 cursor-pointer hover:text-purple-600 transition-colors"
                    onClick={() => navigate('/comptabilite/frameworks')}
                  >
                    Plans comptables
                  </div>
                  <span className="text-xs text-gray-600 font-medium">
                    N° {framework.code || 'Plan comptable'}
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
                          navigate(`/comptabilite/frameworks/${id}/edit`);
                        }}
                        className="w-full px-3 py-2 text-xs text-left hover:bg-gray-50 flex items-center gap-2"
                      >
                        <EditOutlined /> Modifier
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
                          navigate(`/comptabilite/groups?framework=${id}`);
                        }}
                        className="w-full px-3 py-2 text-xs text-left hover:bg-gray-50 flex items-center gap-2 border-t border-gray-100"
                      >
                        <FiFolder size={12} /> Voir les classes
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowActionsMenu(false);
                          navigate(`/comptabilite/types?framework=${id}`);
                        }}
                        className="w-full px-3 py-2 text-xs text-left hover:bg-gray-50 flex items-center gap-2 border-t border-gray-100"
                      >
                        <FiTag size={12} /> Voir les natures
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowActionsMenu(false);
                          navigate(`/comptabilite/accounts?framework=${id}`);
                        }}
                        className="w-full px-3 py-2 text-xs text-left hover:bg-gray-50 flex items-center gap-2 border-t border-gray-100"
                      >
                        <FiBriefcase size={12} /> Voir les comptes
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowActionsMenu(false);
                          navigate('/comptabilite/frameworks');
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
                    onClick={() => navigate(`/comptabilite/frameworks/${id}/edit`)}
                    className="h-8 px-3 bg-purple-600 text-white text-xs hover:bg-purple-700 flex items-center gap-1"
                  >
                    <EditOutlined /><span>Modifier</span>
                  </button>
                </Tooltip>
                <Tooltip text="Retour">
                  <button
                    type="button"
                    onClick={() => navigate('/comptabilite/frameworks')}
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
                <Badge className={framework.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}>
                  {framework.active ? 'Actif' : 'Inactif'}
                </Badge>
                <Badge className={isShared ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}>
                  {scopeLabel}
                </Badge>
              </div>
              <div className="text-xs text-gray-500">
                Longueur par défaut : {getLengthLabel(framework)}
              </div>
            </div>
            <div className="mt-2 ml-1">
              <span className="text-xs text-gray-600 font-medium">
                {framework.code} - {framework.name}
              </span>
            </div>
          </div>

          <div className="border-b border-gray-300">
            <div className="px-4 flex">
              {['infos', 'stats'].map((tab) => (
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
                  {tab === 'infos' ? 'Informations' : 'Statistiques'}
                </button>
              ))}
            </div>
          </div>

          <div className="p-4">
            {activeTab === 'infos' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <DetailLine label="Code">{emptyText(framework.code)}</DetailLine>
                    <DetailLine label="Nom">{emptyText(framework.name)}</DetailLine>
                    <DetailLine label="Version">{emptyText(framework.version)}</DetailLine>
                  </div>
                  <div className="space-y-2">
                    <DetailLine label="Pays">{getCountryLabel(framework)}</DetailLine>
                    <DetailLine label="Groupement">{emptyText(framework.country_group)}</DetailLine>
                    <DetailLine label="Statut">{framework.active ? 'Actif' : 'Inactif'}</DetailLine>
                  </div>
                </div>

                <div className="border border-gray-300">
                  <div className="grid grid-cols-3 bg-gray-100 border-b border-gray-300">
                    {['Portée', 'Longueur par défaut', 'Description'].map((heading) => (
                      <div key={heading} className="border-r border-gray-300 px-2 py-1.5 text-xs font-medium text-gray-700 last:border-r-0">
                        {heading}
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-3">
                    <TableCell>{scopeLabel}</TableCell>
                    <TableCell>{getLengthLabel(framework)}</TableCell>
                    <TableCell>{emptyText(framework.description, 'Aucune description')}</TableCell>
                  </div>
                </div>

                {!isShared && (
                  <div className="border border-gray-300">
                    <div className="bg-gray-100 border-b border-gray-300 px-2 py-1.5 text-xs font-medium text-gray-700">
                      Entités concernées
                    </div>
                    <div className="p-2 flex flex-wrap gap-2">
                      {companyNames.map((name) => (
                        <Badge key={name} className="bg-blue-100 text-blue-700">{name}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="border border-gray-300">
                  <div className="grid grid-cols-2 bg-gray-100 border-b border-gray-300">
                    {['Créé le', 'Modifié le'].map((heading) => (
                      <div key={heading} className="border-r border-gray-300 px-2 py-1.5 text-xs font-medium text-gray-700 last:border-r-0">
                        {heading}
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-2">
                    <TableCell>{formatDateTime(framework.created_at || framework.create_date)}</TableCell>
                    <TableCell>{formatDateTime(framework.updated_at || framework.write_date)}</TableCell>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'stats' && (
              <div className="border border-gray-300">
                <div className="grid grid-cols-3 bg-gray-100 border-b border-gray-300">
                  {['Classes de comptes', 'Natures de comptes', 'Comptes comptables'].map((heading) => (
                    <div key={heading} className="border-r border-gray-300 px-2 py-1.5 text-xs font-medium text-gray-700 last:border-r-0">
                      {heading}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-3">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <FiFolder size={14} className="text-purple-600" />
                      <span className="font-semibold">{loadingStats ? '...' : stats.groupsCount}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <FiTag size={14} className="text-blue-600" />
                      <span className="font-semibold">{loadingStats ? '...' : stats.typesCount}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <FiBriefcase size={14} className="text-green-600" />
                      <span className="font-semibold">{loadingStats ? '...' : stats.accountsCount}</span>
                    </div>
                  </TableCell>
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
                <div className="text-[11px] text-gray-500">Activité liée au plan comptable</div>
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
                <span className="text-xs font-medium text-gray-700">Activité liée au plan</span>
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
          </aside>
        )}
      </div>
    </div>
  );
}

export { FrameworkDetail };
export default FrameworkDetail;
