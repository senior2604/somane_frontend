// src/features/comptabilite/pages/payement/PaymentList.jsx

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
  FiMoreHorizontal,
  FiPlus,
  FiRefreshCw,
  FiSettings,
  FiX,
} from 'react-icons/fi';
import axiosInstance from '../../../../config/axiosInstance';

const API = {
  payments: 'compta/payments/',
};

const normalizeApiList = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.records)) return data.records;
  if (Array.isArray(data?.payments)) return data.payments;
  if (Array.isArray(data?.data?.results)) return data.data.results;
  return [];
};

const getActiveEntity = () => {
  const raw = localStorage.getItem('entiteActive');
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : { id: raw };
  } catch {
    return { id: raw };
  }
};

const normalizeText = (value) => String(value || '')
  .trim()
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '');

const formatAmount = (value) => {
  const num = Number(value || 0);
  if (Number.isNaN(num)) return '0';
  return Math.round(num).toLocaleString('fr-FR');
};

const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const labelOf = (value, fields = ['name', 'display_name', 'label']) => {
  if (!value) return '';
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  return fields.map((field) => value[field]).filter(Boolean).join(' - ');
};

const getPaymentDate = (payment) => payment?.payment_date || payment?.date || payment?.create_date || payment?.created_at || '';
const getPaymentNumber = (payment) => payment?.name || payment?.number || payment?.payment_number || '—';
const getPaymentReference = (payment) => payment?.reference || payment?.payment_reference || payment?.narration || '—';
const getPaymentCurrency = (payment) => payment?.currency_code || payment?.currency_id_label || payment?.currency_label || 'XOF';
const getPartnerLabel = (payment) => payment?.partner_name || payment?.partner_id_label || labelOf(payment?.partner) || '—';
const getJournalCode = (payment) => payment?.journal_code || payment?.journal_id_label || labelOf(payment?.journal, ['code', 'name']) || '—';
const getPaymentMethod = (payment) => (
  payment?.payment_method_name
  || payment?.payment_method_line_id_label
  || payment?.payment_method_id_label
  || payment?.payment_method_code
  || '—'
);

const getActionErrorMessage = (err, fallback) => {
  const data = err?.response?.data || err?.data;
  if (typeof data === 'string') return data;
  if (data?.detail) return data.detail;
  if (data) return JSON.stringify(data);
  return err?.message || fallback;
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

const PaymentTypeBadge = ({ type }) => {
  const normalized = String(type || '').toLowerCase();
  const config = {
    inbound: { text: 'Encaissement', cls: 'bg-blue-100 text-blue-700' },
    outbound: { text: 'Décaissement', cls: 'bg-orange-100 text-orange-700' },
    transfer: { text: 'Transfert', cls: 'bg-purple-100 text-purple-700' },
  }[normalized] || { text: type || '—', cls: 'bg-gray-100 text-gray-700' };

  return (
    <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ${config.cls}`}>
      {config.text}
    </span>
  );
};

const StateBadge = ({ state }) => {
  const normalized = normalizeText(state || 'draft');
  const config = {
    draft: { text: 'Brouillon', cls: 'bg-amber-100 text-amber-700' },
    posted: { text: 'Validé', cls: 'bg-green-100 text-green-700' },
    cancel: { text: 'Annulé', cls: 'bg-red-100 text-red-700' },
    cancelled: { text: 'Annulé', cls: 'bg-red-100 text-red-700' },
    rejected: { text: 'Rejeté', cls: 'bg-red-100 text-red-700' },
  }[normalized] || { text: state || 'Brouillon', cls: 'bg-gray-100 text-gray-700' };

  return (
    <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ${config.cls}`}>
      {config.text}
    </span>
  );
};

const PartnerDisplay = ({ payment }) => {
  const label = getPartnerLabel(payment);
  const email = payment?.partner_email || payment?.email || payment?.partner?.email || '';

  if (!label || label === '—') return <span className="text-xs text-gray-400">—</span>;

  return (
    <div className="text-xs leading-tight">
      <div className="max-w-[150px] truncate font-medium">{label}</div>
      {email && <div className="max-w-[150px] truncate text-[10px] text-gray-400">{email}</div>}
    </div>
  );
};

export default function PaymentList() {
  const navigate = useNavigate();
  const activeEntity = getActiveEntity();
  const filterMenuRef = useRef(null);
  const actionsMenuRef = useRef(null);
  const searchContainerRef = useRef(null);

  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(null);
  const [selectedPaymentIds, setSelectedPaymentIds] = useState([]);
  const [activeRowId, setActiveRowId] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [activeFilters, setActiveFilters] = useState([]);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [showColumnsMenu, setShowColumnsMenu] = useState(false);
  const [columnsMenuPosition, setColumnsMenuPosition] = useState({ top: 0, left: 0 });
  const [sortColumn, setSortColumn] = useState('date');
  const [sortDirection, setSortDirection] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);
  const [visibleColumns, setVisibleColumns] = useState({
    date: true,
    number: true,
    type: true,
    partner: true,
    journal: true,
    method: true,
    reference: true,
    amount: true,
    state: true,
  });

  const columns = [
    { id: 'date', label: 'Date', width: '100px' },
    { id: 'number', label: 'N° Paiement', width: '130px' },
    { id: 'type', label: 'Type', width: '115px' },
    { id: 'partner', label: 'Partenaire', width: '160px' },
    { id: 'journal', label: 'Journal', width: '80px' },
    { id: 'method', label: 'Méthode', width: '130px' },
    { id: 'reference', label: 'Référence', width: '130px' },
    { id: 'amount', label: 'Montant', width: '110px', align: 'right' },
    { id: 'state', label: 'État', width: '90px' },
  ];

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterMenuRef.current && !filterMenuRef.current.contains(event.target)) {
        setShowFilterMenu(false);
      }
      if (actionsMenuRef.current && !actionsMenuRef.current.contains(event.target)) {
        setShowActionsMenu(false);
      }
      if (!event.target.closest?.('#columns-menu') && !event.target.closest?.('.columns-menu-button')) {
        setShowColumnsMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadPayments = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = { page_size: 500, _ts: Date.now() };
      if (activeEntity?.id) {
        params.company = activeEntity.id;
        params.company_id = activeEntity.id;
        params.entity_id = activeEntity.id;
      }
      const response = await axiosInstance.get(API.payments, { params });
      let list = normalizeApiList(response.data);
      if (!list.length && activeEntity?.id) {
        const fallbackResponse = await axiosInstance.get(API.payments, { params: { page_size: 500, _ts: Date.now() } });
        list = normalizeApiList(fallbackResponse.data);
      }
      setPayments(list);
    } catch (err) {
      const detail = err?.response?.data?.detail || err?.response?.data?.error || '';
      setError(detail ? `Impossible de charger les paiements : ${detail}` : 'Impossible de charger les paiements.');
      console.error('Erreur chargement paiements', err);
    } finally {
      setLoading(false);
    }
  }, [activeEntity?.id]);

  useEffect(() => {
    loadPayments();
  }, [loadPayments]);

  const addSearchAsFilter = () => {
    if (!searchText.trim()) return;
    setActiveFilters((previous) => [...previous, { field: 'search', label: 'Recherche', value: searchText.trim() }]);
    setSearchText('');
    setCurrentPage(1);
  };

  const addFilter = (field, label, value, display) => {
    setActiveFilters((previous) => [
      ...previous.filter((filter) => filter.field !== field || filter.value !== value),
      { field, label, value, display: display || value },
    ]);
    setShowFilterMenu(false);
    setCurrentPage(1);
  };

  const removeFilter = (index) => {
    setActiveFilters((previous) => previous.filter((_, i) => i !== index));
    setCurrentPage(1);
  };

  const clearAllFilters = () => {
    setActiveFilters([]);
    setSearchText('');
    setCurrentPage(1);
  };

  const getSortValue = (payment, column) => {
    switch (column) {
      case 'date':
        return getPaymentDate(payment) || '';
      case 'number':
        return getPaymentNumber(payment);
      case 'type':
        return payment?.payment_type || '';
      case 'partner':
        return getPartnerLabel(payment);
      case 'journal':
        return getJournalCode(payment);
      case 'method':
        return getPaymentMethod(payment);
      case 'reference':
        return getPaymentReference(payment);
      case 'amount':
        return Number(payment?.amount || 0);
      case 'state':
        return payment?.state || '';
      default:
        return '';
    }
  };

  const filteredPayments = useMemo(() => {
    const directSearch = normalizeText(searchText);

    return payments.filter((payment) => {
      const searchable = normalizeText([
        getPaymentNumber(payment),
        getPaymentReference(payment),
        payment?.narration,
        getPartnerLabel(payment),
        getJournalCode(payment),
        getPaymentMethod(payment),
        payment?.payment_type,
        payment?.state,
      ].filter(Boolean).join(' '));

      if (directSearch && !searchable.includes(directSearch)) return false;

      return activeFilters.every((filter) => {
        if (filter.field === 'search') return searchable.includes(normalizeText(filter.value));
        if (filter.field === 'type') return String(payment?.payment_type || '') === filter.value;
        if (filter.field === 'state') return String(payment?.state || '') === filter.value;
        return true;
      });
    });
  }, [payments, searchText, activeFilters]);

  const sortedPayments = useMemo(() => {
    return [...filteredPayments].sort((a, b) => {
      const aValue = getSortValue(a, sortColumn);
      const bValue = getSortValue(b, sortColumn);

      if (typeof aValue === 'number' || typeof bValue === 'number') {
        const result = (Number(aValue) || 0) - (Number(bValue) || 0);
        return sortDirection === 'asc' ? result : -result;
      }

      const result = String(aValue || '').localeCompare(String(bValue || ''), 'fr', { numeric: true, sensitivity: 'base' });
      return sortDirection === 'asc' ? result : -result;
    });
  }, [filteredPayments, sortColumn, sortDirection]);

  const totalPages = Math.max(1, Math.ceil(sortedPayments.length / itemsPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * itemsPerPage;
  const paginatedPayments = sortedPayments.slice(startIndex, startIndex + itemsPerPage);
  const visibleColumnCount = Object.values(visibleColumns).filter(Boolean).length;
  const allCurrentPageSelected = paginatedPayments.length > 0 && paginatedPayments.every((payment) => selectedPaymentIds.includes(payment.id));

  const handleSort = (column) => {
    if (sortColumn === column) {
      setSortDirection((previous) => (previous === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const toggleCurrentPageSelection = (checked) => {
    setSelectedPaymentIds(checked ? paginatedPayments.map((payment) => payment.id) : []);
  };

  const selectedPayments = useMemo(() => {
    const selectedIds = new Set(selectedPaymentIds.map((id) => String(id)));
    return payments.filter((payment) => selectedIds.has(String(payment.id)));
  }, [payments, selectedPaymentIds]);

  const getFilterDisplay = (filter) => {
    if (filter.field === 'search') {
      return { text: filter.value, color: 'bg-blue-100 text-blue-700' };
    }
    if (filter.field === 'type') {
      const labels = { inbound: 'Encaissement', outbound: 'Décaissement', transfer: 'Transfert' };
      const colors = { inbound: 'bg-blue-100 text-blue-700', outbound: 'bg-orange-100 text-orange-700', transfer: 'bg-purple-100 text-purple-700' };
      return { text: labels[filter.value] || filter.value, color: colors[filter.value] || 'bg-gray-100 text-gray-700' };
    }
    if (filter.field === 'state') {
      const labels = { draft: 'Brouillon', posted: 'Validé', cancel: 'Annulé' };
      const colors = { draft: 'bg-amber-100 text-amber-700', posted: 'bg-green-100 text-green-700', cancel: 'bg-red-100 text-red-700' };
      return { text: labels[filter.value] || filter.value, color: colors[filter.value] || 'bg-gray-100 text-gray-700' };
    }
    return { text: `${filter.label || filter.field}: ${filter.display || filter.value}`, color: 'bg-gray-100 text-gray-700' };
  };

  const runPaymentAction = async (action, confirmMessage, fallbackError) => {
    if (selectedPaymentIds.length === 0) {
      alert('Aucun paiement sélectionné');
      return;
    }
    if (confirmMessage && !window.confirm(confirmMessage)) return;

    setShowActionsMenu(false);
    setActionLoading(action);
    try {
      for (const payment of selectedPayments) {
        await axiosInstance.post(`${API.payments}${payment.id}/${action}/`);
      }
      setSelectedPaymentIds([]);
      await loadPayments();
    } catch (err) {
      alert(getActionErrorMessage(err, fallbackError));
    } finally {
      setActionLoading(null);
    }
  };

  const renderCell = (payment, columnId) => {
    switch (columnId) {
      case 'date':
        return <td className="border border-gray-300 px-2 py-1.5 text-xs text-gray-700">{formatDate(getPaymentDate(payment))}</td>;
      case 'number':
        return (
          <td className="border border-gray-300 px-2 py-1.5">
            <div className="text-xs leading-tight">
              <div className="max-w-[115px] truncate font-medium">{getPaymentNumber(payment)}</div>
              <div className="max-w-[115px] truncate text-[10px] text-gray-400">{getJournalCode(payment)}</div>
            </div>
          </td>
        );
      case 'type':
        return <td className="border border-gray-300 px-2 py-1.5"><PaymentTypeBadge type={payment.payment_type} /></td>;
      case 'partner':
        return <td className="border border-gray-300 px-2 py-1.5"><PartnerDisplay payment={payment} /></td>;
      case 'journal':
        return <td className="border border-gray-300 px-2 py-1.5 text-xs text-gray-700">{getJournalCode(payment)}</td>;
      case 'method':
        return (
          <td className="max-w-[120px] truncate border border-gray-300 px-2 py-1.5 text-xs text-gray-700" title={getPaymentMethod(payment)}>
            {getPaymentMethod(payment)}
          </td>
        );
      case 'reference':
        return (
          <td className="max-w-[120px] truncate border border-gray-300 px-2 py-1.5 text-xs text-gray-700" title={getPaymentReference(payment)}>
            {getPaymentReference(payment)}
          </td>
        );
      case 'amount':
        return (
          <td className="border border-gray-300 px-2 py-1.5 text-right text-xs font-medium">
            {formatAmount(payment.amount)}
            <span className="ml-1 text-[10px] text-gray-400">{getPaymentCurrency(payment)}</span>
          </td>
        );
      case 'state':
        return <td className="border border-gray-300 px-2 py-1.5"><StateBadge state={payment.state} /></td>;
      default:
        return null;
    }
  };

  if (loading && payments.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="mx-auto max-w-7xl border border-gray-300 bg-white">
          <div className="border-b border-gray-300 px-4 py-3">
            <div className="text-lg font-bold text-gray-900">Paiements</div>
          </div>
          <div className="flex items-center justify-center p-8">
            <div className="text-center">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-purple-600 border-t-transparent"></div>
              <p className="mt-4 text-sm text-gray-600">Chargement...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="mx-auto max-w-full border border-gray-300 bg-white">
        <div className="border-b border-gray-300 px-4 py-2">
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-shrink-0 items-center gap-3">
              <Tooltip text="Créer un nouveau paiement">
                <button
                  onClick={() => navigate('/comptabilite/paiements/create')}
                  className="flex h-8 items-center gap-1 rounded bg-purple-600 px-3 text-xs font-medium text-white transition-all duration-200 hover:scale-105 hover:bg-purple-700"
                >
                  <FiPlus size={12} />
                  <span>Nouveau paiement</span>
                </button>
              </Tooltip>

              <Tooltip text="Actualiser la liste">
                <h1
                  onClick={loadPayments}
                  className="cursor-pointer text-lg font-bold text-gray-900 transition-all duration-200 hover:scale-105 hover:text-purple-600"
                >
                  Paiements
                </h1>
              </Tooltip>

              <div className="relative" ref={actionsMenuRef}>
                <Tooltip text="Menu des actions">
                  <button
                    onClick={() => setShowActionsMenu((previous) => !previous)}
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-300 text-gray-700 transition-all duration-200 hover:scale-110 hover:bg-gray-50 hover:shadow-md active:scale-90"
                  >
                    <FiSettings size={14} />
                  </button>
                </Tooltip>

                {showActionsMenu && (
                  <div className="absolute left-0 z-50 mt-1 w-56 rounded border border-gray-300 bg-white shadow-lg">
                    <button
                      onClick={() => {
                        if (selectedPaymentIds.length !== 1) return alert('Sélectionnez un seul paiement.');
                        setShowActionsMenu(false);
                        navigate(`/comptabilite/paiements/${selectedPaymentIds[0]}`);
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-gray-50"
                    >
                      Voir le paiement
                    </button>
                    <button
                      disabled={actionLoading === 'validate'}
                      onClick={() => runPaymentAction('validate', `Valider ${selectedPaymentIds.length} paiement(s) ?`, 'Validation impossible')}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-gray-50 disabled:opacity-50"
                    >
                      Valider
                    </button>
                    <button
                      disabled={actionLoading === 'cancel'}
                      onClick={() => runPaymentAction('cancel', `Annuler ${selectedPaymentIds.length} paiement(s) ?`, 'Annulation impossible')}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                    >
                      Annuler
                    </button>
                    <button
                      onClick={() => { setShowActionsMenu(false); navigate('/comptabilite/conditions-paiement'); }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-gray-50"
                    >
                      Conditions de paiement
                    </button>
                    <button
                      onClick={() => { setShowActionsMenu(false); navigate('/comptabilite/methodes-paiement'); }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-gray-50"
                    >
                      Méthodes de paiement
                    </button>
                    <button
                      onClick={() => { setShowActionsMenu(false); loadPayments(); }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-gray-50"
                    >
                      <FiRefreshCw size={12} />
                      Actualiser
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-1 justify-center">
              <div className="relative w-full max-w-2xl" ref={searchContainerRef}>
                <div className="flex min-h-[38px] flex-wrap items-center rounded border border-gray-300 bg-white p-1">
                  {activeFilters.map((filter, index) => {
                    const display = getFilterDisplay(filter);
                    return (
                      <span key={`${filter.field}-${filter.value}-${index}`} className={`m-0.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${display.color}`}>
                        {display.text}
                        <button onClick={() => removeFilter(index)} className="hover:text-red-600">
                          <FiX size={10} />
                        </button>
                      </span>
                    );
                  })}

                <input
                  type="text"
                  value={searchText}
                  onChange={(event) => setSearchText(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') addSearchAsFilter();
                  }}
                  className="min-w-[120px] flex-1 px-2 py-1 text-sm outline-none"
                  placeholder="Rechercher..."
                />

                  <div className="relative" ref={filterMenuRef}>
                    <Tooltip text="Ajouter un filtre">
                      <button
                        onClick={() => setShowFilterMenu((previous) => !previous)}
                        className={`rounded p-1.5 hover:bg-gray-100 ${showFilterMenu ? 'bg-gray-100' : ''}`}
                      >
                        <FiFilter size={14} className={activeFilters.length > 0 ? 'text-purple-600' : 'text-gray-400'} />
                      </button>
                    </Tooltip>

                    {showFilterMenu && (
                      <div className="absolute right-0 z-50 mt-1 w-64 rounded border border-gray-300 bg-white shadow-lg">
                        <div className="border-b border-gray-200 p-2">
                          <p className="mb-2 text-xs font-medium text-gray-700">Ajouter un filtre</p>
                          <div className="space-y-2">
                            {[
                              ['type', 'Type', 'inbound', 'Encaissement', 'text-blue-600'],
                              ['type', 'Type', 'outbound', 'Décaissement', 'text-orange-600'],
                              ['type', 'Type', 'transfer', 'Transfert', 'text-purple-600'],
                              ['state', 'État', 'draft', 'Brouillon', 'text-amber-600'],
                              ['state', 'État', 'posted', 'Validé', 'text-green-600'],
                              ['state', 'État', 'cancel', 'Annulé', 'text-red-600'],
                            ].map(([field, label, value, display, color]) => (
                              <button
                                key={`${field}-${value}`}
                                onClick={() => addFilter(field, label, value, display)}
                                className="flex w-full items-center gap-2 rounded px-2 py-1 text-left text-xs hover:bg-gray-100"
                              >
                                <span className="w-20">{label}</span>
                                <span className={color}>= {display}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                        {activeFilters.length > 0 && (
                          <div className="border-t border-gray-200 p-2">
                            <button onClick={clearAllFilters} className="w-full py-1 text-center text-xs text-red-600 hover:text-red-700">
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

            <div className="flex flex-shrink-0 items-center gap-2">
              <span className="text-xs text-gray-500">Afficher</span>
              <select
                value={itemsPerPage}
                onChange={(event) => setItemsPerPage(Number(event.target.value))}
                className="h-8 rounded border border-gray-300 px-2 text-xs focus:outline-none focus:ring-1 focus:ring-purple-500"
              >
                {[10, 15, 25, 50, 100].map((size) => <option key={size} value={size}>{size}</option>)}
              </select>
              <span className="text-xs text-gray-500">lignes</span>
            </div>
          </div>
        </div>

        {selectedPaymentIds.length > 0 && (
          <div className="flex items-center gap-2 border-b border-gray-300 bg-gray-50 px-4 py-2">
            <span className="text-xs text-gray-600">{selectedPaymentIds.length} paiement(s) sélectionné(s)</span>
            <Tooltip text="Valider les paiements sélectionnés">
              <button
                onClick={() => runPaymentAction('validate', `Valider ${selectedPaymentIds.length} paiement(s) ?`, 'Validation impossible')}
                disabled={!!actionLoading}
                className="h-6 rounded bg-green-600 px-2 text-xs text-white hover:bg-green-700 disabled:opacity-50"
              >
                Valider
              </button>
            </Tooltip>
            <Tooltip text="Annuler les paiements sélectionnés">
              <button
                onClick={() => runPaymentAction('cancel', `Annuler ${selectedPaymentIds.length} paiement(s) ?`, 'Annulation impossible')}
                disabled={!!actionLoading}
                className="h-6 rounded bg-red-600 px-2 text-xs text-white hover:bg-red-700 disabled:opacity-50"
              >
                Annuler
              </button>
            </Tooltip>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-gray-300 bg-gray-100">
                <th className="w-10 border-r border-gray-300 px-2 py-1.5 text-center">
                  <input
                    type="checkbox"
                    checked={allCurrentPageSelected}
                    onChange={(event) => toggleCurrentPageSelection(event.target.checked)}
                    className="h-3.5 w-3.5 cursor-pointer"
                  />
                </th>

                {columns.map((column) => visibleColumns[column.id] && (
                  <th
                    key={column.id}
                    className={`border-r border-gray-300 px-2 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200 cursor-pointer ${
                      column.align === 'right' ? 'text-right' : 'text-left'
                    }`}
                    style={{ minWidth: column.width }}
                    onClick={() => handleSort(column.id)}
                  >
                    <div className={`flex items-center gap-1 ${column.align === 'right' ? 'justify-end' : ''}`}>
                      <span>{column.label}</span>
                      <SortIcon column={column.id} sortColumn={sortColumn} sortDirection={sortDirection} />
                    </div>
                  </th>
                ))}

                <th className="w-10 border-l border-gray-300 px-2 py-1.5 text-center">
                  <Tooltip text="Choisir les colonnes à afficher">
                    <button
                      className="columns-menu-button rounded p-1 hover:bg-gray-200"
                      onClick={(event) => {
                        event.stopPropagation();
                        const rect = event.currentTarget.getBoundingClientRect();
                        setColumnsMenuPosition({
                          top: rect.bottom + window.scrollY + 5,
                          left: rect.right - 200,
                        });
                        setShowColumnsMenu((previous) => !previous);
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
                  <td colSpan={visibleColumnCount + 2} className="border border-gray-300 p-4 text-center text-sm text-red-600">
                    <div className="flex items-center justify-center gap-2">
                      <FiAlertCircle size={14} />
                      {error}
                    </div>
                  </td>
                </tr>
              ) : paginatedPayments.length === 0 ? (
                <tr>
                  <td colSpan={visibleColumnCount + 2} className="border border-gray-300 p-8 text-center text-sm text-gray-500">
                    {activeFilters.length > 0 || searchText ? 'Aucun résultat pour ces filtres' : 'Aucun paiement'}
                  </td>
                </tr>
              ) : (
                paginatedPayments.map((payment) => (
                  <tr
                    key={payment.id}
                    className={`cursor-pointer transition-colors hover:bg-gray-50 ${activeRowId === payment.id ? 'bg-purple-50' : ''}`}
                    onClick={() => setActiveRowId(payment.id)}
                    onDoubleClick={() => navigate(`/comptabilite/paiements/${payment.id}`)}
                  >
                    <td className="border border-gray-300 px-2 py-1.5 text-center" onClick={(event) => event.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedPaymentIds.includes(payment.id)}
                        onChange={(event) => {
                          if (event.target.checked) {
                            setSelectedPaymentIds((previous) => [...previous, payment.id]);
                          } else {
                            setSelectedPaymentIds((previous) => previous.filter((id) => id !== payment.id));
                          }
                        }}
                        className="h-3.5 w-3.5 cursor-pointer"
                      />
                    </td>

                    {columns.map((column) => visibleColumns[column.id] && (
                      <React.Fragment key={`${payment.id}-${column.id}`}>
                        {renderCell(payment, column.id)}
                      </React.Fragment>
                    ))}

                    <td className="border border-gray-300 px-2 py-1.5"></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {showColumnsMenu && (
          <div
            id="columns-menu"
            className="fixed z-50 rounded border border-gray-300 bg-white shadow-lg"
            style={{ top: columnsMenuPosition.top, left: columnsMenuPosition.left, width: '200px' }}
          >
            <div className="border-b border-gray-200 p-2">
              <p className="mb-2 text-xs font-medium text-gray-700">Colonnes à afficher</p>
              {columns.map((column) => (
                <label key={column.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={visibleColumns[column.id]}
                    onChange={() => setVisibleColumns((previous) => ({ ...previous, [column.id]: !previous[column.id] }))}
                    className="h-3.5 w-3.5 cursor-pointer"
                  />
                  <span className="text-xs">{column.label}</span>
                </label>
              ))}
            </div>
            <div className="p-2">
              <button
                onClick={() => {
                  const next = {};
                  columns.forEach((column) => { next[column.id] = true; });
                  setVisibleColumns(next);
                }}
                className="w-full py-1 text-center text-xs text-purple-600 hover:text-purple-700"
              >
                Tout afficher
              </button>
              <button
                onClick={() => {
                  const next = {};
                  columns.forEach((column) => { next[column.id] = false; });
                  setVisibleColumns(next);
                }}
                className="w-full py-1 text-center text-xs text-gray-500 hover:text-gray-600"
              >
                Tout masquer
              </button>
            </div>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-300 px-4 py-2">
            <div className="text-xs text-gray-500">Page {safeCurrentPage} sur {totalPages}</div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={safeCurrentPage === 1}
                className="rounded p-1 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <FiChevronsLeft size={14} />
              </button>
              <button
                onClick={() => setCurrentPage((previous) => Math.max(1, previous - 1))}
                disabled={safeCurrentPage === 1}
                className="rounded p-1 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <FiChevronLeft size={14} />
              </button>
              <span className="px-2 text-xs text-gray-700">{safeCurrentPage} / {totalPages}</span>
              <button
                onClick={() => setCurrentPage((previous) => Math.min(totalPages, previous + 1))}
                disabled={safeCurrentPage === totalPages}
                className="rounded p-1 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <FiChevronRight size={14} />
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={safeCurrentPage === totalPages}
                className="rounded p-1 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
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
