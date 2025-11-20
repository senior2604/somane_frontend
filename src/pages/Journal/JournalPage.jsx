import React, { useState, useEffect } from 'react';
import { apiClient } from '../../services/apiClient';

export default function JournalPage() {
  const [journal, setJournal] = useState([]);
  const [utilisateurs, setUtilisateurs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterUtilisateur, setFilterUtilisateur] = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [filterStatut, setFilterStatut] = useState('');
  const [filterModele, setFilterModele] = useState('');
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');

  useEffect(() => {
    fetchJournal();
    fetchUtilisateurs();
  }, []);

  const fetchJournal = async () => {
    try {
      setLoading(true);
      setError(null);

      // Construire les paramètres de filtre
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (filterUtilisateur) params.append('utilisateur', filterUtilisateur);
      if (filterAction) params.append('action', filterAction);
      if (filterStatut) params.append('statut', filterStatut);
      if (filterModele) params.append('modele', filterModele);
      if (dateDebut) params.append('date_debut', dateDebut);
      if (dateFin) params.append('date_fin', dateFin);

      const url = `/journals/?${params.toString()}`; // ✅ CORRIGÉ : /journals/ au lieu de /journal/
      const response = await apiClient.get(url);
      
      let journalData = [];
      if (Array.isArray(response)) {
        journalData = response;
      } else if (response && Array.isArray(response.results)) {
        journalData = response.results;
      } else {
        setError('Format de données inattendu');
        journalData = [];
      }

      setJournal(journalData);
    } catch (err) {
      console.error('❌ Erreur lors du chargement du journal:', err);
      setError('Erreur lors du chargement du journal d\'activité');
    } finally {
      setLoading(false);
    }
  };

  const fetchUtilisateurs = async () => {
    try {
      const response = await apiClient.get('/users/'); // ✅ CORRIGÉ : /users/ au lieu de /utilisateurs/
      
      let utilisateursData = [];
      if (Array.isArray(response)) {
        utilisateursData = response;
      } else if (response && Array.isArray(response.results)) {
        utilisateursData = response.results;
      } else {
        utilisateursData = [];
      }

      setUtilisateurs(utilisateursData);
    } catch (err) {
      console.error('Error fetching utilisateurs:', err);
      setUtilisateurs([]);
    }
  };

  // Liste des actions possibles
  const actionsPossibles = [
    'connexion', 'deconnexion', 'creation', 'modification', 'suppression',
    'validation', 'import', 'export', 'telechargement', 'generation'
  ];

  // Liste des modèles possibles
  const modelesPossibles = [
    'Utilisateur', 'Entite', 'Partenaire', 'Banque', 'Pays', 'Devise',
    'Groupe', 'Permission', 'ParametreGeneral', 'Module'
  ];

  // Filtrage côté client (fallback si l'API ne filtre pas)
  const filteredJournal = journal.filter(journal => {
    const matchesSearch = 
      journal.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      journal.modele?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      journal.objet?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      journal.ip_address?.includes(searchTerm);
    
    const matchesUtilisateur = filterUtilisateur === '' || 
      (journal.utilisateur && journal.utilisateur.id.toString() === filterUtilisateur);
    
    const matchesAction = filterAction === '' || 
      journal.action === filterAction;
    
    const matchesStatut = filterStatut === '' || 
      journal.statut === filterStatut;
    
    const matchesModele = filterModele === '' || 
      journal.modele === filterModele;
    
    const matchesDate = () => {
      if (!dateDebut && !dateFin) return true;
      
      const dateJournal = new Date(journal.date_action);
      if (dateDebut && dateFin) {
        const debut = new Date(dateDebut);
        const fin = new Date(dateFin);
        fin.setHours(23, 59, 59, 999); // Fin de journée
        return dateJournal >= debut && dateJournal <= fin;
      }
      if (dateDebut) {
        const debut = new Date(dateDebut);
        return dateJournal >= debut;
      }
      if (dateFin) {
        const fin = new Date(dateFin);
        fin.setHours(23, 59, 59, 999);
        return dateJournal <= fin;
      }
      return true;
    };
    
    return matchesSearch && matchesUtilisateur && matchesAction && 
           matchesStatut && matchesModele && matchesDate();
  });

  // Calculs pour la pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentJournal = Array.isArray(filteredJournal) ? filteredJournal.slice(indexOfFirstItem, indexOfLastItem) : [];
  const totalPages = Math.ceil((Array.isArray(filteredJournal) ? filteredJournal.length : 0) / itemsPerPage);

  // Changement de page
  const paginate = (pageNumber) => setCurrentPage(pageNumber);
  const nextPage = () => currentPage < totalPages && setCurrentPage(currentPage + 1);
  const prevPage = () => currentPage > 1 && setCurrentPage(currentPage - 1);

  const handleRetry = () => {
    fetchJournal();
  };

  const handleExport = async () => {
    try {
      // Construire l'URL d'export avec les mêmes filtres
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (filterUtilisateur) params.append('utilisateur', filterUtilisateur);
      if (filterAction) params.append('action', filterAction);
      if (filterStatut) params.append('statut', filterStatut);
      if (filterModele) params.append('modele', filterModele);
      if (dateDebut) params.append('date_debut', dateDebut);
      if (dateFin) params.append('date_fin', dateFin);
      params.append('format', 'csv');

      const url = `/journals/export/?${params.toString()}`; // ✅ CORRIGÉ : /journals/export/ au lieu de /journal/export/
      const response = await apiClient.get(url, { responseType: 'blob' });
      
      // Télécharger le fichier
      const blob = new Blob([response], { type: 'text/csv' });
      const urlBlob = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = urlBlob;
      link.download = `journal-activite-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(urlBlob);
    } catch (err) {
      console.error('Erreur lors de l\'export:', err);
      setError('Erreur lors de l\'export du journal');
    }
  };

  const formatDateHeure = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('fr-FR');
  };

  const getActionIcon = (action) => {
    switch (action) {
      case 'creation':
        return '➕';
      case 'modification':
        return '✏️';
      case 'suppression':
        return '🗑️';
      case 'connexion':
        return '🔐';
      case 'deconnexion':
        return '🚪';
      case 'validation':
        return '✅';
      default:
        return '📄';
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex justify-center items-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2">Chargement du journal d'activité...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Journal d'Activité</h1>
          <p className="text-gray-600 mt-1">
            {filteredJournal.length} événement(s) trouvé(s)
            {(searchTerm || filterUtilisateur || filterAction || filterStatut || filterModele || dateDebut || dateFin) && ' • Filtres actifs'}
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
            onClick={handleExport}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Exporter CSV
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

      {/* Filtres avancés */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-300 p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Recherche</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Description, modèle, IP..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Utilisateur</label>
            <select
              value={filterUtilisateur}
              onChange={(e) => setFilterUtilisateur(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Tous les utilisateurs</option>
              {utilisateurs.map(utilisateur => (
                <option key={utilisateur.id} value={utilisateur.id}>
                  {utilisateur.email}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Action</label>
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Toutes les actions</option>
              {actionsPossibles.map(action => (
                <option key={action} value={action}>
                  {action.charAt(0).toUpperCase() + action.slice(1)}
                </option>
              ))}
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
              <option value="succes">Succès</option>
              <option value="echec">Échec</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Modèle</label>
            <select
              value={filterModele}
              onChange={(e) => setFilterModele(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Tous les modèles</option>
              {modelesPossibles.map(modele => (
                <option key={modele} value={modele}>
                  {modele}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Date début</label>
            <input
              type="date"
              value={dateDebut}
              onChange={(e) => setDateDebut(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Date fin</label>
            <input
              type="date"
              value={dateFin}
              onChange={(e) => setDateFin(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex items-end space-x-2">
            <button
              onClick={fetchJournal}
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Appliquer
            </button>
            <button
              onClick={() => {
                setSearchTerm('');
                setFilterUtilisateur('');
                setFilterAction('');
                setFilterStatut('');
                setFilterModele('');
                setDateDebut('');
                setDateFin('');
                setCurrentPage(1);
              }}
              className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors border border-gray-300"
            >
              Réinitialiser
            </button>
          </div>
        </div>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-300 p-4">
          <div className="text-2xl font-bold text-blue-600">{journal.length}</div>
          <div className="text-sm text-gray-600">Total événements</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-300 p-4">
          <div className="text-2xl font-bold text-green-600">
            {journal.filter(j => j.statut === 'succes').length}
          </div>
          <div className="text-sm text-gray-600">Succès</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-300 p-4">
          <div className="text-2xl font-bold text-red-600">
            {journal.filter(j => j.statut === 'echec').length}  {/* ✅ CORRIGÉ : journal au lieu de fetchJournal */}
          </div>
          <div className="text-sm text-gray-600">Échecs</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-300 p-4">
          <div className="text-2xl font-bold text-purple-600">
            {new Set(journal.map(j => j.utilisateur?.id).filter(id => id)).size}
          </div>
          <div className="text-sm text-gray-600">Utilisateurs actifs</div>
        </div>
      </div>

      {/* Tableau */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-300 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-300">
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 border-r border-gray-300">
                  Date/Heure
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 border-r border-gray-300">
                  Utilisateur
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 border-r border-gray-300">
                  Action
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 border-r border-gray-300">
                  Modèle & Objet
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 border-r border-gray-300">
                  Description
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 border-r border-gray-300">
                  Statut
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                  IP
                </th>
              </tr>
            </thead>
            <tbody>
              {currentJournal.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-8 text-center text-gray-500 border-b border-gray-300">
                    {journal.length === 0 ? 'Aucun événement dans le journal' : 'Aucun résultat pour votre recherche'}
                  </td>
                </tr>
              ) : (
                currentJournal.map((journal, index) => (
                  <tr 
                    key={journal.id} 
                    className={`${
                      index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                    } hover:bg-gray-100 transition-colors border-b border-gray-300`}
                  >
                    <td className="px-6 py-4 border-r border-gray-300">
                      <div className="text-sm text-gray-900">
                        {formatDateHeure(journal.date_action)}
                      </div>
                    </td>
                    <td className="px-6 py-4 border-r border-gray-300">
                      {journal.utilisateur ? (
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-gray-900">
                            {journal.utilisateur.email}
                          </span>
                          <span className="text-xs text-gray-500">
                            {journal.utilisateur.username}
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">Système</span>
                      )}
                    </td>
                    <td className="px-6 py-4 border-r border-gray-300">
                      <div className="flex items-center space-x-2">
                        <span className="text-lg">{getActionIcon(journal.action)}</span>
                        <span className={`text-sm font-medium capitalize ${
                          journal.action === 'suppression' ? 'text-red-600' :
                          journal.action === 'creation' ? 'text-green-600' :
                          journal.action === 'modification' ? 'text-blue-600' :
                          'text-gray-600'
                        }`}>
                          {journal.action}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 border-r border-gray-300">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-900">
                          {journal.modele}
                        </span>
                        {journal.objet && (
                          <span className="text-xs text-gray-500">
                            {journal.objet}
                          </span>
                        )}
                        {journal.objet_id && (
                          <span className="text-xs text-gray-400 font-mono">
                            ID: {journal.objet_id}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 border-r border-gray-300">
                      <div className="max-w-xs">
                        <span className="text-sm text-gray-600">
                          {journal.description}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 border-r border-gray-300">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        journal.statut === 'succes' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {journal.statut === 'succes' ? 'Succès' : 'Échec'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {journal.ip_address ? (
                        <span className="text-sm font-mono text-gray-600 bg-gray-50 px-2 py-1 rounded border">
                          {journal.ip_address}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {filteredJournal.length > 0 && (
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
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <span className="text-sm text-gray-700">
                  {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredJournal.length)} sur {filteredJournal.length}
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
    </div>
  );
}