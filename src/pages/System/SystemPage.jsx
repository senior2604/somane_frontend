import React, { useState, useEffect } from 'react';
import { apiClient } from '../../services/apiClient';
import { 
  FiRefreshCw, 
  FiAlertCircle, 
  FiServer, 
  FiActivity, 
  FiBarChart2,
  FiCpu,
  FiHardDrive,
  FiShield,
  FiUsers,
  FiClock,
  FiCalendar,
  FiDatabase,
  FiWifi,
  FiBell,
  FiTerminal,
  FiChevronRight,
  FiPlay,
  FiPause,
  FiStopCircle,
  FiSettings,
  FiInfo,
  FiX
} from "react-icons/fi";
import { TbServer, TbChartInfographic, TbSettingsAutomation } from "react-icons/tb";

export default function SystemPage() {
  const [infoSysteme, setInfoSysteme] = useState(null);
  const [statistiques, setStatistiques] = useState(null);
  const [statistiquesError, setStatistiquesError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState('');
  const [selectedLog, setSelectedLog] = useState(null);
  const [showLogDetailModal, setShowLogDetailModal] = useState(false);

  useEffect(() => {
    fetchInfoSysteme();
    fetchStatistiques();
  }, []);

  const fetchInfoSysteme = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.get('/informations/');
      setInfoSysteme(response);
    } catch (err) {
      console.error('❌ Erreur lors du chargement des informations système:', err);
      setError('Erreur lors du chargement des informations système');
    } finally {
      setLoading(false);
    }
  };

  const fetchStatistiques = async () => {
    try {
      setStatistiquesError(null);
      
      // Essayer de récupérer les données de différentes sources
      let statsData = null;
      
      try {
        // Essayer d'abord les tâches
        const tasksResponse = await apiClient.get('/taches/');
        if (tasksResponse && Array.isArray(tasksResponse)) {
          statsData = {
            taches_actives: tasksResponse.filter(t => t.actif).length,
            total_taches: tasksResponse.length
          };
        }
      } catch (tasksErr) {
        console.log('Aucune donnée de tâches disponible');
      }
      
      // Si pas de données, on laisse statistiques à null
      setStatistiques(statsData);
      
    } catch (err) {
      console.error('Erreur lors du chargement des statistiques:', err);
      setStatistiquesError('Les statistiques système ne sont pas disponibles');
      setStatistiques(null);
    }
  };

  const handleChangerEtat = async (nouvelEtat) => {
    try {
      setError(null);
      await apiClient.patch('/informations/', {
        etat_systeme: nouvelEtat,
        message_maintenance: maintenanceMessage
      });
      setShowMaintenanceModal(false);
      setMaintenanceMessage('');
      fetchInfoSysteme();
    } catch (err) {
      setError('Erreur lors du changement d\'état');
      console.error('Error changing system state:', err);
    }
  };

  const handleMaintenanceClick = () => {
    if (infoSysteme?.etat_systeme === 'maintenance') {
      handleChangerEtat('en_service');
    } else {
      setShowMaintenanceModal(true);
    }
  };

  const handleViewLogDetail = (log) => {
    setSelectedLog(log);
    setShowLogDetailModal(true);
  };

  const handleRetry = () => {
    fetchInfoSysteme();
    fetchStatistiques();
  };

  const getEtatDisplay = (etat) => {
    const etats = {
      'en_service': 'En service',
      'maintenance': 'Maintenance',
      'arret': 'Arrêt'
    };
    return etats[etat] || etat;
  };

  const getEtatColor = (etat) => {
    switch (etat) {
      case 'en_service':
        return 'bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 border border-green-200';
      case 'maintenance':
        return 'bg-gradient-to-r from-yellow-50 to-amber-50 text-amber-700 border border-amber-200';
      case 'arret':
        return 'bg-gradient-to-r from-red-50 to-pink-50 text-red-700 border border-red-200';
      default:
        return 'bg-gradient-to-r from-gray-50 to-gray-100 text-gray-700 border border-gray-200';
    }
  };

  const getEtatIcon = (etat) => {
    switch (etat) {
      case 'en_service':
        return <FiPlay className="w-4 h-4" />;
      case 'maintenance':
        return <FiPause className="w-4 h-4" />;
      case 'arret':
        return <FiStopCircle className="w-4 h-4" />;
      default:
        return <FiServer className="w-4 h-4" />;
    }
  };

  const getLogColor = (niveau) => {
    switch (niveau) {
      case 'ERROR':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'WARNING':
        return 'text-amber-600 bg-amber-50 border-amber-200';
      case 'INFO':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getLogIcon = (niveau) => {
    switch (niveau) {
      case 'ERROR':
        return <FiAlertCircle className="w-4 h-4" />;
      case 'WARNING':
        return <FiBell className="w-4 h-4" />;
      case 'INFO':
        return <FiInfo className="w-4 h-4" />;
      default:
        return <FiTerminal className="w-4 h-4" />;
    }
  };

  const getUptimeDisplay = (dateDeploiement) => {
    if (!dateDeploiement) return 'N/A';
    
    const deploiement = new Date(dateDeploiement);
    const maintenant = new Date();
    const diff = maintenant - deploiement;
    
    const jours = Math.floor(diff / (1000 * 60 * 60 * 24));
    const heures = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (jours > 0) {
      return `${jours}j ${heures}h ${minutes}m`;
    } else if (heures > 0) {
      return `${heures}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  };

  const getStatValue = (key, fallback = 'N/A') => {
    return statistiques && statistiques[key] !== undefined ? statistiques[key] : fallback;
  };

  if (loading) {
    return (
      <div className="p-4 bg-gradient-to-br from-gray-50 to-white min-h-screen">
        <div className="flex flex-col items-center justify-center h-96">
          <div className="relative">
            <div className="w-12 h-12 border-3 border-gray-200 rounded-full"></div>
            <div className="absolute top-0 left-0 w-12 h-12 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <div className="mt-4">
            <div className="h-2 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded-full w-32 animate-pulse"></div>
            <div className="h-2 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded-full w-24 mt-2 animate-pulse mx-auto"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-gradient-to-br from-gray-50 to-white min-h-screen">
      {/* Header avec gradient */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          
          <div className="flex items-center gap-2">
            <button 
              onClick={handleRetry}
              className="px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-all duration-300 hover:shadow flex items-center gap-1.5 text-sm group"
            >
              <FiRefreshCw className="group-hover:rotate-180 transition-transform duration-500 text-sm" />
              <span className="font-medium">Actualiser</span>
            </button>
          </div>
        </div>
      </div>

      {/* Message d'erreur principal */}
      {error && (
        <div className="mb-4">
          <div className="bg-gradient-to-r from-red-50 to-red-100 border-l-3 border-red-500 rounded-r-lg p-3 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-red-100 rounded">
                  <FiAlertCircle className="w-4 h-4 text-red-600" />
                </div>
                <div>
                  <p className="font-medium text-red-900 text-sm">{error}</p>
                  <p className="text-xs text-red-700 mt-0.5">Veuillez réessayer</p>
                </div>
              </div>
              <button
                onClick={handleRetry}
                className="px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-xs font-medium shadow-sm"
              >
                Réessayer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Message d'avertissement pour les statistiques */}
      {statistiquesError && (
        <div className="mb-4">
          <div className="bg-gradient-to-r from-amber-50 to-yellow-100 border-l-3 border-amber-500 rounded-r-lg p-3 shadow-sm">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-amber-100 rounded">
                <FiAlertCircle className="w-4 h-4 text-amber-600" />
              </div>
              <div>
                <p className="font-medium text-amber-900 text-sm">{statistiquesError}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Grille principale */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Carte d'état du système */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow transition-shadow duration-300">
          <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-gradient-to-br from-indigo-50 to-indigo-100 rounded">
                  <TbServer className="w-4 h-4 text-indigo-600" />
                </div>
                <h2 className="text-sm font-semibold text-gray-900">État du Système</h2>
              </div>
              <div className={`px-2 py-1 rounded flex items-center gap-1 ${getEtatColor(infoSysteme?.etat_systeme)}`}>
                {getEtatIcon(infoSysteme?.etat_systeme)}
                <span className="text-xs font-medium">{getEtatDisplay(infoSysteme?.etat_systeme)}</span>
              </div>
            </div>
          </div>
          
          <div className="p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gradient-to-br from-gray-50 to-white p-3 rounded-lg border border-gray-200">
                <div className="flex items-center gap-2 mb-1">
                  <FiSettings className="w-3 h-3 text-gray-400" />
                  <p className="text-xs text-gray-600">Version</p>
                </div>
                <p className="text-sm font-mono font-medium text-gray-900">
                  v{infoSysteme?.version || 'N/A'}
                </p>
              </div>
              
              <div className="bg-gradient-to-br from-gray-50 to-white p-3 rounded-lg border border-gray-200">
                <div className="flex items-center gap-2 mb-1">
                  <FiDatabase className="w-3 h-3 text-gray-400" />
                  <p className="text-xs text-gray-600">Build</p>
                </div>
                <p className="text-sm font-mono text-gray-900">
                  {infoSysteme?.numero_build || 'N/A'}
                </p>
              </div>
              
              <div className="bg-gradient-to-br from-gray-50 to-white p-3 rounded-lg border border-gray-200">
                <div className="flex items-center gap-2 mb-1">
                  <FiCalendar className="w-3 h-3 text-gray-400" />
                  <p className="text-xs text-gray-600">Déploiement</p>
                </div>
                <p className="text-sm text-gray-900">
                  {infoSysteme?.date_deploiement ? 
                    new Date(infoSysteme.date_deploiement).toLocaleDateString('fr-FR') : 'N/A'
                  }
                </p>
              </div>
              
              <div className="bg-gradient-to-br from-gray-50 to-white p-3 rounded-lg border border-gray-200">
                <div className="flex items-center gap-2 mb-1">
                  <FiClock className="w-3 h-3 text-gray-400" />
                  <p className="text-xs text-gray-600">Uptime</p>
                </div>
                <p className="text-sm text-gray-900 font-medium">
                  {getUptimeDisplay(infoSysteme?.date_deploiement)}
                </p>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-blue-50 to-white p-3 rounded-lg border border-blue-100">
              <div className="flex items-center gap-2 mb-1">
                <FiClock className="w-3 h-3 text-blue-400" />
                <p className="text-xs text-gray-600">Dernière mise à jour</p>
              </div>
              <p className="text-sm text-gray-900">
                {infoSysteme?.derniere_maj ? 
                  new Date(infoSysteme.derniere_maj).toLocaleString('fr-FR') : 'N/A'
                }
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-200">
              <button
                onClick={handleMaintenanceClick}
                className={`px-3 py-2 rounded-lg transition-all duration-300 font-medium text-sm flex items-center justify-center gap-1.5 ${
                  infoSysteme?.etat_systeme === 'maintenance'
                    ? 'bg-gradient-to-r from-green-600 to-green-500 text-white hover:from-green-700 hover:to-green-600 hover:shadow'
                    : 'bg-gradient-to-r from-amber-600 to-amber-500 text-white hover:from-amber-700 hover:to-amber-600 hover:shadow'
                }`}
              >
                {infoSysteme?.etat_systeme === 'maintenance' ? (
                  <>
                    <FiPlay className="w-3 h-3" />
                    Reprendre
                  </>
                ) : (
                  <>
                    <FiPause className="w-3 h-3" />
                    Maintenance
                  </>
                )}
              </button>
              
              <button
                onClick={() => handleChangerEtat('arret')}
                disabled={infoSysteme?.etat_systeme === 'arret'}
                className={`px-3 py-2 rounded-lg transition-all duration-300 font-medium text-sm flex items-center justify-center gap-1.5 ${
                  infoSysteme?.etat_systeme === 'arret'
                    ? 'bg-gradient-to-r from-gray-400 to-gray-300 text-white cursor-not-allowed'
                    : 'bg-gradient-to-r from-red-600 to-red-500 text-white hover:from-red-700 hover:to-red-600 hover:shadow'
                }`}
              >
                <FiStopCircle className="w-3 h-3" />
                Arrêter
              </button>
            </div>
          </div>
        </div>

        {/* Performances - UNIQUEMENT SI STATISTIQUES DISPONIBLES */}
        {statistiques ? (
          <>
            {/* Cartes pour les statistiques disponibles */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow transition-shadow duration-300">
              <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-gradient-to-br from-blue-50 to-blue-100 rounded">
                    <TbChartInfographic className="w-4 h-4 text-blue-600" />
                  </div>
                  <h2 className="text-sm font-semibold text-gray-900">Tâches</h2>
                </div>
              </div>
              
              <div className="p-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gradient-to-br from-purple-50 to-white p-3 rounded-lg border border-purple-100">
                    <div className="flex items-center gap-2 mb-1">
                      <TbSettingsAutomation className="w-3 h-3 text-purple-400" />
                      <p className="text-xs text-gray-600">Tâches actives</p>
                    </div>
                    <p className="text-lg font-bold text-purple-600">
                      {getStatValue('taches_actives', 0)}
                    </p>
                  </div>
                  
                  <div className="bg-gradient-to-br from-orange-50 to-white p-3 rounded-lg border border-orange-100">
                    <div className="flex items-center gap-2 mb-1">
                      <FiDatabase className="w-3 h-3 text-orange-400" />
                      <p className="text-xs text-gray-600">Total tâches</p>
                    </div>
                    <p className="text-lg font-bold text-orange-600">
                      {getStatValue('total_taches', 0)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Statistiques d'usage */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow transition-shadow duration-300">
              <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-gradient-to-br from-emerald-50 to-emerald-100 rounded">
                    <FiBarChart2 className="w-4 h-4 text-emerald-600" />
                  </div>
                  <h2 className="text-sm font-semibold text-gray-900">Système</h2>
                </div>
              </div>
              
              <div className="p-4">
                <div className="space-y-3">
                  <div className="bg-gradient-to-br from-blue-50 to-white p-3 rounded-lg border border-blue-100">
                    <p className="text-xs text-gray-600 mb-1">Dernière vérification</p>
                    <p className="text-sm text-gray-900">
                      {new Date().toLocaleString('fr-FR')}
                    </p>
                  </div>
                  
                  <div className="bg-gradient-to-br from-gray-50 to-white p-3 rounded-lg border border-gray-200">
                    <p className="text-xs text-gray-600 mb-1">Statut des services</p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <p className="text-xs text-gray-700">Tous les services sont opérationnels</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          // Si pas de statistiques, afficher les 2 cartes vides
          <>
            <div className="bg-gradient-to-br from-gray-50 to-white rounded-lg border border-gray-200 p-6 text-center hover:shadow transition-shadow duration-300">
              <div className="w-12 h-12 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-3">
                <TbChartInfographic className="w-6 h-6 text-gray-400" />
              </div>
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Données non disponibles</h3>
              <p className="text-xs text-gray-600 mb-3">
                Les métriques système sont temporairement indisponibles.
              </p>
              <button
                onClick={fetchStatistiques}
                className="px-3 py-1.5 bg-gradient-to-r from-gray-600 to-gray-500 text-white rounded hover:from-gray-700 hover:to-gray-600 transition-all duration-200 text-xs font-medium shadow-sm"
              >
                Réessayer
              </button>
            </div>

            <div className="bg-gradient-to-br from-gray-50 to-white rounded-lg border border-gray-200 p-6 text-center hover:shadow transition-shadow duration-300">
              <div className="w-12 h-12 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-3">
                <FiBarChart2 className="w-6 h-6 text-gray-400" />
              </div>
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Statistiques non disponibles</h3>
              <p className="text-xs text-gray-600 mb-3">
                Les données d'usage sont temporairement indisponibles.
              </p>
              <button
                onClick={fetchStatistiques}
                className="px-3 py-1.5 bg-gradient-to-r from-gray-600 to-gray-500 text-white rounded hover:from-gray-700 hover:to-gray-600 transition-all duration-200 text-xs font-medium shadow-sm"
              >
                Réessayer
              </button>
            </div>
          </>
        )}
      </div>

      {/* Section de logs - UNIQUEMENT SI DISPONIBLE DANS L'API */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow transition-shadow duration-300 mb-6">
        <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-gradient-to-br from-indigo-50 to-indigo-100 rounded">
              <FiTerminal className="w-4 h-4 text-indigo-600" />
            </div>
            <h2 className="text-sm font-semibold text-gray-900">Informations du Système</h2>
          </div>
        </div>
        
        <div className="p-4">
          <div className="space-y-3">
            <div className="bg-gradient-to-br from-blue-50 to-white p-3 rounded-lg border border-blue-100">
              <div className="flex items-center gap-2">
                <FiInfo className="w-4 h-4 text-blue-500" />
                <div>
                  <p className="text-sm text-gray-900">Interface d'administration</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Gestion complète du système Somane ERP
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-green-50 to-white p-3 rounded-lg border border-green-100">
              <div className="flex items-center gap-2">
                <FiShield className="w-4 h-4 text-green-500" />
                <div>
                  <p className="text-sm text-gray-900">Sécurité</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Système sécurisé avec journalisation des activités
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de maintenance */}
      {showMaintenanceModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-3 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-lg w-full max-w-md shadow-xl">
            <div className="sticky top-0 bg-gradient-to-r from-amber-600 to-amber-500 text-white rounded-t-lg p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-white/20 backdrop-blur-sm rounded">
                    <FiPause className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold">Activer le mode maintenance</h2>
                    <p className="text-amber-100 text-xs mt-0.5">Somane ERP</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowMaintenanceModal(false)}
                  className="p-1 hover:bg-white/20 rounded transition-colors"
                >
                  <FiX size={18} />
                </button>
              </div>
            </div>
            
            <div className="p-4 space-y-4">
              <div className="bg-gradient-to-br from-amber-50 to-white rounded-lg p-3 border border-amber-100">
                <div className="flex items-center gap-2 mb-2">
                  <FiAlertCircle className="w-4 h-4 text-amber-600" />
                  <p className="text-sm font-medium text-gray-900">Avertissement</p>
                </div>
                <p className="text-xs text-gray-600">
                  Le mode maintenance empêchera les utilisateurs d'accéder au système. 
                  Un message personnalisé sera affiché.
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  Message de maintenance
                </label>
                <textarea
                  value={maintenanceMessage}
                  onChange={(e) => setMaintenanceMessage(e.target.value)}
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm"
                  placeholder="Ex: Maintenance planifiée. Retour prévu à 14h00."
                />
              </div>
              
              <div className="flex justify-end gap-2 pt-3 border-t border-gray-200">
                <button
                  onClick={() => {
                    setShowMaintenanceModal(false);
                    setMaintenanceMessage('');
                  }}
                  className="px-4 py-1.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-all duration-200 font-medium text-sm hover:shadow-sm"
                >
                  Annuler
                </button>
                <button
                  onClick={() => handleChangerEtat('maintenance')}
                  className="px-4 py-1.5 bg-gradient-to-r from-amber-600 to-amber-500 text-white rounded-lg hover:from-amber-700 hover:to-amber-600 transition-all duration-200 font-medium flex items-center gap-1.5 text-sm shadow hover:shadow-md"
                >
                  <FiPause size={14} />
                  Activer Maintenance
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de détail de log */}
      {showLogDetailModal && selectedLog && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-3 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-lg w-full max-w-md shadow-xl">
            <div className="sticky top-0 bg-gradient-to-r from-gray-600 to-gray-500 text-white rounded-t-lg p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-white/20 backdrop-blur-sm rounded">
                    {getLogIcon(selectedLog.niveau)}
                  </div>
                  <div>
                    <h2 className="text-base font-bold">Détail de l'événement</h2>
                    <p className="text-gray-100 text-xs mt-0.5">Journal système</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowLogDetailModal(false)}
                  className="p-1 hover:bg-white/20 rounded transition-colors"
                >
                  <FiX size={18} />
                </button>
              </div>
            </div>
            
            <div className="p-4 space-y-4">
              <div className="bg-gradient-to-br from-gray-50 to-white rounded-lg p-3 border border-gray-200">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`p-1.5 rounded ${getLogColor(selectedLog.niveau)}`}>
                    {getLogIcon(selectedLog.niveau)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{selectedLog.message}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {new Date(selectedLog.timestamp).toLocaleString('fr-FR')}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gradient-to-br from-blue-50 to-white rounded-lg p-3 border border-blue-100">
                  <p className="text-xs text-gray-600 mb-1">Niveau</p>
                  <p className={`text-sm font-medium ${
                    selectedLog.niveau === 'ERROR' ? 'text-red-600' :
                    selectedLog.niveau === 'WARNING' ? 'text-amber-600' :
                    'text-blue-600'
                  }`}>
                    {selectedLog.niveau}
                  </p>
                </div>
                
                <div className="bg-gradient-to-br from-purple-50 to-white rounded-lg p-3 border border-purple-100">
                  <p className="text-xs text-gray-600 mb-1">Horodatage</p>
                  <p className="text-sm text-gray-900 font-medium">
                    {new Date(selectedLog.timestamp).toLocaleTimeString('fr-FR')}
                  </p>
                </div>
              </div>
              
              <div className="flex justify-end pt-3 border-t border-gray-200">
                <button
                  onClick={() => setShowLogDetailModal(false)}
                  className="px-4 py-1.5 bg-gradient-to-r from-gray-600 to-gray-500 text-white rounded hover:from-gray-700 hover:to-gray-600 transition-all duration-200 font-medium text-sm shadow-sm"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}