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
  FiCheckCircle,
  FiXCircle,
  FiUserCheck,
  FiTruck,
  FiPackage,
  FiCreditCard as FiCreditCardIcon,
  FiDollarSign as FiDollarSignIcon,
  FiInfo
} from "react-icons/fi";
import { TbBuildingSkyscraper } from "react-icons/tb";

export default function PartnersPage() {
  const [partners, setPartners] = useState([]);
  const [pays, setPays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingPartner, setEditingPartner] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState(null);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');
  const [selectedRows, setSelectedRows] = useState([]);

  useEffect(() => {
    fetchPartners();
    fetchPays();
  }, []);

  const fetchPartners = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiClient.get('/partenaires/');
      
      if (Array.isArray(response)) {
        setPartners(response);
      } else if (response && Array.isArray(response.results)) {
        setPartners(response.results);
      } else {
        setError('Format de données inattendu');
        setPartners([]);
      }
    } catch (err) {
      console.error('Erreur lors du chargement des partenaires:', err);
      setError('Erreur lors du chargement des partenaires');
      setPartners([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchPays = async () => {
    try {
      const response = await apiClient.get('/pays/');
      
      if (Array.isArray(response)) {
        setPays(response);
      } else {
        setPays([]);
      }
    } catch (err) {
      console.error('Erreur chargement pays:', err);
      setPays([]);
    }
  };

  // Fonction utilitaire pour extraire le nom de la ville
  const getVilleName = (ville) => {
    if (!ville) return '';
    if (typeof ville === 'string') return ville;
    if (typeof ville === 'object') {
      return ville.nom || ville.name || ville.nom_fr || '';
    }
    return String(ville);
  };

  // Filtrage et recherche
  const filteredPartners = partners.filter(partner => {
    const villeNom = getVilleName(partner.ville).toLowerCase();
    const nom = (partner.nom || '').toLowerCase();
    const email = (partner.email || '').toLowerCase();
    
    const matchesSearch = 
      nom.includes(searchTerm.toLowerCase()) ||
      email.includes(searchTerm.toLowerCase()) ||
      villeNom.includes(searchTerm.toLowerCase());
    
    const matchesType = !filterType || partner.type_partenaire === filterType;
    
    return matchesSearch && matchesType;
  });

  // Calculs pour la pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentPartners = Array.isArray(filteredPartners) ? filteredPartners.slice(indexOfFirstItem, indexOfLastItem) : [];
  const totalPages = Math.ceil((Array.isArray(filteredPartners) ? filteredPartners.length : 0) / itemsPerPage);

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
    if (selectedRows.length === currentPartners.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(currentPartners.map(partner => partner.id));
    }
  };

  // Gestion des actions
  const handleNewPartner = () => {
    setEditingPartner(null);
    setShowForm(true);
  };

  const handleEdit = (partner) => {
    setEditingPartner(partner);
    setShowForm(true);
  };

  const handleDelete = async (partner) => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer le partenaire "${partner.nom}" ?`)) {
      try {
        await apiClient.delete(`/partenaires/${partner.id}/`);
        fetchPartners();
      } catch (err) {
        setError('Erreur lors de la suppression');
        console.error('Error deleting partner:', err);
      }
    }
  };

  const handleViewDetails = (partner) => {
    setSelectedPartner(partner);
    setShowDetailModal(true);
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingPartner(null);
    fetchPartners();
  };

  const handleRetry = () => {
    fetchPartners();
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setFilterType('');
    setCurrentPage(1);
  };

  // Types de partenaires
  const partnerTypes = [
    { value: 'client', label: 'Client', icon: FiUserCheck, color: 'from-violet-600 to-violet-500', bgColor: 'bg-violet-100', textColor: 'text-violet-700', borderColor: 'border-violet-300' },
    { value: 'fournisseur', label: 'Fournisseur', icon: FiTruck, color: 'from-violet-600 to-violet-500', bgColor: 'bg-violet-100', textColor: 'text-violet-700', borderColor: 'border-violet-300' },
    { value: 'employe', label: 'Employé', icon: FiUsers, color: 'from-violet-600 to-violet-500', bgColor: 'bg-violet-100', textColor: 'text-violet-700', borderColor: 'border-violet-300' },
    { value: 'debiteur', label: 'Débiteur', icon: FiDollarSignIcon, color: 'from-violet-600 to-violet-500', bgColor: 'bg-violet-100', textColor: 'text-violet-700', borderColor: 'border-violet-300' },
    { value: 'crediteur', label: 'Créditeur', icon: FiCreditCardIcon, color: 'from-violet-600 to-violet-500', bgColor: 'bg-violet-100', textColor: 'text-violet-700', borderColor: 'border-violet-300' },
  ];

  // Statistiques - SIMPLIFIÉES (seulement 3 cartes)
  const stats = {
    total: partners.length,
    actifs: partners.filter(p => p.statut).length,
    inactifs: partners.filter(p => !p.statut).length,
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
      {/* Header avec gradient - COMPACT */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-gradient-to-br from-violet-600 to-violet-500 rounded-lg shadow">
              <FiUsers className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Gestion des Partenaires</h1>
              <p className="text-gray-600 text-xs mt-0.5">
                Gérez tous vos partenaires commerciaux
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
              onClick={handleNewPartner}
              className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-violet-500 text-white hover:from-violet-700 hover:to-violet-600 transition-all duration-300 hover:shadow flex items-center gap-1.5 text-sm group shadow"
            >
              <FiPlus className="group-hover:rotate-90 transition-transform duration-300 text-sm" />
              <span className="font-semibold">Nouveau Partenaire</span>
            </button>
          </div>
        </div>

        {/* Statistiques en ligne - SIMPLIFIÉES (3 cartes seulement) - COMPACT */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm hover:shadow transition-shadow duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Total des partenaires</p>
                <p className="text-lg font-bold text-gray-900 mt-0.5">{stats.total}</p>
              </div>
              <div className="p-1.5 bg-violet-50 rounded">
                <FiUsers className="w-4 h-4 text-violet-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm hover:shadow transition-shadow duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Part. actifs</p>
                <p className="text-lg font-bold text-green-600 mt-0.5">{stats.actifs}</p>
              </div>
              <div className="p-1.5 bg-green-50 rounded">
                <FiCheckCircle className="w-4 h-4 text-green-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm hover:shadow transition-shadow duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Part. inactifs</p>
                <p className="text-lg font-bold text-red-600 mt-0.5">{stats.inactifs}</p>
              </div>
              <div className="p-1.5 bg-red-50 rounded">
                <FiXCircle className="w-4 h-4 text-red-600" />
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

      {/* Barre d'outils - Filtres et Recherche - COMPACT */}
      <div className="mb-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900 text-sm">Filtres et Recherche</h3>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-600">
                {filteredPartners.length} résultat(s)
              </span>
              {(searchTerm || filterType) && (
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
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Recherche</label>
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-violet-600 to-violet-500 rounded-lg blur opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
                <div className="relative">
                  <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 z-10 text-sm" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent bg-white relative z-10 text-sm"
                    placeholder="Rechercher un partenaire..."
                  />
                </div>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Type de Partenaire</label>
              <div className="relative">
                <FiFilter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm" />
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent bg-white appearance-none text-sm"
                >
                  <option value="">Tous les types</option>
                  {partnerTypes.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
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
        {/* En-tête du tableau avec actions - COMPACT */}
        <div className="px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={selectedRows.length === currentPartners.length && currentPartners.length > 0}
                  onChange={selectAllRows}
                  className="w-3.5 h-3.5 text-violet-600 rounded focus:ring-violet-500 border-gray-300"
                />
                <span className="text-xs text-gray-700">
                  {selectedRows.length} sélectionné(s)
                </span>
              </div>
              {selectedRows.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <button className="px-2 py-1 bg-violet-50 text-violet-700 rounded text-xs font-medium hover:bg-violet-100 transition-colors">
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
                className="border border-gray-300 rounded px-2 py-1 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent"
              >
                <option value={5}>5 lignes</option>
                <option value={10}>10 lignes</option>
                <option value={20}>20 lignes</option>
                <option value={50}>50 lignes</option>
              </select>
            </div>
          </div>
        </div>

        {/* Tableau SIMPLIFIÉ (5 colonnes seulement) */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr className="bg-gradient-to-r from-gray-50 to-gray-100">
                <th scope="col" className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-300">
                  <div className="flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      checked={selectedRows.length === currentPartners.length && currentPartners.length > 0}
                      onChange={selectAllRows}
                      className="w-3.5 h-3.5 text-violet-600 rounded focus:ring-violet-500 border-gray-300"
                    />
                    ID
                  </div>
                </th>
                <th scope="col" className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-300">
                  Nom / Raison Sociale
                </th>
                <th scope="col" className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-300">
                  Type
                </th>
                <th scope="col" className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-300">
                  Téléphone
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
              {currentPartners.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-3 py-6 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mb-3">
                        <FiUsers className="w-8 h-8 text-gray-400" />
                      </div>
                      <h3 className="text-base font-semibold text-gray-900 mb-1.5">
                        {partners.length === 0 ? 'Aucun partenaire trouvé' : 'Aucun résultat pour votre recherche'}
                      </h3>
                      <p className="text-gray-600 mb-4 max-w-md text-sm">
                        {partners.length === 0 
                          ? 'Commencez par créer votre premier partenaire' 
                          : 'Essayez de modifier vos critères de recherche ou de filtres'}
                      </p>
                      {partners.length === 0 && (
                        <button 
                          onClick={handleNewPartner}
                          className="px-4 py-1.5 bg-gradient-to-r from-violet-600 to-violet-500 text-white rounded-lg hover:from-violet-700 hover:to-violet-600 transition-all duration-300 font-medium flex items-center gap-1.5 text-sm"
                        >
                          <FiPlus />
                          Créer mon premier partenaire
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                currentPartners.map((partner) => {
                  const typeInfo = partnerTypes.find(t => t.value === partner.type_partenaire) || partnerTypes[0];
                  const IconComponent = typeInfo.icon || FiUser;
                  
                  return (
                    <tr 
                      key={partner.id}
                      className={`hover:bg-gradient-to-r hover:from-gray-50 hover:to-white transition-all duration-200 ${
                        selectedRows.includes(partner.id) ? 'bg-gradient-to-r from-violet-50 to-violet-25' : 'bg-white'
                      }`}
                    >
                      <td className="px-3 py-2 whitespace-nowrap border-r border-gray-200">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={selectedRows.includes(partner.id)}
                            onChange={() => toggleRowSelection(partner.id)}
                            className="w-3.5 h-3.5 text-violet-600 rounded focus:ring-violet-500 border-gray-300"
                          />
                          <span className="px-1.5 py-0.5 bg-gray-100 text-gray-800 rounded text-xs font-medium font-mono">
                            #{partner.id}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-2 border-r border-gray-200">
                        <div>
                          <div className="text-sm font-semibold text-gray-900">{partner.nom}</div>
                          <div className="text-xs text-gray-500 truncate max-w-[200px]">{partner.email || 'Aucun email'}</div>
                        </div>
                      </td>
                      <td className="px-3 py-2 border-r border-gray-200">
                        <div className="flex items-center gap-1.5">
                          <div className={`p-1 ${typeInfo.bgColor} rounded`}>
                            <IconComponent className={`w-3 h-3 ${typeInfo.textColor}`} />
                          </div>
                          <span className={`text-sm font-medium ${typeInfo.textColor}`}>
                            {typeInfo.label}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-2 border-r border-gray-200">
                        <div className="text-sm text-gray-700">
                          {partner.telephone || '-'}
                        </div>
                      </td>
                      <td className="px-3 py-2 border-r border-gray-200">
                        <div className="flex items-center">
                          <div className={`px-2 py-1 rounded flex items-center gap-1 ${
                            partner.statut
                              ? 'bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 border border-green-200' 
                              : 'bg-gradient-to-r from-red-50 to-pink-50 text-red-700 border border-red-200'
                          }`}>
                            {partner.statut ? (
                              <>
                                <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                                <span className="text-xs font-medium">Actif</span>
                              </>
                            ) : (
                              <>
                                <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
                                <span className="text-xs font-medium">Inactif</span>
                              </>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleViewDetails(partner)}
                            className="p-1.5 bg-gradient-to-r from-gray-50 to-gray-100 text-gray-700 rounded-lg hover:from-gray-100 hover:to-gray-200 transition-all duration-200 shadow-sm hover:shadow"
                            title="Voir détails"
                          >
                            <FiEye size={14} />
                          </button>
                          <button
                            onClick={() => handleEdit(partner)}
                            className="p-1.5 bg-gradient-to-r from-violet-50 to-violet-100 text-violet-700 rounded-lg hover:from-violet-100 hover:to-violet-200 transition-all duration-200 shadow-sm hover:shadow"
                            title="Modifier"
                          >
                            <FiEdit2 size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(partner)}
                            className="p-1.5 bg-gradient-to-r from-red-50 to-red-100 text-red-700 rounded-lg hover:from-red-100 hover:to-red-200 transition-all duration-200 shadow-sm hover:shadow"
                            title="Supprimer"
                          >
                            <FiTrash2 size={14} />
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

        {/* Pagination - COMPACT */}
        {filteredPartners.length > 0 && (
          <div className="px-4 py-3 border-t border-gray-200 bg-gradient-to-r from-gray-50 to-white">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-gray-700">
                    Page {currentPage} sur {totalPages}
                  </span>
                  <span className="text-gray-300">•</span>
                  <span className="text-xs text-gray-700">
                    {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredPartners.length)} sur {filteredPartners.length} partenaires
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
        <PartnerFormModal
          partner={editingPartner}
          pays={pays}
          onClose={() => {
            setShowForm(false);
            setEditingPartner(null);
          }}
          onSuccess={handleFormSuccess}
        />
      )}

      {/* Modal de détails */}
      {showDetailModal && selectedPartner && (
        <PartnerDetailModal
          partner={selectedPartner}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedPartner(null);
          }}
        />
      )}
    </div>
  );
}

// MODAL DE DÉTAILS POUR LES PARTENAIRES
function PartnerDetailModal({ partner, onClose }) {
  const partnerTypes = [
    { value: 'client', label: 'Client', icon: FiUserCheck },
    { value: 'fournisseur', label: 'Fournisseur', icon: FiTruck },
    { value: 'employe', label: 'Employé', icon: FiUsers },
    { value: 'debiteur', label: 'Débiteur', icon: FiDollarSignIcon },
    { value: 'crediteur', label: 'Créditeur', icon: FiCreditCardIcon },
  ];

  const typeInfo = partnerTypes.find(t => t.value === partner.type_partenaire) || partnerTypes[0];
  const IconComponent = typeInfo.icon || FiUser;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-3 z-50 backdrop-blur-sm">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-xl">
        {/* Header du modal */}
        <div className="sticky top-0 bg-gradient-to-r from-violet-600 to-violet-500 text-white rounded-t-lg p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-white/20 backdrop-blur-sm rounded">
                <FiUsers className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold">Détails du partenaire</h2>
                <p className="text-violet-100 text-xs mt-0.5">{partner.nom}</p>
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
          {/* Informations Générales */}
          <div className="bg-gradient-to-br from-gray-50 to-white rounded-lg p-3 border border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-1.5">
              <div className="w-1 h-4 bg-gradient-to-b from-violet-600 to-violet-400 rounded"></div>
              Informations Générales
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <p className="text-xs font-medium text-gray-500 mb-0.5">Nom / Raison Sociale</p>
                <p className="text-sm text-gray-900 font-medium">{partner.nom}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-0.5">Type de Partenaire</p>
                <div className="flex items-center gap-1.5">
                  <div className={`p-1 bg-violet-100 rounded`}>
                    <IconComponent className="w-3 h-3 text-violet-700" />
                  </div>
                  <span className="text-sm text-violet-700 font-medium">{typeInfo.label}</span>
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-0.5">Statut</p>
                <div className={`px-2 py-1 rounded inline-flex items-center gap-1 ${
                  partner.statut
                    ? 'bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 border border-green-200' 
                    : 'bg-gradient-to-r from-red-50 to-pink-50 text-red-700 border border-red-200'
                }`}>
                  {partner.statut ? (
                    <>
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                      <span className="text-xs font-medium">Actif</span>
                    </>
                  ) : (
                    <>
                      <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
                      <span className="text-xs font-medium">Inactif</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Informations Légales */}
          <div className="bg-gradient-to-br from-violet-50 to-white rounded-lg p-3 border border-violet-100">
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-1.5">
              <div className="w-1 h-4 bg-gradient-to-b from-violet-600 to-violet-400 rounded"></div>
              Informations Légales
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <p className="text-xs font-medium text-gray-500 mb-0.5">Registre de Commerce</p>
                <p className="text-sm text-gray-900">{partner.registre_commerce || '-'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-0.5">Numéro Fiscal</p>
                <p className="text-sm text-gray-900">{partner.numero_fiscal || '-'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-0.5">Sécurité Sociale</p>
                <p className="text-sm text-gray-900">{partner.securite_sociale || '-'}</p>
              </div>
            </div>
          </div>

          {/* Localisation */}
          <div className="bg-gradient-to-br from-purple-50 to-white rounded-lg p-3 border border-purple-100">
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-1.5">
              <div className="w-1 h-4 bg-gradient-to-b from-purple-600 to-purple-400 rounded"></div>
              Localisation
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="md:col-span-2">
                <p className="text-xs font-medium text-gray-500 mb-0.5">Adresse</p>
                <p className="text-sm text-gray-900">{partner.adresse || '-'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-0.5">Complément d'adresse</p>
                <p className="text-sm text-gray-900">{partner.complement_adresse || '-'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-0.5">Code Postal</p>
                <p className="text-sm text-gray-900">{partner.code_postal || '-'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-0.5">Pays</p>
                <div className="flex items-center gap-1.5">
                  <span className="text-base">{partner.pays_details?.emoji || '🌍'}</span>
                  <p className="text-sm text-gray-900">{partner.pays_details?.nom || '-'}</p>
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-0.5">Région</p>
                <p className="text-sm text-gray-900">
                  {partner.region_details?.nom || partner.region || '-'}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-0.5">Ville</p>
                <p className="text-sm text-gray-900">
                  {partner.ville_details?.nom || (typeof partner.ville === 'object' ? partner.ville.nom : partner.ville) || '-'}
                </p>
              </div>
            </div>
          </div>

          {/* Contact */}
          <div className="bg-gradient-to-br from-cyan-50 to-white rounded-lg p-3 border border-cyan-100">
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-1.5">
              <div className="w-1 h-4 bg-gradient-to-b from-cyan-600 to-cyan-400 rounded"></div>
              Contact
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <p className="text-xs font-medium text-gray-500 mb-0.5">Téléphone</p>
                <p className="text-sm text-gray-900">{partner.telephone || '-'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-0.5">Email</p>
                <p className="text-sm text-gray-900">{partner.email || '-'}</p>
              </div>
              <div className="md:col-span-2">
                <p className="text-xs font-medium text-gray-500 mb-0.5">Site Web</p>
                <p className="text-sm text-violet-600">{partner.site_web || '-'}</p>
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

// COMPOSANT MODAL POUR LES PARTENAIRES - FORMULAIRE COMPACT
function PartnerFormModal({ partner, pays, onClose, onSuccess }) {
  // États pour le formulaire
  const [formData, setFormData] = useState({
    nom: partner?.nom || '',
    type_partenaire: partner?.type_partenaire || 'client',
    registre_commerce: partner?.registre_commerce || '',
    numero_fiscal: partner?.numero_fiscal || '',
    securite_sociale: partner?.securite_sociale || '',
    adresse: partner?.adresse || '',
    complement_adresse: partner?.complement_adresse || '',
    code_postal: partner?.code_postal || '',
    ville: partner?.ville?.id || '',
    region: partner?.region?.id || '',
    pays: partner?.pays?.id || '',
    telephone: partner?.telephone || '',
    email: partner?.email || '',
    site_web: partner?.site_web || '',
    statut: partner?.statut !== undefined ? partner.statut : true,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // ÉTATS POUR LISTES DYNAMIQUES
  const [subdivisions, setSubdivisions] = useState([]);
  const [villes, setVilles] = useState([]);
  const [loadingSubdivisions, setLoadingSubdivisions] = useState(false);
  const [loadingVilles, setLoadingVilles] = useState(false);

  // ÉTATS POUR RECHERCHE DANS LES DROPDOWNS
  const [searchPays, setSearchPays] = useState('');
  const [searchSubdivision, setSearchSubdivision] = useState('');
  const [searchVille, setSearchVille] = useState('');

  const partnerTypes = [
    { value: 'client', label: 'Client', icon: FiUserCheck },
    { value: 'fournisseur', label: 'Fournisseur', icon: FiTruck },
    { value: 'employe', label: 'Employé', icon: FiUsers },
    { value: 'debiteur', label: 'Débiteur', icon: FiDollarSignIcon },
    { value: 'crediteur', label: 'Créditeur', icon: FiCreditCardIcon },
  ];

  // S'assurer que les tableaux sont toujours des tableaux
  const paysArray = Array.isArray(pays) ? pays : [];

  // Filtrer les listes avec la recherche
  const filteredPays = paysArray.filter(paysItem =>
    (paysItem.nom_fr || paysItem.nom).toLowerCase().includes(searchPays.toLowerCase()) ||
    paysItem.code_iso.toLowerCase().includes(searchPays.toLowerCase())
  );

  const filteredSubdivisions = subdivisions.filter(subdivision =>
    subdivision.nom.toLowerCase().includes(searchSubdivision.toLowerCase()) ||
    subdivision.code.toLowerCase().includes(searchSubdivision.toLowerCase())
  );

  const filteredVilles = villes.filter(ville =>
    ville.nom.toLowerCase().includes(searchVille.toLowerCase()) ||
    (ville.code_postal && ville.code_postal.includes(searchVille))
  );

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
          
          // Réinitialiser la subdivision si elle ne fait pas partie du nouveau pays
          if (formData.region) {
            const currentSubdivisionExists = subdivisionsData.some(
              sub => sub.id.toString() === formData.region.toString()
            );
            if (!currentSubdivisionExists) {
              setFormData(prev => ({ ...prev, region: '', ville: '' }));
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
        setFormData(prev => ({ ...prev, region: '', ville: '' }));
      }
    };

    fetchSubdivisions();
  }, [formData.pays, formData.region]);

  // CHARGEMENT DYNAMIQUE DES VILLES
  useEffect(() => {
    const fetchVilles = async () => {
      if (formData.region) {
        setLoadingVilles(true);
        try {
          const response = await apiClient.get(`/villes/?subdivision=${formData.region}`);
          
          let villesData = [];
          if (Array.isArray(response)) {
            villesData = response;
          } else if (response && Array.isArray(response.results)) {
            villesData = response.results;
          }
          
          setVilles(villesData);
          
          // Réinitialiser la ville si elle ne fait pas partie de la nouvelle subdivision
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
  }, [formData.region, formData.ville]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validation
    if (!formData.nom) {
      setError('Le nom est obligatoire');
      setLoading(false);
      return;
    }

    if (!formData.pays) {
      setError('Le pays est obligatoire');
      setLoading(false);
      return;
    }

    if (!formData.region) {
      setError('La région (état/province) est obligatoire');
      setLoading(false);
      return;
    }

    if (!formData.ville) {
      setError('La ville est obligatoire');
      setLoading(false);
      return;
    }

    if (!formData.telephone) {
      setError('Le téléphone est obligatoire');
      setLoading(false);
      return;
    }

    try {
      const url = partner 
        ? `/partenaires/${partner.id}/`
        : `/partenaires/`;
      
      const method = partner ? 'PUT' : 'POST';

      // Préparer les données finales
      const submitData = {
        ...formData,
      };

      await apiClient.request(url, {
        method: method,
        body: JSON.stringify(submitData),
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

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-3 z-50 backdrop-blur-sm">
      <div className="bg-white rounded-lg w-full max-w-5xl max-h-[90vh] overflow-y-auto shadow-xl">
        {/* Header du modal avec gradient - COMPACT */}
        <div className="sticky top-0 bg-gradient-to-r from-violet-600 to-violet-500 text-white rounded-t-lg p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-white/20 backdrop-blur-sm rounded">
                <FiUsers className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold">
                  {partner ? 'Modifier le partenaire' : 'Nouveau Partenaire'}
                </h2>
                {!partner && (
                  <p className="text-violet-100 text-xs mt-0.5">
                    Créez un nouveau partenaire dans le système
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
          {/* Section 1: Informations Générales - COMPACT */}
          <div className="bg-gradient-to-br from-gray-50 to-white rounded-lg p-3 border border-gray-200">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-4 bg-gradient-to-b from-violet-600 to-violet-400 rounded"></div>
              <h3 className="text-sm font-semibold text-gray-900">Informations Générales</h3>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <div className="lg:col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Nom / Raison Sociale <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.nom}
                  onChange={(e) => handleChange('nom', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent bg-white text-sm"
                  placeholder="Nom complet ou raison sociale"
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Type de Partenaire <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={formData.type_partenaire}
                  onChange={(e) => handleChange('type_partenaire', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent text-sm"
                >
                  {partnerTypes.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Statut</label>
                <select
                  value={formData.statut}
                  onChange={(e) => handleChange('statut', e.target.value === 'true')}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent text-sm"
                >
                  <option value={true}>Actif</option>
                  <option value={false}>Inactif</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Informations Légales - COMPACT */}
          <div className="bg-gradient-to-br from-violet-50 to-white rounded-lg p-3 border border-violet-100">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-4 bg-gradient-to-b from-violet-600 to-violet-400 rounded"></div>
              <h3 className="text-sm font-semibold text-gray-900">Informations Légales</h3>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Registre de Commerce</label>
                <input
                  type="text"
                  value={formData.registre_commerce}
                  onChange={(e) => handleChange('registre_commerce', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent text-sm"
                  placeholder="Numéro RC"
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Numéro Fiscal</label>
                <input
                  type="text"
                  value={formData.numero_fiscal}
                  onChange={(e) => handleChange('numero_fiscal', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent text-sm"
                  placeholder="Numéro d'identification fiscale"
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Sécurité Sociale</label>
                <input
                  type="text"
                  value={formData.securite_sociale}
                  onChange={(e) => handleChange('securite_sociale', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent text-sm"
                  placeholder="Numéro de sécurité sociale"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Localisation - COMPACT */}
          <div className="bg-gradient-to-br from-purple-50 to-white rounded-lg p-3 border border-purple-100">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-4 bg-gradient-to-b from-purple-600 to-purple-400 rounded"></div>
              <h3 className="text-sm font-semibold text-gray-900">Localisation</h3>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <div className="lg:col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Adresse complète <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  value={formData.adresse}
                  onChange={(e) => handleChange('adresse', e.target.value)}
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent text-sm"
                  placeholder="Adresse complète"
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Complément d'adresse</label>
                <input
                  type="text"
                  value={formData.complement_adresse}
                  onChange={(e) => handleChange('complement_adresse', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent text-sm"
                  placeholder="Bâtiment, étage, etc."
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Code Postal</label>
                <input
                  type="text"
                  value={formData.code_postal}
                  onChange={(e) => handleChange('code_postal', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent text-sm"
                  placeholder="Code postal"
                />
              </div>

              {/* Pays avec recherche */}
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
                  getOptionLabel={(paysItem) => `${paysItem.emoji} ${paysItem.nom_fr || paysItem.nom} (${paysItem.code_iso})`}
                  getOptionValue={(paysItem) => paysItem.id}
                />
              </div>

              {/* Subdivision avec recherche */}
              <div>
                <SearchableDropdown
                  label="État/Province/Région"
                  value={formData.region}
                  onChange={(value) => handleChange('region', value)}
                  options={subdivisions}
                  searchValue={searchSubdivision}
                  onSearchChange={setSearchSubdivision}
                  placeholder="Sélectionnez une subdivision"
                  required={true}
                  disabled={!formData.pays || loadingSubdivisions}
                  icon={FiMapPin}
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
                  <p className="text-xs text-violet-500 mt-1 flex items-center gap-1">
                    <FiRefreshCw className="animate-spin" size={10} />
                    Chargement des subdivisions...
                  </p>
                )}
              </div>

              {/* Ville avec recherche */}
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
                  disabled={!formData.region || loadingVilles}
                  icon={FiMapPin}
                  getOptionLabel={(ville) => `${ville.nom} ${ville.code_postal ? `(${ville.code_postal})` : ''}`}
                  getOptionValue={(ville) => ville.id}
                />
                {!formData.region && (
                  <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                    <FiMapPin size={10} />
                    Veuillez d'abord sélectionner une subdivision
                  </p>
                )}
                {loadingVilles && (
                  <p className="text-xs text-violet-500 mt-1 flex items-center gap-1">
                    <FiRefreshCw className="animate-spin" size={10} />
                    Chargement des villes...
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Section 4: Contact - COMPACT */}
          <div className="bg-gradient-to-br from-cyan-50 to-white rounded-lg p-3 border border-cyan-100">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-4 bg-gradient-to-b from-cyan-600 to-cyan-400 rounded"></div>
              <h3 className="text-sm font-semibold text-gray-900">Contact</h3>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Téléphone <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <FiPhone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    type="tel"
                    required
                    value={formData.telephone}
                    onChange={(e) => handleChange('telephone', e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent text-sm"
                    placeholder="+228 XX XXX XXX"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
                <div className="relative">
                  <FiMail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent text-sm"
                    placeholder="contact@entreprise.tg"
                  />
                </div>
              </div>
              
              <div className="lg:col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">Site Web</label>
                <input
                  type="url"
                  value={formData.site_web}
                  onChange={(e) => handleChange('site_web', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent text-sm"
                  placeholder="https://www.example.com"
                />
              </div>
            </div>
          </div>
          
          {/* Boutons d'action - COMPACT */}
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
                  <span>{partner ? 'Mettre à jour' : 'Créer le partenaire'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}