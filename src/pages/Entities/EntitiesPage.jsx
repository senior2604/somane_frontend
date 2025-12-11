import React, { useState, useEffect, useRef } from 'react';
import { apiClient } from '../../services/apiClient';
import { 
  FiRefreshCw, 
  FiPlus, 
  FiEdit2, 
  FiTrash2, 
  FiSearch, 
  FiFilter, 
  FiX, 
  FiCheck, 
  FiGlobe, 
  FiMapPin, 
  FiPhone, 
  FiMail, 
  FiDollarSign, 
  FiCalendar, 
  FiUser, 
  FiChevronLeft, 
  FiChevronRight,
  FiFileText,
  FiBriefcase,
  FiHome,
  FiCreditCard,
  FiActivity,
  FiUsers,
  FiDownload,
  FiUpload,
  FiEye,
  FiMoreVertical,
  FiChevronDown,
  FiChevronUp,
  FiInfo,
  FiExternalLink,
  FiImage,
  FiCheckCircle,
  FiXCircle,
  FiMap
} from "react-icons/fi";
import { TbBuildingSkyscraper } from "react-icons/tb";

// Fonctions utilitaires pour la validation téléphone
const validatePhoneByCountry = (phone, countryData) => {
  if (!phone || !countryData) return { valid: true, message: '' };
  
  const indicatif = (countryData.indicatif_tel || countryData.code_tel || '').replace('+', '');
  let phoneNumber = phone.replace(/\s+/g, '');
  
  if (phoneNumber.startsWith(`+${indicatif}`) || phoneNumber.startsWith(indicatif)) {
    phoneNumber = phoneNumber.replace(`+${indicatif}`, '').replace(indicatif, '');
  }
  
  if (countryData.code_iso === 'TG') {
    if (phoneNumber.length !== 8) {
      return { 
        valid: false, 
        message: `Le numéro togolais doit avoir 8 chiffres (format: ${indicatif} XX XX XX XX)` 
      };
    }
    if (!/^\d{8}$/.test(phoneNumber)) {
      return { 
        valid: false, 
        message: 'Le numéro ne doit contenir que des chiffres' 
      };
    }
  }
  
  if (countryData.code_iso === 'CI') {
    if (phoneNumber.length !== 8) {
      return { 
        valid: false, 
        message: `Le numéro ivoirien doit avoir 8 chiffres (format: ${indicatif} XX XX XX XX)` 
      };
    }
  }
  
  if (countryData.code_iso === 'BJ') {
    if (phoneNumber.length !== 8) {
      return { 
        valid: false, 
        message: `Le numéro béninois doit avoir 8 chiffres (format: ${indicatif} XX XX XX XX)` 
      };
    }
  }
  
  if (countryData.code_iso === 'FR') {
    if (phoneNumber.length !== 9) {
      return { 
        valid: false, 
        message: `Le numéro français doit avoir 9 chiffres (format: ${indicatif} X XX XX XX XX)` 
      };
    }
  }
  
  if (phoneNumber.length < 4) {
    return { valid: false, message: 'Numéro trop court (minimum 4 chiffres)' };
  }
  
  if (!/^\d+$/.test(phoneNumber)) {
    return { valid: false, message: 'Le numéro ne doit contenir que des chiffres' };
  }
  
  return { valid: true, message: '' };
};

const formatPhoneDisplay = (phone, countryData) => {
  if (!phone || !countryData) return phone;
  
  const indicatif = (countryData.indicatif_tel || countryData.code_tel || '').replace('+', '');
  let phoneNumber = phone.replace(/\s+/g, '');
  
  if (phoneNumber.startsWith(`+${indicatif}`) || phoneNumber.startsWith(indicatif)) {
    phoneNumber = phoneNumber.replace(`+${indicatif}`, '').replace(indicatif, '');
  }
  
  if (['TG', 'CI', 'BJ'].includes(countryData.code_iso)) {
    if (phoneNumber.length === 8) {
      return `+${indicatif} ${phoneNumber.substring(0, 2)} ${phoneNumber.substring(2, 4)} ${phoneNumber.substring(4, 6)} ${phoneNumber.substring(6, 8)}`;
    }
  } else if (countryData.code_iso === 'FR') {
    if (phoneNumber.length === 9) {
      return `+${indicatif} ${phoneNumber.charAt(0)} ${phoneNumber.substring(1, 3)} ${phoneNumber.substring(3, 5)} ${phoneNumber.substring(5, 7)} ${phoneNumber.substring(7, 9)}`;
    }
  }
  
  return `+${indicatif} ${phoneNumber}`;
};

export default function EntitiesPage() {
  const [entities, setEntities] = useState([]);
  const [users, setUsers] = useState([]);
  const [pays, setPays] = useState([]);
  const [devises, setDevises] = useState([]);
  const [langues, setLangues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingEntity, setEditingEntity] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState(null);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatut, setFilterStatut] = useState('');
  const [filterPays, setFilterPays] = useState('');
  const [selectedRows, setSelectedRows] = useState([]);

  // Chargement initial
  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [entitiesRes, usersRes, paysRes, devisesRes, languesRes] = await Promise.all([
        apiClient.get('/entites/'),
        apiClient.get('/users/'),
        apiClient.get('/pays/'),
        apiClient.get('/devises/'),
        apiClient.get('/langues/')
      ]);
      
      const extractData = (response) => {
        if (Array.isArray(response)) return response;
        if (response && Array.isArray(response.results)) return response.results;
        if (response && Array.isArray(response.data)) return response.data;
        return [];
      };
      
      setEntities(extractData(entitiesRes));
      setUsers(extractData(usersRes));
      setPays(extractData(paysRes));
      setDevises(extractData(devisesRes));
      setLangues(extractData(languesRes));
      
    } catch (err) {
      console.error('Erreur lors du chargement des données:', err);
      setError('Erreur lors du chargement des données');
      setEntities([]);
      setUsers([]);
      setPays([]);
      setDevises([]);
      setLangues([]);
    } finally {
      setLoading(false);
    }
  };

  const getVilleName = (ville) => {
    if (!ville) return '';
    if (typeof ville === 'string') return ville;
    if (typeof ville === 'object') {
      return ville.nom || ville.name || ville.nom_fr || '';
    }
    return String(ville);
  };

  // Filtrage et recherche
  const filteredEntities = entities.filter(entity => {
    const matchesSearch = 
      (entity.raison_sociale || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (entity.activite || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (entity.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      getVilleName(entity.ville).toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatut = !filterStatut || 
      (filterStatut === 'actif' ? entity.statut : !entity.statut);
    
    const matchesPays = !filterPays || 
      (entity.pays && entity.pays.id && entity.pays.id.toString() === filterPays);
    
    return matchesSearch && matchesStatut && matchesPays;
  });

  // Calculs pour la pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentEntities = Array.isArray(filteredEntities) ? filteredEntities.slice(indexOfFirstItem, indexOfLastItem) : [];
  const totalPages = Math.ceil((Array.isArray(filteredEntities) ? filteredEntities.length : 0) / itemsPerPage);

  // Pagination
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
    if (selectedRows.length === currentEntities.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(currentEntities.map(entity => entity.id));
    }
  };

  // Gestion des actions
  const handleNewEntity = () => {
    setEditingEntity(null);
    setShowForm(true);
  };

  const handleEdit = (entity) => {
    setEditingEntity(entity);
    setShowForm(true);
  };

  const handleDelete = async (entity) => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer l'entité "${entity.raison_sociale}" ? Cette action est irréversible.`)) {
      try {
        await apiClient.delete(`/entites/${entity.id}/`);
        fetchAllData();
      } catch (err) {
        setError('Erreur lors de la suppression');
        console.error('Error deleting entity:', err);
      }
    }
  };

  const handleViewDetails = (entity) => {
    setSelectedEntity(entity);
    setShowDetailModal(true);
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingEntity(null);
    fetchAllData();
  };

  const handleRetry = () => {
    fetchAllData();
  };

  const resetFilters = () => {
    setSearchTerm('');
    setFilterStatut('');
    setFilterPays('');
    setCurrentPage(1);
  };

  // Statistiques
  const stats = {
    total: entities.length,
    actives: entities.filter(e => e.statut).length,
    inactives: entities.filter(e => !e.statut).length,
    withLogo: entities.filter(e => e.logo).length,
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
        {/* Ligne supérieure avec titre */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-gradient-to-br from-violet-600 to-violet-500 rounded-lg shadow">
              <TbBuildingSkyscraper className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Gestion des Sociétés</h1>
              <p className="text-gray-600 text-xs mt-0.5">
                Gérez toutes les sociétés de votre organisation
              </p>
            </div>
          </div>
        </div>

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
                placeholder="Rechercher une société..."
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
                  onClick={() => {}}
                  className="flex items-center gap-1 px-2 py-1.5 rounded text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                >
                  <FiChevronDown size={12} />
                  <span>Filtre</span>
                </button>
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
              onClick={handleNewEntity}
              className="ml-2 px-3 py-2 rounded-lg bg-gradient-to-r from-violet-600 to-violet-500 text-white hover:from-violet-700 hover:to-violet-600 transition-all duration-300 flex items-center gap-1.5 text-sm shadow"
            >
              <FiPlus size={14} />
              <span>Nouvelle Société</span>
            </button>
          </div>
        </div>

        {/* Statistiques en ligne compactes */}
        <div className="grid grid-cols-4 gap-2 mb-3">
          <div className="bg-white rounded-lg p-2 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Total sociétés</p>
                <p className="text-sm font-bold text-violet-600 mt-0.5">{stats.total}</p>
              </div>
              <div className="p-1 bg-violet-50 rounded">
                <TbBuildingSkyscraper className="w-3 h-3 text-violet-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg p-2 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Actives</p>
                <p className="text-sm font-bold text-green-600 mt-0.5">{stats.actives}</p>
              </div>
              <div className="p-1 bg-green-50 rounded">
                <FiCheckCircle className="w-3 h-3 text-green-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg p-2 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Inactives</p>
                <p className="text-sm font-bold text-red-600 mt-0.5">{stats.inactives}</p>
              </div>
              <div className="p-1 bg-red-50 rounded">
                <FiXCircle className="w-3 h-3 text-red-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg p-2 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Avec logo</p>
                <p className="text-sm font-bold text-blue-600 mt-0.5">{stats.withLogo}</p>
              </div>
              <div className="p-1 bg-blue-50 rounded">
                <FiImage className="w-3 h-3 text-blue-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Onglets (si besoin pour une future fonctionnalité) */}
        <div className="flex border-b border-gray-200 mb-3">
          <button
            onClick={() => {
              setCurrentPage(1);
              setSelectedRows([]);
              resetFilters();
            }}
            className="px-4 py-1.5 text-xs font-medium border-b-2 border-violet-600 text-violet-600 transition-colors"
          >
            Toutes les sociétés
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
                  <FiX className="w-3 h-3 text-red-600" />
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

      {/* Tableau Principal */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {/* En-tête du tableau avec actions compact */}
        <div className="px-3 py-2 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={selectedRows.length === currentEntities.length && currentEntities.length > 0}
                  onChange={selectAllRows}
                  className="w-3 h-3 text-violet-600 rounded focus:ring-violet-500 border-gray-300"
                />
                <span className="text-xs text-gray-700">
                  {selectedRows.length} sélectionné(s)
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button className="p-1 hover:bg-gray-100 rounded transition-colors text-gray-600">
                <FiDownload size={14} />
              </button>
              <button className="p-1 hover:bg-gray-100 rounded transition-colors text-gray-600">
                <FiUpload size={14} />
              </button>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="border border-gray-300 rounded px-1.5 py-0.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent"
              >
                <option value={5}>5 lignes</option>
                <option value={10}>10 lignes</option>
                <option value={20}>20 lignes</option>
                <option value={50}>50 lignes</option>
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
                      checked={selectedRows.length === currentEntities.length && currentEntities.length > 0}
                      onChange={selectAllRows}
                      className="w-3 h-3 text-violet-600 rounded focus:ring-violet-500 border-gray-300"
                    />
                    ID
                  </div>
                </th>
                <th scope="col" className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-300">
                  Société
                </th>
                <th scope="col" className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-300">
                  Activité
                </th>
                <th scope="col" className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-300">
                  Localisation
                </th>
                <th scope="col" className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-300">
                  Contact
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
              {currentEntities.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-4 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-12 h-12 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mb-2">
                        <TbBuildingSkyscraper className="w-6 h-6 text-gray-400" />
                      </div>
                      <h3 className="text-sm font-semibold text-gray-900 mb-1">
                        {entities.length === 0 ? 'Aucune société trouvée' : 'Aucun résultat'}
                      </h3>
                      <p className="text-gray-600 text-xs mb-3 max-w-md">
                        {entities.length === 0 
                          ? 'Commencez par créer votre première société' 
                          : 'Essayez de modifier vos critères de recherche'}
                      </p>
                      {entities.length === 0 && (
                        <button 
                          onClick={handleNewEntity}
                          className="px-3 py-1 bg-gradient-to-r from-violet-600 to-violet-500 text-white rounded hover:from-violet-700 hover:to-violet-600 transition-all duration-300 font-medium flex items-center gap-1 text-xs"
                        >
                          <FiPlus size={12} />
                          Créer société
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                currentEntities.map((entity) => (
                  <tr 
                    key={entity.id}
                    className={`hover:bg-gradient-to-r hover:from-gray-50 hover:to-white transition-all duration-200 ${
                      selectedRows.includes(entity.id) ? 'bg-gradient-to-r from-violet-50 to-violet-25' : 'bg-white'
                    }`}
                  >
                    {/* ID avec checkbox */}
                    <td className="px-3 py-2 whitespace-nowrap border-r border-gray-200">
                      <div className="flex items-center gap-1.5">
                        <input
                          type="checkbox"
                          checked={selectedRows.includes(entity.id)}
                          onChange={() => toggleRowSelection(entity.id)}
                          className="w-3 h-3 text-violet-600 rounded focus:ring-violet-500 border-gray-300"
                        />
                        <span className="px-1 py-0.5 bg-gray-100 text-gray-800 rounded text-xs font-medium font-mono">
                          #{entity.id}
                        </span>
                      </div>
                    </td>
                    
                    {/* Société */}
                    <td className="px-3 py-2 border-r border-gray-200">
                      <div className="flex items-center gap-2">
                        {entity.logo ? (
                          <div className="w-8 h-8 rounded-full overflow-hidden bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200">
                            <img src={entity.logo} alt={entity.raison_sociale} className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <div className="w-8 h-8 bg-gradient-to-br from-violet-50 to-violet-100 rounded-full flex items-center justify-center border border-violet-200">
                            <TbBuildingSkyscraper className="w-4 h-4 text-violet-600" />
                          </div>
                        )}
                        <div>
                          <div className="text-xs font-semibold text-gray-900 truncate max-w-[120px]">{entity.raison_sociale}</div>
                          <div className="text-xs text-gray-500">{entity.forme_juridique || '-'}</div>
                        </div>
                      </div>
                    </td>
                    
                    {/* Activité */}
                    <td className="px-3 py-2 border-r border-gray-200">
                      <div className="text-xs text-gray-900 truncate max-w-[100px]">
                        {entity.activite || '-'}
                      </div>
                    </td>
                    
                    {/* Localisation */}
                    <td className="px-3 py-2 border-r border-gray-200">
                      <div className="flex flex-col">
                        <div className="text-xs text-gray-900">
                          {entity.ville_details?.nom || entity.ville_legacy || '-'}
                        </div>
                        <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                          {entity.pays_details?.emoji || '🌍'}
                          <span className="truncate max-w-[80px]">{entity.pays_details?.nom || '-'}</span>
                        </div>
                      </div>
                    </td>
                    
                    {/* Contact */}
                    <td className="px-3 py-2 border-r border-gray-200">
                      <div className="flex flex-col">
                        <div className="text-xs text-gray-900 truncate max-w-[100px]">{entity.email || '-'}</div>
                        <div className="text-xs text-gray-500 truncate max-w-[100px]">{entity.telephone || '-'}</div>
                      </div>
                    </td>
                    
                    {/* Statut */}
                    <td className="px-3 py-2 border-r border-gray-200">
                      <div className="flex items-center">
                        <div className={`px-1.5 py-0.5 rounded flex items-center gap-1 ${
                          entity.statut
                            ? 'bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 border border-green-200' 
                            : 'bg-gradient-to-r from-red-50 to-pink-50 text-red-700 border border-red-200'
                        }`}>
                          {entity.statut ? (
                            <>
                              <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                              <span className="text-xs font-medium">Active</span>
                            </>
                          ) : (
                            <>
                              <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
                              <span className="text-xs font-medium">Inactive</span>
                            </>
                          )}
                        </div>
                      </div>
                    </td>
                    
                    {/* Actions */}
                    <td className="px-3 py-2 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleViewDetails(entity)}
                          className="p-1 bg-gradient-to-r from-gray-50 to-gray-100 text-gray-700 rounded hover:from-gray-100 hover:to-gray-200 transition-all duration-200 shadow-sm hover:shadow"
                          title="Voir détails"
                        >
                          <FiEye size={12} />
                        </button>
                        <button
                          onClick={() => handleEdit(entity)}
                          className="p-1 bg-gradient-to-r from-violet-50 to-violet-100 text-violet-700 rounded hover:from-violet-100 hover:to-violet-200 transition-all duration-200 shadow-sm hover:shadow"
                          title="Modifier"
                        >
                          <FiEdit2 size={12} />
                        </button>
                        <button
                          onClick={() => handleDelete(entity)}
                          className="p-1 bg-gradient-to-r from-red-50 to-red-100 text-red-700 rounded hover:from-red-100 hover:to-red-200 transition-all duration-200 shadow-sm hover:shadow"
                          title="Supprimer"
                        >
                          <FiTrash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination compact */}
        {currentEntities.length > 0 && (
          <div className="px-3 py-2 border-t border-gray-200 bg-gradient-to-r from-gray-50 to-white">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <span className="text-xs text-gray-700">
                    Page {currentPage} sur {totalPages}
                  </span>
                  <span className="text-gray-300">•</span>
                  <span className="text-xs text-gray-700">
                    {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredEntities.length)} sur {filteredEntities.length} sociétés
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

      {/* Modaux */}
      {showForm && (
        <EntityFormModal
          entity={editingEntity}
          users={users}
          pays={pays}
          devises={devises}
          langues={langues}
          onClose={() => {
            setShowForm(false);
            setEditingEntity(null);
          }}
          onSuccess={handleFormSuccess}
        />
      )}

      {showDetailModal && selectedEntity && (
        <EntityDetailModal
          entity={selectedEntity}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedEntity(null);
          }}
        />
      )}
    </div>
  );
}

// MODAL DE DÉTAILS SOCIÉTÉ
function EntityDetailModal({ entity, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-3 z-50 backdrop-blur-sm">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-xl">
        {/* Header du modal */}
        <div className="sticky top-0 bg-gradient-to-r from-violet-600 to-violet-500 text-white rounded-t-lg p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-white/20 backdrop-blur-sm rounded">
                <TbBuildingSkyscraper className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold">Détails de la Société</h2>
                <p className="text-violet-100 text-xs mt-0.5">{entity.raison_sociale}</p>
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
          {/* En-tête avec logo */}
          <div className="flex flex-col md:flex-row items-center md:items-start gap-4 mb-6">
            <div className="w-32 h-32 bg-gradient-to-br from-violet-100 to-violet-200 rounded-lg flex items-center justify-center overflow-hidden border-2 border-violet-300">
              {entity.logo ? (
                <img 
                  src={entity.logo} 
                  alt={entity.raison_sociale}
                  className="w-full h-full object-contain p-3"
                />
              ) : (
                <TbBuildingSkyscraper className="w-16 h-16 text-violet-600" />
              )}
            </div>
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-xl font-bold text-gray-900">{entity.raison_sociale}</h1>
              <p className="text-gray-600 mt-1">{entity.activite}</p>
              <div className="flex flex-wrap gap-2 mt-3 justify-center md:justify-start">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                  entity.statut
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {entity.statut ? 'Active' : 'Inactive'}
                </span>
                {entity.forme_juridique && (
                  <span className="inline-flex items-center px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-medium">
                    {entity.forme_juridique}
                  </span>
                )}
                {entity.pays_details && (
                  <span className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                    <FiGlobe className="w-3 h-3 mr-1" />
                    {entity.pays_details.nom}
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
                <p className="text-xs font-medium text-gray-500 mb-1">Identifiant</p>
                <p className="text-sm text-gray-900 font-mono font-medium">#{entity.id}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Date de création</p>
                <p className="text-sm text-gray-900">
                  {entity.date_creation ? new Date(entity.date_creation).toLocaleDateString('fr-FR') : '-'}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Capital social</p>
                <p className="text-sm text-gray-900 font-medium">
                  {entity.capital_social ? `${parseFloat(entity.capital_social).toLocaleString('fr-FR')} ${entity.devise?.code || 'XOF'}` : '-'}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Langue</p>
                <p className="text-sm text-gray-900">
                  {entity.langue_details?.nom || 'Français'}
                </p>
              </div>
            </div>
          </div>

          {/* Informations Légales */}
          <div className="bg-gradient-to-br from-blue-50 to-white rounded-lg p-4 border border-blue-200">
            <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-1.5">
              <div className="w-1 h-4 bg-gradient-to-b from-blue-600 to-blue-400 rounded"></div>
              Informations Légales
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {entity.registre_commerce && (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">Registre de Commerce</p>
                  <p className="text-sm text-gray-900 font-medium">{entity.registre_commerce}</p>
                </div>
              )}
              {entity.numero_fiscal && (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">Numéro Fiscal</p>
                  <p className="text-sm text-gray-900 font-medium">{entity.numero_fiscal}</p>
                </div>
              )}
              {entity.securite_sociale && (
                <div className="md:col-span-2">
                  <p className="text-xs font-medium text-gray-500 mb-1">Sécurité Sociale</p>
                  <p className="text-sm text-gray-900">{entity.securite_sociale}</p>
                </div>
              )}
            </div>
          </div>

          {/* Localisation */}
          <div className="bg-gradient-to-br from-purple-50 to-white rounded-lg p-4 border border-purple-200">
            <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-1.5">
              <div className="w-1 h-4 bg-gradient-to-b from-purple-600 to-purple-400 rounded"></div>
              Localisation
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <p className="text-xs font-medium text-gray-500 mb-1">Adresse</p>
                <p className="text-sm text-gray-900 whitespace-pre-line">{entity.adresse || '-'}</p>
                {entity.complement_adresse && (
                  <p className="text-sm text-gray-600 mt-1">{entity.complement_adresse}</p>
                )}
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Code Postal</p>
                <p className="text-sm text-gray-900">{entity.code_postal || '-'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Pays</p>
                <div className="flex items-center gap-2">
                  <span className="text-lg">{entity.pays_details?.emoji || '🌍'}</span>
                  <p className="text-sm text-gray-900 font-medium">{entity.pays_details?.nom || '-'}</p>
                  {entity.pays_details?.indicatif_tel && (
                    <span className="text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                      {entity.pays_details.indicatif_tel}
                    </span>
                  )}
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Région/État</p>
                <p className="text-sm text-gray-900">{entity.subdivision_details?.nom || '-'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Ville</p>
                <p className="text-sm text-gray-900">{entity.ville_details?.nom || '-'}</p>
              </div>
            </div>
          </div>

          {/* Contact */}
          <div className="bg-gradient-to-br from-cyan-50 to-white rounded-lg p-4 border border-cyan-200">
            <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-1.5">
              <div className="w-1 h-4 bg-gradient-to-b from-cyan-600 to-cyan-400 rounded"></div>
              Contact
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Téléphone</p>
                <div className="flex items-center gap-2">
                  <FiPhone className="w-4 h-4 text-gray-400" />
                  <p className="text-sm text-gray-900">{entity.telephone || '-'}</p>
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Email</p>
                <div className="flex items-center gap-2">
                  <FiMail className="w-4 h-4 text-gray-400" />
                  <a href={`mailto:${entity.email}`} className="text-sm text-blue-600 hover:underline">
                    {entity.email || '-'}
                  </a>
                </div>
              </div>
              {entity.site_web && (
                <div className="md:col-span-2">
                  <p className="text-xs font-medium text-gray-500 mb-1">Site Web</p>
                  <div className="flex items-center gap-2">
                    <FiGlobe className="w-4 h-4 text-gray-400" />
                    <a href={entity.site_web} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline truncate">
                      {entity.site_web}
                    </a>
                </div>
                </div>
              )}
            </div>
          </div>

          {/* Devise et Langue */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gradient-to-br from-emerald-50 to-white rounded-lg p-4 border border-emerald-200">
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-1.5">
                <div className="w-1 h-4 bg-gradient-to-b from-emerald-600 to-emerald-400 rounded"></div>
                Devise
              </h3>
              <p className="text-sm text-gray-900">
                {entity.devise_details 
                  ? `${entity.devise_details.code} - ${entity.devise_details.nom} (${entity.devise_details.symbole})` 
                  : '-'}
              </p>
            </div>

            <div className="bg-gradient-to-br from-amber-50 to-white rounded-lg p-4 border border-amber-200">
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-1.5">
                <div className="w-1 h-4 bg-gradient-to-b from-amber-600 to-amber-400 rounded"></div>
                Langue
              </h3>
              <p className="text-sm text-gray-900">
                {entity.langue_details 
                  ? `${entity.langue_details.nom} (${entity.langue_details.code})` 
                  : '-'}
              </p>
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

// COMPOSANT MODAL AVEC DROPDOWNS AVEC RECHERCHE INTÉGRÉE - FORMULAIRE COMPLET
function EntityFormModal({ entity, users, pays, devises, langues, onClose, onSuccess }) {
  // Données pour les listes déroulantes
  const secteursActivite = [
    "Agriculture", "Agroalimentaire", "Artisanat", "Assurance", "Automobile",
    "Bancaire", "Bâtiment et Travaux Publics", "Commerce", "Communication",
    "Construction", "Consulting", "Distribution", "Éducation", "Énergie",
    "Finance", "Immobilier", "Industrie", "Informatique et Technologie",
    "Logistique", "Médical et Santé", "Restaurant et Hôtellerie", "Services",
    "Tourisme", "Transport", "Autre"
  ];

  const formesJuridiques = [
    "Entreprise Individuelle (EI)",
    "Entreprise Unipersonnelle à Responsabilité Limitée (EURL)",
    "Société à Responsabilité Limitée (SARL)",
    "Société Anonyme (SA)",
    "Société par Actions Simplifiée (SAS)",
    "Société par Actions Simplifiée Unipersonnelle (SASU)",
    "Société en Nom Collectif (SNC)",
    "Société Civile",
    "Groupement d'Intérêt Economique (GIE)",
    "Société Coopérative",
    "Association",
    "Fondation",
    "Autre"
  ];

  // États pour le formulaire
  const [formData, setFormData] = useState({
    // 1. Informations de base
    raison_sociale: entity?.raison_sociale || '',
    activite: entity?.activite || '',
    activite_autre: '',
    
    // 2. Localisation (ordre correct)
    pays: entity?.pays?.id || entity?.pays || '',
    subdivision: entity?.subdivision?.id || entity?.subdivision || '',
    ville: entity?.ville?.id || entity?.ville || '',
    
    // 3. Informations supplémentaires
    forme_juridique: entity?.forme_juridique || '',
    forme_juridique_autre: '',
    capital_social: entity?.capital_social || '',
    date_creation: entity?.date_creation || new Date().toISOString().split('T')[0],
    
    // 4. Informations légales
    registre_commerce: entity?.registre_commerce || '',
    numero_fiscal: entity?.numero_fiscal || '',
    securite_sociale: entity?.securite_sociale || '',
    
    // 5. Adresse
    adresse: entity?.adresse || '',
    complement_adresse: entity?.complement_adresse || '',
    code_postal: entity?.code_postal || '',
    
    // 6. Contact
    telephone: entity?.telephone || '',
    email: entity?.email || '',
    site_web: entity?.site_web || '',
    
    // 7. Paramètres
    devise: entity?.devise?.id || entity?.devise || '',
    langue: entity?.langue?.id || entity?.langue || '',
    statut: entity?.statut !== undefined ? entity.statut : true,
    
    // 8. Administration
    cree_par: entity?.cree_par?.id || '',
    parent_id: entity?.parent_id?.id || entity?.parent_id || '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [phoneError, setPhoneError] = useState('');
  const [showAutreActivite, setShowAutreActivite] = useState(false);
  const [showAutreFormeJuridique, setShowAutreFormeJuridique] = useState(false);
  
  // ÉTATS POUR LISTES DYNAMIQUES
  const [subdivisions, setSubdivisions] = useState([]);
  const [villes, setVilles] = useState([]);
  const [loadingSubdivisions, setLoadingSubdivisions] = useState(false);
  const [loadingVilles, setLoadingVilles] = useState(false);
  
  // ÉTATS POUR LE PAYS SÉLECTIONNÉ ET SON INDICATIF
  const [selectedPays, setSelectedPays] = useState(null);
  const [indicatif, setIndicatif] = useState('');

  // ÉTATS POUR RECHERCHE DANS LES DROPDOWNS
  const [searchActivite, setSearchActivite] = useState('');
  const [searchFormeJuridique, setSearchFormeJuridique] = useState('');
  const [searchPays, setSearchPays] = useState('');
  const [searchDevise, setSearchDevise] = useState('');
  const [searchLangue, setSearchLangue] = useState('');
  const [searchSubdivision, setSearchSubdivision] = useState('');
  const [searchVille, setSearchVille] = useState('');

  // S'assurer que les tableaux sont toujours des tableaux
  const usersArray = Array.isArray(users) ? users : [];
  const paysArray = Array.isArray(pays) ? pays : [];
  const devisesArray = Array.isArray(devises) ? devises : [];
  const languesArray = Array.isArray(langues) ? langues : [];

  // Filtrer les listes avec la recherche
  const filteredSecteursActivite = secteursActivite.filter(secteur =>
    secteur.toLowerCase().includes(searchActivite.toLowerCase())
  );

  const filteredFormesJuridiques = formesJuridiques.filter(forme =>
    forme.toLowerCase().includes(searchFormeJuridique.toLowerCase())
  );

  const filteredPays = paysArray.filter(paysItem =>
    (paysItem.nom_fr || paysItem.nom).toLowerCase().includes(searchPays.toLowerCase()) ||
    (paysItem.code_iso || '').toLowerCase().includes(searchPays.toLowerCase())
  );

  const filteredDevises = devisesArray.filter(devise =>
    devise.nom.toLowerCase().includes(searchDevise.toLowerCase()) ||
    (devise.code || '').toLowerCase().includes(searchDevise.toLowerCase())
  );

  const filteredLangues = languesArray.filter(langue =>
    langue.nom.toLowerCase().includes(searchLangue.toLowerCase()) ||
    (langue.code || '').toLowerCase().includes(searchLangue.toLowerCase())
  );

  const filteredSubdivisions = subdivisions.filter(subdivision =>
    subdivision.nom.toLowerCase().includes(searchSubdivision.toLowerCase()) ||
    (subdivision.code || '').toLowerCase().includes(searchSubdivision.toLowerCase())
  );

  const filteredVilles = villes.filter(ville =>
    ville.nom.toLowerCase().includes(searchVille.toLowerCase()) ||
    (ville.code_postal && ville.code_postal.includes(searchVille))
  );

  // DÉTECTER L'INDICATIF DU PAYS
  useEffect(() => {
    if (formData.pays) {
      const paysId = typeof formData.pays === 'object' ? formData.pays.id : formData.pays;
      const paysTrouve = paysArray.find(p => p.id === parseInt(paysId));
      
      if (paysTrouve) {
        setSelectedPays(paysTrouve);
        const indicatifPays = paysTrouve.indicatif_tel || paysTrouve.code_tel || '';
        setIndicatif(indicatifPays);
        
        if (formData.telephone) {
          const validation = validatePhoneByCountry(formData.telephone, paysTrouve);
          setPhoneError(validation.message);
        }
      }
    } else {
      setSelectedPays(null);
      setIndicatif('');
    }
  }, [formData.pays, formData.telephone, paysArray]);

  // CHARGEMENT DYNAMIQUE DES SUBDIVISIONS
  useEffect(() => {
    const fetchSubdivisions = async () => {
      if (formData.pays) {
        setLoadingSubdivisions(true);
        try {
          const response = await apiClient.get(`/subdivisions/?pays=${formData.pays}`);
          
          let subdivisionsData = [];
          if (Array.isArray(response)) {
            subdivisionsData = response;
          } else if (response && Array.isArray(response.results)) {
            subdivisionsData = response.results;
          }
          
          setSubdivisions(subdivisionsData);
          
          if (formData.subdivision) {
            const currentSubdivisionExists = subdivisionsData.some(
              sub => sub.id.toString() === formData.subdivision.toString()
            );
            if (!currentSubdivisionExists) {
              setFormData(prev => ({ ...prev, subdivision: '', ville: '' }));
            }
          }
        } catch (err) {
          console.error('Erreur chargement subdivisions:', err);
          setSubdivisions([]);
        } finally {
          setLoadingSubdivisions(false);
        }
      } else {
        setSubdivisions([]);
        setFormData(prev => ({ ...prev, subdivision: '', ville: '' }));
      }
    };

    fetchSubdivisions();
  }, [formData.pays, formData.subdivision]);

  // CHARGEMENT DYNAMIQUE DES VILLES
  useEffect(() => {
    const fetchVilles = async () => {
      if (formData.subdivision) {
        setLoadingVilles(true);
        try {
          const response = await apiClient.get(`/villes/?subdivision=${formData.subdivision}`);
          
          let villesData = [];
          if (Array.isArray(response)) {
            villesData = response;
          } else if (response && Array.isArray(response.results)) {
            villesData = response.results;
          }
          
          setVilles(villesData);
          
          if (formData.ville) {
            const currentVilleExists = villesData.some(
              ville => ville.id.toString() === formData.ville.toString()
            );
            if (!currentVilleExists) {
              setFormData(prev => ({ ...prev, ville: '' }));
            }
          }
        } catch (err) {
          console.error('Erreur chargement villes:', err);
          setVilles([]);
        } finally {
          setLoadingVilles(false);
        }
      } else {
        setVilles([]);
        setFormData(prev => ({ ...prev, ville: '' }));
      }
    };

    fetchVilles();
  }, [formData.subdivision, formData.ville]);

  // Gestion du choix "Autre" pour les listes déroulantes
  useEffect(() => {
    setShowAutreActivite(formData.activite === 'Autre');
    setShowAutreFormeJuridique(formData.forme_juridique === 'Autre');
  }, [formData.activite, formData.forme_juridique]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setPhoneError('');

    // Validation
    if (!formData.raison_sociale.trim()) {
      setError('La raison sociale est obligatoire');
      setLoading(false);
      return;
    }

    if (!formData.activite) {
      setError('Le secteur d\'activité est obligatoire');
      setLoading(false);
      return;
    }

    if (showAutreActivite && !formData.activite_autre.trim()) {
      setError('Veuillez préciser le secteur d\'activité');
      setLoading(false);
      return;
    }

    if (!formData.pays) {
      setError('Le pays est obligatoire');
      setLoading(false);
      return;
    }

    if (!formData.subdivision) {
      setError('La région/état/province est obligatoire');
      setLoading(false);
      return;
    }

    if (!formData.ville) {
      setError('La ville est obligatoire');
      setLoading(false);
      return;
    }

    if (!formData.adresse.trim()) {
      setError('L\'adresse est obligatoire');
      setLoading(false);
      return;
    }

    if (!formData.telephone.trim()) {
      setError('Le téléphone est obligatoire');
      setLoading(false);
      return;
    }

    // Validation téléphone
    if (formData.telephone && selectedPays) {
      const validation = validatePhoneByCountry(formData.telephone, selectedPays);
      if (!validation.valid) {
        setError(validation.message);
        setLoading(false);
        return;
      }
    }

    if (!formData.email.trim()) {
      setError('L\'email est obligatoire');
      setLoading(false);
      return;
    }

    // Validation email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Veuillez entrer un email valide');
      setLoading(false);
      return;
    }

    try {
      const url = entity 
        ? `/entites/${entity.id}/`
        : `/entites/`;
      
      const method = entity ? 'PUT' : 'POST';

      // Préparer les données finales
      const submitData = {
        ...formData,
        activite: showAutreActivite ? formData.activite_autre : formData.activite,
        forme_juridique: showAutreFormeJuridique ? formData.forme_juridique_autre : formData.forme_juridique,
      };

      // Nettoyer les champs temporaires
      delete submitData.activite_autre;
      delete submitData.forme_juridique_autre;

      // Pour la création, récupérer l'utilisateur connecté
      if (!entity) {
        const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
        if (currentUser.id) {
          submitData.cree_par = currentUser.id;
        }
      }

      console.log('📤 Données envoyées:', submitData);
      
      const response = await apiClient.request(url, {
        method: method,
        body: JSON.stringify(submitData),
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log('✅ Réponse:', response);
      onSuccess();
      
    } catch (err) {
      console.error('❌ Erreur sauvegarde société:', err);
      
      let errorMessage = 'Erreur lors de la sauvegarde';
      if (err.response?.data) {
        const errorData = err.response.data;
        if (typeof errorData === 'object') {
          errorMessage = Object.entries(errorData)
            .map(([field, errors]) => `${field}: ${Array.isArray(errors) ? errors.join(', ') : errors}`)
            .join('\n');
        } else {
          errorMessage = JSON.stringify(errorData);
        }
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

  // Composant réutilisable pour les dropdowns avec recherche
  const SearchableDropdown = ({ 
    label, 
    value, 
    onChange, 
    options, 
    searchValue,
    onSearchChange,
    placeholder,
    required = false,
    disabled = false,
    icon: Icon,
    getOptionLabel = (option) => option,
    getOptionValue = (option) => option,
    renderOption = (option) => getOptionLabel(option)
  }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);
    const inputRef = useRef(null);

    const filteredOptions = options.filter(option =>
      getOptionLabel(option).toLowerCase().includes(searchValue.toLowerCase())
    );

    const selectedOption = options.find(opt => getOptionValue(opt) === value);

    useEffect(() => {
      const handleMouseDown = (event) => {
        if (!dropdownRef.current?.contains(event.target)) {
          setIsOpen(false);
          onSearchChange('');
        }
      };

      document.addEventListener('mousedown', handleMouseDown, true);
      
      return () => {
        document.removeEventListener('mousedown', handleMouseDown, true);
      };
    }, [onSearchChange]);

    const handleToggle = () => {
      if (!disabled) {
        setIsOpen(!isOpen);
        if (!isOpen) {
          setTimeout(() => {
            inputRef.current?.focus();
          }, 0);
        } else {
          onSearchChange('');
        }
      }
    };

    const handleInputMouseDown = (e) => {
      e.stopPropagation();
    };

    const handleInputFocus = (e) => {
      e.stopPropagation();
    };

    const handleInputClick = (e) => {
      e.stopPropagation();
    };

    const handleOptionClick = (optionValue) => {
      onChange(optionValue);
      setIsOpen(false);
      onSearchChange('');
    };

    return (
      <div className="relative" ref={dropdownRef}>
        {label && (
          <label className="block text-xs font-medium text-gray-700 mb-1">
            {label} {required && <span className="text-red-500">*</span>}
          </label>
        )}
        
        {/* Bouton d'ouverture du dropdown */}
        <button
          type="button"
          onClick={handleToggle}
          onMouseDown={(e) => e.preventDefault()}
          disabled={disabled}
          className={`w-full text-left border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent transition-all text-sm ${
            disabled 
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
              : 'bg-white hover:border-gray-400'
          } ${isOpen ? 'ring-1 ring-violet-500 border-violet-500' : ''}`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {Icon && <Icon className="text-gray-400" size={16} />}
              {selectedOption ? (
                <span className="text-gray-900 font-medium truncate">{getOptionLabel(selectedOption)}</span>
              ) : (
                <span className="text-gray-500 truncate">{placeholder || `Sélectionnez...`}</span>
              )}
            </div>
            <svg className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'transform rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </button>

        {/* Dropdown avec recherche */}
        {isOpen && (
          <div 
            className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-56 overflow-hidden"
            onMouseDown={handleInputMouseDown}
          >
            {/* Barre de recherche */}
            <div className="p-2 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <input
                  ref={inputRef}
                  type="text"
                  value={searchValue}
                  onChange={(e) => onSearchChange(e.target.value)}
                  onMouseDown={handleInputMouseDown}
                  onClick={handleInputClick}
                  onFocus={handleInputFocus}
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent text-sm bg-white"
                  placeholder={`Rechercher...`}
                  autoFocus
                />
              </div>
              <p className="text-xs text-gray-500 mt-1 px-1">
                {filteredOptions.length} résultat(s) trouvé(s)
              </p>
            </div>
            
            {/* Liste des options */}
            <div className="max-h-44 overflow-y-auto">
              {filteredOptions.length === 0 ? (
                <div className="p-4 text-center">
                  <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-2">
                    <FiSearch className="text-gray-400" />
                  </div>
                  <p className="text-gray-500 text-xs">Aucun résultat trouvé</p>
                </div>
              ) : (
                filteredOptions.map((option, index) => (
                  <div
                    key={index}
                    className={`px-3 py-2 cursor-pointer hover:bg-violet-50 text-sm border-b border-gray-100 last:border-b-0 transition-colors ${
                      value === getOptionValue(option) ? 'bg-gradient-to-r from-violet-50 to-violet-100 text-violet-700 font-medium' : 'text-gray-700'
                    }`}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onClick={() => handleOptionClick(getOptionValue(option))}
                  >
                    {renderOption(option)}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Affichage de la valeur sélectionnée */}
        {selectedOption && !isOpen && (
          <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
            <FiCheck size={12} />
            Sélectionné: <span className="font-medium truncate">{getOptionLabel(selectedOption)}</span>
          </p>
        )}
      </div>
    );
  };

  // Récupérer l'utilisateur connecté
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-3 z-50 backdrop-blur-sm">
      <div className="bg-white rounded-lg w-full max-w-5xl max-h-[90vh] overflow-y-auto shadow-xl">
        {/* Header du modal avec gradient - COMPACT */}
        <div className="sticky top-0 bg-gradient-to-r from-violet-600 to-violet-500 text-white rounded-t-lg p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-white/20 backdrop-blur-sm rounded">
                <TbBuildingSkyscraper className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold">
                  {entity ? 'Modifier la société' : 'Nouvelle Société'}
                </h2>
                {!entity && (
                  <p className="text-violet-100 text-xs mt-0.5">
                    Créez une nouvelle société dans le système
                  </p>
                )}
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
        
        {error && (
          <div className="mx-4 mt-3 bg-gradient-to-r from-red-50 to-red-100 border-l-3 border-red-500 rounded-r-lg p-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-red-100 rounded">
                <FiX className="text-red-600" size={14} />
              </div>
              <span className="text-red-800 text-xs font-medium whitespace-pre-line">{error}</span>
            </div>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Section 1: Informations de Base (ORDRE CORRECT) */}
          <div className="bg-gradient-to-br from-gray-50 to-white rounded-lg p-3 border border-gray-200">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-4 bg-gradient-to-b from-violet-600 to-violet-400 rounded"></div>
              <h3 className="text-sm font-semibold text-gray-900">Informations de Base</h3>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {/* 1. Raison sociale */}
              <div className="lg:col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Raison Sociale <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.raison_sociale}
                  onChange={(e) => handleChange('raison_sociale', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent bg-white text-sm"
                  placeholder="Nom officiel de la société"
                />
              </div>
              
              {/* 2. Secteur d'Activité */}
              <div className="lg:col-span-2">
                <SearchableDropdown
                  label="Secteur d'Activité"
                  value={formData.activite}
                  onChange={(value) => handleChange('activite', value)}
                  options={secteursActivite}
                  searchValue={searchActivite}
                  onSearchChange={setSearchActivite}
                  placeholder="Sélectionnez un secteur d'activité"
                  required={true}
                  icon={FiActivity}
                />
                {showAutreActivite && (
                  <div className="mt-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Précisez le secteur d'activité <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.activite_autre}
                      onChange={(e) => handleChange('activite_autre', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent text-sm"
                      placeholder="Secteur d'activité"
                      required
                    />
                  </div>
                )}
              </div>
              
              {/* 3. Forme Juridique */}
              <div>
                <SearchableDropdown
                  label="Forme Juridique"
                  value={formData.forme_juridique}
                  onChange={(value) => handleChange('forme_juridique', value)}
                  options={formesJuridiques}
                  searchValue={searchFormeJuridique}
                  onSearchChange={setSearchFormeJuridique}
                  placeholder="Sélectionnez une forme juridique"
                  icon={FiFileText}
                />
                {showAutreFormeJuridique && (
                  <div className="mt-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Précisez la forme juridique
                    </label>
                    <input
                      type="text"
                      value={formData.forme_juridique_autre}
                      onChange={(e) => handleChange('forme_juridique_autre', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent text-sm"
                      placeholder="Forme juridique"
                    />
                  </div>
                )}
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Capital Social</label>
                <div className="relative">
                  <FiDollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.capital_social}
                    onChange={(e) => handleChange('capital_social', e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent text-sm"
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Localisation (ORDRE CORRECT) */}
          <div className="bg-gradient-to-br from-blue-50 to-white rounded-lg p-3 border border-blue-100">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-4 bg-gradient-to-b from-blue-600 to-blue-400 rounded"></div>
              <h3 className="text-sm font-semibold text-gray-900">Localisation</h3>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {/* 4. Pays */}
              <div>
                <SearchableDropdown
                  label="Pays"
                  value={formData.pays}
                  onChange={(value) => handleChange('pays', value)}
                  options={paysArray}
                  searchValue={searchPays}
                  onSearchChange={setSearchPays}
                  placeholder="Sélectionnez un pays"
                  required={true}
                  icon={FiGlobe}
                  getOptionLabel={(paysItem) => `${paysItem.emoji || '🌍'} ${paysItem.nom_fr || paysItem.nom} (${paysItem.code_iso})`}
                  getOptionValue={(paysItem) => paysItem.id}
                />
              </div>

              {/* 5. Subdivision */}
              <div>
                <SearchableDropdown
                  label="État/Province/Région"
                  value={formData.subdivision}
                  onChange={(value) => handleChange('subdivision', value)}
                  options={subdivisions}
                  searchValue={searchSubdivision}
                  onSearchChange={setSearchSubdivision}
                  placeholder="Sélectionnez une subdivision"
                  required={true}
                  disabled={!formData.pays || loadingSubdivisions}
                  icon={FiMap}
                  getOptionLabel={(subdivision) => `${subdivision.nom} (${subdivision.type_subdivision})`}
                  getOptionValue={(subdivision) => subdivision.id}
                />
                {!formData.pays && (
                  <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                    <FiGlobe size={10} />
                    Veuillez d'abord sélectionner un pays
                  </p>
                )}
                {loadingSubdivisions && (
                  <p className="text-xs text-blue-500 mt-1 flex items-center gap-1">
                    <FiRefreshCw className="animate-spin" size={10} />
                    Chargement des subdivisions...
                  </p>
                )}
              </div>

              {/* 6. Ville */}
              <div>
                <SearchableDropdown
                  label="Ville"
                  value={formData.ville}
                  onChange={(value) => handleChange('ville', value)}
                  options={villes}
                  searchValue={searchVille}
                  onSearchChange={setSearchVille}
                  placeholder="Sélectionnez une ville"
                  required={true}
                  disabled={!formData.subdivision || loadingVilles}
                  icon={FiMapPin}
                  getOptionLabel={(ville) => `${ville.nom} ${ville.code_postal ? `(${ville.code_postal})` : ''}`}
                  getOptionValue={(ville) => ville.id}
                />
                {!formData.subdivision && (
                  <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                    <FiMapPin size={10} />
                    Veuillez d'abord sélectionner une subdivision
                  </p>
                )}
                {loadingVilles && (
                  <p className="text-xs text-blue-500 mt-1 flex items-center gap-1">
                    <FiRefreshCw className="animate-spin" size={10} />
                    Chargement des villes...
                  </p>
                )}
              </div>

              {/* Code Postal */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Code Postal</label>
                <input
                  type="text"
                  value={formData.code_postal}
                  onChange={(e) => handleChange('code_postal', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent text-sm"
                  placeholder="Code postal"
                />
              </div>

              {/* Adresse complète */}
              <div className="lg:col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Adresse complète <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  value={formData.adresse}
                  onChange={(e) => handleChange('adresse', e.target.value)}
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent text-sm"
                  placeholder="Adresse complète de la société"
                />
              </div>

              {/* Complément d'adresse */}
              <div className="lg:col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">Complément d'adresse</label>
                <input
                  type="text"
                  value={formData.complement_adresse}
                  onChange={(e) => handleChange('complement_adresse', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent text-sm"
                  placeholder="Bâtiment, étage, bureau, etc."
                />
              </div>
            </div>
          </div>

          {/* Section 3: Contact */}
          <div className="bg-gradient-to-br from-cyan-50 to-white rounded-lg p-3 border border-cyan-100">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-4 bg-gradient-to-b from-cyan-600 to-cyan-400 rounded"></div>
              <h3 className="text-sm font-semibold text-gray-900">Contact</h3>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {/* Téléphone avec indicatif */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Téléphone <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2 flex items-center gap-1.5">
                    <FiPhone className="text-gray-400" size={16} />
                    {indicatif && (
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs font-medium rounded border border-blue-200">
                        {indicatif}
                      </span>
                    )}
                  </div>
                  
                  <input
                    type="tel"
                    required
                    value={formData.telephone}
                    onChange={(e) => {
                      const value = e.target.value;
                      handleChange('telephone', value);
                      
                      // Validation en temps réel
                      if (value && selectedPays) {
                        const validation = validatePhoneByCountry(value, selectedPays);
                        setPhoneError(validation.message);
                      }
                    }}
                    className={`w-full ${indicatif ? 'pl-28' : 'pl-9'} pr-3 py-2 border ${phoneError ? 'border-red-300' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-transparent text-sm`}
                    placeholder={selectedPays ? `Ex: ${formatPhoneDisplay('12345678', selectedPays).replace(indicatif, '').trim()}` : "Numéro de téléphone"}
                    disabled={!formData.pays}
                  />
                </div>
                
                {phoneError ? (
                  <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                    <FiX size={12} />
                    {phoneError}
                  </p>
                ) : formData.telephone && selectedPays && (
                  <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                    <FiCheck size={12} />
                    Format: {formatPhoneDisplay(formData.telephone, selectedPays)}
                  </p>
                )}
                
                {!formData.pays && (
                  <p className="text-xs text-gray-500 mt-1">
                    Sélectionnez d'abord un pays pour activer la validation téléphone
                  </p>
                )}
              </div>
              
              {/* Email */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Email <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <FiMail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-transparent text-sm"
                    placeholder="contact@societe.com"
                  />
                </div>
              </div>
              
              {/* Site Web */}
              <div className="lg:col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">Site Web</label>
                <div className="relative">
                  <FiGlobe className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    type="url"
                    value={formData.site_web}
                    onChange={(e) => handleChange('site_web', e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-transparent text-sm"
                    placeholder="https://www.example.com"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Informations Légales */}
          <div className="bg-gradient-to-br from-purple-50 to-white rounded-lg p-3 border border-purple-100">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-4 bg-gradient-to-b from-purple-600 to-purple-400 rounded"></div>
              <h3 className="text-sm font-semibold text-gray-900">Informations Légales</h3>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Registre du Commerce</label>
                <input
                  type="text"
                  value={formData.registre_commerce}
                  onChange={(e) => handleChange('registre_commerce', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-transparent text-sm"
                  placeholder="Numéro RC"
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Numéro Fiscal</label>
                <input
                  type="text"
                  value={formData.numero_fiscal}
                  onChange={(e) => handleChange('numero_fiscal', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-transparent text-sm"
                  placeholder="Numéro d'identification fiscale"
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Sécurité Sociale</label>
                <input
                  type="text"
                  value={formData.securite_sociale}
                  onChange={(e) => handleChange('securite_sociale', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-transparent text-sm"
                  placeholder="Numéro de sécurité sociale"
                />
              </div>
            </div>
          </div>

          {/* Section 5: Paramètres */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            <div className="bg-gradient-to-br from-emerald-50 to-white rounded-lg p-3 border border-emerald-100">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-1 h-4 bg-gradient-to-b from-emerald-600 to-emerald-400 rounded"></div>
                <h3 className="text-sm font-semibold text-gray-900">Devise</h3>
              </div>
              <SearchableDropdown
                value={formData.devise}
                onChange={(value) => handleChange('devise', value)}
                options={devisesArray}
                searchValue={searchDevise}
                onSearchChange={setSearchDevise}
                placeholder="Sélectionnez une devise"
                icon={FiDollarSign}
                getOptionLabel={(devise) => `${devise.code} - ${devise.nom} (${devise.symbole})`}
                getOptionValue={(devise) => devise.id}
              />
            </div>

            <div className="bg-gradient-to-br from-amber-50 to-white rounded-lg p-3 border border-amber-100">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-1 h-4 bg-gradient-to-b from-amber-600 to-amber-400 rounded"></div>
                <h3 className="text-sm font-semibold text-gray-900">Langue</h3>
              </div>
              <SearchableDropdown
                value={formData.langue}
                onChange={(value) => handleChange('langue', value)}
                options={languesArray}
                searchValue={searchLangue}
                onSearchChange={setSearchLangue}
                placeholder="Sélectionnez une langue"
                icon={FiGlobe}
                getOptionLabel={(langue) => `${langue.nom} (${langue.code})`}
                getOptionValue={(langue) => langue.id}
              />
            </div>

            <div className="bg-gradient-to-br from-violet-50 to-white rounded-lg p-3 border border-violet-100">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-1 h-4 bg-gradient-to-b from-violet-600 to-violet-400 rounded"></div>
                <h3 className="text-sm font-semibold text-gray-900">Statut</h3>
              </div>
              <select
                value={formData.statut}
                onChange={(e) => handleChange('statut', e.target.value === 'true')}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent text-sm"
              >
                <option value={true}>Active</option>
                <option value={false}>Inactive</option>
              </select>
            </div>
          </div>

          {/* Section 6: Administration */}
          <div className="bg-gradient-to-br from-gray-50 to-white rounded-lg p-3 border border-gray-200">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-4 bg-gradient-to-b from-gray-600 to-gray-400 rounded"></div>
              <h3 className="text-sm font-semibold text-gray-900">Administration</h3>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {/* Date de création */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Date de Création</label>
                <div className="relative">
                  <FiCalendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    type="date"
                    value={formData.date_creation}
                    onChange={(e) => handleChange('date_creation', e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-500 focus:border-transparent text-sm"
                  />
                </div>
              </div>

              {/* Créé par (grisé) */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Créé par</label>
                <div className="relative">
                  <FiUser className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    type="text"
                    value={entity?.cree_par?.username || currentUser.username || "Utilisateur connecté"}
                    disabled
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-500 focus:border-transparent text-sm bg-gray-50 text-gray-600"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Ce champ est automatiquement rempli
                </p>
              </div>
            </div>
          </div>
          
          {/* Boutons d'action */}
          <div className="flex justify-end gap-2 pt-3 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-all duration-200 font-medium text-sm hover:shadow-sm"
              disabled={loading}
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-1.5 bg-gradient-to-r from-violet-600 to-violet-500 text-white rounded-lg hover:from-violet-700 hover:to-violet-600 disabled:opacity-50 transition-all duration-200 font-medium flex items-center space-x-1.5 shadow hover:shadow-md text-sm"
            >
              {loading ? (
                <>
                  <FiRefreshCw className="animate-spin" size={14} />
                  <span>Sauvegarde...</span>
                </>
              ) : (
                <>
                  <FiCheck size={14} />
                  <span>{entity ? 'Mettre à jour' : 'Créer la société'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}