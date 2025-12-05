import React, { useState, useEffect } from 'react';
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
  FiPocket
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

  useEffect(() => {
    fetchPartnerBanks();
    fetchPartenaires();
    fetchBanques();
    fetchEntites();
  }, []);

  const fetchPartnerBanks = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.get('/banques-partenaires/');
      
      let partnerBanksData = [];
      if (Array.isArray(response)) {
        partnerBanksData = response;
      } else if (response && Array.isArray(response.results)) {
        partnerBanksData = response.results;
      } else {
        setError('Format de données inattendu');
        partnerBanksData = [];
      }

      setPartnerBanks(partnerBanksData);
    } catch (err) {
      console.error('❌ Erreur lors du chargement des banques partenaires:', err);
      setError('Erreur lors du chargement des banques partenaires');
    } finally {
      setLoading(false);
    }
  };

  const fetchPartenaires = async () => {
    try {
      const response = await apiClient.get('/partenaires/');
      
      let partenairesData = [];
      if (Array.isArray(response)) {
        partenairesData = response;
      } else if (response && Array.isArray(response.results)) {
        partenairesData = response.results;
      } else {
        partenairesData = [];
      }

      setPartenaires(partenairesData);
    } catch (err) {
      console.error('Error fetching partenaires:', err);
      setPartenaires([]);
    }
  };

  const fetchBanques = async () => {
    try {
      const response = await apiClient.get('/banques/');
      
      let banquesData = [];
      if (Array.isArray(response)) {
        banquesData = response;
      } else if (response && Array.isArray(response.results)) {
        banquesData = response.results;
      } else {
        banquesData = [];
      }

      setBanques(banquesData);
    } catch (err) {
      console.error('Error fetching banques:', err);
      setBanques([]);
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
  const filteredPartnerBanks = partnerBanks.filter(partnerBank => {
    const matchesSearch = 
      partnerBank.numero_compte?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (partnerBank.partenaire_details?.nom || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (partnerBank.banque_details?.nom || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesPartenaire = filterPartenaire === '' || 
      (partnerBank.partenaire && partnerBank.partenaire.toString() === filterPartenaire);
    
    const matchesBanque = filterBanque === '' || 
      (partnerBank.banque && partnerBank.banque.toString() === filterBanque);
    
    return matchesSearch && matchesPartenaire && matchesBanque;
  });

  // Calculs pour la pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentPartnerBanks = Array.isArray(filteredPartnerBanks) ? filteredPartnerBanks.slice(indexOfFirstItem, indexOfLastItem) : [];
  const totalPages = Math.ceil((Array.isArray(filteredPartnerBanks) ? filteredPartnerBanks.length : 0) / itemsPerPage);

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
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer le compte "${partnerBank.numero_compte}" ?`)) {
      try {
        await apiClient.delete(`/banques-partenaires/${partnerBank.id}/`);
        fetchPartnerBanks();
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
    fetchPartnerBanks();
  };

  const handleRetry = () => {
    fetchPartnerBanks();
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setFilterPartenaire('');
    setFilterBanque('');
    setCurrentPage(1);
  };

  if (loading) {
    return (
      <div className="p-4 bg-gradient-to-br from-gray-50 to-white min-h-screen">
        <div className="flex flex-col items-center justify-center h-96">
          <div className="relative">
            <div className="w-12 h-12 border-3 border-gray-200 rounded-full"></div>
            <div className="absolute top-0 left-0 w-12 h-12 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
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
            <div className="p-2 bg-gradient-to-br from-blue-600 to-blue-500 rounded-lg shadow">
              <TbBuildingBank className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Comptes Bancaires Partenaires</h1>
              <p className="text-gray-600 text-xs mt-0.5">
                Gérez les comptes bancaires de vos partenaires
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
              onClick={handleNewPartnerBank}
              className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-blue-500 text-white hover:from-blue-700 hover:to-blue-600 transition-all duration-300 hover:shadow flex items-center gap-1.5 text-sm group shadow"
            >
              <FiPlus className="group-hover:rotate-90 transition-transform duration-300 text-sm" />
              <span className="font-semibold">Nouveau Compte</span>
            </button>
          </div>
        </div>

        {/* Statistiques en ligne */}
        <div className="grid grid-cols-4 gap-3 mb-4">
          <div className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm hover:shadow transition-shadow duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Total des comptes</p>
                <p className="text-lg font-bold text-gray-900 mt-0.5">{partnerBanks.length}</p>
              </div>
              <div className="p-1.5 bg-blue-50 rounded">
                <FiCreditCard className="w-4 h-4 text-blue-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm hover:shadow transition-shadow duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Partenaires uniques</p>
                <p className="text-lg font-bold text-green-600 mt-0.5">
                  {new Set(partnerBanks.map(pb => pb.partenaire).filter(id => id)).size}
                </p>
              </div>
              <div className="p-1.5 bg-green-50 rounded">
                <FiUsers className="w-4 h-4 text-green-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm hover:shadow transition-shadow duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Banques uniques</p>
                <p className="text-lg font-bold text-purple-600 mt-0.5">
                  {new Set(partnerBanks.map(pb => pb.banque).filter(id => id)).size}
                </p>
              </div>
              <div className="p-1.5 bg-purple-50 rounded">
                <FiPocket className="w-4 h-4 text-purple-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm hover:shadow transition-shadow duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Entités concernées</p>
                <p className="text-lg font-bold text-orange-600 mt-0.5">
                  {new Set(partnerBanks.map(pb => pb.entite).filter(id => id)).size}
                </p>
              </div>
              <div className="p-1.5 bg-orange-50 rounded">
                <TbBuildingBank className="w-4 h-4 text-orange-600" />
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
                  <FiX className="w-4 h-4 text-red-600" />
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
            <h3 className="font-semibold text-gray-900 text-sm">Filtres et Recherche</h3>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-600">
                {filteredPartnerBanks.length} résultat(s)
              </span>
              {(searchTerm || filterBanque || filterPartenaire) && (
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
          
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Recherche</label>
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-blue-500 rounded-lg blur opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
                <div className="relative">
                  <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 z-10 text-sm" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent bg-white relative z-10 text-sm"
                    placeholder="Rechercher un compte..."
                  />
                </div>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Partenaire</label>
              <div className="relative">
                <FiUsers className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm" />
                <select
                  value={filterPartenaire}
                  onChange={(e) => setFilterPartenaire(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent bg-white appearance-none text-sm"
                >
                  <option value="">Tous les partenaires</option>
                  {partenaires.map(partenaire => (
                    <option key={partenaire.id} value={partenaire.id}>
                      {partenaire.nom} ({partenaire.type_partenaire})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Banque</label>
              <div className="relative">
                <FiPocket className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm" />
                <select
                  value={filterBanque}
                  onChange={(e) => setFilterBanque(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent bg-white appearance-none text-sm"
                >
                  <option value="">Toutes les banques</option>
                  {banques.map(banque => (
                    <option key={banque.id} value={banque.id}>
                      {banque.nom} {banque.code_bic && `(${banque.code_bic})`}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex items-end">
              <button
                onClick={handleResetFilters}
                className="w-full px-3 py-2 bg-gradient-to-r from-gray-100 to-gray-50 text-gray-700 rounded-lg hover:from-gray-200 hover:to-gray-100 transition-all duration-300 border border-gray-300 font-medium flex items-center justify-center gap-1.5 text-sm"
              >
                <FiX className="group-hover:rotate-90 transition-transform duration-300" />
                Réinitialiser tout
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
                  checked={selectedRows.length === currentPartnerBanks.length && currentPartnerBanks.length > 0}
                  onChange={selectAllRows}
                  className="w-3.5 h-3.5 text-blue-600 rounded focus:ring-blue-500 border-gray-300"
                />
                <span className="text-xs text-gray-700">
                  {selectedRows.length} sélectionné(s)
                </span>
              </div>
              {selectedRows.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <button className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-medium hover:bg-blue-100 transition-colors">
                    <FiDownload size={12} />
                  </button>
                  <button className="px-2 py-1 bg-red-50 text-red-700 rounded text-xs font-medium hover:bg-red-100 transition-colors">
                    <FiTrash2 size={12} />
                  </button>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button className="p-1.5 hover:bg-gray-100 rounded transition-colors text-gray-600">
                <FiDownload size={16} />
              </button>
              <button className="p-1.5 hover:bg-gray-100 rounded transition-colors text-gray-600">
                <FiUpload size={16} />
              </button>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="border border-gray-300 rounded px-2 py-1 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent"
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
                  <div className="flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      checked={selectedRows.length === currentPartnerBanks.length && currentPartnerBanks.length > 0}
                      onChange={selectAllRows}
                      className="w-3.5 h-3.5 text-blue-600 rounded focus:ring-blue-500 border-gray-300"
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
                  Numéro de Compte
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
                  <td colSpan="6" className="px-3 py-6 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mb-3">
                        <TbBuildingBank className="w-8 h-8 text-gray-400" />
                      </div>
                      <h3 className="text-base font-semibold text-gray-900 mb-1.5">
                        {partnerBanks.length === 0 ? 'Aucun compte trouvé' : 'Aucun résultat pour votre recherche'}
                      </h3>
                      <p className="text-gray-600 mb-4 max-w-md text-sm">
                        {partnerBanks.length === 0 
                          ? 'Commencez par créer votre premier compte bancaire partenaire' 
                          : 'Essayez de modifier vos critères de recherche ou de filtres'}
                      </p>
                      {partnerBanks.length === 0 && (
                        <button 
                          onClick={handleNewPartnerBank}
                          className="px-4 py-1.5 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-lg hover:from-blue-700 hover:to-blue-600 transition-all duration-300 font-medium flex items-center gap-1.5 text-sm"
                        >
                          <FiPlus />
                          Créer mon premier compte
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
                      selectedRows.includes(partnerBank.id) ? 'bg-gradient-to-r from-blue-50 to-blue-25' : 'bg-white'
                    }`}
                  >
                    <td className="px-3 py-2 whitespace-nowrap border-r border-gray-200">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selectedRows.includes(partnerBank.id)}
                          onChange={() => toggleRowSelection(partnerBank.id)}
                          className="w-3.5 h-3.5 text-blue-600 rounded focus:ring-blue-500 border-gray-300"
                        />
                        <span className="px-1.5 py-0.5 bg-gray-100 text-gray-800 rounded text-xs font-medium font-mono">
                          #{partnerBank.id}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2 border-r border-gray-200">
                      <div>
                        <div className="text-sm font-semibold text-gray-900">
                          {partnerBank.partenaire_details?.nom || partnerBank.partenaire || '-'}
                        </div>
                        <div className="text-xs text-gray-500 capitalize">
                          {partnerBank.partenaire_details?.type_partenaire || ''}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2 border-r border-gray-200">
                      {partnerBank.banque_details || partnerBank.banque ? (
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {partnerBank.banque_details?.nom || partnerBank.banque?.nom || '-'}
                          </div>
                          {partnerBank.banque_details?.code_bic && (
                            <div className="text-xs text-gray-500 font-mono">
                              {partnerBank.banque_details.code_bic}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-3 py-2 border-r border-gray-200">
                      <span className="font-mono text-sm bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 px-2 py-1 rounded border border-blue-200">
                        {partnerBank.numero_compte}
                      </span>
                    </td>
                    <td className="px-3 py-2 border-r border-gray-200">
                      <div className="text-sm text-gray-900 truncate max-w-[200px]" 
                           title={partnerBank.entite_details?.raison_sociale}>
                        {partnerBank.entite_details?.raison_sociale || partnerBank.entite?.raison_sociale || '-'}
                      </div>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleViewDetails(partnerBank)}
                          className="p-1.5 bg-gradient-to-r from-gray-50 to-gray-100 text-gray-700 rounded-lg hover:from-gray-100 hover:to-gray-200 transition-all duration-200 shadow-sm hover:shadow"
                          title="Voir détails"
                        >
                          <FiEye size={14} />
                        </button>
                        <button
                          onClick={() => handleEdit(partnerBank)}
                          className="p-1.5 bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 rounded-lg hover:from-blue-100 hover:to-blue-200 transition-all duration-200 shadow-sm hover:shadow"
                          title="Modifier"
                        >
                          <FiEdit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(partnerBank)}
                          className="p-1.5 bg-gradient-to-r from-red-50 to-red-100 text-red-700 rounded-lg hover:from-red-100 hover:to-red-200 transition-all duration-200 shadow-sm hover:shadow"
                          title="Supprimer"
                        >
                          <FiTrash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {filteredPartnerBanks.length > 0 && (
          <div className="px-4 py-3 border-t border-gray-200 bg-gradient-to-r from-gray-50 to-white">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-gray-700">
                    Page {currentPage} sur {totalPages}
                  </span>
                  <span className="text-gray-300">•</span>
                  <span className="text-xs text-gray-700">
                    {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredPartnerBanks.length)} sur {filteredPartnerBanks.length} comptes
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
                            ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white border-blue-600 shadow'
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

      {/* Formulaire Modal */}
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

      {/* Modal de détails */}
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

// Modal de détails des comptes bancaires partenaires
function PartnerBankDetailModal({ partnerBank, onClose }) {
  // Utiliser directement les *_details du serializer
  const partenaire = partnerBank.partenaire_details || partnerBank.partenaire;
  const banque = partnerBank.banque_details || partnerBank.banque;
  const entite = partnerBank.entite_details || partnerBank.entite;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-3 z-50 backdrop-blur-sm">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-xl">
        {/* Header du modal */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-t-lg p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-white/20 backdrop-blur-sm rounded">
                <TbBuildingBank className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold">Détails du Compte Bancaire</h2>
                <p className="text-blue-100 text-xs mt-0.5">{partnerBank.numero_compte}</p>
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
          {/* Informations du Compte */}
          <div className="bg-gradient-to-br from-gray-50 to-white rounded-lg p-3 border border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-1.5">
              <div className="w-1 h-4 bg-gradient-to-b from-blue-600 to-blue-400 rounded"></div>
              Informations du Compte
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <p className="text-xs font-medium text-gray-500 mb-0.5">Numéro de compte</p>
                <p className="text-sm font-semibold text-blue-700 font-mono bg-blue-50 px-2 py-1 rounded border border-blue-200 inline-block">
                  {partnerBank.numero_compte || '-'}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-0.5">ID</p>
                <p className="text-sm text-gray-900 font-medium">
                  <span className="bg-gray-100 px-2 py-0.5 rounded font-mono">#{partnerBank.id}</span>
                </p>
              </div>
            </div>
          </div>

          {/* Informations du Partenaire */}
          <div className="bg-gradient-to-br from-green-50 to-white rounded-lg p-3 border border-green-100">
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-1.5">
              <div className="w-1 h-4 bg-gradient-to-b from-green-600 to-green-400 rounded"></div>
              Informations du Partenaire
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <p className="text-xs font-medium text-gray-500 mb-0.5">Nom du partenaire</p>
                <p className="text-sm text-gray-900 font-medium">
                  {partenaire?.nom || partenaire || '-'}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-0.5">Type de partenaire</p>
                <div className="px-2 py-1 rounded inline-flex items-center gap-1 bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 border border-green-200">
                  <span className="text-xs font-medium capitalize">
                    {partenaire?.type_partenaire || '-'}
                  </span>
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-0.5">Email</p>
                <p className="text-sm text-gray-900">
                  {partenaire?.email || '-'}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-0.5">Téléphone</p>
                <p className="text-sm text-gray-900">
                  {partenaire?.telephone || '-'}
                </p>
              </div>
            </div>
          </div>

          {/* Informations de la Banque */}
          <div className="bg-gradient-to-br from-purple-50 to-white rounded-lg p-3 border border-purple-100">
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-1.5">
              <div className="w-1 h-4 bg-gradient-to-b from-purple-600 to-purple-400 rounded"></div>
              Informations de la Banque
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <p className="text-xs font-medium text-gray-500 mb-0.5">Nom de la banque</p>
                <p className="text-sm text-gray-900 font-medium">
                  {banque?.nom || banque || '-'}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-0.5">Code BIC/SWIFT</p>
                <p className="text-sm text-gray-900 font-mono">
                  {banque?.code_bic || '-'}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-0.5">Adresse</p>
                <p className="text-sm text-gray-900">
                  {banque?.adresse || '-'}
                </p>
              </div>
              {banque?.pays && (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-0.5">Pays</p>
                  <p className="text-sm text-gray-900">
                    {banque.pays.nom || banque.pays.nom_fr || '-'}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Informations de l'Entité */}
          <div className="bg-gradient-to-br from-orange-50 to-white rounded-lg p-3 border border-orange-100">
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-1.5">
              <div className="w-1 h-4 bg-gradient-to-b from-orange-600 to-orange-400 rounded"></div>
              Informations de l'Entité
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <p className="text-xs font-medium text-gray-500 mb-0.5">Raison sociale</p>
                <p className="text-sm text-gray-900 font-medium">
                  {entite?.raison_sociale || entite || '-'}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-0.5">Activité</p>
                <p className="text-sm text-gray-900">
                  {entite?.activite || '-'}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-0.5">Adresse</p>
                <p className="text-sm text-gray-900">
                  {entite?.adresse || '-'}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-0.5">Téléphone</p>
                <p className="text-sm text-gray-900">
                  {entite?.telephone || '-'}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-0.5">Email</p>
                <p className="text-sm text-gray-900">
                  {entite?.email || '-'}
                </p>
              </div>
            </div>
          </div>

          {/* Informations de Création */}
          {(partnerBank.date_creation || partnerBank.date_maj) && (
            <div className="bg-gradient-to-br from-blue-50 to-white rounded-lg p-3 border border-blue-100">
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-1.5">
                <div className="w-1 h-4 bg-gradient-to-b from-blue-600 to-blue-400 rounded"></div>
                Informations de Création
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {partnerBank.date_creation && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-0.5">Date de création</p>
                    <p className="text-sm text-gray-900">
                      {new Date(partnerBank.date_creation).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                )}
                {partnerBank.date_maj && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-0.5">Dernière modification</p>
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

// Composant Modal pour le formulaire des banques partenaires
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
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-xl">
        {/* Header du modal avec gradient */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-t-lg p-3">
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
                  <p className="text-blue-100 text-xs mt-0.5">
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
              <span className="text-red-800 text-xs font-medium">{error}</span>
            </div>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Informations du compte */}
          <div className="bg-gradient-to-br from-gray-50 to-white rounded-lg p-3 border border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-1.5">
              <div className="w-1 h-4 bg-gradient-to-b from-blue-600 to-blue-400 rounded"></div>
              Informations du Compte
            </h3>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {/* Numéro de compte */}
              <div className="lg:col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Numéro de compte *
                </label>
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-blue-500 rounded-lg blur opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
                  <div className="relative">
                    <FiCreditCard className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 z-10" size={16} />
                    <input
                      type="text"
                      required
                      value={formData.numero_compte}
                      onChange={(e) => handleChange('numero_compte', e.target.value)}
                      className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent bg-white relative z-10 text-sm font-mono"
                      placeholder="IBAN, numéro de compte..."
                    />
                  </div>
                </div>
              </div>
              
              {/* Partenaire */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Partenaire *
                </label>
                <div className="relative">
                  <FiUsers className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                  <select
                    required
                    value={formData.partenaire}
                    onChange={(e) => handleChange('partenaire', e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent bg-white appearance-none text-sm"
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
                  Banque *
                </label>
                <div className="relative">
                  <FiPocket className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                  <select
                    required
                    value={formData.banque}
                    onChange={(e) => handleChange('banque', e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent bg-white appearance-none text-sm"
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
                  Entité *
                </label>
                <div className="relative">
                  <TbBuildingBank className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                  <select
                    required
                    value={formData.entite}
                    onChange={(e) => handleChange('entite', e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent bg-white appearance-none text-sm"
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

          {/* Aperçu */}
          <div className="bg-gradient-to-br from-blue-50 to-white rounded-lg p-3 border border-blue-100">
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-1.5">
              <div className="w-1 h-4 bg-gradient-to-b from-blue-600 to-blue-400 rounded"></div>
              Aperçu du compte
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <p className="text-xs font-medium text-gray-500 mb-0.5">Partenaire</p>
                <p className="text-sm text-gray-900 font-medium">
                  {partenaires.find(p => p.id == formData.partenaire)?.nom || 
                   <span className="text-red-500">Sélection requis</span>}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-0.5">Banque</p>
                <p className="text-sm text-gray-900">
                  {banques.find(b => b.id == formData.banque)?.nom || 
                   <span className="text-red-500">Sélection requis</span>}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-0.5">Numéro de compte</p>
                <p className="text-sm font-semibold text-blue-700 font-mono">
                  {formData.numero_compte || 
                   <span className="text-red-500">Saisie requis</span>}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-0.5">Entité</p>
                <p className="text-sm text-gray-900">
                  {entites.find(e => e.id == formData.entite)?.raison_sociale || 
                   <span className="text-red-500">Sélection requis</span>}
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
              className="px-4 py-1.5 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-lg hover:from-blue-700 hover:to-blue-600 disabled:opacity-50 transition-all duration-200 font-medium flex items-center space-x-1.5 shadow hover:shadow-md text-sm"
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