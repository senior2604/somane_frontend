// C:\Users\IBM\Documents\somane_frontend\src\features\comptabilité\pages\Lettrage\Index.jsx
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiPlus, FiFilter, FiX, FiChevronLeft, FiChevronRight,
  FiChevronsLeft, FiChevronsRight, FiArrowUp, FiArrowDown,
  FiAlertCircle, FiSettings, FiTrash2, FiRotateCcw,
  FiMoreHorizontal
} from 'react-icons/fi';
import { useEntity } from '../../../../context/EntityContext';
import { lettrageService } from '../../services';

// ==========================================
// COMPOSANT TOOLTIP (LOCAL)
// ==========================================
const Tooltip = ({ children, text, position = 'top' }) => {
  const [show, setShow] = useState(false);
  return (
    <div className="relative inline-block">
      <div onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>{children}</div>
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
  return sortDirection === 'asc' ? <FiArrowUp size={12} className="ml-1 inline" /> : <FiArrowDown size={12} className="ml-1 inline" />;
};

const formatAmount = (value) => {
  if (!value && value !== 0) return '0';
  const num = parseFloat(value);
  if (isNaN(num)) return '0';
  return Math.round(num).toLocaleString('fr-FR');
};

// ==========================================
// COMPOSANT PRINCIPAL
// ==========================================
export default function LettrageIndex() {
  const navigate = useNavigate();
  const { activeEntity } = useEntity();
  
  const [reconciliations, setReconciliations] = useState([]);
  const [filteredReconciliations, setFilteredReconciliations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [activeRowId, setActiveRowId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);
  
  const [searchText, setSearchText] = useState('');
  const [activeFilters, setActiveFilters] = useState([]);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [showColumnsMenu, setShowColumnsMenu] = useState(false);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [columnsMenuPosition, setColumnsMenuPosition] = useState({ top: 0, left: 0 });
  const filterMenuRef = useRef(null);
  const actionsMenuRef = useRef(null);
  const searchContainerRef = useRef(null);
  
  const [visibleColumns, setVisibleColumns] = useState({
    date: true, numero: true, type: true, montant: true, lignes: true, partenaire: true, compte: true, commentaire: true, statut: true
  });
  
  const [sortColumn, setSortColumn] = useState('date');
  const [sortDirection, setSortDirection] = useState('desc');
  
  const [partnersMap, setPartnersMap] = useState({});
  const [accountsMap, setAccountsMap] = useState({});
  const [referentialsLoaded, setReferentialsLoaded] = useState(false);
  const [partnerList, setPartnerList] = useState([]);

  // Fermer les menus au clic extérieur
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterMenuRef.current && !filterMenuRef.current.contains(event.target)) setShowFilterMenu(false);
      if (actionsMenuRef.current && !actionsMenuRef.current.contains(event.target)) setShowActionsMenu(false);
      const columnsMenuElement = document.getElementById('columns-menu');
      if (columnsMenuElement && !columnsMenuElement.contains(event.target)) {
        const buttonElement = document.querySelector('.columns-menu-button');
        if (buttonElement && !buttonElement.contains(event.target)) setShowColumnsMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Charger les référentiels
  useEffect(() => {
    if (!activeEntity) return;
    const loadReferentials = async () => {
      try {
        const partners = await lettrageService.getPartners?.(activeEntity.id) || [];
        const pMap = {}; const pList = [];
        partners.forEach(p => { const name = p.raison_sociale || p.nom || p.name || 'Partenaire'; pMap[p.id] = { ...p, displayName: name }; pList.push(name); });
        setPartnersMap(pMap); setPartnerList(pList);
        
        const accounts = await lettrageService.getAccounts?.(activeEntity.id) || [];
        const aMap = {}; accounts.forEach(a => { aMap[a.id] = a; });
        setAccountsMap(aMap);
        setReferentialsLoaded(true);
      } catch (err) { console.error('❌ Erreur chargement référentiels:', err); }
    };
    loadReferentials();
  }, [activeEntity]);

  // Charger les données
  const loadData = useCallback(async () => {
    if (!activeEntity || !referentialsLoaded) return;
    try {
      setLoading(true); setError(null);
      // On charge l'historique ou les lignes lettrées. Adapter selon ton endpoint réel
      const data = await lettrageService.getUnreconciledLines(activeEntity.id, { include_reconciled: true }) || [];
      const enriched = data.map(item => ({
        ...item,
        partner_detail: item.partner_id ? partnersMap[item.partner_id] : null,
        account_detail: item.account_id ? accountsMap[item.account_id] : null
      }));
      setReconciliations(enriched); setFilteredReconciliations(enriched);
      setActiveRowId(null); setCurrentPage(1);
    } catch (err) { console.error('❌ Erreur chargement lettrages:', err); setError('Impossible de charger les lettrages.'); }
    finally { setLoading(false); }
  }, [activeEntity, referentialsLoaded, partnersMap, accountsMap]);

  useEffect(() => { if (referentialsLoaded && activeEntity) loadData(); }, [referentialsLoaded, activeEntity, loadData]);

  // Filtrage & Tri
  const applyFilters = useCallback((list, filters) => {
    let filtered = [...list];
    filters.forEach(filter => {
      filtered = filtered.filter(item => {
        let fieldValue = '';
        switch (filter.field) {
          case 'date': fieldValue = item.date || ''; break;
          case 'type': fieldValue = item.reconcile_type || item.type || ''; break;
          case 'montant': fieldValue = (item.amount || item.total_amount || 0).toString(); break;
          case 'partenaire': fieldValue = item.partner_detail?.displayName || ''; break;
          case 'compte': fieldValue = item.account_detail?.code || ''; break;
          case 'commentaire': fieldValue = item.comment || ''; break;
          case 'recherche':
            fieldValue = `${item.date} ${item.comment} ${item.partner_detail?.displayName || ''} ${item.account_detail?.code || ''}`; break;
          default: fieldValue = '';
        }
        return fieldValue.toLowerCase().includes(filter.value.toLowerCase());
      });
    });
    return filtered;
  }, []);

  const getSortedItems = useCallback((list, column, direction) => {
    return [...list].sort((a, b) => {
      let aVal, bVal;
      switch (column) {
        case 'date': aVal = a.date || ''; bVal = b.date || ''; break;
        case 'type': aVal = a.reconcile_type || a.type || ''; bVal = b.reconcile_type || b.type || ''; break;
        case 'montant': aVal = a.amount || a.total_amount || 0; bVal = b.amount || b.total_amount || 0; break;
        case 'partenaire': aVal = a.partner_detail?.displayName || ''; bVal = b.partner_detail?.displayName || ''; break;
        case 'compte': aVal = a.account_detail?.code || ''; bVal = b.account_detail?.code || ''; break;
        case 'commentaire': aVal = a.comment || ''; bVal = b.comment || ''; break;
        default: return 0;
      }
      if (aVal < bVal) return direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, []);

  const handleSort = (column) => {
    let newDirection = sortDirection;
    let newColumn = column;
    if (sortColumn === column) newDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    else { newColumn = column; newDirection = 'asc'; }
    setSortColumn(newColumn); setSortDirection(newDirection);
    setFilteredReconciliations(getSortedItems(filteredReconciliations, newColumn, newDirection));
  };

  useEffect(() => {
    if (reconciliations.length > 0) {
      const filtered = applyFilters(reconciliations, activeFilters);
      setFilteredReconciliations(getSortedItems(filtered, sortColumn, sortDirection));
      setCurrentPage(1);
    }
  }, [reconciliations, activeFilters, applyFilters, getSortedItems, sortColumn, sortDirection]);

  const addSearchAsFilter = () => { if (searchText.trim()) { setActiveFilters([...activeFilters, { field: 'recherche', value: searchText }]); setSearchText(''); } };
  const addFilter = (field, value) => { setActiveFilters([...activeFilters, { field, value }]); setShowFilterMenu(false); };
  const removeFilter = (index) => { setActiveFilters(activeFilters.filter((_, i) => i !== index)); };
  const clearAllFilters = () => { setActiveFilters([]); setSearchText(''); };

  const totalPages = Math.ceil(filteredReconciliations.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedItems = filteredReconciliations.slice(startIndex, startIndex + itemsPerPage);

  const handleBulkCancel = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Annuler ${selectedIds.length} lettrage(s) ?`)) return;
    try { for (const id of selectedIds) await lettrageService.delete(id, activeEntity.id); setSelectedIds([]); loadData(); } 
    catch (err) { alert('Erreur: ' + (err.response?.data?.detail || err.message)); }
  };

  const handleDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Supprimer ${selectedIds.length} lettrage(s) ?`)) return;
    setShowActionsMenu(false);
    try { for (const id of selectedIds) await lettrageService.delete(id, activeEntity.id); setSelectedIds([]); loadData(); } 
    catch (err) { alert('Erreur: ' + (err.response?.data?.detail || err.message)); }
  };

  const TypeBadge = ({ type }) => {
    const config = { full: { text: 'Total', cls: 'bg-green-100 text-green-700' }, partial: { text: 'Partiel', cls: 'bg-amber-100 text-amber-700' }, auto: { text: 'Auto', cls: 'bg-blue-100 text-blue-700' } }[type] || { text: type || 'Standard', cls: 'bg-gray-100 text-gray-700' };
    return <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium ${config.cls}`}>{config.text}</span>;
  };

  const StatusBadge = ({ reconciled }) => reconciled ? 
    <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-green-100 text-green-700">Lettré</span> :
    <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 text-amber-700">En cours</span>;

  const columns = [
    { id: 'date', label: 'Date' }, { id: 'numero', label: 'N° Lettrage' }, { id: 'type', label: 'Type' },
    { id: 'montant', label: 'Montant', align: 'right' }, { id: 'lignes', label: 'Lignes', align: 'center' },
    { id: 'partenaire', label: 'Partenaire' }, { id: 'compte', label: 'Compte' },
    { id: 'commentaire', label: 'Commentaire' }, { id: 'statut', label: 'Statut' }
  ];

  if (!activeEntity) {
    return (<div className="min-h-screen bg-gray-50 p-4"><div className="max-w-7xl mx-auto bg-white border border-gray-300"><div className="border-b border-gray-300 px-4 py-3"><div className="text-lg font-bold text-gray-900">Lettrage des comptes</div></div><div className="p-8"><div className="bg-yellow-50 border border-yellow-200 rounded p-6 text-center"><FiAlertCircle className="text-yellow-600 mx-auto mb-3" size={32} /><p className="text-yellow-800 font-medium text-lg mb-3">Aucune entité sélectionnée</p><p className="text-sm text-gray-600">Veuillez sélectionner une entité.</p></div></div></div></div>);
  }

  if (loading && reconciliations.length === 0) {
    return (<div className="min-h-screen bg-gray-50 p-4"><div className="max-w-7xl mx-auto bg-white border border-gray-300"><div className="border-b border-gray-300 px-4 py-3"><div className="text-lg font-bold text-gray-900">Lettrage des comptes</div></div><div className="p-8 flex items-center justify-center"><div className="text-center"><div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto"></div><p className="mt-4 text-gray-600 text-sm">Chargement...</p></div></div></div></div>);
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-full mx-auto bg-white border border-gray-300">
        {/* En-tête */}
        <div className="border-b border-gray-300 px-4 py-2">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-shrink-0">
              <Tooltip text="Nouveau lettrage">
                <button onClick={() => navigate('/comptabilite/lettrage/create')} className="h-8 px-3 bg-purple-600 text-white text-xs font-medium hover:bg-purple-700 hover:scale-105 transition-all duration-200 rounded flex items-center gap-1"><FiPlus size={12} /> Nouveau lettrage</button>
              </Tooltip>
              <Tooltip text="Actualiser la liste">
                <h1 className="text-lg font-bold text-gray-900 cursor-pointer hover:text-purple-600 hover:scale-105 transition-all duration-200" onClick={loadData}>Lettrage des comptes</h1>
              </Tooltip>
              <div className="relative" ref={actionsMenuRef}>
                <Tooltip text="Menu des actions">
                  <button onClick={() => setShowActionsMenu(!showActionsMenu)} className="w-8 h-8 rounded-full border border-gray-300 text-gray-700 hover:bg-gray-50 hover:scale-110 hover:shadow-md active:scale-90 transition-all duration-200 flex items-center justify-center"><FiSettings size={14} /></button>
                </Tooltip>
                {showActionsMenu && (
                  <div className="absolute left-0 mt-1 w-48 bg-white border border-gray-300 shadow-lg rounded z-50">
                    <Tooltip text="Annuler les lettrages sélectionnés" position="right">
                      <button onClick={handleBulkCancel} className="w-full px-3 py-2 text-xs text-left hover:bg-gray-50 flex items-center gap-2"><FiRotateCcw size={12} /> Annuler</button>
                    </Tooltip>
                    <Tooltip text="Supprimer les lettrages sélectionnés" position="right">
                      <button onClick={handleDelete} className="w-full px-3 py-2 text-xs text-left hover:bg-red-50 hover:text-red-600 flex items-center gap-2"><FiTrash2 size={12} /> Supprimer</button>
                    </Tooltip>
                  </div>
                )}
              </div>
            </div>
            {/* Barre de recherche */}
            <div className="flex-1 flex justify-center">
              <div className="relative w-full max-w-2xl" ref={searchContainerRef}>
                <div className="flex items-center flex-wrap border border-gray-300 rounded bg-white min-h-[38px] p-1">
                  {activeFilters.map((filter, index) => {
                    let displayText = filter.value; let displayColor = 'bg-gray-100 text-gray-700';
                    if (filter.field === 'type') displayColor = 'bg-purple-100 text-purple-700';
                    if (filter.field === 'partenaire') { displayText = `Partenaire: ${filter.value}`; displayColor = 'bg-blue-100 text-blue-700'; }
                    return (<span key={index} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${displayColor} m-0.5`}>{displayText}<button onClick={() => removeFilter(index)} className="hover:text-red-600"><FiX size={10} /></button></span>);
                  })}
                  <input type="text" value={searchText} onChange={(e) => setSearchText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') addSearchAsFilter(); }} placeholder="Rechercher..." className="flex-1 px-2 py-1 text-sm focus:outline-none min-w-[120px]" />
                  <div className="relative" ref={filterMenuRef}>
                    <Tooltip text="Ajouter un filtre">
                      <button onClick={() => setShowFilterMenu(!showFilterMenu)} className={`p-1.5 rounded hover:bg-gray-100 ${showFilterMenu ? 'bg-gray-100' : ''}`}><FiFilter size={14} className={activeFilters.length > 0 ? 'text-purple-600' : 'text-gray-400'} /></button>
                    </Tooltip>
                    {showFilterMenu && (
                      <div className="absolute right-0 mt-1 w-64 bg-white border border-gray-300 shadow-lg rounded z-50">
                        <div className="p-2 border-b border-gray-200"><p className="text-xs font-medium text-gray-700 mb-2">Ajouter un filtre</p>
                          <button onClick={() => addFilter('type', 'full')} className="w-full text-left text-xs px-2 py-1 hover:bg-gray-100 rounded flex items-center gap-2"><span className="w-20">Type</span><span className="text-green-600">= Total</span></button>
                          <button onClick={() => addFilter('type', 'partial')} className="w-full text-left text-xs px-2 py-1 hover:bg-gray-100 rounded flex items-center gap-2"><span className="w-20">Type</span><span className="text-amber-600">= Partiel</span></button>
                        </div>
                        <div className="p-2"><p className="text-xs font-medium text-gray-700 mb-2">Partenaire</p>
                          <div className="max-h-40 overflow-y-auto">{partnerList.slice(0, 10).map((partner, idx) => (<button key={idx} onClick={() => addFilter('partenaire', partner)} className="w-full text-left text-xs px-2 py-1 hover:bg-gray-100 rounded truncate">{partner}</button>))}</div>
                        </div>
                        {activeFilters.length > 0 && (<div className="p-2 border-t border-gray-200"><button onClick={clearAllFilters} className="w-full text-xs text-red-600 hover:text-red-700 text-center py-1">Effacer tous les filtres</button></div>)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-xs text-gray-500">Afficher</span>
              <select value={itemsPerPage} onChange={(e) => setItemsPerPage(Number(e.target.value))} className="h-8 px-2 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-purple-500"><option value={10}>10</option><option value={15}>15</option><option value={25}>25</option><option value={50}>50</option></select>
              <span className="text-xs text-gray-500">lignes</span>
            </div>
          </div>
        </div>

        {/* Actions groupées */}
        {selectedIds.length > 0 && (
          <div className="border-b border-gray-300 px-4 py-2 bg-gray-50 flex items-center gap-2">
            <span className="text-xs text-gray-600">{selectedIds.length} lettrage(s) sélectionné(s)</span>
            <Tooltip text="Annuler les lettrages sélectionnés"><button onClick={handleBulkCancel} className="h-6 px-2 bg-amber-600 text-white text-xs hover:bg-amber-700 rounded">Annuler</button></Tooltip>
          </div>
        )}

        {/* Tableau */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-gray-100 border-b border-gray-300">
                <th className="border-r border-gray-300 px-2 py-1.5 w-8 text-center"><input type="checkbox" checked={selectedIds.length === paginatedItems.length && paginatedItems.length > 0} onChange={(e) => setSelectedIds(e.target.checked ? paginatedItems.map(p => p.id) : [])} className="w-3.5 h-3.5 cursor-pointer" /></th>
                {visibleColumns.date && (<th className="border-r border-gray-300 px-2 py-1.5 text-left text-xs font-medium text-gray-700 cursor-pointer hover:bg-gray-200 min-w-[85px]" onClick={() => handleSort('date')}><div className="flex items-center gap-1"><span>Date</span><SortIcon column="date" sortColumn={sortColumn} sortDirection={sortDirection} /></div></th>)}
                {visibleColumns.numero && (<th className="border-r border-gray-300 px-2 py-1.5 text-left text-xs font-medium text-gray-700 cursor-pointer hover:bg-gray-200 min-w-[110px]" onClick={() => handleSort('numero')}><div className="flex items-center gap-1"><span>N° Lettrage</span><SortIcon column="numero" sortColumn={sortColumn} sortDirection={sortDirection} /></div></th>)}
                {visibleColumns.type && (<th className="border-r border-gray-300 px-2 py-1.5 text-left text-xs font-medium text-gray-700 cursor-pointer hover:bg-gray-200 min-w-[70px]" onClick={() => handleSort('type')}><div className="flex items-center gap-1"><span>Type</span><SortIcon column="type" sortColumn={sortColumn} sortDirection={sortDirection} /></div></th>)}
                {visibleColumns.montant && (<th className="border-r border-gray-300 px-2 py-1.5 text-right text-xs font-medium text-gray-700 cursor-pointer hover:bg-gray-200 min-w-[90px]" onClick={() => handleSort('montant')}><div className="flex items-center justify-end gap-1"><span>Montant</span><SortIcon column="montant" sortColumn={sortColumn} sortDirection={sortDirection} /></div></th>)}
                {visibleColumns.lignes && (<th className="border-r border-gray-300 px-2 py-1.5 text-center text-xs font-medium text-gray-700 min-w-[60px]">Lignes</th>)}
                {visibleColumns.partenaire && (<th className="border-r border-gray-300 px-2 py-1.5 text-left text-xs font-medium text-gray-700 cursor-pointer hover:bg-gray-200 min-w-[140px]" onClick={() => handleSort('partenaire')}><div className="flex items-center gap-1"><span>Partenaire</span><SortIcon column="partenaire" sortColumn={sortColumn} sortDirection={sortDirection} /></div></th>)}
                {visibleColumns.compte && (<th className="border-r border-gray-300 px-2 py-1.5 text-left text-xs font-medium text-gray-700 cursor-pointer hover:bg-gray-200 min-w-[90px]" onClick={() => handleSort('compte')}><div className="flex items-center gap-1"><span>Compte</span><SortIcon column="compte" sortColumn={sortColumn} sortDirection={sortDirection} /></div></th>)}
                {visibleColumns.commentaire && (<th className="border-r border-gray-300 px-2 py-1.5 text-left text-xs font-medium text-gray-700 cursor-pointer hover:bg-gray-200 min-w-[150px]" onClick={() => handleSort('commentaire')}><div className="flex items-center gap-1"><span>Commentaire</span><SortIcon column="commentaire" sortColumn={sortColumn} sortDirection={sortDirection} /></div></th>)}
                {visibleColumns.statut && (<th className="border-r border-gray-300 px-2 py-1.5 text-left text-xs font-medium text-gray-700 min-w-[75px]">Statut</th>)}
                <th className="border-l border-gray-300 px-2 py-1.5 w-10 text-center">
                  <Tooltip text="Choisir les colonnes à afficher">
                    <button className="columns-menu-button p-1 rounded hover:bg-gray-200" onClick={(e) => { e.stopPropagation(); const rect = e.currentTarget.getBoundingClientRect(); setColumnsMenuPosition({ top: rect.bottom + window.scrollY + 5, left: rect.right - 200 }); setShowColumnsMenu(!showColumnsMenu); }}><FiMoreHorizontal size={16} className="text-gray-500" /></button>
                  </Tooltip>
                </th>
              </tr>
            </thead>
            <tbody>
              {error ? (<tr><td colSpan={Object.values(visibleColumns).filter(v => v).length + 2} className="border border-gray-300 p-4 text-center text-red-600 text-sm">{error}</td></tr>) : paginatedItems.length === 0 ? (<tr><td colSpan={Object.values(visibleColumns).filter(v => v).length + 2} className="border border-gray-300 p-8 text-center text-gray-500 text-sm">{activeFilters.length > 0 ? 'Aucun résultat pour ces filtres' : 'Aucun lettrage'}</td></tr>) : (
                paginatedItems.map((item) => (
                  <tr key={item.id} className={`hover:bg-gray-50 cursor-pointer transition-colors ${activeRowId === item.id ? 'bg-purple-50' : ''}`} onClick={() => setActiveRowId(item.id)} onDoubleClick={() => navigate(`/comptabilite/lettrage/${item.id}`)}>
                    <td className="border border-gray-300 px-2 py-1.5 text-center" onClick={(e) => e.stopPropagation()}><input type="checkbox" checked={selectedIds.includes(item.id)} onChange={(e) => setSelectedIds(e.target.checked ? [...selectedIds, item.id] : selectedIds.filter(id => id !== item.id))} className="w-3.5 h-3.5 cursor-pointer" /></td>
                    {visibleColumns.date && (<td className="border border-gray-300 px-2 py-1.5 text-xs text-gray-700">{item.date ? new Date(item.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'}</td>)}
                    {visibleColumns.numero && (<td className="border border-gray-300 px-2 py-1.5 text-xs font-mono text-gray-900">#{item.id}</td>)}
                    {visibleColumns.type && (<td className="border border-gray-300 px-2 py-1.5"><TypeBadge type={item.reconcile_type || item.type} /></td>)}
                    {visibleColumns.montant && (<td className="border border-gray-300 px-2 py-1.5 text-right text-xs font-medium text-gray-900">{formatAmount(item.amount || item.total_amount)} <span className="text-gray-400 text-[10px]">XOF</span></td>)}
                    {visibleColumns.lignes && (<td className="border border-gray-300 px-2 py-1.5 text-center text-xs text-gray-700">{item.line_count || item.lines?.length || 0}</td>)}
                    {visibleColumns.partenaire && (<td className="border border-gray-300 px-2 py-1.5 text-xs text-gray-700 truncate max-w-[130px]">{item.partner_detail?.displayName || item.partner_name || '—'}</td>)}
                    {visibleColumns.compte && (<td className="border border-gray-300 px-2 py-1.5 text-xs font-mono text-gray-900 truncate max-w-[80px]">{item.account_detail?.code || item.account_code || '—'}</td>)}
                    {visibleColumns.commentaire && (<td className="border border-gray-300 px-2 py-1.5 text-xs text-gray-700 truncate max-w-[140px]" title={item.comment}>{item.comment || '—'}</td>)}
                    {visibleColumns.statut && (<td className="border border-gray-300 px-2 py-1.5"><StatusBadge reconciled={item.is_reconciled || item.reconciled} /></td>)}
                    <td className="border border-gray-300 px-2 py-1.5"></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Menu colonnes */}
        {showColumnsMenu && (
          <div id="columns-menu" className="fixed bg-white border border-gray-300 shadow-lg rounded z-50" style={{ top: columnsMenuPosition.top, left: columnsMenuPosition.left, width: '200px' }}>
            <div className="p-2 border-b border-gray-200"><p className="text-xs font-medium text-gray-700 mb-2">Colonnes à afficher</p>
              {columns.map(col => (<label key={col.id} className="flex items-center gap-2 py-1 px-2 hover:bg-gray-50 rounded cursor-pointer"><input type="checkbox" checked={visibleColumns[col.id]} onChange={() => setVisibleColumns({ ...visibleColumns, [col.id]: !visibleColumns[col.id] })} className="w-3.5 h-3.5 cursor-pointer" /><span className="text-xs">{col.label}</span></label>))}
            </div>
            <div className="p-2">
              <button onClick={() => { const allTrue = {}; columns.forEach(col => { allTrue[col.id] = true; }); setVisibleColumns(allTrue); }} className="w-full text-xs text-purple-600 hover:text-purple-700 text-center py-1">Tout afficher</button>
              <button onClick={() => { const allFalse = {}; columns.forEach(col => { allFalse[col.id] = false; }); setVisibleColumns(allFalse); }} className="w-full text-xs text-gray-500 hover:text-gray-600 text-center py-1">Tout masquer</button>
            </div>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="border-t border-gray-300 px-4 py-2 flex items-center justify-between">
            <div className="text-xs text-gray-500">Page {currentPage} sur {totalPages}</div>
            <div className="flex items-center gap-1">
              <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="p-1 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"><FiChevronsLeft size={14} /></button>
              <button onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1} className="p-1 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"><FiChevronLeft size={14} /></button>
              <span className="px-2 text-xs text-gray-700">{currentPage} / {totalPages}</span>
              <button onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages} className="p-1 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"><FiChevronRight size={14} /></button>
              <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} className="p-1 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"><FiChevronsRight size={14} /></button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}