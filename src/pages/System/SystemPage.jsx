import React, { useState, useEffect } from 'react';
import { apiClient } from '../../services/apiClient';

export default function SystemPage() {
  const [infoSysteme, setInfoSysteme] = useState(null);
  const [statistiques, setStatistiques] = useState(null);
  const [statistiquesError, setStatistiquesError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState('');

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
      setStatistiques(null); // Explicitement null en cas d'erreur
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
        return 'bg-green-100 text-green-800 border-green-200';
      case 'maintenance':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'arret':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
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

  // Fonction pour afficher les valeurs de statistiques avec fallback
  const getStatValue = (key, fallback = 'N/A') => {
    return statistiques && statistiques[key] !== undefined ? statistiques[key] : fallback;
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex justify-center items-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2">Chargement des informations système...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Informations Système</h1>
          <p className="text-gray-600 mt-1">
            État et statistiques du système Somane ERP
          </p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={handleRetry}
            className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Actualiser
          </button>
        </div>
      </div>

      {/* Message d'erreur principal */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-red-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span className="text-red-800 font-medium">{error}</span>
            </div>
            <button
              onClick={handleRetry}
              className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 transition-colors"
            >
              Réessayer
            </button>
          </div>
        </div>
      )}

      {/* Message d'avertissement pour les statistiques */}
      {statistiquesError && (
        <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-yellow-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span className="text-yellow-800">{statistiquesError}</span>
          </div>
        </div>
      )}

      {/* Carte d'état du système */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* État du système */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-300 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800">État du Système</h2>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getEtatColor(infoSysteme?.etat_systeme)}`}>
              {getEtatDisplay(infoSysteme?.etat_systeme)}
            </span>
          </div>
          
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Version</span>
              <span className="text-sm font-mono font-medium text-gray-800">
                v{infoSysteme?.version || 'N/A'}
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Build</span>
              <span className="text-sm font-mono text-gray-600">
                {infoSysteme?.numero_build || 'N/A'}
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Déploiement</span>
              <span className="text-sm text-gray-600">
                {infoSysteme?.date_deploiement ? 
                  new Date(infoSysteme.date_deploiement).toLocaleDateString('fr-FR') : 'N/A'
                }
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Uptime</span>
              <span className="text-sm text-gray-600">
                {getUptimeDisplay(infoSysteme?.date_deploiement)}
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Dernière mise à jour</span>
              <span className="text-sm text-gray-600">
                {infoSysteme?.derniere_maj ? 
                  new Date(infoSysteme.derniere_maj).toLocaleString('fr-FR') : 'N/A'
                }
              </span>
            </div>
          </div>

          <div className="mt-6 flex space-x-3">
            <button
              onClick={handleMaintenanceClick}
              className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                infoSysteme?.etat_systeme === 'maintenance'
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-yellow-600 text-white hover:bg-yellow-700'
              }`}
            >
              {infoSysteme?.etat_systeme === 'maintenance' ? 'Reprendre le service' : 'Mode Maintenance'}
            </button>
            
            <button
              onClick={() => handleChangerEtat('arret')}
              disabled={infoSysteme?.etat_systeme === 'arret'}
              className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                infoSysteme?.etat_systeme === 'arret'
                  ? 'bg-gray-400 text-white cursor-not-allowed'
                  : 'bg-red-600 text-white hover:bg-red-700'
              }`}
            >
              Arrêter
            </button>
          </div>
        </div>

        {/* Performances - AFFICHÉ UNIQUEMENT SI DES STATISTIQUES SONT DISPONIBLES */}
        {statistiques && (
          <>
            {/* Performances */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-300 p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Performances</h2>
              
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm text-gray-600">Utilisation CPU</span>
                    <span className="text-sm font-medium text-gray-800">
                      {getStatValue('cpu_usage', 0)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(getStatValue('cpu_usage', 0), 100)}%` }}
                    ></div>
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm text-gray-600">Utilisation Mémoire</span>
                    <span className="text-sm font-medium text-gray-800">
                      {getStatValue('memory_usage', 0)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(getStatValue('memory_usage', 0), 100)}%` }}
                    ></div>
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm text-gray-600">Espace disque</span>
                    <span className="text-sm font-medium text-gray-800">
                      {getStatValue('disk_usage', 0)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(getStatValue('disk_usage', 0), 100)}%` }}
                    ></div>
                  </div>
                </div>
                
                <div className="pt-2 border-t border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Temps de réponse</span>
                    <span className="text-sm font-medium text-gray-800">
                      {getStatValue('response_time', 0)}ms
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Statistiques d'usage */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-300 p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Statistiques d'Usage</h2>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Utilisateurs actifs</span>
                  <span className="text-sm font-medium text-gray-800">
                    {getStatValue('utilisateurs_actifs', 0)}
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Tâches actives</span>
                  <span className="text-sm font-medium text-gray-800">
                    {getStatValue('taches_actives', 0)}
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Total tâches</span>
                  <span className="text-sm font-medium text-gray-800">
                    {getStatValue('total_taches', 0)}
                  </span>
                </div>
                
                <div className="pt-2 border-t border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Requêtes aujourd'hui</span>
                    <span className="text-sm font-medium text-gray-800">
                      {getStatValue('requetes_aujourdhui', 0)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Message si pas de statistiques */}
        {!statistiques && !statistiquesError && (
          <div className="lg:col-span-2 bg-gray-50 rounded-lg border border-gray-200 p-8 text-center">
            <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Statistiques non disponibles</h3>
            <p className="text-gray-600 mb-4">
              Les données de performance et d'usage ne sont pas accessibles pour le moment.
            </p>
            <button
              onClick={fetchStatistiques}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Réessayer
            </button>
          </div>
        )}
      </div>

      {/* Logs système récents - AFFICHÉ UNIQUEMENT SI DES LOGS SONT DISPONIBLES */}
      {statistiques?.logs_recents && statistiques.logs_recents.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-300 overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-800">Activité Récente</h2>
          </div>
          
          <div className="p-6">
            <div className="space-y-3">
              {statistiques.logs_recents.slice(0, 5).map((log, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`w-2 h-2 rounded-full ${
                      log.niveau === 'ERROR' ? 'bg-red-500' :
                      log.niveau === 'WARNING' ? 'bg-yellow-500' :
                      'bg-green-500'
                    }`}></div>
                    <span className="text-sm text-gray-700">{log.message}</span>
                  </div>
                  <span className="text-xs text-gray-500">
                    {new Date(log.timestamp).toLocaleTimeString('fr-FR')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal de maintenance */}
      {showMaintenanceModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg w-full max-w-md">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-800">Activer le mode maintenance</h2>
            </div>
            
            <div className="p-6">
              <p className="text-sm text-gray-600 mb-4">
                Le mode maintenance empêchera les utilisateurs d'accéder au système. 
                Un message personnalisé sera affiché.
              </p>
              
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Message de maintenance
              </label>
              <textarea
                value={maintenanceMessage}
                onChange={(e) => setMaintenanceMessage(e.target.value)}
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Ex: Maintenance planifiée. Retour prévu à 14h00."
              />
              
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowMaintenanceModal(false);
                    setMaintenanceMessage('');
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={() => handleChangerEtat('maintenance')}
                  className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
                >
                  Activer Maintenance
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}