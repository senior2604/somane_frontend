import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { apiClient } from '../../services/apiClient';
import { 
  FiRefreshCw, FiPlus, FiEdit2, FiTrash2, FiSearch, FiX, FiChevronDown,
  FiCheck, FiGlobe, FiChevronLeft, FiChevronRight, FiDownload, FiUpload,
  FiEye, FiCheckCircle, FiXCircle, FiDollarSign, FiMap, FiFlag,
  FiMoreVertical, FiLink, FiCreditCard, FiGrid, FiCalendar, FiClock,
  FiImage, FiPercent, FiHash, FiUsers, FiShield, FiNavigation
} from "react-icons/fi";

export default function PaysSubdivisionAssociationPage() {
  // États pour les données
  const [pays, setPays] = useState([]);
  const [subdivisions, setSubdivisions] = useState([]);
  const [devises, setDevises] = useState([]);
  const [paysSubdivisions, setPaysSubdivisions] = useState({});
  
  // États pour l'UI
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showPaysForm, setShowPaysForm] = useState(false);
  const [showSubdivisionForm, setShowSubdivisionForm] = useState(false);
  const [editingPays, setEditingPays] = useState(null);
  const [editingSubdivision, setEditingSubdivision] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedDetail, setSelectedDetail] = useState(null);
  
  // États pour la recherche et filtres
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [selectedRows, setSelectedRows] = useState([]);
  const [activeTab, setActiveTab] = useState('pays'); // 'pays' ou 'subdivisions'
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [filterCountry, setFilterCountry] = useState('');
  const [filterType, setFilterType] = useState('');

  // Chargement initial des données
  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Charger les pays
      const paysResponse = await apiClient.get('/pays/');
      const paysData = extractArrayData(paysResponse);
      setPays(paysData);
      
      // Charger les subdivisions
      const subdivisionsResponse = await apiClient.get('/subdivisions/');
      const subdivisionsData = extractArrayData(subdivisionsResponse);
      setSubdivisions(subdivisionsData);
      
      // Charger les devises pour les pays
      const devisesResponse = await apiClient.get('/devises/');
      const devisesData = extractArrayData(devisesResponse);
      setDevises(devisesData);
      
      // Créer les associations pays-subdivisions
      fetchPaysSubdivisions(paysData, subdivisionsData);
      
    } catch (err) {
      console.error('Erreur lors du chargement des données:', err);
      setError('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const extractArrayData = (response) => {
    if (Array.isArray(response)) return response;
    if (response && Array.isArray(response.results)) return response.results;
    if (response && Array.isArray(response.data)) return response.data;
    return [];
  };

  const fetchPaysSubdivisions = (paysData, subdivisionsData) => {
    try {
      const associations = {};
      
      for (const paysItem of paysData) {
        const paysSubs = subdivisionsData.filter(sub => sub.pays?.id === paysItem.id);
        associations[paysItem.id] = paysSubs.map(s => s.id);
      }
      
      setPaysSubdivisions(associations);
    } catch (err) {
      console.error('Erreur lors du chargement des associations:', err);
      setPaysSubdivisions({});
    }
  };

  // Gestion des pays
  const handleNewPays = () => {
    setEditingPays(null);
    setShowPaysForm(true);
  };

  const handleEditPays = (paysItem) => {
    setEditingPays(paysItem);
    setShowPaysForm(true);
  };

  const handleDeletePays = async (paysItem) => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer le pays "${paysItem.nom}" ?`)) {
      try {
        await apiClient.delete(`/pays/${paysItem.id}/`);
        fetchAllData();
      } catch (err) {
        setError('Erreur lors de la suppression');
        console.error('Error deleting pays:', err);
      }
    }
  };

  // Gestion des subdivisions
  const handleNewSubdivision = () => {
    setEditingSubdivision(null);
    setShowSubdivisionForm(true);
  };

  const handleEditSubdivision = (subdivision) => {
    setEditingSubdivision(subdivision);
    setShowSubdivisionForm(true);
  };

  const handleDeleteSubdivision = async (subdivision) => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer la subdivision "${subdivision.nom}" ?`)) {
      try {
        await apiClient.delete(`/subdivisions/${subdivision.id}/`);
        fetchAllData();
      } catch (err) {
        setError('Erreur lors de la suppression');
        console.error('Error deleting subdivision:', err);
      }
    }
  };

  // Gestion des détails
  const handleViewDetails = (item) => {
    setSelectedDetail(item);
    setShowDetailModal(true);
  };

  // Fonction pour obtenir les détails d'une devise
  const getDeviseDetails = (deviseId) => {
    if (!deviseId && deviseId !== 0) return null;
    const idRecherche = typeof deviseId === 'object' ? deviseId.id : deviseId;
    return devises.find(d => d.id === idRecherche) || null;
  };

  // Formater le type de subdivision pour l'affichage
  const getTypeSubdivisionLabel = (type) => {
    const typeLabels = {
      'region': 'Région',
      'state': 'État',
      'province': 'Province',
      'department': 'Département',
      'canton': 'Canton',
      'district': 'District',
      'other': 'Autre'
    };
    return typeLabels[type] || type;
  };

  const getTypeSubdivisionBadge = (type) => {
    const badgeClasses = {
      'region': 'bg-gradient-to-r from-violet-50 to-violet-100 text-violet-700 border border-violet-200',
      'state': 'bg-gradient-to-r from-emerald-50 to-emerald-100 text-emerald-700 border border-emerald-200',
      'province': 'bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 border border-blue-200',
      'department': 'bg-gradient-to-r from-orange-50 to-orange-100 text-orange-700 border border-orange-200',
      'canton': 'bg-gradient-to-r from-indigo-50 to-indigo-100 text-indigo-700 border border-indigo-200',
      'district': 'bg-gradient-to-r from-pink-50 to-pink-100 text-pink-700 border border-pink-200',
      'other': 'bg-gradient-to-r from-gray-50 to-gray-100 text-gray-700 border border-gray-200'
    };
    return badgeClasses[type] || 'bg-gradient-to-r from-gray-50 to-gray-100 text-gray-700 border border-gray-200';
  };

  // Filtrage et recherche
  const filteredPays = useMemo(() => {
    return pays.filter(paysItem => {
      const matchesSearch = 
        paysItem.nom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        paysItem.code_iso?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        paysItem.code_tel?.includes(searchTerm);
      
      return matchesSearch;
    });
  }, [pays, searchTerm]);

  const filteredSubdivisions = useMemo(() => {
    return subdivisions.filter(subdivision => {
      const matchesSearch = 
        subdivision.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        subdivision.nom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        subdivision.pays?.nom?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCountry = filterCountry === '' || subdivision.pays?.id?.toString() === filterCountry;
      const matchesType = filterType === '' || subdivision.type_subdivision === filterType;
      
      return matchesSearch && matchesCountry && matchesType;
    });
  }, [subdivisions, searchTerm, filterCountry, filterType]);

  // Données actuelles selon l'onglet actif
  const currentData = activeTab === 'pays' ? filteredPays : filteredSubdivisions;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = currentData.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(currentData.length / itemsPerPage);

  // Sélection des lignes
  const toggleRowSelection = (id) => {
    setSelectedRows(prev => 
      prev.includes(id) 
        ? prev.filter(rowId => rowId !== id)
        : [...prev, id]
    );
  };

  const selectAllRows = useCallback(() => {
    if (selectedRows.length === currentItems.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(currentItems.map(item => item.id));
    }
  }, [currentItems, selectedRows.length]);

  // Pagination
  const paginate = (pageNumber) => setCurrentPage(pageNumber);
  const nextPage = () => currentPage < totalPages && setCurrentPage(currentPage + 1);
  const prevPage = () => currentPage > 1 && setCurrentPage(currentPage - 1);

  // Statistiques
  const stats = useMemo(() => ({
    totalPays: pays.length,
    totalSubdivisions: subdivisions.length,
    avecDevise: pays.filter(p => p.devise_par_defaut).length,
    sansDevise: pays.filter(p => !p.devise_par_defaut).length,
    regions: subdivisions.filter(s => s.type_subdivision === 'region').length,
    etats: subdivisions.filter(s => s.type_subdivision === 'state').length,
    provinces: subdivisions.filter(s => s.type_subdivision === 'province').length,
  }), [pays, subdivisions]);

  // Gestion des succès des formulaires
  const handleFormSuccess = () => {
    setShowPaysForm(false);
    setShowSubdivisionForm(false);
    setEditingPays(null);
    setEditingSubdivision(null);
    fetchAllData();
  };

  const handleRetry = () => {
    fetchAllData();
  };

  const resetFilters = () => {
    setSearchTerm('');
    setFilterCountry('');
    setFilterType('');
    setCurrentPage(1);
  };

  if (loading && !pays.length) {
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
      {/* Header compact avec recherche au centre */}
      <div className="mb-6">
        {/* Ligne supérieure avec titre */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-gradient-to-br from-violet-600 to-violet-500 rounded-lg shadow">
              <FiGlobe className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Pays × Subdivisions</h1>
              <p className="text-gray-600 text-xs mt-0.5">
                Gérez les pays et leurs subdivisions administratives
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
                placeholder={activeTab === 'pays' ? "Rechercher un pays..." : "Rechercher une subdivision..."}
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
                    filterCountry || filterType ? 'bg-violet-100 text-violet-700' : 'bg-gray-100 text-gray-700'
                  } hover:bg-gray-200 transition-colors`}
                >
                  <FiChevronDown size={12} />
                  <span>Filtre</span>
                </button>
                
                {/* Dropdown des filtres */}
                {showFilterDropdown && (
                  <div className="absolute right-0 top-full mt-1 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                    <div className="p-2">
                      <p className="text-xs font-medium text-gray-700 mb-2">Filtrer {activeTab === 'subdivisions' ? 'les subdivisions' : 'les pays'}</p>
                      
                      {activeTab === 'subdivisions' && (
                        <>
                          <div className="mb-2">
                            <p className="text-xs text-gray-600 mb-1">Par pays</p>
                            <select
                              value={filterCountry}
                              onChange={(e) => {
                                setFilterCountry(e.target.value);
                                setShowFilterDropdown(false);
                              }}
                              className="w-full border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent"
                            >
                              <option value="">Tous les pays</option>
                              {pays.map(p => (
                                <option key={p.id} value={p.id}>
                                  {p.emoji} {p.nom_fr || p.nom}
                                </option>
                              ))}
                            </select>
                          </div>
                          
                          <div className="mb-2">
                            <p className="text-xs text-gray-600 mb-1">Par type</p>
                            <select
                              value={filterType}
                              onChange={(e) => {
                                setFilterType(e.target.value);
                                setShowFilterDropdown(false);
                              }}
                              className="w-full border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent"
                            >
                              <option value="">Tous les types</option>
                              <option value="region">Région</option>
                              <option value="state">État</option>
                              <option value="province">Province</option>
                              <option value="department">Département</option>
                              <option value="canton">Canton</option>
                              <option value="district">District</option>
                              <option value="other">Autre</option>
                            </select>
                          </div>
                        </>
                      )}
                      
                      {(searchTerm || filterCountry || filterType) && (
                        <button
                          onClick={() => {
                            resetFilters();
                            setShowFilterDropdown(false);
                          }}
                          className="w-full mt-2 px-2 py-1.5 bg-gray-100 text-gray-700 rounded text-xs hover:bg-gray-200 transition-colors focus:outline-none focus:ring-1 focus:ring-violet-500"
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
              className="ml-3 px-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-all duration-300 flex items-center gap-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-violet-500"
            >
              <FiRefreshCw className={`${loading ? 'animate-spin' : ''}`} size={14} />
              <span>Actualiser</span>
            </button>
            
            {activeTab === 'pays' ? (
              <button 
                onClick={handleNewPays}
                className="ml-2 px-3 py-2 rounded-lg bg-gradient-to-r from-violet-600 to-violet-500 text-white hover:from-violet-700 hover:to-violet-600 transition-all duration-300 flex items-center gap-1.5 text-sm shadow focus:outline-none focus:ring-2 focus:ring-violet-300"
              >
                <FiPlus size={14} />
                <span>Nouveau Pays</span>
              </button>
            ) : (
              <button 
                onClick={handleNewSubdivision}
                className="ml-2 px-3 py-2 rounded-lg bg-gradient-to-r from-violet-600 to-violet-500 text-white hover:from-violet-700 hover:to-violet-600 transition-all duration-300 flex items-center gap-1.5 text-sm shadow focus:outline-none focus:ring-2 focus:ring-violet-300"
              >
                <FiPlus size={14} />
                <span>Nouvelle Subdivision</span>
              </button>
            )}
          </div>
        </div>

        {/* Statistiques en ligne compactes */}
        <div className="grid grid-cols-4 gap-2 mb-3">
          <div className="bg-white rounded-lg p-2 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Total pays</p>
                <p className="text-sm font-bold text-violet-600 mt-0.5">{stats.totalPays}</p>
              </div>
              <div className="p-1 bg-violet-50 rounded">
                <FiGlobe className="w-3 h-3 text-violet-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg p-2 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Total subdivisions</p>
                <p className="text-sm font-bold text-emerald-600 mt-0.5">{stats.totalSubdivisions}</p>
              </div>
              <div className="p-1 bg-emerald-50 rounded">
                <FiMap className="w-3 h-3 text-emerald-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg p-2 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Avec devise</p>
                <p className="text-sm font-bold text-purple-600 mt-0.5">{stats.avecDevise}</p>
              </div>
              <div className="p-1 bg-purple-50 rounded">
                <FiDollarSign className="w-3 h-3 text-purple-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg p-2 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Régions</p>
                <p className="text-sm font-bold text-indigo-600 mt-0.5">{stats.regions}</p>
              </div>
              <div className="p-1 bg-indigo-50 rounded">
                <FiFlag className="w-3 h-3 text-indigo-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Onglets Pays | Subdivisions */}
        <div className="flex border-b border-gray-200 mb-3">
          <button
            onClick={() => {
              setActiveTab('pays');
              setCurrentPage(1);
              setSelectedRows([]);
              resetFilters();
            }}
            className={`px-4 py-1.5 text-xs font-medium border-b-2 transition-colors focus:outline-none focus:ring-1 focus:ring-violet-500 ${
              activeTab === 'pays'
                ? 'border-violet-600 text-violet-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Pays
          </button>
          <button
            onClick={() => {
              setActiveTab('subdivisions');
              setCurrentPage(1);
              setSelectedRows([]);
              resetFilters();
            }}
            className={`px-4 py-1.5 text-xs font-medium border-b-2 transition-colors focus:outline-none focus:ring-1 focus:ring-violet-500 ${
              activeTab === 'subdivisions'
                ? 'border-violet-600 text-violet-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Subdivisions
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
                className="px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-xs font-medium focus:outline-none focus:ring-2 focus:ring-red-300"
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
                  checked={selectedRows.length === currentItems.length && currentItems.length > 0}
                  onChange={selectAllRows}
                  className="w-3 h-3 text-violet-600 rounded focus:ring-violet-500 border-gray-300"
                />
                <span className="text-xs text-gray-700">
                  {selectedRows.length} sélectionné(s)
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button className="p-1 hover:bg-gray-100 rounded transition-colors text-gray-600 focus:outline-none focus:ring-1 focus:ring-violet-500">
                <FiDownload size={14} />
              </button>
              <button className="p-1 hover:bg-gray-100 rounded transition-colors text-gray-600 focus:outline-none focus:ring-1 focus:ring-violet-500">
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
                      checked={selectedRows.length === currentItems.length && currentItems.length > 0}
                      onChange={selectAllRows}
                      className="w-3 h-3 text-violet-600 rounded focus:ring-violet-500 border-gray-300"
                    />
                    IDENTIFIANT
                  </div>
                </th>
                
                {activeTab === 'pays' ? (
                  <>
                    <th scope="col" className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-300">
                      Nom
                    </th>
                    <th scope="col" className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-300">
                      Code ISO
                    </th>
                    <th scope="col" className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-300">
                      Indicatif
                    </th>
                    <th scope="col" className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-300">
                      Devise
                    </th>
                    <th scope="col" className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Actes
                    </th>
                  </>
                ) : (
                  <>
                    <th scope="col" className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-300">
                      Code
                    </th>
                    <th scope="col" className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-300">
                      Nom
                    </th>
                    <th scope="col" className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-300">
                      Type
                    </th>
                    <th scope="col" className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-300">
                      Pays
                    </th>
                    <th scope="col" className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Actes
                    </th>
                  </>
                )}
              </tr>
            </thead>
            
            <tbody className="divide-y divide-gray-200">
              {currentItems.length === 0 ? (
                <tr>
                  <td colSpan={activeTab === 'pays' ? 6 : 7} className="px-3 py-4 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-12 h-12 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mb-2">
                        {activeTab === 'pays' ? (
                          <FiGlobe className="w-6 h-6 text-gray-400" />
                        ) : (
                          <FiMap className="w-6 h-6 text-gray-400" />
                        )}
                      </div>
                      <h3 className="text-sm font-semibold text-gray-900 mb-1">
                        {activeTab === 'pays' 
                          ? (pays.length === 0 ? 'Aucun pays trouvé' : 'Aucun résultat')
                          : (subdivisions.length === 0 ? 'Aucune subdivision trouvée' : 'Aucun résultat')
                        }
                      </h3>
                      <p className="text-gray-600 text-xs mb-3 max-w-md">
                        {activeTab === 'pays'
                          ? (pays.length === 0 
                              ? 'Commencez par créer votre premier pays' 
                              : 'Essayez de modifier vos critères de recherche')
                          : (subdivisions.length === 0
                              ? 'Commencez par créer votre première subdivision'
                              : 'Essayez de modifier vos critères de recherche')
                        }
                      </p>
                      {((activeTab === 'pays' && pays.length === 0) || (activeTab === 'subdivisions' && subdivisions.length === 0)) && (
                        <button 
                          onClick={activeTab === 'pays' ? handleNewPays : handleNewSubdivision}
                          className="px-3 py-1 bg-gradient-to-r from-violet-600 to-violet-500 text-white rounded hover:from-violet-700 hover:to-violet-600 transition-all duration-300 font-medium flex items-center gap-1 text-xs focus:outline-none focus:ring-2 focus:ring-violet-300"
                        >
                          <FiPlus size={12} />
                          {activeTab === 'pays' ? 'Créer un pays' : 'Créer une subdivision'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                currentItems.map((item) => (
                  <tr 
                    key={item.id}
                    className={`hover:bg-gradient-to-r hover:from-gray-50 hover:to-white transition-all duration-200 ${
                      selectedRows.includes(item.id) ? 'bg-gradient-to-r from-violet-50 to-violet-25' : 'bg-white'
                    }`}
                  >
                    {/* IDENTIFIANT avec checkbox */}
                    <td className="px-3 py-2 whitespace-nowrap border-r border-gray-200">
                      <div className="flex items-center gap-1.5">
                        <input
                          type="checkbox"
                          checked={selectedRows.includes(item.id)}
                          onChange={() => toggleRowSelection(item.id)}
                          className="w-3 h-3 text-violet-600 rounded focus:ring-violet-500 border-gray-300"
                        />
                        <span className="px-1 py-0.5 bg-gray-100 text-gray-800 rounded text-xs font-medium font-mono">
                          #{item.id}
                        </span>
                      </div>
                    </td>
                    
                    {activeTab === 'pays' ? (
                      <>
                        {/* Nom du pays */}
                        <td className="px-3 py-2 border-r border-gray-200">
                          <div className="flex flex-col">
                            <div className="flex items-center gap-1.5">
                              <span className="text-lg">{item.emoji}</span>
                              <div className="text-xs font-semibold text-gray-900 truncate max-w-[150px]">
                                {item.nom_fr || item.nom}
                              </div>
                            </div>
                            {item.nom_fr && item.nom !== item.nom_fr && (
                              <div className="text-xs text-gray-500">{item.nom}</div>
                            )}
                          </div>
                        </td>
                        
                        {/* Code ISO */}
                        <td className="px-3 py-2 border-r border-gray-200">
                          <div className="text-xs font-medium text-gray-900">
                            <span className="inline-flex px-1.5 py-0.5 rounded bg-gradient-to-r from-violet-50 to-violet-100 text-violet-700 border border-violet-200">
                              {item.code_iso}
                            </span>
                          </div>
                        </td>
                        
                        {/* Indicatif téléphonique */}
                        <td className="px-3 py-2 border-r border-gray-200">
                          <div className="text-xs text-gray-900">
                            <span className="inline-flex px-1.5 py-0.5 rounded bg-gradient-to-r from-emerald-50 to-emerald-100 text-emerald-700 border border-emerald-200">
                              {item.code_tel}
                            </span>
                          </div>
                        </td>
                        
                        {/* Devise */}
                        <td className="px-3 py-2 border-r border-gray-200">
                          {getDeviseDetails(item.devise_par_defaut) ? (
                            <div className="flex items-center gap-1">
                              <div className="p-1 bg-gradient-to-r from-purple-50 to-purple-100 rounded">
                                <FiDollarSign className="w-2.5 h-2.5 text-purple-700" />
                              </div>
                              <div className="text-xs">
                                <div className="font-medium text-gray-900">
                                  {getDeviseDetails(item.devise_par_defaut).code}
                                </div>
                                <div className="text-gray-500 text-xs">
                                  {getDeviseDetails(item.devise_par_defaut).symbole}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="text-xs text-orange-500">
                              {item.devise_par_defaut ? `ID: ${item.devise_par_defaut}` : 'Non définie'}
                            </div>
                          )}
                        </td>
                        
                        {/* Actions pour pays */}
                        <td className="px-3 py-2 whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleViewDetails(item)}
                              className="p-1 bg-gradient-to-r from-gray-50 to-gray-100 text-gray-700 rounded hover:from-gray-100 hover:to-gray-200 transition-all duration-200 shadow-sm hover:shadow focus:outline-none focus:ring-1 focus:ring-violet-500"
                              title="Voir détails"
                            >
                              <FiEye size={12} />
                            </button>
                            <button
                              onClick={() => handleEditPays(item)}
                              className="p-1 bg-gradient-to-r from-violet-50 to-violet-100 text-violet-700 rounded hover:from-violet-100 hover:to-violet-200 transition-all duration-200 shadow-sm hover:shadow focus:outline-none focus:ring-1 focus:ring-violet-500"
                              title="Modifier"
                            >
                              <FiEdit2 size={12} />
                            </button>
                            <button
                              onClick={() => handleDeletePays(item)}
                              className="p-1 bg-gradient-to-r from-red-50 to-red-100 text-red-700 rounded hover:from-red-100 hover:to-red-200 transition-all duration-200 shadow-sm hover:shadow focus:outline-none focus:ring-1 focus:ring-red-500"
                              title="Supprimer"
                            >
                              <FiTrash2 size={12} />
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        {/* Code de la subdivision */}
                        <td className="px-3 py-2 border-r border-gray-200">
                          <div className="text-xs font-medium text-gray-900">
                            <span className="inline-flex px-1.5 py-0.5 rounded bg-gradient-to-r from-violet-50 to-violet-100 text-violet-700 border border-violet-200 font-mono">
                              {item.code}
                            </span>
                          </div>
                        </td>
                        
                        {/* Nom de la subdivision */}
                        <td className="px-3 py-2 border-r border-gray-200">
                          <div className="text-xs font-semibold text-gray-900">
                            {item.nom}
                          </div>
                        </td>
                        
                        {/* Type de subdivision */}
                        <td className="px-3 py-2 border-r border-gray-200">
                          <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${getTypeSubdivisionBadge(item.type_subdivision)}`}>
                            {getTypeSubdivisionLabel(item.type_subdivision)}
                          </span>
                        </td>
                        
                        {/* Pays */}
                        <td className="px-3 py-2 border-r border-gray-200">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm">{item.pays?.emoji}</span>
                            <div className="text-xs text-gray-900">
                              {item.pays?.nom_fr || item.pays?.nom}
                            </div>
                          </div>
                        </td>
                        
                        {/* Actions pour subdivisions */}
                        <td className="px-3 py-2 whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleViewDetails(item)}
                              className="p-1 bg-gradient-to-r from-gray-50 to-gray-100 text-gray-700 rounded hover:from-gray-100 hover:to-gray-200 transition-all duration-200 shadow-sm hover:shadow focus:outline-none focus:ring-1 focus:ring-violet-500"
                              title="Voir détails"
                            >
                              <FiEye size={12} />
                            </button>
                            <button
                              onClick={() => handleEditSubdivision(item)}
                              className="p-1 bg-gradient-to-r from-violet-50 to-violet-100 text-violet-700 rounded hover:from-violet-100 hover:to-violet-200 transition-all duration-200 shadow-sm hover:shadow focus:outline-none focus:ring-1 focus:ring-violet-500"
                              title="Modifier"
                            >
                              <FiEdit2 size={12} />
                            </button>
                            <button
                              onClick={() => handleDeleteSubdivision(item)}
                              className="p-1 bg-gradient-to-r from-red-50 to-red-100 text-red-700 rounded hover:from-red-100 hover:to-red-200 transition-all duration-200 shadow-sm hover:shadow focus:outline-none focus:ring-1 focus:ring-red-500"
                              title="Supprimer"
                            >
                              <FiTrash2 size={12} />
                            </button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination compact */}
        {currentItems.length > 0 && (
          <div className="px-3 py-2 border-t border-gray-200 bg-gradient-to-r from-gray-50 to-white">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <span className="text-xs text-gray-700">
                    Page {currentPage} sur {totalPages}
                  </span>
                  <span className="text-gray-300">•</span>
                  <span className="text-xs text-gray-700">
                    {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, currentData.length)} sur {currentData.length} {activeTab === 'pays' ? 'pays' : 'subdivisions'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={prevPage}
                  disabled={currentPage === 1}
                  className={`p-1 rounded border transition-all duration-200 focus:outline-none focus:ring-1 focus:ring-violet-500 ${
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
                        className={`min-w-[28px] h-7 rounded border text-xs font-medium transition-all duration-200 focus:outline-none focus:ring-1 focus:ring-violet-500 ${
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
                  className={`p-1 rounded border transition-all duration-200 focus:outline-none focus:ring-1 focus:ring-violet-500 ${
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

      {/* Modaux pour création/édition */}
      {showPaysForm && (
        <PaysFormModal
          pays={editingPays}
          devises={devises}
          onClose={() => {
            setShowPaysForm(false);
            setEditingPays(null);
          }}
          onSuccess={handleFormSuccess}
        />
      )}

      {showSubdivisionForm && (
        <SubdivisionFormModal
          subdivision={editingSubdivision}
          pays={pays}
          onClose={() => {
            setShowSubdivisionForm(false);
            setEditingSubdivision(null);
          }}
          onSuccess={handleFormSuccess}
        />
      )}

      {/* Modal de détails */}
      {showDetailModal && selectedDetail && (
        <DetailModal
          item={selectedDetail}
          type={activeTab}
          paysSubdivisions={paysSubdivisions}
          pays={pays}
          subdivisions={subdivisions}
          devises={devises}
          getDeviseDetails={getDeviseDetails}
          getTypeSubdivisionLabel={getTypeSubdivisionLabel}
          getTypeSubdivisionBadge={getTypeSubdivisionBadge}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedDetail(null);
          }}
        />
      )}
    </div>
  );
}

// MODAL DE DÉTAILS PAYS
function PaysDetailModal({ item, paysSubdivisions, subdivisions, devises, getDeviseDetails, onClose }) {
  const deviseDetails = getDeviseDetails(item.devise_par_defaut);
  const paysSubs = subdivisions.filter(sub => sub.pays?.id === item.id);

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-3 z-50 backdrop-blur-sm">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="sticky top-0 bg-gradient-to-r from-violet-600 to-violet-500 text-white rounded-t-lg p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-white/20 backdrop-blur-sm rounded">
                <FiGlobe className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold">Détails du pays</h2>
                <p className="text-violet-100 text-xs mt-0.5">{item.nom_fr || item.nom}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1 hover:bg-white/20 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-white/50"
            >
              <FiX size={18} />
            </button>
          </div>
        </div>
        
        <div className="p-4 space-y-4">
          {/* Informations Générales */}
          <div className="bg-gradient-to-br from-gray-50 to-white rounded-lg p-3 border border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-1.5">
              <div className="w-1 h-4 bg-gradient-to-b from-violet-600 to-violet-400 rounded"></div>
              Informations Générales
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <p className="text-xs font-medium text-gray-500 mb-0.5">IDENTIFIANT</p>
                <p className="text-sm text-gray-900 font-medium font-mono">#{item.id}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-0.5">Drapeau</p>
                <div className="text-2xl">{item.emoji}</div>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-0.5">Nom (Français)</p>
                <p className="text-sm text-gray-900 font-medium">{item.nom_fr || item.nom}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-0.5">Nom (Original)</p>
                <p className="text-sm text-gray-900">{item.nom}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-0.5">Code ISO</p>
                <p className="text-sm text-gray-900 font-mono bg-violet-50 px-2 py-1 rounded border border-violet-200 inline-block">
                  {item.code_iso}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-0.5">Indicatif téléphonique</p>
                <p className="text-sm text-gray-900">{item.code_tel}</p>
              </div>
            </div>
          </div>

          {/* Devise */}
          <div className="bg-gradient-to-br from-purple-50 to-white rounded-lg p-3 border border-purple-100">
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-1.5">
              <div className="w-1 h-4 bg-gradient-to-b from-purple-600 to-purple-400 rounded"></div>
              Devise
            </h3>
            {deviseDetails ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="bg-white rounded-lg p-3 border border-gray-200">
                  <div className="text-xs font-medium text-gray-500 mb-0.5">Code</div>
                  <div className="text-sm font-bold text-gray-900">{deviseDetails.code}</div>
                </div>
                <div className="bg-white rounded-lg p-3 border border-gray-200">
                  <div className="text-xs font-medium text-gray-500 mb-0.5">Symbole</div>
                  <div className="text-sm font-bold text-gray-900">{deviseDetails.symbole}</div>
                </div>
                <div className="bg-white rounded-lg p-3 border border-gray-200">
                  <div className="text-xs font-medium text-gray-500 mb-0.5">Nom</div>
                  <div className="text-sm text-gray-900">{deviseDetails.nom}</div>
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <FiDollarSign className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500">Aucune devise définie</p>
              </div>
            )}
          </div>

          {/* Subdivisions */}
          <div className="bg-gradient-to-br from-emerald-50 to-white rounded-lg p-3 border border-emerald-100">
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-1.5">
              <div className="w-1 h-4 bg-gradient-to-b from-emerald-600 to-emerald-400 rounded"></div>
              Subdivisions ({paysSubs.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {paysSubs.length > 0 ? (
                paysSubs.map(subdivision => (
                  <div key={subdivision.id} className="bg-white rounded-lg p-3 border border-gray-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-gray-900 text-sm">{subdivision.nom}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          <span className="font-mono">{subdivision.code}</span>
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        subdivision.type_subdivision === 'region' ? 'bg-violet-100 text-violet-800' :
                        subdivision.type_subdivision === 'state' ? 'bg-emerald-100 text-emerald-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {subdivision.type_subdivision === 'region' ? 'Région' :
                         subdivision.type_subdivision === 'state' ? 'État' :
                         subdivision.type_subdivision === 'province' ? 'Province' :
                         subdivision.type_subdivision === 'department' ? 'Département' :
                         subdivision.type_subdivision === 'canton' ? 'Canton' :
                         subdivision.type_subdivision === 'district' ? 'District' : 'Autre'}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-2 text-center py-4">
                  <FiMap className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500">Aucune subdivision définie</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="p-3 border-t border-gray-200 bg-gradient-to-r from-gray-50 to-white">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-gradient-to-r from-gray-600 to-gray-500 text-white rounded hover:from-gray-700 hover:to-gray-600 transition-all duration-200 font-medium text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// MODAL DE DÉTAILS SUBDIVISION
function SubdivisionDetailModal({ item, getTypeSubdivisionLabel, getTypeSubdivisionBadge, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-3 z-50 backdrop-blur-sm">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="sticky top-0 bg-gradient-to-r from-violet-600 to-violet-500 text-white rounded-t-lg p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-white/20 backdrop-blur-sm rounded">
                <FiMap className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold">Détails de la subdivision</h2>
                <p className="text-violet-100 text-xs mt-0.5">{item.nom}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1 hover:bg-white/20 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-white/50"
            >
              <FiX size={18} />
            </button>
          </div>
        </div>
        
        <div className="p-4 space-y-4">
          {/* Informations Générales */}
          <div className="bg-gradient-to-br from-gray-50 to-white rounded-lg p-3 border border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-1.5">
              <div className="w-1 h-4 bg-gradient-to-b from-violet-600 to-violet-400 rounded"></div>
              Informations Générales
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <p className="text-xs font-medium text-gray-500 mb-0.5">IDENTIFIANT</p>
                <p className="text-sm text-gray-900 font-medium font-mono">#{item.id}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-0.5">Code</p>
                <p className="text-sm text-gray-900 font-medium font-mono">{item.code}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-0.5">Nom</p>
                <p className="text-sm text-gray-900 font-medium">{item.nom}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-0.5">Type</p>
                <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${getTypeSubdivisionBadge(item.type_subdivision)}`}>
                  {getTypeSubdivisionLabel(item.type_subdivision)}
                </span>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-0.5">Pays</p>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm">{item.pays?.emoji}</span>
                  <p className="text-sm text-gray-900">{item.pays?.nom_fr || item.pays?.nom}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Coordonnées Géographiques */}
          {(item.latitude || item.longitude) && (
            <div className="bg-gradient-to-br from-emerald-50 to-white rounded-lg p-3 border border-emerald-100">
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-1.5">
                <div className="w-1 h-4 bg-gradient-to-b from-emerald-600 to-emerald-400 rounded"></div>
                Coordonnées Géographiques
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {item.latitude && (
                  <div className="bg-white rounded-lg p-3 border border-gray-200">
                    <div className="text-xs font-medium text-gray-500 mb-0.5">Latitude</div>
                    <div className="text-sm font-bold text-gray-900 font-mono">{item.latitude}</div>
                  </div>
                )}
                {item.longitude && (
                  <div className="bg-white rounded-lg p-3 border border-gray-200">
                    <div className="text-xs font-medium text-gray-500 mb-0.5">Longitude</div>
                    <div className="text-sm font-bold text-gray-900 font-mono">{item.longitude}</div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="p-3 border-t border-gray-200 bg-gradient-to-r from-gray-50 to-white">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-gradient-to-r from-gray-600 to-gray-500 text-white rounded hover:from-gray-700 hover:to-gray-600 transition-all duration-200 font-medium text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// MODAL DE DÉTAILS (wrapper)
function DetailModal({ item, type, paysSubdivisions, pays, subdivisions, devises, getDeviseDetails, getTypeSubdivisionLabel, getTypeSubdivisionBadge, onClose }) {
  if (type === 'pays') {
    return (
      <PaysDetailModal 
        item={item} 
        paysSubdivisions={paysSubdivisions}
        subdivisions={subdivisions}
        devises={devises}
        getDeviseDetails={getDeviseDetails}
        onClose={onClose}
      />
    );
  } else {
    return (
      <SubdivisionDetailModal 
        item={item}
        getTypeSubdivisionLabel={getTypeSubdivisionLabel}
        getTypeSubdivisionBadge={getTypeSubdivisionBadge}
        onClose={onClose}
      />
    );
  }
}

// MODAL FORMULAIRE PAYS (Adapté de votre code original)
function PaysFormModal({ pays, devises, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    nom: pays?.nom || '',
    nom_fr: pays?.nom_fr || '',
    code_iso: pays?.code_iso || '',
    code_tel: pays?.code_tel || '',
    devise_par_defaut: pays?.devise_par_defaut || '',
    emoji: pays?.emoji || '',
    format_adresse: pays?.format_adresse || ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!formData.nom) {
      setError('Le nom du pays est obligatoire');
      setLoading(false);
      return;
    }

    if (!formData.code_iso || formData.code_iso.length !== 2) {
      setError('Le code ISO doit contenir exactement 2 caractères');
      setLoading(false);
      return;
    }

    try {
      const url = pays 
        ? `/pays/${pays.id}/`
        : `/pays/`;
      
      const method = pays ? 'PUT' : 'POST';

      await apiClient.request(url, {
        method: method,
        body: JSON.stringify(formData),
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      onSuccess();
    } catch (err) {
      const errorMessage = err.message || 'Erreur lors de la sauvegarde';
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
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-3 z-50 backdrop-blur-sm">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="sticky top-0 bg-gradient-to-r from-violet-600 to-violet-500 text-white rounded-t-lg p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-white/20 backdrop-blur-sm rounded">
                <FiGlobe className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold">
                  {pays ? 'Modifier le pays' : 'Nouveau Pays'}
                </h2>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1 hover:bg-white/20 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-white/50"
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
              <span className="text-red-800 text-xs font-medium">{error}</span>
            </div>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div className="bg-gradient-to-br from-gray-50 to-white rounded-lg p-3 border border-gray-200">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-4 bg-gradient-to-b from-violet-600 to-violet-400 rounded"></div>
              <h3 className="text-sm font-semibold text-gray-900">Informations Générales</h3>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Nom du pays (Français)
                </label>
                <input
                  type="text"
                  value={formData.nom_fr}
                  onChange={(e) => handleChange('nom_fr', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent text-sm"
                  placeholder="France"
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Nom du pays (Original) *
                </label>
                <input
                  type="text"
                  required
                  value={formData.nom}
                  onChange={(e) => handleChange('nom', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent text-sm"
                  placeholder="France"
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Code ISO (2 lettres) *
                </label>
                <input
                  type="text"
                  required
                  maxLength={2}
                  value={formData.code_iso}
                  onChange={(e) => handleChange('code_iso', e.target.value.toUpperCase())}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent text-sm font-mono uppercase"
                  placeholder="FR"
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Indicatif téléphonique
                </label>
                <input
                  type="text"
                  value={formData.code_tel}
                  onChange={(e) => handleChange('code_tel', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent text-sm"
                  placeholder="+33"
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Emoji / Drapeau
                </label>
                <input
                  type="text"
                  value={formData.emoji}
                  onChange={(e) => handleChange('emoji', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent text-sm"
                  placeholder="🇫🇷"
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Devise par défaut
                </label>
                <select
                  value={formData.devise_par_defaut}
                  onChange={(e) => handleChange('devise_par_defaut', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent text-sm"
                >
                  <option value="">Sélectionnez une devise</option>
                  {devises.map(devise => (
                    <option key={devise.id} value={devise.id}>
                      {devise.code} - {devise.nom} ({devise.symbole})
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="lg:col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Format d'adresse
                </label>
                <textarea
                  value={formData.format_adresse}
                  onChange={(e) => handleChange('format_adresse', e.target.value)}
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent text-sm"
                  placeholder="Rue, Code Postal Ville, Pays"
                />
              </div>
            </div>
          </div>
          
          <div className="flex justify-end gap-2 pt-3 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-all duration-200 font-medium text-sm hover:shadow-sm focus:outline-none focus:ring-1 focus:ring-violet-500"
              disabled={loading}
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-1.5 bg-gradient-to-r from-violet-600 to-violet-500 text-white rounded-lg hover:from-violet-700 hover:to-violet-600 disabled:opacity-50 transition-all duration-200 font-medium flex items-center space-x-1.5 shadow hover:shadow-md text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
            >
              {loading ? (
                <>
                  <FiRefreshCw className="animate-spin" size={14} />
                  <span>Sauvegarde...</span>
                </>
              ) : (
                <>
                  <FiCheck size={14} />
                  <span>{pays ? 'Mettre à jour' : 'Créer le pays'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// MODAL FORMULAIRE SUBDIVISION (Adapté de votre code original)
function SubdivisionFormModal({ subdivision, pays, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    code: subdivision?.code || '',
    nom: subdivision?.nom || '',
    type_subdivision: subdivision?.type_subdivision || 'region',
    pays: subdivision?.pays?.id || '',
    latitude: subdivision?.latitude || '',
    longitude: subdivision?.longitude || ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!formData.code) {
      setError('Le code de la subdivision est obligatoire');
      setLoading(false);
      return;
    }

    if (!formData.nom) {
      setError('Le nom de la subdivision est obligatoire');
      setLoading(false);
      return;
    }

    if (!formData.pays) {
      setError('Le pays est obligatoire');
      setLoading(false);
      return;
    }

    try {
      const url = subdivision 
        ? `/subdivisions/${subdivision.id}/`
        : `/subdivisions/`;
      
      const method = subdivision ? 'PUT' : 'POST';

      await apiClient.request(url, {
        method: method,
        body: JSON.stringify(formData),
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      onSuccess();
    } catch (err) {
      const errorMessage = err.message || 'Erreur lors de la sauvegarde';
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

  const getTypeSubdivisionLabel = (type) => {
    const typeLabels = {
      'region': 'Région',
      'state': 'État',
      'province': 'Province',
      'department': 'Département',
      'canton': 'Canton',
      'district': 'District',
      'other': 'Autre'
    };
    return typeLabels[type] || type;
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-3 z-50 backdrop-blur-sm">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="sticky top-0 bg-gradient-to-r from-violet-600 to-violet-500 text-white rounded-t-lg p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-white/20 backdrop-blur-sm rounded">
                <FiMap className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold">
                  {subdivision ? 'Modifier la subdivision' : 'Nouvelle Subdivision'}
                </h2>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1 hover:bg-white/20 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-white/50"
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
              <span className="text-red-800 text-xs font-medium">{error}</span>
            </div>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div className="bg-gradient-to-br from-gray-50 to-white rounded-lg p-3 border border-gray-200">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-4 bg-gradient-to-b from-violet-600 to-violet-400 rounded"></div>
              <h3 className="text-sm font-semibold text-gray-900">Informations Générales</h3>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Code de la subdivision *
                </label>
                <input
                  type="text"
                  required
                  value={formData.code}
                  onChange={(e) => handleChange('code', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent text-sm"
                  placeholder="TG-M, US-CA, FR-75..."
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Nom de la subdivision *
                </label>
                <input
                  type="text"
                  required
                  value={formData.nom}
                  onChange={(e) => handleChange('nom', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent text-sm"
                  placeholder="Maritime, Californie, Île-de-France..."
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Type de subdivision *
                </label>
                <select
                  required
                  value={formData.type_subdivision}
                  onChange={(e) => handleChange('type_subdivision', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent text-sm"
                >
                  <option value="region">Région</option>
                  <option value="state">État</option>
                  <option value="province">Province</option>
                  <option value="department">Département</option>
                  <option value="canton">Canton</option>
                  <option value="district">District</option>
                  <option value="other">Autre</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Pays *
                </label>
                <select
                  required
                  value={formData.pays}
                  onChange={(e) => handleChange('pays', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent text-sm"
                >
                  <option value="">Sélectionnez un pays</option>
                  {pays.map(paysItem => (
                    <option key={paysItem.id} value={paysItem.id}>
                      {paysItem.emoji} {paysItem.nom_fr || paysItem.nom} ({paysItem.code_iso})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Latitude
                </label>
                <input
                  type="number"
                  step="any"
                  value={formData.latitude}
                  onChange={(e) => handleChange('latitude', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent text-sm"
                  placeholder="6.1378"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Longitude
                </label>
                <input
                  type="number"
                  step="any"
                  value={formData.longitude}
                  onChange={(e) => handleChange('longitude', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent text-sm"
                  placeholder="1.2123"
                />
              </div>
            </div>
          </div>
          
          <div className="flex justify-end gap-2 pt-3 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-all duration-200 font-medium text-sm hover:shadow-sm focus:outline-none focus:ring-1 focus:ring-violet-500"
              disabled={loading}
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-1.5 bg-gradient-to-r from-violet-600 to-violet-500 text-white rounded-lg hover:from-violet-700 hover:to-violet-600 disabled:opacity-50 transition-all duration-200 font-medium flex items-center space-x-1.5 shadow hover:shadow-md text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
            >
              {loading ? (
                <>
                  <FiRefreshCw className="animate-spin" size={14} />
                  <span>Sauvegarde...</span>
                </>
              ) : (
                <>
                  <FiCheck size={14} />
                  <span>{subdivision ? 'Mettre à jour' : 'Créer la subdivision'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}