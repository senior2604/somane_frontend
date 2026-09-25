// src/features/comptabilite/pages/payement/PaymentDetail.jsx

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  FiCheck,
  FiClock,
  FiCopy,
  FiFileText,
  FiInfo,
  FiPlus,
  FiPrinter,
  FiRefreshCw,
  FiSettings,
  FiTrash2,
  FiUploadCloud,
  FiX,
} from 'react-icons/fi';
import axiosInstance from '../../../../config/axiosInstance';
import UnifiedFormPage from '../../../../components/UnifiedFormPage';

const API = {
  payments: 'compta/payments/',
  journals: 'compta/journals/',
  partners: 'partenaires/',
  currencies: 'devises/',
  paymentMethodLines: 'compta/payment-method-lines/',
  partnerOpenItems: 'compta/move-lines/partner-open-items/',
  traceability: 'compta/module-traceability/',
};

const PAYMENT_TABLE_COLUMNS = [
  { key: 'date', label: 'Date', width: 105 },
  { key: 'dueDate', label: 'Échéance', width: 110 },
  { key: 'journalAccount', label: 'Compte journal', width: 185 },
  { key: 'pieceNumber', label: 'N° pièce', width: 140 },
  { key: 'label', label: 'Libellé', width: 220 },
  { key: 'amount', label: 'Montant', width: 130, numeric: true },
  { key: 'payment', label: 'Paiements', width: 130, numeric: true },
  { key: 'discount', label: 'Escompte', width: 125, numeric: true },
  { key: 'balance', label: 'Solde', width: 130, numeric: true },
  { key: 'currentPayment', label: 'Paiement actuel', width: 145, numeric: true },
  { key: 'fees', label: 'Frais', width: 115, numeric: true },
  { key: 'currentBalance', label: 'Solde actuel', width: 145, numeric: true },
];

const PAYMENT_OPTIONAL_COLUMNS = PAYMENT_TABLE_COLUMNS.filter((column) => (
  !['currentPayment', 'fees', 'currentBalance'].includes(column.key)
));
const DEFAULT_PAYMENT_COLUMN_VISIBILITY = PAYMENT_OPTIONAL_COLUMNS.reduce(
  (visibility, column) => ({ ...visibility, [column.key]: true }),
  {},
);
const PAYMENT_COLUMNS_STORAGE_KEY = 'paymentAccountingVisibleColumns';
const PAYMENT_COLUMN_WIDTHS_STORAGE_KEY = 'paymentAccountingColumnWidths';
const PAYMENT_LINE_META_PREFIX = '__SOMANE_PAYMENT_LINE__:';
let paymentOptionsCache = null;
let paymentOptionsPromise = null;
const PAYMENT_ACTIONS_COLUMN_WIDTH = 42;
const DEFAULT_PAYMENT_COLUMN_WIDTHS = PAYMENT_TABLE_COLUMNS.reduce(
  (widths, column) => ({ ...widths, [column.key]: column.width }),
  { actions: PAYMENT_ACTIONS_COLUMN_WIDTH },
);

const normalizeApiList = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.records)) return data.records;
  return [];
};

const today = () => new Date().toISOString().slice(0, 10);

const toDateInput = (value) => {
  if (!value) return today();
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
  return date.toISOString().slice(0, 10);
};

const formatDateTime = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('fr-FR');
};

const sameDateTime = (first, second) => {
  if (!first || !second) return false;
  const firstDate = new Date(first);
  const secondDate = new Date(second);
  if (Number.isNaN(firstDate.getTime()) || Number.isNaN(secondDate.getTime())) return false;
  return firstDate.getTime() === secondDate.getTime();
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

const optionLabel = (item, fields = ['code', 'name']) => {
  if (!item) return '';
  return fields.map((field) => item[field]).filter(Boolean).join(' - ')
    || item.display_name
    || item.nom
    || item.label
    || '';
};

const formatDate = (value) => {
  if (!value) return '-';
  const raw = String(value).slice(0, 10);
  const [year, month, day] = raw.split('-');
  if (year && month && day) return `${day}/${month}/${year}`;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleDateString('fr-FR');
};

const normalizeLookupText = (value) => String(value ?? '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .trim()
  .toLowerCase();

const toNumber = (value) => {
  const parsed = Number(String(value ?? 0).replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatAmount = (value, currency = 'XOF') => (
  `${Math.round(toNumber(value)).toLocaleString('fr-FR')} ${currency || 'XOF'}`
);

const formatTableAmount = (value) => Math.round(toNumber(value)).toLocaleString('fr-FR');

const paymentLineFeeFromNote = (note) => {
  if (!String(note || '').startsWith(PAYMENT_LINE_META_PREFIX)) return 0;
  try {
    const metadata = JSON.parse(String(note).slice(PAYMENT_LINE_META_PREFIX.length));
    return Math.max(0, toNumber(metadata?.fee));
  } catch {
    return 0;
  }
};

const paymentLineNote = (fee) => (
  `${PAYMENT_LINE_META_PREFIX}${JSON.stringify({ fee: Math.max(0, toNumber(fee)) })}`
);

const getJournalTypeText = (journal) => {
  const type = journal?.journal_type ?? journal?.type ?? journal?.type_id;
  return [
    journal?.type_code,
    journal?.type_name,
    journal?.journal_type_code,
    journal?.journal_type_name,
    typeof type === 'object' ? type?.code : type,
    typeof type === 'object' ? (type?.name || type?.label || type?.libelle) : '',
  ]
    .filter(Boolean)
    .map(normalizeLookupText)
    .join(' ');
};

const isTreasuryJournal = (journal) => {
  if (!journal || journal.active === false) return false;
  if (journal.is_bank_or_cash_flag || journal.is_treasury) return true;

  const typeText = getJournalTypeText(journal);
  const exactCodes = new Set(['ban', 'bank', 'bnk', 'bq', 'cai', 'ca', 'cs', 'cash', 'cb', 'mel', 'tre']);
  const tokens = typeText.split(/[^a-z0-9]+/).filter(Boolean);

  return tokens.some((token) => exactCodes.has(token))
    || typeText.includes('banque')
    || typeText.includes('caisse')
    || typeText.includes('carte bancaire')
    || typeText.includes('monnaie electronique')
    || typeText.includes('tresorerie');
};

const getActionErrorMessage = (err, fallback) => {
  const data = err?.response?.data || err?.data;
  if (typeof data === 'string') return data;
  if (data?.detail) return data.detail;
  if (data?.error) return data.error;
  if (data) return JSON.stringify(data);
  return err?.message || fallback;
};

const PAYMENT_TYPE_OPTIONS = [
  { id: 'inbound', label: 'Encaissement' },
  { id: 'outbound', label: 'Décaissement' },
  { id: 'transfer', label: 'Virement de compte à compte' },
];

const PAYMENT_PROCESS_STEPS = [
  { id: 'draft', label: 'Brouillon' },
  { id: 'processing', label: 'En cours de traitement' },
  { id: 'paid', label: 'Payé' },
];

const PARTNER_TYPE_OPTIONS = [
  { id: 'customer', label: 'Client' },
  { id: 'supplier', label: 'Fournisseur' },
  { id: 'misc_debit', label: 'Débiteur divers' },
  { id: 'misc_credit', label: 'Créditeur divers' },
  { id: 'employee', label: 'Employé' },
];

const getPaymentMethodValues = (line) => {
  if (!line) {
    return {
      payment_method_id: '',
      payment_method_id_label: '',
      payment_method_line_id_label: '',
      payment_method_code: '',
      payment_method_name: '',
    };
  }

  const rawMethod = line.payment_method || line.payment_method_id || '';
  const methodId = rawMethod && typeof rawMethod === 'object' ? rawMethod.id : rawMethod;
  const methodLabel = line.payment_method_id_label
    || line.payment_method_name
    || (rawMethod && typeof rawMethod === 'object' ? (rawMethod.display_name || rawMethod.name || rawMethod.code || '') : '');
  const lineLabel = line.display_name || line.name || line.payment_method_line_id_label || line.payment_method_id_label || line.code || '';

  return {
    payment_method_id: methodId || '',
    payment_method_id_label: methodLabel || '',
    payment_method_line_id_label: lineLabel,
    payment_method_code: line.code || line.payment_method_code || '',
    payment_method_name: methodLabel || lineLabel,
  };
};

const isElectronicPayment = (methodLine, journal, storedFee = 0) => {
  if (toNumber(storedFee) > 0) return true;

  const text = normalizeLookupText([
    methodLine?.name,
    methodLine?.display_name,
    methodLine?.code,
    methodLine?.payment_method_name,
    methodLine?.payment_method_id_label,
    methodLine?.payment_provider_id,
    methodLine?.payment_provider_id_label,
    methodLine?.payment_provider_state,
    journal?.name,
    journal?.code,
    getJournalTypeText(journal),
  ].filter(Boolean).join(' '));

  if (/\b(espece|especes|cash|caisse)\b/.test(text)) return false;

  return [
    'carte', 'card', 'mobile', 'monnaie electronique', 'electronique',
    'wallet', 'portefeuille', 't money', 'tmoney', 'flooz', 'visa',
    'mastercard', 'paypal', 'stripe', 'provider', 'en ligne',
  ].some((keyword) => text.includes(keyword));
};

const isCashPayment = (methodLine, formData = {}) => {
  const text = normalizeLookupText([
    methodLine?.name,
    methodLine?.display_name,
    methodLine?.code,
    methodLine?.payment_method_name,
    methodLine?.payment_method_id_label,
    formData.payment_method_name,
    formData.payment_method_code,
    formData.payment_method_id_label,
    formData.payment_method_line_id_label,
  ].filter(Boolean).join(' '));

  return /\b(espece|especes|cash|liquide)\b/.test(text);
};

const accountDisplay = (code, name, fallback) => (
  [code, name].filter(Boolean).join(' - ') || fallback
);

const getPartnerTypeFromPartner = (partner) => {
  if (!partner) return '';

  const rawType = partner.type_partenaire || partner.partner_type || partner.type || partner.category || '';
  const normalized = String(rawType)
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  const mapping = {
    client: 'customer',
    customer: 'customer',
    fournisseur: 'supplier',
    supplier: 'supplier',
    vendor: 'supplier',
    employe: 'employee',
    employee: 'employee',
    debiteur: 'misc_debit',
    misc_debit: 'misc_debit',
    crediteur: 'misc_credit',
    misc_credit: 'misc_credit',
  };

  return mapping[normalized] || '';
};

const SearchSelect = ({ value, onChange, options, getLabel, placeholder, disabled }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef(null);
  const selected = useMemo(
    () => options.find((option) => String(option.id) === String(value)),
    [options, value],
  );
  const visibleOptions = useMemo(() => {
    const normalizedQuery = normalizeLookupText(query);
    const matches = [];
    for (const option of options) {
      if (!normalizedQuery || normalizeLookupText(getLabel(option)).includes(normalizedQuery)) {
        matches.push(option);
      }
      if (matches.length === 40) break;
    }
    return matches;
  }, [getLabel, options, query]);

  useEffect(() => {
    if (!open) return undefined;

    const closeOnOutsideClick = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false);
        setQuery('');
      }
    };
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') {
        setOpen(false);
        setQuery('');
      }
    };

    document.addEventListener('mousedown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  useEffect(() => {
    if (disabled && open) {
      setOpen(false);
      setQuery('');
    }
  }, [disabled, open]);

  return (
    <div ref={containerRef} className="relative h-[26px]">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        className={`h-[26px] w-full border border-gray-300 bg-white px-2 text-left text-xs hover:border-purple-400 ${disabled ? 'cursor-not-allowed bg-gray-100 text-gray-400' : ''}`}
      >
        <span className={selected ? 'text-gray-900' : 'text-gray-400'}>{selected ? getLabel(selected) : placeholder}</span>
      </button>
      {open && !disabled && (
        <div className="absolute left-0 right-0 top-[28px] z-50 max-h-60 overflow-auto rounded-sm border border-gray-300 bg-white shadow-lg">
          <div className="border-b border-gray-200 p-1">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              autoFocus
              className="h-7 w-full border border-gray-300 px-2 text-xs outline-none focus:border-purple-600"
              placeholder="Rechercher..."
            />
          </div>
          <button type="button" onClick={() => { onChange('', null); setOpen(false); }} className="w-full px-2 py-1 text-left text-xs text-gray-500 hover:bg-gray-50">Aucun</button>
          {visibleOptions.map((option) => (
            <button key={option.id} type="button" onClick={() => { onChange(option.id, option); setOpen(false); setQuery(''); }} className="w-full px-2 py-1 text-left text-xs hover:bg-purple-50">
              {getLabel(option)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const AmountInput = ({ value, onChange, disabled = false, embedded = false }) => {
  const [displayValue, setDisplayValue] = useState('');

  const formatNumber = (num) => {
    if (num === '' || num === null || num === undefined) return '';
    const parsed = typeof num === 'string' ? Number(num.replace(/\s/g, '').replace(',', '.')) : Number(num);
    if (Number.isNaN(parsed)) return '';
    return Math.round(parsed).toLocaleString('fr-FR');
  };

  useEffect(() => {
    setDisplayValue(formatNumber(value));
  }, [value]);

  const handleChange = (event) => {
    const raw = event.target.value.replace(/\s/g, '').replace(/[^\d,.-]/g, '').replace(',', '.');
    const parsed = Number(raw);
    if (Number.isNaN(parsed)) {
      setDisplayValue('');
      onChange('');
      return;
    }
    setDisplayValue(formatNumber(parsed));
    onChange(parsed);
  };

  return (
    <input
      type="text"
      value={displayValue}
      onChange={handleChange}
      onFocus={(event) => {
        if (value !== '' && value !== null && value !== undefined) event.target.value = Math.round(Number(value)).toString();
      }}
      onBlur={() => setDisplayValue(formatNumber(value))}
      disabled={disabled}
      className={`h-[26px] w-full px-2 text-left text-xs outline-none disabled:bg-gray-100 ${embedded ? 'border-0 bg-transparent focus:bg-white focus:ring-1 focus:ring-inset focus:ring-purple-500' : 'border border-gray-300 hover:border-purple-400 focus:border-purple-600'}`}
      placeholder="0"
    />
  );
};

const Field = ({ label, required, children }) => (
  <div className="flex items-center" style={{ minHeight: 26 }}>
    <label className="min-w-[150px] text-xs font-medium text-gray-700">{label}{required ? ' *' : ''}</label>
    <div className="ml-2 flex-1">{children}</div>
  </div>
);

const PaymentProcess = ({ state }) => {
  return (
    <div className="flex shrink-0 items-center gap-2">
      {PAYMENT_PROCESS_STEPS.map((step) => {
        const isActive = step.id === state;
        const colorClass = !isActive
          ? 'border-gray-300 bg-gray-100 text-gray-500'
          : step.id === 'draft'
            ? 'border-yellow-300 bg-yellow-100 text-yellow-700'
            : step.id === 'processing'
              ? 'border-purple-300 bg-purple-100 text-purple-700'
              : 'border-green-300 bg-green-100 text-green-700';

        return (
          <div
            key={step.id}
            className={`flex h-8 items-center border px-3 text-xs font-medium ${colorClass}`}
          >
            {step.label}
          </div>
        );
      })}
    </div>
  );
};

const loadPaymentOptions = async (entityId) => {
  const cacheKey = String(entityId || '');
  if (paymentOptionsCache?.entityId === cacheKey) return paymentOptionsCache.data;
  if (paymentOptionsPromise?.entityId === cacheKey) return paymentOptionsPromise.promise;

  const promise = Promise.all([
    axiosInstance.get(API.journals, { params: { company: entityId, company_id: entityId, page_size: 500 } }).catch(() => ({ data: [] })),
    axiosInstance.get(API.partners, { params: { page_size: 500 } }).catch(() => ({ data: [] })),
    axiosInstance.get(API.currencies, { params: { page_size: 200 } }).catch(() => ({ data: [] })),
    axiosInstance.get(API.paymentMethodLines, { params: { company: entityId, company_id: entityId, page_size: 500 } }).catch(() => ({ data: [] })),
  ]).then(([journals, partners, currencies, methodLines]) => {
    const data = {
      journals: normalizeApiList(journals.data),
      partners: normalizeApiList(partners.data),
      currencies: normalizeApiList(currencies.data),
      methodLines: normalizeApiList(methodLines.data),
    };
    paymentOptionsCache = { entityId: cacheKey, data };
    return data;
  }).finally(() => {
    if (paymentOptionsPromise?.entityId === cacheKey) paymentOptionsPromise = null;
  });

  paymentOptionsPromise = { entityId: cacheKey, promise };
  return promise;
};

export default function PaymentForm({ mode = 'create' }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const activeEntity = getActiveEntity();
  const actionsMenuRef = useRef(null);
  const paymentColumnsHeaderRef = useRef(null);
  const paymentColumnsButtonRef = useRef(null);
  const paymentColumnsPopupRef = useRef(null);
  const paymentColumnResizeRef = useRef(null);
  const saveInFlightRef = useRef(false);
  const isShowMode = mode === 'show' || mode === 'detail';
  const isInvalidDetailId = isShowMode && (!id || ['create', 'new', 'undefined', 'null'].includes(String(id).toLowerCase()));
  const duplicatedPayment = !isShowMode ? location.state?.duplicatePayment : null;

  const [formData, setFormData] = useState(() => {
    if (isShowMode) return null;
    const initial = {
      name: '',
      payment_type: 'inbound',
      partner_type: 'customer',
      partner_id: '',
      amount: '',
      fee_amount: 0,
      currency_id: '',
      journal_id: '',
      payment_method_id: '',
      payment_method_id_label: '',
      payment_method_line_id: '',
      payment_method_line_id_label: '',
      payment_method_code: '',
      payment_method_name: '',
      payment_date: today(),
      reference: '',
      narration: '',
      destination_journal_id: '',
      state: 'draft',
      accounting_lines: [],
    };
    return {
      ...initial,
      ...(duplicatedPayment || {}),
      id: undefined,
      name: '',
      payment_date: today(),
      state: 'draft',
    };
  });
  const [options, setOptions] = useState(() => (
    paymentOptionsCache?.entityId === String(activeEntity?.id || '')
      ? paymentOptionsCache.data
      : { journals: [], partners: [], currencies: [], methodLines: [] }
  ));
  const [partnerOpenItems, setPartnerOpenItems] = useState([]);
  const [paymentAllocations, setPaymentAllocations] = useState({});
  const [partnerItemsLoading, setPartnerItemsLoading] = useState(false);
  const [partnerItemsLoaded, setPartnerItemsLoaded] = useState(false);
  const [traceability, setTraceability] = useState([]);
  const [showTraceabilityPanel, setShowTraceabilityPanel] = useState(true);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [loading, setLoading] = useState(isShowMode);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [hasChanges, setHasChanges] = useState(Boolean(duplicatedPayment));
  const [pendingAction, setPendingAction] = useState(null);
  const [activeTab, setActiveTab] = useState('accounting');
  const [showPaymentColumnsMenu, setShowPaymentColumnsMenu] = useState(false);
  const [paymentColumnsMenuStyle, setPaymentColumnsMenuStyle] = useState({});
  const [paymentColumnVisibility, setPaymentColumnVisibility] = useState(() => {
    try {
      const saved = localStorage.getItem(PAYMENT_COLUMNS_STORAGE_KEY);
      return saved
        ? { ...DEFAULT_PAYMENT_COLUMN_VISIBILITY, ...JSON.parse(saved) }
        : DEFAULT_PAYMENT_COLUMN_VISIBILITY;
    } catch {
      return DEFAULT_PAYMENT_COLUMN_VISIBILITY;
    }
  });
  const [paymentColumnWidths, setPaymentColumnWidths] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(PAYMENT_COLUMN_WIDTHS_STORAGE_KEY) || '{}');
      return { ...DEFAULT_PAYMENT_COLUMN_WIDTHS, ...saved };
    } catch {
      return DEFAULT_PAYMENT_COLUMN_WIDTHS;
    }
  });
  const allocationEditable = !formData?.state || formData.state === 'draft';

  const treasuryJournals = useMemo(() => (
    options.journals.filter(isTreasuryJournal)
  ), [options.journals]);
  const selectedJournal = useMemo(
    () => options.journals.find((journal) => String(journal.id) === String(formData?.journal_id)),
    [formData?.journal_id, options.journals],
  );
  const selectedDestinationJournal = useMemo(
    () => options.journals.find((journal) => String(journal.id) === String(formData?.destination_journal_id)),
    [formData?.destination_journal_id, options.journals],
  );
  const selectedPartner = useMemo(
    () => options.partners.find((partner) => String(partner.id) === String(formData?.partner_id)),
    [formData?.partner_id, options.partners],
  );
  const selectedMethodLine = useMemo(
    () => options.methodLines.find((line) => String(line.id) === String(formData?.payment_method_line_id)),
    [formData?.payment_method_line_id, options.methodLines],
  );
  const electronicPayment = useMemo(
    () => isElectronicPayment(selectedMethodLine, selectedJournal, formData?.fee_amount),
    [formData?.fee_amount, selectedJournal, selectedMethodLine],
  );
  const cashPayment = useMemo(
    () => isCashPayment(selectedMethodLine, formData || {}),
    [
      formData?.payment_method_code,
      formData?.payment_method_id_label,
      formData?.payment_method_line_id_label,
      formData?.payment_method_name,
      selectedMethodLine,
    ],
  );
  const currencyCode = useMemo(() => {
    const selectedCurrency = options.currencies.find(
      (currency) => String(currency.id) === String(formData?.currency_id),
    );
    return selectedCurrency?.code || formData?.currency_code || 'XOF';
  }, [formData?.currency_code, formData?.currency_id, options.currencies]);
  const visiblePaymentColumns = useMemo(
    () => PAYMENT_TABLE_COLUMNS.filter((column) => (
      !PAYMENT_OPTIONAL_COLUMNS.some((optionalColumn) => optionalColumn.key === column.key)
      || paymentColumnVisibility[column.key] !== false
    )),
    [paymentColumnVisibility],
  );
  const firstVisibleNumericColumnIndex = useMemo(
    () => visiblePaymentColumns.findIndex((column) => column.numeric),
    [visiblePaymentColumns],
  );
  const paymentTableColumns = useMemo(() => ([
    ...visiblePaymentColumns,
    { key: 'actions', label: '' },
  ]), [visiblePaymentColumns]);

  const paymentColumnStyle = useCallback((columnKey) => {
    const width = paymentColumnWidths[columnKey] || DEFAULT_PAYMENT_COLUMN_WIDTHS[columnKey] || 120;
    return { width: `${width}px`, minWidth: `${width}px` };
  }, [paymentColumnWidths]);

  const togglePaymentColumn = useCallback((columnKey) => {
    setPaymentColumnVisibility((previous) => ({
      ...previous,
      [columnKey]: previous[columnKey] === false,
    }));
  }, []);

  const startPaymentColumnResize = useCallback((event, columnKey) => {
    event.preventDefault();
    event.stopPropagation();
    const startX = event.clientX;
    const startWidth = paymentColumnWidths[columnKey] || DEFAULT_PAYMENT_COLUMN_WIDTHS[columnKey] || 120;
    const minWidth = columnKey === 'actions' ? 36 : 90;

    const onMouseMove = (moveEvent) => {
      const nextWidth = Math.max(minWidth, startWidth + moveEvent.clientX - startX);
      setPaymentColumnWidths((previous) => ({ ...previous, [columnKey]: nextWidth }));
    };
    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      paymentColumnResizeRef.current = null;
    };

    paymentColumnResizeRef.current = { onMouseMove, onMouseUp };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, [paymentColumnWidths]);

  const togglePaymentColumnsMenu = useCallback(() => {
    const anchor = paymentColumnsButtonRef.current || paymentColumnsHeaderRef.current;
    if (anchor) {
      const rect = anchor.getBoundingClientRect();
      const menuWidth = 176;
      const viewportPadding = 8;
      const left = Math.min(
        Math.max(viewportPadding, rect.left),
        window.innerWidth - menuWidth - viewportPadding,
      );
      setPaymentColumnsMenuStyle({
        position: 'fixed',
        top: `${rect.bottom}px`,
        left: `${left}px`,
        zIndex: 35,
      });
    }
    setShowPaymentColumnsMenu((current) => !current);
  }, []);

  const accountingRows = useMemo(() => {
    const paymentAmount = toNumber(formData?.amount);
    const feeAmount = electronicPayment ? toNumber(formData?.fee_amount) : 0;
    const partnerAccountPrefixes = ['401', '402', '404', '408', '411', '412', '416', '418', '421', '422', '425'];

    if (allocationEditable && formData?.partner_id && formData?.payment_type !== 'transfer' && !partnerItemsLoaded) {
      return [];
    }

    if (allocationEditable && formData?.partner_id && formData?.payment_type !== 'transfer' && partnerItemsLoaded) {
      return partnerOpenItems.map((line, index) => {
        const debit = Math.abs(toNumber(line.debit));
        const credit = Math.abs(toNumber(line.credit));
        const originalAmount = Math.abs(toNumber(line.balance)) || debit + credit;
        const rawResidual = Math.abs(toNumber(line.amount_residual));
        const residualBeforePayment = rawResidual || (line.reconciled ? 0 : originalAmount);
        const alreadyPaid = Math.max(0, originalAmount - residualBeforePayment);
        const allocation = paymentAllocations[String(line.id)] || {};
        const availableDiscount = Math.max(0, toNumber(
          line.discount_balance ?? line.discount_amount_currency ?? line.discount,
        ));
        const writeOffAmount = Math.max(0, toNumber(allocation.writeOffAmount));
        const currentPayment = Math.min(
          residualBeforePayment,
          Math.max(0, toNumber(allocation.currentPayment)),
        );
        const currentBalance = allocation.currentBalance === undefined
          ? Math.max(0, residualBeforePayment - currentPayment)
          : Math.min(residualBeforePayment, Math.max(0, toNumber(allocation.currentBalance)));
        const rowFees = electronicPayment ? Math.max(0, toNumber(allocation.fees)) : 0;

        return {
          id: line.id || `partner-item-${index}`,
          date: line.invoice_date || line.move_invoice_date || line.date,
          dueDate: line.date_maturity || line.move_invoice_date_due || '-',
          journalAccount: accountDisplay(
            line.account_code,
            line.account_name,
            line.journal_code || line.journal_name || 'Compte journal',
          ),
          pieceNumber: line.move_name || line.move_ref || '-',
          label: line.name || line.move_ref || '-',
          amount: originalAmount,
          payment: alreadyPaid,
          discount: writeOffAmount || availableDiscount,
          balance: residualBeforePayment,
          currentPayment,
          writeOffAmount,
          fees: rowFees,
          currentBalance,
          partnerItem: true,
          moveId: line.move_id || line.move,
          moveLineId: line.id,
          currencyId: line.currency_id || formData?.currency_id,
        };
      });
    }

    const rawSavedLines = normalizeApiList(formData?.accounting_lines);
    const hasPartnerLine = rawSavedLines.some((line) => {
      const accountCode = String(line.account_code || '');
      return partnerAccountPrefixes.some((prefix) => accountCode.startsWith(prefix));
    });
    const savedLines = rawSavedLines.map((line, index) => {
      const debit = toNumber(line.debit);
      const credit = toNumber(line.credit);
      const lineAmount = Math.abs(debit - credit) || debit + credit;
      const residual = Math.abs(toNumber(line.amount_residual));
      const accountCode = String(line.account_code || '');
      const isPartnerLine = partnerAccountPrefixes.some((prefix) => accountCode.startsWith(prefix));
      const isFeeLine = normalizeLookupText(line.name).includes('frais');
      const currentPayment = isPartnerLine || (!hasPartnerLine && index === 0)
        ? paymentAmount
        : 0;
      const previousPayment = Math.max(0, lineAmount - residual - currentPayment);

      return {
        id: line.id || `saved-${index}`,
        date: line.date || formData?.payment_date,
        dueDate: line.date_maturity || line.move_invoice_date_due || '-',
        journalAccount: accountDisplay(
          [line.journal_code, line.account_code].filter(Boolean).join(' / '),
          line.account_name,
          line.journal_name || 'Compte journal',
        ),
        pieceNumber: line.move_name || formData?.name || '-',
        label: line.name || '-',
        amount: lineAmount,
        payment: previousPayment,
        discount: Math.max(0, toNumber(line.discount_balance ?? line.discount_amount_currency ?? line.discount)),
        balance: residual + currentPayment,
        currentPayment,
        fees: isFeeLine ? feeAmount : 0,
        currentBalance: residual,
        actual: true,
      };
    });
    if (savedLines.length) return savedLines;

    const amount = paymentAmount;
    const fees = feeAmount;
    const partnerLabel = formData?.partner_name
      || selectedPartner?.raison_sociale
      || selectedPartner?.nom
      || selectedPartner?.name
      || 'Partenaire';
    const sourceAccount = accountDisplay(
      selectedJournal?.default_account_code || selectedJournal?.suspense_account_code,
      selectedJournal?.default_account_name || selectedJournal?.suspense_account_name,
      'Compte de trésorerie',
    );
    const destinationAccount = accountDisplay(
      selectedDestinationJournal?.default_account_code || selectedDestinationJournal?.suspense_account_code,
      selectedDestinationJournal?.default_account_name || selectedDestinationJournal?.suspense_account_name,
      'Compte de trésorerie destination',
    );
    const feeAccount = accountDisplay(
      selectedJournal?.loss_account_code || selectedMethodLine?.payment_account_code,
      selectedJournal?.loss_account_name || selectedMethodLine?.payment_account_name,
      'Compte de frais électroniques',
    );
    const rows = [];
    const finalizeRows = () => rows.map((row) => ({
      id: row.id,
      date: formData?.payment_date,
      dueDate: formData?.payment_date || '-',
      journalAccount: row.account,
      pieceNumber: formData?.name && formData.name !== '/' ? formData.name : 'Brouillon',
      label: row.label,
      amount: Math.abs(toNumber(row.debit) - toNumber(row.credit)),
      payment: 0,
      discount: 0,
      balance: Math.abs(toNumber(row.balance)),
      currentPayment: toNumber(row.payment),
      fees: toNumber(row.fees),
      currentBalance: Math.abs(toNumber(row.balance)),
    }));

    if (formData?.payment_type === 'transfer') {
      rows.push({
        id: 'preview-destination', account: destinationAccount, partner: '-',
        label: 'Virement entrant', debit: amount, credit: 0, payment: amount,
        fees: 0, balance: amount,
      });
      if (fees > 0) rows.push({
        id: 'preview-fee', account: feeAccount, partner: '-',
        label: 'Frais du paiement électronique', debit: fees, credit: 0,
        payment: 0, fees, balance: fees,
      });
      rows.push({
        id: 'preview-source', account: sourceAccount, partner: '-',
        label: 'Virement sortant', debit: 0, credit: amount + fees,
        payment: 0, fees: 0, balance: -(amount + fees),
      });
      return finalizeRows();
    }

    if (formData?.payment_type === 'outbound') {
      rows.push({
        id: 'preview-partner', account: 'Compte tiers', partner: partnerLabel,
        label: `Règlement ${partnerLabel}`, debit: amount, credit: 0,
        payment: amount, fees: 0, balance: amount,
      });
      if (fees > 0) rows.push({
        id: 'preview-fee', account: feeAccount, partner: partnerLabel,
        label: 'Frais du paiement électronique', debit: fees, credit: 0,
        payment: 0, fees, balance: fees,
      });
      rows.push({
        id: 'preview-source', account: sourceAccount, partner: partnerLabel,
        label: 'Sortie de trésorerie', debit: 0, credit: amount + fees,
        payment: 0, fees: 0, balance: -(amount + fees),
      });
      return finalizeRows();
    }

    rows.push({
      id: 'preview-source', account: sourceAccount, partner: partnerLabel,
      label: `Encaissement ${partnerLabel}`, debit: Math.max(0, amount - fees), credit: 0,
      payment: amount, fees: 0, balance: Math.max(0, amount - fees),
    });
    if (fees > 0) rows.push({
      id: 'preview-fee', account: feeAccount, partner: partnerLabel,
      label: 'Frais du paiement électronique', debit: fees, credit: 0,
      payment: 0, fees, balance: fees,
    });
    rows.push({
      id: 'preview-partner', account: 'Compte tiers', partner: partnerLabel,
      label: `Contrepartie ${partnerLabel}`, debit: 0, credit: amount,
      payment: 0, fees: 0, balance: -amount,
    });
    return finalizeRows();
  }, [
    allocationEditable,
    electronicPayment,
    formData?.accounting_lines,
    formData?.amount,
    formData?.fee_amount,
    formData?.name,
    formData?.partner_name,
    formData?.partner_id,
    formData?.payment_date,
    formData?.payment_type,
    partnerItemsLoaded,
    partnerOpenItems,
    paymentAllocations,
    selectedDestinationJournal,
    selectedJournal,
    selectedMethodLine,
    selectedPartner,
  ]);

  const accountingTotals = useMemo(() => accountingRows.reduce((totals, row) => ({
    amount: totals.amount + toNumber(row.amount),
    payment: totals.payment + toNumber(row.payment),
    discount: totals.discount + toNumber(row.discount),
    balance: totals.balance + toNumber(row.balance),
    currentPayment: totals.currentPayment + toNumber(row.currentPayment),
    fees: totals.fees + toNumber(row.fees),
    currentBalance: totals.currentBalance + toNumber(row.currentBalance),
  }), { amount: 0, payment: 0, discount: 0, balance: 0, currentPayment: 0, fees: 0, currentBalance: 0 }), [accountingRows]);

  const handleAllocationChange = useCallback((row, field, rawValue) => {
    if (!row?.partnerItem || !allocationEditable) return;

    const rowKey = String(row.moveLineId || row.id);
    const availableBalance = Math.max(0, toNumber(row.balance));

    setPaymentAllocations((previous) => {
      const current = previous[rowKey] || {
        currentPayment: toNumber(row.currentPayment),
        fees: toNumber(row.fees),
        currentBalance: toNumber(row.currentBalance),
        writeOffAmount: toNumber(row.writeOffAmount),
      };
      const nextLine = { ...current };
      const value = Math.max(0, toNumber(rawValue));

      if (field === 'currentPayment') {
        nextLine.currentPayment = Math.min(value, availableBalance);
        nextLine.currentBalance = Math.max(0, availableBalance - nextLine.currentPayment);
      } else if (field === 'currentBalance') {
        nextLine.currentBalance = Math.min(value, availableBalance);
        nextLine.currentPayment = Math.max(0, availableBalance - nextLine.currentBalance);
      } else if (field === 'fees') {
        nextLine.fees = electronicPayment ? value : 0;
      }

      const next = { ...previous, [rowKey]: nextLine };
      const totals = Object.values(next).reduce((result, allocation) => ({
        amount: result.amount + toNumber(allocation.currentPayment),
        fees: result.fees + toNumber(allocation.fees),
      }), { amount: 0, fees: 0 });

      setFormData((oldForm) => ({
        ...oldForm,
        amount: totals.amount,
        fee_amount: electronicPayment ? totals.fees : 0,
      }));
      return next;
    });

    setHasChanges(true);
    setSuccess('');
    setError('');
  }, [allocationEditable, electronicPayment]);

  useEffect(() => {
    const partnerId = formData?.partner_id;
    if (!partnerId || formData?.payment_type === 'transfer') {
      setPartnerOpenItems([]);
      setPartnerItemsLoading(false);
      setPartnerItemsLoaded(false);
      return undefined;
    }

    let cancelled = false;
    setPartnerItemsLoading(true);
    setPartnerItemsLoaded(false);

    axiosInstance.get(API.partnerOpenItems, {
      params: {
        partner: partnerId,
        payment_type: formData?.payment_type,
        company: activeEntity?.id || undefined,
        company_id: activeEntity?.id || undefined,
      },
    }).then((response) => {
      if (cancelled) return;
      const paymentId = String(formData?.id || id || '');
      const selectedCurrencyCode = normalizeLookupText(currencyCode);
      const openItems = normalizeApiList(response.data)
        .filter((line) => {
          if (line.move_state && line.move_state !== 'posted') return false;
          if (paymentId && String(line.payment_id || '') === paymentId) return false;
          const lineCurrencyCode = normalizeLookupText(line.currency_code);
          if (lineCurrencyCode && selectedCurrencyCode && lineCurrencyCode !== selectedCurrencyCode) return false;
          return !line.full_reconcile_id && !line.reconciled;
        })
        .sort((first, second) => {
          const firstDate = String(first.date_maturity || first.move_invoice_date_due || first.date || '9999-12-31');
          const secondDate = String(second.date_maturity || second.move_invoice_date_due || second.date || '9999-12-31');
          return firstDate.localeCompare(secondDate) || toNumber(first.id) - toNumber(second.id);
        });
      setPartnerOpenItems(openItems);
      setPartnerItemsLoaded(true);
    }).catch((requestError) => {
      if (cancelled) return;
      console.error('Erreur chargement des échéances du partenaire', requestError);
      setPartnerOpenItems([]);
      setPartnerItemsLoaded(true);
    }).finally(() => {
      if (!cancelled) setPartnerItemsLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [activeEntity?.id, currencyCode, formData?.id, formData?.partner_id, formData?.payment_type, id]);

  useEffect(() => {
    if (
      !cashPayment
      || !allocationEditable
      || !formData?.partner_id
      || formData?.payment_type === 'transfer'
      || !partnerItemsLoaded
    ) return;

    let amountLeft = Math.max(0, toNumber(formData?.amount));
    const directionMatches = (line) => (
      formData?.payment_type === 'outbound'
        ? toNumber(line.credit) > 0
        : toNumber(line.debit) > 0
    );
    const candidates = partnerOpenItems.filter(directionMatches);
    const firstAccountId = candidates[0]?.account_id || candidates[0]?.account;
    const nextAllocations = {};

    candidates.forEach((line) => {
      const accountId = line.account_id || line.account;
      if (firstAccountId && String(accountId) !== String(firstAccountId)) return;

      const debit = Math.abs(toNumber(line.debit));
      const credit = Math.abs(toNumber(line.credit));
      const originalAmount = Math.abs(toNumber(line.balance)) || debit + credit;
      const residual = Math.abs(toNumber(line.amount_residual)) || (line.reconciled ? 0 : originalAmount);
      const currentPayment = Math.min(residual, amountLeft);
      amountLeft = Math.max(0, amountLeft - currentPayment);

      if (currentPayment > 0) {
        nextAllocations[String(line.id)] = {
          currentPayment,
          currentBalance: Math.max(0, residual - currentPayment),
          writeOffAmount: 0,
          fees: 0,
        };
      }
    });

    setPaymentAllocations((previous) => (
      JSON.stringify(previous) === JSON.stringify(nextAllocations)
        ? previous
        : nextAllocations
    ));
  }, [
    allocationEditable,
    cashPayment,
    formData?.amount,
    formData?.partner_id,
    formData?.payment_type,
    partnerItemsLoaded,
    partnerOpenItems,
  ]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (actionsMenuRef.current && !actionsMenuRef.current.contains(event.target)) {
        setShowActionsMenu(false);
      }
      if (
        paymentColumnsHeaderRef.current
        && !paymentColumnsHeaderRef.current.contains(event.target)
        && paymentColumnsPopupRef.current
        && !paymentColumnsPopupRef.current.contains(event.target)
      ) {
        setShowPaymentColumnsMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    localStorage.setItem(PAYMENT_COLUMNS_STORAGE_KEY, JSON.stringify(paymentColumnVisibility));
  }, [paymentColumnVisibility]);

  useEffect(() => {
    localStorage.setItem(PAYMENT_COLUMN_WIDTHS_STORAGE_KEY, JSON.stringify(paymentColumnWidths));
  }, [paymentColumnWidths]);

  useEffect(() => () => {
    const resize = paymentColumnResizeRef.current;
    if (resize) {
      document.removeEventListener('mousemove', resize.onMouseMove);
      document.removeEventListener('mouseup', resize.onMouseUp);
    }
  }, []);

  const loadTraceability = useCallback(async () => {
    if (!isShowMode || !id) {
      setTraceability([]);
      return;
    }
    try {
      const entityId = activeEntity?.id;
      const response = await axiosInstance.get(API.traceability, {
        params: {
          company: entityId || undefined,
          company_id: entityId || undefined,
          model_name: 'AccountPayment',
          object_id: id,
          page_size: 50,
        },
      });
      const paymentId = String(id);
      const paymentEvents = normalizeApiList(response.data).filter((event) => {
        const eventObjectId = event.object_id ?? event.objectId ?? event.payment_id ?? event.payment;
        const modelName = normalizeLookupText(event.model_name ?? event.model ?? event.content_type)
          .replace(/[^a-z0-9]/g, '');
        const targetsPayment = modelName ? modelName.includes('accountpayment') : event.payment_id != null;
        return targetsPayment && String(eventObjectId) === paymentId;
      });
      setTraceability(paymentEvents);
    } catch (err) {
      setTraceability([]);
      console.error('Erreur chargement traçabilité paiement', err);
    }
  }, [activeEntity?.id, id, isShowMode]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const entityId = activeEntity?.id;
      const [payment, nextOptions] = await Promise.all([
        isShowMode
          ? axiosInstance.get(`${API.payments}${id}/`)
          : Promise.resolve({ data: null }),
        loadPaymentOptions(entityId),
      ]);

      setOptions(nextOptions);

      if (isShowMode) {
        const data = payment.data || {};
        const savedPaymentLines = normalizeApiList(data.payment_lines);
        const savedFeeAmount = toNumber(data.fee_amount);
        const savedLineFees = savedPaymentLines.map((line) => paymentLineFeeFromNote(line.note));
        const hasDetailedFees = savedLineFees.some((fee) => fee > 0);
        setPaymentAllocations(savedPaymentLines.reduce((result, line, index) => {
          const moveLineId = line.move_line_id || line.move_line;
          if (!moveLineId) return result;
          result[String(moveLineId)] = {
            currentPayment: toNumber(line.amount_to_pay),
            currentBalance: toNumber(line.remaining_amount),
            writeOffAmount: toNumber(line.write_off_amount),
            fees: hasDetailedFees ? savedLineFees[index] : (index === 0 ? savedFeeAmount : 0),
          };
          return result;
        }, {}));
        setFormData({
          ...data,
          narration: data.narration || '',
          fee_amount: toNumber(data.fee_amount),
          accounting_lines: normalizeApiList(data.accounting_lines),
          payment_date: toDateInput(data.payment_date || data.date),
          partner_id: data.partner_id || data.partner?.id || data.partner || '',
          journal_id: data.journal_id || data.journal?.id || data.journal || '',
          currency_id: data.currency_id || data.currency?.id || data.currency || '',
          destination_journal_id: data.destination_journal_id || data.transfer_journal_id || '',
          payment_method_id: data.payment_method_id || '',
          payment_method_id_label: data.payment_method_id_label || '',
          payment_method_line_id: data.payment_method_line_id || '',
          payment_method_line_id_label: data.payment_method_line_id_label || '',
          payment_method_code: data.payment_method_code || '',
          payment_method_name: data.payment_method_name || '',
          create_date: data.create_date || data.created_at || data.date_created || '',
          write_date: data.write_date || data.updated_at || data.modified_at || data.date_modified || '',
          create_uid_label: data.create_uid_label || data.created_by_name || data.created_by || '',
          write_uid_label: data.write_uid_label || data.updated_by_name || data.updated_by || '',
        });
        setHasChanges(false);
      } else {
        const defaultCurrency = nextOptions.currencies.find((currency) => currency.code === 'XOF')
          || nextOptions.currencies[0];
        if (defaultCurrency) {
          setFormData((previous) => ({
            ...previous,
            currency_id: previous.currency_id || defaultCurrency.id,
          }));
        }
      }
    } catch (err) {
      setError(`Impossible de charger le paiement : ${getActionErrorMessage(err, 'Paiement introuvable.')}`);
      console.error('Erreur chargement détail paiement', err);
    } finally {
      setLoading(false);
    }
  }, [activeEntity?.id, id, isShowMode]);

  useEffect(() => {
    if (isInvalidDetailId) {
      navigate('/comptabilite/paiements/create', { replace: true });
      return;
    }
    loadData();
    if (isShowMode) loadTraceability();
  }, [isInvalidDetailId, isShowMode, loadData, loadTraceability, navigate]);

  const setField = (field, value) => {
    setFormData((previous) => ({ ...previous, [field]: value }));
    setHasChanges(true);
    setSuccess('');
    setError('');
  };

  const handlePaymentTypeSelection = (value) => {
    const isTransfer = value === 'transfer';
    setPartnerOpenItems([]);
    setPartnerItemsLoaded(false);
    setPaymentAllocations({});
    setFormData((previous) => ({
      ...previous,
      payment_type: value || 'inbound',
      ...(isTransfer ? {
        partner_id: '',
        partner_name: '',
        partner_type: '',
      } : {
        destination_journal_id: '',
        transfer_journal_id: '',
      }),
    }));
    setHasChanges(true);
    setSuccess('');
    setError('');
  };

  const handlePartnerSelection = (value, partner) => {
    const partnerType = getPartnerTypeFromPartner(partner);
    setPartnerOpenItems([]);
    setPartnerItemsLoaded(false);
    setPaymentAllocations({});
    setFormData((previous) => ({
      ...previous,
      partner_id: value || '',
      amount: cashPayment ? previous.amount : 0,
      fee_amount: 0,
      ...(partnerType ? { partner_type: partnerType } : {}),
    }));
    setHasChanges(true);
    setSuccess('');
    setError('');
  };

  const handlePaymentMethodSelection = (value, line) => {
    const methodValues = getPaymentMethodValues(line);
    const methodIsElectronic = isElectronicPayment(line, selectedJournal, 0);
    setFormData((previous) => ({
      ...previous,
      payment_method_line_id: value || '',
      ...methodValues,
      fee_amount: methodIsElectronic ? toNumber(previous.fee_amount) : 0,
    }));
    setPaymentAllocations({});
    setHasChanges(true);
    setSuccess('');
    setError('');
  };

  const buildPaymentLinePayload = () => accountingRows
    .filter((row) => row.partnerItem && toNumber(row.currentPayment) > 0)
    .map((row, index) => ({
      sequence: (index + 1) * 10,
      move_line_id: row.moveLineId || row.id,
      currency_id: row.currencyId || formData?.currency_id,
      exchange_rate: 1,
      amount_to_pay: toNumber(row.currentPayment),
      write_off_amount: toNumber(row.writeOffAmount),
      payment_journal_id: formData?.journal_id || null,
      remaining_amount: toNumber(row.currentBalance),
      allocation_type: 'invoice',
      state: 'draft',
      note: paymentLineNote(row.fees),
    }));

  const validate = () => {
    const errors = [];
    if (!(formData?.company_id || formData?.company?.id || activeEntity?.id)) errors.push('La société est obligatoire.');
    if (!formData?.amount || Number(formData.amount) <= 0) errors.push('Le montant doit être supérieur à 0.');
    if (!formData?.currency_id) errors.push('La devise est obligatoire.');
    if (!formData?.journal_id) {
      errors.push(
        formData?.payment_type === 'transfer'
          ? 'Le journal source est obligatoire.'
          : 'Le journal de paiement est obligatoire.',
      );
    }
    if (!formData?.payment_method_line_id) errors.push('Le mode de paiement est obligatoire.');
    if (!formData?.payment_date) errors.push('La date du paiement est obligatoire.');
    if (toNumber(formData?.fee_amount) < 0) errors.push('Les frais du paiement ne peuvent pas être négatifs.');
    if (formData?.payment_type === 'inbound' && toNumber(formData?.fee_amount) > toNumber(formData?.amount)) {
      errors.push('Les frais électroniques ne peuvent pas dépasser le montant encaissé.');
    }
    if (formData?.payment_type === 'transfer' && !formData?.destination_journal_id) errors.push('Le journal de destination est obligatoire.');
    if (formData?.partner_id && formData?.payment_type !== 'transfer' && !cashPayment) {
      const selectedLines = buildPaymentLinePayload();
      if (!selectedLines.length) {
        errors.push('Saisissez un montant dans « Paiement actuel » sur au moins une échéance.');
      }
      if (Math.abs(accountingTotals.currentPayment - toNumber(formData?.amount)) > 0.01) {
        errors.push('Le montant du paiement doit correspondre au total de « Paiement actuel ».');
      }
      const inconsistentLine = accountingRows.find((row) => (
        row.partnerItem
        && Math.abs((toNumber(row.balance) - toNumber(row.currentPayment)) - toNumber(row.currentBalance)) > 0.01
      ));
      if (inconsistentLine) {
        errors.push(`Le solde actuel de la pièce ${inconsistentLine.pieceNumber} est incohérent.`);
      }
    }
    return errors;
  };

  const buildPayload = () => ({
    name: formData.name || '/',
    payment_type: formData.payment_type || 'inbound',
    partner_type: formData.payment_type === 'transfer' ? '' : (formData.partner_type || ''),
    state: formData.state || 'draft',
    payment_date: formData.payment_date,
    reference: formData.reference || '',
    narration: formData.narration || '',
    company_id: formData.company_id || formData.company?.id || activeEntity?.id,
    amount: Number(formData.amount || 0),
    fee_amount: electronicPayment ? Number(formData.fee_amount || 0) : 0,
    partner_id: formData.payment_type === 'transfer' ? null : (formData.partner_id || null),
    currency_id: formData.currency_id || null,
    journal_id: formData.journal_id || null,
    destination_journal_id: formData.payment_type === 'transfer' ? String(formData.destination_journal_id || '') : '',
    payment_method_id: formData.payment_method_id || '',
    payment_method_id_label: formData.payment_method_id_label || '',
    payment_method_line_id: formData.payment_method_line_id || '',
    payment_method_line_id_label: formData.payment_method_line_id_label || '',
    payment_method_code: formData.payment_method_code || '',
    payment_method_name: formData.payment_method_name || '',
    payment_lines: formData.payment_type === 'transfer' ? [] : buildPaymentLinePayload(),
  });

  const handleSave = async () => {
    if (saveInFlightRef.current) return false;
    const errors = validate();
    if (errors.length) {
      setError(errors.join('\n'));
      return false;
    }

    saveInFlightRef.current = true;
    setSaving(true);
    setError('');
    try {
      const response = isShowMode
        ? await axiosInstance.patch(`${API.payments}${id}/`, buildPayload())
        : await axiosInstance.post(API.payments, buildPayload());
      const data = response.data || {};
      setFormData((previous) => ({
        ...previous,
        ...data,
        narration: data.narration || previous.narration || '',
        payment_date: toDateInput(data.payment_date || previous.payment_date),
      }));
      setHasChanges(false);
      setSuccess(isShowMode ? 'Paiement modifié.' : 'Paiement enregistré.');
      if (isShowMode) {
        await loadTraceability();
      } else {
        navigate('/comptabilite/paiements', {
          replace: true,
          state: { refreshPayments: true, refreshAt: Date.now() },
        });
      }
      return true;
    } catch (err) {
      setError(`Échec enregistrement : ${getActionErrorMessage(err, 'Échec enregistrement du paiement.')}`);
      console.error('Erreur sauvegarde paiement', err);
      return false;
    } finally {
      saveInFlightRef.current = false;
      setSaving(false);
    }
  };

  const runAction = async (action, fallbackPatch = null) => {
    setSaving(true);
    setError('');
    try {
      try {
        await axiosInstance.post(`${API.payments}${id}/${action}/`);
      } catch (err) {
        if (!fallbackPatch) throw err;
        await axiosInstance.patch(`${API.payments}${id}/`, fallbackPatch);
      }
      await loadData();
      await loadTraceability();
    } catch (err) {
      setError(`Échec action : ${getActionErrorMessage(err, "L'action n'a pas pu être exécutée.")}`);
      console.error('Erreur action paiement', err);
    } finally {
      setSaving(false);
    }
  };

  const resetCreateForm = () => {
    setShowActionsMenu(false);
    setPaymentAllocations({});
    setFormData({
      name: '',
      payment_type: 'inbound',
      partner_type: 'customer',
      partner_id: '',
      amount: '',
      fee_amount: 0,
      currency_id: options.currencies.find((currency) => currency.code === 'XOF')?.id
        || options.currencies[0]?.id
        || '',
      journal_id: '',
      payment_method_id: '',
      payment_method_id_label: '',
      payment_method_line_id: '',
      payment_method_line_id_label: '',
      payment_method_code: '',
      payment_method_name: '',
      payment_date: today(),
      reference: '',
      narration: '',
      destination_journal_id: '',
      state: 'draft',
      accounting_lines: [],
    });
    setHasChanges(false);
    setError('');
    setSuccess('Formulaire réinitialisé.');
  };

  const duplicatePayment = () => {
    setShowActionsMenu(false);
    navigate('/comptabilite/paiements/create', {
      state: {
        duplicatePayment: {
          ...formData,
          id: undefined,
          name: '',
          state: 'draft',
          create_date: undefined,
          write_date: undefined,
        },
      },
    });
  };

  const printPayment = () => {
    setShowActionsMenu(false);
    window.setTimeout(() => window.print(), 50);
  };

  const deletePayment = async () => {
    setShowActionsMenu(false);
    if (!isDraft) return;
    setSaving(true);
    setError('');
    try {
      await axiosInstance.delete(`${API.payments}${id}/`);
      navigate('/comptabilite/paiements', {
        replace: true,
        state: { refreshPayments: true },
      });
    } catch (err) {
      setError(getActionErrorMessage(err, 'Impossible de supprimer ce paiement.'));
      setSaving(false);
    }
  };

  const executeStateAction = (action, fallbackPatch, confirmation) => {
    setShowActionsMenu(false);
    setPendingAction({
      type: 'state',
      action,
      fallbackPatch,
      title: action === 'validate'
        ? 'Valider le paiement'
        : action === 'start-processing'
          ? 'Mettre en cours de traitement'
          : action === 'draft'
            ? 'Remettre en brouillon'
            : 'Annuler le paiement',
      message: confirmation || 'Confirmer cette action ?',
      danger: action === 'cancel',
    });
  };

  const confirmPendingAction = async () => {
    const actionToRun = pendingAction;
    setPendingAction(null);
    if (!actionToRun) return;
    if (actionToRun.type === 'state') {
      await runAction(actionToRun.action, actionToRun.fallbackPatch);
    } else if (actionToRun.type === 'duplicate') {
      duplicatePayment();
    } else if (actionToRun.type === 'reset') {
      resetCreateForm();
    } else if (actionToRun.type === 'delete') {
      await deletePayment();
    }
  };

  if (isInvalidDetailId) {
    return null;
  }

  if (loading) {
    return (
      <UnifiedFormPage
        title="Paiements"
        recordLabel="Chargement..."
        pageLabel={isShowMode ? 'Détail du paiement' : 'Création d’un paiement'}
        mode={isShowMode ? 'show' : 'create'}
        fallbackPath="/comptabilite/paiements"
        primaryAction={{ label: 'Nouveau', icon: <FiPlus size={13} />, path: '/comptabilite/paiements/create' }}
        noContext={<div className="p-10 text-center text-sm text-gray-500">Chargement du paiement...</div>}
      >
        <div className="p-10 text-center text-sm text-gray-500">Chargement du paiement...</div>
      </UnifiedFormPage>
    );
  }

  if (!formData) {
    return (
      <UnifiedFormPage
        title="Paiements"
        recordLabel="Paiement introuvable"
        mode="show"
        fallbackPath="/comptabilite/paiements"
        primaryAction={{ label: 'Nouveau', icon: <FiPlus size={13} />, path: '/comptabilite/paiements/create' }}
        feedback={{ type: 'error', message: error || 'Paiement introuvable.' }}
      >
        <div className="p-10 text-center text-sm text-gray-500">Aucune donnée à afficher.</div>
      </UnifiedFormPage>
    );
  }

  const normalizedPaymentState = normalizeLookupText(formData.state).replace(/[^a-z0-9]/g, '');
  const normalizedWorkflowState = normalizeLookupText(formData.workflow_state || formData.state).replace(/[^a-z0-9]/g, '');
  const isDraft = !normalizedPaymentState || ['draft', 'brouillon'].includes(normalizedPaymentState);
  const isPosted = ['posted', 'paid', 'paye', 'validated', 'valide'].includes(normalizedPaymentState);
  const isCancelled = ['cancel', 'cancelled', 'annule', 'annulee'].includes(normalizedPaymentState);
  const paymentProcessState = ['posted', 'paid', 'paye', 'validated', 'valide'].includes(normalizedPaymentState)
    ? 'paid'
    : ['processing', 'inprocess', 'encours', 'encoursdetraitement'].includes(normalizedWorkflowState)
      ? 'processing'
      : 'draft';
  const isProcessing = isDraft && paymentProcessState === 'processing';
  const canStartProcessing = isShowMode && isDraft && !isProcessing && !hasChanges && !saving;
  const canValidate = isShowMode && isDraft && !hasChanges && !saving;
  const canCancel = isShowMode && isPosted && !saving;
  const canResetToDraft = isShowMode && (isProcessing || isCancelled) && !saving;
  const canDuplicate = isShowMode && !saving;
  const canPrint = isShowMode && !saving;
  const canResetForm = !isShowMode && !saving;
  const canDelete = isShowMode && isDraft && !isProcessing && !saving;
  const systemTraceability = [
    formData.create_date ? {
      id: 'payment-created',
      action: 'Création',
      description: `Paiement ${formData.name || `#${formData.id || id}`}`,
      user_label: formData.create_uid_label || formData.created_by || formData.user_label || 'Utilisateur',
      created_at: formData.create_date,
    } : null,
    formData.write_date && !sameDateTime(formData.write_date, formData.create_date) ? {
      id: 'payment-updated',
      action: 'Modification',
      description: `Paiement ${formData.name || `#${formData.id || id}`}`,
      user_label: formData.write_uid_label || formData.updated_by || formData.user_label || 'Utilisateur',
      created_at: formData.write_date,
    } : null,
  ].filter(Boolean);
  const displayedTraceability = traceability.length ? traceability : systemTraceability;

  const feedback = error
    ? { type: 'error', message: error }
    : success
      ? { type: 'success', message: success }
      : null;

  const requestValidation = () => {
    setShowActionsMenu(false);
    if (!isShowMode) {
      setError('Enregistrez d’abord le paiement, puis ouvrez-le pour le valider.');
      return;
    }
    if (hasChanges) {
      setError('Enregistrez les modifications avant de valider le paiement.');
      return;
    }
    executeStateAction('validate', null, 'Valider ce paiement ?');
  };

  const requestProcessing = () => {
    setShowActionsMenu(false);
    if (!isShowMode) {
      setError('Enregistrez d’abord le paiement, puis ouvrez-le pour le mettre en cours de traitement.');
      return;
    }
    if (hasChanges) {
      setError('Enregistrez les modifications avant de mettre le paiement en cours de traitement.');
      return;
    }
    executeStateAction(
      'start-processing',
      null,
      'Mettre ce paiement en cours de traitement ?',
    );
  };

  const actionsMenu = (
    <div className="relative z-[90]" ref={actionsMenuRef}>
      <button
        type="button"
        onClick={() => setShowActionsMenu((value) => !value)}
        className="flex h-8 items-center gap-1 border border-gray-300 px-3 text-xs text-gray-700 transition-all hover:border-purple-500 hover:bg-purple-50 hover:text-purple-700"
      >
        <FiSettings size={12} />
        <span>Actions</span>
      </button>
      {showActionsMenu && (
        <div className="absolute right-0 z-[80] mt-1 w-56 border border-gray-300 bg-white shadow-lg">
          <button type="button" onClick={requestProcessing} disabled={!canStartProcessing} title={canStartProcessing ? '' : 'Disponible pour un paiement brouillon enregistré et sans modification en attente.'} className="flex w-full items-center gap-2 border-b border-gray-100 px-3 py-2 text-left text-xs transition-all duration-200 hover:bg-purple-50 hover:pl-4 hover:text-purple-700 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400 disabled:hover:pl-3">
            <FiClock size={13} /> Mettre en cours de traitement
          </button>
          <button type="button" onClick={requestValidation} disabled={!canValidate} title={canValidate ? '' : 'Disponible pour un paiement brouillon enregistré et sans modification en attente.'} className="flex w-full items-center gap-2 border-b border-gray-100 px-3 py-2 text-left text-xs transition-all duration-200 hover:bg-purple-50 hover:pl-4 hover:text-purple-700 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400 disabled:hover:pl-3">
            <FiCheck size={13} /> Valider le paiement
          </button>
          <button type="button" onClick={() => executeStateAction('cancel', null, 'Annuler ce paiement validé ?')} disabled={!canCancel} title={canCancel ? '' : 'Disponible uniquement pour un paiement validé.'} className="flex w-full items-center gap-2 border-b border-gray-100 px-3 py-2 text-left text-xs text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400">
            <FiX size={13} /> Annuler le paiement
          </button>
          <button type="button" onClick={() => executeStateAction('draft', null, 'Remettre ce paiement en brouillon ?')} disabled={!canResetToDraft} title={canResetToDraft ? '' : 'Disponible pour un paiement en cours de traitement ou annulé.'} className="flex w-full items-center gap-2 border-b border-gray-100 px-3 py-2 text-left text-xs hover:bg-purple-50 hover:text-purple-700 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400">
            <FiRefreshCw size={13} /> Remettre en brouillon
          </button>
          <button type="button" onClick={() => { setShowActionsMenu(false); setPendingAction({ type: 'duplicate', title: 'Dupliquer le paiement', message: 'Créer un nouveau paiement brouillon avec les mêmes informations ?', danger: false }); }} disabled={!canDuplicate} className="flex w-full items-center gap-2 border-b border-gray-100 px-3 py-2 text-left text-xs hover:bg-purple-50 hover:text-purple-700 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400"><FiCopy size={13} /> Dupliquer</button>
          <button type="button" onClick={printPayment} disabled={!canPrint} className="flex w-full items-center gap-2 border-b border-gray-100 px-3 py-2 text-left text-xs hover:bg-purple-50 hover:text-purple-700 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400"><FiPrinter size={13} /> Imprimer</button>
          <button type="button" onClick={() => { setShowActionsMenu(false); setPendingAction({ type: 'reset', title: 'Réinitialiser le formulaire', message: 'Effacer toutes les informations saisies dans ce formulaire ?', danger: true }); }} disabled={!canResetForm} className="flex w-full items-center gap-2 border-b border-gray-100 px-3 py-2 text-left text-xs hover:bg-purple-50 hover:text-purple-700 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400"><FiRefreshCw size={13} /> Réinitialiser le formulaire</button>
          <button
            type="button"
            onClick={() => {
              setShowTraceabilityPanel((value) => !value);
              setShowActionsMenu(false);
            }}
            className="flex w-full items-center gap-2 border-b border-gray-100 px-3 py-2 text-left text-xs transition-all duration-200 hover:bg-gray-50 hover:pl-4 hover:text-purple-700"
          >
            <FiInfo size={13} />
            {showTraceabilityPanel ? 'Fermer la traçabilité' : 'Afficher la traçabilité'}
          </button>
          <button type="button" onClick={() => { setShowActionsMenu(false); navigate('/comptabilite/paiements'); }} className="w-full border-b border-gray-100 px-3 py-2 text-left text-xs hover:bg-gray-50">Retour à la liste</button>
          <button type="button" onClick={() => { setShowActionsMenu(false); setPendingAction({ type: 'delete', title: 'Supprimer le paiement', message: 'Supprimer définitivement ce paiement brouillon ?', danger: true }); }} disabled={!canDelete} title={canDelete ? '' : 'Disponible uniquement pour un paiement brouillon qui n’est pas en traitement.'} className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400"><FiTrash2 size={13} /> Supprimer</button>
        </div>
      )}
    </div>
  );

  const process = (
    <div className="border-b border-gray-300 px-4 py-3">
      <div className="flex items-center justify-end">
        <PaymentProcess state={paymentProcessState} />
      </div>
    </div>
  );

  const traceabilityContent = (
    <div className="px-4 py-3">
      <div className="mb-3 flex items-center justify-between text-xs">
        <span className="font-medium text-gray-700">Activité liée au paiement</span>
        <span className="text-gray-500">{displayedTraceability.length} événement(s)</span>
      </div>
      <div className="space-y-2">
        {displayedTraceability.length === 0 ? (
          <div className="border border-gray-200 bg-white p-3 text-xs text-gray-500">Aucune activité enregistrée.</div>
        ) : displayedTraceability.map((event) => (
          <div key={event.id} className="border border-gray-200 bg-white p-3">
            <div className="flex items-start gap-2">
              <FiClock className="mt-0.5 shrink-0 text-purple-600" size={14} />
              <div className="min-w-0">
                <div className="text-xs font-semibold text-gray-900">{event.action || 'Action'}</div>
                <div className="text-xs text-gray-600">{event.description || event.object_label || '-'}</div>
                <div className="mt-1 text-[11px] text-gray-400">Par {event.user_label || event.create_uid_label || event.user_name || 'Utilisateur'} - {formatDateTime(event.created_at || event.create_date)}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const actionDialog = pendingAction && (
    <div className="fixed inset-0 z-[140] flex items-center justify-center bg-slate-900/35 p-4" role="presentation">
      <div role="dialog" aria-modal="true" aria-labelledby="payment-action-title" className="w-full max-w-md border border-gray-300 bg-white shadow-2xl">
        <div className="flex items-start gap-3 border-b border-gray-200 px-5 py-4">
          <FiInfo className={pendingAction.danger ? 'mt-0.5 text-red-600' : 'mt-0.5 text-purple-600'} size={18} />
          <div>
            <h2 id="payment-action-title" className="text-sm font-semibold text-gray-900">{pendingAction.title}</h2>
            <p className="mt-1 text-xs leading-5 text-gray-600">{pendingAction.message}</p>
          </div>
        </div>
        <div className="flex justify-end gap-2 px-5 py-4">
          <button type="button" onClick={() => setPendingAction(null)} disabled={saving} className="h-8 border border-gray-300 px-3 text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-50">Fermer</button>
          <button type="button" onClick={confirmPendingAction} disabled={saving} className={`h-8 px-3 text-xs font-medium text-white disabled:opacity-50 ${pendingAction.danger ? 'bg-red-600 hover:bg-red-700' : 'bg-purple-600 hover:bg-purple-700'}`}>
            {saving ? 'Traitement...' : 'Confirmer'}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
    <UnifiedFormPage
      title="Paiements"
      recordLabel={formData.name || 'Brouillon'}
      pageLabel={isShowMode ? 'Détail du paiement' : 'Création d’un paiement'}
      mode={isShowMode ? 'show' : 'create'}
      fallbackPath="/comptabilite/paiements"
      primaryAction={{ label: 'Nouveau', icon: <FiPlus size={13} />, path: '/comptabilite/paiements/create' }}
      actionsMenu={actionsMenu}
      onSave={isDraft ? handleSave : undefined}
      saveLabel={isShowMode ? 'Enregistrer les modifications' : 'Enregistrer'}
      saveIcon={<FiUploadCloud size={16} />}
      saving={saving}
      hasUnsavedChanges={hasChanges}
      rememberForm={!isShowMode}
      memoryKey="payment-form"
      memoryState={!isShowMode ? { formData, paymentAllocations } : undefined}
      onRestoreMemoryState={!isShowMode ? (memory) => {
        if (memory?.formData) {
          setFormData((previous) => ({ ...previous, ...memory.formData }));
          setPaymentAllocations(memory.paymentAllocations || {});
          setHasChanges(true);
        }
      } : undefined}
      feedback={feedback}
      onDismissFeedback={() => { setError(''); setSuccess(''); }}
      messageDuration={15000}
      process={process}
      traceability={{
        open: showTraceabilityPanel,
        onOpen: () => setShowTraceabilityPanel(true),
        onClose: () => setShowTraceabilityPanel(false),
        title: 'Traçabilité',
        content: traceabilityContent,
      }}
    >
      <div>
        <div className="border-b border-gray-300 px-4 py-4">
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div className="space-y-2">
                  <Field label="Type de paiement" required>
                    <SearchSelect value={formData.payment_type || 'inbound'} onChange={handlePaymentTypeSelection} disabled={!isDraft} options={PAYMENT_TYPE_OPTIONS} getLabel={(item) => item.label} placeholder="Type de paiement" />
                  </Field>
                  {formData.payment_type !== 'transfer' && (
                    <>
                      <Field label="Partenaire">
                        <SearchSelect value={formData.partner_id} onChange={handlePartnerSelection} disabled={!isDraft} options={options.partners} getLabel={(partner) => partner.nom || partner.name || partner.email || `Partenaire ${partner.id}`} placeholder="Sélectionner un partenaire" />
                      </Field>
                      <Field label="Type partenaire">
                        <SearchSelect value={formData.partner_type || ''} onChange={(value) => setField('partner_type', value)} disabled={!isDraft} options={PARTNER_TYPE_OPTIONS} getLabel={(item) => item.label} placeholder="Type partenaire" />
                      </Field>
                    </>
                  )}
                  <Field label="Montant" required>
                    <AmountInput
                      value={formData.amount}
                      onChange={(value) => setField('amount', value)}
                      disabled={!isDraft || (!cashPayment && Boolean(formData.partner_id) && formData.payment_type !== 'transfer')}
                    />
                  </Field>
                  {formData.payment_type === 'transfer' && (
                    <>
                      <Field label="Journal source" required>
                        <SearchSelect
                          value={formData.journal_id}
                          onChange={(value) => setField('journal_id', value)}
                          disabled={!isDraft}
                          options={treasuryJournals}
                          getLabel={(journal) => optionLabel(journal)}
                          placeholder="Sélectionner le journal source"
                        />
                      </Field>
                      <Field label="Journal destination" required>
                        <SearchSelect
                          value={formData.destination_journal_id}
                          onChange={(value) => setField('destination_journal_id', value)}
                          disabled={!isDraft}
                          options={treasuryJournals}
                          getLabel={(journal) => optionLabel(journal)}
                          placeholder="Sélectionner le journal destination"
                        />
                      </Field>
                    </>
                  )}
                  {electronicPayment && (
                    <Field label="Frais électroniques">
                      <AmountInput
                        value={formData.fee_amount}
                        onChange={(value) => setField('fee_amount', value)}
                        disabled={!isDraft || (Boolean(formData.partner_id) && formData.payment_type !== 'transfer')}
                      />
                    </Field>
                  )}
                </div>

                <div className="space-y-2">
                  <Field label="Devise" required><SearchSelect value={formData.currency_id} onChange={(value) => setField('currency_id', value)} disabled={!isDraft} options={options.currencies} getLabel={(currency) => [currency.code, currency.name || currency.nom].filter(Boolean).join(' - ')} placeholder="Devise" /></Field>
                  <Field label="Date paiement" required><input type="date" value={formData.payment_date || today()} onChange={(event) => setField('payment_date', event.target.value)} disabled={!isDraft} className="h-[26px] w-full border border-gray-300 px-2 text-xs hover:border-purple-400 focus:border-purple-600 disabled:bg-gray-100" /></Field>
                  {formData.payment_type !== 'transfer' && (
                    <Field label="Journal de paiement" required>
                      <SearchSelect
                        value={formData.journal_id}
                        onChange={(value) => setField('journal_id', value)}
                        disabled={!isDraft}
                        options={treasuryJournals}
                        getLabel={(journal) => optionLabel(journal)}
                        placeholder="Sélectionner le journal de paiement"
                      />
                    </Field>
                  )}
                  <Field label="Mode de paiement" required><SearchSelect value={formData.payment_method_line_id} onChange={handlePaymentMethodSelection} disabled={!isDraft} options={options.methodLines} getLabel={(line) => line.name || line.display_name || line.payment_method_id_label || line.code || `Mode ${line.id}`} placeholder="Sélectionner un mode de paiement" /></Field>
                </div>
              </div>
        </div>
        <div className="border-b border-gray-300 px-4">
          <div className="flex items-center gap-1">
            {[
              { id: 'accounting', label: 'Écriture comptable' },
              { id: 'notes', label: 'Notes' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`border-b-2 px-4 py-3 text-xs font-medium transition-colors ${activeTab === tab.id ? 'border-purple-600 text-purple-700' : 'border-transparent text-gray-500 hover:text-purple-700'}`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {activeTab === 'accounting' ? (
          <div className="px-4 py-4">
            <div className="payment-accounting-scroll mb-3 max-h-[52vh] overflow-auto">
              <table
                className="table-fixed border-collapse text-xs"
                style={{ minWidth: `${paymentTableColumns.reduce((sum, column) => sum + (paymentColumnWidths[column.key] || DEFAULT_PAYMENT_COLUMN_WIDTHS[column.key] || 120), 0)}px` }}
              >
                <colgroup>
                  {paymentTableColumns.map((column) => <col key={column.key} style={paymentColumnStyle(column.key)} />)}
                </colgroup>
                <thead className="sticky top-0 z-10">
                  <tr className="bg-gray-100">
                    {paymentTableColumns.map((column) => (
                      <th
                        key={column.key}
                        ref={column.key === 'actions' ? paymentColumnsHeaderRef : undefined}
                        className={`relative border border-gray-300 px-2 py-1.5 text-xs font-medium text-gray-700 ${column.numeric ? 'text-right' : 'text-left'}`}
                      >
                        {column.key === 'actions' ? (
                          <button
                            ref={paymentColumnsButtonRef}
                            type="button"
                            onClick={togglePaymentColumnsMenu}
                            className="w-full text-left hover:text-purple-600"
                            aria-label="Afficher ou masquer les colonnes"
                            title="Afficher ou masquer les colonnes"
                          >
                            ...
                          </button>
                        ) : column.label}
                        <span
                          role="separator"
                          aria-label={`Redimensionner ${column.label || 'les actions'}`}
                          onMouseDown={(event) => startPaymentColumnResize(event, column.key)}
                          className="absolute right-0 top-0 z-20 h-full w-1 cursor-col-resize select-none hover:bg-purple-400"
                        />
                      </th>
                    ))}
                  </tr>
                </thead>
                  <tbody>
                    {partnerItemsLoading && (
                      <tr>
                        <td colSpan={paymentTableColumns.length} className="h-16 border border-gray-300 px-3 text-center text-gray-500">
                          Chargement des échéances du partenaire...
                        </td>
                      </tr>
                    )}
                    {!partnerItemsLoading && formData?.partner_id && partnerItemsLoaded && accountingRows.length === 0 && (
                      <tr>
                        <td colSpan={paymentTableColumns.length} className="h-16 border border-gray-300 px-3 text-center text-gray-500">
                          Aucune échéance ouverte pour ce partenaire.
                        </td>
                      </tr>
                    )}
                    {!partnerItemsLoading && accountingRows.map((row, index) => (
                      <tr key={row.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50/60'}>
                        {paymentColumnVisibility.date !== false && <td className="h-10 whitespace-nowrap border border-gray-300 px-3">{formatDate(row.date)}</td>}
                        {paymentColumnVisibility.dueDate !== false && <td className="h-10 whitespace-nowrap border border-gray-300 px-3">{formatDate(row.dueDate)}</td>}
                        {paymentColumnVisibility.journalAccount !== false && <td className="h-10 truncate border border-gray-300 px-3" title={row.journalAccount}>{row.journalAccount}</td>}
                        {paymentColumnVisibility.pieceNumber !== false && <td className="h-10 truncate border border-gray-300 px-3" title={row.pieceNumber}>{row.pieceNumber}</td>}
                        {paymentColumnVisibility.label !== false && <td className="h-10 truncate border border-gray-300 px-3" title={row.label}>{row.label}</td>}
                        {paymentColumnVisibility.amount !== false && <td className="h-10 whitespace-nowrap border border-gray-300 px-3 text-right">{formatTableAmount(row.amount)}</td>}
                        {paymentColumnVisibility.payment !== false && <td className="h-10 whitespace-nowrap border border-gray-300 px-3 text-right">{formatTableAmount(row.payment)}</td>}
                        {paymentColumnVisibility.discount !== false && <td className="h-10 whitespace-nowrap border border-gray-300 px-3 text-right">{formatTableAmount(row.discount)}</td>}
                        {paymentColumnVisibility.balance !== false && <td className="h-10 whitespace-nowrap border border-gray-300 px-3 text-right">{formatTableAmount(row.balance)}</td>}
                        <td className="h-10 whitespace-nowrap border border-gray-300 px-1 text-right">
                          {row.partnerItem ? (
                            <AmountInput
                              value={row.currentPayment}
                              onChange={(value) => handleAllocationChange(row, 'currentPayment', value)}
                              disabled={!isDraft || cashPayment}
                              embedded
                            />
                          ) : formatTableAmount(row.currentPayment)}
                        </td>
                        <td className="h-10 whitespace-nowrap border border-gray-300 px-1 text-right">
                          {row.partnerItem ? (
                            <AmountInput
                              value={row.fees}
                              onChange={(value) => handleAllocationChange(row, 'fees', value)}
                              disabled={!isDraft || !electronicPayment}
                              embedded
                            />
                          ) : formatTableAmount(row.fees)}
                        </td>
                        <td className="h-10 whitespace-nowrap border border-gray-300 px-1 text-right">
                          {row.partnerItem ? (
                            <AmountInput
                              value={row.currentBalance}
                              onChange={(value) => handleAllocationChange(row, 'currentBalance', value)}
                              disabled={!isDraft || cashPayment}
                              embedded
                            />
                          ) : formatTableAmount(row.currentBalance)}
                        </td>
                        <td className="h-10 border border-gray-300" />
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-0 bg-transparent">
                    <tr>
                      {firstVisibleNumericColumnIndex > 0 && <td colSpan={firstVisibleNumericColumnIndex} />}
                      {paymentColumnVisibility.amount !== false && <td className="whitespace-nowrap px-2 py-2 text-right text-sm font-semibold text-gray-900">{formatTableAmount(accountingTotals.amount)}</td>}
                      {paymentColumnVisibility.payment !== false && <td className="whitespace-nowrap px-2 py-2 text-right text-sm font-semibold text-gray-900">{formatTableAmount(accountingTotals.payment)}</td>}
                      {paymentColumnVisibility.discount !== false && <td className="whitespace-nowrap px-2 py-2 text-right text-sm font-semibold text-gray-900">{formatTableAmount(accountingTotals.discount)}</td>}
                      {paymentColumnVisibility.balance !== false && <td className="whitespace-nowrap px-2 py-2 text-right text-sm font-semibold text-gray-900">{formatTableAmount(accountingTotals.balance)}</td>}
                      <td className="whitespace-nowrap px-2 py-2 text-right text-sm font-semibold text-gray-900">{formatTableAmount(accountingTotals.currentPayment)}</td>
                      <td className="whitespace-nowrap px-2 py-2 text-right text-sm font-semibold text-gray-900">{formatTableAmount(accountingTotals.fees)}</td>
                      <td className="whitespace-nowrap px-2 py-2 text-right text-sm font-semibold text-gray-900">{formatTableAmount(accountingTotals.currentBalance)}</td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
              {showPaymentColumnsMenu && (
                <div
                  ref={paymentColumnsPopupRef}
                  className="w-44 border border-t-0 border-gray-300 bg-white shadow-lg"
                  style={paymentColumnsMenuStyle}
                >
                  {PAYMENT_OPTIONAL_COLUMNS.map((column) => (
                    <label key={column.key} className="flex cursor-pointer items-center gap-2 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50">
                      <input
                        type="checkbox"
                        checked={paymentColumnVisibility[column.key] !== false}
                        onChange={() => togglePaymentColumn(column.key)}
                        className="h-3 w-3"
                      />
                      <span>{column.label}</span>
                    </label>
                  ))}
                </div>
              )}
            <div className="mt-2 flex items-center justify-between gap-4 text-[11px] text-gray-500">
              <span>{formData.account_move ? 'Lignes comptables enregistrées' : 'Prévisualisation avant validation'}</span>
              {electronicPayment && <span>Les frais sont intégrés au mouvement de trésorerie.</span>}
            </div>
          </div>
        ) : (
          <div className="p-4">
            <div className="mb-2 flex items-center gap-2 text-xs font-medium text-gray-700">
              <FiFileText size={13} />
              <span>Notes</span>
            </div>
            <textarea value={formData.narration || ''} onChange={(event) => setField('narration', event.target.value)} disabled={!isDraft} rows={6} className="w-full border border-gray-300 px-3 py-2 text-xs outline-none hover:border-purple-400 focus:border-purple-600 disabled:bg-gray-100" placeholder="Notes / libellé du paiement..." />
          </div>
        )}
        <style>{`
          .payment-accounting-scroll {
            scrollbar-width: thin;
            scrollbar-color: #e2e8f0 transparent;
          }
          .payment-accounting-scroll::-webkit-scrollbar { width: 1px; height: 1px; }
          .payment-accounting-scroll::-webkit-scrollbar-track { background: transparent; }
          .payment-accounting-scroll::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 999px; }
          .payment-accounting-scroll::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
        `}</style>
      </div>
    </UnifiedFormPage>
    {actionDialog}
    </>
  );
}


