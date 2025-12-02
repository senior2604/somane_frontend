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
  FiDollarSign as FiDollarSignIcon
} from "react-icons/fi";
import { TbBuildingSkyscraper } from "react-icons/tb";

export default function PartnersPage() {
  const [partners, setPartners] = useState([]);
  const [pays, setPays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingPartner, setEditingPartner] = useState(null);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');
  const [selectedRows, setSelectedRows] = useState([]);
  const [expandedRow, setExpandedRow] = useState(null);

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

  // Gestion des lignes expansibles
  const toggleExpandRow = (id) => {
    setExpandedRow(expandedRow === id ? null : id);
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
      <div className="p-6 bg-gradient-to-br from-gray-50 to-white min-h-screen">
        <div className="flex flex-col items-center justify-center h-96">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-gray-200 rounded-full"></div>
            <div className="absolute top-0 left-0 w-16 h-16 border-4 border-violet-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <div className="mt-6">
            <div className="h-2 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded-full w-48 animate-pulse"></div>
            <div className="h-2 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded-full w-32 mt-3 animate-pulse mx-auto"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gradient-to-br from-gray-50 to-white min-h-screen">
      {/* Header avec gradient - COULEUR VIOLETTE */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-violet-600 to-violet-500 rounded-xl shadow-lg">
              <FiUsers className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Gestion des Partenaires</h1>
              <p className="text-gray-600 text-sm mt-1">
                Gérez tous vos partenaires commerciaux
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={handleRetry}
              className="px-4 py-2.5 rounded-xl border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-all duration-300 hover:shadow-md flex items-center gap-2 group"
            >
              <FiRefreshCw className="group-hover:rotate-180 transition-transform duration-500" />
              <span className="font-medium">Actualiser</span>
            </button>
            <button 
              onClick={handleNewPartner}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-violet-500 text-white hover:from-violet-700 hover:to-violet-600 transition-all duration-300 hover:shadow-lg flex items-center gap-2 group shadow-md"
            >
              <FiPlus className="group-hover:rotate-90 transition-transform duration-300" />
              <span className="font-semibold">Nouveau Partenaire</span>
            </button>
          </div>
        </div>

        {/* Statistiques en ligne - SIMPLIFIÉES (3 cartes seulement) - COULEUR VIOLETTE */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total des partenaires</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
              </div>
              <div className="p-2 bg-violet-50 rounded-lg">
                <FiUsers className="w-5 h-5 text-violet-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Part. actifs</p>
                <p className="text-2xl font-bold text-green-600 mt-1">{stats.actifs}</p>
              </div>
              <div className="p-2 bg-green-50 rounded-lg">
                <FiCheckCircle className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Part. inactifs</p>
                <p className="text-2xl font-bold text-red-600 mt-1">{stats.inactifs}</p>
              </div>
              <div className="p-2 bg-red-50 rounded-lg">
                <FiXCircle className="w-5 h-5 text-red-600" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Message d'erreur */}
      {error && (
        <div className="mb-6">
          <div className="bg-gradient-to-r from-red-50 to-red-100 border-l-4 border-red-500 rounded-r-xl p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <FiX className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="font-medium text-red-900">{error}</p>
                  <p className="text-sm text-red-700 mt-1">Veuillez réessayer</p>
                </div>
              </div>
              <button
                onClick={handleRetry}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium shadow-sm"
              >
                Réessayer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Barre d'outils - Filtres et Recherche - COULEUR VIOLETTE */}
      <div className="mb-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Filtres et Recherche</h3>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">
                {filteredPartners.length} résultat(s)
              </span>
              {(searchTerm || filterType) && (
                <button
                  onClick={handleResetFilters}
                  className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium flex items-center gap-1"
                >
                  <FiX size={14} />
                  Effacer
                </button>
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Recherche</label>
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-violet-600 to-violet-500 rounded-xl blur opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
                <div className="relative">
                  <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 z-10" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-white relative z-10"
                    placeholder="Rechercher un partenaire..."
                  />
                </div>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Type de Partenaire</label>
              <div className="relative">
                <FiFilter className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-white appearance-none"
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
                className="w-full px-4 py-3 bg-gradient-to-r from-gray-100 to-gray-50 text-gray-700 rounded-xl hover:from-gray-200 hover:to-gray-100 transition-all duration-300 border border-gray-300 font-medium flex items-center justify-center gap-2 group"
              >
                <FiX className="group-hover:rotate-90 transition-transform duration-300" />
                Réinitialiser tout
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tableau Principal */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        {/* En-tête du tableau avec actions - COULEUR VIOLETTE */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedRows.length === currentPartners.length && currentPartners.length > 0}
                  onChange={selectAllRows}
                  className="w-4 h-4 text-violet-600 rounded focus:ring-violet-500 border-gray-300"
                />
                <span className="text-sm text-gray-700">
                  {selectedRows.length} sélectionné(s)
                </span>
              </div>
              {selectedRows.length > 0 && (
                <div className="flex items-center gap-2">
                  <button className="px-3 py-1.5 bg-violet-50 text-violet-700 rounded-lg text-sm font-medium hover:bg-violet-100 transition-colors">
                    <FiDownload size={14} />
                  </button>
                  <button className="px-3 py-1.5 bg-red-50 text-red-700 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors">
                    <FiTrash2 size={14} />
                  </button>
                </div>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600">
                <FiDownload size={18} />
              </button>
              <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600">
                <FiUpload size={18} />
              </button>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
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
                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-300">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedRows.length === currentPartners.length && currentPartners.length > 0}
                      onChange={selectAllRows}
                      className="w-4 h-4 text-violet-600 rounded focus:ring-violet-500 border-gray-300"
                    />
                    ID
                  </div>
                </th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-300">
                  Nom / Raison Sociale
                </th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-300">
                  Type
                </th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-300">
                  Téléphone
                </th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-300">
                  Email
                </th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-300">
                  Pays
                </th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-300">
                  Statut
                </th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {currentPartners.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mb-4">
                        <FiUsers className="w-10 h-10 text-gray-400" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        {partners.length === 0 ? 'Aucun partenaire trouvé' : 'Aucun résultat pour votre recherche'}
                      </h3>
                      <p className="text-gray-600 mb-6 max-w-md">
                        {partners.length === 0 
                          ? 'Commencez par créer votre premier partenaire' 
                          : 'Essayez de modifier vos critères de recherche ou de filtres'}
                      </p>
                      {partners.length === 0 && (
                        <button 
                          onClick={handleNewPartner}
                          className="px-5 py-2.5 bg-gradient-to-r from-violet-600 to-violet-500 text-white rounded-xl hover:from-violet-700 hover:to-violet-600 transition-all duration-300 font-medium flex items-center gap-2"
                        >
                          <FiPlus />
                          Créer mon premier partenaire
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                currentPartners.map((partner, index) => {
                  const typeInfo = partnerTypes.find(t => t.value === partner.type_partenaire) || partnerTypes[0];
                  const IconComponent = typeInfo.icon || FiUser;
                  
                  return (
                    <React.Fragment key={partner.id}>
                      <tr 
                        className={`hover:bg-gradient-to-r hover:from-gray-50 hover:to-white transition-all duration-200 ${
                          selectedRows.includes(partner.id) ? 'bg-gradient-to-r from-violet-50 to-violet-25' : 'bg-white'
                        } ${expandedRow === partner.id ? 'bg-gradient-to-r from-violet-50 to-violet-25' : ''}`}
                      >
                        <td className="px-6 py-4 whitespace-nowrap border-r border-gray-200">
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={selectedRows.includes(partner.id)}
                              onChange={() => toggleRowSelection(partner.id)}
                              className="w-4 h-4 text-violet-600 rounded focus:ring-violet-500 border-gray-300"
                            />
                            <button
                              onClick={() => toggleExpandRow(partner.id)}
                              className="p-1 hover:bg-gray-100 rounded transition-colors"
                            >
                              {expandedRow === partner.id ? <FiChevronUp size={14} /> : <FiChevronDown size={14} />}
                            </button>
                            <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs font-medium font-mono">
                              #{partner.id}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 border-r border-gray-200">
                          <div>
                            <div className="text-sm font-semibold text-gray-900">{partner.nom}</div>
                            <div className="text-xs text-gray-500">{partner.email || 'Aucun email'}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 border-r border-gray-200">
                          <div className="flex items-center gap-2">
                            <div className={`p-1.5 ${typeInfo.bgColor} rounded-lg`}>
                              <IconComponent className={`w-3 h-3 ${typeInfo.textColor}`} />
                            </div>
                            <span className={`text-sm font-medium ${typeInfo.textColor}`}>
                              {typeInfo.label}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 border-r border-gray-200">
                          <div className="text-sm text-gray-700">
                            {partner.telephone || '-'}
                          </div>
                        </td>
                        <td className="px-6 py-4 border-r border-gray-200">
                          <div className="text-sm text-gray-700">
                            {partner.email || '-'}
                          </div>
                        </td>
                        <td className="px-6 py-4 border-r border-gray-200">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{partner.pays_details?.emoji || '🌍'}</span>
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {partner.pays_details?.nom || '-'}
                              </div>
                              <div className="text-xs text-gray-500">
                                {partner.pays_details?.code_iso || ''}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 border-r border-gray-200">
                          <div className="flex items-center">
                            <div className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 ${
                              partner.statut
                                ? 'bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 border border-green-200' 
                                : 'bg-gradient-to-r from-red-50 to-pink-50 text-red-700 border border-red-200'
                            }`}>
                              {partner.statut ? (
                                <>
                                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                  <span className="text-sm font-medium">Actif</span>
                                </>
                              ) : (
                                <>
                                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                                  <span className="text-sm font-medium">Inactif</span>
                                </>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleEdit(partner)}
                              className="p-2.5 bg-gradient-to-r from-violet-50 to-violet-100 text-violet-700 rounded-xl hover:from-violet-100 hover:to-violet-200 transition-all duration-200 shadow-sm hover:shadow"
                              title="Modifier">
                              <FiEdit2 size={17} />
                            </button>
                            <button
                              onClick={() => handleDelete(partner)}
                              className="p-2.5 bg-gradient-to-r from-red-50 to-red-100 text-red-700 rounded-xl hover:from-red-100 hover:to-red-200 transition-all duration-200 shadow-sm hover:shadow"
                              title="Supprimer">
                              <FiTrash2 size={17} />
                            </button>
                          </div>
                        </td>
                      </tr>
                      {expandedRow === partner.id && (
                        <tr className="bg-gradient-to-r from-violet-50 to-violet-25">
                          <td colSpan="8" className="px-6 py-4">
                            <div className="bg-white rounded-xl border border-violet-200 p-5">
                              <div className="grid grid-cols-3 gap-6">
                                <div>
                                  <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Adresse</div>
                                  <div className="text-sm text-gray-900">{partner.adresse || '-'}</div>
                                </div>
                                <div>
                                  <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Ville</div>
                                  <div className="text-sm text-gray-900">{getVilleName(partner.ville) || '-'}</div>
                                </div>
                                <div>
                                  <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Site Web</div>
                                  <div className="text-sm text-violet-600">{partner.site_web || '-'}</div>
                                </div>
                                <div>
                                  <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Région</div>
                                  <div className="text-sm text-gray-900">
                                    {partner.region_details?.nom || partner.region || '-'}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Code Postal</div>
                                  <div className="text-sm text-gray-900">{partner.code_postal || '-'}</div>
                                </div>
                                <div>
                                  <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Registre Commerce</div>
                                  <div className="text-sm text-gray-900">{partner.registre_commerce || '-'}</div>
                                </div>
                                <div>
                                  <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Numéro Fiscal</div>
                                  <div className="text-sm text-gray-900">{partner.numero_fiscal || '-'}</div>
                                </div>
                                <div>
                                  <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Sécurité Sociale</div>
                                  <div className="text-sm text-gray-900">{partner.securite_sociale || '-'}</div>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination - COULEUR VIOLETTE */}
        {filteredPartners.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-200 bg-gradient-to-r from-gray-50 to-white">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-700">
                    Page {currentPage} sur {totalPages}
                  </span>
                  <span className="text-gray-300">•</span>
                  <span className="text-sm text-gray-700">
                    {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredPartners.length)} sur {filteredPartners.length} partenaires
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={prevPage}
                  disabled={currentPage === 1}
                  className={`p-2 rounded-lg border transition-all duration-200 ${
                    currentPage === 1
                      ? 'bg-gray-100 text-gray-400 border-gray-300 cursor-not-allowed'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400 hover:shadow-sm'
                  }`}
                  title="Page précédente"
                >
                  <FiChevronLeft />
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
                        className={`min-w-[40px] h-10 rounded-lg border text-sm font-medium transition-all duration-200 ${
                          currentPage === pageNumber
                            ? 'bg-gradient-to-r from-violet-600 to-violet-500 text-white border-violet-600 shadow-md'
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
                  className={`p-2 rounded-lg border transition-all duration-200 ${
                    currentPage === totalPages
                      ? 'bg-gray-100 text-gray-400 border-gray-300 cursor-not-allowed'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400 hover:shadow-sm'
                  }`}
                  title="Page suivante"
                >
                  <FiChevronRight />
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
    </div>
  );
}

// COMPOSANT MODAL POUR LES PARTENAIRES - COULEUR VIOLETTE
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
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {label} {required && <span className="text-red-500">*</span>}
          </label>
        )}
        
        {/* Bouton d'ouverture du dropdown */}
        <button
          type="button"
          onClick={handleToggle}
          onMouseDown={(e) => e.preventDefault()}
          disabled={disabled}
          className={`w-full text-left border border-gray-300 rounded-xl px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all ${
            disabled 
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
              : 'bg-white hover:border-gray-400'
          } ${isOpen ? 'ring-2 ring-violet-500 border-violet-500' : ''}`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {Icon && <Icon className="text-gray-400" size={18} />}
              {selectedOption ? (
                <span className="text-gray-900 font-medium">{getOptionLabel(selectedOption)}</span>
              ) : (
                <span className="text-gray-500">{placeholder || `Sélectionnez...`}</span>
              )}
            </div>
            <svg className={`h-5 w-5 text-gray-400 transition-transform ${isOpen ? 'transform rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </button>

        {/* Dropdown avec recherche */}
        {isOpen && (
          <div 
            className="absolute z-50 w-full mt-2 bg-white border border-gray-300 rounded-xl shadow-xl max-h-60 overflow-hidden"
            onMouseDown={handleInputMouseDown}
          >
            {/* Barre de recherche */}
            <div className="p-3 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
              <div className="relative">
                <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input
                  ref={inputRef}
                  type="text"
                  value={searchValue}
                  onChange={(e) => onSearchChange(e.target.value)}
                  onMouseDown={handleInputMouseDown}
                  onClick={handleInputClick}
                  onFocus={handleInputFocus}
                  className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent text-sm bg-white"
                  placeholder={`Rechercher...`}
                  autoFocus
                />
              </div>
              <p className="text-xs text-gray-500 mt-2 px-1">
                {filteredOptions.length} résultat(s) trouvé(s)
              </p>
            </div>
            
            {/* Liste des options */}
            <div className="max-h-48 overflow-y-auto">
              {filteredOptions.length === 0 ? (
                <div className="p-6 text-center">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <FiSearch className="text-gray-400" />
                  </div>
                  <p className="text-gray-500 text-sm">Aucun résultat trouvé</p>
                </div>
              ) : (
                filteredOptions.map((option, index) => (
                  <div
                    key={index}
                    className={`px-4 py-3 cursor-pointer hover:bg-violet-50 text-sm border-b border-gray-100 last:border-b-0 transition-colors ${
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
          <p className="text-xs text-emerald-600 mt-2 flex items-center gap-1.5">
            <FiCheck size={14} />
            Sélectionné: <span className="font-medium">{getOptionLabel(selectedOption)}</span>
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header du modal avec gradient - TAILLE RÉDUITE - COULEUR VIOLETTE */}
        <div className="sticky top-0 bg-gradient-to-r from-violet-600 to-violet-500 text-white rounded-t-2xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 backdrop-blur-sm rounded-lg">
                <FiUsers className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold">
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
              className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
            >
              <FiX size={20} />
            </button>
          </div>
        </div>
        
        {error && (
          <div className="mx-6 mt-4 bg-gradient-to-r from-red-50 to-red-100 border-l-4 border-red-500 rounded-r-xl p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <FiX className="text-red-600" />
              </div>
              <span className="text-red-800 text-sm font-medium">{error}</span>
            </div>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="p-6 space-y-8">
          {/* Section 1: Informations Générales - COULEUR VIOLETTE */}
          <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl p-6 border border-gray-200">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-1.5 h-8 bg-gradient-to-b from-violet-600 to-violet-400 rounded-full"></div>
              <h3 className="text-lg font-semibold text-gray-900">Informations Générales</h3>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="lg:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nom / Raison Sociale <span className="text-red-500">*</span>
                </label>
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-r from-violet-600 to-violet-500 rounded-xl blur opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
                  <input
                    type="text"
                    required
                    value={formData.nom}
                    onChange={(e) => handleChange('nom', e.target.value)}
                    className="relative w-full border border-gray-300 rounded-xl px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-white"
                    placeholder="Nom complet ou raison sociale"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type de Partenaire <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={formData.type_partenaire}
                  onChange={(e) => handleChange('type_partenaire', e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                >
                  {partnerTypes.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Statut</label>
                <select
                  value={formData.statut}
                  onChange={(e) => handleChange('statut', e.target.value === 'true')}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                >
                  <option value={true}>Actif</option>
                  <option value={false}>Inactif</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Informations Légales - COULEUR VIOLETTE */}
          <div className="bg-gradient-to-br from-violet-50 to-white rounded-2xl p-6 border border-violet-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-1.5 h-8 bg-gradient-to-b from-violet-600 to-violet-400 rounded-full"></div>
              <h3 className="text-lg font-semibold text-gray-900">Informations Légales</h3>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Registre de Commerce</label>
                <input
                  type="text"
                  value={formData.registre_commerce}
                  onChange={(e) => handleChange('registre_commerce', e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                  placeholder="Numéro RC"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Numéro Fiscal</label>
                <input
                  type="text"
                  value={formData.numero_fiscal}
                  onChange={(e) => handleChange('numero_fiscal', e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                  placeholder="Numéro d'identification fiscale"
                />
              </div>
              
              <div className="lg:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Sécurité Sociale</label>
                <input
                  type="text"
                  value={formData.securite_sociale}
                  onChange={(e) => handleChange('securite_sociale', e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                  placeholder="Numéro de sécurité sociale"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Localisation - COULEUR VIOLETTE */}
          <div className="bg-gradient-to-br from-purple-50 to-white rounded-2xl p-6 border border-purple-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-1.5 h-8 bg-gradient-to-b from-purple-600 to-purple-400 rounded-full"></div>
              <h3 className="text-lg font-semibold text-gray-900">Localisation</h3>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="lg:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Adresse complète <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  value={formData.adresse}
                  onChange={(e) => handleChange('adresse', e.target.value)}
                  rows={3}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                  placeholder="Adresse complète"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Complément d'adresse</label>
                <input
                  type="text"
                  value={formData.complement_adresse}
                  onChange={(e) => handleChange('complement_adresse', e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                  placeholder="Bâtiment, étage, etc."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Code Postal</label>
                <input
                  type="text"
                  value={formData.code_postal}
                  onChange={(e) => handleChange('code_postal', e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
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
                  <p className="text-xs text-gray-500 mt-2 flex items-center gap-1.5">
                    <FiGlobe size={12} />
                    Veuillez d'abord sélectionner un pays
                  </p>
                )}
                {loadingSubdivisions && (
                  <p className="text-xs text-violet-500 mt-2 flex items-center gap-1.5">
                    <FiRefreshCw className="animate-spin" size={12} />
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
                  <p className="text-xs text-gray-500 mt-2 flex items-center gap-1.5">
                    <FiMapPin size={12} />
                    Veuillez d'abord sélectionner une subdivision
                  </p>
                )}
                {loadingVilles && (
                  <p className="text-xs text-violet-500 mt-2 flex items-center gap-1.5">
                    <FiRefreshCw className="animate-spin" size={12} />
                    Chargement des villes...
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Section 4: Contact - COULEUR VIOLETTE */}
          <div className="bg-gradient-to-br from-cyan-50 to-white rounded-2xl p-6 border border-cyan-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-1.5 h-8 bg-gradient-to-b from-cyan-600 to-cyan-400 rounded-full"></div>
              <h3 className="text-lg font-semibold text-gray-900">Contact</h3>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Téléphone <span className="text-red-500">*</span>
                </label>
                <div className="relative group">
                  <FiPhone className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="tel"
                    required
                    value={formData.telephone}
                    onChange={(e) => handleChange('telephone', e.target.value)}
                    className="w-full pl-12 pr-4 py-3.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    placeholder="+228 XX XXX XXX"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <div className="relative group">
                  <FiMail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    className="w-full pl-12 pr-4 py-3.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    placeholder="contact@entreprise.tg"
                  />
                </div>
              </div>
              
              <div className="lg:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Site Web</label>
                <input
                  type="url"
                  value={formData.site_web}
                  onChange={(e) => handleChange('site_web', e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                  placeholder="https://www.example.com"
                />
              </div>
            </div>
          </div>
          
          {/* Boutons d'action - COULEUR VIOLETTE */}
          <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3.5 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-all duration-200 font-medium hover:shadow-sm"
              disabled={loading}
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3.5 bg-gradient-to-r from-violet-600 to-violet-500 text-white rounded-xl hover:from-violet-700 hover:to-violet-600 disabled:opacity-50 transition-all duration-200 font-semibold flex items-center space-x-2 shadow-md hover:shadow-lg"
            >
              {loading ? (
                <>
                  <FiRefreshCw className="animate-spin" />
                  <span>Sauvegarde...</span>
                </>
              ) : (
                <>
                  <FiCheck />
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