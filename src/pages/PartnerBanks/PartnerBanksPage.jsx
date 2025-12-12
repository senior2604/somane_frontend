import React, { useState, useEffect, useRef } from 'react';
import { apiClient } from '../../services/apiClient';
import { 
  FiRefreshCw, 
  FiPlus, 
  FiEdit2, 
  FiTrash2, 
  FiSearch, 
  FiX, 
  FiCheck, 
  FiGlobe, 
  FiPhone, 
  FiMail, 
  FiDollarSign, 
  FiCalendar, 
  FiUser, 
  FiChevronLeft, 
  FiChevronRight,
  FiBriefcase,
  FiHome,
  FiCreditCard,
  FiActivity,
  FiUsers,
  FiDownload,
  FiUpload,
  FiEye,
  FiChevronDown,
  FiChevronUp,
  FiExternalLink,
  FiPocket,
  FiCheckCircle,
  FiXCircle,
  FiInfo
} from "react-icons/fi";
import { TbBuildingBank } from "react-icons/tb";

export default function PartnerBanksPage() {
  const [partnerBanks, setPartnerBanks] = useState([]);
  const [partenaires, setPartenaires] = useState([]);
  const [banques, setBanques] = useState([]);
  const [entites, setEntites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingPartnerBank, setEditingPartnerBank] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedPartnerBank, setSelectedPartnerBank] = useState(null);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPartenaire, setFilterPartenaire] = useState('');
  const [filterBanque, setFilterBanque] = useState('');
  const [selectedRows, setSelectedRows] = useState([]);

  // Chargement initial
  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [partnerBanksRes, partenairesRes, banquesRes, entitesRes] = await Promise.all([
        apiClient.get('/banques-partenaires/'),
        apiClient.get('/partenaires/'),
        apiClient.get('/banques/'),
        apiClient.get('/entites/')
      ]);
      
      const extractData = (response) => {
        if (Array.isArray(response)) return response;
        if (response && Array.isArray(response.results)) return response.results;
        if (response && Array.isArray(response.data)) return response.data;
        return [];
      };
      
      setPartnerBanks(extractData(partnerBanksRes));
      setPartenaires(extractData(partenairesRes));
      setBanques(extractData(banquesRes));
      setEntites(extractData(entitesRes));
      
    } catch (err) {
      console.error('Erreur lors du chargement des données:', err);
      setError('Erreur lors du chargement des données');
      setPartnerBanks([]);
      setPartenaires([]);
      setBanques([]);
      setEntites([]);
    } finally {
      setLoading(false);
    }
  };

  // Filtrage et recherche
  const filteredPartnerBanks = partnerBanks.filter(partnerBank => {
    const matchesSearch = 
      (partnerBank.numero_compte || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (partnerBank.partenaire_details?.nom || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (partnerBank.banque_details?.nom || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesPartenaire = !filterPartenaire || 
      (partnerBank.partenaire && partnerBank.partenaire.toString() === filterPartenaire);
    
    const matchesBanque = !filterBanque || 
      (partnerBank.banque && partnerBank.banque.toString() === filterBanque);
    
    return matchesSearch && matchesPartenaire && matchesBanque;
  });

  // Calculs pour la pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentPartnerBanks = Array.isArray(filteredPartnerBanks) ? filteredPartnerBanks.slice(indexOfFirstItem, indexOfLastItem) : [];
  const totalPages = Math.ceil((Array.isArray(filteredPartnerBanks) ? filteredPartnerBanks.length : 0) / itemsPerPage);

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
    if (selectedRows.length === currentPartnerBanks.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(currentPartnerBanks.map(partnerBank => partnerBank.id));
    }
  };

  // Gestion des actions
  const handleNewPartnerBank = () => {
    setEditingPartnerBank(null);
    setShowForm(true);
  };

  const handleEdit = (partnerBank) => {
    setEditingPartnerBank(partnerBank);
    setShowForm(true);
  };

  const handleDelete = async (partnerBank) => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer le compte "${partnerBank.numero_compte}" ? Cette action est irréversible.`)) {
      try {
        await apiClient.delete(`/banques-partenaires/${partnerBank.id}/`);
        fetchAllData();
      } catch (err) {
        setError('Erreur lors de la suppression');
        console.error('Error deleting partner bank:', err);
      }
    }
  };

  const handleViewDetails = (partnerBank) => {
    setSelectedPartnerBank(partnerBank);
    setShowDetailModal(true);
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingPartnerBank(null);
    fetchAllData();
  };

  const handleRetry = () => {
    fetchAllData();
  };

  const resetFilters = () => {
    setSearchTerm('');
    setFilterPartenaire('');
    setFilterBanque('');
    setCurrentPage(1);
  };

  // Statistiques - FORMAT IDENTIQUE AUX AUTRES PAGES
  const stats = {
    total: partnerBanks.length,
    partenairesUniques: new Set(partnerBanks.map(pb => pb.partenaire).filter(id => id)).size,
    banquesUniques: new Set(partnerBanks.map(pb => pb.banque).filter(id => id)).size,
    entitesUniques: new Set(partnerBanks.map(pb => pb.entite).filter(id => id)).size,
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
                placeholder="Rechercher un compte..."
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
              onClick={handleNewPartnerBank}
              className="ml-2 px-3 py-2 rounded-lg bg-gradient-to-r from-violet-600 to-violet-500 text-white hover:from-violet-700 hover:to-violet-600 transition-all duration-300 flex items-center gap-1.5 text-sm shadow"
            >
              <FiPlus size={14} />
              <span>Nouveau Compte</span>
            </button>
          </div>
        </div>

        {/* Statistiques en ligne compactes - FORMAT IDENTIQUE */}
        <div className="grid grid-cols-4 gap-2 mb-3">
          <div className="bg-white rounded-lg p-2 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-600">Total:</span>
                <span className="text-sm font-bold text-violet-600">{stats.total}</span>
              </div>
              <div className="p-1 bg-violet-50 rounded">
                <TbBuildingBank className="w-3 h-3 text-violet-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg p-2 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-600">Partenaires:</span>
                <span className="text-sm font-bold text-emerald-600">{stats.partenairesUniques}</span>
              </div>
              <div className="p-1 bg-emerald-50 rounded">
                <FiUsers className="w-3 h-3 text-emerald-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg p-2 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-600">Banques:</span>
                <span className="text-sm font-bold text-purple-600">{stats.banquesUniques}</span>
              </div>
              <div className="p-1 bg-purple-50 rounded">
                <FiPocket className="w-3 h-3 text-purple-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg p-2 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-600">Entités:</span>
                <span className="text-sm font-bold text-amber-600">{stats.entitesUniques}</span>
              </div>
              <div className="p-1 bg-amber-50 rounded">
                <FiBriefcase className="w-3 h-3 text-amber-600" />
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
            Tous les comptes
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
                  checked={selectedRows.length === currentPartnerBanks.length && currentPartnerBanks.length > 0}
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
                      checked={selectedRows.length === currentPartnerBanks.length && currentPartnerBanks.length > 0}
                      onChange={selectAllRows}
                      className="w-3 h-3 text-violet-600 rounded focus:ring-violet-500 border-gray-300"
                    />
                    ID
                  </div>
                </th>
                <th scope="col" className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-300">
                  Partenaire
                </th>
                <th scope="col" className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-300">
                  Banque
                </th>
                <th scope="col" className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-300">
                  Numéro Compte
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
              {currentPartnerBanks.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-4 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-12 h-12 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mb-2">
                        <TbBuildingBank className="w-6 h-6 text-gray-400" />
                      </div>
                      <h3 className="text-sm font-semibold text-gray-900 mb-1">
                        {partnerBanks.length === 0 ? 'Aucun compte trouvé' : 'Aucun résultat'}
                      </h3>
                      <p className="text-gray-600 text-xs mb-3 max-w-md">
                        {partnerBanks.length === 0 
                          ? 'Commencez par créer votre premier compte bancaire partenaire' 
                          : 'Essayez de modifier vos critères de recherche'}
                      </p>
                      {partnerBanks.length === 0 && (
                        <button 
                          onClick={handleNewPartnerBank}
                          className="px-3 py-1 bg-gradient-to-r from-violet-600 to-violet-500 text-white rounded hover:from-violet-700 hover:to-violet-600 transition-all duration-300 font-medium flex items-center gap-1 text-xs"
                        >
                          <FiPlus size={12} />
                          Créer compte
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                currentPartnerBanks.map((partnerBank) => (
                  <tr 
                    key={partnerBank.id}
                    className={`hover:bg-gradient-to-r hover:from-gray-50 hover:to-white transition-all duration-200 ${
                      selectedRows.includes(partnerBank.id) ? 'bg-gradient-to-r from-violet-50 to-violet-25' : 'bg-white'
                    }`}
                  >
                    {/* ID avec checkbox */}
                    <td className="px-3 py-2 whitespace-nowrap border-r border-gray-200">
                      <div className="flex items-center gap-1.5">
                        <input
                          type="checkbox"
                          checked={selectedRows.includes(partnerBank.id)}
                          onChange={() => toggleRowSelection(partnerBank.id)}
                          className="w-3 h-3 text-violet-600 rounded focus:ring-violet-500 border-gray-300"
                        />
                        <span className="px-1 py-0.5 bg-gray-100 text-gray-800 rounded text-xs font-medium font-mono">
                          #{partnerBank.id}
                        </span>
                      </div>
                    </td>
                    
                    {/* Partenaire */}
                    <td className="px-3 py-2 border-r border-gray-200">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-full flex items-center justify-center border border-emerald-200">
                          <FiUsers className="w-4 h-4 text-emerald-600" />
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-gray-900 truncate max-w-[120px]">
                            {partnerBank.partenaire_details?.nom || partnerBank.partenaire || '-'}
                          </div>
                          <div className="text-xs text-gray-500 capitalize">
                            {partnerBank.partenaire_details?.type_partenaire || ''}
                          </div>
                        </div>
                      </div>
                    </td>
                    
                    {/* Banque */}
                    <td className="px-3 py-2 border-r border-gray-200">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gradient-to-br from-purple-50 to-purple-100 rounded-full flex items-center justify-center border border-purple-200">
                          <FiPocket className="w-4 h-4 text-purple-600" />
                        </div>
                        <div>
                          <div className="text-xs font-medium text-gray-900 truncate max-w-[100px]">
                            {partnerBank.banque_details?.nom || partnerBank.banque?.nom || '-'}
                          </div>
                          {partnerBank.banque_details?.code_bic && (
                            <div className="text-xs text-gray-500 font-mono truncate max-w-[90px]">
                              {partnerBank.banque_details.code_bic}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    
                    {/* Numéro de compte */}
                    <td className="px-3 py-2 border-r border-gray-200">
                      <span className="font-mono text-xs bg-gradient-to-r from-violet-50 to-violet-100 text-violet-700 px-2 py-1 rounded border border-violet-200">
                        {partnerBank.numero_compte}
                      </span>
                    </td>
                    
                    {/* Entité */}
                    <td className="px-3 py-2 border-r border-gray-200">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gradient-to-br from-amber-50 to-amber-100 rounded-full flex items-center justify-center border border-amber-200">
                          <FiBriefcase className="w-4 h-4 text-amber-600" />
                        </div>
                        <div className="text-xs text-gray-900 truncate max-w-[100px]">
                          {partnerBank.entite_details?.raison_sociale || partnerBank.entite?.raison_sociale || '-'}
                        </div>
                      </div>
                    </td>
                    
                    {/* Actions */}
                    <td className="px-3 py-2 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleViewDetails(partnerBank)}
                          className="p-1 bg-gradient-to-r from-gray-50 to-gray-100 text-gray-700 rounded hover:from-gray-100 hover:to-gray-200 transition-all duration-200 shadow-sm hover:shadow"
                          title="Voir détails"
                        >
                          <FiEye size={12} />
                        </button>
                        <button
                          onClick={() => handleEdit(partnerBank)}
                          className="p-1 bg-gradient-to-r from-violet-50 to-violet-100 text-violet-700 rounded hover:from-violet-100 hover:to-violet-200 transition-all duration-200 shadow-sm hover:shadow"
                          title="Modifier"
                        >
                          <FiEdit2 size={12} />
                        </button>
                        <button
                          onClick={() => handleDelete(partnerBank)}
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
        {currentPartnerBanks.length > 0 && (
          <div className="px-3 py-2 border-t border-gray-200 bg-gradient-to-r from-gray-50 to-white">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <span className="text-xs text-gray-700">
                    Page {currentPage} sur {totalPages}
                  </span>
                  <span className="text-gray-300">•</span>
                  <span className="text-xs text-gray-700">
                    {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredPartnerBanks.length)} sur {filteredPartnerBanks.length} comptes
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
        <PartnerBankFormModal
          partnerBank={editingPartnerBank}
          partenaires={partenaires}
          banques={banques}
          entites={entites}
          onClose={() => {
            setShowForm(false);
            setEditingPartnerBank(null);
          }}
          onSuccess={handleFormSuccess}
        />
      )}

      {showDetailModal && selectedPartnerBank && (
        <PartnerBankDetailModal
          partnerBank={selectedPartnerBank}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedPartnerBank(null);
          }}
        />
      )}
    </div>
  );
}

// MODAL DE DÉTAILS
function PartnerBankDetailModal({ partnerBank, onClose }) {
  const partenaire = partnerBank.partenaire_details || partnerBank.partenaire;
  const banque = partnerBank.banque_details || partnerBank.banque;
  const entite = partnerBank.entite_details || partnerBank.entite;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-3 z-50 backdrop-blur-sm">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-xl">
        {/* Header du modal */}
        <div className="sticky top-0 bg-gradient-to-r from-violet-600 to-violet-500 text-white rounded-t-lg p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-white/20 backdrop-blur-sm rounded">
                <TbBuildingBank className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold">Détails du Compte Bancaire</h2>
                <p className="text-violet-100 text-xs mt-0.5">{partnerBank.numero_compte}</p>
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
          {/* En-tête avec informations principales */}
          <div className="flex flex-col md:flex-row items-center md:items-start gap-4 mb-6">
            <div className="w-32 h-32 bg-gradient-to-br from-violet-100 to-violet-200 rounded-lg flex items-center justify-center overflow-hidden border-2 border-violet-300">
              <TbBuildingBank className="w-16 h-16 text-violet-600" />
            </div>
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-xl font-bold text-gray-900">Compte Bancaire Partenaire</h1>
              <div className="flex flex-wrap gap-2 mt-3 justify-center md:justify-start">
                <span className="inline-flex items-center px-3 py-1 bg-gradient-to-r from-violet-100 to-violet-50 text-violet-800 rounded-full text-xs font-medium border border-violet-200">
                  <TbBuildingBank className="w-3 h-3 mr-1" />
                  Compte Partenaire
                </span>
                {partenaire?.type_partenaire && (
                  <span className="inline-flex items-center px-3 py-1 bg-gradient-to-r from-emerald-100 to-emerald-50 text-emerald-800 rounded-full text-xs font-medium border border-emerald-200">
                    <FiUsers className="w-3 h-3 mr-1" />
                    {partenaire.type_partenaire}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Informations du Compte */}
          <div className="bg-gradient-to-br from-gray-50 to-white rounded-lg p-4 border border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-1.5">
              <div className="w-1 h-4 bg-gradient-to-b from-violet-600 to-violet-400 rounded"></div>
              Informations du Compte
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Numéro de compte</p>
                <p className="text-sm font-semibold text-violet-700 font-mono bg-violet-50 px-3 py-1.5 rounded border border-violet-200 inline-block">
                  {partnerBank.numero_compte || '-'}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Identifiant</p>
                <p className="text-sm text-gray-900 font-medium font-mono">
                  <span className="bg-gray-100 px-3 py-1 rounded">#{partnerBank.id}</span>
                </p>
              </div>
            </div>
          </div>

          {/* Informations du Partenaire */}
          <div className="bg-gradient-to-br from-emerald-50 to-white rounded-lg p-4 border border-emerald-200">
            <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-1.5">
              <div className="w-1 h-4 bg-gradient-to-b from-emerald-600 to-emerald-400 rounded"></div>
              Informations du Partenaire
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Nom du partenaire</p>
                <p className="text-sm text-gray-900 font-medium">
                  {partenaire?.nom || partenaire || '-'}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Type de partenaire</p>
                <p className="text-sm text-gray-900 capitalize">
                  {partenaire?.type_partenaire || '-'}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Email</p>
                <p className="text-sm text-gray-900">
                  {partenaire?.email || '-'}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Téléphone</p>
                <p className="text-sm text-gray-900">
                  {partenaire?.telephone || '-'}
                </p>
              </div>
            </div>
          </div>

          {/* Informations de la Banque */}
          <div className="bg-gradient-to-br from-purple-50 to-white rounded-lg p-4 border border-purple-200">
            <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-1.5">
              <div className="w-1 h-4 bg-gradient-to-b from-purple-600 to-purple-400 rounded"></div>
              Informations de la Banque
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Nom de la banque</p>
                <p className="text-sm text-gray-900 font-medium">
                  {banque?.nom || banque || '-'}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Code BIC/SWIFT</p>
                <p className="text-sm text-gray-900 font-mono">
                  {banque?.code_bic || '-'}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Adresse</p>
                <p className="text-sm text-gray-900">
                  {banque?.adresse || '-'}
                </p>
              </div>
              {banque?.pays && (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">Pays</p>
                  <p className="text-sm text-gray-900">
                    {banque.pays.nom || banque.pays.nom_fr || '-'}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Informations de l'Entité */}
          <div className="bg-gradient-to-br from-amber-50 to-white rounded-lg p-4 border border-amber-200">
            <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-1.5">
              <div className="w-1 h-4 bg-gradient-to-b from-amber-600 to-amber-400 rounded"></div>
              Informations de l'Entité
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Raison sociale</p>
                <p className="text-sm text-gray-900 font-medium">
                  {entite?.raison_sociale || entite || '-'}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Activité</p>
                <p className="text-sm text-gray-900">
                  {entite?.activite || '-'}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Adresse</p>
                <p className="text-sm text-gray-900">
                  {entite?.adresse || '-'}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Téléphone</p>
                <p className="text-sm text-gray-900">
                  {entite?.telephone || '-'}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Email</p>
                <p className="text-sm text-gray-900">
                  {entite?.email || '-'}
                </p>
              </div>
            </div>
          </div>

          {/* Informations de Création */}
          {(partnerBank.date_creation || partnerBank.date_maj) && (
            <div className="bg-gradient-to-br from-violet-50 to-white rounded-lg p-4 border border-violet-200">
              <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-1.5">
                <div className="w-1 h-4 bg-gradient-to-b from-violet-600 to-violet-400 rounded"></div>
                Informations de Création
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {partnerBank.date_creation && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1">Date de création</p>
                    <p className="text-sm text-gray-900">
                      {new Date(partnerBank.date_creation).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                )}
                {partnerBank.date_maj && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1">Dernière modification</p>
                    <p className="text-sm text-gray-900">
                      {new Date(partnerBank.date_maj).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                )}
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

// COMPOSANT MODAL POUR FORMULAIRE
function PartnerBankFormModal({ partnerBank, partenaires, banques, entites, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    partenaire: partnerBank?.partenaire?.id || partnerBank?.partenaire || '',
    banque: partnerBank?.banque?.id || partnerBank?.banque || '',
    numero_compte: partnerBank?.numero_compte || '',
    entite: partnerBank?.entite?.id || partnerBank?.entite || ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validation
    if (!formData.partenaire) {
      setError('Le partenaire est obligatoire');
      setLoading(false);
      return;
    }

    if (!formData.banque) {
      setError('La banque est obligatoire');
      setLoading(false);
      return;
    }

    if (!formData.numero_compte) {
      setError('Le numéro de compte est obligatoire');
      setLoading(false);
      return;
    }

    if (!formData.entite) {
      setError('L\'entité est obligatoire');
      setLoading(false);
      return;
    }

    try {
      const url = partnerBank 
        ? `/banques-partenaires/${partnerBank.id}/`
        : `/banques-partenaires/`;
      
      const method = partnerBank ? 'PUT' : 'POST';

      await apiClient.request(url, {
        method: method,
        body: JSON.stringify(formData),
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      onSuccess();
    } catch (err) {
      console.error('❌ Erreur sauvegarde compte:', err);
      
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

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-3 z-50 backdrop-blur-sm">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-xl">
        {/* Header du modal avec gradient */}
        <div className="sticky top-0 bg-gradient-to-r from-violet-600 to-violet-500 text-white rounded-t-lg p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-white/20 backdrop-blur-sm rounded">
                <TbBuildingBank className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold">
                  {partnerBank ? 'Modifier le compte bancaire' : 'Nouveau Compte Bancaire'}
                </h2>
                {!partnerBank && (
                  <p className="text-violet-100 text-xs mt-0.5">
                    Créez un nouveau compte bancaire pour un partenaire
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
          {/* Section 1: Informations du Compte */}
          <div className="bg-gradient-to-br from-gray-50 to-white rounded-lg p-3 border border-gray-200">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-4 bg-gradient-to-b from-violet-600 to-violet-400 rounded"></div>
              <h3 className="text-sm font-semibold text-gray-900">Informations du Compte</h3>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {/* Numéro de compte */}
              <div className="lg:col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Numéro de compte <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <FiCreditCard className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    type="text"
                    required
                    value={formData.numero_compte}
                    onChange={(e) => handleChange('numero_compte', e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent bg-white text-sm font-mono"
                    placeholder="IBAN, numéro de compte..."
                  />
                </div>
              </div>
              
              {/* Partenaire */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Partenaire <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <FiUsers className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                  <select
                    required
                    value={formData.partenaire}
                    onChange={(e) => handleChange('partenaire', e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent bg-white appearance-none text-sm"
                  >
                    <option value="">Sélectionnez un partenaire</option>
                    {partenaires.map(partenaire => (
                      <option key={partenaire.id} value={partenaire.id}>
                        {partenaire.nom} ({partenaire.type_partenaire})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              {/* Banque */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Banque <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <FiPocket className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                  <select
                    required
                    value={formData.banque}
                    onChange={(e) => handleChange('banque', e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent bg-white appearance-none text-sm"
                  >
                    <option value="">Sélectionnez une banque</option>
                    {banques.map(banque => (
                      <option key={banque.id} value={banque.id}>
                        {banque.nom} {banque.code_bic && `(${banque.code_bic})`}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              {/* Entité */}
              <div className="lg:col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Entité <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <TbBuildingBank className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                  <select
                    required
                    value={formData.entite}
                    onChange={(e) => handleChange('entite', e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent bg-white appearance-none text-sm"
                  >
                    <option value="">Sélectionnez une entité</option>
                    {entites.map(entite => (
                      <option key={entite.id} value={entite.id}>
                        {entite.raison_sociale}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Aperçu */}
          <div className="bg-gradient-to-br from-violet-50 to-white rounded-lg p-3 border border-violet-100">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-4 bg-gradient-to-b from-violet-600 to-violet-400 rounded"></div>
              <h3 className="text-sm font-semibold text-gray-900">Aperçu du compte</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Partenaire</p>
                <p className="text-sm text-gray-900 font-medium">
                  {partenaires.find(p => p.id == formData.partenaire)?.nom || 
                   <span className="text-red-500 text-xs">Sélection requis</span>}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Banque</p>
                <p className="text-sm text-gray-900">
                  {banques.find(b => b.id == formData.banque)?.nom || 
                   <span className="text-red-500 text-xs">Sélection requis</span>}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Numéro de compte</p>
                <p className="text-sm font-semibold text-violet-700 font-mono">
                  {formData.numero_compte || 
                   <span className="text-red-500 text-xs">Saisie requis</span>}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Entité</p>
                <p className="text-sm text-gray-900">
                  {entites.find(e => e.id == formData.entite)?.raison_sociale || 
                   <span className="text-red-500 text-xs">Sélection requis</span>}
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
                  <span>{partnerBank ? 'Mettre à jour' : 'Créer le compte'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}