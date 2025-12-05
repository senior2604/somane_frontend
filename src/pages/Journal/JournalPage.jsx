import React, { useState, useEffect } from 'react';
import { apiClient } from '../../services/apiClient';
import { 
  FiRefreshCw, 
  FiSearch, 
  FiFilter, 
  FiX, 
  FiCheck, 
  FiUser, 
  FiCalendar,
  FiEye,
  FiChevronLeft, 
  FiChevronRight,
  FiDownload,
  FiUpload,
  FiClock,
  FiActivity,
  FiAlertCircle,
  FiAlertTriangle,
  FiUsers,
  FiShield,
  FiDatabase,
  FiServer,
  FiGlobe,
  FiEdit,
  FiTrash,
  FiPlus,
  FiLogIn,
  FiLogOut,
  FiFileText
} from "react-icons/fi";
import { TbHistory } from "react-icons/tb";

export default function JournalPage() {
  const [journal, setJournal] = useState([]);
  const [utilisateurs, setUtilisateurs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedLog, setSelectedLog] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterUtilisateur, setFilterUtilisateur] = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [filterStatut, setFilterStatut] = useState('');
  const [filterModele, setFilterModele] = useState('');
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');
  const [selectedRows, setSelectedRows] = useState([]);

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

      const url = `/journals/?${params.toString()}`;
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
      const response = await apiClient.get('/users/');
      
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
  const filteredJournal = journal.filter(log => {
    const matchesSearch = 
      log.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.modele?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.objet?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.ip_address?.includes(searchTerm);
    
    const matchesUtilisateur = filterUtilisateur === '' || 
      (log.utilisateur && log.utilisateur.id.toString() === filterUtilisateur);
    
    const matchesAction = filterAction === '' || 
      log.action === filterAction;
    
    const matchesStatut = filterStatut === '' || 
      log.statut === filterStatut;
    
    const matchesModele = filterModele === '' || 
      log.modele === filterModele;
    
    const matchesDate = () => {
      if (!dateDebut && !dateFin) return true;
      
      const dateJournal = new Date(log.date_action);
      if (dateDebut && dateFin) {
        const debut = new Date(dateDebut);
        const fin = new Date(dateFin);
        fin.setHours(23, 59, 59, 999);
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

  // Gestion des sélections
  const toggleRowSelection = (id) => {
    setSelectedRows(prev => 
      prev.includes(id) 
        ? prev.filter(rowId => rowId !== id)
        : [...prev, id]
    );
  };

  const selectAllRows = () => {
    if (selectedRows.length === currentJournal.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(currentJournal.map(log => log.id));
    }
  };

  const handleViewDetails = (log) => {
    setSelectedLog(log);
    setShowDetailModal(true);
  };

  const handleRetry = () => {
    fetchJournal();
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setFilterUtilisateur('');
    setFilterAction('');
    setFilterStatut('');
    setFilterModele('');
    setDateDebut('');
    setDateFin('');
    setCurrentPage(1);
  };

  const handleExport = async () => {
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (filterUtilisateur) params.append('utilisateur', filterUtilisateur);
      if (filterAction) params.append('action', filterAction);
      if (filterStatut) params.append('statut', filterStatut);
      if (filterModele) params.append('modele', filterModele);
      if (dateDebut) params.append('date_debut', dateDebut);
      if (dateFin) params.append('date_fin', dateFin);
      params.append('format', 'csv');

      const url = `/journals/export/?${params.toString()}`;
      const response = await apiClient.get(url, { responseType: 'blob' });
      
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
      case 'creation': return <FiPlus className="w-4 h-4" />;
      case 'modification': return <FiEdit className="w-4 h-4" />;
      case 'suppression': return <FiTrash className="w-4 h-4" />;
      case 'connexion': return <FiLogIn className="w-4 h-4" />;
      case 'deconnexion': return <FiLogOut className="w-4 h-4" />;
      case 'validation': return <FiCheck className="w-4 h-4" />;
      case 'import': return <FiDownload className="w-4 h-4" />;
      case 'export': return <FiUpload className="w-4 h-4" />;
      default: return <FiFileText className="w-4 h-4" />;
    }
  };

  const getActionColor = (action) => {
    switch (action) {
      case 'creation': return 'text-green-600 bg-green-50 border-green-200';
      case 'modification': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'suppression': return 'text-red-600 bg-red-50 border-red-200';
      case 'connexion': return 'text-emerald-600 bg-emerald-50 border-emerald-200';
      case 'deconnexion': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'validation': return 'text-teal-600 bg-teal-50 border-teal-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="p-4 bg-gradient-to-br from-gray-50 to-white min-h-screen">
        <div className="flex flex-col items-center justify-center h-96">
          <div className="relative">
            <div className="w-12 h-12 border-3 border-gray-200 rounded-full"></div>
            <div className="absolute top-0 left-0 w-12 h-12 border-3 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
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
            <div className="p-2 bg-gradient-to-br from-purple-600 to-purple-500 rounded-lg shadow">
              <TbHistory className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Journal d'Activité</h1>
              <p className="text-gray-600 text-xs mt-0.5">
                Suivez toutes les activités du système en temps réel
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={handleRetry}
              className="px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-all duration-300 hover:shadow flex items-center gap-1.5 text-sm group"
            >
              <FiRefreshCw className="group-hover:rotate-180 transition-transform duration-500 text-sm" />
              <span className="font-medium">Actualiser</span>
            </button>
            <button 
              onClick={handleExport}
              className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-green-600 to-green-500 text-white hover:from-green-700 hover:to-green-600 transition-all duration-300 hover:shadow flex items-center gap-1.5 text-sm group shadow"
            >
              <FiDownload className="group-hover:animate-bounce text-sm" />
              <span className="font-semibold">Exporter CSV</span>
            </button>
          </div>
        </div>

        {/* Statistiques en ligne */}
        <div className="grid grid-cols-4 gap-3 mb-4">
          <div className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm hover:shadow transition-shadow duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Total événements</p>
                <p className="text-lg font-bold text-gray-900 mt-0.5">{journal.length}</p>
              </div>
              <div className="p-1.5 bg-purple-50 rounded">
                <TbHistory className="w-4 h-4 text-purple-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm hover:shadow transition-shadow duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Succès</p>
                <p className="text-lg font-bold text-green-600 mt-0.5">
                  {journal.filter(j => j.statut === 'succes').length}
                </p>
              </div>
              <div className="p-1.5 bg-green-50 rounded">
                <FiCheck className="w-4 h-4 text-green-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm hover:shadow transition-shadow duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Échecs</p>
                <p className="text-lg font-bold text-red-600 mt-0.5">
                  {journal.filter(j => j.statut === 'echec').length}
                </p>
              </div>
              <div className="p-1.5 bg-red-50 rounded">
                <FiAlertCircle className="w-4 h-4 text-red-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm hover:shadow transition-shadow duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Utilisateurs actifs</p>
                <p className="text-lg font-bold text-blue-600 mt-0.5">
                  {new Set(journal.map(j => j.utilisateur?.id).filter(id => id)).size}
                </p>
              </div>
              <div className="p-1.5 bg-blue-50 rounded">
                <FiUsers className="w-4 h-4 text-blue-600" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Message d'erreur */}
      {error && (
        <div className="mb-4">
          <div className="bg-gradient-to-r from-red-50 to-red-100 border-l-3 border-red-500 rounded-r-lg p-3 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-red-100 rounded">
                  <FiAlertTriangle className="w-4 h-4 text-red-600" />
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

      {/* Barre d'outils - Filtres et Recherche */}
      <div className="mb-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900 text-sm">Filtres et Recherche Avancés</h3>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-600">
                {filteredJournal.length} résultat(s)
              </span>
              {(searchTerm || filterUtilisateur || filterAction || filterStatut || filterModele || dateDebut || dateFin) && (
                <button
                  onClick={handleResetFilters}
                  className="px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors text-xs font-medium flex items-center gap-1"
                >
                  <FiX size={12} />
                  Effacer
                </button>
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 mb-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Recherche</label>
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-purple-500 rounded-lg blur opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
                <div className="relative">
                  <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 z-10 text-sm" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-transparent bg-white relative z-10 text-sm"
                    placeholder="Description, modèle, IP..."
                  />
                </div>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Utilisateur</label>
              <div className="relative">
                <FiUser className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm" />
                <select
                  value={filterUtilisateur}
                  onChange={(e) => setFilterUtilisateur(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-transparent bg-white appearance-none text-sm"
                >
                  <option value="">Tous les utilisateurs</option>
                  {utilisateurs.map(utilisateur => (
                    <option key={utilisateur.id} value={utilisateur.id}>
                      {utilisateur.email}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Action</label>
              <div className="relative">
                <FiActivity className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm" />
                <select
                  value={filterAction}
                  onChange={(e) => setFilterAction(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-transparent bg-white appearance-none text-sm"
                >
                  <option value="">Toutes les actions</option>
                  {actionsPossibles.map(action => (
                    <option key={action} value={action}>
                      {action.charAt(0).toUpperCase() + action.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Statut</label>
              <div className="relative">
                <FiShield className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm" />
                <select
                  value={filterStatut}
                  onChange={(e) => setFilterStatut(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-transparent bg-white appearance-none text-sm"
                >
                  <option value="">Tous les statuts</option>
                  <option value="succes">Succès</option>
                  <option value="echec">Échec</option>
                </select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Modèle</label>
              <div className="relative">
                <FiDatabase className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm" />
                <select
                  value={filterModele}
                  onChange={(e) => setFilterModele(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-transparent bg-white appearance-none text-sm"
                >
                  <option value="">Tous les modèles</option>
                  {modelesPossibles.map(modele => (
                    <option key={modele} value={modele}>
                      {modele}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Date début</label>
              <div className="relative">
                <FiCalendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm" />
                <input
                  type="date"
                  value={dateDebut}
                  onChange={(e) => setDateDebut(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-transparent bg-white text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Date fin</label>
              <div className="relative">
                <FiCalendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm" />
                <input
                  type="date"
                  value={dateFin}
                  onChange={(e) => setDateFin(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-transparent bg-white text-sm"
                />
              </div>
            </div>
            <div className="flex items-end gap-2">
              <button
                onClick={fetchJournal}
                className="flex-1 px-3 py-2 bg-gradient-to-r from-purple-600 to-purple-500 text-white rounded-lg hover:from-purple-700 hover:to-purple-600 transition-all duration-300 font-medium flex items-center justify-center gap-1.5 text-sm shadow hover:shadow-md"
              >
                <FiFilter size={14} />
                Appliquer
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tableau Principal */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {/* En-tête du tableau avec actions */}
        <div className="px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={selectedRows.length === currentJournal.length && currentJournal.length > 0}
                  onChange={selectAllRows}
                  className="w-3.5 h-3.5 text-purple-600 rounded focus:ring-purple-500 border-gray-300"
                />
                <span className="text-xs text-gray-700">
                  {selectedRows.length} sélectionné(s)
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="p-1.5 hover:bg-gray-100 rounded transition-colors text-gray-600">
                <FiDownload size={16} />
              </button>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="border border-gray-300 rounded px-2 py-1 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-transparent"
              >
                <option value={10}>10 lignes</option>
                <option value={20}>20 lignes</option>
                <option value={50}>50 lignes</option>
                <option value={100}>100 lignes</option>
              </select>
            </div>
          </div>
        </div>

        {/* Tableau */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr className="bg-gradient-to-r from-gray-50 to-gray-100">
                <th scope="col" className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-300">
                  <div className="flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      checked={selectedRows.length === currentJournal.length && currentJournal.length > 0}
                      onChange={selectAllRows}
                      className="w-3.5 h-3.5 text-purple-600 rounded focus:ring-purple-500 border-gray-300"
                    />
                    Date/Heure
                  </div>
                </th>
                <th scope="col" className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-300">
                  Utilisateur
                </th>
                <th scope="col" className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-300">
                  Action
                </th>
                <th scope="col" className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-300">
                  Modèle & Objet
                </th>
                <th scope="col" className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-300">
                  Description
                </th>
                <th scope="col" className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-300">
                  Statut
                </th>
                <th scope="col" className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {currentJournal.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-3 py-6 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mb-3">
                        <TbHistory className="w-8 h-8 text-gray-400" />
                      </div>
                      <h3 className="text-base font-semibold text-gray-900 mb-1.5">
                        {journal.length === 0 ? 'Aucun événement dans le journal' : 'Aucun résultat pour votre recherche'}
                      </h3>
                      <p className="text-gray-600 mb-4 max-w-md text-sm">
                        {journal.length === 0 
                          ? 'Aucune activité n\'a encore été enregistrée dans le système' 
                          : 'Essayez de modifier vos critères de recherche ou de filtres'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                currentJournal.map((log) => (
                  <tr 
                    key={log.id}
                    className={`hover:bg-gradient-to-r hover:from-gray-50 hover:to-white transition-all duration-200 ${
                      selectedRows.includes(log.id) ? 'bg-gradient-to-r from-blue-50 to-blue-25' : 'bg-white'
                    }`}
                  >
                    <td className="px-3 py-2 whitespace-nowrap border-r border-gray-200">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selectedRows.includes(log.id)}
                          onChange={() => toggleRowSelection(log.id)}
                          className="w-3.5 h-3.5 text-purple-600 rounded focus:ring-purple-500 border-gray-300"
                        />
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-gray-900">
                            {formatDateHeure(log.date_action).split(' ')[0]}
                          </span>
                          <span className="text-xs text-gray-500">
                            {formatDateHeure(log.date_action).split(' ')[1]}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2 border-r border-gray-200">
                      {log.utilisateur ? (
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-gray-900">
                            {log.utilisateur.email}
                          </span>
                          <span className="text-xs text-gray-500">
                            {log.utilisateur.username}
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">Système</span>
                      )}
                    </td>
                    <td className="px-3 py-2 border-r border-gray-200">
                      <div className={`flex items-center gap-2 px-2 py-1 rounded border ${getActionColor(log.action)}`}>
                        {getActionIcon(log.action)}
                        <span className="text-xs font-medium capitalize">
                          {log.action}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2 border-r border-gray-200">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-900">
                          {log.modele}
                        </span>
                        {log.objet && (
                          <span className="text-xs text-gray-500 truncate max-w-[200px]">
                            {log.objet}
                          </span>
                        )}
                        {log.objet_id && (
                          <span className="text-xs text-gray-400 font-mono">
                            ID: {log.objet_id}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2 border-r border-gray-200">
                      <div className="max-w-xs">
                        <div className="text-sm text-gray-600 truncate" title={log.description}>
                          {log.description}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2 border-r border-gray-200">
                      <div className="flex items-center">
                        <div className={`px-2 py-1 rounded flex items-center gap-1 ${
                          log.statut === 'succes'
                            ? 'bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 border border-green-200' 
                            : 'bg-gradient-to-r from-red-50 to-pink-50 text-red-700 border border-red-200'
                        }`}>
                          {log.statut === 'succes' ? (
                            <>
                              <FiCheck className="w-3 h-3" />
                              <span className="text-xs font-medium">Succès</span>
                            </>
                          ) : (
                            <>
                              <FiAlertCircle className="w-3 h-3" />
                              <span className="text-xs font-medium">Échec</span>
                            </>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleViewDetails(log)}
                          className="p-1.5 bg-gradient-to-r from-gray-50 to-gray-100 text-gray-700 rounded-lg hover:from-gray-100 hover:to-gray-200 transition-all duration-200 shadow-sm hover:shadow"
                          title="Voir détails"
                        >
                          <FiEye size={14} />
                        </button>
                        {log.ip_address && (
                          <div className="px-2 py-1 bg-gray-50 text-gray-600 rounded text-xs font-mono border border-gray-200">
                            {log.ip_address}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {filteredJournal.length > 0 && (
          <div className="px-4 py-3 border-t border-gray-200 bg-gradient-to-r from-gray-50 to-white">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-gray-700">
                    Page {currentPage} sur {totalPages}
                  </span>
                  <span className="text-gray-300">•</span>
                  <span className="text-xs text-gray-700">
                    {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredJournal.length)} sur {filteredJournal.length} événements
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={prevPage}
                  disabled={currentPage === 1}
                  className={`p-1.5 rounded border transition-all duration-200 ${
                    currentPage === 1
                      ? 'bg-gray-100 text-gray-400 border-gray-300 cursor-not-allowed'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400 hover:shadow-sm'
                  }`}
                  title="Page précédente"
                >
                  <FiChevronLeft size={14} />
                </button>

                {/* Numéros de page */}
                <div className="flex items-center gap-1">
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
                        className={`min-w-[32px] h-8 rounded border text-xs font-medium transition-all duration-200 ${
                          currentPage === pageNumber
                            ? 'bg-gradient-to-r from-purple-600 to-purple-500 text-white border-purple-600 shadow'
                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400'
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
                  className={`p-1.5 rounded border transition-all duration-200 ${
                    currentPage === totalPages
                      ? 'bg-gray-100 text-gray-400 border-gray-300 cursor-not-allowed'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400 hover:shadow-sm'
                  }`}
                  title="Page suivante"
                >
                  <FiChevronRight size={14} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal de détails */}
      {showDetailModal && selectedLog && (
        <JournalDetailModal
          log={selectedLog}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedLog(null);
          }}
        />
      )}
    </div>
  );
}

// MODAL DE DÉTAILS DU JOURNAL
function JournalDetailModal({ log, onClose }) {
  const formatDateComplete = (dateString) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('fr-FR', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }),
      heure: date.toLocaleTimeString('fr-FR', { 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit' 
      }),
      timestamp: date.getTime()
    };
  };

  const { date, heure } = formatDateComplete(log.date_action);

  const getActionDetails = (action) => {
    switch (action) {
      case 'creation': return { label: 'Création', color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' };
      case 'modification': return { label: 'Modification', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' };
      case 'suppression': return { label: 'Suppression', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' };
      case 'connexion': return { label: 'Connexion', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' };
      case 'deconnexion': return { label: 'Déconnexion', color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200' };
      case 'validation': return { label: 'Validation', color: 'text-teal-600', bg: 'bg-teal-50', border: 'border-teal-200' };
      default: return { label: action, color: 'text-gray-600', bg: 'bg-gray-50', border: 'border-gray-200' };
    }
  };

  const actionDetails = getActionDetails(log.action);

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-3 z-50 backdrop-blur-sm">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-xl">
        {/* Header du modal */}
        <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-purple-500 text-white rounded-t-lg p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-white/20 backdrop-blur-sm rounded">
                <TbHistory className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold">Détails de l'événement</h2>
                <p className="text-purple-100 text-xs mt-0.5">#{log.id}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1 hover:bg-white/20 rounded transition-colors"
            >
              <FiX size={18} />
            </button>
          </div>
        </div>
        
        <div className="p-4 space-y-4">
          {/* En-tête */}
          <div className="bg-gradient-to-br from-gray-50 to-white rounded-lg p-3 border border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${actionDetails.bg} ${actionDetails.border}`}>
                  <span className={`text-lg ${actionDetails.color}`}>
                    {actionDetails.label.charAt(0)}
                  </span>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">{actionDetails.label} sur {log.modele}</h3>
                  <p className="text-xs text-gray-500">{date} à {heure}</p>
                </div>
              </div>
              <div className={`px-2 py-1 rounded flex items-center gap-1 ${
                log.statut === 'succes'
                  ? 'bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 border border-green-200' 
                  : 'bg-gradient-to-r from-red-50 to-pink-50 text-red-700 border border-red-200'
              }`}>
                {log.statut === 'succes' ? (
                  <>
                    <FiCheck className="w-3 h-3" />
                    <span className="text-xs font-medium">Succès</span>
                  </>
                ) : (
                  <>
                    <FiAlertCircle className="w-3 h-3" />
                    <span className="text-xs font-medium">Échec</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Informations Générales */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gradient-to-br from-blue-50 to-white rounded-lg p-3 border border-blue-100">
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-1.5">
                <div className="w-1 h-4 bg-gradient-to-b from-blue-600 to-blue-400 rounded"></div>
                Utilisateur
              </h3>
              {log.utilisateur ? (
                <div className="space-y-2">
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-0.5">Email</p>
                    <p className="text-sm text-gray-900 font-medium">{log.utilisateur.email}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-0.5">Nom d'utilisateur</p>
                    <p className="text-sm text-gray-900">{log.utilisateur.username}</p>
                  </div>
                  {log.utilisateur.nom && log.utilisateur.prenom && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-0.5">Nom complet</p>
                      <p className="text-sm text-gray-900">{log.utilisateur.prenom} {log.utilisateur.nom}</p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-600">Action système</p>
              )}
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-white rounded-lg p-3 border border-purple-100">
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-1.5">
                <div className="w-1 h-4 bg-gradient-to-b from-purple-600 to-purple-400 rounded"></div>
                Contexte
              </h3>
              <div className="space-y-2">
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-0.5">Modèle</p>
                  <p className="text-sm text-gray-900 font-medium">{log.modele}</p>
                </div>
                {log.objet && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-0.5">Objet concerné</p>
                    <p className="text-sm text-gray-900">{log.objet}</p>
                  </div>
                )}
                {log.objet_id && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-0.5">Identifiant</p>
                    <p className="text-sm text-gray-900 font-mono">#{log.objet_id}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="bg-gradient-to-br from-emerald-50 to-white rounded-lg p-3 border border-emerald-100">
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-1.5">
              <div className="w-1 h-4 bg-gradient-to-b from-emerald-600 to-emerald-400 rounded"></div>
              Description
            </h3>
            <p className="text-sm text-gray-900 bg-white p-3 rounded border border-gray-200">
              {log.description || 'Aucune description disponible'}
            </p>
          </div>

          {/* Informations Techniques */}
          <div className="bg-gradient-to-br from-gray-50 to-white rounded-lg p-3 border border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-1.5">
              <div className="w-1 h-4 bg-gradient-to-b from-gray-600 to-gray-400 rounded"></div>
              Informations Techniques
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {log.ip_address && (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-0.5">Adresse IP</p>
                  <p className="text-sm font-mono text-gray-900 bg-gray-50 px-2 py-1 rounded border border-gray-200">
                    {log.ip_address}
                  </p>
                </div>
              )}
              {log.user_agent && (
                <div className="md:col-span-2">
                  <p className="text-xs font-medium text-gray-500 mb-0.5">User Agent</p>
                  <p className="text-xs font-mono text-gray-900 bg-gray-50 px-2 py-1 rounded border border-gray-200 break-all">
                    {log.user_agent}
                  </p>
                </div>
              )}
              <div>
                <p className="text-xs font-medium text-gray-500 mb-0.5">Date exacte</p>
                <p className="text-sm text-gray-900">
                  {new Date(log.date_action).toISOString()}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Bouton de fermeture */}
        <div className="p-3 border-t border-gray-200 bg-gradient-to-r from-gray-50 to-white">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-gradient-to-r from-gray-600 to-gray-500 text-white rounded hover:from-gray-700 hover:to-gray-600 transition-all duration-200 font-medium text-sm shadow-sm"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}