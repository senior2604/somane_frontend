// src/features/comptabilite/pages/Sequences/List.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiAlertCircle,
  FiArrowDown,
  FiArrowUp,
  FiChevronLeft,
  FiChevronRight,
  FiChevronsLeft,
  FiChevronsRight,
  FiFilter,
  FiHash,
  FiLoader,
  FiMoreHorizontal,
  FiSearch,
  FiSettings,
  FiX,
} from 'react-icons/fi';
import { useEntity } from '../../../../context/EntityContext';
import { sequencesService } from '../../services';

const DOCUMENT_SEQUENCE_TYPES = [
  {
    code: 'PIECE',
    backendCode: 'account.move',
    label: 'Pieces comptables',
    prefix: '{JOURNAL}/{YY}/',
    aliases: ['PIECE', 'ACCOUNT.MOVE', 'ACCOUNT_MOVE', 'ACCOUNT MOVE'],
  },
  {
    code: 'FACTURE',
    backendCode: 'account.invoice',
    label: 'Factures',
    prefix: 'FAC/{YY}/',
    aliases: ['FACTURE', 'FACTURES', 'ACCOUNT.INVOICE', 'ACCOUNT_INVOICE', 'ACCOUNT INVOICE'],
  },
  {
    code: 'PAIEMENT',
    backendCode: 'account.payment',
    label: 'Paiements',
    prefix: '{JOURNAL}/PAY/{YY}/',
    aliases: ['PAIEMENT', 'PAIEMENTS', 'PAYMENT', 'ACCOUNT.PAYMENT', 'ACCOUNT_PAYMENT', 'ACCOUNT PAYMENT'],
  },
  {
    code: 'AVOIR',
    backendCode: 'account.refund',
    label: 'Avoirs',
    prefix: 'AV/{YY}/',
    aliases: ['AVOIR', 'AVOIRS', 'REFUND', 'ACCOUNT.REFUND', 'ACCOUNT_REFUND', 'ACCOUNT REFUND'],
  },
  {
    code: 'RELEVE',
    backendCode: 'account.bank.statement',
    label: 'Releves bancaires',
    prefix: 'REL/{YY}/',
    aliases: ['RELEVE', 'RELEVES', 'ACCOUNT.BANK.STATEMENT', 'ACCOUNT_BANK_STATEMENT', 'ACCOUNT BANK STATEMENT'],
  },
  {
    code: 'RAPPROCHEMENT',
    backendCode: 'account.reconcile',
    label: 'Rapprochements',
    prefix: 'LET/{YY}/',
    aliases: ['RAPPROCHEMENT', 'RAPPROCHEMENTS', 'LETTRAGE', 'ACCOUNT.RECONCILE', 'ACCOUNT_RECONCILE', 'ACCOUNT RECONCILE'],
  },
];

const normalizeApiList = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.records)) return data.records;
  return [];
};

const normalizeText = (value) => String(value || '')
  .trim()
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '');

const normalizeSequenceCode = (value) => normalizeText(value)
  .replace(/[_\s-]+/g, '.')
  .toUpperCase();

const padNumber = (value, padding) => String(Number(value || 0)).padStart(Number(padding || 2), '0');

const getSequenceType = (code) => {
  const normalizedCode = normalizeSequenceCode(code);
  return DOCUMENT_SEQUENCE_TYPES.find((type) => (
    normalizeSequenceCode(type.code) === normalizedCode
    || normalizeSequenceCode(type.backendCode) === normalizedCode
    || type.aliases.some((alias) => normalizeSequenceCode(alias) === normalizedCode)
  ));
};

const getSequenceTypeLabel = (code) => (
  getSequenceType(code)?.label
  || code
  || '-'
);

const mergeDefinedSequences = (rows) => (
  DOCUMENT_SEQUENCE_TYPES.map((type) => {
    const existing = rows.find((sequence) => getSequenceType(sequence.code)?.code === type.code);
    return existing ? {
      ...existing,
      display_code: type.code,
      display_label: type.label,
    } : {
      id: '',
      code: type.code,
      backendCode: type.backendCode,
      display_code: type.code,
      display_label: type.label,
      name: type.label,
      prefix: type.prefix,
      suffix: '',
      padding: 2,
      current_number: 0,
      number_increment: 1,
      active: false,
      missing: true,
    };
  })
);

const formatPattern = (sequence) => {
  if (sequence?.missing) return '-';
  const prefix = sequence.prefix || '';
  const suffix = sequence.suffix || '';
  const zeros = '0'.repeat(Number(sequence.padding || 2));
  return `${prefix}${zeros}${suffix}`;
};

const formatCurrentNumber = (sequence) => {
  if (sequence?.missing) return '-';
  const prefix = sequence.prefix || '';
  const suffix = sequence.suffix || '';
  const padding = Number(sequence.padding || 2);
  const number = padNumber(sequence.current_number || 0, padding);
  return `${prefix}${number}${suffix}`;
};

const formatNextNumber = (sequence) => {
  if (sequence?.missing) return '-';
  const prefix = sequence.prefix || '';
  const suffix = sequence.suffix || '';
  const padding = Number(sequence.padding || 2);
  const next = Number(sequence.current_number || 0) + Number(sequence.number_increment || 1);
  return `${prefix}${padNumber(next, padding)}${suffix}`;
};

const Tooltip = ({ children, text, position = 'top' }) => {
  const [show, setShow] = useState(false);

  return (
    <div className="relative inline-block">
      <div onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
        {children}
      </div>
      {show && (
        <div className={`absolute z-50 rounded bg-gray-800 px-2 py-1 text-xs text-white whitespace-nowrap ${
          position === 'top' ? 'bottom-full left-1/2 mb-1 -translate-x-1/2' :
          position === 'bottom' ? 'top-full left-1/2 mt-1 -translate-x-1/2' :
          position === 'left' ? 'right-full top-1/2 mr-1 -translate-y-1/2' :
          'left-full top-1/2 ml-1 -translate-y-1/2'
        }`}>
          {text}
          <div className={`absolute h-2 w-2 rotate-45 bg-gray-800 ${
            position === 'top' ? 'left-1/2 top-full -mt-1 -translate-x-1/2' :
            position === 'bottom' ? 'bottom-full left-1/2 -mb-1 -translate-x-1/2' :
            position === 'left' ? 'left-full top-1/2 -ml-1 -translate-y-1/2' :
            'right-full top-1/2 -mr-1 -translate-y-1/2'
          }`} />
        </div>
      )}
    </div>
  );
};

const SortIcon = ({ column, sortColumn, sortDirection }) => {
  if (sortColumn !== column) return null;
  return sortDirection === 'asc'
    ? <FiArrowUp size={12} className="ml-1 inline" />
    : <FiArrowDown size={12} className="ml-1 inline" />;
};

const StatusBadge = ({ sequence }) => {
  if (sequence.missing) {
    return (
      <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">
        Non configure
      </span>
    );
  }
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
      sequence.active === false ? 'bg-gray-100 text-gray-700' : 'bg-green-100 text-green-700'
    }`}>
      {sequence.active === false ? 'Inactif' : 'Actif'}
    </span>
  );
};

export default function SequencesList() {
  const navigate = useNavigate();
  const { activeEntity } = useEntity();

  const filterMenuRef = useRef(null);
  const searchContainerRef = useRef(null);

  const [sequences, setSequences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeRowId, setActiveRowId] = useState(null);
  const [initializingCode, setInitializingCode] = useState('');
  const [searchText, setSearchText] = useState('');
  const [activeFilters, setActiveFilters] = useState([]);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [showColumnsMenu, setShowColumnsMenu] = useState(false);
  const [columnsMenuPosition, setColumnsMenuPosition] = useState({ top: 0, left: 0 });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);
  const [sortColumn, setSortColumn] = useState('type');
  const [sortDirection, setSortDirection] = useState('asc');

  const [visibleColumns, setVisibleColumns] = useState({
    type: true,
    name: true,
    format: true,
    current_number: true,
    next_number: true,
    increment: true,
    active: true,
  });

  const columns = [
    { id: 'type', label: 'Type de document' },
    { id: 'name', label: 'Nom' },
    { id: 'format', label: 'Modele' },
    { id: 'current_number', label: 'Numero actuel' },
    { id: 'next_number', label: 'Prochain numero' },
    { id: 'increment', label: 'Increment' },
    { id: 'active', label: 'Statut' },
  ];

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterMenuRef.current && !filterMenuRef.current.contains(event.target)) {
        setShowFilterMenu(false);
      }
      const columnsMenuElement = document.getElementById('columns-menu-sequences');
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

  const loadData = useCallback(async () => {
    if (!activeEntity) return;

    try {
      setLoading(true);
      setError(null);
      const data = await sequencesService.getAll(activeEntity.id);
      setSequences(mergeDefinedSequences(normalizeApiList(data)));
    } catch (err) {
      console.error('Erreur chargement sequences:', err);
      setError('Impossible de charger les sequences.');
      setSequences(mergeDefinedSequences([]));
    } finally {
      setLoading(false);
    }
  }, [activeEntity]);

  useEffect(() => {
    if (activeEntity) {
      loadData();
    }
  }, [activeEntity, loadData]);

  const applyFiltersToSequences = useCallback((sequenceList, filters) => {
    let filtered = [...sequenceList];

    filters.forEach((filter) => {
      filtered = filtered.filter((sequence) => {
        let fieldValue = '';

        switch (filter.field) {
          case 'type':
            fieldValue = getSequenceTypeLabel(sequence.code);
            break;
          case 'name':
            fieldValue = sequence.name || '';
            break;
          case 'format':
            fieldValue = formatPattern(sequence);
            break;
          case 'active':
            fieldValue = sequence.missing ? 'Non configure' : (sequence.active ? 'Actif' : 'Inactif');
            break;
          case 'recherche':
            fieldValue = `${getSequenceTypeLabel(sequence.code)} ${sequence.name || ''} ${sequence.code || ''} ${sequence.prefix || ''} ${sequence.suffix || ''}`;
            break;
          default:
            fieldValue = '';
        }

        return normalizeText(fieldValue).includes(normalizeText(filter.value));
      });
    });

    return filtered;
  }, []);

  const getSortedSequences = (sequenceList, column, direction) => (
    [...sequenceList].sort((firstSequence, secondSequence) => {
      let firstValue = '';
      let secondValue = '';

      switch (column) {
        case 'type':
          firstValue = getSequenceTypeLabel(firstSequence.code);
          secondValue = getSequenceTypeLabel(secondSequence.code);
          break;
        case 'name':
          firstValue = firstSequence.name || '';
          secondValue = secondSequence.name || '';
          break;
        case 'format':
          firstValue = formatPattern(firstSequence);
          secondValue = formatPattern(secondSequence);
          break;
        case 'current_number':
          firstValue = firstSequence.current_number || 0;
          secondValue = secondSequence.current_number || 0;
          break;
        case 'next_number':
          firstValue = formatNextNumber(firstSequence);
          secondValue = formatNextNumber(secondSequence);
          break;
        case 'increment':
          firstValue = firstSequence.number_increment || 1;
          secondValue = secondSequence.number_increment || 1;
          break;
        case 'active':
          firstValue = firstSequence.missing ? 'non configure' : (firstSequence.active ? 'actif' : 'inactif');
          secondValue = secondSequence.missing ? 'non configure' : (secondSequence.active ? 'actif' : 'inactif');
          break;
        default:
          firstValue = '';
          secondValue = '';
      }

      if (typeof firstValue === 'number' && typeof secondValue === 'number') {
        return direction === 'asc' ? firstValue - secondValue : secondValue - firstValue;
      }

      firstValue = String(firstValue).toLowerCase();
      secondValue = String(secondValue).toLowerCase();

      if (direction === 'asc') return firstValue > secondValue ? 1 : -1;
      return firstValue < secondValue ? 1 : -1;
    })
  );

  const addFilter = (field, label, value) => {
    if (!value.trim()) return;
    setActiveFilters((previous) => [...previous, { field, label, value }]);
    setSearchText('');
    setShowFilterMenu(false);
    setCurrentPage(1);
  };

  const removeFilter = (index) => {
    setActiveFilters((previous) => previous.filter((_, itemIndex) => itemIndex !== index));
    setCurrentPage(1);
  };

  const handleSearchKeyDown = (event) => {
    if (event.key === 'Enter' && searchText.trim()) {
      addFilter('recherche', 'Recherche', searchText.trim());
    }
  };

  const handleSort = (column) => {
    if (sortColumn === column) {
      setSortDirection((previous) => (previous === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const filteredSequences = useMemo(() => {
    const rows = applyFiltersToSequences(sequences, activeFilters);
    return getSortedSequences(rows, sortColumn, sortDirection);
  }, [activeFilters, applyFiltersToSequences, sequences, sortColumn, sortDirection]);

  const totalPages = Math.max(1, Math.ceil(filteredSequences.length / itemsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedSequences = filteredSequences.slice((safePage - 1) * itemsPerPage, safePage * itemsPerPage);

  const buildMissingSequencePayload = (sequence) => {
    const type = getSequenceType(sequence.code) || DOCUMENT_SEQUENCE_TYPES.find((item) => item.code === sequence.code);
    return {
      name: type?.label || sequence.name || sequence.code,
      code: type?.backendCode || sequence.backendCode || sequence.code,
      prefix: type?.prefix || sequence.prefix || '',
      suffix: '',
      current_number: 0,
      padding: Number(sequence.padding || 2),
      number_increment: Number(sequence.number_increment || 1),
      active: true,
      ...(activeEntity?.id ? { company: activeEntity.id, company_id: activeEntity.id } : {}),
    };
  };

  const handleSequenceClick = async (sequence) => {
    if (sequence?.id) {
      navigate(`/comptabilite/sequences/${sequence.id}`);
      return;
    }

    if (!sequence?.missing) return;

    if (typeof sequencesService.create !== 'function') {
      setError("Cette sequence n'existe pas encore. Ajoute la methode create dans sequencesService ou lance la creation des sequences par defaut cote backend.");
      return;
    }

    try {
      setError(null);
      setInitializingCode(sequence.code);
      const created = await sequencesService.create(buildMissingSequencePayload(sequence), activeEntity.id);
      const createdId = created?.id || created?.data?.id || created?.result?.id;
      if (createdId) {
        navigate(`/comptabilite/sequences/${createdId}`);
        return;
      }
      await loadData();
      setError("Sequence creee, mais l'identifiant n'a pas ete retourne par l'API.");
    } catch (err) {
      console.error('Erreur creation sequence:', err);
      setError("Impossible de creer automatiquement cette sequence.");
    } finally {
      setInitializingCode('');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-full mx-auto bg-white border border-gray-300">
        <div className="border-b border-gray-300 px-4 py-2">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-shrink-0">
              <Tooltip text="Actualiser la liste">
                <h1
                  className="text-lg font-bold text-gray-900 cursor-pointer hover:text-purple-600 hover:scale-105 transition-all duration-200 flex items-center gap-2"
                  onClick={loadData}
                >
                  <FiHash size={18} />
                  Sequences
                </h1>
              </Tooltip>
              <Tooltip text="Actualiser">
                <button
                  type="button"
                  onClick={loadData}
                  className="w-8 h-8 rounded-full border border-gray-300 text-gray-700 hover:bg-gray-50 hover:scale-110 hover:shadow-md active:scale-90 transition-all duration-200 flex items-center justify-center"
                >
                  {loading ? <FiLoader size={14} className="animate-spin" /> : <FiSettings size={14} />}
                </button>
              </Tooltip>
            </div>

            <div className="flex-1 flex justify-center">
              <div className="relative w-full max-w-2xl" ref={searchContainerRef}>
                <div className="flex items-center flex-wrap border border-gray-300 rounded bg-white min-h-[38px] p-1">
                  {activeFilters.map((filter, index) => (
                    <span key={`${filter.field}-${index}`} className="inline-flex items-center gap-1 bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-xs">
                      {filter.label}: {filter.value}
                      <button type="button" onClick={() => removeFilter(index)} className="hover:text-purple-900">
                        <FiX size={12} />
                      </button>
                    </span>
                  ))}
                  <div className="flex items-center flex-1 min-w-[200px]">
                    <FiSearch size={14} className="text-gray-400 mx-2" />
                    <input
                      type="text"
                      value={searchText}
                      onChange={(event) => setSearchText(event.target.value)}
                      onKeyDown={handleSearchKeyDown}
                      placeholder={activeFilters.length > 0 ? '' : 'Rechercher...'}
                      className="w-full px-1 py-1 text-sm border-0 focus:outline-none text-gray-700 placeholder-gray-400"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowFilterMenu(!showFilterMenu)}
                    className="p-1.5 text-gray-500 hover:text-purple-600 hover:bg-gray-50 rounded transition-colors"
                  >
                    <FiFilter size={16} />
                  </button>
                </div>

                {showFilterMenu && (
                  <div ref={filterMenuRef} className="absolute top-full left-0 mt-1 w-64 bg-white border border-gray-300 shadow-lg rounded z-50 p-2">
                    <div className="text-xs font-medium text-gray-700 mb-2">Filtres rapides</div>
                    {[
                      { field: 'active', label: 'Statut', value: 'Actif' },
                      { field: 'active', label: 'Statut', value: 'Non configure' },
                      { field: 'type', label: 'Type', value: 'Paiements' },
                      { field: 'type', label: 'Type', value: 'Factures' },
                      { field: 'type', label: 'Type', value: 'Pieces comptables' },
                    ].map((filter) => (
                      <button
                        key={`${filter.field}-${filter.value}`}
                        type="button"
                        onClick={() => addFilter(filter.field, filter.label, filter.value)}
                        className="w-full text-left px-2 py-1.5 text-xs hover:bg-gray-50 rounded flex items-center gap-2"
                      >
                        <FiFilter size={12} className="text-purple-600" />
                        {filter.label}: {filter.value}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-xs text-gray-500">Afficher</span>
              <select
                value={itemsPerPage}
                onChange={(event) => {
                  setItemsPerPage(Number(event.target.value));
                  setCurrentPage(1);
                }}
                className="h-8 px-2 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-purple-500"
              >
                {[10, 15, 25, 50, 100].map((size) => (
                  <option key={size} value={size}>{size}</option>
                ))}
              </select>
              <span className="text-xs text-gray-500">lignes</span>
            </div>
          </div>
        </div>

        {error && (
          <div className="border-b border-red-200 bg-red-50 px-4 py-2 flex items-center gap-2 text-red-700 text-sm">
            <FiAlertCircle size={16} />
            {error}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-gray-100 border-b border-gray-300">
                {visibleColumns.type && (
                  <th className="border-r border-gray-300 px-2 py-1.5 text-left font-semibold text-gray-700 cursor-pointer hover:bg-gray-200" onClick={() => handleSort('type')}>
                    Type de document <SortIcon column="type" sortColumn={sortColumn} sortDirection={sortDirection} />
                  </th>
                )}
                {visibleColumns.name && (
                  <th className="border-r border-gray-300 px-2 py-1.5 text-left font-semibold text-gray-700 cursor-pointer hover:bg-gray-200" onClick={() => handleSort('name')}>
                    Nom <SortIcon column="name" sortColumn={sortColumn} sortDirection={sortDirection} />
                  </th>
                )}
                {visibleColumns.format && (
                  <th className="border-r border-gray-300 px-2 py-1.5 text-left font-semibold text-gray-700 cursor-pointer hover:bg-gray-200" onClick={() => handleSort('format')}>
                    Modele <SortIcon column="format" sortColumn={sortColumn} sortDirection={sortDirection} />
                  </th>
                )}
                {visibleColumns.current_number && (
                  <th className="border-r border-gray-300 px-2 py-1.5 text-left font-semibold text-gray-700 cursor-pointer hover:bg-gray-200" onClick={() => handleSort('current_number')}>
                    Numero actuel <SortIcon column="current_number" sortColumn={sortColumn} sortDirection={sortDirection} />
                  </th>
                )}
                {visibleColumns.next_number && (
                  <th className="border-r border-gray-300 px-2 py-1.5 text-left font-semibold text-gray-700 cursor-pointer hover:bg-gray-200" onClick={() => handleSort('next_number')}>
                    Prochain numero <SortIcon column="next_number" sortColumn={sortColumn} sortDirection={sortDirection} />
                  </th>
                )}
                {visibleColumns.increment && (
                  <th className="border-r border-gray-300 px-2 py-1.5 text-right font-semibold text-gray-700 cursor-pointer hover:bg-gray-200" onClick={() => handleSort('increment')}>
                    Increment <SortIcon column="increment" sortColumn={sortColumn} sortDirection={sortDirection} />
                  </th>
                )}
                {visibleColumns.active && (
                  <th className="border-r border-gray-300 px-2 py-1.5 text-center font-semibold text-gray-700 cursor-pointer hover:bg-gray-200" onClick={() => handleSort('active')}>
                    Statut <SortIcon column="active" sortColumn={sortColumn} sortDirection={sortDirection} />
                  </th>
                )}
                <th className="px-2 py-1.5 w-10 text-center relative">
                  <Tooltip text="Gerer les colonnes">
                    <button
                      type="button"
                      className="columns-menu-button p-1 hover:bg-gray-200 rounded"
                      onClick={(event) => {
                        const rect = event.currentTarget.getBoundingClientRect();
                        setColumnsMenuPosition({
                          top: rect.bottom + window.scrollY + 5,
                          left: rect.right - 200,
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
              {loading ? (
                <tr>
                  <td colSpan={8} className="border border-gray-300 px-4 py-8 text-center text-gray-500">
                    <div className="flex items-center justify-center gap-2">
                      <FiLoader className="animate-spin" size={16} />
                      Chargement des sequences...
                    </div>
                  </td>
                </tr>
              ) : paginatedSequences.length === 0 ? (
                <tr>
                  <td colSpan={8} className="border border-gray-300 px-4 py-8 text-center text-gray-500">
                    Aucune sequence
                  </td>
                </tr>
              ) : (
                paginatedSequences.map((sequence) => (
                  <tr
                    key={sequence.id || sequence.code}
                    onClick={() => handleSequenceClick(sequence)}
                    onMouseEnter={() => setActiveRowId(sequence.id || sequence.code)}
                    onMouseLeave={() => setActiveRowId(null)}
                    className={`transition-colors ${
                      sequence.id || sequence.missing ? 'cursor-pointer hover:bg-purple-50' : 'cursor-not-allowed bg-gray-50'
                    } ${activeRowId === (sequence.id || sequence.code) ? 'bg-purple-50' : ''}`}
                  >
                    {visibleColumns.type && (
                      <td className="border border-gray-300 px-2 py-1.5 font-medium text-gray-900">
                        {sequence.display_label || getSequenceTypeLabel(sequence.code)}
                      </td>
                    )}
                    {visibleColumns.name && (
                      <td className="border border-gray-300 px-2 py-1.5 text-gray-700">
                        {sequence.name || '-'}
                      </td>
                    )}
                    {visibleColumns.format && (
                      <td className="border border-gray-300 px-2 py-1.5 font-mono text-xs text-purple-700">
                        {formatPattern(sequence)}
                      </td>
                    )}
                    {visibleColumns.current_number && (
                      <td className="border border-gray-300 px-2 py-1.5 font-mono text-xs text-gray-700">
                        {formatCurrentNumber(sequence)}
                      </td>
                    )}
                    {visibleColumns.next_number && (
                      <td className="border border-gray-300 px-2 py-1.5 font-mono text-xs text-green-700">
                        {formatNextNumber(sequence)}
                      </td>
                    )}
                    {visibleColumns.increment && (
                      <td className="border border-gray-300 px-2 py-1.5 text-right text-gray-700">
                        {sequence.missing ? '-' : sequence.number_increment || 1}
                      </td>
                    )}
                    {visibleColumns.active && (
                      <td className="border border-gray-300 px-2 py-1.5 text-center">
                        {initializingCode === sequence.code ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-medium text-purple-700">
                            <FiLoader size={10} className="animate-spin" />
                            Creation
                          </span>
                        ) : (
                          <StatusBadge sequence={sequence} />
                        )}
                      </td>
                    )}
                    <td className="border border-gray-300 px-2 py-1.5 text-center text-gray-400">
                      {sequence.id || sequence.missing ? <FiSettings size={14} className="mx-auto" /> : '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {showColumnsMenu && (
          <div
            id="columns-menu-sequences"
            className="fixed z-50 rounded border border-gray-300 bg-white shadow-lg"
            style={{ top: columnsMenuPosition.top, left: columnsMenuPosition.left, width: '220px' }}
          >
            <div className="border-b border-gray-200 p-2">
              <p className="mb-2 text-xs font-medium text-gray-700">Colonnes a afficher</p>
              {columns.map((column) => (
                <label key={column.id} className="flex items-center gap-2 px-2 py-1.5 text-xs hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={visibleColumns[column.id]}
                    onChange={() => setVisibleColumns((previous) => ({ ...previous, [column.id]: !previous[column.id] }))}
                    className="h-3.5 w-3.5 cursor-pointer accent-purple-600"
                  />
                  {column.label}
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="border-t border-gray-300 px-4 py-3 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            {filteredSequences.length > 0
              ? `${(safePage - 1) * itemsPerPage + 1}-${Math.min(safePage * itemsPerPage, filteredSequences.length)} / ${filteredSequences.length}`
              : '0 / 0'
            }
          </div>
          <div className="flex items-center gap-1">
            <Tooltip text="Premiere page">
              <button type="button" onClick={() => setCurrentPage(1)} disabled={safePage === 1} className="p-1 border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50">
                <FiChevronsLeft size={16} />
              </button>
            </Tooltip>
            <Tooltip text="Page precedente">
              <button type="button" onClick={() => setCurrentPage(Math.max(1, safePage - 1))} disabled={safePage === 1} className="p-1 border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50">
                <FiChevronLeft size={16} />
              </button>
            </Tooltip>
            <span className="px-3 py-1 text-sm text-gray-600">
              Page {safePage} sur {totalPages}
            </span>
            <Tooltip text="Page suivante">
              <button type="button" onClick={() => setCurrentPage(Math.min(totalPages, safePage + 1))} disabled={safePage === totalPages} className="p-1 border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50">
                <FiChevronRight size={16} />
              </button>
            </Tooltip>
            <Tooltip text="Derniere page">
              <button type="button" onClick={() => setCurrentPage(totalPages)} disabled={safePage === totalPages} className="p-1 border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50">
                <FiChevronsRight size={16} />
              </button>
            </Tooltip>
          </div>
        </div>
      </div>
    </div>
  );
}
