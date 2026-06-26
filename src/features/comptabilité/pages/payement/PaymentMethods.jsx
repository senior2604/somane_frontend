// src/features/comptabilite/pages/payement/PaymentMethods.jsx
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiAlertCircle,
  FiChevronLeft,
  FiChevronRight,
  FiChevronsLeft,
  FiChevronsRight,
  FiMoreHorizontal,
  FiPlus,
  FiRefreshCw,
  FiSearch,
  FiSettings,
} from 'react-icons/fi';
import axiosInstance from '../../../../config/axiosInstance';
import {
  PAGE_SIZE_OPTIONS,
  SearchSelect,
  Tooltip,
  normalizeApiList,
  normalizeText,
} from './paymentShared';

const API = {
  methods: 'compta/payment-methods/',
};

const directionLabel = (value) => ({
  inbound: 'Encaissement',
  outbound: 'Décaissement',
  both: 'Les deux',
}[value] || value || '-');

export default function PaymentMethods() {
  const navigate = useNavigate();
  const columnsButtonRef = useRef(null);
  const actionsMenuRef = useRef(null);
  const [methods, setMethods] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [showColumnsMenu, setShowColumnsMenu] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [visibleColumns, setVisibleColumns] = useState({
    name: true,
    code: true,
    payment_type: true,
    receipts: true,
    payments: true,
    status: true,
  });

  const columns = [
    { id: 'name', label: 'Méthode' },
    { id: 'code', label: 'Code' },
    { id: 'payment_type', label: 'Direction' },
    { id: 'receipts', label: 'Compte encaissement' },
    { id: 'payments', label: 'Compte décaissement' },
    { id: 'status', label: 'Statut' },
  ];

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await axiosInstance.get(API.methods, { params: { page_size: 1000 } });
      setMethods(normalizeApiList(response.data));
    } catch (err) {
      setError('Impossible de charger les méthodes de paiement.');
      console.error('Erreur chargement méthodes paiement', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (actionsMenuRef.current && !actionsMenuRef.current.contains(event.target)) {
        setShowActionsMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredMethods = useMemo(() => {
    const search = normalizeText(searchText);
    return methods.filter((method) => {
      const value = normalizeText([method.name, method.code, method.payment_type, method.display_name].filter(Boolean).join(' '));
      return !search || value.includes(search);
    });
  }, [methods, searchText]);

  const totalPages = Math.max(1, Math.ceil(filteredMethods.length / itemsPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedMethods = filteredMethods.slice((safeCurrentPage - 1) * itemsPerPage, safeCurrentPage * itemsPerPage);
  const visibleColumnCount = Object.values(visibleColumns).filter(Boolean).length;

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="mx-auto max-w-7xl border border-gray-300 bg-white">
        <div className="border-b border-gray-300 px-4 py-2">
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-shrink-0 items-center gap-3">
              <Tooltip text="Nouvelle méthode">
                <button
                  onClick={() => navigate('/comptabilite/methodes-paiement/create')}
                  className="flex h-8 items-center gap-1 rounded bg-purple-600 px-3 text-xs font-medium text-white transition-all duration-200 hover:scale-105 hover:bg-purple-700"
                >
                  <FiPlus size={12} />
                  Nouveau
                </button>
              </Tooltip>

              <div className="leading-tight">
                <h1 className="text-lg font-bold text-gray-900">Méthodes de paiement</h1>
                <span className="text-xs text-gray-600">{filteredMethods.length} méthode(s)</span>
              </div>

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
                  <div className="absolute left-0 z-50 mt-1 w-56 rounded-sm border border-gray-300 bg-white shadow-lg">
                    <button onClick={() => navigate('/comptabilite/paiements')} className="w-full px-3 py-2 text-left text-xs hover:bg-gray-50">Paiements</button>
                    <button onClick={() => navigate('/comptabilite/conditions-paiement')} className="w-full px-3 py-2 text-left text-xs hover:bg-gray-50">Conditions de paiement</button>
                    <button onClick={loadData} className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-gray-50"><FiRefreshCw size={12} />Actualiser</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="border-b border-gray-300 bg-red-50 px-4 py-2 text-xs text-red-700">
            <div className="flex items-start gap-2"><FiAlertCircle size={14} />{error}</div>
          </div>
        )}

        <div className="border-b border-gray-300 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex flex-1 items-center rounded border border-gray-300 bg-white px-2">
              <FiSearch size={14} className="text-gray-400" />
              <input
                value={searchText}
                onChange={(event) => { setSearchText(event.target.value); setCurrentPage(1); }}
                placeholder="Rechercher..."
                className="h-8 flex-1 border-0 px-2 text-xs outline-none"
              />
            </div>
            <div className="w-20 border border-gray-300">
              <SearchSelect value={itemsPerPage} onChange={(id) => { setItemsPerPage(Number(id)); setCurrentPage(1); }} options={PAGE_SIZE_OPTIONS} getLabel={(option) => option.label} placeholder="50" />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-gray-300 bg-gray-100">
                {columns.map((column) => visibleColumns[column.id] && (
                  <th key={column.id} className="border-r border-gray-300 px-2 py-1.5 text-left text-xs font-medium text-gray-700">{column.label}</th>
                ))}
                <th className="w-10 border-l border-gray-300 px-2 py-1.5 text-center">
                  <button ref={columnsButtonRef} onClick={() => setShowColumnsMenu((previous) => !previous)} className="rounded p-1 hover:bg-gray-200">
                    <FiMoreHorizontal size={16} />
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={visibleColumnCount + 1} className="border border-gray-300 p-8 text-center text-sm text-gray-500">Chargement...</td></tr>
              ) : paginatedMethods.length === 0 ? (
                <tr><td colSpan={visibleColumnCount + 1} className="border border-gray-300 p-8 text-center text-sm text-gray-500">Aucune méthode</td></tr>
              ) : paginatedMethods.map((method) => (
                <tr key={method.id} onClick={() => navigate(`/comptabilite/methodes-paiement/${method.id}`)} className="cursor-pointer hover:bg-gray-50">
                  {visibleColumns.name && <td className="border border-gray-300 px-2 py-1.5 text-xs font-medium text-gray-900">{method.name || '-'}</td>}
                  {visibleColumns.code && <td className="border border-gray-300 px-2 py-1.5 font-mono text-xs text-purple-700">{method.code || '-'}</td>}
                  {visibleColumns.payment_type && <td className="border border-gray-300 px-2 py-1.5 text-xs">{directionLabel(method.payment_type)}</td>}
                  {visibleColumns.receipts && <td className="border border-gray-300 px-2 py-1.5 text-xs">{method.outstanding_receipts_account_code || method.outstanding_receipts_account_id_label || '-'}</td>}
                  {visibleColumns.payments && <td className="border border-gray-300 px-2 py-1.5 text-xs">{method.outstanding_payments_account_code || method.outstanding_payments_account_id_label || '-'}</td>}
                  {visibleColumns.status && <td className="border border-gray-300 px-2 py-1.5 text-xs">{method.active === false ? 'Inactif' : 'Actif'}</td>}
                  <td className="border border-gray-300 px-2 py-1.5"></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-gray-300 px-4 py-2">
          <span className="text-xs text-gray-500">Page {safeCurrentPage} sur {totalPages}</span>
          <div className="flex items-center gap-1">
            <button onClick={() => setCurrentPage(1)} disabled={safeCurrentPage === 1} className="rounded p-1 hover:bg-gray-100 disabled:opacity-50"><FiChevronsLeft size={14} /></button>
            <button onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} disabled={safeCurrentPage === 1} className="rounded p-1 hover:bg-gray-100 disabled:opacity-50"><FiChevronLeft size={14} /></button>
            <button onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))} disabled={safeCurrentPage === totalPages} className="rounded p-1 hover:bg-gray-100 disabled:opacity-50"><FiChevronRight size={14} /></button>
            <button onClick={() => setCurrentPage(totalPages)} disabled={safeCurrentPage === totalPages} className="rounded p-1 hover:bg-gray-100 disabled:opacity-50"><FiChevronsRight size={14} /></button>
          </div>
        </div>
      </div>

      {showColumnsMenu && (
        <div className="fixed z-50 w-56 rounded border border-gray-300 bg-white shadow-lg" style={{ top: (columnsButtonRef.current?.getBoundingClientRect().bottom || 120) + 6, left: Math.max(12, (columnsButtonRef.current?.getBoundingClientRect().right || 260) - 224) }}>
          <div className="border-b border-gray-200 p-2">
            <p className="mb-2 text-xs font-medium text-gray-700">Colonnes à afficher</p>
            {columns.map((column) => (
              <label key={column.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 hover:bg-gray-50">
                <input type="checkbox" checked={visibleColumns[column.id]} onChange={() => setVisibleColumns((previous) => ({ ...previous, [column.id]: !previous[column.id] }))} className="h-3.5 w-3.5" />
                <span className="text-xs">{column.label}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
