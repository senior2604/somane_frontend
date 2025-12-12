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
  FiFileText,
  FiCheckCircle,
  FiXCircle,
  FiMoreVertical,
  FiChevronDown,
  FiChevronUp,
  FiExternalLink,
  FiBriefcase,
  FiHome,
  FiCreditCard,
  FiImage,
  FiMap,
  FiFolder,
  FiPackage
} from "react-icons/fi";
import { TbHistory, TbBuildingSkyscraper, TbSettings } from "react-icons/tb";

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
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);

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

  const resetFilters = () => {
    setSearchTerm('');
    setFilterUtilisateur('');
    setFilterAction('');
    setFilterStatut('');
    setFilterModele('');
    setDateDebut('');
    setDateFin('');
    setCurrentPage(1);
    setShowFilterDropdown(false);
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
      case 'creation': return <FiPlus className="w-3 h-3" />;
      case 'modification': return <FiEdit className="w-3 h-3" />;
      case 'suppression': return <FiTrash className="w-3 h-3" />;
      case 'connexion': return <FiLogIn className="w-3 h-3" />;
      case 'deconnexion': return <FiLogOut className="w-3 h-3" />;
      case 'validation': return <FiCheck className="w-3 h-3" />;
      case 'import': return <FiDownload className="w-3 h-3" />;
      case 'export': return <FiUpload className="w-3 h-3" />;
      default: return <FiFileText className="w-3 h-3" />;
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

  // Statistiques
  const stats = {
    total: journal.length,
    succes: journal.filter(j => j.statut === 'succes').length,
    echecs: journal.filter(j => j.statut === 'echec').length,
    utilisateursActifs: new Set(journal.map(j => j.utilisateur?.id).filter(id => id)).size,
    creations: journal.filter(j => j.action === 'creation').length,
    modifications: journal.filter(j => j.action === 'modification').length,
    suppressions: journal.filter(j => j.action === 'suppression').length,
    connexions: journal.filter(j => j.action === 'connexion').length
  };

  if (loading) {
    return (
      <div className="p-4 bg-gradient-to-br from-gray-50 to-white min-h-screen">
        <div className="flex flex-col items-center justify-center h-96">
          <div className="relative">
            <div className="w-12 h-12 border-3 border-gray-200 rounded-full"></div>
            <div className="absolute top-0 left-0 w-12 h-12 border-3 border-violet-600 border-t-transparent rounded-full animate-spin"></div>
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
      {/* HEADER COMPACT AVEC RECHERCHE AU CENTRE */}
      <div className="mb-6">
        {/* Barre de recherche au centre */}
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="relative flex items-center">
            <div className="relative flex-1">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-24 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent text-sm w-80"
                placeholder="Rechercher dans le journal..."
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-20 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                >
                  <FiX size={14} />
                </button>
              )}
              
              {/* Bouton de filtre avec dropdown */}
              <div className="absolute right-1 top-1/2 transform -translate-y-1/2">
                <button
                  onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                  className={`flex items-center gap-1 px-2 py-1.5 rounded text-xs font-medium ${
                    filterUtilisateur || filterAction || filterStatut || filterModele || dateDebut || dateFin 
                      ? 'bg-violet-100 text-violet-700' 
                      : 'bg-gray-100 text-gray-700'
                  } hover:bg-gray-200 transition-colors`}
                >
                  <FiChevronDown size={12} />
                  <span>Filtre</span>
                </button>
                
                {/* Dropdown des filtres */}
                {showFilterDropdown && (
                  <div className="absolute right-0 top-full mt-1 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                    <div className="p-2">
                      <p className="text-xs font-medium text-gray-700 mb-2">Filtres rapides</p>
                      
                      {/* Filtre Statut */}
                      <div className="space-y-1 mb-3">
                        <p className="text-xs font-medium text-gray-700 mb-1">Statut</p>
                        <button
                          onClick={() => {
                            setFilterStatut('');
                            setShowFilterDropdown(false);
                          }}
                          className={`w-full text-left px-2 py-1.5 rounded text-xs ${!filterStatut ? 'bg-violet-50 text-violet-700' : 'text-gray-700 hover:bg-gray-50'}`}
                        >
                          Tous les statuts
                        </button>
                        <button
                          onClick={() => {
                            setFilterStatut('succes');
                            setShowFilterDropdown(false);
                          }}
                          className={`w-full text-left px-2 py-1.5 rounded text-xs ${filterStatut === 'succes' ? 'bg-violet-50 text-violet-700' : 'text-gray-700 hover:bg-gray-50'}`}
                        >
                          Succès seulement
                        </button>
                        <button
                          onClick={() => {
                            setFilterStatut('echec');
                            setShowFilterDropdown(false);
                          }}
                          className={`w-full text-left px-2 py-1.5 rounded text-xs ${filterStatut === 'echec' ? 'bg-violet-50 text-violet-700' : 'text-gray-700 hover:bg-gray-50'}`}
                        >
                          Échecs seulement
                        </button>
                      </div>
                      
                      {/* Filtre Action */}
                      <div className="space-y-1 mb-3">
                        <p className="text-xs font-medium text-gray-700 mb-1">Action</p>
                        <button
                          onClick={() => {
                            setFilterAction('');
                            setShowFilterDropdown(false);
                          }}
                          className={`w-full text-left px-2 py-1.5 rounded text-xs ${!filterAction ? 'bg-violet-50 text-violet-700' : 'text-gray-700 hover:bg-gray-50'}`}
                        >
                          Toutes les actions
                        </button>
                        <button
                          onClick={() => {
                            setFilterAction('creation');
                            setShowFilterDropdown(false);
                          }}
                          className={`w-full text-left px-2 py-1.5 rounded text-xs ${filterAction === 'creation' ? 'bg-violet-50 text-violet-700' : 'text-gray-700 hover:bg-gray-50'}`}
                        >
                          Créations
                        </button>
                        <button
                          onClick={() => {
                            setFilterAction('modification');
                            setShowFilterDropdown(false);
                          }}
                          className={`w-full text-left px-2 py-1.5 rounded text-xs ${filterAction === 'modification' ? 'bg-violet-50 text-violet-700' : 'text-gray-700 hover:bg-gray-50'}`}
                        >
                          Modifications
                        </button>
                        <button
                          onClick={() => {
                            setFilterAction('suppression');
                            setShowFilterDropdown(false);
                          }}
                          className={`w-full text-left px-2 py-1.5 rounded text-xs ${filterAction === 'suppression' ? 'bg-violet-50 text-violet-700' : 'text-gray-700 hover:bg-gray-50'}`}
                        >
                          Suppressions
                        </button>
                      </div>
                      
                      {/* Réinitialiser */}
                      {(searchTerm || filterUtilisateur || filterAction || filterStatut || filterModele || dateDebut || dateFin) && (
                        <button
                          onClick={resetFilters}
                          className="w-full mt-2 px-2 py-1.5 bg-gray-100 text-gray-700 rounded text-xs hover:bg-gray-200 transition-colors"
                        >
                          Réinitialiser les filtres
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <button 
              onClick={handleRetry}
              className="ml-3 px-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-all duration-300 flex items-center gap-1.5 text-sm"
            >
              <FiRefreshCw className={`${loading ? 'animate-spin' : ''}`} size={14} />
              <span>Actualiser</span>
            </button>
            
            <button 
              onClick={handleExport}
              className="ml-2 px-3 py-2 rounded-lg bg-gradient-to-r from-violet-600 to-violet-500 text-white hover:from-violet-700 hover:to-violet-600 transition-all duration-300 flex items-center gap-1.5 text-sm shadow"
            >
              <FiDownload size={14} />
              <span>Exporter CSV</span>
            </button>
          </div>
        </div>

        {/* Statistiques en ligne compactes - AMÉLIORÉES */}
        <div className="grid grid-cols-4 gap-2 mb-3">
          <div className="bg-white rounded-lg p-2 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-600">Total:</span>
                <span className="text-sm font-bold text-violet-600">{stats.total}</span>
              </div>
              <div className="p-1 bg-violet-50 rounded">
                <TbHistory className="w-3 h-3 text-violet-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg p-2 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-600">Succès:</span>
                <span className="text-sm font-bold text-green-600">{stats.succes}</span>
              </div>
              <div className="p-1 bg-green-50 rounded">
                <FiCheckCircle className="w-3 h-3 text-green-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg p-2 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-600">Échecs:</span>
                <span className="text-sm font-bold text-red-600">{stats.echecs}</span>
              </div>
              <div className="p-1 bg-red-50 rounded">
                <FiXCircle className="w-3 h-3 text-red-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg p-2 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-600">Utilisateurs:</span>
                <span className="text-sm font-bold text-blue-600">{stats.utilisateursActifs}</span>
              </div>
              <div className="p-1 bg-blue-50 rounded">
                <FiUsers className="w-3 h-3 text-blue-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Onglets */}
        <div className="flex border-b border-gray-200 mb-3">
          <button
            onClick={() => {
              setCurrentPage(1);
              setSelectedRows([]);
              resetFilters();
            }}
            className="px-4 py-1.5 text-xs font-medium border-b-2 border-violet-600 text-violet-600 transition-colors"
          >
            Toutes les activités
          </button>
        </div>
      </div>

      {/* Message d'erreur compact */}
      {error && (
        <div className="mb-4">
          <div className="bg-gradient-to-r from-red-50 to-red-100 border-l-3 border-red-500 rounded-r-lg p-2 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1 bg-red-100 rounded">
                  <FiXCircle className="w-3 h-3 text-red-600" />
                </div>
                <div>
                  <p className="font-medium text-red-900 text-xs">{error}</p>
                </div>
              </div>
              <button
                onClick={handleRetry}
                className="px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-xs font-medium"
              >
                Réessayer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filtres avancés compacts */}
      <div className="mb-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-3 grid grid-cols-2 md:grid-cols-6 gap-2">
              <div className="col-span-1">
                <label className="block text-xs font-medium text-gray-700 mb-1">Utilisateur</label>
                <select
                  value={filterUtilisateur}
                  onChange={(e) => setFilterUtilisateur(e.target.value)}
                  className="w-full border border-gray-300 rounded px-2 py-1 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent"
                >
                  <option value="">Tous</option>
                  {utilisateurs.map(utilisateur => (
                    <option key={utilisateur.id} value={utilisateur.id}>
                      {utilisateur.email.split('@')[0]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-span-1">
                <label className="block text-xs font-medium text-gray-700 mb-1">Modèle</label>
                <select
                  value={filterModele}
                  onChange={(e) => setFilterModele(e.target.value)}
                  className="w-full border border-gray-300 rounded px-2 py-1 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent"
                >
                  <option value="">Tous</option>
                  {modelesPossibles.map(modele => (
                    <option key={modele} value={modele}>
                      {modele}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-span-1">
                <label className="block text-xs font-medium text-gray-700 mb-1">Date début</label>
                <input
                  type="date"
                  value={dateDebut}
                  onChange={(e) => setDateDebut(e.target.value)}
                  className="w-full border border-gray-300 rounded px-2 py-1 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent"
                />
              </div>
              <div className="col-span-1">
                <label className="block text-xs font-medium text-gray-700 mb-1">Date fin</label>
                <input
                  type="date"
                  value={dateFin}
                  onChange={(e) => setDateFin(e.target.value)}
                  className="w-full border border-gray-300 rounded px-2 py-1 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent"
                />
              </div>
              <div className="col-span-2 md:col-span-2 flex items-end gap-2">
                <button
                  onClick={fetchJournal}
                  className="flex-1 px-3 py-1 bg-gradient-to-r from-violet-600 to-violet-500 text-white rounded hover:from-violet-700 hover:to-violet-600 transition-all duration-200 font-medium flex items-center justify-center gap-1 text-xs"
                >
                  <FiFilter size={12} />
                  Appliquer
                </button>
                <button
                  onClick={resetFilters}
                  className="px-3 py-1 border border-gray-300 rounded text-gray-700 hover:bg-gray-50 transition-all duration-200 text-xs"
                >
                  <FiX size={12} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tableau Principal */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {/* En-tête du tableau avec actions compact */}
        <div className="px-3 py-2 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={selectedRows.length === currentJournal.length && currentJournal.length > 0}
                  onChange={selectAllRows}
                  className="w-3 h-3 text-violet-600 rounded focus:ring-violet-500 border-gray-300"
                />
                <span className="text-xs text-gray-700">
                  {selectedRows.length} sélectionné(s)
                </span>
              </div>
              {(filterUtilisateur || filterAction || filterStatut || filterModele || dateDebut || dateFin) && (
                <div className="flex items-center gap-1">
                  {filterStatut === 'succes' && (
                    <span className="px-1.5 py-0.5 bg-violet-50 text-violet-700 text-xs rounded border border-violet-200">
                      Succès
                    </span>
                  )}
                  {filterStatut === 'echec' && (
                    <span className="px-1.5 py-0.5 bg-violet-50 text-violet-700 text-xs rounded border border-violet-200">
                      Échecs
                    </span>
                  )}
                  {filterAction && (
                    <span className="px-1.5 py-0.5 bg-violet-50 text-violet-700 text-xs rounded border border-violet-200">
                      {filterAction}
                    </span>
                  )}
                  {filterModele && (
                    <span className="px-1.5 py-0.5 bg-violet-50 text-violet-700 text-xs rounded border border-violet-200">
                      {filterModele}
                    </span>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button className="p-1 hover:bg-gray-100 rounded transition-colors text-gray-600">
                <FiDownload size={14} />
              </button>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="border border-gray-300 rounded px-1.5 py-0.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent"
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
                  <div className="flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={selectedRows.length === currentJournal.length && currentJournal.length > 0}
                      onChange={selectAllRows}
                      className="w-3 h-3 text-violet-600 rounded focus:ring-violet-500 border-gray-300"
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
                  Modèle
                </th>
                <th scope="col" className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-300">
                  Description
                </th>
                <th scope="col" className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            
            <tbody className="divide-y divide-gray-200">
              {currentJournal.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-4 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-12 h-12 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mb-2">
                        <TbHistory className="w-6 h-6 text-gray-400" />
                      </div>
                      <h3 className="text-sm font-semibold text-gray-900 mb-1">
                        {journal.length === 0 ? 'Aucun événement dans le journal' : 'Aucun résultat'}
                      </h3>
                      <p className="text-gray-600 text-xs mb-3 max-w-md">
                        {journal.length === 0 
                          ? 'Aucune activité n\'a encore été enregistrée' 
                          : 'Essayez de modifier vos critères de recherche'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                currentJournal.map((log) => (
                  <tr 
                    key={log.id}
                    className={`hover:bg-gradient-to-r hover:from-gray-50 hover:to-white transition-all duration-200 ${
                      selectedRows.includes(log.id) ? 'bg-gradient-to-r from-violet-50 to-violet-25' : 'bg-white'
                    }`}
                  >
                    {/* Date/Heure avec checkbox */}
                    <td className="px-3 py-2 whitespace-nowrap border-r border-gray-200">
                      <div className="flex items-center gap-1.5">
                        <input
                          type="checkbox"
                          checked={selectedRows.includes(log.id)}
                          onChange={() => toggleRowSelection(log.id)}
                          className="w-3 h-3 text-violet-600 rounded focus:ring-violet-500 border-gray-300"
                        />
                        <div className="flex flex-col">
                          <span className="text-xs font-medium text-gray-900">
                            {formatDateHeure(log.date_action).split(' ')[0]}
                          </span>
                          <span className="text-xs text-gray-500">
                            {formatDateHeure(log.date_action).split(' ')[1]}
                          </span>
                        </div>
                      </div>
                    </td>
                    
                    {/* Utilisateur */}
                    <td className="px-3 py-2 border-r border-gray-200">
                      <div className="flex flex-col">
                        {log.utilisateur ? (
                          <>
                            <div className="text-xs font-medium text-gray-900 truncate max-w-[120px]">
                              {log.utilisateur.email}
                            </div>
                            <div className="text-xs text-gray-500">
                              {log.utilisateur.username}
                            </div>
                          </>
                        ) : (
                          <span className="text-xs text-gray-400">Système</span>
                        )}
                      </div>
                    </td>
                    
                    {/* Action */}
                    <td className="px-3 py-2 border-r border-gray-200">
                      <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded border ${getActionColor(log.action)} w-fit`}>
                        {getActionIcon(log.action)}
                        <span className="text-xs font-medium capitalize">
                          {log.action}
                        </span>
                      </div>
                    </td>
                    
                    {/* Modèle */}
                    <td className="px-3 py-2 border-r border-gray-200">
                      <div className="flex flex-col">
                        <span className="text-xs font-medium text-gray-900">
                          {log.modele}
                        </span>
                        {log.objet_id && (
                          <span className="text-xs text-gray-500 font-mono">
                            #{log.objet_id}
                          </span>
                        )}
                        {log.objet && (
                          <div className="text-xs text-gray-500 truncate max-w-[100px]" title={log.objet}>
                            {log.objet}
                          </div>
                        )}
                      </div>
                    </td>
                    
                    {/* Description */}
                    <td className="px-3 py-2 border-r border-gray-200">
                      <div className="max-w-xs">
                        <div className="text-xs text-gray-600 truncate" title={log.description}>
                          {log.description}
                        </div>
                      </div>
                    </td>
                    
                    {/* Actions */}
                    <td className="px-3 py-2 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleViewDetails(log)}
                          className="p-1 bg-gradient-to-r from-gray-50 to-gray-100 text-gray-700 rounded hover:from-gray-100 hover:to-gray-200 transition-all duration-200 shadow-sm hover:shadow"
                          title="Voir détails"
                        >
                          <FiEye size={12} />
                        </button>
                        <div className={`px-1.5 py-0.5 rounded flex items-center gap-1 ${
                          log.statut === 'succes'
                            ? 'bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 border border-green-200' 
                            : 'bg-gradient-to-r from-red-50 to-pink-50 text-red-700 border border-red-200'
                        }`}>
                          {log.statut === 'succes' ? (
                            <>
                              <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                              <span className="text-xs font-medium">Succès</span>
                            </>
                          ) : (
                            <>
                              <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
                              <span className="text-xs font-medium">Échec</span>
                            </>
                          )}
                        </div>
                        {log.ip_address && (
                          <div className="px-1.5 py-0.5 bg-gray-50 text-gray-600 rounded text-xs font-mono border border-gray-200">
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

        {/* Pagination compact */}
        {currentJournal.length > 0 && (
          <div className="px-3 py-2 border-t border-gray-200 bg-gradient-to-r from-gray-50 to-white">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <span className="text-xs text-gray-700">
                    Page {currentPage} sur {totalPages}
                  </span>
                  <span className="text-gray-300">•</span>
                  <span className="text-xs text-gray-700">
                    {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredJournal.length)} sur {filteredJournal.length} événements
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={prevPage}
                  disabled={currentPage === 1}
                  className={`p-1 rounded border transition-all duration-200 ${
                    currentPage === 1
                      ? 'bg-gray-100 text-gray-400 border-gray-300 cursor-not-allowed'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400 hover:shadow-sm'
                  }`}
                  title="Page précédente"
                >
                  <FiChevronLeft size={12} />
                </button>

                {/* Numéros de page */}
                <div className="flex items-center gap-0.5">
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
                        className={`min-w-[28px] h-7 rounded border text-xs font-medium transition-all duration-200 ${
                          currentPage === pageNumber
                            ? 'bg-gradient-to-r from-violet-600 to-violet-500 text-white border-violet-600 shadow'
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
                  className={`p-1 rounded border transition-all duration-200 ${
                    currentPage === totalPages
                      ? 'bg-gray-100 text-gray-400 border-gray-300 cursor-not-allowed'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400 hover:shadow-sm'
                  }`}
                  title="Page suivante"
                >
                  <FiChevronRight size={12} />
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

// MODAL DE DÉTAILS DU JOURNAL - DESIGN MIS À JOUR
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
        <div className="sticky top-0 bg-gradient-to-r from-violet-600 to-violet-500 text-white rounded-t-lg p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-white/20 backdrop-blur-sm rounded">
                <TbHistory className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold">Détails de l'événement</h2>
                <p className="text-violet-100 text-xs mt-0.5">#{log.id}</p>
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
          {/* En-tête avec icône */}
          <div className="flex flex-col md:flex-row items-center md:items-start gap-4 mb-6">
            <div className="w-32 h-32 bg-gradient-to-br from-violet-100 to-violet-200 rounded-lg flex items-center justify-center overflow-hidden border-2 border-violet-300">
              <TbHistory className="w-16 h-16 text-violet-600" />
            </div>
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-xl font-bold text-gray-900">{actionDetails.label} sur {log.modele}</h1>
              <p className="text-gray-600 mt-1">{date} à {heure}</p>
              <div className="flex flex-wrap gap-2 mt-3 justify-center md:justify-start">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                  log.statut === 'succes'
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {log.statut === 'succes' ? 'Succès' : 'Échec'}
                </span>
                <span className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                  <FiDatabase className="w-3 h-3 mr-1" />
                  {log.modele}
                </span>
                {log.utilisateur && (
                  <span className="inline-flex items-center px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-medium">
                    <FiUser className="w-3 h-3 mr-1" />
                    {log.utilisateur.email.split('@')[0]}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Informations Générales */}
          <div className="bg-gradient-to-br from-gray-50 to-white rounded-lg p-4 border border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-1.5">
              <div className="w-1 h-4 bg-gradient-to-b from-violet-600 to-violet-400 rounded"></div>
              Informations Générales
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Action</p>
                <div className={`px-2 py-1 rounded inline-flex items-center gap-1 w-fit ${actionDetails.bg} ${actionDetails.border} ${actionDetails.color}`}>
                  {actionDetails.label}
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Statut</p>
                <div className={`px-2 py-1 rounded inline-flex items-center gap-1 w-fit ${
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
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Modèle</p>
                <p className="text-sm text-gray-900 font-medium">{log.modele}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Date et heure</p>
                <p className="text-sm text-gray-900">
                  {date} à {heure}
                </p>
              </div>
            </div>
          </div>

          {/* Utilisateur et Contexte */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gradient-to-br from-blue-50 to-white rounded-lg p-4 border border-blue-200">
              <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-1.5">
                <div className="w-1 h-4 bg-gradient-to-b from-blue-600 to-blue-400 rounded"></div>
                Utilisateur
              </h3>
              {log.utilisateur ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center">
                      <FiUser className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">{log.utilisateur.email}</div>
                      <div className="text-xs text-gray-500">{log.utilisateur.username}</div>
                    </div>
                  </div>
                  {log.utilisateur.nom && log.utilisateur.prenom && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-0.5">Nom complet</p>
                      <p className="text-sm text-gray-900">{log.utilisateur.prenom} {log.utilisateur.nom}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <FiServer className="w-4 h-4 text-gray-400" />
                  <p className="text-sm text-gray-600">Action système automatisée</p>
                </div>
              )}
            </div>

            <div className="bg-gradient-to-br from-orange-50 to-white rounded-lg p-4 border border-orange-200">
              <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-1.5">
                <div className="w-1 h-4 bg-gradient-to-b from-orange-600 to-orange-400 rounded"></div>
                Contexte
              </h3>
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-0.5">Objet concerné</p>
                  <p className="text-sm text-gray-900 font-medium">{log.objet || 'N/A'}</p>
                </div>
                {log.objet_id && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-0.5">Identifiant</p>
                    <p className="text-sm text-gray-900 font-mono bg-gray-50 px-2 py-1 rounded border border-gray-200">
                      #{log.objet_id}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="bg-gradient-to-br from-emerald-50 to-white rounded-lg p-4 border border-emerald-200">
            <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-1.5">
              <div className="w-1 h-4 bg-gradient-to-b from-emerald-600 to-emerald-400 rounded"></div>
              Description
            </h3>
            <p className="text-sm text-gray-900 bg-white p-3 rounded border border-gray-200">
              {log.description || 'Aucune description disponible'}
            </p>
          </div>

          {/* Informations Techniques */}
          <div className="bg-gradient-to-br from-gray-50 to-white rounded-lg p-4 border border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-1.5">
              <div className="w-1 h-4 bg-gradient-to-b from-gray-600 to-gray-400 rounded"></div>
              Informations Techniques
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {log.ip_address && (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">Adresse IP</p>
                  <p className="text-sm font-mono text-gray-900 bg-gray-50 px-2 py-1 rounded border border-gray-200">
                    {log.ip_address}
                  </p>
                </div>
              )}
              {log.user_agent && (
                <div className="md:col-span-2">
                  <p className="text-xs font-medium text-gray-500 mb-1">User Agent</p>
                  <p className="text-xs font-mono text-gray-900 bg-gray-50 px-2 py-1 rounded border border-gray-200 break-all">
                    {log.user_agent}
                  </p>
                </div>
              )}
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Timestamp</p>
                <p className="text-sm text-gray-900 font-mono">
                  {new Date(log.date_action).toISOString()}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Identifiant</p>
                <p className="text-sm text-gray-900 font-mono font-medium">#{log.id}</p>
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