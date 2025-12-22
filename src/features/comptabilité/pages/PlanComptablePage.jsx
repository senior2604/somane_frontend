import React, { useState, useEffect, useRef } from 'react';
import { apiClient } from '../../../services/apiClient';
import { 
  FiRefreshCw, 
  FiPlus, 
  FiEdit2, 
  FiTrash2, 
  FiSearch, 
  FiFilter, 
  FiX, 
  FiCheck, 
  FiEye,
  FiChevronLeft,
  FiChevronRight,
  FiDownload,
  FiUpload,
  FiFileText,
  FiGrid,
  FiPercent,
  FiDollarSign,
  FiBook,
  FiInfo ,
  FiTrendingUp,
  FiTrendingDown,
  FiCheckCircle,
  FiXCircle,
  FiChevronDown
} from "react-icons/fi";
import { TbBuildingSkyscraper, TbChartBar } from "react-icons/tb";

export default function PlanComptablePage() {
  const [comptes, setComptes] = useState([]);
  const [groupes, setGroupes] = useState([]);
  const [entities, setEntities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingCompte, setEditingCompte] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedCompte, setSelectedCompte] = useState(null);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterGroupe, setFilterGroupe] = useState('');
  const [filterEntity, setFilterEntity] = useState('');
  const [filterStatut, setFilterStatut] = useState('');
  const [selectedRows, setSelectedRows] = useState([]);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔍 Début du chargement des données...');
      
      // Récupérer les entités (ça fonctionne)
      let entitiesData = [];
      try {
        const entitiesRes = await apiClient.get('/entites/');
        console.log('✅ Entités chargées:', entitiesRes?.length || 'Aucune');
        
        if (Array.isArray(entitiesRes)) {
          entitiesData = entitiesRes;
        } else if (entitiesRes && Array.isArray(entitiesRes.results)) {
          entitiesData = entitiesRes.results;
        } else if (entitiesRes && Array.isArray(entitiesRes.data)) {
          entitiesData = entitiesRes.data;
        }
      } catch (err) {
        console.error('❌ Erreur chargement entités:', err);
        entitiesData = [];
      }
      
      // Essayer de charger les comptes depuis l'API
      let comptesData = [];
      let groupesData = [];
      
      try {
        // Essayer l'endpoint comptabilité
        const [comptesRes, groupesRes] = await Promise.all([
          apiClient.get('/comptabilite/accounts/'),
          apiClient.get('/comptabilite/groups/')
        ]);
        
        console.log('✅ API Comptabilité fonctionne!');
        
        // Extraire données comptes
        if (Array.isArray(comptesRes)) {
          comptesData = comptesRes;
        } else if (comptesRes && Array.isArray(comptesRes.results)) {
          comptesData = comptesRes.results;
        } else if (comptesRes && Array.isArray(comptesRes.data)) {
          comptesData = comptesRes.data;
        }
        
        // Extraire données groupes
        if (Array.isArray(groupesRes)) {
          groupesData = groupesRes;
        } else if (groupesRes && Array.isArray(groupesRes.results)) {
          groupesData = groupesRes.results;
        } else if (groupesRes && Array.isArray(groupesRes.data)) {
          groupesData = groupesRes.data;
        }
        
      } catch (apiError) {
        console.log('⚠️ API Comptabilité non disponible, mode démo activé');
        
        // Données de démo pour les comptes
        comptesData = [
          { 
            id: 1, 
            code: '100', 
            name: 'Capital social', 
            group: { id: 1, name: 'Classe 1: Capitaux propres' }, 
            group_name: 'Classe 1: Capitaux propres', 
            company: { id: 1, raison_sociale: entitiesData[0]?.raison_sociale || 'Société Test' }, 
            reconcile: false, 
            active: true,
            note: 'Capital initial de la société'
          },
          { 
            id: 2, 
            code: '101', 
            name: 'Réserves', 
            group: { id: 1, name: 'Classe 1: Capitaux propres' }, 
            group_name: 'Classe 1: Capitaux propres', 
            company: { id: 1, raison_sociale: entitiesData[0]?.raison_sociale || 'Société Test' }, 
            reconcile: false, 
            active: true 
          },
          { 
            id: 3, 
            code: '411', 
            name: 'Clients', 
            group: { id: 4, name: 'Classe 4: Tiers' }, 
            group_name: 'Classe 4: Tiers', 
            company: { id: 1, raison_sociale: entitiesData[0]?.raison_sociale || 'Société Test' }, 
            reconcile: true, 
            active: true 
          },
          { 
            id: 4, 
            code: '401', 
            name: 'Fournisseurs', 
            group: { id: 4, name: 'Classe 4: Tiers' }, 
            group_name: 'Classe 4: Tiers', 
            company: { id: 1, raison_sociale: entitiesData[0]?.raison_sociale || 'Société Test' }, 
            reconcile: true, 
            active: true 
          },
          { 
            id: 5, 
            code: '512', 
            name: 'Banque', 
            group: { id: 5, name: 'Classe 5: Trésorerie' }, 
            group_name: 'Classe 5: Trésorerie', 
            company: { id: 1, raison_sociale: entitiesData[0]?.raison_sociale || 'Société Test' }, 
            reconcile: true, 
            active: true 
          },
          { 
            id: 6, 
            code: '531', 
            name: 'Caisse', 
            group: { id: 5, name: 'Classe 5: Trésorerie' }, 
            group_name: 'Classe 5: Trésorerie', 
            company: { id: 1, raison_sociale: entitiesData[0]?.raison_sociale || 'Société Test' }, 
            reconcile: true, 
            active: true 
          },
          { 
            id: 7, 
            code: '601', 
            name: 'Achats de marchandises', 
            group: { id: 6, name: 'Classe 6: Charges' }, 
            group_name: 'Classe 6: Charges', 
            company: { id: 1, raison_sociale: entitiesData[0]?.raison_sociale || 'Société Test' }, 
            reconcile: false, 
            active: true 
          },
          { 
            id: 8, 
            code: '701', 
            name: 'Ventes de marchandises', 
            group: { id: 7, name: 'Classe 7: Produits' }, 
            group_name: 'Classe 7: Produits', 
            company: { id: 1, raison_sociale: entitiesData[0]?.raison_sociale || 'Société Test' }, 
            reconcile: false, 
            active: false 
          },
          { 
            id: 9, 
            code: '281', 
            name: 'Amortissements', 
            group: { id: 2, name: 'Classe 2: Actifs immobilisés' }, 
            group_name: 'Classe 2: Actifs immobilisés', 
            company: { id: 1, raison_sociale: entitiesData[0]?.raison_sociale || 'Société Test' }, 
            reconcile: false, 
            active: true 
          },
          { 
            id: 10, 
            code: '31', 
            name: 'Stocks de marchandises', 
            group: { id: 3, name: 'Classe 3: Stocks' }, 
            group_name: 'Classe 3: Stocks', 
            company: { id: 1, raison_sociale: entitiesData[0]?.raison_sociale || 'Société Test' }, 
            reconcile: false, 
            active: true 
          },
        ];
        
        // Groupes de démo
        groupesData = [
          { id: 1, name: 'Classe 1: Capitaux propres', code_prefix_start: '10', code_prefix_end: '19' },
          { id: 2, name: 'Classe 2: Actifs immobilisés', code_prefix_start: '20', code_prefix_end: '29' },
          { id: 3, name: 'Classe 3: Stocks', code_prefix_start: '30', code_prefix_end: '39' },
          { id: 4, name: 'Classe 4: Tiers', code_prefix_start: '40', code_prefix_end: '49' },
          { id: 5, name: 'Classe 5: Trésorerie', code_prefix_start: '50', code_prefix_end: '59' },
          { id: 6, name: 'Classe 6: Charges', code_prefix_start: '60', code_prefix_end: '69' },
          { id: 7, name: 'Classe 7: Produits', code_prefix_start: '70', code_prefix_end: '79' },
        ];
        
        // Message informatif
        setError('Mode démo activé - Les données sont fictives. L\'API comptabilité n\'est pas encore disponible.');
      }
      
      setComptes(comptesData);
      setGroupes(groupesData);
      setEntities(entitiesData);
      
      console.log(`✅ Chargement terminé: ${comptesData.length} comptes, ${groupesData.length} groupes, ${entitiesData.length} sociétés`);
      
    } catch (err) {
      console.error('❌ Erreur générale lors du chargement:', err);
      setError('Erreur lors du chargement du plan comptable');
      setComptes([]);
      setGroupes([]);
      setEntities([]);
    } finally {
      setLoading(false);
    }
  };

  // Filtrage et recherche
  const filteredComptes = comptes.filter(compte => {
    const matchesSearch = 
      (compte.code || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (compte.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (compte.note || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesGroupe = filterGroupe === '' || 
      (compte.group && compte.group.id.toString() === filterGroupe);
    
    const matchesEntity = filterEntity === '' || 
      (compte.company && compte.company.id.toString() === filterEntity);
    
    const matchesStatut = filterStatut === '' || 
      (filterStatut === 'actif' ? compte.active : !compte.active);
    
    return matchesSearch && matchesGroupe && matchesEntity && matchesStatut;
  });

  // Calculs pour la pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentComptes = Array.isArray(filteredComptes) ? filteredComptes.slice(indexOfFirstItem, indexOfLastItem) : [];
  const totalPages = Math.ceil((Array.isArray(filteredComptes) ? filteredComptes.length : 0) / itemsPerPage);

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
    if (selectedRows.length === currentComptes.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(currentComptes.map(compte => compte.id));
    }
  };

  // Gestion des actions
  const handleNewCompte = () => {
    setEditingCompte(null);
    setShowForm(true);
  };

  const handleEdit = (compte) => {
    setEditingCompte(compte);
    setShowForm(true);
  };

  const handleDelete = async (compte) => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer le compte "${compte.code} - ${compte.name}" ?`)) {
      try {
        // Essayer l'API si disponible, sinon mode démo
        await apiClient.delete(`/comptabilite/accounts/${compte.id}/`);
        fetchAllData();
      } catch (err) {
        console.log('Mode démo: suppression simulée');
        // En mode démo, simuler la suppression
        setComptes(prev => prev.filter(c => c.id !== compte.id));
      }
    }
  };

  const handleViewDetails = (compte) => {
    setSelectedCompte(compte);
    setShowDetailModal(true);
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingCompte(null);
    fetchAllData();
  };

  const handleRetry = () => {
    fetchAllData();
  };

  const resetFilters = () => {
    setSearchTerm('');
    setFilterGroupe('');
    setFilterEntity('');
    setFilterStatut('');
    setCurrentPage(1);
    setShowFilterDropdown(false);
  };

  // Statistiques
  const stats = {
    total: comptes.length,
    actifs: comptes.filter(c => c.active).length,
    inactifs: comptes.filter(c => !c.active).length,
    lettrables: comptes.filter(c => c.reconcile).length,
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
                  onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                  className={`flex items-center gap-1 px-2 py-1.5 rounded text-xs font-medium ${
                    filterGroupe || filterEntity || filterStatut ? 'bg-violet-100 text-violet-700' : 'bg-gray-100 text-gray-700'
                  } hover:bg-gray-200 transition-colors`}
                >
                  <FiChevronDown size={12} />
                  <span>Filtre</span>
                </button>
                
                {/* Dropdown des filtres */}
                {showFilterDropdown && (
                  <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                    <div className="p-2">
                      <p className="text-xs font-medium text-gray-700 mb-2">Filtrer par</p>
                      
                      {/* Filtre Société */}
                      <div className="space-y-1 mb-3">
                        <p className="text-xs font-medium text-gray-700 mb-1">Société</p>
                        <button
                          onClick={() => {
                            setFilterEntity('');
                            setShowFilterDropdown(false);
                          }}
                          className={`w-full text-left px-2 py-1.5 rounded text-xs ${!filterEntity ? 'bg-violet-50 text-violet-700' : 'text-gray-700 hover:bg-gray-50'}`}
                        >
                          Toutes les sociétés
                        </button>
                        {entities.slice(0, 5).map(entity => (
                          <button
                            key={entity.id}
                            onClick={() => {
                              setFilterEntity(entity.id.toString());
                              setShowFilterDropdown(false);
                            }}
                            className={`w-full text-left px-2 py-1.5 rounded text-xs ${filterEntity === entity.id.toString() ? 'bg-violet-50 text-violet-700' : 'text-gray-700 hover:bg-gray-50'}`}
                          >
                            {entity.raison_sociale}
                          </button>
                        ))}
                      </div>
                      
                      {/* Filtre Groupe */}
                      <div className="space-y-1 mb-3">
                        <p className="text-xs font-medium text-gray-700 mb-1">Groupe</p>
                        <button
                          onClick={() => {
                            setFilterGroupe('');
                            setShowFilterDropdown(false);
                          }}
                          className={`w-full text-left px-2 py-1.5 rounded text-xs ${!filterGroupe ? 'bg-violet-50 text-violet-700' : 'text-gray-700 hover:bg-gray-50'}`}
                        >
                          Tous les groupes
                        </button>
                        {groupes.slice(0, 5).map(groupe => (
                          <button
                            key={groupe.id}
                            onClick={() => {
                              setFilterGroupe(groupe.id.toString());
                              setShowFilterDropdown(false);
                            }}
                            className={`w-full text-left px-2 py-1.5 rounded text-xs ${filterGroupe === groupe.id.toString() ? 'bg-violet-50 text-violet-700' : 'text-gray-700 hover:bg-gray-50'}`}
                          >
                            {groupe.name}
                          </button>
                        ))}
                      </div>
                      
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
                            setFilterStatut('actif');
                            setShowFilterDropdown(false);
                          }}
                          className={`w-full text-left px-2 py-1.5 rounded text-xs ${filterStatut === 'actif' ? 'bg-violet-50 text-violet-700' : 'text-gray-700 hover:bg-gray-50'}`}
                        >
                          Actifs seulement
                        </button>
                        <button
                          onClick={() => {
                            setFilterStatut('inactif');
                            setShowFilterDropdown(false);
                          }}
                          className={`w-full text-left px-2 py-1.5 rounded text-xs ${filterStatut === 'inactif' ? 'bg-violet-50 text-violet-700' : 'text-gray-700 hover:bg-gray-50'}`}
                        >
                          Inactifs seulement
                        </button>
                      </div>
                      
                      {/* Réinitialiser */}
                      {(searchTerm || filterGroupe || filterEntity || filterStatut) && (
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
              onClick={handleNewCompte}
              className="ml-2 px-3 py-2 rounded-lg bg-gradient-to-r from-violet-600 to-violet-500 text-white hover:from-violet-700 hover:to-violet-600 transition-all duration-300 flex items-center gap-1.5 text-sm shadow"
            >
              <FiPlus size={14} />
              <span>Nouveau Compte</span>
            </button>
          </div>
        </div>

        {/* Statistiques en ligne compactes */}
        <div className="grid grid-cols-4 gap-2 mb-3">
          <div className="bg-white rounded-lg p-2 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-600">Total:</span>
                <span className="text-sm font-bold text-violet-600">{stats.total}</span>
              </div>
              <div className="p-1 bg-violet-50 rounded">
                <TbChartBar className="w-3 h-3 text-violet-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg p-2 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-600">Actifs:</span>
                <span className="text-sm font-bold text-green-600">{stats.actifs}</span>
              </div>
              <div className="p-1 bg-green-50 rounded">
                <FiCheckCircle className="w-3 h-3 text-green-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg p-2 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-600">Inactifs:</span>
                <span className="text-sm font-bold text-red-600">{stats.inactifs}</span>
              </div>
              <div className="p-1 bg-red-50 rounded">
                <FiXCircle className="w-3 h-3 text-red-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg p-2 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-600">Lettrables:</span>
                <span className="text-sm font-bold text-blue-600">{stats.lettrables}</span>
              </div>
              <div className="p-1 bg-blue-50 rounded">
                <FiBook className="w-3 h-3 text-blue-600" />
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

      {/* Message d'erreur/info */}
      {error && (
        <div className="mb-4">
          <div className={`bg-gradient-to-r rounded-r-lg p-2 shadow-sm ${
            error.includes('Mode démo') 
              ? 'from-amber-50 to-amber-100 border-l-3 border-amber-500' 
              : 'from-red-50 to-red-100 border-l-3 border-red-500'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`p-1 rounded ${
                  error.includes('Mode démo') ? 'bg-amber-100' : 'bg-red-100'
                }`}>
                  {error.includes('Mode démo') ? (
                    <FiInfo className="w-3 h-3 text-amber-600" />
                  ) : (
                    <FiX className="w-3 h-3 text-red-600" />
                  )}
                </div>
                <div>
                  <p className={`font-medium text-xs ${
                    error.includes('Mode démo') ? 'text-amber-900' : 'text-red-900'
                  }`}>{error}</p>
                </div>
              </div>
              <button
                onClick={handleRetry}
                className={`px-2 py-1 rounded text-xs font-medium ${
                  error.includes('Mode démo') 
                    ? 'bg-amber-600 text-white hover:bg-amber-700' 
                    : 'bg-red-600 text-white hover:bg-red-700'
                } transition-colors`}
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
                  checked={selectedRows.length === currentComptes.length && currentComptes.length > 0}
                  onChange={selectAllRows}
                  className="w-3 h-3 text-violet-600 rounded focus:ring-violet-500 border-gray-300"
                />
                <span className="text-xs text-gray-700">
                  {selectedRows.length} sélectionné(s)
                </span>
              </div>
              {(filterGroupe || filterEntity || filterStatut) && (
                <div className="flex items-center gap-1">
                  {filterEntity && (
                    <span className="px-1.5 py-0.5 bg-violet-50 text-violet-700 text-xs rounded border border-violet-200">
                      Société: {entities.find(e => e.id.toString() === filterEntity)?.raison_sociale || filterEntity}
                    </span>
                  )}
                  {filterGroupe && (
                    <span className="px-1.5 py-0.5 bg-violet-50 text-violet-700 text-xs rounded border border-violet-200">
                      Groupe: {groupes.find(g => g.id.toString() === filterGroupe)?.name || filterGroupe}
                    </span>
                  )}
                  {filterStatut && (
                    <span className="px-1.5 py-0.5 bg-violet-50 text-violet-700 text-xs rounded border border-violet-200">
                      {filterStatut === 'actif' ? 'Actifs' : 'Inactifs'}
                    </span>
                  )}
                </div>
              )}
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
                      checked={selectedRows.length === currentComptes.length && currentComptes.length > 0}
                      onChange={selectAllRows}
                      className="w-3 h-3 text-violet-600 rounded focus:ring-violet-500 border-gray-300"
                    />
                    Code
                  </div>
                </th>
                <th scope="col" className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-300">
                  Libellé
                </th>
                <th scope="col" className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-300">
                  Groupe
                </th>
                <th scope="col" className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-300">
                  Société
                </th>
                <th scope="col" className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-300">
                  Lettrage
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
              {currentComptes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-4 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-12 h-12 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mb-2">
                        <TbChartBar className="w-6 h-6 text-gray-400" />
                      </div>
                      <h3 className="text-sm font-semibold text-gray-900 mb-1">
                        {comptes.length === 0 ? 'Aucun compte trouvé' : 'Aucun résultat'}
                      </h3>
                      <p className="text-gray-600 text-xs mb-3 max-w-md">
                        {comptes.length === 0 
                          ? 'Commencez par créer votre premier compte' 
                          : 'Essayez de modifier vos critères de recherche'}
                      </p>
                      {comptes.length === 0 && (
                        <button 
                          onClick={handleNewCompte}
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
                currentComptes.map((compte) => (
                  <tr 
                    key={compte.id}
                    className={`hover:bg-gradient-to-r hover:from-gray-50 hover:to-white transition-all duration-200 ${
                      selectedRows.includes(compte.id) ? 'bg-gradient-to-r from-violet-50 to-violet-25' : 'bg-white'
                    }`}
                  >
                    {/* Code avec checkbox */}
                    <td className="px-3 py-2 whitespace-nowrap border-r border-gray-200">
                      <div className="flex items-center gap-1.5">
                        <input
                          type="checkbox"
                          checked={selectedRows.includes(compte.id)}
                          onChange={() => toggleRowSelection(compte.id)}
                          className="w-3 h-3 text-violet-600 rounded focus:ring-violet-500 border-gray-300"
                        />
                        <span className="px-1 py-0.5 bg-gray-100 text-gray-800 rounded text-xs font-medium font-mono">
                          {compte.code}
                        </span>
                      </div>
                    </td>
                    
                    {/* Libellé */}
                    <td className="px-3 py-2 border-r border-gray-200">
                      <div>
                        <div className="text-xs font-semibold text-gray-900 truncate max-w-[120px]">
                          {compte.name}
                        </div>
                        {compte.note && (
                          <div className="text-xs text-gray-500 truncate max-w-[120px] mt-0.5">
                            {compte.note}
                          </div>
                        )}
                      </div>
                    </td>
                    
                    {/* Groupe */}
                    <td className="px-3 py-2 border-r border-gray-200">
                      <div className="text-xs text-gray-900 truncate max-w-[100px]">
                        {compte.group?.name || compte.group_name || '-'}
                      </div>
                    </td>
                    
                    {/* Société */}
                    <td className="px-3 py-2 border-r border-gray-200">
                      <div className="text-xs text-gray-900 truncate max-w-[100px]">
                        {compte.company?.raison_sociale || '-'}
                      </div>
                    </td>
                    
                    {/* Lettrage */}
                    <td className="px-3 py-2 border-r border-gray-200">
                      <div className={`px-1.5 py-0.5 rounded flex items-center gap-1 ${
                        compte.reconcile
                          ? 'bg-gradient-to-r from-blue-50 to-blue-50 text-blue-700 border border-blue-200' 
                          : 'bg-gradient-to-r from-gray-50 to-gray-50 text-gray-700 border border-gray-200'
                      }`}>
                        <div className={`w-1.5 h-1.5 ${compte.reconcile ? 'bg-blue-500' : 'bg-gray-400'} rounded-full`}></div>
                        <span className="text-xs font-medium">
                          {compte.reconcile ? 'Lettrable' : 'Non lettrable'}
                        </span>
                      </div>
                    </td>
                    
                    {/* Statut */}
                    <td className="px-3 py-2 border-r border-gray-200">
                      <div className="flex items-center">
                        <div className={`px-1.5 py-0.5 rounded flex items-center gap-1 ${
                          compte.active
                            ? 'bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 border border-green-200' 
                            : 'bg-gradient-to-r from-red-50 to-pink-50 text-red-700 border border-red-200'
                        }`}>
                          {compte.active ? (
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
                    
                    {/* Actions */}
                    <td className="px-3 py-2 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleViewDetails(compte)}
                          className="p-1 bg-gradient-to-r from-gray-50 to-gray-100 text-gray-700 rounded hover:from-gray-100 hover:to-gray-200 transition-all duration-200 shadow-sm hover:shadow"
                          title="Voir détails"
                        >
                          <FiEye size={12} />
                        </button>
                        <button
                          onClick={() => handleEdit(compte)}
                          className="p-1 bg-gradient-to-r from-violet-50 to-violet-100 text-violet-700 rounded hover:from-violet-100 hover:to-violet-200 transition-all duration-200 shadow-sm hover:shadow"
                          title="Modifier"
                        >
                          <FiEdit2 size={12} />
                        </button>
                        <button
                          onClick={() => handleDelete(compte)}
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
        {currentComptes.length > 0 && (
          <div className="px-3 py-2 border-t border-gray-200 bg-gradient-to-r from-gray-50 to-white">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <span className="text-xs text-gray-700">
                    Page {currentPage} sur {totalPages}
                  </span>
                  <span className="text-gray-300">•</span>
                  <span className="text-xs text-gray-700">
                    {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredComptes.length)} sur {filteredComptes.length} comptes
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
        <CompteFormModal
          compte={editingCompte}
          entities={entities}
          groupes={groupes}
          onClose={() => {
            setShowForm(false);
            setEditingCompte(null);
          }}
          onSuccess={handleFormSuccess}
        />
      )}

      {showDetailModal && selectedCompte && (
        <CompteDetailModal
          compte={selectedCompte}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedCompte(null);
          }}
        />
      )}
    </div>
  );
}

// MODAL DE DÉTAILS COMPTE
function CompteDetailModal({ compte, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-3 z-50 backdrop-blur-sm">
      <div className="bg-white rounded-lg w-full max-w-md shadow-xl">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-900">Détails du compte</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <FiX size={20} />
            </button>
          </div>
        </div>
        
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">Code</p>
              <p className="font-mono font-bold text-gray-900 text-lg">{compte.code}</p>
            </div>
            <div className={`px-2 py-1 rounded text-xs font-medium ${
              compte.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              {compte.active ? 'Actif' : 'Inactif'}
            </div>
          </div>
          
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">Libellé</p>
            <p className="text-gray-900 font-medium">{compte.name}</p>
          </div>
          
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">Groupe</p>
            <p className="text-gray-900">{compte.group?.name || compte.group_name || '-'}</p>
          </div>
          
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">Société</p>
            <p className="text-gray-900">{compte.company?.raison_sociale || '-'}</p>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">Lettrage</p>
              <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                compte.reconcile
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {compte.reconcile ? 'Lettrable' : 'Non lettrable'}
              </span>
            </div>
          </div>
          
          {compte.note && (
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">Notes</p>
              <div className="bg-gray-50 p-2 rounded">
                <p className="text-gray-700 text-sm whitespace-pre-line">{compte.note}</p>
              </div>
            </div>
          )}
        </div>
        
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gradient-to-r from-violet-600 to-violet-500 text-white rounded hover:from-violet-700 hover:to-violet-600 transition-all duration-200"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}

// MODAL DE FORMULAIRE COMPTE
function CompteFormModal({ compte, entities, groupes, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    code: compte?.code || '',
    name: compte?.name || '',
    group: compte?.group?.id || '',
    company: compte?.company?.id || entities[0]?.id || '',
    reconcile: compte?.reconcile || false,
    active: compte?.active !== undefined ? compte.active : true,
    note: compte?.note || '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!formData.code.trim()) {
      setError('Le code est obligatoire');
      setLoading(false);
      return;
    }

    if (!formData.name.trim()) {
      setError('Le libellé est obligatoire');
      setLoading(false);
      return;
    }

    try {
      console.log('📤 Tentative d\'envoi des données:', formData);
      
      // Essayer l'API réelle d'abord
      try {
        const url = compte
          ? `/comptabilite/accounts/${compte.id}/`
          : `/comptabilite/accounts/`;
        
        const method = compte ? 'PUT' : 'POST';

        await apiClient.request(url, {
          method: method,
          body: JSON.stringify(formData),
          headers: {
            'Content-Type': 'application/json'
          }
        });

        console.log('✅ Données envoyées avec succès');
        
      } catch (apiError) {
        console.log('⚠️ API non disponible, simulation en mode démo');
        // En mode démo, simuler un délai
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      onSuccess();
      
    } catch (err) {
      console.error('❌ Erreur sauvegarde compte:', err);
      setError(err.response?.data?.detail || 'Erreur lors de la sauvegarde');
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
      <div className="bg-white rounded-lg w-full max-w-md shadow-xl">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-900">
              {compte ? 'Modifier le compte' : 'Nouveau compte'}
            </h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <FiX size={20} />
            </button>
          </div>
        </div>
        
        {error && (
          <div className="mx-4 mt-3 p-3 bg-red-50 text-red-700 rounded text-sm">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Code <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.code}
              onChange={(e) => handleChange('code', e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent"
              placeholder="Ex: 100, 411, 701..."
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Libellé <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent"
              placeholder="Nom du compte"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Société</label>
            <select
              value={formData.company}
              onChange={(e) => handleChange('company', e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent"
            >
              {entities.map(entity => (
                <option key={entity.id} value={entity.id}>
                  {entity.raison_sociale}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Groupe</label>
            <select
              value={formData.group}
              onChange={(e) => handleChange('group', e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent"
            >
              <option value="">Sélectionnez un groupe</option>
              {groupes.map(groupe => (
                <option key={groupe.id} value={groupe.id}>
                  {groupe.name}
                </option>
              ))}
            </select>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="reconcile"
                checked={formData.reconcile}
                onChange={(e) => handleChange('reconcile', e.target.checked)}
                className="w-4 h-4 text-violet-600 rounded focus:ring-violet-500 border-gray-300"
              />
              <label htmlFor="reconcile" className="ml-2 text-sm text-gray-700">
                Compte lettrable
              </label>
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id="active"
                checked={formData.active}
                onChange={(e) => handleChange('active', e.target.checked)}
                className="w-4 h-4 text-violet-600 rounded focus:ring-violet-500 border-gray-300"
              />
              <label htmlFor="active" className="ml-2 text-sm text-gray-700">
                Compte actif
              </label>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={formData.note}
              onChange={(e) => handleChange('note', e.target.value)}
              rows={3}
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent"
              placeholder="Notes optionnelles..."
            />
          </div>
          
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50 transition-colors"
              disabled={loading}
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-gradient-to-r from-violet-600 to-violet-500 text-white rounded hover:from-violet-700 hover:to-violet-600 disabled:opacity-50 transition-colors flex items-center gap-2"
            >
              {loading ? (
                <>
                  <FiRefreshCw className="animate-spin" size={16} />
                  <span>Sauvegarde...</span>
                </>
              ) : (
                <>
                  <FiCheck size={16} />
                  <span>{compte ? 'Mettre à jour' : 'Créer'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}