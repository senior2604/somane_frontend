import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiPlus,
  FiFilter,
  FiX,
  FiChevronLeft,
  FiChevronRight,
  FiChevronsLeft,
  FiChevronsRight,
  FiArrowUp,
  FiArrowDown,
  FiAlertCircle,
  FiSettings,
  FiCopy,
  FiTrash2,
  FiRotateCcw,
  FiMoreHorizontal,
  FiEye,
  FiEdit2,
  FiClock,
  FiDollarSign,
  FiCreditCard,
  FiCheck,
  FiXCircle
} from 'react-icons/fi';
import { useEntity } from '../../../../context/EntityContext';
import { apiClient } from '../../../../services/apiClient';

// ==========================================
// COMPOSANT TOOLTIP
// ==========================================
const Tooltip = ({ children, text, position = 'top' }) => {
  const [show, setShow] = useState(false);
  
  return (
    <div className="relative inline-block">
      <div
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
      >
        {children}
      </div>
      {show && (
        <div className={`absolute z-50 px-2 py-1 text-xs text-white bg-gray-800 rounded whitespace-nowrap ${
          position === 'top' ? 'bottom-full left-1/2 transform -translate-x-1/2 mb-1' :
          position === 'bottom' ? 'top-full left-1/2 transform -translate-x-1/2 mt-1' :
          position === 'left' ? 'right-full top-1/2 transform -translate-y-1/2 mr-1' :
          'left-full top-1/2 transform -translate-y-1/2 ml-1'
        }`}>
          {text}
          <div className={`absolute w-2 h-2 bg-gray-800 transform rotate-45 ${
            position === 'top' ? 'top-full left-1/2 -translate-x-1/2 -mt-1' :
            position === 'bottom' ? 'bottom-full left-1/2 -translate-x-1/2 -mb-1' :
            position === 'left' ? 'left-full top-1/2 -translate-y-1/2 -ml-1' :
            'right-full top-1/2 -translate-y-1/2 -mr-1'
          }`} />
        </div>
      )}
    </div>
  );
};

// ==========================================
// COMPOSANT POUR LE TRI
// ==========================================
const SortIcon = ({ column, sortColumn, sortDirection }) => {
  if (sortColumn !== column) return null;
  return sortDirection === 'asc' ? 
    <FiArrowUp size={12} className="ml-1 inline" /> : 
    <FiArrowDown size={12} className="ml-1 inline" />;
};

// ==========================================
// FONCTION DE NORMALISATION
// ==========================================
const normalizeApiResponse = (data) => {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (data.data && Array.isArray(data.data)) return data.data;
  if (data.results && Array.isArray(data.results)) return data.results;
  if (data.items && Array.isArray(data.items)) return data.items;
  console.warn('⚠️ Format de réponse non reconnu:', data);
  return [];
};

// ==========================================
// FORMATAGE LIBELLÉ BANQUE
// ==========================================
const getBankAccountLabel = (bankAccount) => {
  if (!bankAccount) return '';
  
  let bankName = '';
  let accountNumber = bankAccount.numero_compte || '';
  
  if (bankAccount.banque && typeof bankAccount.banque === 'object') {
    bankName = bankAccount.banque.nom || 
               bankAccount.banque.name || 
               bankAccount.banque.raison_sociale || 
               'Banque sans nom';
  }
  else if (bankAccount.banque_details) {
    bankName = bankAccount.banque_details.nom || 
               bankAccount.banque_details.name || 
               bankAccount.banque_details.raison_sociale || 
               'Banque sans nom';
  }
  else if (bankAccount.banque_nom) {
    bankName = bankAccount.banque_nom;
  }
  else if (bankAccount.nom_banque) {
    bankName = bankAccount.nom_banque;
  }
  else {
    bankName = bankAccount.nom || 
               bankAccount.name || 
               bankAccount.libelle || 
               (bankAccount.id ? `Banque #${bankAccount.id}` : 'Compte bancaire');
  }
  
  let partnerInfo = '';
  if (bankAccount.partenaire && typeof bankAccount.partenaire === 'object') {
    partnerInfo = bankAccount.partenaire.nom || '';
  } else if (bankAccount.partenaire_nom) {
    partnerInfo = bankAccount.partenaire_nom;
  }
  
  let label = bankName;
  if (accountNumber) label += ` - ${accountNumber}`;
  if (partnerInfo) label += ` (${partnerInfo})`;
  
  return label;
};

export default function JournauxPage() {
  const navigate = useNavigate();
  const { activeEntity, entities = [] } = useEntity();
  
  const [journaux, setJournaux] = useState([]);
  const [filteredJournaux, setFilteredJournaux] = useState([]);
  const [journalTypes, setJournalTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedJournalIds, setSelectedJournalIds] = useState([]);
  const [activeRowId, setActiveRowId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);
  
  // États pour la recherche
  const [searchText, setSearchText] = useState('');
  const [activeFilters, setActiveFilters] = useState([]);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [showColumnsMenu, setShowColumnsMenu] = useState(false);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [columnsMenuPosition, setColumnsMenuPosition] = useState({ top: 0, left: 0 });
  const filterMenuRef = React.useRef(null);
  const actionsMenuRef = React.useRef(null);
  const searchContainerRef = React.useRef(null);
  
  // États pour les colonnes visibles
  const [visibleColumns, setVisibleColumns] = useState({
    code: true,
    nom: true,
    type: true,
    compte: true,
    banque: true,
    statut: true
  });
  
  // États pour le tri
  const [sortColumn, setSortColumn] = useState('code');
  const [sortDirection, setSortDirection] = useState('asc');
  
  const [entityFilter, setEntityFilter] = useState(activeEntity?.id || '');
  const [showEntityFilter, setShowEntityFilter] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Fermer les menus au clic extérieur
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterMenuRef.current && !filterMenuRef.current.contains(event.target)) {
        setShowFilterMenu(false);
      }
      if (actionsMenuRef.current && !actionsMenuRef.current.contains(event.target)) {
        setShowActionsMenu(false);
      }
      const columnsMenuElement = document.getElementById('columns-menu');
      if (columnsMenuElement && !columnsMenuElement.contains(event.target)) {
        const buttonElement = document.querySelector('.columns-menu-button');
        if (buttonElement && !buttonElement.contains(event.target)) {
          setShowColumnsMenu(false);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Synchroniser entityFilter avec activeEntity
  useEffect(() => {
    if (activeEntity) {
      setEntityFilter(activeEntity.id);
      setShowEntityFilter(false);
    }
  }, [activeEntity]);

  // Vérifier si c'est un journal de type Banque
  const isBankType = (journal) => {
    const bankCodes = ['BQ', 'BN', 'BAN', 'BANQUE'];
    const typeCode = journal.type?.code || journal.type_code || '';
    return bankCodes.includes(typeCode) || 
           typeCode === 'BAN' ||
           typeCode === 'BANQUE' ||
           typeCode?.startsWith('BQ') ||
           typeCode?.startsWith('BN');
  };

  // Vérifier si c'est un journal de type Caisse
  const isCashType = (journal) => {
    const cashCodes = ['CA', 'CS', 'CAI', 'CAISSE'];
    const typeCode = journal.type?.code || journal.type_code || '';
    return cashCodes.includes(typeCode) || 
           typeCode?.startsWith('CA') ||
           typeCode?.startsWith('CS');
  };

  // Charger les données
  const loadData = useCallback(async (entityId = null, showRefresh = false) => {
    const targetEntityId = entityId || activeEntity?.id;
    
    if (!targetEntityId) {
      setLoading(false);
      setError('Veuillez sélectionner une entité pour voir les journaux');
      setJournaux([]);
      setFilteredJournaux([]);
      return;
    }

    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    
    try {
      setError(null);
      
      const [journauxRes, typesRes] = await Promise.all([
        apiClient.get(`/compta/journals/?company_id=${targetEntityId}`),
        apiClient.get(`/compta/journal-types/`)
      ]);

      const journauxData = normalizeApiResponse(journauxRes);
      const typesData = normalizeApiResponse(typesRes);

      // Créer un Map pour une recherche plus rapide
      const typesMap = new Map(typesData.map(t => [t.id, t]));

      // Enrichir les journaux avec le type
      const enrichedJournaux = journauxData.map(journal => {
        let typeId = null;
        
        if (journal.type && typeof journal.type === 'object') {
          typeId = journal.type.id;
        } else {
          typeId = journal.type;
        }
        
        const foundType = typesMap.get(typeId);
        
        return {
          ...journal,
          type: foundType || { id: typeId, name: 'Inconnu', code: '??' },
          bank_account_display: journal.bank_account ? getBankAccountLabel(journal.bank_account) : null
        };
      });

      setJournaux(enrichedJournaux);
      setFilteredJournaux(enrichedJournaux);
      setJournalTypes(typesData);
      setActiveRowId(null);
      setSelectedJournalIds([]);
      setCurrentPage(1);
    } catch (err) {
      console.error('Erreur chargement journaux:', err);
      setError(err.message || 'Impossible de charger les journaux.');
      setJournaux([]);
      setFilteredJournaux([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeEntity]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Gestion du changement d'entité
  const handleEntityChange = (entityId) => {
    setEntityFilter(entityId);
    loadData(entityId);
  };

  // Fonction de filtrage
  const applyFiltersToJournaux = (journauxList, filters) => {
    let filtered = [...journauxList];
    
    filters.forEach(filter => {
      filtered = filtered.filter(journal => {
        let fieldValue = '';
        
        switch (filter.field) {
          case 'code':
            fieldValue = journal.code || '';
            break;
          case 'nom':
            fieldValue = journal.name || '';
            break;
          case 'type':
            fieldValue = journal.type?.code || journal.type_code || '';
            break;
          case 'statut':
            fieldValue = journal.active ? 'actif' : 'inactif';
            break;
          case 'recherche':
            fieldValue = `${journal.code} ${journal.name} ${journal.type?.code || ''} ${journal.type?.name || ''}`;
            break;
          default:
            fieldValue = '';
        }
        
        return fieldValue.toLowerCase().includes(filter.value.toLowerCase());
      });
    });
    
    return filtered;
  };

  // Fonction de tri
  const getSortedJournaux = (journauxToSort, column, direction) => {
    return [...journauxToSort].sort((a, b) => {
      let aVal, bVal;
      
      switch (column) {
        case 'code':
          aVal = a.code || '';
          bVal = b.code || '';
          break;
        case 'nom':
          aVal = a.name || '';
          bVal = b.name || '';
          break;
        case 'type':
          aVal = a.type?.code || a.type_code || '';
          bVal = b.type?.code || b.type_code || '';
          break;
        case 'compte':
          aVal = a.default_account?.code || '';
          bVal = b.default_account?.code || '';
          break;
        case 'banque':
          aVal = a.bank_account_display || '';
          bVal = b.bank_account_display || '';
          break;
        case 'statut':
          aVal = a.active ? 1 : 0;
          bVal = b.active ? 1 : 0;
          break;
        default:
          return 0;
      }
      
      if (aVal < bVal) return direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return direction === 'asc' ? 1 : -1;
      return 0;
    });
  };

  // Gestionnaire de tri
  const handleSort = (column) => {
    let newDirection = sortDirection;
    let newColumn = column;
    
    if (sortColumn === column) {
      newDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      newColumn = column;
      newDirection = 'asc';
    }
    
    setSortColumn(newColumn);
    setSortDirection(newDirection);
    
    const sorted = getSortedJournaux(filteredJournaux, newColumn, newDirection);
    setFilteredJournaux(sorted);
  };

  // Appliquer les filtres
  useEffect(() => {
    if (journaux.length > 0) {
      const filtered = applyFiltersToJournaux(journaux, activeFilters);
      const sorted = getSortedJournaux(filtered, sortColumn, sortDirection);
      setFilteredJournaux(sorted);
      setCurrentPage(1);
    }
  }, [journaux, activeFilters]);

  // Re-appliquer le tri
  useEffect(() => {
    if (filteredJournaux.length > 0) {
      const sorted = getSortedJournaux(filteredJournaux, sortColumn, sortDirection);
      setFilteredJournaux(sorted);
    }
  }, [sortColumn, sortDirection]);

  // Ajouter une recherche comme filtre
  const addSearchAsFilter = () => {
    if (searchText.trim()) {
      setActiveFilters([...activeFilters, { field: 'recherche', value: searchText }]);
      setSearchText('');
    }
  };

  // Ajouter un filtre
  const addFilter = (field, value) => {
    setActiveFilters([...activeFilters, { field, value }]);
    setShowFilterMenu(false);
  };

  // Supprimer un filtre
  const removeFilter = (index) => {
    setActiveFilters(activeFilters.filter((_, i) => i !== index));
  };

  // Effacer tous les filtres
  const clearAllFilters = () => {
    setActiveFilters([]);
    setSearchText('');
  };

  const totalPages = Math.ceil(filteredJournaux.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedJournaux = filteredJournaux.slice(startIndex, startIndex + itemsPerPage);

  // Actions groupées
  const handleBulkDelete = async () => {
    if (selectedJournalIds.length === 0) {
      alert('Aucun journal sélectionné');
      return;
    }
    
    if (!window.confirm(`Supprimer ${selectedJournalIds.length} journal/aux ?`)) return;
    
    try {
      setShowActionsMenu(false);
      await Promise.all(selectedJournalIds.map(id => 
        apiClient.delete(`/compta/journals/${id}/`)
      ));
      setSelectedJournalIds([]);
      loadData(entityFilter);
    } catch (err) {
      alert('Erreur suppression groupée: ' + (err.message || 'Erreur inconnue'));
    }
  };

  const handleBulkActivate = async () => {
    if (selectedJournalIds.length === 0) {
      alert('Aucun journal sélectionné');
      return;
    }
    
    try {
      setShowActionsMenu(false);
      await Promise.all(selectedJournalIds.map(id => 
        apiClient.patch(`/compta/journals/${id}/`, { active: true })
      ));
      setSelectedJournalIds([]);
      loadData(entityFilter);
    } catch (err) {
      alert('Erreur activation groupée: ' + (err.message || 'Erreur inconnue'));
    }
  };

  const handleBulkDeactivate = async () => {
    if (selectedJournalIds.length === 0) {
      alert('Aucun journal sélectionné');
      return;
    }
    
    try {
      setShowActionsMenu(false);
      await Promise.all(selectedJournalIds.map(id => 
        apiClient.patch(`/compta/journals/${id}/`, { active: false })
      ));
      setSelectedJournalIds([]);
      loadData(entityFilter);
    } catch (err) {
      alert('Erreur désactivation groupée: ' + (err.message || 'Erreur inconnue'));
    }
  };

  const handleDuplicate = async () => {
    if (selectedJournalIds.length === 0) {
      alert('Aucun journal sélectionné');
      return;
    }
    setShowActionsMenu(false);
    alert('Duplication à implémenter');
  };

  // Rafraîchir les données (appelé automatiquement après actions)
  const refreshData = () => {
    loadData(entityFilter, true);
  };

  // Création
  const handleCreate = () => {
    navigate('/comptabilite/journaux/create');
  };

  // Navigation vers les détails (double-clic)
  const handleRowDoubleClick = (journal) => {
    navigate(`/comptabilite/journaux/${journal.id}`);
  };

  // Navigation vers modification
  const handleEdit = (journal) => {
    navigate(`/comptabilite/journaux/${journal.id}/edit`);
  };

  // Composants d'affichage
  const StateBadge = ({ active }) => {
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
        active
          ? 'bg-green-100 text-green-700'
          : 'bg-gray-100 text-gray-700'
      }`}>
        {active ? <FiCheck size={10} /> : <FiXCircle size={10} />}
        {active ? 'Actif' : 'Inactif'}
      </span>
    );
  };

  const TypeDisplay = ({ journal }) => {
    const isBank = isBankType(journal);
    const isCash = isCashType(journal);
    return (
      <div>
        <div className="font-medium text-sm flex items-center gap-1">
          {isBank && <FiCreditCard size={12} className="text-blue-500" />}
          {isCash && <FiDollarSign size={12} className="text-green-500" />}
          {journal.type?.code || '—'}
        </div>
        <div className="text-xs text-gray-500">{journal.type?.name || ''}</div>
      </div>
    );
  };

  const CompteDisplay = ({ journal }) => {
    if (!journal.default_account) {
      return <span className="text-gray-400 italic text-xs">Non défini</span>;
    }
    return (
      <div>
        <div className="font-medium text-violet-600 font-mono text-xs">
          {journal.default_account.code || '—'}
        </div>
        <div className="text-xs text-gray-500 truncate max-w-[120px]">
          {journal.default_account.name || ''}
        </div>
      </div>
    );
  };

  const BanqueDisplay = ({ journal }) => {
    const isBank = isBankType(journal);
    if (!isBank) return <span className="text-gray-400 italic text-xs">—</span>;
    
    return journal.bank_account_display ? (
      <div>
        <div className="text-xs truncate max-w-[150px]" title={journal.bank_account_display}>
          {journal.bank_account_display}
        </div>
        {journal.import_bank_statements && (
          <div className="text-xs text-blue-600 flex items-center gap-1">
            Import auto
          </div>
        )}
      </div>
    ) : (
      <span className="text-gray-400 italic text-xs">Non défini</span>
    );
  };

  // Définition des colonnes (sans sequences)
  const columns = [
    { id: 'code', label: 'Code', width: '90px' },
    { id: 'nom', label: 'Nom', width: '200px' },
    { id: 'type', label: 'Type', width: '130px' },
    { id: 'compte', label: 'Compte par défaut', width: '160px' },
    { id: 'banque', label: 'Infos bancaires', width: '220px' },
    { id: 'statut', label: 'Statut', width: '85px' }
  ];

  // Pas d'entité disponible
  if (!activeEntity && (!Array.isArray(entities) || entities.length === 0)) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-7xl mx-auto bg-white border border-gray-300">
          <div className="border-b border-gray-300 px-4 py-3">
            <div className="text-lg font-bold text-gray-900">Journaux Comptables</div>
          </div>
          <div className="p-8">
            <div className="bg-yellow-50 border border-yellow-200 rounded p-6 text-center">
              <FiAlertCircle className="text-yellow-600 mx-auto mb-3" size={32} />
              <p className="text-yellow-800 font-medium text-lg mb-3">
                Aucune entité disponible
              </p>
              <p className="text-sm text-gray-600 mb-4">
                Vous devez avoir accès à au moins une entité pour gérer les journaux comptables.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading && journaux.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-7xl mx-auto bg-white border border-gray-300">
          <div className="border-b border-gray-300 px-4 py-3">
            <div className="text-lg font-bold text-gray-900">Journaux Comptables</div>
          </div>
          <div className="p-8 flex items-center justify-center">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="mt-4 text-gray-600 text-sm">Chargement...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-full mx-auto bg-white border border-gray-300">
        
        {/* En-tête */}
        <div className="border-b border-gray-300 px-4 py-2">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-shrink-0">
              <Tooltip text="Créer un nouveau journal">
                <button
                  onClick={handleCreate}
                  className="h-8 px-3 bg-purple-600 text-white text-xs font-medium hover:bg-purple-700 hover:scale-105 transition-all duration-200 rounded flex items-center gap-1"
                >
                  <FiPlus size={12} /> Nouveau journal
                </button>
              </Tooltip>
              <Tooltip text="Actualiser la liste">
                <h1 
                  className="text-lg font-bold text-gray-900 cursor-pointer hover:text-purple-600 hover:scale-105 transition-all duration-200"
                  onClick={refreshData}
                >
                  Journaux Comptables
                </h1>
              </Tooltip>
              
              {/* Menu Actions */}
              <div className="relative" ref={actionsMenuRef}>
                <Tooltip text="Menu des actions">
                  <button
                    onClick={() => setShowActionsMenu(!showActionsMenu)}
                    className="w-8 h-8 rounded-full border border-gray-300 text-gray-700 hover:bg-gray-50 hover:scale-110 hover:shadow-md active:scale-90 transition-all duration-200 flex items-center justify-center"
                  >
                    <FiSettings size={14} />
                  </button>
                </Tooltip>
                {showActionsMenu && (
                  <div className="absolute left-0 mt-1 w-48 bg-white border border-gray-300 shadow-lg rounded z-50">
                    <Tooltip text="Activer les journaux sélectionnés" position="right">
                      <button
                        onClick={handleBulkActivate}
                        className="w-full px-3 py-2 text-xs text-left hover:bg-gray-50 flex items-center gap-2"
                      >
                        <FiCheck size={12} /> Activer
                      </button>
                    </Tooltip>
                    <Tooltip text="Désactiver les journaux sélectionnés" position="right">
                      <button
                        onClick={handleBulkDeactivate}
                        className="w-full px-3 py-2 text-xs text-left hover:bg-gray-50 flex items-center gap-2"
                      >
                        <FiXCircle size={12} /> Désactiver
                      </button>
                    </Tooltip>
                    <Tooltip text="Dupliquer les journaux sélectionnés" position="right">
                      <button
                        onClick={handleDuplicate}
                        className="w-full px-3 py-2 text-xs text-left hover:bg-gray-50 flex items-center gap-2"
                      >
                        <FiCopy size={12} /> Dupliquer
                      </button>
                    </Tooltip>
                    <Tooltip text="Supprimer les journaux sélectionnés" position="right">
                      <button
                        onClick={handleBulkDelete}
                        className="w-full px-3 py-2 text-xs text-left hover:bg-red-50 hover:text-red-600 flex items-center gap-2"
                      >
                        <FiTrash2 size={12} /> Supprimer
                      </button>
                    </Tooltip>
                  </div>
                )}
              </div>

              {/* Filtre entité */}
              {Array.isArray(entities) && entities.length > 1 && (
                <div className="relative">
                  <Tooltip text="Changer d'entité">
                    <button
                      onClick={() => setShowEntityFilter(!showEntityFilter)}
                      className={`h-8 px-3 rounded text-xs font-medium border transition-all duration-200 flex items-center gap-1 ${
                        showEntityFilter 
                          ? 'bg-purple-50 text-purple-700 border-purple-300' 
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <FiFilter size={12} />
                      <span>Entité</span>
                    </button>
                  </Tooltip>
                  
                  {showEntityFilter && (
                    <div className="absolute left-0 mt-1 w-64 bg-white border border-gray-300 shadow-lg rounded z-50">
                      <div className="p-2">
                        <div className="px-3 py-2 text-xs text-gray-500 font-medium mb-1">
                          Sélectionnez une entité
                        </div>
                        {entities.map(entity => (
                          <button
                            key={entity.id}
                            onClick={() => {
                              handleEntityChange(entity.id);
                              setShowEntityFilter(false);
                            }}
                            className={`w-full text-left px-3 py-2 rounded text-sm ${
                              entityFilter === entity.id
                                ? 'bg-purple-100 text-purple-800'
                                : 'hover:bg-gray-100'
                            }`}
                          >
                            <div className="font-medium text-xs">
                              {entity.raison_sociale || entity.nom || entity.name}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* Barre de recherche centrée */}
            <div className="flex-1 flex justify-center">
              <div className="relative w-full max-w-2xl" ref={searchContainerRef}>
                <div className="flex items-center flex-wrap border border-gray-300 rounded bg-white min-h-[38px] p-1">
                  {activeFilters.map((filter, index) => {
                    let displayText = '';
                    let displayColor = '';
                    switch (filter.field) {
                      case 'recherche':
                        displayText = filter.value;
                        displayColor = 'bg-blue-100 text-blue-700';
                        break;
                      case 'statut':
                        displayText = filter.value === 'actif' ? 'Actif' : 'Inactif';
                        displayColor = filter.value === 'actif' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700';
                        break;
                      case 'type':
                        displayText = `Type: ${filter.value}`;
                        displayColor = 'bg-gray-100 text-gray-700';
                        break;
                      default:
                        displayText = `${filter.field}: ${filter.value}`;
                        displayColor = 'bg-gray-100 text-gray-700';
                    }
                    return (
                      <span key={index} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${displayColor} m-0.5`}>
                        {displayText}
                        <button onClick={() => removeFilter(index)} className="hover:text-red-600">
                          <FiX size={10} />
                        </button>
                      </span>
                    );
                  })}
                  
                  <input
                    type="text"
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        addSearchAsFilter();
                      }
                    }}
                    placeholder="Rechercher par code, nom, type..."
                    className="flex-1 px-2 py-1 text-sm focus:outline-none min-w-[120px]"
                  />
                  
                  <div className="relative" ref={filterMenuRef}>
                    <Tooltip text="Ajouter un filtre">
                      <button
                        onClick={() => setShowFilterMenu(!showFilterMenu)}
                        className={`p-1.5 rounded hover:bg-gray-100 ${showFilterMenu ? 'bg-gray-100' : ''}`}
                      >
                        <FiFilter size={14} className={activeFilters.length > 0 ? 'text-purple-600' : 'text-gray-400'} />
                      </button>
                    </Tooltip>
                    
                    {showFilterMenu && (
                      <div className="absolute right-0 mt-1 w-64 bg-white border border-gray-300 shadow-lg rounded z-50">
                        <div className="p-2 border-b border-gray-200">
                          <p className="text-xs font-medium text-gray-700 mb-2">Ajouter un filtre</p>
                          <div className="space-y-2">
                            <button
                              onClick={() => addFilter('statut', 'actif')}
                              className="w-full text-left text-xs px-2 py-1 hover:bg-gray-100 rounded flex items-center gap-2"
                            >
                              <span className="w-20">Statut</span>
                              <span className="text-green-600">= Actif</span>
                            </button>
                            <button
                              onClick={() => addFilter('statut', 'inactif')}
                              className="w-full text-left text-xs px-2 py-1 hover:bg-gray-100 rounded flex items-center gap-2"
                            >
                              <span className="w-20">Statut</span>
                              <span className="text-gray-600">= Inactif</span>
                            </button>
                          </div>
                        </div>
                        <div className="p-2">
                          <p className="text-xs font-medium text-gray-700 mb-2">Type de journal</p>
                          <div className="max-h-40 overflow-y-auto">
                            {journalTypes.slice(0, 10).map((type, idx) => (
                              <button
                                key={idx}
                                onClick={() => addFilter('type', type.code)}
                                className="w-full text-left text-xs px-2 py-1 hover:bg-gray-100 rounded truncate"
                              >
                                {type.code} - {type.name}
                              </button>
                            ))}
                          </div>
                        </div>
                        {activeFilters.length > 0 && (
                          <div className="p-2 border-t border-gray-200">
                            <button
                              onClick={clearAllFilters}
                              className="w-full text-xs text-red-600 hover:text-red-700 text-center py-1"
                            >
                              Effacer tous les filtres
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-xs text-gray-500">Afficher</span>
              <select
                value={itemsPerPage}
                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                className="h-8 px-2 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-purple-500"
              >
                <option value={10}>10</option>
                <option value={15}>15</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span className="text-xs text-gray-500">lignes</span>
            </div>
          </div>
        </div>

        {/* Actions groupées */}
        {selectedJournalIds.length > 0 && (
          <div className="border-b border-gray-300 px-4 py-2 bg-gray-50 flex items-center gap-2">
            <span className="text-xs text-gray-600">{selectedJournalIds.length} journal/aux sélectionné(s)</span>
            <Tooltip text="Activer les journaux sélectionnés">
              <button
                onClick={handleBulkActivate}
                className="h-6 px-2 bg-green-600 text-white text-xs hover:bg-green-700 rounded"
              >
                Activer
              </button>
            </Tooltip>
            <Tooltip text="Désactiver les journaux sélectionnés">
              <button
                onClick={handleBulkDeactivate}
                className="h-6 px-2 bg-gray-600 text-white text-xs hover:bg-gray-700 rounded"
              >
                Désactiver
              </button>
            </Tooltip>
            <Tooltip text="Supprimer les journaux sélectionnés">
              <button
                onClick={handleBulkDelete}
                className="h-6 px-2 bg-red-600 text-white text-xs hover:bg-red-700 rounded"
              >
                Supprimer
              </button>
            </Tooltip>
          </div>
        )}

        {/* Tableau */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-gray-100 border-b border-gray-300">
                <th className="border-r border-gray-300 px-2 py-1.5 w-8 text-center">
                  <input
                    type="checkbox"
                    checked={selectedJournalIds.length === paginatedJournaux.length && paginatedJournaux.length > 0}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedJournalIds(paginatedJournaux.map(j => j.id));
                      } else {
                        setSelectedJournalIds([]);
                      }
                    }}
                    className="w-3.5 h-3.5 cursor-pointer"
                  />
                </th>
                {visibleColumns.code && (
                  <th 
                    className="border-r border-gray-300 px-2 py-1.5 text-left text-xs font-medium text-gray-700 cursor-pointer hover:bg-gray-200 min-w-[90px]"
                    onClick={() => handleSort('code')}
                  >
                    <div className="flex items-center gap-1">
                      <span>Code</span>
                      <SortIcon column="code" sortColumn={sortColumn} sortDirection={sortDirection} />
                    </div>
                  </th>
                )}
                {visibleColumns.nom && (
                  <th 
                    className="border-r border-gray-300 px-2 py-1.5 text-left text-xs font-medium text-gray-700 cursor-pointer hover:bg-gray-200 min-w-[200px]"
                    onClick={() => handleSort('nom')}
                  >
                    <div className="flex items-center gap-1">
                      <span>Nom</span>
                      <SortIcon column="nom" sortColumn={sortColumn} sortDirection={sortDirection} />
                    </div>
                  </th>
                )}
                {visibleColumns.type && (
                  <th 
                    className="border-r border-gray-300 px-2 py-1.5 text-left text-xs font-medium text-gray-700 cursor-pointer hover:bg-gray-200 min-w-[130px]"
                    onClick={() => handleSort('type')}
                  >
                    <div className="flex items-center gap-1">
                      <span>Type</span>
                      <SortIcon column="type" sortColumn={sortColumn} sortDirection={sortDirection} />
                    </div>
                  </th>
                )}
                {visibleColumns.compte && (
                  <th 
                    className="border-r border-gray-300 px-2 py-1.5 text-left text-xs font-medium text-gray-700 cursor-pointer hover:bg-gray-200 min-w-[160px]"
                    onClick={() => handleSort('compte')}
                  >
                    <div className="flex items-center gap-1">
                      <span>Compte par défaut</span>
                      <SortIcon column="compte" sortColumn={sortColumn} sortDirection={sortDirection} />
                    </div>
                  </th>
                )}
                {visibleColumns.banque && (
                  <th 
                    className="border-r border-gray-300 px-2 py-1.5 text-left text-xs font-medium text-gray-700 cursor-pointer hover:bg-gray-200 min-w-[220px]"
                    onClick={() => handleSort('banque')}
                  >
                    <div className="flex items-center gap-1">
                      <span>Infos bancaires</span>
                      <SortIcon column="banque" sortColumn={sortColumn} sortDirection={sortDirection} />
                    </div>
                  </th>
                )}
                {visibleColumns.statut && (
                  <th 
                    className="border-r border-gray-300 px-2 py-1.5 text-left text-xs font-medium text-gray-700 cursor-pointer hover:bg-gray-200 min-w-[85px]"
                    onClick={() => handleSort('statut')}
                  >
                    <div className="flex items-center gap-1">
                      <span>Statut</span>
                      <SortIcon column="statut" sortColumn={sortColumn} sortDirection={sortDirection} />
                    </div>
                  </th>
                )}
                {/* Dernière colonne avec les trois points */}
                <th className="border-l border-gray-300 px-2 py-1.5 w-10 text-center">
                  <Tooltip text="Choisir les colonnes à afficher">
                    <button
                      className="columns-menu-button p-1 rounded hover:bg-gray-200"
                      onClick={(e) => {
                        e.stopPropagation();
                        const rect = e.currentTarget.getBoundingClientRect();
                        setColumnsMenuPosition({
                          top: rect.bottom + window.scrollY + 5,
                          left: rect.right - 200
                        });
                        setShowColumnsMenu(!showColumnsMenu);
                      }}
                    >
                      <FiMoreHorizontal size={16} className="text-gray-500" />
                    </button>
                  </Tooltip>
                </th>
              </tr>
            </thead>
            <tbody>
              {error ? (
                <tr>
                  <td colSpan={Object.values(visibleColumns).filter(v => v).length + 2} className="border border-gray-300 p-4 text-center text-red-600 text-sm">
                    {error}
                  </td>
                </tr>
              ) : paginatedJournaux.length === 0 ? (
                <tr>
                  <td colSpan={Object.values(visibleColumns).filter(v => v).length + 2} className="border border-gray-300 p-8 text-center text-gray-500 text-sm">
                    {activeFilters.length > 0 ? 'Aucun résultat pour ces filtres' : 'Aucun journal comptable'}
                  </td>
                </tr>
              ) : (
                paginatedJournaux.map((journal) => (
                  <tr
                    key={journal.id}
                    className={`hover:bg-gray-50 cursor-pointer transition-colors ${activeRowId === journal.id ? 'bg-purple-50' : ''}`}
                    onClick={() => setActiveRowId(journal.id)}
                    onDoubleClick={() => handleRowDoubleClick(journal)}
                  >
                    <td className="border border-gray-300 px-2 py-1.5 text-center" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedJournalIds.includes(journal.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedJournalIds([...selectedJournalIds, journal.id]);
                          } else {
                            setSelectedJournalIds(selectedJournalIds.filter(id => id !== journal.id));
                          }
                        }}
                        className="w-3.5 h-3.5 cursor-pointer"
                      />
                    </td>
                    {visibleColumns.code && (
                      <td className="border border-gray-300 px-2 py-1.5">
                        <div className="font-semibold text-sm">{journal.code || '—'}</div>
                       </td>
                    )}
                    {visibleColumns.nom && (
                      <td className="border border-gray-300 px-2 py-1.5">
                        <div>
                          <div className="font-medium text-sm">{journal.name || '—'}</div>
                          {journal.email && (
                            <div className="text-xs text-gray-500 truncate max-w-[170px]" title={journal.email}>
                              {journal.email}
                            </div>
                          )}
                        </div>
                       </td>
                    )}
                    {visibleColumns.type && (
                      <td className="border border-gray-300 px-2 py-1.5">
                        <TypeDisplay journal={journal} />
                       </td>
                    )}
                    {visibleColumns.compte && (
                      <td className="border border-gray-300 px-2 py-1.5">
                        <CompteDisplay journal={journal} />
                       </td>
                    )}
                    {visibleColumns.banque && (
                      <td className="border border-gray-300 px-2 py-1.5">
                        <BanqueDisplay journal={journal} />
                       </td>
                    )}
                    {visibleColumns.statut && (
                      <td className="border border-gray-300 px-2 py-1.5">
                        <StateBadge active={journal.active} />
                       </td>
                    )}
                    <td className="border border-gray-300 px-2 py-1.5"> </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Menu colonnes flottant */}
        {showColumnsMenu && (
          <div 
            id="columns-menu"
            className="fixed bg-white border border-gray-300 shadow-lg rounded z-50"
            style={{ top: columnsMenuPosition.top, left: columnsMenuPosition.left, width: '200px' }}
          >
            <div className="p-2 border-b border-gray-200">
              <p className="text-xs font-medium text-gray-700 mb-2">Colonnes à afficher</p>
              {columns.map(col => (
                <label key={col.id} className="flex items-center gap-2 py-1 px-2 hover:bg-gray-50 rounded cursor-pointer">
                  <input
                    type="checkbox"
                    checked={visibleColumns[col.id]}
                    onChange={() => setVisibleColumns({ ...visibleColumns, [col.id]: !visibleColumns[col.id] })}
                    className="w-3.5 h-3.5 cursor-pointer"
                  />
                  <span className="text-xs">{col.label}</span>
                </label>
              ))}
            </div>
            <div className="p-2">
              <button
                onClick={() => {
                  const allTrue = {};
                  columns.forEach(col => { allTrue[col.id] = true; });
                  setVisibleColumns(allTrue);
                }}
                className="w-full text-xs text-purple-600 hover:text-purple-700 text-center py-1"
              >
                Tout afficher
              </button>
              <button
                onClick={() => {
                  const allFalse = {};
                  columns.forEach(col => { allFalse[col.id] = false; });
                  setVisibleColumns(allFalse);
                }}
                className="w-full text-xs text-gray-500 hover:text-gray-600 text-center py-1"
              >
                Tout masquer
              </button>
            </div>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="border-t border-gray-300 px-4 py-2 flex items-center justify-between">
            <div className="text-xs text-gray-500">
              Page {currentPage} sur {totalPages}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="p-1 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FiChevronsLeft size={14} />
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="p-1 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FiChevronLeft size={14} />
              </button>
              <span className="px-2 text-xs text-gray-700">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="p-1 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FiChevronRight size={14} />
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="p-1 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FiChevronsRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}