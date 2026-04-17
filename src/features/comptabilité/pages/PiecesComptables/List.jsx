// C:\Users\IBM\Documents\somane_frontend\src\features\comptabilité\pages\PiecesComptables\List.jsx

import React, { useState, useEffect, useCallback } from 'react';
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
  FiMoreHorizontal
} from 'react-icons/fi';
import { useEntity } from '../../../../context/EntityContext';
import { piecesService } from "../../services";

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

// ✅ Fonction pour formater les montants sans décimales avec séparateur d'espace
const formatAmount = (value) => {
  if (!value && value !== 0) return '0';
  const num = parseFloat(value);
  if (isNaN(num)) return '0';
  return Math.round(num).toLocaleString('fr-FR');
};

// ✅ Fonction pour extraire le montant de la taxe d'une ligne (identique à Show.jsx)
const extractTaxAmount = (line, taxesMap) => {
  if (!line) return 0;
  
  // 1. Si tax_base_amount existe, l'utiliser directement
  if (line.tax_base_amount && parseFloat(line.tax_base_amount) > 0) {
    return parseFloat(line.tax_base_amount);
  }
  
  // 2. Chercher dans tax_ids
  if (line.tax_ids && Array.isArray(line.tax_ids) && line.tax_ids.length > 0) {
    const firstTax = line.tax_ids[0];
    let taxRate = 0;
    
    // Cas 1: c'est un objet avec amount
    if (typeof firstTax === 'object' && firstTax !== null) {
      taxRate = parseFloat(firstTax.amount) || 0;
    }
    // Cas 2: c'est un ID
    else if (typeof firstTax === 'number' && taxesMap && taxesMap[firstTax]) {
      taxRate = parseFloat(taxesMap[firstTax].amount) || 0;
    }
    // Cas 3: c'est une string numérique
    else if (typeof firstTax === 'string' && !isNaN(firstTax) && taxesMap && taxesMap[parseInt(firstTax, 10)]) {
      taxRate = parseFloat(taxesMap[parseInt(firstTax, 10)].amount) || 0;
    }
    
    if (taxRate > 0) {
      const amount = Math.max(parseFloat(line.debit) || 0, parseFloat(line.credit) || 0);
      return (amount * taxRate) / 100;
    }
  }
  
  // 3. Chercher dans tax_line
  if (line.tax_line) {
    let taxRate = 0;
    
    if (typeof line.tax_line === 'object' && line.tax_line !== null) {
      taxRate = parseFloat(line.tax_line.amount) || 0;
    } else if (typeof line.tax_line === 'number' && taxesMap && taxesMap[line.tax_line]) {
      taxRate = parseFloat(taxesMap[line.tax_line].amount) || 0;
    }
    
    if (taxRate > 0) {
      const amount = Math.max(parseFloat(line.debit) || 0, parseFloat(line.credit) || 0);
      return (amount * taxRate) / 100;
    }
  }
  
  return 0;
};

// ==========================================
// COMPOSANT PRINCIPAL
// ==========================================
export default function PiecesComptablesList() {
  const navigate = useNavigate();
  const { activeEntity } = useEntity();
  
  const [pieces, setPieces] = useState([]);
  const [filteredPieces, setFilteredPieces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPieceIds, setSelectedPieceIds] = useState([]);
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
    date: true,
    numero: true,
    type_journal: true,
    reference: true,
    partenaire: true,
    montant_ht: true,
    montant_taxes: true,
    montant_ttc: true,
    etat: true,
    paiement: true
  });
  
  // États pour le tri
  const [sortColumn, setSortColumn] = useState('date');
  const [sortDirection, setSortDirection] = useState('desc');
  
  // États pour les référentiels
  const [partnersMap, setPartnersMap] = useState({});
  const [journalsMap, setJournalsMap] = useState({});
  const [currenciesMap, setCurrenciesMap] = useState({});
  const [taxesMap, setTaxesMap] = useState({});
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

  // Charger tous les référentiels
  useEffect(() => {
    if (!activeEntity) {
      setError('Veuillez sélectionner une entité pour voir les pièces comptables');
      setLoading(false);
    }
  }, [activeEntity]);

  useEffect(() => {
    if (!activeEntity) return;
    
    const loadReferentials = async () => {
      try {
        setLoading(true);
        
        const partners = await piecesService.getPartners(activeEntity.id);
        const partnersObj = {};
        const partnerNames = [];
        partners.forEach(p => { 
          const name = p.raison_sociale || p.nom || p.name || 'Partenaire';
          partnersObj[p.id] = {
            ...p,
            displayName: name
          };
          partnerNames.push(name);
        });
        setPartnersMap(partnersObj);
        setPartnerList(partnerNames);
        
        const journals = await piecesService.getJournals(activeEntity.id);
        const journalsObj = {};
        journals.forEach(j => { journalsObj[j.id] = j; });
        setJournalsMap(journalsObj);
        
        const currencies = await piecesService.getDevises(activeEntity.id);
        const currenciesObj = {};
        currencies.forEach(c => { currenciesObj[c.id] = c; });
        setCurrenciesMap(currenciesObj);
        
        // ✅ Charger les taxes pour pouvoir calculer les montants
        const taxes = await piecesService.getTaxes?.(activeEntity.id) || [];
        const taxesObj = {};
        taxes.forEach(t => { taxesObj[t.id] = t; });
        setTaxesMap(taxesObj);
        
        setReferentialsLoaded(true);
        
      } catch (err) {
        console.error('❌ Erreur chargement référentiels:', err);
        setError('Erreur lors du chargement des référentiels');
      } finally {
        setLoading(false);
      }
    };
    
    loadReferentials();
  }, [activeEntity]);

  // ✅ Fonction CORRIGÉE pour calculer les montants HT, Taxes, TTC
  const calculateAmounts = useCallback((piece) => {
    if (!piece.lines || piece.lines.length === 0) {
      return { amount_untaxed: 0, amount_tax: 0, amount_total: 0 };
    }
    
    let totalDebit = 0;
    let totalCredit = 0;
    let taxAmount = 0;
    
    piece.lines.forEach(line => {
      const debit = parseFloat(line.debit) || 0;
      const credit = parseFloat(line.credit) || 0;
      totalDebit += debit;
      totalCredit += credit;
      
      // ✅ Utiliser la fonction extractTaxAmount pour récupérer le montant de la taxe
      taxAmount += extractTaxAmount(line, taxesMap);
    });
    
    // Le HT est le total des débits (ou crédits, ils doivent être égaux)
    const amountUntaxed = Math.max(totalDebit, totalCredit);
    
    return {
      amount_untaxed: amountUntaxed,           // HT
      amount_tax: taxAmount,                    // Taxes
      amount_total: amountUntaxed + taxAmount   // TTC = HT + Taxes
    };
  }, [taxesMap]);

  // Fonctions utilitaires
  const getJournalCode = (piece) => {
    if (piece.journal_detail?.code) return piece.journal_detail.code;
    if (piece.journal && typeof piece.journal === 'object') return piece.journal.code || '—';
    if (piece.journal) return piece.journal;
    return '—';
  };

  const getPartnerDisplay = (piece) => {
    if (piece.partner_detail) return piece.partner_detail;
    if (piece.partner && typeof piece.partner === 'object') {
      return {
        displayName: piece.partner.raison_sociale || piece.partner.nom || piece.partner.name || 'Partenaire',
        email: piece.partner.email,
        telephone: piece.partner.telephone
      };
    }
    return null;
  };

  const getCurrencyCode = (piece) => {
    if (piece.currency_detail?.code) return piece.currency_detail.code;
    if (piece.currency && typeof piece.currency === 'object') return piece.currency.code || '—';
    if (piece.currency) return piece.currency;
    return 'XOF';
  };

  // Charger les pièces
  const loadData = useCallback(async () => {
    if (!activeEntity || !referentialsLoaded) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const piecesData = await piecesService.getAll(activeEntity.id);
      
      const enrichedPieces = piecesData.map(piece => {
        let partnerId = piece.partner;
        if (!partnerId && piece.lines && piece.lines.length > 0) {
          const lineWithPartner = piece.lines.find(l => l.partner);
          partnerId = lineWithPartner?.partner;
        }
        
        const calculatedAmounts = calculateAmounts(piece);
        
        return {
          ...piece,
          partner_detail: partnerId ? partnersMap[partnerId] : null,
          journal_detail: piece.journal ? journalsMap[piece.journal] : null,
          currency_detail: piece.currency ? currenciesMap[piece.currency] : null,
          lines: piece.lines || [],
          amount_untaxed: calculatedAmounts.amount_untaxed,
          amount_tax: calculatedAmounts.amount_tax,
          amount_total: calculatedAmounts.amount_total
        };
      });

      setPieces(enrichedPieces);
      setFilteredPieces(enrichedPieces);
      setActiveRowId(null);
      setCurrentPage(1);
      
    } catch (err) {
      console.error('❌ Erreur chargement pièces:', err);
      setError('Impossible de charger les pièces comptables.');
    } finally {
      setLoading(false);
    }
  }, [activeEntity, referentialsLoaded, partnersMap, journalsMap, currenciesMap, calculateAmounts]);

  useEffect(() => {
    if (referentialsLoaded && activeEntity) {
      loadData();
    }
  }, [referentialsLoaded, activeEntity, loadData]);

  // ==========================================
  // FONCTION DE FILTRAGE
  // ==========================================
  const applyFiltersToPieces = (piecesList, filters) => {
    let filtered = [...piecesList];
    
    filters.forEach(filter => {
      filtered = filtered.filter(piece => {
        let fieldValue = '';
        
        switch (filter.field) {
          case 'date':
            fieldValue = piece.date || '';
            break;
          case 'numero':
            fieldValue = piece.name || '';
            break;
          case 'type_journal':
            fieldValue = getJournalCode(piece);
            break;
          case 'reference':
            fieldValue = piece.ref || '';
            break;
          case 'partenaire':
            fieldValue = getPartnerDisplay(piece)?.displayName || '';
            break;
          case 'montant_ht':
            fieldValue = piece.amount_untaxed.toString();
            break;
          case 'montant_taxes':
            fieldValue = piece.amount_tax.toString();
            break;
          case 'montant_ttc':
            fieldValue = piece.amount_total.toString();
            break;
          case 'etat':
            fieldValue = piece.state || '';
            break;
          case 'paiement':
            fieldValue = piece.payment_state || '';
            break;
          case 'recherche':
            fieldValue = `${piece.name} ${piece.ref} ${getJournalCode(piece)} ${getPartnerDisplay(piece)?.displayName || ''}`;
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
  const getSortedPieces = (piecesToSort, column, direction) => {
    return [...piecesToSort].sort((a, b) => {
      let aVal, bVal;
      
      switch (column) {
        case 'date':
          aVal = a.date || '';
          bVal = b.date || '';
          break;
        case 'numero':
          aVal = a.name || '';
          bVal = b.name || '';
          break;
        case 'type_journal':
          aVal = getJournalCode(a);
          bVal = getJournalCode(b);
          break;
        case 'reference':
          aVal = a.ref || '';
          bVal = b.ref || '';
          break;
        case 'partenaire':
          aVal = getPartnerDisplay(a)?.displayName || '';
          bVal = getPartnerDisplay(b)?.displayName || '';
          break;
        case 'montant_ht':
          aVal = a.amount_untaxed || 0;
          bVal = b.amount_untaxed || 0;
          break;
        case 'montant_taxes':
          aVal = a.amount_tax || 0;
          bVal = b.amount_tax || 0;
          break;
        case 'montant_ttc':
          aVal = a.amount_total || 0;
          bVal = b.amount_total || 0;
          break;
        case 'etat':
          aVal = a.state || '';
          bVal = b.state || '';
          break;
        case 'paiement':
          aVal = a.payment_state || '';
          bVal = b.payment_state || '';
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
    
    const sorted = getSortedPieces(filteredPieces, newColumn, newDirection);
    setFilteredPieces(sorted);
  };

  // Appliquer les filtres
  useEffect(() => {
    if (pieces.length > 0) {
      const filtered = applyFiltersToPieces(pieces, activeFilters);
      const sorted = getSortedPieces(filtered, sortColumn, sortDirection);
      setFilteredPieces(sorted);
      setCurrentPage(1);
    }
  }, [pieces, activeFilters]);

  // Re-appliquer le tri quand sortColumn/sortDirection change
  useEffect(() => {
    if (filteredPieces.length > 0) {
      const sorted = getSortedPieces(filteredPieces, sortColumn, sortDirection);
      setFilteredPieces(sorted);
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

  const totalPages = Math.ceil(filteredPieces.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedPieces = filteredPieces.slice(startIndex, startIndex + itemsPerPage);

  // Actions groupées
  const handleBulkValidate = async () => {
    if (selectedPieceIds.length === 0) return;
    if (!window.confirm(`Valider ${selectedPieceIds.length} pièce(s) ?`)) return;
    try {
      for (const id of selectedPieceIds) {
        await piecesService.validate(id, activeEntity.id);
      }
      setSelectedPieceIds([]);
      loadData();
    } catch (err) {
      alert('Erreur: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleBulkCancel = async () => {
    if (selectedPieceIds.length === 0) return;
    if (!window.confirm(`Annuler ${selectedPieceIds.length} pièce(s) ?`)) return;
    try {
      for (const id of selectedPieceIds) {
        await piecesService.cancel(id, activeEntity.id);
      }
      setSelectedPieceIds([]);
      loadData();
    } catch (err) {
      alert('Erreur: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleDuplicate = async () => {
    if (selectedPieceIds.length === 0) {
      alert('Aucune pièce sélectionnée');
      return;
    }
    setShowActionsMenu(false);
    alert('Duplication à implémenter');
  };

  const handleDelete = async () => {
    if (selectedPieceIds.length === 0) {
      alert('Aucune pièce sélectionnée');
      return;
    }
    if (!window.confirm(`Supprimer ${selectedPieceIds.length} pièce(s) ?`)) return;
    setShowActionsMenu(false);
    try {
      for (const id of selectedPieceIds) {
        await piecesService.delete(id, activeEntity.id);
      }
      setSelectedPieceIds([]);
      loadData();
    } catch (err) {
      alert('Erreur: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleReverse = async () => {
    if (selectedPieceIds.length === 0) {
      alert('Aucune pièce sélectionnée');
      return;
    }
    setShowActionsMenu(false);
    alert('Extourné à implémenter');
  };

  // Composants d'affichage
  const PartnerDisplay = ({ partner }) => {
    if (!partner) return <span className="text-gray-400 text-xs">—</span>;
    return (
      <div className="text-xs leading-tight">
        <div className="font-medium truncate max-w-[130px]">{partner.displayName || partner.name || 'Partenaire'}</div>
        {partner.email && <div className="text-gray-400 text-[10px] truncate max-w-[130px]">{partner.email}</div>}
      </div>
    );
  };

  const StateBadge = ({ state }) => {
    const config = {
      posted: { text: 'Comptabilisé', cls: 'bg-green-100 text-green-700' },
      draft: { text: 'Brouillon', cls: 'bg-amber-100 text-amber-700' },
      cancel: { text: 'Annulé', cls: 'bg-red-100 text-red-700' }
    }[state] || { text: state || 'Inconnu', cls: 'bg-gray-100 text-gray-700' };
    return (
      <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium ${config.cls}`}>
        {config.text}
      </span>
    );
  };

  const PaymentBadge = ({ state }) => {
    const config = {
      'not_paid': { text: 'Non payé', cls: 'bg-gray-100 text-gray-700' },
      'paid': { text: 'Payé', cls: 'bg-green-100 text-green-700' },
      'partial': { text: 'Partiel', cls: 'bg-yellow-100 text-yellow-700' }
    }[state] || { text: state || '—', cls: 'bg-gray-100 text-gray-700' };
    return (
      <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium ${config.cls}`}>
        {config.text}
      </span>
    );
  };

  // Définition des colonnes
  const columns = [
    { id: 'date', label: 'Date', width: '85px' },
    { id: 'numero', label: 'N° Pièce', width: '130px' },
    { id: 'type_journal', label: 'Journal', width: '70px' },
    { id: 'reference', label: 'Référence', width: '90px' },
    { id: 'partenaire', label: 'Partenaire', width: '140px' },
    { id: 'montant_ht', label: 'HT', width: '90px', align: 'right' },
    { id: 'montant_taxes', label: 'Taxes', width: '90px', align: 'right' },
    { id: 'montant_ttc', label: 'TTC', width: '90px', align: 'right' },
    { id: 'etat', label: 'État', width: '85px' },
    { id: 'paiement', label: 'Paiement', width: '75px' }
  ];

  if (!activeEntity) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-7xl mx-auto bg-white border border-gray-300">
          <div className="border-b border-gray-300 px-4 py-3">
            <div className="text-lg font-bold text-gray-900">Pièces Comptables</div>
          </div>
          <div className="p-8">
            <div className="bg-yellow-50 border border-yellow-200 rounded p-6 text-center">
              <FiAlertCircle className="text-yellow-600 mx-auto mb-3" size={32} />
              <p className="text-yellow-800 font-medium text-lg mb-3">Aucune entité sélectionnée</p>
              <p className="text-sm text-gray-600 mb-4">
                Veuillez sélectionner une entité pour voir les pièces comptables.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading && pieces.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-7xl mx-auto bg-white border border-gray-300">
          <div className="border-b border-gray-300 px-4 py-3">
            <div className="text-lg font-bold text-gray-900">Pièces Comptables</div>
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
              <Tooltip text="Créer une nouvelle pièce">
                <button
                  onClick={() => navigate('/comptabilite/pieces/create')}
                  className="h-8 px-3 bg-purple-600 text-white text-xs font-medium hover:bg-purple-700 hover:scale-105 transition-all duration-200 rounded flex items-center gap-1"
                >
                  <FiPlus size={12} /> Nouvelle pièce
                </button>
              </Tooltip>
              <Tooltip text="Actualiser la liste">
                <h1 
                  className="text-lg font-bold text-gray-900 cursor-pointer hover:text-purple-600 hover:scale-105 transition-all duration-200"
                  onClick={loadData}
                >
                  Pièces Comptables
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
                    <Tooltip text="Dupliquer les pièces sélectionnées" position="right">
                      <button
                        onClick={handleDuplicate}
                        className="w-full px-3 py-2 text-xs text-left hover:bg-gray-50 flex items-center gap-2"
                      >
                        <FiCopy size={12} /> Dupliquer
                      </button>
                    </Tooltip>
                    <Tooltip text="Supprimer les pièces sélectionnées" position="right">
                      <button
                        onClick={handleDelete}
                        className="w-full px-3 py-2 text-xs text-left hover:bg-red-50 hover:text-red-600 flex items-center gap-2"
                      >
                        <FiTrash2 size={12} /> Supprimer
                      </button>
                    </Tooltip>
                    <Tooltip text="Extourner les pièces sélectionnées" position="right">
                      <button
                        onClick={handleReverse}
                        className="w-full px-3 py-2 text-xs text-left hover:bg-gray-50 flex items-center gap-2"
                      >
                        <FiRotateCcw size={12} /> Extourner
                      </button>
                    </Tooltip>
                  </div>
                )}
              </div>
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
                      case 'etat':
                        displayText = filter.value === 'draft' ? 'Brouillon' : 'Comptabilisé';
                        displayColor = 'bg-amber-100 text-amber-700';
                        break;
                      case 'paiement':
                        displayText = filter.value === 'paid' ? 'Payé' : 'Non payé';
                        displayColor = filter.value === 'paid' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700';
                        break;
                      case 'partenaire':
                        displayText = `Partenaire: ${filter.value}`;
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
                    placeholder="Rechercher..."
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
                              onClick={() => addFilter('etat', 'draft')}
                              className="w-full text-left text-xs px-2 py-1 hover:bg-gray-100 rounded flex items-center gap-2"
                            >
                              <span className="w-20">État</span>
                              <span className="text-amber-600">= Brouillon</span>
                            </button>
                            <button
                              onClick={() => addFilter('etat', 'posted')}
                              className="w-full text-left text-xs px-2 py-1 hover:bg-gray-100 rounded flex items-center gap-2"
                            >
                              <span className="w-20">État</span>
                              <span className="text-green-600">= Comptabilisé</span>
                            </button>
                            <button
                              onClick={() => addFilter('paiement', 'paid')}
                              className="w-full text-left text-xs px-2 py-1 hover:bg-gray-100 rounded flex items-center gap-2"
                            >
                              <span className="w-20">Paiement</span>
                              <span className="text-green-600">= Payé</span>
                            </button>
                            <button
                              onClick={() => addFilter('paiement', 'not_paid')}
                              className="w-full text-left text-xs px-2 py-1 hover:bg-gray-100 rounded flex items-center gap-2"
                            >
                              <span className="w-20">Paiement</span>
                              <span className="text-red-600">= Non payé</span>
                            </button>
                          </div>
                        </div>
                        <div className="p-2">
                          <p className="text-xs font-medium text-gray-700 mb-2">Partenaire</p>
                          <div className="max-h-40 overflow-y-auto">
                            {partnerList.slice(0, 10).map((partner, idx) => (
                              <button
                                key={idx}
                                onClick={() => addFilter('partenaire', partner)}
                                className="w-full text-left text-xs px-2 py-1 hover:bg-gray-100 rounded truncate"
                              >
                                {partner}
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
        {selectedPieceIds.length > 0 && (
          <div className="border-b border-gray-300 px-4 py-2 bg-gray-50 flex items-center gap-2">
            <span className="text-xs text-gray-600">{selectedPieceIds.length} pièce(s) sélectionnée(s)</span>
            <Tooltip text="Valider les pièces sélectionnées">
              <button
                onClick={handleBulkValidate}
                className="h-6 px-2 bg-green-600 text-white text-xs hover:bg-green-700 rounded"
              >
                Valider
              </button>
            </Tooltip>
            <Tooltip text="Annuler les pièces sélectionnées">
              <button
                onClick={handleBulkCancel}
                className="h-6 px-2 bg-red-600 text-white text-xs hover:bg-red-700 rounded"
              >
                Annuler
              </button>
            </Tooltip>
          </div>
        )}

        {/* Tableau avec menu colonnes flottant */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-gray-100 border-b border-gray-300">
                <th className="border-r border-gray-300 px-2 py-1.5 w-8 text-center">
                  <input
                    type="checkbox"
                    checked={selectedPieceIds.length === paginatedPieces.length && paginatedPieces.length > 0}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedPieceIds(paginatedPieces.map(p => p.id));
                      } else {
                        setSelectedPieceIds([]);
                      }
                    }}
                    className="w-3.5 h-3.5 cursor-pointer"
                  />
                </th>
                {visibleColumns.date && (
                  <th 
                    className="border-r border-gray-300 px-2 py-1.5 text-left text-xs font-medium text-gray-700 cursor-pointer hover:bg-gray-200 min-w-[85px]"
                    onClick={() => handleSort('date')}
                  >
                    <div className="flex items-center gap-1">
                      <span>Date</span>
                      <SortIcon column="date" sortColumn={sortColumn} sortDirection={sortDirection} />
                    </div>
                  </th>
                )}
                {visibleColumns.numero && (
                  <th 
                    className="border-r border-gray-300 px-2 py-1.5 text-left text-xs font-medium text-gray-700 cursor-pointer hover:bg-gray-200 min-w-[130px]"
                    onClick={() => handleSort('numero')}
                  >
                    <div className="flex items-center gap-1">
                      <span>N° Pièce</span>
                      <SortIcon column="numero" sortColumn={sortColumn} sortDirection={sortDirection} />
                    </div>
                  </th>
                )}
                {visibleColumns.type_journal && (
                  <th 
                    className="border-r border-gray-300 px-2 py-1.5 text-left text-xs font-medium text-gray-700 cursor-pointer hover:bg-gray-200 min-w-[70px]"
                    onClick={() => handleSort('type_journal')}
                  >
                    <div className="flex items-center gap-1">
                      <span>Journal</span>
                      <SortIcon column="type_journal" sortColumn={sortColumn} sortDirection={sortDirection} />
                    </div>
                  </th>
                )}
                {visibleColumns.reference && (
                  <th 
                    className="border-r border-gray-300 px-2 py-1.5 text-left text-xs font-medium text-gray-700 cursor-pointer hover:bg-gray-200 min-w-[90px]"
                    onClick={() => handleSort('reference')}
                  >
                    <div className="flex items-center gap-1">
                      <span>Référence</span>
                      <SortIcon column="reference" sortColumn={sortColumn} sortDirection={sortDirection} />
                    </div>
                  </th>
                )}
                {visibleColumns.partenaire && (
                  <th 
                    className="border-r border-gray-300 px-2 py-1.5 text-left text-xs font-medium text-gray-700 cursor-pointer hover:bg-gray-200 min-w-[140px]"
                    onClick={() => handleSort('partenaire')}
                  >
                    <div className="flex items-center gap-1">
                      <span>Partenaire</span>
                      <SortIcon column="partenaire" sortColumn={sortColumn} sortDirection={sortDirection} />
                    </div>
                  </th>
                )}
                {visibleColumns.montant_ht && (
                  <th 
                    className="border-r border-gray-300 px-2 py-1.5 text-right text-xs font-medium text-gray-700 cursor-pointer hover:bg-gray-200 min-w-[90px]"
                    onClick={() => handleSort('montant_ht')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>HT</span>
                      <SortIcon column="montant_ht" sortColumn={sortColumn} sortDirection={sortDirection} />
                    </div>
                  </th>
                )}
                {visibleColumns.montant_taxes && (
                  <th 
                    className="border-r border-gray-300 px-2 py-1.5 text-right text-xs font-medium text-gray-700 cursor-pointer hover:bg-gray-200 min-w-[90px]"
                    onClick={() => handleSort('montant_taxes')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Taxes</span>
                      <SortIcon column="montant_taxes" sortColumn={sortColumn} sortDirection={sortDirection} />
                    </div>
                  </th>
                )}
                {visibleColumns.montant_ttc && (
                  <th 
                    className="border-r border-gray-300 px-2 py-1.5 text-right text-xs font-medium text-gray-700 cursor-pointer hover:bg-gray-200 min-w-[90px]"
                    onClick={() => handleSort('montant_ttc')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>TTC</span>
                      <SortIcon column="montant_ttc" sortColumn={sortColumn} sortDirection={sortDirection} />
                    </div>
                  </th>
                )}
                {visibleColumns.etat && (
                  <th 
                    className="border-r border-gray-300 px-2 py-1.5 text-left text-xs font-medium text-gray-700 cursor-pointer hover:bg-gray-200 min-w-[85px]"
                    onClick={() => handleSort('etat')}
                  >
                    <div className="flex items-center gap-1">
                      <span>État</span>
                      <SortIcon column="etat" sortColumn={sortColumn} sortDirection={sortDirection} />
                    </div>
                  </th>
                )}
                {visibleColumns.paiement && (
                  <th 
                    className="border-r border-gray-300 px-2 py-1.5 text-left text-xs font-medium text-gray-700 cursor-pointer hover:bg-gray-200 min-w-[75px]"
                    onClick={() => handleSort('paiement')}
                  >
                    <div className="flex items-center gap-1">
                      <span>Paiement</span>
                      <SortIcon column="paiement" sortColumn={sortColumn} sortDirection={sortDirection} />
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
              ) : paginatedPieces.length === 0 ? (
                <tr>
                  <td colSpan={Object.values(visibleColumns).filter(v => v).length + 2} className="border border-gray-300 p-8 text-center text-gray-500 text-sm">
                    {activeFilters.length > 0 ? 'Aucun résultat pour ces filtres' : 'Aucune pièce comptable'}
                  </td>
                </tr>
              ) : (
                paginatedPieces.map((piece) => (
                  <tr
                    key={piece.id}
                    className={`hover:bg-gray-50 cursor-pointer transition-colors ${activeRowId === piece.id ? 'bg-purple-50' : ''}`}
                    onClick={() => setActiveRowId(piece.id)}
                    onDoubleClick={() => navigate(`/comptabilite/pieces/${piece.id}`)}
                  >
                    <td className="border border-gray-300 px-2 py-1.5 text-center" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedPieceIds.includes(piece.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedPieceIds([...selectedPieceIds, piece.id]);
                          } else {
                            setSelectedPieceIds(selectedPieceIds.filter(id => id !== piece.id));
                          }
                        }}
                        className="w-3.5 h-3.5 cursor-pointer"
                      />
                    </td>
                    {visibleColumns.date && (
                      <td className="border border-gray-300 px-2 py-1.5 text-xs text-gray-700">
                        {piece.date ? new Date(piece.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'}
                      </td>
                    )}
                    {visibleColumns.numero && (
                      <td className="border border-gray-300 px-2 py-1.5">
                        <div className="text-xs">
                          <div className="font-medium truncate max-w-[100px]">{piece.name || '—'}</div>
                          <div className="text-gray-400 text-[10px] truncate max-w-[100px]">{getJournalCode(piece)}</div>
                        </div>
                      </td>
                    )}
                    {visibleColumns.type_journal && (
                      <td className="border border-gray-300 px-2 py-1.5 text-xs text-gray-700">
                        {getJournalCode(piece)}
                      </td>
                    )}
                    {visibleColumns.reference && (
                      <td className="border border-gray-300 px-2 py-1.5 text-xs text-gray-700 truncate max-w-[80px]" title={piece.ref}>
                        {piece.ref || '—'}
                      </td>
                    )}
                    {visibleColumns.partenaire && (
                      <td className="border border-gray-300 px-2 py-1.5">
                        <PartnerDisplay partner={getPartnerDisplay(piece)} />
                      </td>
                    )}
                    {/* ✅ HT formaté sans virgules */}
                    {visibleColumns.montant_ht && (
                      <td className="border border-gray-300 px-2 py-1.5 text-right text-xs">
                        {formatAmount(piece.amount_untaxed)}
                        <span className="text-gray-400 text-[10px] ml-1">{getCurrencyCode(piece)}</span>
                      </td>
                    )}
                    {/* ✅ Taxes formatées sans virgules */}
                    {visibleColumns.montant_taxes && (
                      <td className="border border-gray-300 px-2 py-1.5 text-right text-xs text-blue-600">
                        {formatAmount(piece.amount_tax)}
                        <span className="text-gray-400 text-[10px] ml-1">{getCurrencyCode(piece)}</span>
                      </td>
                    )}
                    {/* ✅ TTC formaté sans virgules */}
                    {visibleColumns.montant_ttc && (
                      <td className="border border-gray-300 px-2 py-1.5 text-right text-xs text-red-600">
                        {formatAmount(piece.amount_total)}
                        <span className="text-gray-400 text-[10px] ml-1">{getCurrencyCode(piece)}</span>
                      </td>
                    )}
                    {visibleColumns.etat && (
                      <td className="border border-gray-300 px-2 py-1.5">
                        <StateBadge state={piece.state} />
                      </td>
                    )}
                    {visibleColumns.paiement && (
                      <td className="border border-gray-300 px-2 py-1.5">
                        <PaymentBadge state={piece.payment_state} />
                      </td>
                    )}
                    <td className="border border-gray-300 px-2 py-1.5"></td>
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