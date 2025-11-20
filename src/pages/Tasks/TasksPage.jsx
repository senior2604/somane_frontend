import React, { useState, useEffect } from 'react';
import { apiClient } from '../../services/apiClient';

export default function TasksPage() {
  const [taches, setTaches] = useState([]);
  const [entites, setEntites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingTache, setEditingTache] = useState(null);
  const [showLogs, setShowLogs] = useState(false);
  const [selectedTache, setSelectedTache] = useState(null);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEntite, setFilterEntite] = useState('');
  const [filterFrequence, setFilterFrequence] = useState('');
  const [filterStatut, setFilterStatut] = useState('');

  useEffect(() => {
    fetchTaches();
    fetchEntites();
  }, []);

  const fetchTaches = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.get('/taches/');
      
      let tachesData = [];
      if (Array.isArray(response)) {
        tachesData = response;
      } else if (response && Array.isArray(response.results)) {
        tachesData = response.results;
      } else {
        setError('Format de données inattendu');
        tachesData = [];
      }

      setTaches(tachesData);
    } catch (err) {
      console.error('❌ Erreur lors du chargement des tâches:', err);
      setError('Erreur lors du chargement des tâches automatiques');
    } finally {
      setLoading(false);
    }
  };

  const fetchEntites = async () => {
    try {
      const response = await apiClient.get('/entites/');
      
      let entitesData = [];
      if (Array.isArray(response)) {
        entitesData = response;
      } else if (response && Array.isArray(response.results)) {
        entitesData = response.results;
      } else {
        entitesData = [];
      }

      setEntites(entitesData);
    } catch (err) {
      console.error('Error fetching entites:', err);
      setEntites([]);
    }
  };

  // Filtrage et recherche
  const filteredTaches = taches.filter(tache => {
    const matchesSearch = 
      tache.nom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tache.modele_cible?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tache.fonction?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesEntite = filterEntite === '' || 
      (tache.entite && tache.entite.id.toString() === filterEntite) ||
      (filterEntite === 'global' && !tache.entite);
    
    const matchesFrequence = filterFrequence === '' || 
      tache.frequence === filterFrequence;
    
    const matchesStatut = filterStatut === '' || 
      tache.active.toString() === filterStatut;
    
    return matchesSearch && matchesEntite && matchesFrequence && matchesStatut;
  });

  // Calculs pour la pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentTaches = Array.isArray(filteredTaches) ? filteredTaches.slice(indexOfFirstItem, indexOfLastItem) : [];
  const totalPages = Math.ceil((Array.isArray(filteredTaches) ? filteredTaches.length : 0) / itemsPerPage);

  // Changement de page
  const paginate = (pageNumber) => setCurrentPage(pageNumber);
  const nextPage = () => currentPage < totalPages && setCurrentPage(currentPage + 1);
  const prevPage = () => currentPage > 1 && setCurrentPage(currentPage - 1);

  // Gestion des actions
  const handleNewTache = () => {
    setEditingTache(null);
    setShowForm(true);
  };

  const handleEdit = (tache) => {
    setEditingTache(tache);
    setShowForm(true);
  };

  const handleDelete = async (tache) => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer la tâche "${tache.nom}" ?`)) {
      try {
        await apiClient.delete(`/taches/${tache.id}/`);
        fetchTaches();
      } catch (err) {
        setError('Erreur lors de la suppression');
        console.error('Error deleting tache:', err);
      }
    }
  };

  const handleToggleActive = async (tache) => {
    try {
      await apiClient.patch(`/taches/${tache.id}/`, {
        active: !tache.active
      });
      fetchTaches();
    } catch (err) {
      setError('Erreur lors de la modification');
      console.error('Error toggling active:', err);
    }
  };

  const handleExecuteNow = async (tache) => {
    try {
      setError(null);
      await apiClient.post(`/taches/${tache.id}/executer-now/`);
      // Recharger pour avoir la date de dernière exécution
      setTimeout(() => fetchTaches(), 1000);
    } catch (err) {
      setError('Erreur lors de l\'exécution manuelle');
      console.error('Error executing task:', err);
    }
  };

  const handleShowLogs = (tache) => {
    setSelectedTache(tache);
    setShowLogs(true);
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingTache(null);
    fetchTaches();
  };

  const handleRetry = () => {
    fetchTaches();
  };

  const getFrequenceDisplay = (frequence) => {
    const frequences = {
      'hourly': 'Toutes les heures',
      'daily': 'Quotidienne',
      'weekly': 'Hebdomadaire',
      'monthly': 'Mensuelle'
    };
    return frequences[frequence] || frequence;
  };

  const getStatutProchaineExecution = (tache) => {
    if (!tache.active) return 'Inactive';
    
    const maintenant = new Date();
    const prochaine = new Date(tache.prochaine_execution);
    
    if (prochaine < maintenant) {
      return 'En retard';
    }
    
    const diffHeures = (prochaine - maintenant) / (1000 * 60 * 60);
    if (diffHeures < 1) {
      return 'Bientôt';
    }
    
    return 'Planifiée';
  };

  const getStatutColor = (statut) => {
    switch (statut) {
      case 'Bientôt': return 'text-orange-600 bg-orange-100';
      case 'En retard': return 'text-red-600 bg-red-100';
      case 'Planifiée': return 'text-green-600 bg-green-100';
      case 'Inactive': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex justify-center items-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2">Chargement des tâches automatiques...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Tâches Automatiques</h1>
          <p className="text-gray-600 mt-1">
            {filteredTaches.length} tâche(s) trouvée(s)
            {(searchTerm || filterEntite || filterFrequence || filterStatut) && ' • Filtres actifs'}
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
          <button 
            onClick={handleNewTache}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nouvelle Tâche
          </button>
        </div>
      </div>

      {/* Message d'erreur */}
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

      {/* Filtres et Recherche */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-300 p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Rechercher</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Nom, modèle, fonction..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Portée</label>
            <select
              value={filterEntite}
              onChange={(e) => setFilterEntite(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Toutes les portées</option>
              <option value="global">Tâches globales</option>
              {entites.map(entite => (
                <option key={entite.id} value={entite.id}>
                  {entite.raison_sociale}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Fréquence</label>
            <select
              value={filterFrequence}
              onChange={(e) => setFilterFrequence(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Toutes les fréquences</option>
              <option value="hourly">Toutes les heures</option>
              <option value="daily">Quotidienne</option>
              <option value="weekly">Hebdomadaire</option>
              <option value="monthly">Mensuelle</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Statut</label>
            <select
              value={filterStatut}
              onChange={(e) => setFilterStatut(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Tous les statuts</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <button
            onClick={() => {
              setSearchTerm('');
              setFilterEntite('');
              setFilterFrequence('');
              setFilterStatut('');
              setCurrentPage(1);
            }}
            className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors border border-gray-300"
          >
            Réinitialiser
          </button>
        </div>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-300 p-4">
          <div className="text-2xl font-bold text-blue-600">{taches.length}</div>
          <div className="text-sm text-gray-600">Total des tâches</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-300 p-4">
          <div className="text-2xl font-bold text-green-600">
            {taches.filter(t => t.active).length}
          </div>
          <div className="text-sm text-gray-600">Tâches actives</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-300 p-4">
          <div className="text-2xl font-bold text-purple-600">
            {taches.filter(t => !t.entite).length}
          </div>
          <div className="text-sm text-gray-600">Tâches globales</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-300 p-4">
          <div className="text-2xl font-bold text-orange-600">
            {taches.filter(t => {
              if (!t.active) return false;
              const maintenant = new Date();
              const prochaine = new Date(t.prochaine_execution);
              return prochaine < maintenant;
            }).length}
          </div>
          <div className="text-sm text-gray-600">En retard</div>
        </div>
      </div>

      {/* Tableau */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-300 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-300">
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 border-r border-gray-300">
                  Nom
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 border-r border-gray-300">
                  Portée
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 border-r border-gray-300">
                  Fréquence
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 border-r border-gray-300">
                  Modèle cible
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 border-r border-gray-300">
                  Dernière exécution
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 border-r border-gray-300">
                  Prochaine exécution
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 border-r border-gray-300">
                  Statut
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {currentTaches.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-8 text-center text-gray-500 border-b border-gray-300">
                    {taches.length === 0 ? 'Aucune tâche trouvée' : 'Aucun résultat pour votre recherche'}
                  </td>
                </tr>
              ) : (
                currentTaches.map((tache, index) => (
                  <tr 
                    key={tache.id} 
                    className={`${
                      index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                    } hover:bg-gray-100 transition-colors border-b border-gray-300`}
                  >
                    <td className="px-6 py-4 border-r border-gray-300">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-900">
                          {tache.nom}
                        </span>
                        <span className="text-xs text-gray-500">
                          {tache.fonction}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 border-r border-gray-300">
                      {tache.entite ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {tache.entite.raison_sociale}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Global
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 border-r border-gray-300">
                      {getFrequenceDisplay(tache.frequence)}
                      {tache.heure_execution && (
                        <div className="text-xs text-gray-400">
                          à {tache.heure_execution}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 border-r border-gray-300">
                      <span className="font-mono bg-gray-50 px-2 py-1 rounded border text-xs">
                        {tache.modele_cible}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 border-r border-gray-300">
                      {tache.derniere_execution ? (
                        <div>
                          {new Date(tache.derniere_execution).toLocaleDateString('fr-FR')}
                          <br />
                          <span className="text-xs text-gray-400">
                            {new Date(tache.derniere_execution).toLocaleTimeString('fr-FR')}
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-400">Jamais</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 border-r border-gray-300">
                      {tache.prochaine_execution ? (
                        <div>
                          {new Date(tache.prochaine_execution).toLocaleDateString('fr-FR')}
                          <br />
                          <span className="text-xs text-gray-400">
                            {new Date(tache.prochaine_execution).toLocaleTimeString('fr-FR')}
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 border-r border-gray-300">
                      <div className="flex flex-col space-y-1">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          tache.active 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {tache.active ? 'Active' : 'Inactive'}
                        </span>
                        {tache.active && (
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatutColor(getStatutProchaineExecution(tache))}`}>
                            {getStatutProchaineExecution(tache)}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col space-y-2">
                        <div className="flex space-x-2">
                          <button 
                            onClick={() => handleToggleActive(tache)}
                            className={`text-xs font-medium transition-colors flex items-center gap-1 ${
                              tache.active 
                                ? 'text-orange-600 hover:text-orange-800' 
                                : 'text-green-600 hover:text-green-800'
                            }`}
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              {tache.active ? (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              ) : (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                              )}
                            </svg>
                            {tache.active ? 'Désactiver' : 'Activer'}
                          </button>
                          <button 
                            onClick={() => handleExecuteNow(tache)}
                            disabled={!tache.active}
                            className={`text-xs font-medium transition-colors flex items-center gap-1 ${
                              tache.active 
                                ? 'text-purple-600 hover:text-purple-800' 
                                : 'text-gray-400 cursor-not-allowed'
                            }`}
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                            </svg>
                            Exécuter
                          </button>
                        </div>
                        <div className="flex space-x-2">
                          <button 
                            onClick={() => handleShowLogs(tache)}
                            className="text-blue-600 hover:text-blue-800 text-xs font-medium transition-colors flex items-center gap-1"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            Logs
                          </button>
                          <button 
                            onClick={() => handleEdit(tache)}
                            className="text-blue-600 hover:text-blue-800 text-xs font-medium transition-colors flex items-center gap-1"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Éditer
                          </button>
                          <button 
                            onClick={() => handleDelete(tache)}
                            className="text-red-600 hover:text-red-800 text-xs font-medium transition-colors flex items-center gap-1"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Supprimer
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {filteredTaches.length > 0 && (
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-300">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-700">
                  Lignes par page:
                </span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="border border-gray-300 rounded px-3 py-1 text-sm"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
                <span className="text-sm text-gray-700">
                  {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredTaches.length)} sur {filteredTaches.length}
                </span>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={prevPage}
                  disabled={currentPage === 1}
                  className={`px-3 py-1 rounded border text-sm ${
                    currentPage === 1
                      ? 'bg-gray-100 text-gray-400 border-gray-300 cursor-not-allowed'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  Précédent
                </button>

                {/* Numéros de page */}
                <div className="flex space-x-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNumber;
                    if (totalPages <= 5) {
                      pageNumber = i + 1;
                    } else if (currentPage <= 3) {
                      pageNumber = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNumber = totalPages - 4 + i;
                    } else {
                      pageNumber = currentPage - 2 + i;
                    }

                    return (
                      <button
                        key={pageNumber}
                        onClick={() => paginate(pageNumber)}
                        className={`w-8 h-8 rounded border text-sm ${
                          currentPage === pageNumber
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {pageNumber}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={nextPage}
                  disabled={currentPage === totalPages}
                  className={`px-3 py-1 rounded border text-sm ${
                    currentPage === totalPages
                      ? 'bg-gray-100 text-gray-400 border-gray-300 cursor-not-allowed'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  Suivant
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Formulaire Modal */}
      {showForm && (
        <TacheFormModal
          tache={editingTache}
          entites={entites}
          onClose={() => {
            setShowForm(false);
            setEditingTache(null);
          }}
          onSuccess={handleFormSuccess}
        />
      )}

      {/* Modal des logs */}
      {showLogs && (
        <LogsModal
          tache={selectedTache}
          onClose={() => {
            setShowLogs(false);
            setSelectedTache(null);
          }}
        />
      )}
    </div>
  );
}

// Composant Modal pour le formulaire des tâches - VERSION CORRIGÉE
function TacheFormModal({ tache, entites, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    nom: tache?.nom || '',
    modele_cible: tache?.modele_cible || '',
    fonction: tache?.fonction || '',
    frequence: tache?.frequence || 'daily',
    heure_execution: tache?.heure_execution || '00:00',
    entite: tache?.entite?.id || '',
    active: tache?.active ?? true,
    description: tache?.description || ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fonction pour calculer la prochaine exécution
  const calculerProchaineExecution = (frequence, heureExecution) => {
    const maintenant = new Date();
    let prochaine = new Date();
    
    switch (frequence) {
      case 'hourly':
        prochaine.setHours(prochaine.getHours() + 1);
        prochaine.setMinutes(0);
        prochaine.setSeconds(0);
        prochaine.setMilliseconds(0);
        break;
      case 'daily':
        prochaine.setDate(prochaine.getDate() + 1);
        if (heureExecution) {
          const [heures, minutes] = heureExecution.split(':');
          prochaine.setHours(parseInt(heures), parseInt(minutes), 0, 0);
        } else {
          prochaine.setHours(0, 0, 0, 0);
        }
        break;
      case 'weekly':
        prochaine.setDate(prochaine.getDate() + 7);
        if (heureExecution) {
          const [heures, minutes] = heureExecution.split(':');
          prochaine.setHours(parseInt(heures), parseInt(minutes), 0, 0);
        } else {
          prochaine.setHours(0, 0, 0, 0);
        }
        break;
      case 'monthly':
        prochaine.setMonth(prochaine.getMonth() + 1);
        if (heureExecution) {
          const [heures, minutes] = heureExecution.split(':');
          prochaine.setHours(parseInt(heures), parseInt(minutes), 0, 0);
        } else {
          prochaine.setHours(0, 0, 0, 0);
        }
        break;
      default:
        prochaine.setDate(prochaine.getDate() + 1);
        prochaine.setHours(0, 0, 0, 0);
    }
    
    return prochaine.toISOString();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validation
    if (!formData.nom || !formData.modele_cible || !formData.fonction) {
      setError('Tous les champs obligatoires doivent être remplis');
      setLoading(false);
      return;
    }

    try {
      // Calculer la prochaine exécution
      const prochaineExecution = calculerProchaineExecution(
        formData.frequence, 
        formData.heure_execution
      );

      const payload = {
        nom: formData.nom,
        modele_cible: formData.modele_cible,
        fonction: formData.fonction,
        frequence: formData.frequence,
        heure_execution: formData.heure_execution || null,
        entite: formData.entite || null,
        active: formData.active,
        prochaine_execution: prochaineExecution, // CHAMP OBLIGATOIRE AJOUTÉ
        derniere_execution: null
      };

      console.log('📤 Payload envoyé:', payload);

      const url = tache 
        ? `/taches/${tache.id}/`
        : `/taches/`;
      
      const method = tache ? 'PUT' : 'POST';

      const response = await apiClient.request(url, {
        method: method,
        body: JSON.stringify(payload),
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log('✅ Tâche sauvegardée:', response);
      onSuccess();
    } catch (err) {
      console.error('❌ Erreur sauvegarde:', err);
      
      // Affiche plus de détails sur l'erreur
      let errorMessage = 'Erreur lors de la sauvegarde';
      if (err.response?.data) {
        errorMessage = `Erreur ${err.response.status}: ${JSON.stringify(err.response.data)}`;
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800">
            {tache ? 'Modifier la tâche' : 'Créer une nouvelle tâche'}
          </h2>
        </div>
        
        {error && (
          <div className="mx-6 mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-red-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span className="text-red-800 text-sm">{error}</span>
            </div>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Nom */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nom de la tâche *
              </label>
              <input
                type="text"
                required
                value={formData.nom}
                onChange={(e) => handleChange('nom', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Ex: Nettoyage des anciennes données"
              />
            </div>
            
            {/* Modèle cible */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Modèle cible *
              </label>
              <input
                type="text"
                required
                value={formData.modele_cible}
                onChange={(e) => handleChange('modele_cible', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                placeholder="Ex: core.Partenaire"
              />
              <p className="text-xs text-gray-500 mt-1">
                Format: application.Modele
              </p>
            </div>
            
            {/* Fonction */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fonction *
              </label>
              <input
                type="text"
                required
                value={formData.fonction}
                onChange={(e) => handleChange('fonction', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Ex: nettoyer_anciennes_donnees"
              />
              <p className="text-xs text-gray-500 mt-1">
                Nom de la fonction à exécuter
              </p>
            </div>
            
            {/* Fréquence */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fréquence *
              </label>
              <select
                required
                value={formData.frequence}
                onChange={(e) => handleChange('frequence', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="hourly">Toutes les heures</option>
                <option value="daily">Quotidienne</option>
                <option value="weekly">Hebdomadaire</option>
                <option value="monthly">Mensuelle</option>
              </select>
            </div>
            
            {/* Heure d'exécution */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Heure d'exécution
              </label>
              <input
                type="time"
                value={formData.heure_execution}
                onChange={(e) => handleChange('heure_execution', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                Pour daily/weekly/monthly
              </p>
            </div>
            
            {/* Portée */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Portée
              </label>
              <select
                value={formData.entite}
                onChange={(e) => handleChange('entite', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Tâche globale</option>
                {entites.map(entite => (
                  <option key={entite.id} value={entite.id}>
                    {entite.raison_sociale}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Active */}
            <div className="flex items-end">
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={formData.active}
                  onChange={(e) => handleChange('active', e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  Tâche active
                </span>
              </label>
            </div>
          </div>

          {/* Aperçu */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Aperçu de la tâche</h3>
            <div className="space-y-2 text-sm">
              <div><strong>Nom:</strong> {formData.nom || 'Non défini'}</div>
              <div><strong>Modèle:</strong> {formData.modele_cible || 'Non défini'}</div>
              <div><strong>Fonction:</strong> {formData.fonction || 'Non défini'}</div>
              <div><strong>Fréquence:</strong> {
                formData.frequence === 'hourly' ? 'Toutes les heures' :
                formData.frequence === 'daily' ? 'Quotidienne' :
                formData.frequence === 'weekly' ? 'Hebdomadaire' :
                formData.frequence === 'monthly' ? 'Mensuelle' : 'Non défini'
              }</div>
              <div><strong>Portée:</strong> {
                formData.entite 
                  ? entites.find(e => e.id == formData.entite)?.raison_sociale 
                  : 'Globale'
              }</div>
              <div><strong>Statut:</strong> 
                <span className={`ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                  formData.active 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {formData.active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div><strong>Prochaine exécution:</strong> {
                new Date(calculerProchaineExecution(formData.frequence, formData.heure_execution)).toLocaleString('fr-FR')
              }</div>
            </div>
          </div>
          
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors duration-200"
              disabled={loading}
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors duration-200 flex items-center space-x-2"
            >
              {loading && (
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                </svg>
              )}
              <span>{loading ? 'Sauvegarde...' : tache ? 'Mettre à jour' : 'Créer la tâche'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Composant Modal pour les logs d'exécution
function LogsModal({ tache, onClose }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, [tache]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      // Récupérer les logs de la tâche
      const response = await apiClient.get(`/taches/${tache.id}/logs/`);
      setLogs(Array.isArray(response) ? response : []);
    } catch (err) {
      console.error('Error fetching logs:', err);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[80vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-800">
              Logs d'exécution - {tache.nom}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex justify-center items-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2">Chargement des logs...</span>
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center text-gray-500 p-8">
              Aucun log disponible pour cette tâche
            </div>
          ) : (
            <div className="space-y-4">
              {logs.map((log, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      log.statut === 'succes' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {log.statut === 'succes' ? 'Succès' : 'Échec'}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(log.date_execution).toLocaleString('fr-FR')}
                    </span>
                  </div>
                  <div className="text-sm text-gray-700">
                    {log.message}
                  </div>
                  {log.erreur && (
                    <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700 font-mono">
                      {log.erreur}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}