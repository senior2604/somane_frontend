// src/features/vente/pages/CommandesClient/List.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiPlus, FiFilter, FiX, FiChevronLeft, FiChevronRight,
  FiChevronsLeft, FiChevronsRight, FiArrowUp, FiArrowDown,
  FiAlertCircle, FiSettings, FiCopy, FiTrash2, FiMoreHorizontal
} from 'react-icons/fi';
import { useEntity } from '../../../../context/EntityContext';
import { commandesService, referentielsService, formatAmount } from '../../services';

// ==========================================
// COMPOSANT TOOLTIP (identique à Comptabilité)
// ==========================================
const Tooltip = ({ children, text, position = 'top' }) => {
  const [show, setShow] = useState(false);
  return (
    <div className="relative inline-block">
      <div onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
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
// COMPOSANT PRINCIPAL
// ==========================================
export default function CommandesClientList() {
  const navigate = useNavigate();
  const { activeEntity } = useEntity();
  
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedOrderIds, setSelectedOrderIds] = useState([]);
  const [activeRowId, setActiveRowId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);
  
  // Recherche & filtres
  const [searchText, setSearchText] = useState('');
  const [activeFilters, setActiveFilters] = useState([]);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [showColumnsMenu, setShowColumnsMenu] = useState(false);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [columnsMenuPosition, setColumnsMenuPosition] = useState({ top: 0, left: 0 });
  const filterMenuRef = useRef(null);
  const actionsMenuRef = useRef(null);
  
  // Colonnes visibles (alignées sur Excel)
  const [visibleColumns, setVisibleColumns] = useState({
    date_order: true,
    name: true,
    client: true,
    client_order_ref: true,
    team: true,
    amount_untaxed: true,
    amount_total: true,
    state: true,
    invoice_status: true,
    delivery_status: true
  });
  
  // Tri
  const [sortColumn, setSortColumn] = useState('date_order');
  const [sortDirection, setSortDirection] = useState('desc');
  
  // Référentiels
  const [partnersMap, setPartnersMap] = useState({});
  const [teamsMap, setTeamsMap] = useState({});
  const [currenciesMap, setCurrenciesMap] = useState({});
  const [referentialsLoaded, setReferentialsLoaded] = useState(false);
  const [partnerList, setPartnerList] = useState([]);

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

  // Charger les référentiels (sans bloquer l'UI)
  useEffect(() => {
    if (!activeEntity) {
      setError('Veuillez sélectionner une entité pour voir les commandes');
      // Ne pas bloquer : setLoading(false) sera appelé après loadData
      return;
    }
    
    const loadReferentials = async () => {
      try {
        // Partenaires
        const partners = await referentielsService.getPartners(activeEntity.id);
        const partnersObj = {};
        const partnerNames = [];
        partners.forEach(p => { 
          const name = p.raison_sociale || p.nom || p.name || 'Client';
          partnersObj[p.id] = { ...p, displayName: name };
          partnerNames.push(name);
        });
        setPartnersMap(partnersObj);
        setPartnerList(partnerNames);
        
        // Équipes
        const teams = await referentielsService.getTeams?.() || [];
        const teamsObj = {};
        teams.forEach(t => { teamsObj[t.id] = t; });
        setTeamsMap(teamsObj);
        
        // Devises
        const currencies = await referentielsService.getCurrencies?.() || [];
        const currenciesObj = {};
        currencies.forEach(c => { currenciesObj[c.id] = c; });
        setCurrenciesMap(currenciesObj);
        
        setReferentialsLoaded(true);
        
      } catch (err) {
        console.error('❌ Erreur chargement référentiels ventes:', err);
      }
    };
    
    loadReferentials();
  }, [activeEntity]);

  // Charger les commandes
  const loadData = useCallback(async () => {
    // Guard conditionnel (ne bloque pas l'UI)
    if (!activeEntity) {
      if (!referentialsLoaded) setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const ordersData = await commandesService.getAll(activeEntity.id);
      const ordersList = Array.isArray(ordersData) ? ordersData : ordersData.results || [];
      
      const enrichedOrders = ordersList.map(order => ({
        ...order,
        partner_detail: order.partner_id ? partnersMap[order.partner_id] : null,
        team_detail: order.team_id ? teamsMap[order.team_id] : null,
        currency_detail: order.currency_id ? currenciesMap[order.currency_id] : null,
      }));

      setOrders(enrichedOrders);
      setFilteredOrders(enrichedOrders);
      setActiveRowId(null);
      setCurrentPage(1);
      
    } catch (err) {
      console.error('❌ Erreur chargement commandes:', err);
      setError('Impossible de charger les commandes client.');
    } finally {
      setLoading(false);
    }
  }, [activeEntity, referentialsLoaded, partnersMap, teamsMap, currenciesMap]);

  // Recharger quand les référentiels sont prêts
  useEffect(() => {
    if (referentialsLoaded && activeEntity) {
      loadData();
    }
  }, [referentialsLoaded, activeEntity, loadData]);

  // ==========================================
  // FILTRAGE & TRI
  // ==========================================
  const applyFilters = (list, filters) => {
    let filtered = [...list];
    filters.forEach(filter => {
      filtered = filtered.filter(item => {
        let fieldValue = '';
        switch (filter.field) {
          case 'date_order': fieldValue = item.date_order || ''; break;
          case 'name': fieldValue = item.name || ''; break;
          case 'client': fieldValue = item.partner_detail?.displayName || ''; break;
          case 'client_order_ref': fieldValue = item.client_order_ref || ''; break;
          case 'team': fieldValue = item.team_detail?.name || ''; break;
          case 'amount_untaxed': fieldValue = (item.amount_untaxed || 0).toString(); break;
          case 'amount_total': fieldValue = (item.amount_total || 0).toString(); break;
          case 'state': fieldValue = item.state || ''; break;
          case 'invoice_status': fieldValue = item.invoice_status || ''; break;
          case 'delivery_status': fieldValue = item.delivery_status || ''; break;
          case 'recherche':
            fieldValue = `${item.name} ${item.client_order_ref} ${item.partner_detail?.displayName || ''}`;
            break;
          default: fieldValue = '';
        }
        return fieldValue.toLowerCase().includes(filter.value.toLowerCase());
      });
    });
    return filtered;
  };

  const getSortedOrders = (list, column, direction) => {
    return [...list].sort((a, b) => {
      let aVal, bVal;
      switch (column) {
        case 'date_order': aVal = a.date_order || ''; bVal = b.date_order || ''; break;
        case 'name': aVal = a.name || ''; bVal = b.name || ''; break;
        case 'client': aVal = a.partner_detail?.displayName || ''; bVal = b.partner_detail?.displayName || ''; break;
        case 'client_order_ref': aVal = a.client_order_ref || ''; bVal = b.client_order_ref || ''; break;
        case 'team': aVal = a.team_detail?.name || ''; bVal = b.team_detail?.name || ''; break;
        case 'amount_untaxed': aVal = a.amount_untaxed || 0; bVal = b.amount_untaxed || 0; break;
        case 'amount_total': aVal = a.amount_total || 0; bVal = b.amount_total || 0; break;
        case 'state': aVal = a.state || ''; bVal = b.state || ''; break;
        case 'invoice_status': aVal = a.invoice_status || ''; bVal = b.invoice_status || ''; break;
        case 'delivery_status': aVal = a.delivery_status || ''; bVal = b.delivery_status || ''; break;
        default: return 0;
      }
      if (aVal < bVal) return direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return direction === 'asc' ? 1 : -1;
      return 0;
    });
  };

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
    const sorted = getSortedOrders(filteredOrders, newColumn, newDirection);
    setFilteredOrders(sorted);
  };

  // Appliquer les filtres
  useEffect(() => {
    if (orders.length > 0) {
      const filtered = applyFilters(orders, activeFilters);
      const sorted = getSortedOrders(filtered, sortColumn, sortDirection);
      setFilteredOrders(sorted);
      setCurrentPage(1);
    }
  }, [orders, activeFilters]);

  useEffect(() => {
    if (filteredOrders.length > 0) {
      const sorted = getSortedOrders(filteredOrders, sortColumn, sortDirection);
      setFilteredOrders(sorted);
    }
  }, [sortColumn, sortDirection]);

  const addSearchAsFilter = () => {
    if (searchText.trim()) {
      setActiveFilters([...activeFilters, { field: 'recherche', value: searchText }]);
      setSearchText('');
    }
  };

  const addFilter = (field, value) => {
    setActiveFilters([...activeFilters, { field, value }]);
    setShowFilterMenu(false);
  };

  const removeFilter = (index) => {
    setActiveFilters(activeFilters.filter((_, i) => i !== index));
  };

  const clearAllFilters = () => {
    setActiveFilters([]);
    setSearchText('');
  };

  // Pagination
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedOrders = filteredOrders.slice(startIndex, startIndex + itemsPerPage);

  // Actions groupées
  const handleBulkConfirm = async () => {
    if (selectedOrderIds.length === 0) return;
    if (!window.confirm(`Confirmer ${selectedOrderIds.length} commande(s) ?`)) return;
    try {
      for (const id of selectedOrderIds) {
        await commandesService.confirm(id, activeEntity?.id);
      }
      setSelectedOrderIds([]);
      loadData();
    } catch (err) {
      alert('Erreur: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleBulkCancel = async () => {
    if (selectedOrderIds.length === 0) return;
    if (!window.confirm(`Annuler ${selectedOrderIds.length} commande(s) ?`)) return;
    try {
      for (const id of selectedOrderIds) {
        await commandesService.cancel(id, activeEntity?.id);
      }
      setSelectedOrderIds([]);
      loadData();
    } catch (err) {
      alert('Erreur: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleDuplicate = () => {
    if (selectedOrderIds.length === 0) { alert('Aucune commande sélectionnée'); return; }
    setShowActionsMenu(false);
    alert('Duplication à implémenter');
  };

  const handleDelete = async () => {
    if (selectedOrderIds.length === 0) { alert('Aucune commande sélectionnée'); return; }
    if (!window.confirm(`Supprimer ${selectedOrderIds.length} commande(s) ?`)) return;
    setShowActionsMenu(false);
    try {
      for (const id of selectedOrderIds) {
        await commandesService.delete(id, activeEntity?.id);
      }
      setSelectedOrderIds([]);
      loadData();
    } catch (err) {
      alert('Erreur: ' + (err.response?.data?.error || err.message));
    }
  };

  // Composants d'affichage (badges)
  const ClientDisplay = ({ partner }) => {
    if (!partner) return <span className="text-gray-400 text-xs">—</span>;
    return (
      <div className="text-xs leading-tight">
        <div className="font-medium truncate max-w-[130px]">{partner.displayName || partner.name || 'Client'}</div>
        {partner.email && <div className="text-gray-400 text-[10px] truncate max-w-[130px]">{partner.email}</div>}
      </div>
    );
  };

  const StateBadge = ({ state }) => {
    const config = {
      draft: { text: 'Devis', cls: 'bg-amber-100 text-amber-700' },
      sent: { text: 'Envoyé', cls: 'bg-blue-100 text-blue-700' },
      sale: { text: 'Confirmé', cls: 'bg-emerald-100 text-emerald-700' },
      done: { text: 'Terminé', cls: 'bg-gray-100 text-gray-700' },
      cancel: { text: 'Annulé', cls: 'bg-red-100 text-red-700' }
    }[state] || { text: state || 'Inconnu', cls: 'bg-gray-100 text-gray-700' };
    return (
      <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium ${config.cls}`}>
        {config.text}
      </span>
    );
  };

  const InvoiceStatusBadge = ({ status }) => {
    const config = {
      no: { text: 'Non facturé', cls: 'bg-gray-100 text-gray-700' },
      to_invoice: { text: 'À facturer', cls: 'bg-yellow-100 text-yellow-700' },
      invoiced: { text: 'Facturé', cls: 'bg-green-100 text-green-700' }
    }[status] || { text: status || '—', cls: 'bg-gray-100 text-gray-700' };
    return (
      <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium ${config.cls}`}>
        {config.text}
      </span>
    );
  };

  const DeliveryStatusBadge = ({ status }) => {
    const config = {
      no: { text: 'Non livré', cls: 'bg-gray-100 text-gray-700' },
      partial: { text: 'Partiel', cls: 'bg-yellow-100 text-yellow-700' },
      full: { text: 'Livré', cls: 'bg-green-100 text-green-700' }
    }[status] || { text: status || '—', cls: 'bg-gray-100 text-gray-700' };
    return (
      <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium ${config.cls}`}>
        {config.text}
      </span>
    );
  };

  // Colonnes (alignées sur Excel)
  const columns = [
    { id: 'date_order', label: 'Date', width: '85px' },
    { id: 'name', label: 'N° Commande', width: '130px' },
    { id: 'client', label: 'Client', width: '140px' },
    { id: 'client_order_ref', label: 'Réf. Client', width: '90px' },
    { id: 'team', label: 'Équipe', width: '100px' },
    { id: 'amount_untaxed', label: 'HT', width: '90px', align: 'right' },
    { id: 'amount_total', label: 'TTC', width: '90px', align: 'right' },
    { id: 'state', label: 'État', width: '85px' },
    { id: 'invoice_status', label: 'Facturation', width: '90px' },
    { id: 'delivery_status', label: 'Livraison', width: '80px' }
  ];

  const getCurrencyCode = (order) => {
    if (order.currency_detail?.code) return order.currency_detail.code;
    if (order.currency_id && currenciesMap[order.currency_id]) return currenciesMap[order.currency_id].code;
    return 'XOF';
  };

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  // Rendu : Message si pas d'entité (mais sans bloquer)
  if (!activeEntity && !loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-7xl mx-auto bg-white border border-gray-300">
          <div className="border-b border-gray-300 px-4 py-3">
            <div className="text-lg font-bold text-gray-900">Commandes Client</div>
          </div>
          <div className="p-8">
            <div className="bg-yellow-50 border border-yellow-200 rounded p-6 text-center">
              <FiAlertCircle className="text-yellow-600 mx-auto mb-3" size={32} />
              <p className="text-yellow-800 font-medium text-lg mb-3">Aucune entité sélectionnée</p>
              <p className="text-sm text-gray-600 mb-4">Veuillez sélectionner une entité pour voir les commandes.</p>
              <button
                onClick={() => navigate('/select-entite')}
                className="px-4 py-2 bg-violet-600 text-white text-sm rounded hover:bg-violet-700"
              >
                Sélectionner une entité
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading && orders.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-7xl mx-auto bg-white border border-gray-300">
          <div className="border-b border-gray-300 px-4 py-3">
            <div className="text-lg font-bold text-gray-900">Commandes Client</div>
          </div>
          <div className="p-8 flex items-center justify-center">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-violet-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
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
              <Tooltip text="Créer une nouvelle commande">
                <button
                  onClick={() => navigate('/vente/commandes/create')}
                  className="h-8 px-3 bg-violet-600 text-white text-xs font-medium hover:bg-violet-700 hover:scale-105 transition-all duration-200 rounded flex items-center gap-1"
                >
                  <FiPlus size={12} /> Nouvelle commande
                </button>
              </Tooltip>
              <Tooltip text="Actualiser la liste">
                <h1 
                  className="text-lg font-bold text-gray-900 cursor-pointer hover:text-violet-600 hover:scale-105 transition-all duration-200"
                  onClick={loadData}
                >
                  Commandes Client
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
                    <Tooltip text="Dupliquer les commandes sélectionnées" position="right">
                      <button onClick={handleDuplicate} className="w-full px-3 py-2 text-xs text-left hover:bg-gray-50 flex items-center gap-2">
                        <FiCopy size={12} /> Dupliquer
                      </button>
                    </Tooltip>
                    <Tooltip text="Supprimer les commandes sélectionnées" position="right">
                      <button onClick={handleDelete} className="w-full px-3 py-2 text-xs text-left hover:bg-red-50 hover:text-red-600 flex items-center gap-2">
                        <FiTrash2 size={12} /> Supprimer
                      </button>
                    </Tooltip>
                  </div>
                )}
              </div>
            </div>
            
            {/* Barre de recherche */}
            <div className="flex-1 flex justify-center">
              <div className="relative w-full max-w-2xl">
                <div className="flex items-center flex-wrap border border-gray-300 rounded bg-white min-h-[38px] p-1">
                  {activeFilters.map((filter, index) => {
                    let displayText = '';
                    let displayColor = '';
                    switch (filter.field) {
                      case 'recherche': displayText = filter.value; displayColor = 'bg-blue-100 text-blue-700'; break;
                      case 'state':
                        const stateLabels = { draft: 'Devis', sent: 'Envoyé', sale: 'Confirmé', done: 'Terminé', cancel: 'Annulé' };
                        displayText = `État: ${stateLabels[filter.value] || filter.value}`;
                        displayColor = filter.value === 'sale' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700';
                        break;
                      case 'invoice_status':
                        const invLabels = { no: 'Non facturé', to_invoice: 'À facturer', invoiced: 'Facturé' };
                        displayText = `Facturation: ${invLabels[filter.value] || filter.value}`;
                        displayColor = filter.value === 'invoiced' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700';
                        break;
                      case 'delivery_status':
                        const delLabels = { no: 'Non livré', partial: 'Partiel', full: 'Livré' };
                        displayText = `Livraison: ${delLabels[filter.value] || filter.value}`;
                        displayColor = filter.value === 'full' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700';
                        break;
                      case 'client': displayText = `Client: ${filter.value}`; displayColor = 'bg-gray-100 text-gray-700'; break;
                      default: displayText = `${filter.field}: ${filter.value}`; displayColor = 'bg-gray-100 text-gray-700';
                    }
                    return (
                      <span key={index} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${displayColor} m-0.5`}>
                        {displayText}
                        <button onClick={() => removeFilter(index)} className="hover:text-red-600"><FiX size={10} /></button>
                      </span>
                    );
                  })}
                  <input
                    type="text"
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') addSearchAsFilter(); }}
                    placeholder="Rechercher..."
                    className="flex-1 px-2 py-1 text-sm focus:outline-none min-w-[120px]"
                  />
                  <div className="relative" ref={filterMenuRef}>
                    <Tooltip text="Ajouter un filtre">
                      <button
                        onClick={() => setShowFilterMenu(!showFilterMenu)}
                        className={`p-1.5 rounded hover:bg-gray-100 ${showFilterMenu ? 'bg-gray-100' : ''}`}
                      >
                        <FiFilter size={14} className={activeFilters.length > 0 ? 'text-violet-600' : 'text-gray-400'} />
                      </button>
                    </Tooltip>
                    {showFilterMenu && (
                      <div className="absolute right-0 mt-1 w-64 bg-white border border-gray-300 shadow-lg rounded z-50">
                        <div className="p-2 border-b border-gray-200">
                          <p className="text-xs font-medium text-gray-700 mb-2">Ajouter un filtre</p>
                          <div className="space-y-2">
                            <button onClick={() => addFilter('state', 'draft')} className="w-full text-left text-xs px-2 py-1 hover:bg-gray-100 rounded flex items-center gap-2">
                              <span className="w-20">État</span><span className="text-amber-600">= Devis</span>
                            </button>
                            <button onClick={() => addFilter('state', 'sale')} className="w-full text-left text-xs px-2 py-1 hover:bg-gray-100 rounded flex items-center gap-2">
                              <span className="w-20">État</span><span className="text-emerald-600">= Confirmé</span>
                            </button>
                            <button onClick={() => addFilter('invoice_status', 'to_invoice')} className="w-full text-left text-xs px-2 py-1 hover:bg-gray-100 rounded flex items-center gap-2">
                              <span className="w-20">Facturation</span><span className="text-yellow-600">= À facturer</span>
                            </button>
                            <button onClick={() => addFilter('invoice_status', 'invoiced')} className="w-full text-left text-xs px-2 py-1 hover:bg-gray-100 rounded flex items-center gap-2">
                              <span className="w-20">Facturation</span><span className="text-green-600">= Facturé</span>
                            </button>
                            <button onClick={() => addFilter('delivery_status', 'full')} className="w-full text-left text-xs px-2 py-1 hover:bg-gray-100 rounded flex items-center gap-2">
                              <span className="w-20">Livraison</span><span className="text-green-600">= Livré</span>
                            </button>
                          </div>
                        </div>
                        <div className="p-2">
                          <p className="text-xs font-medium text-gray-700 mb-2">Client</p>
                          <div className="max-h-40 overflow-y-auto">
                            {partnerList.slice(0, 10).map((partner, idx) => (
                              <button key={idx} onClick={() => addFilter('client', partner)} className="w-full text-left text-xs px-2 py-1 hover:bg-gray-100 rounded truncate">
                                {partner}
                              </button>
                            ))}
                          </div>
                        </div>
                        {activeFilters.length > 0 && (
                          <div className="p-2 border-t border-gray-200">
                            <button onClick={clearAllFilters} className="w-full text-xs text-red-600 hover:text-red-700 text-center py-1">
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
                className="h-8 px-2 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-violet-500"
              >
                <option value={10}>10</option>
                <option value={15}>15</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
              <span className="text-xs text-gray-500">lignes</span>
            </div>
          </div>
        </div>

        {/* Actions groupées */}
        {selectedOrderIds.length > 0 && (
          <div className="border-b border-gray-300 px-4 py-2 bg-gray-50 flex items-center gap-2">
            <span className="text-xs text-gray-600">{selectedOrderIds.length} commande(s) sélectionnée(s)</span>
            <Tooltip text="Confirmer les commandes sélectionnées">
              <button onClick={handleBulkConfirm} className="h-6 px-2 bg-emerald-600 text-white text-xs hover:bg-emerald-700 rounded">
                Confirmer
              </button>
            </Tooltip>
            <Tooltip text="Annuler les commandes sélectionnées">
              <button onClick={handleBulkCancel} className="h-6 px-2 bg-red-600 text-white text-xs hover:bg-red-700 rounded">
                Annuler
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
                    checked={selectedOrderIds.length === paginatedOrders.length && paginatedOrders.length > 0}
                    onChange={(e) => setSelectedOrderIds(e.target.checked ? paginatedOrders.map(o => o.id) : [])}
                    className="w-3.5 h-3.5 cursor-pointer"
                  />
                </th>
                {visibleColumns.date_order && (
                  <th className="border-r border-gray-300 px-2 py-1.5 text-left text-xs font-medium text-gray-700 cursor-pointer hover:bg-gray-200 min-w-[85px]" onClick={() => handleSort('date_order')}>
                    <div className="flex items-center gap-1"><span>Date</span><SortIcon column="date_order" sortColumn={sortColumn} sortDirection={sortDirection} /></div>
                  </th>
                )}
                {visibleColumns.name && (
                  <th className="border-r border-gray-300 px-2 py-1.5 text-left text-xs font-medium text-gray-700 cursor-pointer hover:bg-gray-200 min-w-[130px]" onClick={() => handleSort('name')}>
                    <div className="flex items-center gap-1"><span>N° Commande</span><SortIcon column="name" sortColumn={sortColumn} sortDirection={sortDirection} /></div>
                  </th>
                )}
                {visibleColumns.client && (
                  <th className="border-r border-gray-300 px-2 py-1.5 text-left text-xs font-medium text-gray-700 cursor-pointer hover:bg-gray-200 min-w-[140px]" onClick={() => handleSort('client')}>
                    <div className="flex items-center gap-1"><span>Client</span><SortIcon column="client" sortColumn={sortColumn} sortDirection={sortDirection} /></div>
                  </th>
                )}
                {visibleColumns.client_order_ref && (
                  <th className="border-r border-gray-300 px-2 py-1.5 text-left text-xs font-medium text-gray-700 cursor-pointer hover:bg-gray-200 min-w-[90px]" onClick={() => handleSort('client_order_ref')}>
                    <div className="flex items-center gap-1"><span>Réf. Client</span><SortIcon column="client_order_ref" sortColumn={sortColumn} sortDirection={sortDirection} /></div>
                  </th>
                )}
                {visibleColumns.team && (
                  <th className="border-r border-gray-300 px-2 py-1.5 text-left text-xs font-medium text-gray-700 cursor-pointer hover:bg-gray-200 min-w-[100px]" onClick={() => handleSort('team')}>
                    <div className="flex items-center gap-1"><span>Équipe</span><SortIcon column="team" sortColumn={sortColumn} sortDirection={sortDirection} /></div>
                  </th>
                )}
                {visibleColumns.amount_untaxed && (
                  <th className="border-r border-gray-300 px-2 py-1.5 text-right text-xs font-medium text-gray-700 cursor-pointer hover:bg-gray-200 min-w-[90px]" onClick={() => handleSort('amount_untaxed')}>
                    <div className="flex items-center justify-end gap-1"><span>HT</span><SortIcon column="amount_untaxed" sortColumn={sortColumn} sortDirection={sortDirection} /></div>
                  </th>
                )}
                {visibleColumns.amount_total && (
                  <th className="border-r border-gray-300 px-2 py-1.5 text-right text-xs font-medium text-gray-700 cursor-pointer hover:bg-gray-200 min-w-[90px]" onClick={() => handleSort('amount_total')}>
                    <div className="flex items-center justify-end gap-1"><span>TTC</span><SortIcon column="amount_total" sortColumn={sortColumn} sortDirection={sortDirection} /></div>
                  </th>
                )}
                {visibleColumns.state && (
                  <th className="border-r border-gray-300 px-2 py-1.5 text-left text-xs font-medium text-gray-700 cursor-pointer hover:bg-gray-200 min-w-[85px]" onClick={() => handleSort('state')}>
                    <div className="flex items-center gap-1"><span>État</span><SortIcon column="state" sortColumn={sortColumn} sortDirection={sortDirection} /></div>
                  </th>
                )}
                {visibleColumns.invoice_status && (
                  <th className="border-r border-gray-300 px-2 py-1.5 text-left text-xs font-medium text-gray-700 cursor-pointer hover:bg-gray-200 min-w-[90px]" onClick={() => handleSort('invoice_status')}>
                    <div className="flex items-center gap-1"><span>Facturation</span><SortIcon column="invoice_status" sortColumn={sortColumn} sortDirection={sortDirection} /></div>
                  </th>
                )}
                {visibleColumns.delivery_status && (
                  <th className="border-r border-gray-300 px-2 py-1.5 text-left text-xs font-medium text-gray-700 cursor-pointer hover:bg-gray-200 min-w-[80px]" onClick={() => handleSort('delivery_status')}>
                    <div className="flex items-center gap-1"><span>Livraison</span><SortIcon column="delivery_status" sortColumn={sortColumn} sortDirection={sortDirection} /></div>
                  </th>
                )}
                {/* Menu colonnes */}
                <th className="border-l border-gray-300 px-2 py-1.5 w-10 text-center">
                  <Tooltip text="Choisir les colonnes à afficher">
                    <button
                      className="columns-menu-button p-1 rounded hover:bg-gray-200"
                      onClick={(e) => {
                        e.stopPropagation();
                        const rect = e.currentTarget.getBoundingClientRect();
                        setColumnsMenuPosition({ top: rect.bottom + window.scrollY + 5, left: rect.right - 200 });
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
                <tr><td colSpan={Object.values(visibleColumns).filter(v => v).length + 2} className="border border-gray-300 p-4 text-center text-red-600 text-sm">{error}</td></tr>
              ) : paginatedOrders.length === 0 ? (
                <tr><td colSpan={Object.values(visibleColumns).filter(v => v).length + 2} className="border border-gray-300 p-8 text-center text-gray-500 text-sm">{activeFilters.length > 0 ? 'Aucun résultat pour ces filtres' : 'Aucune commande client'}</td></tr>
              ) : (
                paginatedOrders.map((order) => (
                  <tr
                    key={order.id}
                    className={`hover:bg-gray-50 cursor-pointer transition-colors ${activeRowId === order.id ? 'bg-violet-50' : ''}`}
                    onClick={() => setActiveRowId(order.id)}
                    onDoubleClick={() => navigate(`/vente/commandes/${order.id}`)}
                  >
                    <td className="border border-gray-300 px-2 py-1.5 text-center" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedOrderIds.includes(order.id)}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedOrderIds([...selectedOrderIds, order.id]);
                          else setSelectedOrderIds(selectedOrderIds.filter(id => id !== order.id));
                        }}
                        className="w-3.5 h-3.5 cursor-pointer"
                      />
                    </td>
                    {visibleColumns.date_order && (
                      <td className="border border-gray-300 px-2 py-1.5 text-xs text-gray-700">{formatDate(order.date_order)}</td>
                    )}
                    {visibleColumns.name && (
                      <td className="border border-gray-300 px-2 py-1.5">
                        <div className="text-xs"><div className="font-medium truncate max-w-[100px]">{order.name || '—'}</div></div>
                      </td>
                    )}
                    {visibleColumns.client && (
                      <td className="border border-gray-300 px-2 py-1.5"><ClientDisplay partner={order.partner_detail} /></td>
                    )}
                    {visibleColumns.client_order_ref && (
                      <td className="border border-gray-300 px-2 py-1.5 text-xs text-gray-700 truncate max-w-[80px]" title={order.client_order_ref}>
                        {order.client_order_ref || '—'}
                      </td>
                    )}
                    {visibleColumns.team && (
                      <td className="border border-gray-300 px-2 py-1.5 text-xs text-gray-700 truncate max-w-[90px]">
                        {order.team_detail?.name || order.team_name || '—'}
                      </td>
                    )}
                    {visibleColumns.amount_untaxed && (
                      <td className="border border-gray-300 px-2 py-1.5 text-right text-xs">
                        {formatAmount(order.amount_untaxed)}
                        <span className="text-gray-400 text-[10px] ml-1">{getCurrencyCode(order)}</span>
                      </td>
                    )}
                    {visibleColumns.amount_total && (
                      <td className="border border-gray-300 px-2 py-1.5 text-right text-xs text-violet-600 font-medium">
                        {formatAmount(order.amount_total)}
                        <span className="text-gray-400 text-[10px] ml-1">{getCurrencyCode(order)}</span>
                      </td>
                    )}
                    {visibleColumns.state && (<td className="border border-gray-300 px-2 py-1.5"><StateBadge state={order.state} /></td>)}
                    {visibleColumns.invoice_status && (<td className="border border-gray-300 px-2 py-1.5"><InvoiceStatusBadge status={order.invoice_status} /></td>)}
                    {visibleColumns.delivery_status && (<td className="border border-gray-300 px-2 py-1.5"><DeliveryStatusBadge status={order.delivery_status} /></td>)}
                    <td className="border border-gray-300 px-2 py-1.5"></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Menu colonnes flottant */}
        {showColumnsMenu && (
          <div id="columns-menu" className="fixed bg-white border border-gray-300 shadow-lg rounded z-50" style={{ top: columnsMenuPosition.top, left: columnsMenuPosition.left, width: '200px' }}>
            <div className="p-2 border-b border-gray-200">
              <p className="text-xs font-medium text-gray-700 mb-2">Colonnes à afficher</p>
              {columns.map(col => (
                <label key={col.id} className="flex items-center gap-2 py-1 px-2 hover:bg-gray-50 rounded cursor-pointer">
                  <input type="checkbox" checked={visibleColumns[col.id]} onChange={() => setVisibleColumns({ ...visibleColumns, [col.id]: !visibleColumns[col.id] })} className="w-3.5 h-3.5 cursor-pointer" />
                  <span className="text-xs">{col.label}</span>
                </label>
              ))}
            </div>
            <div className="p-2">
              <button onClick={() => { const all = {}; columns.forEach(c => all[c.id] = true); setVisibleColumns(all); }} className="w-full text-xs text-violet-600 hover:text-violet-700 text-center py-1">
                Tout afficher
              </button>
              <button onClick={() => { const all = {}; columns.forEach(c => all[c.id] = false); setVisibleColumns(all); }} className="w-full text-xs text-gray-500 hover:text-gray-600 text-center py-1">
                Tout masquer
              </button>
            </div>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="border-t border-gray-300 px-4 py-2 flex items-center justify-between">
            <div className="text-xs text-gray-500">Page {currentPage} sur {totalPages}</div>
            <div className="flex items-center gap-1">
              <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="p-1 rounded hover:bg-gray-100 disabled:opacity-50"><FiChevronsLeft size={14} /></button>
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-1 rounded hover:bg-gray-100 disabled:opacity-50"><FiChevronLeft size={14} /></button>
              <span className="px-2 text-xs text-gray-700">{currentPage} / {totalPages}</span>
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-1 rounded hover:bg-gray-100 disabled:opacity-50"><FiChevronRight size={14} /></button>
              <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} className="p-1 rounded hover:bg-gray-100 disabled:opacity-50"><FiChevronsRight size={14} /></button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}