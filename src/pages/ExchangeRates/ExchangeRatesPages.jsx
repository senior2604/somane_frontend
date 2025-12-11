import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  FiChevronLeft, 
  FiChevronRight,
  FiChevronDown,
  FiDownload,
  FiUpload,
  FiEye,
  FiCheckCircle,
  FiXCircle,
  FiDollarSign,
  FiGlobe,
  FiCalendar,
  FiTrendingUp,
  FiTrendingDown,
  FiExternalLink,
  FiInfo,
  FiActivity
} from "react-icons/fi";

export default function TauxChangePage() {
  const [tauxChange, setTauxChange] = useState([]);
  const [devises, setDevises] = useState([]);
  const [entites, setEntites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingTaux, setEditingTaux] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedTaux, setSelectedTaux] = useState(null);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDevise, setFilterDevise] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [selectedRows, setSelectedRows] = useState([]);

  // Chargement initial - COMME DANS BANQUES
  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [tauxRes, devisesRes, entitesRes] = await Promise.all([
        apiClient.get('/taux-change/'),
        apiClient.get('/devises/'),
        apiClient.get('/entites/')
      ]);
      
      const extractData = (response) => {
        if (Array.isArray(response)) return response;
        if (response && Array.isArray(response.results)) return response.results;
        if (response && Array.isArray(response.data)) return response.data;
        return [];
      };
      
      console.log('📊 Données taux de change reçues:', tauxRes);
      setTauxChange(extractData(tauxRes));
      setDevises(extractData(devisesRes));
      setEntites(extractData(entitesRes));
      
    } catch (err) {
      console.error('Erreur lors du chargement des données:', err);
      setError('Erreur lors du chargement des données');
      setTauxChange([]);
      setDevises([]);
      setEntites([]);
    } finally {
      setLoading(false);
    }
  };

  // Fonction pour obtenir les détails d'une devise
  const getDeviseDetails = (tauxItem) => {
    return {
      code: tauxItem.devise_code,
      nom: tauxItem.devise_nom,
      symbole: tauxItem.devise_symbole
    };
  };

  // Fonction pour obtenir les détails d'une entité
  const getEntiteDetails = (tauxItem) => {
    return {
      raison_sociale: tauxItem.entite_nom
    };
  };

  // Formater le taux pour l'affichage
  const formatTaux = (taux) => {
    if (!taux) return '0';
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 6,
      maximumFractionDigits: 6
    }).format(taux);
  };

  // Formater la date
  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  // Filtrage et recherche - COMME DANS BANQUES
  const filteredTauxChange = useMemo(() => {
    return tauxChange.filter(taux => {
      const deviseDetails = getDeviseDetails(taux);
      const matchesSearch = 
        (deviseDetails?.code || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (deviseDetails?.nom || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (taux.date_taux || '').includes(searchTerm);
      
      const matchesDevise = !filterDevise || taux.devise == filterDevise;
      const matchesDate = !filterDate || taux.date_taux === filterDate;
      
      return matchesSearch && matchesDevise && matchesDate;
    });
  }, [tauxChange, searchTerm, filterDevise, filterDate]);

  // Calculs pour la pagination - COMME DANS BANQUES
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentTauxChange = Array.isArray(filteredTauxChange) ? filteredTauxChange.slice(indexOfFirstItem, indexOfLastItem) : [];
  const totalPages = Math.ceil((Array.isArray(filteredTauxChange) ? filteredTauxChange.length : 0) / itemsPerPage);

  // Pagination - COMME DANS BANQUES
  const paginate = (pageNumber) => setCurrentPage(pageNumber);
  const nextPage = () => currentPage < totalPages && setCurrentPage(currentPage + 1);
  const prevPage = () => currentPage > 1 && setCurrentPage(currentPage - 1);

  // Gestion des sélections - COMME DANS BANQUES
  const toggleRowSelection = (id) => {
    setSelectedRows(prev => 
      prev.includes(id) 
        ? prev.filter(rowId => rowId !== id)
        : [...prev, id]
    );
  };

  const selectAllRows = () => {
    if (selectedRows.length === currentTauxChange.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(currentTauxChange.map(taux => taux.id));
    }
  };

  // Gestion des actions - COMME DANS BANQUES
  const handleNewTaux = () => {
    setEditingTaux(null);
    setShowForm(true);
  };

  const handleEdit = (taux) => {
    setEditingTaux(taux);
    setShowForm(true);
  };

  const handleDelete = async (taux) => {
    const deviseDetails = getDeviseDetails(taux);
    const deviseNom = deviseDetails ? `${deviseDetails.code} - ${deviseDetails.nom}` : 'cette devise';
    
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer le taux de change du ${formatDate(taux.date_taux)} pour ${deviseNom} ? Cette action est irréversible.`)) {
      try {
        await apiClient.delete(`/taux-change/${taux.id}/`);
        fetchAllData();
      } catch (err) {
        setError('Erreur lors de la suppression');
        console.error('Error deleting taux change:', err);
      }
    }
  };

  const handleViewDetails = (taux) => {
    setSelectedTaux(taux);
    setShowDetailModal(true);
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingTaux(null);
    fetchAllData();
  };

  const handleRetry = () => {
    fetchAllData();
  };

  const resetFilters = () => {
    setSearchTerm('');
    setFilterDevise('');
    setFilterDate('');
    setCurrentPage(1);
  };

  // Statistiques - COMME DANS BANQUES (4 cartes)
  const stats = useMemo(() => ({
    total: tauxChange.length,
    uniqueDevises: new Set(tauxChange.map(t => t.devise)).size,
    uniqueDates: new Set(tauxChange.map(t => t.date_taux)).size,
    uniqueEntites: new Set(tauxChange.map(t => t.entite)).size
  }), [tauxChange]);

  // Trouver le taux maximum et minimum
  const tauxExtremes = useMemo(() => {
    if (tauxChange.length === 0) return { max: 0, min: 0 };
    
    const tauxList = tauxChange.map(t => parseFloat(t.taux)).filter(t => !isNaN(t));
    if (tauxList.length === 0) return { max: 0, min: 0 };
    
    return {
      max: Math.max(...tauxList),
      min: Math.min(...tauxList)
    };
  }, [tauxChange]);

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
      {/* HEADER COMPACT COMME DANS BANQUES */}
      <div className="mb-6">
        {/* Ligne supérieure avec titre */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-gradient-to-br from-violet-600 to-violet-500 rounded-lg shadow">
              <FiActivity className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Gestion des Taux de Change</h1>
              <p className="text-gray-600 text-xs mt-0.5">
                Gérez vos taux de change et devises
              </p>
            </div>
          </div>
        </div>

        {/* Barre de recherche au centre COMME DANS BANQUES */}
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="relative flex items-center">
            <div className="relative flex-1">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-24 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent text-sm w-80"
                placeholder="Rechercher un taux de change..."
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
              onClick={handleNewTaux}
              className="ml-2 px-3 py-2 rounded-lg bg-gradient-to-r from-violet-600 to-violet-500 text-white hover:from-violet-700 hover:to-violet-600 transition-all duration-300 flex items-center gap-1.5 text-sm shadow"
            >
              <FiPlus size={14} />
              <span>Nouveau Taux</span>
            </button>
          </div>
        </div>

        {/* Statistiques en ligne compactes COMME DANS BANQUES */}
        <div className="grid grid-cols-4 gap-2 mb-3">
          <div className="bg-white rounded-lg p-2 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Total taux</p>
                <p className="text-sm font-bold text-violet-600 mt-0.5">{stats.total}</p>
              </div>
              <div className="p-1 bg-violet-50 rounded">
                <FiActivity className="w-3 h-3 text-violet-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg p-2 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Devises</p>
                <p className="text-sm font-bold text-emerald-600 mt-0.5">{stats.uniqueDevises}</p>
              </div>
              <div className="p-1 bg-emerald-50 rounded">
                <FiGlobe className="w-3 h-3 text-emerald-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg p-2 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Dates</p>
                <p className="text-sm font-bold text-amber-600 mt-0.5">{stats.uniqueDates}</p>
              </div>
              <div className="p-1 bg-amber-50 rounded">
                <FiCalendar className="w-3 h-3 text-amber-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg p-2 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Entités</p>
                <p className="text-sm font-bold text-blue-600 mt-0.5">{stats.uniqueEntites}</p>
              </div>
              <div className="p-1 bg-blue-50 rounded">
                <FiTrendingUp className="w-3 h-3 text-blue-600" />
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
            Tous les taux
          </button>
        </div>
      </div>

      {/* Message d'erreur compact COMME DANS BANQUES */}
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

      {/* Tableau Principal COMME DANS BANQUES */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {/* En-tête du tableau avec actions compact */}
        <div className="px-3 py-2 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={selectedRows.length === currentTauxChange.length && currentTauxChange.length > 0}
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
                      checked={selectedRows.length === currentTauxChange.length && currentTauxChange.length > 0}
                      onChange={selectAllRows}
                      className="w-3 h-3 text-violet-600 rounded focus:ring-violet-500 border-gray-300"
                    />
                    ID
                  </div>
                </th>
                <th scope="col" className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-300">
                  Devise
                </th>
                <th scope="col" className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-300">
                  Date
                </th>
                <th scope="col" className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-300">
                  Taux
                </th>
                <th scope="col" className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-300">
                  Entité
                </th>
                <th scope="col" className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            
            <tbody className="divide-y divide-gray-200">
              {currentTauxChange.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-4 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-12 h-12 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mb-2">
                        <FiActivity className="w-6 h-6 text-gray-400" />
                      </div>
                      <h3 className="text-sm font-semibold text-gray-900 mb-1">
                        {tauxChange.length === 0 ? 'Aucun taux de change trouvé' : 'Aucun résultat'}
                      </h3>
                      <p className="text-gray-600 text-xs mb-3 max-w-md">
                        {tauxChange.length === 0 
                          ? 'Commencez par créer votre premier taux de change' 
                          : 'Essayez de modifier vos critères de recherche'}
                      </p>
                      {tauxChange.length === 0 && (
                        <button 
                          onClick={handleNewTaux}
                          className="px-3 py-1 bg-gradient-to-r from-violet-600 to-violet-500 text-white rounded hover:from-violet-700 hover:to-violet-600 transition-all duration-300 font-medium flex items-center gap-1 text-xs"
                        >
                          <FiPlus size={12} />
                          Créer taux
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                currentTauxChange.map((taux) => {
                  const deviseDetails = getDeviseDetails(taux);
                  const entiteDetails = getEntiteDetails(taux);
                  
                  return (
                    <tr 
                      key={taux.id}
                      className={`hover:bg-gradient-to-r hover:from-gray-50 hover:to-white transition-all duration-200 ${
                        selectedRows.includes(taux.id) ? 'bg-gradient-to-r from-violet-50 to-violet-25' : 'bg-white'
                      }`}
                    >
                      {/* ID avec checkbox */}
                      <td className="px-3 py-2 whitespace-nowrap border-r border-gray-200">
                        <div className="flex items-center gap-1.5">
                          <input
                            type="checkbox"
                            checked={selectedRows.includes(taux.id)}
                            onChange={() => toggleRowSelection(taux.id)}
                            className="w-3 h-3 text-violet-600 rounded focus:ring-violet-500 border-gray-300"
                          />
                          <span className="px-1 py-0.5 bg-gray-100 text-gray-800 rounded text-xs font-medium font-mono">
                            #{taux.id}
                          </span>
                        </div>
                      </td>
                      
                      {/* Devise */}
                      <td className="px-3 py-2 border-r border-gray-200">
                        <div className="flex flex-col">
                          <div className="text-xs font-semibold text-gray-900 flex items-center gap-1.5">
                            <span className="px-1.5 py-0.5 bg-gradient-to-r from-violet-50 to-violet-100 text-violet-700 rounded border border-violet-200 text-xs font-medium font-mono">
                              {deviseDetails?.code || 'N/A'}
                            </span>
                            <span className="truncate max-w-[100px]">{deviseDetails?.nom || 'Devise inconnue'}</span>
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5">
                            {deviseDetails?.symbole || '-'}
                          </div>
                        </div>
                      </td>
                      
                      {/* Date */}
                      <td className="px-3 py-2 border-r border-gray-200">
                        <div className="text-xs text-gray-900">
                          <span className="px-1.5 py-0.5 bg-gradient-to-r from-emerald-50 to-emerald-100 text-emerald-700 rounded border border-emerald-200 text-xs font-medium">
                            {formatDate(taux.date_taux)}
                          </span>
                        </div>
                      </td>
                      
                      {/* Taux */}
                      <td className="px-3 py-2 border-r border-gray-200">
                        <div className="flex flex-col">
                          <div className="text-xs font-bold text-gray-900 font-mono">
                            {formatTaux(taux.taux)}
                          </div>
                          <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                            {parseFloat(taux.taux) >= tauxExtremes.max ? (
                              <FiTrendingUp className="w-3 h-3 text-emerald-500" />
                            ) : parseFloat(taux.taux) <= tauxExtremes.min ? (
                              <FiTrendingDown className="w-3 h-3 text-red-500" />
                            ) : null}
                            <span className="truncate max-w-[80px]">1 {deviseDetails?.code || 'DEV'} =</span>
                          </div>
                        </div>
                      </td>
                      
                      {/* Entité */}
                      <td className="px-3 py-2 border-r border-gray-200">
                        <div className="text-xs text-gray-900 truncate max-w-[120px]">
                          {entiteDetails?.raison_sociale || '-'}
                        </div>
                      </td>
                      
                      {/* Actions */}
                      <td className="px-3 py-2 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleViewDetails(taux)}
                            className="p-1 bg-gradient-to-r from-gray-50 to-gray-100 text-gray-700 rounded hover:from-gray-100 hover:to-gray-200 transition-all duration-200 shadow-sm hover:shadow"
                            title="Voir détails"
                          >
                            <FiEye size={12} />
                          </button>
                          <button
                            onClick={() => handleEdit(taux)}
                            className="p-1 bg-gradient-to-r from-violet-50 to-violet-100 text-violet-700 rounded hover:from-violet-100 hover:to-violet-200 transition-all duration-200 shadow-sm hover:shadow"
                            title="Modifier"
                          >
                            <FiEdit2 size={12} />
                          </button>
                          <button
                            onClick={() => handleDelete(taux)}
                            className="p-1 bg-gradient-to-r from-red-50 to-red-100 text-red-700 rounded hover:from-red-100 hover:to-red-200 transition-all duration-200 shadow-sm hover:shadow"
                            title="Supprimer"
                          >
                            <FiTrash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination compact COMME DANS BANQUES */}
        {currentTauxChange.length > 0 && (
          <div className="px-3 py-2 border-t border-gray-200 bg-gradient-to-r from-gray-50 to-white">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <span className="text-xs text-gray-700">
                    Page {currentPage} sur {totalPages}
                  </span>
                  <span className="text-gray-300">•</span>
                  <span className="text-xs text-gray-700">
                    {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredTauxChange.length)} sur {filteredTauxChange.length} taux
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
        <TauxChangeFormModal
          taux={editingTaux}
          devises={devises}
          entites={entites}
          onClose={() => {
            setShowForm(false);
            setEditingTaux(null);
          }}
          onSuccess={handleFormSuccess}
        />
      )}

      {showDetailModal && selectedTaux && (
        <TauxChangeDetailModal
          taux={selectedTaux}
          devises={devises}
          entites={entites}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedTaux(null);
          }}
        />
      )}
    </div>
  );
}

// MODAL DE DÉTAILS TAUX DE CHANGE - STYLE COMME BANQUES
function TauxChangeDetailModal({ taux, devises, entites, onClose }) {
  const deviseDetails = devises.find(d => d.id == taux.devise);
  const entiteDetails = entites.find(e => e.id == taux.entite);

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-3 z-50 backdrop-blur-sm">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-xl">
        {/* Header du modal */}
        <div className="sticky top-0 bg-gradient-to-r from-violet-600 to-violet-500 text-white rounded-t-lg p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-white/20 backdrop-blur-sm rounded">
                <FiActivity className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold">Détails du Taux de Change</h2>
                <p className="text-violet-100 text-xs mt-0.5">
                  {deviseDetails?.code} - {deviseDetails?.nom}
                </p>
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
          {/* En-tête avec badges */}
          <div className="flex flex-col md:flex-row items-center md:items-start gap-4 mb-6">
            <div className="w-32 h-32 bg-gradient-to-br from-violet-100 to-violet-200 rounded-lg flex items-center justify-center overflow-hidden border-2 border-violet-300">
              <FiActivity className="w-16 h-16 text-violet-600" />
            </div>
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-xl font-bold text-gray-900">
                {deviseDetails ? `${deviseDetails.code} - ${deviseDetails.nom}` : 'Devise inconnue'}
              </h1>
              <div className="flex flex-wrap gap-2 mt-3 justify-center md:justify-start">
                <span className="inline-flex items-center px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-medium">
                  <FiCalendar className="w-3 h-3 mr-1" />
                  Date: {new Date(taux.date_taux).toLocaleDateString('fr-FR')}
                </span>
                {deviseDetails && (
                  <span className="inline-flex items-center px-3 py-1 bg-violet-100 text-violet-800 rounded-full text-xs font-medium">
                    <FiGlobe className="w-3 h-3 mr-1" />
                    Symbole: {deviseDetails.symbole}
                  </span>
                )}
                {entiteDetails && (
                  <span className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                    <FiTrendingUp className="w-3 h-3 mr-1" />
                    {entiteDetails.raison_sociale}
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
                <p className="text-sm text-gray-900 font-mono font-medium">#{taux.id}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Date du taux</p>
                <p className="text-sm text-gray-900 font-medium">
                  {new Date(taux.date_taux).toLocaleDateString('fr-FR', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
            </div>
          </div>

          {/* Détails du Taux */}
          <div className="bg-gradient-to-br from-emerald-50 to-white rounded-lg p-4 border border-emerald-200">
            <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-1.5">
              <div className="w-1 h-4 bg-gradient-to-b from-emerald-600 to-emerald-400 rounded"></div>
              Détails du Taux de Change
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <div className="bg-white rounded-lg p-4 border border-gray-300">
                  <div className="flex items-center justify-center space-x-6">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-violet-600">1</div>
                      <div className="text-xs text-gray-600 mt-1">{deviseDetails?.code || 'DEV'}</div>
                    </div>
                    <FiArrowRight className="text-gray-400" />
                    <div className="text-center">
                      <div className="text-2xl font-bold text-emerald-600 font-mono">
                        {new Intl.NumberFormat('fr-FR', {
                          minimumFractionDigits: 6,
                          maximumFractionDigits: 6
                        }).format(taux.taux)}
                      </div>
                      <div className="text-xs text-gray-600 mt-1">Unité de référence</div>
                    </div>
                  </div>
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Valeur du taux</p>
                <p className="text-sm text-gray-900 font-mono font-bold">
                  {taux.taux}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Format</p>
                <p className="text-sm text-gray-900">
                  <span className="px-2 py-1 bg-gradient-to-r from-emerald-50 to-emerald-100 text-emerald-700 rounded border border-emerald-200 text-xs font-medium">
                    6 décimales
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* Détails de la Devise */}
          {deviseDetails && (
            <div className="bg-gradient-to-br from-violet-50 to-white rounded-lg p-4 border border-violet-200">
              <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-1.5">
                <div className="w-1 h-4 bg-gradient-to-b from-violet-600 to-violet-400 rounded"></div>
                Détails de la Devise
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">Code ISO</p>
                  <p className="text-sm text-gray-900 font-medium font-mono">{deviseDetails.code}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">Nom complet</p>
                  <p className="text-sm text-gray-900 font-medium">{deviseDetails.nom}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">Symbole</p>
                  <p className="text-sm text-gray-900">{deviseDetails.symbole}</p>
                </div>
              </div>
            </div>
          )}

          {/* Détails de l'Entité */}
          {entiteDetails && (
            <div className="bg-gradient-to-br from-blue-50 to-white rounded-lg p-4 border border-blue-200">
              <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-1.5">
                <div className="w-1 h-4 bg-gradient-to-b from-blue-600 to-blue-400 rounded"></div>
                Détails de l'Entité
              </h3>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">Nom de l'entité</p>
                  <p className="text-sm text-gray-900 font-medium">{entiteDetails.raison_sociale}</p>
                </div>
              </div>
            </div>
          )}
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

// Composant pour la flèche (non disponible dans react-icons/fi)
const FiArrowRight = (props) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    className="h-6 w-6" 
    fill="none" 
    viewBox="0 0 24 24" 
    stroke="currentColor"
    {...props}
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
  </svg>
);

// COMPOSANT MODAL AVEC DROPDOWNS AVEC RECHERCHE INTÉGRÉE - FORMULAIRE COMPLET COMME BANQUES
function TauxChangeFormModal({ taux, devises, entites, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    devise: taux?.devise || '',
    date_taux: taux?.date_taux || '',
    taux: taux?.taux || '',
    entite: taux?.entite || ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // États pour recherche dans les dropdowns
  const [searchDevise, setSearchDevise] = useState('');
  const [searchEntite, setSearchEntite] = useState('');

  // S'assurer que les tableaux sont toujours des tableaux
  const devisesArray = Array.isArray(devises) ? devises : [];
  const entitesArray = Array.isArray(entites) ? entites : [];

  // Filtrer les listes avec la recherche
  const filteredDevises = devisesArray.filter(devise =>
    (devise.code || '').toLowerCase().includes(searchDevise.toLowerCase()) ||
    (devise.nom || '').toLowerCase().includes(searchDevise.toLowerCase()) ||
    (devise.symbole || '').toLowerCase().includes(searchDevise.toLowerCase())
  );

  const filteredEntites = entitesArray.filter(entite =>
    (entite.raison_sociale || '').toLowerCase().includes(searchEntite.toLowerCase())
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validation
    if (!formData.devise) {
      setError('La devise est obligatoire');
      setLoading(false);
      return;
    }

    if (!formData.date_taux) {
      setError('La date du taux est obligatoire');
      setLoading(false);
      return;
    }

    if (!formData.taux || parseFloat(formData.taux) <= 0) {
      setError('Le taux doit être un nombre positif');
      setLoading(false);
      return;
    }

    if (!formData.entite) {
      setError('L\'entité est obligatoire');
      setLoading(false);
      return;
    }

    try {
      const url = taux 
        ? `/taux-change/${taux.id}/`
        : `/taux-change/`;
      
      const method = taux ? 'PUT' : 'POST';

      // Préparer les données finales
      const submitData = {
        ...formData,
      };

      console.log('📤 Sauvegarde taux de change:', { url, method, submitData });

      const response = await apiClient.request(url, {
        method: method,
        body: JSON.stringify(submitData),
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log('✅ Taux de change sauvegardé:', response);
      onSuccess();
    } catch (err) {
      console.error('❌ Erreur sauvegarde taux de change:', err);
      
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

  // Composant réutilisable pour les dropdowns avec recherche - COMME DANS BANQUES
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
              {Icon && <Icon className="text-gray-400" size={16} />
              }
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

  // Obtenir les détails pour l'aperçu
  const deviseDetails = devisesArray.find(d => d.id == formData.devise);
  const entiteDetails = entitesArray.find(e => e.id == formData.entite);

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-3 z-50 backdrop-blur-sm">
      <div className="bg-white rounded-lg w-full max-w-5xl max-h-[90vh] overflow-y-auto shadow-xl">
        {/* Header du modal avec gradient - COMPACT COMME DANS BANQUES */}
        <div className="sticky top-0 bg-gradient-to-r from-violet-600 to-violet-500 text-white rounded-t-lg p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-white/20 backdrop-blur-sm rounded">
                <FiActivity className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold">
                  {taux ? 'Modifier le taux de change' : 'Nouveau Taux de Change'}
                </h2>
                {!taux && (
                  <p className="text-violet-100 text-xs mt-0.5">
                    Créez un nouveau taux de change dans le système
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
          {/* Section 1: Informations de Base */}
          <div className="bg-gradient-to-br from-gray-50 to-white rounded-lg p-3 border border-gray-200">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-4 bg-gradient-to-b from-violet-600 to-violet-400 rounded"></div>
              <h3 className="text-sm font-semibold text-gray-900">Informations de Base</h3>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {/* 1. Devise avec recherche */}
              <div>
                <SearchableDropdown
                  label="Devise *"
                  value={formData.devise}
                  onChange={(value) => handleChange('devise', value)}
                  options={devisesArray}
                  searchValue={searchDevise}
                  onSearchChange={setSearchDevise}
                  placeholder="Sélectionnez une devise"
                  required={true}
                  icon={FiGlobe}
                  getOptionLabel={(devise) => `${devise.code} - ${devise.nom} (${devise.symbole})`}
                  getOptionValue={(devise) => devise.id}
                />
              </div>
              
              {/* 2. Date du taux */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Date du taux *
                </label>
                <input
                  type="date"
                  required
                  value={formData.date_taux}
                  onChange={(e) => handleChange('date_taux', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent bg-white text-sm"
                />
              </div>
              
              {/* 3. Taux */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Taux *
                </label>
                <div className="relative">
                  <FiDollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    type="number"
                    required
                    step="0.000001"
                    min="0.000001"
                    value={formData.taux}
                    onChange={(e) => handleChange('taux', e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent text-sm font-mono"
                    placeholder="1.000000"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Valeur du taux de change avec 6 décimales
                </p>
              </div>
              
              {/* 4. Entité avec recherche */}
              <div>
                <SearchableDropdown
                  label="Entité *"
                  value={formData.entite}
                  onChange={(value) => handleChange('entite', value)}
                  options={entitesArray}
                  searchValue={searchEntite}
                  onSearchChange={setSearchEntite}
                  placeholder="Sélectionnez une entité"
                  required={true}
                  icon={FiTrendingUp}
                  getOptionLabel={(entite) => entite.raison_sociale}
                  getOptionValue={(entite) => entite.id}
                />
              </div>
            </div>
          </div>

          {/* Aperçu */}
          <div className="bg-gradient-to-br from-emerald-50 to-white rounded-lg p-3 border border-emerald-200">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-4 bg-gradient-to-b from-emerald-600 to-emerald-400 rounded"></div>
              <h3 className="text-sm font-semibold text-gray-900">Aperçu</h3>
            </div>
            
            <div className="bg-white rounded-lg p-4 border border-gray-300">
              <div className="flex items-center justify-center space-x-4">
                <div className="text-center">
                  <div className="text-lg font-bold text-violet-600">1</div>
                  <div className="text-xs text-gray-600 mt-1">
                    {deviseDetails ? deviseDetails.code : 'DEV'}
                  </div>
                </div>
                <FiArrowRight className="text-gray-400" />
                <div className="text-center">
                  <div className="text-lg font-bold text-emerald-600 font-mono">
                    {formData.taux || '0.000000'}
                  </div>
                  <div className="text-xs text-gray-600 mt-1">Unité de référence</div>
                </div>
                <div className="text-gray-400 text-sm">le</div>
                <div className="text-center">
                  <div className="text-lg font-bold text-gray-900">
                    {formData.date_taux || 'JJ/MM/AAAA'}
                  </div>
                  <div className="text-xs text-gray-600 mt-1">Date</div>
                </div>
                {entiteDetails && (
                  <>
                    <div className="text-gray-400 text-sm">pour</div>
                    <div className="text-center">
                      <div className="text-sm font-medium text-gray-900 truncate max-w-[120px]">
                        {entiteDetails.raison_sociale}
                      </div>
                      <div className="text-xs text-gray-600 mt-1">Entité</div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
          
          {/* Boutons d'action - COMME DANS BANQUES */}
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
                  <span>{taux ? 'Mettre à jour' : 'Créer le taux'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}