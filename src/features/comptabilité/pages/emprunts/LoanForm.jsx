// src/features/comptabilite/pages/emprunts/LoanForm.jsx
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FiCheck,
  FiAlertCircle,
  FiCopy,
  FiEye,
  FiEyeOff,
  FiPlus,
  FiPrinter,
  FiRefreshCw,
  FiSettings,
  FiTrash2,
  FiX,
} from 'react-icons/fi';
import { useLocation, useNavigate, useParams } from 'react-router-dom';

import UnifiedFormPage from '../../../../components/UnifiedFormPage';
import axiosInstance from '../../../../config/axiosInstance';
import {
  SearchSelect,
  getActionErrorMessage,
  getActiveEntityId,
  normalizeApiList,
  optionLabel,
} from '../payement/paymentShared.jsx';

const API = {
  loans: 'compta/loans/',
  lines: 'compta/loan-lines/',
  accruals: 'compta/loan-accruals/',
  maps: 'compta/loan-account-maps/',
  partners: 'partenaires/',
  partnerBanks: 'banques-partenaires/',
  currencies: 'devises/',
  journals: 'compta/journals/',
  journalTypes: 'compta/journal-types/',
  accounts: 'compta/accounts/',
  traceability: 'compta/module-traceability/',
};

const FORM_MEMORY_KEY = 'comptabilite:loan:create:v1';
const DRAFT_SCHEDULE_STORAGE_PREFIX = 'comptabilite:loan:draft-schedule:';
const PERIODICITIES = [
  { id: 'monthly', label: 'Mois' },
  { id: 'bimonthly', label: 'Deux mois' },
  { id: 'quarterly', label: 'Trimestre' },
  { id: 'semiannual', label: 'Semestre' },
  { id: 'annual', label: 'Année' },
];
const LINE_STATES = [
  { id: 'upcoming', label: 'À venir' },
  { id: 'due', label: 'Échéance due' },
  { id: 'partial', label: 'Partiel' },
  { id: 'paid', label: 'Payé' },
  { id: 'cancelled', label: 'Annulé' },
];
const COMPONENT_TYPES = [
  { id: 'capital', label: 'Capital' },
  { id: 'interest', label: 'Intérêt' },
  { id: 'accrued_interest', label: 'Intérêt couru' },
  { id: 'tax_fees', label: 'Taxe sur activité financière' },
  { id: 'other_fees', label: 'Autre' },
];
const SCHEDULE_COLUMNS = [
  { key: 'sequence', label: 'Échéance', width: 90, required: true },
  { key: 'due_date', label: 'Date échéance', width: 150, required: true },
  { key: 'opening_balance', label: 'Capital début période', width: 170 },
  { key: 'principal_component', label: 'Capital', width: 170, required: true },
  { key: 'interest_component', label: 'Intérêt', width: 160, required: true },
  { key: 'taxe_fees_component', label: 'Taxe', width: 150 },
  { key: 'others_fees_component', label: 'Autres frais', width: 170 },
  { key: 'total_payment', label: 'Annuité', width: 180, required: true },
  { key: 'remaining_balance', label: 'Capital restant dû', width: 190, required: true },
  { key: 'state', label: 'État', width: 160 },
  { key: 'actions', label: '', width: 48, required: true },
];
const SCHEDULE_COLUMNS_STORAGE_KEY = 'comptabilite:loan:schedule-columns:v1';
const SCHEDULE_WIDTHS_STORAGE_KEY = 'comptabilite:loan:schedule-widths:v1';
const DEFAULT_SCHEDULE_VISIBLE_COLUMNS = SCHEDULE_COLUMNS.reduce((columns, column) => ({
  ...columns,
  [column.key]: true,
}), {});
const DEFAULT_SCHEDULE_COLUMN_WIDTHS = SCHEDULE_COLUMNS.reduce((columns, column) => ({
  ...columns,
  [column.key]: column.width,
}), {});
const LOAN_STATES = {
  draft: 'Brouillon',
  in_progress: 'En cours',
  closed: 'Clôturé',
  cancelled: 'Annulé',
};
const normalizeLoanState = (state) => ({
  posted: 'in_progress',
  confirmed: 'in_progress',
  validated: 'in_progress',
}[state] || state || 'draft');
const PERIOD_MONTHS = {
  monthly: 1,
  bimonthly: 2,
  quarterly: 3,
  semiannual: 6,
  annual: 12,
};

let optionCache = null;
let optionPromise = null;
let accountOptionCache = null;
let accountOptionPromise = null;

const today = () => new Date().toISOString().slice(0, 10);
const tempId = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
const relationId = (value) => {
  if (value === null || value === undefined || value === '') return '';
  if (typeof value === 'object') return value.id ?? value.value ?? '';
  return value;
};
const persisted = (row) => row?.id && !String(row.id).startsWith('tmp-');
const draftScheduleKey = (loanId) => `${DRAFT_SCHEDULE_STORAGE_PREFIX}${loanId}`;
const readDraftSchedule = (loanId) => {
  if (!loanId || typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(draftScheduleKey(loanId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};
const writeDraftSchedule = (loanId, state) => {
  if (!loanId || typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(draftScheduleKey(loanId), JSON.stringify(state));
  } catch {}
};
const clearDraftSchedule = (loanId) => {
  if (!loanId || typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(draftScheduleKey(loanId));
  } catch {}
};
const numberValue = (value) => Number(value || 0);
const roundMoney = (value) => Math.round((numberValue(value) + Number.EPSILON) * 100) / 100;
const formatDate = (value) => {
  if (!value) return '-';
  const parsed = new Date(`${String(value).slice(0, 10)}T12:00:00`);
  return Number.isNaN(parsed.getTime()) ? String(value) : parsed.toLocaleDateString('fr-FR');
};
const debugLoan = (message, details) => {
  if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'production') return;
  if (details === undefined) console.log(`[Emprunts] ${message}`);
  else console.log(`[Emprunts] ${message}`, details);
};
const normalizeLookupText = (value) => String(value ?? '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .trim()
  .toLowerCase();
const getJournalTypeText = (journal = {}) => {
  const rawType = journal._loan_type ?? journal.type ?? journal.journal_type ?? journal.type_id;
  return normalizeLookupText([
    journal.type_code,
    journal.type_name,
    journal.journal_type_code,
    journal.journal_type_name,
    typeof rawType === 'object' ? rawType.code : rawType,
    typeof rawType === 'object' ? (rawType.name || rawType.label || rawType.libelle) : '',
  ].filter(Boolean).join(' '));
};
const getLoanJournalKind = (journal) => {
  const typeText = getJournalTypeText(journal);
  const tokens = typeText.split(/[^a-z0-9]+/).filter(Boolean);
  if (
    tokens.some((token) => ['ban', 'bank', 'bnk', 'bq', 'bn'].includes(token))
    || typeText.includes('banque')
  ) return 'bank';
  if (
    tokens.some((token) => ['od', 'opd', 'div', 'misc', 'general'].includes(token))
    || typeText.includes('operation diverse')
    || typeText.includes('operations diverses')
  ) return 'misc';
  return '';
};
const getPartnerBankLabel = (bankAccount = {}) => {
  const bank = bankAccount.banque || bankAccount.bank || {};
  const bankName = bankAccount.banque_nom
    || bankAccount.bank_name
    || bank.nom
    || bank.name
    || bankAccount.nom_banque
    || bankAccount.name
    || 'Banque';
  const accountNumber = bankAccount.numero_compte || bankAccount.account_number || bankAccount.number || '';

  return accountNumber ? `${bankName} - ${accountNumber}` : bankName;
};
const hasAccountMapValue = (map = {}) => Boolean(
  relationId(map.account_id ?? map.account)
  || relationId(map.account_debit_id ?? map.account_debit ?? map.debit)
  || relationId(map.account_credit_id ?? map.account_credit ?? map.credit)
);
const LOAN_FIELD_LABELS = {
  account_id: 'Compte',
  account_debit_id: 'Compte',
  account_credit_id: 'Compte de contrepartie du journal',
  partner_id: 'Prêteur',
  company_id: 'Société',
  currency_id: 'Devise',
  journal_id: 'Journal',
  loan_amount: 'Montant emprunté',
  rate: "Taux d'intérêt annuel",
  periodicity: 'Périodicité',
  start_date: "Date de l'emprunt",
  maturity_date: "Date d'échéance",
};
const flattenApiErrors = (value, prefix = '') => {
  if (!value) return [];
  if (typeof value === 'string') return [prefix ? `${prefix} : ${value}` : value];
  if (Array.isArray(value)) return value.flatMap((item) => flattenApiErrors(item, prefix));
  if (typeof value !== 'object') return [String(value)];
  return Object.entries(value).flatMap(([field, messages]) => {
    const label = LOAN_FIELD_LABELS[field]
      || (field === 'confirmation' || field === 'detail' || field === 'state' ? '' : field);
    return flattenApiErrors(messages, label);
  });
};
const getLoanErrorMessage = (error, fallback) => {
  const data = error?.response?.data;
  if (!data || typeof data !== 'object') return getActionErrorMessage(error, fallback);

  const messages = [];
  const visit = (value, path = '') => {
    if (Array.isArray(value)) {
      value.forEach((item) => visit(item, path));
      return;
    }
    if (value && typeof value === 'object') {
      Object.entries(value).forEach(([field, detail]) => {
        const label = LOAN_FIELD_LABELS[field] || (field === 'non_field_errors' ? '' : field);
        visit(detail, label || path);
      });
      return;
    }
    if (value !== undefined && value !== null) {
      messages.push(path ? `${path} : ${String(value)}` : String(value));
    }
  };

  visit(data);
  return messages.length ? messages.join('\n') : getActionErrorMessage(error, fallback);
};
const addMonths = (dateValue, months) => {
  if (!dateValue) return '';
  const source = new Date(`${dateValue}T12:00:00`);
  if (Number.isNaN(source.getTime())) return '';
  const originalDay = source.getDate();
  source.setDate(1);
  source.setMonth(source.getMonth() + months);
  const lastDay = new Date(source.getFullYear(), source.getMonth() + 1, 0).getDate();
  source.setDate(Math.min(originalDay, lastDay));
  return source.toISOString().slice(0, 10);
};
const getMaturityDate = (startDate, periods, periodicity, paymentOnFirstPeriod) => {
  const periodCount = Math.max(0, Number.parseInt(periods || 0, 10));
  if (!startDate || periodCount === 0) return '';
  const intervalCount = Math.max(periodCount - (paymentOnFirstPeriod ? 1 : 0), 0);
  return addMonths(startDate, intervalCount * (PERIOD_MONTHS[periodicity] || 1));
};
const monthDifference = (start, end) => {
  if (!start || !end) return 0;
  const startDate = new Date(`${start}T12:00:00`);
  const endDate = new Date(`${end}T12:00:00`);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || endDate < startDate) return 0;
  let months = (endDate.getFullYear() - startDate.getFullYear()) * 12 + endDate.getMonth() - startDate.getMonth();
  if (endDate.getDate() > startDate.getDate()) months += 1;
  return Math.max(months, 0);
};

const emptyLoan = () => ({
  name: '',
  partner_id: '',
  currency_id: '',
  journal_id: '',
  state: 'draft',
  loan_amount: '',
  declared_total_interest: '',
  duration_periods: '',
  rate: '',
  periodicity: 'monthly',
  start_date: today(),
  maturity_date: '',
  payment_amount: '',
  payment_on_first_period: false,
  deferred_periods: 0,
  taxe_fees_component: 0,
  others_fees_component: 0,
});

const normalizeLoan = (loan = {}) => {
  const periodicity = loan.periodicity || loan.payment_freq || 'monthly';
  const storedPeriods = Number.parseInt(
    loan.duration_periods ?? loan.installment_num ?? '',
    10,
  );
  const storedMonths = Number.parseInt(loan.duration ?? '', 10);
  const monthsPerPeriod = PERIOD_MONTHS[periodicity] || 1;
  const durationPeriods = Number.isFinite(storedPeriods) && storedPeriods > 0
    ? storedPeriods
    : Number.isFinite(storedMonths) && storedMonths > 0
      ? Math.max(1, Math.ceil(storedMonths / monthsPerPeriod))
      : '';

  return {
    ...emptyLoan(),
    ...loan,
    // La valeur déclarée appartient à l'utilisateur. Le total_interest renvoyé
    // par l'API reste un calcul du tableau et ne doit jamais remplir ce champ.
    declared_total_interest: loan.declared_total_interest ?? '',
    duration_periods: durationPeriods,
    periodicity,
    partner_id: relationId(loan.partner_id ?? loan.partner),
    currency_id: relationId(loan.currency_id ?? loan.currency),
    journal_id: relationId(loan.journal_id ?? loan.journal),
    state: normalizeLoanState(loan.state),
  };
};

const emptyLine = (sequence = 1) => ({
  id: tempId('tmp-line'),
  sequence,
  due_date: '',
  principal_component: '',
  interest_component: '',
  taxe_fees_component: 0,
  others_fees_component: 0,
  total_payment: '',
  remaining_balance: '',
  state: 'upcoming',
  accounting_move: null,
});

// Le backend a connu deux noms pour certains composants de l'échéancier.
// L'interface conserve un seul format afin que les lignes restent visibles
// après un rechargement, quelle que soit la version du serializer utilisée.
const normalizeLoanLine = (raw = {}, index = 0) => {
  const source = raw || {};
  const principal = source.principal_component ?? source.principal_amount ?? '';
  const totalPayment = source.total_payment ?? source.payment_amount ?? '';
  const storedInterest = source.interest_component ?? source.interest_amount;
  // Le modele historique ne stocke que le capital et l'annuite. Lorsque le
  // detail de l'interet est absent, il est reconstitue a partir de ces valeurs.
  const interest = storedInterest ?? (
    principal !== '' && totalPayment !== ''
      ? Math.max(numberValue(totalPayment) - numberValue(principal), 0)
      : ''
  );
  return {
    ...emptyLine(Number(source.sequence || index + 1)),
    ...source,
    id: source.id || tempId('tmp-line'),
    sequence: Number(source.sequence || index + 1),
    principal_component: principal,
    interest_component: interest,
    taxe_fees_component: source.taxe_fees_component ?? source.tax_amount ?? source.taxe_amount ?? 0,
    others_fees_component: source.others_fees_component ?? source.other_fees_amount ?? 0,
    total_payment: totalPayment,
    remaining_balance: source.remaining_balance ?? source.remaining_principal ?? '',
    accounting_move: relationId(source.accounting_move ?? source.move) || null,
    state: source.state || 'upcoming',
  };
};

// Une echeance est identifiee fonctionnellement par son numero dans un emprunt.
// Les anciennes donnees peuvent contenir plusieurs lignes pour le meme numero :
// on conserve alors la derniere version enregistree.
const dedupeLoanLines = (rawLines = []) => {
  const bySequence = new Map();
  rawLines.forEach((raw, index) => {
    const line = normalizeLoanLine(raw, index);
    const key = String(line.sequence || index + 1);
    const current = bySequence.get(key);
    const shouldReplace = !current
      || (persisted(line) && (!persisted(current) || Number(line.id) > Number(current.id)));
    if (shouldReplace) bySequence.set(key, line);
  });
  return [...bySequence.values()].sort((first, second) => (
    Number(first.sequence || 0) - Number(second.sequence || 0)
  ));
};

const hasScheduleInput = (line = {}) => Boolean(
  line.due_date
  || numberValue(line.principal_component) !== 0
  || numberValue(line.interest_component) !== 0
  || numberValue(line.taxe_fees_component) !== 0
  || numberValue(line.others_fees_component) !== 0
  || numberValue(line.total_payment) !== 0
);

const hasScheduleValue = (line = {}) => Boolean(
  line.due_date
  && (
    numberValue(line.principal_component) !== 0
    || numberValue(line.interest_component) !== 0
    || numberValue(line.taxe_fees_component) !== 0
    || numberValue(line.others_fees_component) !== 0
    || numberValue(line.total_payment) !== 0
  )
);

const getAutomaticLineState = (line = {}) => {
  if (line.state === 'cancelled') return 'cancelled';
  if (line.state === 'paid') return 'paid';
  if (line.state === 'partial') return 'partial';
  if (relationId(line.accounting_move ?? line.move)) return 'due';
  if (!line.due_date) return 'upcoming';
  return line.due_date <= today() ? 'due' : 'upcoming';
};

const userLabel = (value) => {
  if (!value) return '';
  if (typeof value === 'object') {
    const fullName = value.full_name
      || value.name
      || [value.first_name || value.firstName, value.last_name || value.lastName]
        .filter(Boolean)
        .join(' ')
      || value.username
      || value.email;
    return fullName || '';
  }
  return /^\d+$/.test(String(value).trim()) ? '' : String(value);
};

const emptyMap = (startDate = today()) => ({
  id: tempId('tmp-map'),
  component_type: 'capital',
  account_type: 'capital',
  account_id: '',
  backend_map_id: null,
  start_date: startDate || today(),
});

const backendComponentType = (accountType) => (
  accountType === 'accrued_interest' ? 'interest' : accountType
);

// Le modèle historique stocke une paire débit/crédit. L'interface ne montre
// que le compte du composant et conserve la contrepartie du journal en interne.
const normalizeAccountingMaps = (maps = [], fallbackDate = today()) => {
  const groups = new Map();

  maps.forEach((map, index) => {
    const accountType = map.account_type || (
      map.component_type === 'interest'
      && relationId(map.interest_payable_account_id ?? map.interest_payable_account)
        ? 'accrued_interest'
        : map.component_type
    ) || 'capital';
    const legacyAccountId = relationId(map.account_id ?? map.account);
    const backendMapId = map.backend_map_id
      || (map.id && !String(map.id).startsWith('tmp-') ? map.id : null);
    const startDate = map.start_date || fallbackDate || today();
    const key = backendMapId
      ? `backend-${backendMapId}`
      : `${accountType}-${startDate}`;
    const current = groups.get(key) || {
      id: backendMapId ? `map-${backendMapId}` : (map.id || tempId(`tmp-map-${index}`)),
      account_type: accountType,
      component_type: backendComponentType(accountType),
      account_id: '',
      account_debit_id: '',
      account_credit_id: '',
      backend_map_id: backendMapId && !String(backendMapId).startsWith('tmp-') ? backendMapId : null,
      start_date: startDate,
    };

    current.account_debit_id = relationId(
      map.account_debit_id ?? map.account_debit ?? map.debit,
    ) || current.account_debit_id;
    current.account_credit_id = relationId(
      map.account_credit_id ?? map.account_credit ?? map.credit,
    ) || current.account_credit_id;
    current.account_id = relationId(
      map.account_id ?? map.account ?? map.account_debit_id ?? map.account_debit ?? map.debit,
    ) || current.account_id;

    if (legacyAccountId) {
      if (map.entry_side === 'credit') current.account_credit_id = legacyAccountId;
      else {
        current.account_debit_id = legacyAccountId;
        current.account_id = legacyAccountId;
      }
    }
    if (!current.account_id) current.account_id = current.account_debit_id;
    groups.set(key, current);
  });

  return [...groups.values()];
};

const groupAccountingMaps = (maps = []) => normalizeAccountingMaps(maps)
  .filter(hasAccountMapValue)
  .map((map) => ({
    account_type: map.account_type,
    component_type: backendComponentType(map.account_type),
    account: relationId(map.account_id ?? map.account_debit_id),
    backend_map_id: map.backend_map_id || null,
    start_date: map.start_date || today(),
  }));

const inputClass = 'h-[26px] w-full border border-gray-300 bg-white px-2 text-xs outline-none transition-colors hover:border-purple-400 focus:border-purple-600 disabled:bg-gray-100 disabled:text-gray-500';
const cellInputClass = 'h-[26px] w-full border-0 bg-transparent px-2 py-1 text-xs outline-none focus:bg-purple-50 disabled:text-gray-500';
const Field = ({ label, children, required = false }) => (
  <div className="flex h-[26px] items-center">
    <label className="min-w-[140px] text-xs font-medium text-gray-700">
      {label}
      {required && <span className="ml-1 text-red-500">*</span>}
    </label>
    <div className="ml-2 flex-1">{children}</div>
  </div>
);

const formatAmountInput = (value) => {
  if (value === '' || value === null || value === undefined) return '';
  const amount = numberValue(value);
  if (!Number.isFinite(amount)) return '';
  return amount.toLocaleString('fr-FR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
};

const AmountInput = ({ value, onChange, disabled = false, className = inputClass, placeholder = '0', onKeyDown }) => {
  const [displayValue, setDisplayValue] = useState(() => formatAmountInput(value));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setDisplayValue(formatAmountInput(value));
  }, [focused, value]);

  const handleChange = (event) => {
    const typedValue = event.target.value;
    const rawValue = typedValue
      .replace(/[\s\u00A0]/g, '')
      .replace(/[^0-9,.-]/g, '')
      .replace(',', '.');

    if (rawValue === '' || rawValue === '-' || rawValue === '.') {
      setDisplayValue(typedValue);
      onChange('');
      return;
    }

    const amount = Number(rawValue);
    if (Number.isNaN(amount)) return;
    setDisplayValue(typedValue);
    onChange(amount);
  };

  return (
    <input
      type="text"
      inputMode="decimal"
      value={displayValue}
      onChange={handleChange}
      onFocus={() => {
        setFocused(true);
        const numericValue = Number(value);
        setDisplayValue(
          value === ''
          || value === null
          || value === undefined
          || (Number.isFinite(numericValue) && numericValue === 0)
            ? ''
            : String(value).replace('.', ','),
        );
      }}
      onBlur={(event) => {
        const rawValue = event.target.value
          .replace(/[\s\u00A0]/g, '')
          .replace(',', '.');
        setFocused(false);
        if (rawValue === '' || rawValue === '-' || rawValue === '.') {
          setDisplayValue('');
          return;
        }
        const amount = Number(rawValue);
        setDisplayValue(Number.isFinite(amount) ? formatAmountInput(amount) : formatAmountInput(value));
      }}
      onKeyDown={onKeyDown}
      disabled={disabled}
      className={className}
      placeholder={placeholder}
    />
  );
};

const loadOptions = async (entityId) => {
  const cacheKey = String(entityId || '');
  if (optionCache?.entityId === cacheKey) return optionCache.data;
  if (optionPromise?.entityId === cacheKey) return optionPromise.promise;
  const promise = Promise.all([
    axiosInstance.get(API.partners, { params: { page_size: 1000 } }),
    axiosInstance.get(API.partnerBanks, { params: { page_size: 1000 } }).catch(() => ({ data: [] })),
    axiosInstance.get(API.currencies, { params: { page_size: 300 } }),
    axiosInstance.get(API.journals, { params: { company: entityId || undefined, company_id: entityId || undefined, page_size: 1000 } }),
    axiosInstance.get(API.journalTypes, { params: { page_size: 200 } }).catch(() => ({ data: [] })),
  ]).then(([partners, partnerBanks, currencies, journals, journalTypes]) => {
    const journalTypeList = normalizeApiList(journalTypes.data);
    const journalTypeById = new Map(journalTypeList.map((type) => [String(type.id), type]));
    const data = {
      partners: normalizeApiList(partners.data),
      partnerBanks: normalizeApiList(partnerBanks.data),
      currencies: normalizeApiList(currencies.data),
      journals: normalizeApiList(journals.data).map((journal) => ({
        ...journal,
        _loan_type: typeof journal.type === 'object'
          ? journal.type
          : journalTypeById.get(String(relationId(journal.type_id ?? journal.type))) || null,
      })),
      journalTypes: journalTypeList,
      accounts: accountOptionCache?.entityId === cacheKey ? accountOptionCache.data : [],
    };
    optionCache = { entityId: cacheKey, data };
    return data;
  }).finally(() => {
    if (optionPromise?.entityId === cacheKey) optionPromise = null;
  });
  optionPromise = { entityId: cacheKey, promise };
  return promise;
};

const loadAccountOptions = async (entityId) => {
  const cacheKey = String(entityId || '');
  if (accountOptionCache?.entityId === cacheKey) return accountOptionCache.data;
  if (accountOptionPromise?.entityId === cacheKey) return accountOptionPromise.promise;

  const promise = axiosInstance.get(API.accounts, {
    params: {
      company: entityId || undefined,
      company_id: entityId || undefined,
      exclude_roots: true,
      page_size: 5000,
    },
  }).then((response) => {
    const accounts = normalizeApiList(response.data);
    accountOptionCache = { entityId: cacheKey, data: accounts };
    if (optionCache?.entityId === cacheKey) {
      optionCache = {
        ...optionCache,
        data: { ...optionCache.data, accounts },
      };
    }
    return accounts;
  }).finally(() => {
    if (accountOptionPromise?.entityId === cacheKey) accountOptionPromise = null;
  });
  accountOptionPromise = { entityId: cacheKey, promise };
  return promise;
};

function ActionsMenu({ state, disabled, canDuplicate, canResetToDraft, onAction, onDelete, onDuplicate, onList, onPrint, traceabilityOpen, onToggleTraceability }) {
  const rootRef = useRef(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const close = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const execute = (callback) => {
    setOpen(false);
    callback?.();
  };

  return (
    <div ref={rootRef} className="relative">
      <button type="button" onClick={() => setOpen((value) => !value)} className="flex h-8 items-center gap-1 border border-gray-300 px-3 text-xs text-gray-700 transition-all hover:border-purple-500 hover:bg-purple-50 hover:text-purple-700">
        <FiSettings size={13} /> Actions
      </button>
      {open && (
        <div className="absolute right-0 top-full z-[120] mt-1 w-52 border border-gray-300 bg-white py-1 shadow-lg">
          <button type="button" onClick={() => execute(onList)} className="w-full px-3 py-2 text-left text-xs hover:bg-purple-50 hover:text-purple-700">Liste des emprunts</button>
          <button type="button" disabled={!canDuplicate || disabled} onClick={() => execute(onDuplicate)} className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-purple-50 hover:text-purple-700 disabled:cursor-not-allowed disabled:text-gray-400 disabled:opacity-50"><FiCopy size={13} /> Dupliquer</button>
          <button type="button" onClick={() => execute(onPrint)} className="flex w-full items-center gap-2 border-b border-gray-100 px-3 py-2 text-left text-xs hover:bg-purple-50 hover:text-purple-700"><FiPrinter size={13} /> Imprimer</button>
          <button type="button" onClick={() => execute(onToggleTraceability)} className="flex w-full items-center gap-2 border-b border-gray-100 px-3 py-2 text-left text-xs hover:bg-purple-50 hover:text-purple-700">
            {traceabilityOpen ? <FiEyeOff size={13} /> : <FiEye size={13} />}
            {traceabilityOpen ? 'Fermer la traçabilité' : 'Ouvrir la traçabilité'}
          </button>
          <button type="button" disabled={disabled || state !== 'draft'} onClick={() => execute(() => onAction('in_progress'))} className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-green-700 hover:bg-green-50 disabled:cursor-not-allowed disabled:text-gray-400 disabled:opacity-50"><FiCheck size={13} /> Confirmer</button>
          <button type="button" disabled={disabled || state !== 'in_progress'} onClick={() => execute(() => onAction('closed'))} className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-purple-50 hover:text-purple-700 disabled:cursor-not-allowed disabled:text-gray-400 disabled:opacity-50"><FiCheck size={13} /> Clôturer</button>
          <button type="button" disabled={disabled || !canResetToDraft || !['in_progress', 'cancelled'].includes(state)} onClick={() => execute(() => onAction('draft'))} className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-purple-50 hover:text-purple-700 disabled:cursor-not-allowed disabled:text-gray-400 disabled:opacity-50"><FiRefreshCw size={13} /> Remettre en brouillon</button>
          <button type="button" disabled={disabled || !['draft', 'in_progress'].includes(state)} onClick={() => execute(() => onAction('cancelled'))} className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:text-gray-400 disabled:opacity-50"><FiX size={13} /> Annuler</button>
          <button type="button" disabled={disabled || state !== 'draft'} onClick={() => execute(onDelete)} className="flex w-full items-center gap-2 border-t border-gray-100 px-3 py-2 text-left text-xs text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:text-gray-400 disabled:opacity-50"><FiTrash2 size={13} /> Supprimer</button>
        </div>
      )}
    </div>
  );
}

const StateProcess = ({ state }) => (
  <div className="flex items-center justify-end gap-2">
    {Object.entries(LOAN_STATES).filter(([value]) => value !== 'cancelled').map(([value, label]) => (
      <div key={value} className={`flex h-8 items-center border px-3 text-xs font-medium ${state === value ? (value === 'in_progress' ? 'border-green-300 bg-green-100 text-green-700' : value === 'closed' ? 'border-blue-300 bg-blue-100 text-blue-700' : value === 'cancelled' ? 'border-red-300 bg-red-100 text-red-700' : 'border-amber-300 bg-amber-100 text-amber-700') : 'border-gray-300 bg-gray-100 text-gray-500'}`}>
        {label}
      </div>
    ))}
  </div>
);

export default function LoanForm({ mode = 'create' }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const entityId = getActiveEntityId();
  const isShowMode = mode === 'show' || mode === 'detail';
  const cachedRecord = isShowMode ? location.state?.loanRecord : null;
  const duplicated = !isShowMode ? location.state?.duplicateLoan : null;
  const duplicatedLines = !isShowMode && Array.isArray(location.state?.duplicateLines)
    ? location.state.duplicateLines
    : [];
  const duplicatedAccountMaps = !isShowMode && Array.isArray(location.state?.duplicateAccountMaps)
    ? location.state.duplicateAccountMaps
    : [];

  const [formData, setFormData] = useState(() => normalizeLoan(cachedRecord || duplicated || {}));
  const [record, setRecord] = useState(cachedRecord || null);
  const [options, setOptions] = useState(() => optionCache?.data || { partners: [], partnerBanks: [], currencies: [], journals: [], journalTypes: [], accounts: [] });
  const [lines, setLines] = useState(() => (
    duplicatedLines.length
      ? duplicatedLines.map((line, index) => ({
        ...normalizeLoanLine(line, index),
        id: tempId('tmp-line'),
        state: 'upcoming',
        accounting_move: null,
        move: null,
      }))
      : [emptyLine()]
  ));
  const [accruals, setAccruals] = useState([]);
  // Une ligne de paramétrage apparaît dès la création du prêt. Elle reste vide
  // tant que l'utilisateur n'a pas défini les comptes du composant Capital.
  const [accountMaps, setAccountMaps] = useState(() => (
    duplicatedAccountMaps.length
      ? normalizeAccountingMaps(duplicatedAccountMaps, formData.start_date).map((map) => ({
        ...map,
        id: tempId('tmp-map'),
        backend_map_id: null,
      }))
      : [emptyMap(formData.start_date)]
  ));
  const [deletedRows, setDeletedRows] = useState({ lines: [], accruals: [], maps: [] });
  const [activeTab, setActiveTab] = useState('schedule');
  const [traceabilityOpen, setTraceabilityOpen] = useState(true);
  const [loading, setLoading] = useState(isShowMode && !cachedRecord);
  const [accountsLoading, setAccountsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(Boolean(duplicated));
  const [feedback, setFeedback] = useState(null);
  const [validationErrors, setValidationErrors] = useState([]);
  const [traceabilityEvents, setTraceabilityEvents] = useState([]);
  const [pendingAction, setPendingAction] = useState(null);
  const [existingMoves, setExistingMoves] = useState([]);
  const [existingMovesLoading, setExistingMovesLoading] = useState(false);
  const [existingMovesLoaded, setExistingMovesLoaded] = useState(false);
  const [showScheduleColumnsMenu, setShowScheduleColumnsMenu] = useState(false);
  const [scheduleColumnsMenuStyle, setScheduleColumnsMenuStyle] = useState({});
  const [scheduleVisibleColumns, setScheduleVisibleColumns] = useState(() => {
    try {
      return { ...DEFAULT_SCHEDULE_VISIBLE_COLUMNS, ...JSON.parse(localStorage.getItem(SCHEDULE_COLUMNS_STORAGE_KEY) || '{}') };
    } catch {
      return DEFAULT_SCHEDULE_VISIBLE_COLUMNS;
    }
  });
  const [scheduleColumnWidths, setScheduleColumnWidths] = useState(() => {
    try {
      return { ...DEFAULT_SCHEDULE_COLUMN_WIDTHS, ...JSON.parse(localStorage.getItem(SCHEDULE_WIDTHS_STORAGE_KEY) || '{}') };
    } catch {
      return DEFAULT_SCHEDULE_COLUMN_WIDTHS;
    }
  });
  const scheduleFirstInputRefs = useRef(new Map());
  const pendingScheduleFocusRef = useRef(null);
  const scheduleManuallyEditedRef = useRef(false);
  const scheduleColumnsHeaderRef = useRef(null);
  const scheduleColumnsButtonRef = useRef(null);
  const scheduleColumnsPopupRef = useRef(null);
  const scheduleColumnResizeRef = useRef(null);
  const saveInFlightRef = useRef(false);
  const createdLoanIdRef = useRef(null);
  const accountsRequestAttemptedRef = useRef(false);

  const editable = !isShowMode || (formData.state || 'draft') === 'draft';
  const visibleScheduleColumns = useMemo(
    () => SCHEDULE_COLUMNS.filter((column) => column.required || scheduleVisibleColumns[column.key] !== false),
    [scheduleVisibleColumns],
  );
  const lastEditableScheduleColumnKey = useMemo(() => (
    [...visibleScheduleColumns]
      .reverse()
      .find((column) => ['due_date', 'principal_component', 'interest_component', 'taxe_fees_component', 'others_fees_component'].includes(column.key))
      ?.key || 'due_date'
  ), [visibleScheduleColumns]);
  const durationPeriods = formData.duration_periods ?? '';
  const deferredUntilDate = useMemo(() => {
    const deferredPeriods = Math.max(0, Number.parseInt(formData.deferred_periods || 0, 10));
    if (!formData.start_date || deferredPeriods === 0) return '';
    return addMonths(
      formData.start_date,
      deferredPeriods * (PERIOD_MONTHS[formData.periodicity] || 1),
    );
  }, [formData.deferred_periods, formData.periodicity, formData.start_date]);
  const loanJournals = useMemo(
    () => options.journals.filter((journal) => Boolean(getLoanJournalKind(journal))),
    [options.journals],
  );
  const selectedJournal = useMemo(
    () => options.journals.find((journal) => String(journal.id) === String(formData.journal_id)),
    [formData.journal_id, options.journals],
  );
  const journalCounterpartAccountId = useMemo(() => relationId(
    selectedJournal?.default_account_id
    ?? selectedJournal?.default_account
    ?? selectedJournal?.suspense_account_id
    ?? selectedJournal?.suspense_account,
  ), [selectedJournal]);
  const selectedJournalKind = useMemo(() => getLoanJournalKind(selectedJournal), [selectedJournal]);
  const bankLenderOptions = useMemo(() => {
    const mapped = (options.partnerBanks || []).flatMap((bankAccount) => {
      const partnerId = relationId(
        bankAccount.partner_id
        ?? bankAccount.partner
        ?? bankAccount.partenaire_id
        ?? bankAccount.partenaire,
      );

      if (!partnerId) return [];
      return [{
        ...bankAccount,
        id: partnerId,
        _partner_id: partnerId,
        _bank_account_id: bankAccount.id,
        _label: getPartnerBankLabel(bankAccount),
      }];
    });
    const selectedPartner = options.partners.find((partner) => String(partner.id) === String(formData.partner_id));
    if (selectedPartner && !mapped.some((bank) => String(bank.id) === String(selectedPartner.id))) {
      mapped.push({ ...selectedPartner, _label: selectedPartner.raison_sociale || selectedPartner.nom || selectedPartner.name });
    }
    return mapped.filter((bank, index, all) => all.findIndex((item) => String(item.id) === String(bank.id)) === index);
  }, [formData.partner_id, options.partnerBanks, options.partners]);
  const lenderOptions = selectedJournalKind === 'bank'
    ? bankLenderOptions
    : selectedJournalKind === 'misc'
      ? options.partners
      : [];
  const lenderPlaceholder = !selectedJournalKind
    ? "Choisir d'abord le journal"
    : selectedJournalKind === 'bank'
      ? (bankLenderOptions.length ? 'Sélectionner une banque' : 'Aucune banque liée à un partenaire')
      : 'Sélectionner un partenaire';
  const currencyCode = useMemo(() => {
    const currency = options.currencies.find((item) => String(item.id) === String(formData.currency_id));
    return currency?.code || formData.currency_code || 'XOF';
  }, [formData.currency_code, formData.currency_id, options.currencies]);
  const formatAmount = useCallback(
    (value) => `${numberValue(value).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} ${currencyCode}`,
    [currencyCode],
  );
  const getComponentOptionLabel = useCallback((option) => option.label, []);
  const getAccountOptionLabel = useCallback((account) => optionLabel(account), []);
  const computedSchedule = useMemo(() => {
    let remaining = numberValue(formData.loan_amount);
    return lines.map((line, sourceIndex) => {
      const openingBalance = roundMoney(remaining);
      const principal = roundMoney(numberValue(line.principal_component));
      const interest = roundMoney(numberValue(line.interest_component));
      const tax = roundMoney(numberValue(line.taxe_fees_component));
      const other = roundMoney(numberValue(line.others_fees_component));
      remaining = roundMoney(openingBalance - principal);
      return {
        ...line,
        _sourceIndex: sourceIndex,
        opening_balance: openingBalance,
        principal_component: principal,
        interest_component: interest,
        taxe_fees_component: tax,
        others_fees_component: other,
        total_payment: roundMoney(principal + interest + tax + other),
        remaining_balance: remaining,
      };
    });
  }, [formData.loan_amount, lines]);
  const financialSummary = useMemo(() => {
    const summary = computedSchedule.reduce((total, line) => ({
      principal: total.principal + numberValue(line.principal_component),
      interest: total.interest + numberValue(line.interest_component),
      tax: total.tax + numberValue(line.taxe_fees_component),
      otherFees: total.otherFees + numberValue(line.others_fees_component),
      payment: total.payment + numberValue(line.total_payment),
      paidPrincipal: total.paidPrincipal + (line.state === 'paid' ? numberValue(line.principal_component) : 0),
    }), {
      principal: 0,
      interest: 0,
      tax: 0,
      otherFees: 0,
      payment: 0,
      paidPrincipal: 0,
    });
    return {
      ...summary,
      outstanding: Math.max(numberValue(formData.loan_amount) - summary.paidPrincipal, 0),
    };
  }, [computedSchedule, formData.loan_amount]);
  const hasGeneratedAccountingEntries = useMemo(
    () => lines.some((line) => Boolean(relationId(line.accounting_move ?? line.move))),
    [lines],
  );
  const dueUnpostedLines = useMemo(() => computedSchedule.filter((line) => (
    hasScheduleValue(line)
    && line.due_date <= today()
    && line.state !== 'cancelled'
    && !relationId(line.accounting_move ?? line.move)
  )), [computedSchedule]);
  const dueUnpostedCount = dueUnpostedLines.length;

  useEffect(() => {
    setExistingMoves([]);
    setExistingMovesLoaded(false);
  }, [id]);

  const loadAll = useCallback(async () => {
    setLoading(isShowMode && !cachedRecord);
    setFeedback(null);
    try {
      const requests = [loadOptions(entityId)];
      if (isShowMode) {
        requests.push(
          axiosInstance.get(`${API.loans}${id}/`),
          axiosInstance.get(API.lines, { params: { loan: id, page_size: 1000 } }),
          axiosInstance.get(API.accruals, { params: { loan: id, page_size: 1000 } }),
          axiosInstance.get(API.maps, { params: { loan: id, page_size: 1000 } }),
          axiosInstance.get(API.traceability, {
            params: {
              company: entityId,
              model_name: 'AccountLoan',
              object_id: id,
              page_size: 100,
            },
          }).catch(() => ({ data: [] })),
        );
      }
      const results = await Promise.all(requests);
      const loadedOptions = results[0];
      setOptions(loadedOptions);
      if (isShowMode) {
        const loan = results[1].data || {};
        const loadedLines = dedupeLoanLines(normalizeApiList(results[2].data));
        const cachedDraft = readDraftSchedule(id);
        const navigationDraft = location.state?.draftSchedule
          ? {
            lines: Array.isArray(location.state.draftLines) ? location.state.draftLines : [],
            accruals: Array.isArray(location.state.draftAccruals) ? location.state.draftAccruals : [],
            accountMaps: Array.isArray(location.state.draftAccountMaps) ? location.state.draftAccountMaps : [],
            incomplete: Boolean(location.state.draftScheduleIncomplete),
          }
          : null;
        const draftState = cachedDraft || navigationDraft;
        const draftLines = Array.isArray(draftState?.lines)
          ? dedupeLoanLines(draftState.lines)
          : [];
        // Une saisie de brouillon peut contenir des lignes incomplètes que le
        // modèle AccountLoanLine refuse encore. Dans ce cas, le brouillon de
        // l'échéancier est prioritaire sur la réponse partielle de l'API.
        const persistedLinesBySequence = new Map(
          loadedLines.map((line) => [String(line.sequence), line]),
        );
        const visibleLines = draftLines.length
          ? draftLines.map((line) => {
            const persistedLine = persistedLinesBySequence.get(String(line.sequence));
            return persistedLine && !persisted(line)
              ? { ...line, id: persistedLine.id }
              : line;
          })
          : (loadedLines.length ? loadedLines : [emptyLine()]);
        const normalizedLoan = {
          ...normalizeLoan(loan),
          taxe_fees_component: numberValue(visibleLines[0]?.taxe_fees_component),
          others_fees_component: numberValue(visibleLines[0]?.others_fees_component),
        };
        setRecord(loan);
        setFormData(normalizedLoan);
        setLines(visibleLines);
        scheduleManuallyEditedRef.current = visibleLines.some(hasScheduleValue);
        const loadedAccruals = normalizeApiList(results[3].data);
        setAccruals(loadedAccruals.length ? loadedAccruals : (draftState?.accruals || []));
        const loadedMaps = normalizeAccountingMaps(
          normalizeApiList(results[4].data),
          normalizedLoan.start_date,
        );
        const draftMaps = normalizeAccountingMaps(
          draftState?.accountMaps || [],
          normalizedLoan.start_date,
        );
        setAccountMaps(loadedMaps.length ? loadedMaps : (draftMaps.length ? draftMaps : [emptyMap(normalizedLoan.start_date)]));
        setTraceabilityEvents(
          normalizeApiList(results[5]?.data).filter((event) => (
            String(event.object_id ?? '') === String(id)
            && String(event.model_name || '').toLowerCase() === 'accountloan'
          )),
        );
        const draftIsIncomplete = draftState?.incomplete
          ?? draftLines.some((line) => hasScheduleInput(line) && !hasScheduleValue(line));
        setHasChanges(Boolean(draftIsIncomplete));
        debugLoan('Échéancier chargé', {
          loanId: id,
          apiLines: loadedLines.length,
          draftLines: draftLines.length,
          visibleLines: visibleLines.length,
          source: draftLines.length ? 'local/navigation' : 'api',
          incomplete: Boolean(draftIsIncomplete),
        });
        if (loadedLines.length && !draftLines.length) clearDraftSchedule(id);
      } else {
        const defaultCurrency = loadedOptions.currencies.find((currency) => currency.code === 'XOF') || loadedOptions.currencies[0];
        if (defaultCurrency) setFormData((previous) => ({ ...previous, currency_id: previous.currency_id || defaultCurrency.id }));
      }
    } catch (requestError) {
      setFeedback({ type: 'error', message: getActionErrorMessage(requestError, "Impossible de charger l'emprunt.") });
    } finally {
      setLoading(false);
    }
  }, [cachedRecord, entityId, id, isShowMode, location.state]);

  useEffect(() => { loadAll(); }, [loadAll]);

  useEffect(() => {
    if (
      activeTab !== 'loan_settings'
      || options.accounts.length
      || accountsLoading
      || accountsRequestAttemptedRef.current
    ) return;
    let active = true;
    accountsRequestAttemptedRef.current = true;
    setAccountsLoading(true);
    loadAccountOptions(entityId)
      .then((accounts) => {
        if (!active) return;
        setOptions((current) => ({ ...current, accounts }));
      })
      .catch((requestError) => {
        if (!active) return;
        setFeedback({
          type: 'error',
          message: getActionErrorMessage(requestError, 'Impossible de charger les comptes comptables.'),
        });
      })
      .finally(() => {
        if (active) setAccountsLoading(false);
      });
    return () => { active = false; };
  }, [accountsLoading, activeTab, entityId, options.accounts.length]);

  useEffect(() => {
    const lineId = pendingScheduleFocusRef.current;
    if (!lineId) return;
    pendingScheduleFocusRef.current = null;
    window.requestAnimationFrame(() => scheduleFirstInputRefs.current.get(lineId)?.focus());
  }, [lines]);

  useEffect(() => {
    localStorage.setItem(SCHEDULE_COLUMNS_STORAGE_KEY, JSON.stringify(scheduleVisibleColumns));
  }, [scheduleVisibleColumns]);

  useEffect(() => {
    localStorage.setItem(SCHEDULE_WIDTHS_STORAGE_KEY, JSON.stringify(scheduleColumnWidths));
  }, [scheduleColumnWidths]);

  useEffect(() => {
    const closeMenu = (event) => {
      if (
        scheduleColumnsHeaderRef.current
        && !scheduleColumnsHeaderRef.current.contains(event.target)
        && scheduleColumnsPopupRef.current
        && !scheduleColumnsPopupRef.current.contains(event.target)
      ) {
        setShowScheduleColumnsMenu(false);
      }
    };
    document.addEventListener('mousedown', closeMenu);
    return () => document.removeEventListener('mousedown', closeMenu);
  }, []);

  useEffect(() => () => {
    const resize = scheduleColumnResizeRef.current;
    if (!resize) return;
    document.removeEventListener('mousemove', resize.onMouseMove);
    document.removeEventListener('mouseup', resize.onMouseUp);
  }, []);

  const toggleScheduleColumn = (columnKey) => {
    setScheduleVisibleColumns((current) => ({ ...current, [columnKey]: !current[columnKey] }));
  };

  const toggleScheduleColumnsMenu = useCallback(() => {
    const anchor = scheduleColumnsButtonRef.current || scheduleColumnsHeaderRef.current;
    if (anchor) {
      const rect = anchor.getBoundingClientRect();
      const menuWidth = 224;
      const viewportPadding = 8;
      const left = Math.min(
        Math.max(viewportPadding, rect.right - menuWidth),
        window.innerWidth - menuWidth - viewportPadding,
      );
      setScheduleColumnsMenuStyle({
        position: 'fixed',
        top: `${rect.bottom}px`,
        left: `${left}px`,
        zIndex: 80,
      });
    }
    setShowScheduleColumnsMenu((current) => !current);
  }, []);

  const startScheduleColumnResize = (event, columnKey) => {
    event.preventDefault();
    event.stopPropagation();
    const startX = event.clientX;
    const startWidth = scheduleColumnWidths[columnKey] || DEFAULT_SCHEDULE_COLUMN_WIDTHS[columnKey] || 120;
    const minimumWidth = columnKey === 'actions' ? 40 : 90;
    const onMouseMove = (moveEvent) => {
      setScheduleColumnWidths((current) => ({
        ...current,
        [columnKey]: Math.max(minimumWidth, startWidth + moveEvent.clientX - startX),
      }));
    };
    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      scheduleColumnResizeRef.current = null;
    };
    scheduleColumnResizeRef.current = { onMouseMove, onMouseUp };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  const setField = (field, value) => {
    setFormData((previous) => ({ ...previous, [field]: value }));
    setHasChanges(true);
    setFeedback(null);
  };

  const handleJournalChange = (value) => {
    setFormData((previous) => ({
      ...previous,
      journal_id: value,
      partner_id: String(previous.journal_id || '') === String(value || '') ? previous.partner_id : '',
    }));
    setHasChanges(true);
    setFeedback(null);
  };

  const handleStartDateChange = (value) => {
    setFormData((previous) => ({
      ...previous,
      start_date: value,
      maturity_date: getMaturityDate(
        value,
        previous.duration_periods,
        previous.periodicity,
        previous.payment_on_first_period,
      ),
    }));
    setHasChanges(true);
    setFeedback(null);
  };

  const handleDurationChange = (value) => {
    const periodCount = Math.max(0, Number.parseInt(value || 0, 10));
    setFormData((previous) => ({
      ...previous,
      duration_periods: periodCount || '',
      maturity_date: getMaturityDate(
        previous.start_date,
        periodCount,
        previous.periodicity,
        previous.payment_on_first_period,
      ),
    }));
    setHasChanges(true);
    setFeedback(null);
  };

  const handlePeriodicityChange = (value) => {
    setFormData((previous) => ({
      ...previous,
      periodicity: value,
      maturity_date: getMaturityDate(
        previous.start_date,
        previous.duration_periods,
        value,
        previous.payment_on_first_period,
      ),
    }));
    setHasChanges(true);
    setFeedback(null);
  };

  const handleDeferredUntilChange = (value) => {
    const deferredMonths = value ? monthDifference(formData.start_date, value) : 0;
    const deferredPeriods = deferredMonths > 0
      ? Math.ceil(deferredMonths / (PERIOD_MONTHS[formData.periodicity] || 1))
      : 0;
    setField('deferred_periods', deferredPeriods);
  };

  const updateRow = (setter, index, field, value) => {
    if (setter === setLines) {
      debugLoan('Modification de ligne', { index, field, value });
    }
    setter((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, [field]: value } : row));
    if (setter === setLines) scheduleManuallyEditedRef.current = true;
    setHasChanges(true);
  };

  const handleLastScheduleFieldTab = (event, index) => {
    if (event.key !== 'Tab' || event.shiftKey || !editable || index !== lines.length - 1) return;
    event.preventDefault();
    event.stopPropagation();
    const newLine = emptyLine(lines.length + 1);
    pendingScheduleFocusRef.current = newLine.id;
    setLines((current) => [...current, newLine]);
    scheduleManuallyEditedRef.current = true;
    setHasChanges(true);
  };

  const updateMapType = (index, value) => {
    setAccountMaps((current) => current.map((row, rowIndex) => (
      rowIndex === index
        ? { ...row, account_type: value, component_type: backendComponentType(value) }
        : row
    )));
    setHasChanges(true);
  };

  const removeRow = (kind, rows, setter, index) => {
    const row = rows[index];
    const deletedId = kind === 'maps' ? row?.backend_map_id : row?.id;
    if (deletedId) {
      setDeletedRows((current) => ({
        ...current,
        [kind]: [...new Set([...current[kind], deletedId])],
      }));
    }
    setter((current) => {
      const remaining = current.filter((_, rowIndex) => rowIndex !== index);
      if (kind === 'lines') {
        if (!remaining.length) return [emptyLine()];
        return remaining.map((item, rowIndex) => ({
          ...item,
          sequence: rowIndex + 1,
        }));
      }
      if (kind === 'maps' && !remaining.length) return [emptyMap(formData.start_date)];
      return remaining;
    });
    if (kind === 'lines') scheduleManuallyEditedRef.current = true;
    setHasChanges(true);
  };

  const validate = ({ forConfirmation = false } = {}) => {
    const errors = [];
    if (!formData.name?.trim()) errors.push("Le nom ou numéro de l'emprunt est obligatoire.");
    if (!formData.partner_id) errors.push('Le prêteur est obligatoire.');
    if (!entityId) errors.push('La société active est obligatoire.');
    if (!formData.currency_id) errors.push('La devise est obligatoire.');
    if (!formData.journal_id) errors.push('Le journal est obligatoire.');
    if (numberValue(formData.loan_amount) <= 0) errors.push('Le montant emprunté doit être supérieur à zéro.');
    if (numberValue(formData.duration_periods) <= 0) errors.push('La durée de l’emprunt est obligatoire. Saisissez le nombre de périodes prévu.');
    if (!formData.start_date || !formData.maturity_date) errors.push('Les dates de début et d’échéance sont obligatoires.');
    if (formData.start_date && formData.maturity_date && formData.maturity_date < formData.start_date) errors.push("La date d'échéance doit être postérieure à la date de début.");
    if (!forConfirmation) return errors;

    const incompleteLines = lines
      .map((line, index) => ({ line, index }))
      .filter(({ line }) => hasScheduleInput(line) && !hasScheduleValue(line));
    incompleteLines.forEach(({ line, index }) => {
      if (!line.due_date) errors.push(`Échéance ${index + 1} : la date d'échéance est obligatoire.`);
      if (
        line.due_date
        && numberValue(line.principal_component) === 0
        && numberValue(line.interest_component) === 0
        && numberValue(line.taxe_fees_component) === 0
        && numberValue(line.others_fees_component) === 0
      ) {
        errors.push(`Échéance ${index + 1} : saisissez au moins un montant.`);
      }
    });

    const scheduleLines = computedSchedule.filter(hasScheduleValue);
    const hasScheduleLine = scheduleLines.length > 0;
    if (!hasScheduleLine) errors.push("Complétez le tableau d'amortissement avant de confirmer l'emprunt.");
    if (hasScheduleLine && Math.abs(financialSummary.principal - numberValue(formData.loan_amount)) > 0.01) {
      errors.push(`Le total du capital du tableau (${formatAmount(financialSummary.principal)}) doit correspondre au montant emprunté (${formatAmount(formData.loan_amount)}).`);
    }
    if (hasScheduleLine && Math.abs(numberValue(scheduleLines[scheduleLines.length - 1]?.remaining_balance)) > 0.01) {
      errors.push('Le capital restant dû de la dernière échéance doit être égal à zéro.');
    }
    if (formData.declared_total_interest === '' || formData.declared_total_interest === null || formData.declared_total_interest === undefined) {
      errors.push('Le total des intérêts est obligatoire avant de confirmer l’emprunt.');
    } else if (Math.abs(numberValue(formData.declared_total_interest) - financialSummary.interest) > 0.01) {
      errors.push(`Le total des intérêts saisi (${formatAmount(formData.declared_total_interest)}) doit correspondre au total du tableau d’amortissement (${formatAmount(financialSummary.interest)}).`);
    }
    const expectedPeriods = Math.max(0, Number.parseInt(durationPeriods || 0, 10));
    if (hasScheduleLine && expectedPeriods && scheduleLines.length !== expectedPeriods) {
      errors.push(`La durée indique ${expectedPeriods} période(s), mais le tableau contient ${scheduleLines.length} échéance(s). Corrigez la durée ou le tableau d’amortissement.`);
    }
    if (hasScheduleLine && expectedPeriods && scheduleLines.length === expectedPeriods) {
      const monthsPerPeriod = PERIOD_MONTHS[formData.periodicity] || 1;
      scheduleLines.forEach((line, index) => {
        const expectedDate = addMonths(
          formData.start_date,
          (formData.payment_on_first_period ? index : index + 1) * monthsPerPeriod,
        );
        // Le jour exact peut etre decale pour respecter les jours ouvrables.
        // On controle uniquement que l'echeance appartient a la bonne periode.
        if (line.due_date?.slice(0, 7) !== expectedDate.slice(0, 7)) {
          const expectedPeriod = new Date(`${expectedDate}T12:00:00`).toLocaleDateString('fr-FR', {
            month: 'long',
            year: 'numeric',
          });
          errors.push(`Échéance ${index + 1} : la date doit se situer en ${expectedPeriod}. Corrigez cette ligne.`);
        }
      });
    }
    const groupedAccountingMaps = groupAccountingMaps(accountMaps);
    const requiredAccountTypes = [
      { id: 'capital', required: true },
      { id: 'interest', required: Math.abs(financialSummary.interest) > 0.01 },
      { id: 'tax_fees', required: Math.abs(financialSummary.tax) > 0.01 },
      { id: 'other_fees', required: Math.abs(financialSummary.otherFees) > 0.01 },
      {
        id: 'accrued_interest',
        required: accruals.some((line) => Math.abs(numberValue(line.accrued_amount)) > 0.01),
      },
    ].filter((item) => item.required);

    requiredAccountTypes.forEach(({ id: accountType }) => {
      const componentLabel = COMPONENT_TYPES.find((item) => item.id === accountType)?.label || accountType;
      const map = groupedAccountingMaps.find((item) => item.account_type === accountType);
      if (!map) {
        errors.push(`Écriture comptable « ${componentLabel} » : sélectionnez un compte.`);
      }
    });

    groupedAccountingMaps.forEach((map) => {
      const componentLabel = COMPONENT_TYPES.find((item) => item.id === map.account_type)?.label || map.account_type;
      if (!map.account) errors.push(`Écriture comptable « ${componentLabel} » : sélectionnez un compte.`);
    });
    if (groupedAccountingMaps.length && !journalCounterpartAccountId) {
      errors.push('Le journal doit avoir un compte par défaut ou un compte d’attente pour générer la contrepartie comptable.');
    }
    return errors;
  };

  const resetSchedule = () => {
    setDeletedRows((current) => ({
      ...current,
      lines: [...new Set([...current.lines, ...lines.filter(persisted).map((line) => line.id)])],
    }));
    setLines([emptyLine()]);
    setFormData((current) => ({ ...current, payment_amount: '' }));
    scheduleManuallyEditedRef.current = false;
    setHasChanges(true);
  };

  const buildLoanPayload = () => ({
    name: formData.name.trim(),
    state: formData.state || 'draft',
    loan_amount: numberValue(formData.loan_amount),
    declared_total_interest: numberValue(formData.declared_total_interest),
    duration_periods: Math.max(0, Number.parseInt(formData.duration_periods || 0, 10)),
    duration: Math.max(0, Number.parseInt(formData.duration_periods || 0, 10))
      * (PERIOD_MONTHS[formData.periodicity] || 1),
    installment_num: Math.max(0, Number.parseInt(formData.duration_periods || 0, 10)),
    periodicity: formData.periodicity || 'monthly',
    start_date: formData.start_date,
    maturity_date: formData.maturity_date,
    payment_amount: numberValue(formData.payment_amount),
    payment_on_first_period: Boolean(formData.payment_on_first_period),
    deferred_periods: Math.max(0, Number.parseInt(formData.deferred_periods || 0, 10)),
    partner_id: formData.partner_id,
    company_id: entityId,
    currency_id: formData.currency_id,
    journal_id: formData.journal_id,
  });

  const syncRelated = async (loanId) => {
    const deletionRequests = [
      ...deletedRows.lines.map((rowId) => axiosInstance.delete(`${API.lines}${rowId}/`)),
      ...deletedRows.accruals.map((rowId) => axiosInstance.delete(`${API.accruals}${rowId}/`)),
      ...deletedRows.maps.map((rowId) => axiosInstance.delete(`${API.maps}${rowId}/`)),
    ];
    const deletionResults = await Promise.allSettled(deletionRequests);
    const deletionErrors = deletionResults.filter((result) => result.status === 'rejected');

    const scheduleLines = dedupeLoanLines(computedSchedule.filter(hasScheduleValue));
    debugLoan('Échéancier préparé pour enregistrement', {
      loanId,
      totalLinesInState: lines.length,
      linesToSend: scheduleLines.length,
      lines: scheduleLines.map((line) => ({
        sequence: line.sequence,
        due_date: line.due_date,
        principal_component: line.principal_component,
        interest_component: line.interest_component,
        total_payment: line.total_payment,
      })),
    });
    const lineRequests = scheduleLines.map((line) => {
      const payload = {
        loan: loanId,
        sequence: Number.parseInt(line.sequence || 1, 10),
        due_date: line.due_date,
        // Les deux formes sont envoyées pour rester compatible avec les
        // versions du modèle déjà déployées (principal_amount/move et
        // principal_component/accounting_move).
        principal_amount: numberValue(line.principal_component),
        principal_component: numberValue(line.principal_component),
        interest_amount: numberValue(line.interest_component),
        interest_component: numberValue(line.interest_component),
        tax_amount: numberValue(line.taxe_fees_component),
        taxe_fees_component: numberValue(line.taxe_fees_component),
        other_fees_amount: numberValue(line.others_fees_component),
        others_fees_component: numberValue(line.others_fees_component),
        total_payment: numberValue(line.total_payment),
        remaining_balance: numberValue(line.remaining_balance),
        state: line.state || 'upcoming',
        move: relationId(line.accounting_move) || null,
        accounting_move: relationId(line.accounting_move) || null,
      };
      return persisted(line)
        ? axiosInstance.patch(`${API.lines}${line.id}/`, payload)
        : axiosInstance.post(API.lines, payload);
    });

    const accrualRequests = accruals.map((accrual) => {
      const payload = {
        loan: loanId,
        accrual_date: accrual.accrual_date,
        period_start: accrual.period_start,
        period_end: accrual.period_end,
        accrued_amount: numberValue(accrual.accrued_amount),
        state: accrual.state || 'draft',
        accounting_move: relationId(accrual.accounting_move) || null,
        reconciled_schedule_line: relationId(accrual.reconciled_schedule_line) || null,
      };
      return persisted(accrual)
        ? axiosInstance.patch(`${API.accruals}${accrual.id}/`, payload)
        : axiosInstance.post(API.accruals, payload);
    });

    // Le serializer déduit le compte de contrepartie depuis le journal.
    const mapRequests = groupAccountingMaps(accountMaps)
      .filter((map) => map.account)
      .map((map) => {
        const isAccruedInterest = map.account_type === 'accrued_interest';
        const payload = {
          loan_id: loanId,
          component_type: map.component_type,
          account_id: map.account,
          interest_payable_account_id: isAccruedInterest ? map.account : null,
          start_date: formData.start_date,
        };
        const updateExisting = map.backend_map_id && !deletedRows.maps.includes(map.backend_map_id);
        return updateExisting
          ? axiosInstance.patch(`${API.maps}${map.backend_map_id}/`, payload)
          : axiosInstance.post(API.maps, payload);
      });

    debugLoan('Synchronisation de l’échéancier démarrée', {
      loanId,
      deletions: deletionRequests.length,
      lines: lineRequests.length,
      accruals: accrualRequests.length,
      accountMaps: mapRequests.length,
    });
    const results = await Promise.allSettled([...lineRequests, ...accrualRequests, ...mapRequests]);
    const errors = [
      ...deletionErrors,
      ...results.filter((result) => result.status === 'rejected'),
    ];
    debugLoan('Synchronisation de l’échéancier terminée', {
      loanId,
      requests: lineRequests.length + accrualRequests.length + mapRequests.length,
      errors: errors.length,
    });
    if (errors.length) {
      const firstError = errors[0].reason;
      throw new Error(getLoanErrorMessage(
        firstError,
        'Certaines données liées n’ont pas pu être enregistrées.',
      ));
    }
  };

  const save = async () => {
    debugLoan(`Clic sur Enregistrer reçu | mode=${mode} | isShowMode=${isShowMode} | chemin=${location.pathname}`, {
      mode: isShowMode ? 'show' : 'create',
      modeProp: mode,
      isShowMode,
      currentPath: location.pathname,
      editable,
      saving,
      saveInFlight: saveInFlightRef.current,
    });
    if (saveInFlightRef.current) {
      debugLoan('Enregistrement ignoré : une sauvegarde est déjà en cours');
      return false;
    }
    const errors = validate();
    if (errors.length) {
      debugLoan('Enregistrement bloqué par la validation', errors);
      setFeedback({ type: 'error', message: errors.join('\n') });
      return false;
    }
    saveInFlightRef.current = true;
    setSaving(true);
    setFeedback(null);
    try {
      debugLoan('Enregistrement du prêt', {
        mode: isShowMode ? 'show' : 'create',
        loanId: id || null,
        formData,
        lines,
      });
      const existingCreatedId = !isShowMode ? createdLoanIdRef.current : null;
      const response = isShowMode || existingCreatedId
        ? await axiosInstance.patch(`${API.loans}${id || existingCreatedId}/`, buildLoanPayload())
        : await axiosInstance.post(API.loans, buildLoanPayload());
      const saved = response.data;
      debugLoan('Réponse API contrat reçue', {
        status: response.status,
        savedId: saved?.id || saved?.pk || null,
        saved,
      });
      const savedId = saved.id || saved.pk;
      if (!savedId) {
        throw new Error('Le serveur n’a pas retourné l’identifiant de l’emprunt.');
      }
      if (!isShowMode) createdLoanIdRef.current = savedId;

      const hasIncompleteSchedule = lines.some((line) => hasScheduleInput(line) && !hasScheduleValue(line));
      const draftSnapshot = {
        lines,
        accruals,
        accountMaps,
        incomplete: hasIncompleteSchedule,
        savedAt: new Date().toISOString(),
      };

      // Le parent est enregistré avant les lignes enfants. On conserve donc
      // temporairement le snapshot pour que la liste et le détail restent
      // cohérents pendant la synchronisation asynchrone.
      writeDraftSchedule(savedId, draftSnapshot);

      // La redirection n'a lieu qu'après la persistance réelle des lignes.
      // Ainsi, le détail relu depuis la liste vient toujours de la base.
      try {
        await syncRelated(savedId);
      } catch (relatedError) {
        if (!isShowMode && !existingCreatedId) {
          try {
            await axiosInstance.delete(`${API.loans}${savedId}/`);
            clearDraftSchedule(savedId);
            createdLoanIdRef.current = null;
          } catch (cleanupError) {
            debugLoan('Nettoyage impossible après échec des lignes liées', {
              savedId,
              cleanupError,
            });
          }
        }
        throw relatedError;
      }
      if (!hasIncompleteSchedule) clearDraftSchedule(savedId);

      const navigationState = isShowMode
        ? {
          updatedRecord: saved,
          draftSchedule: true,
          draftScheduleId: savedId,
          draftScheduleIncomplete: hasIncompleteSchedule,
          draftLines: lines,
          draftAccruals: accruals,
          draftAccountMaps: accountMaps,
        }
        : {
          createdRecord: saved,
          draftSchedule: true,
          draftScheduleId: savedId,
          draftScheduleIncomplete: hasIncompleteSchedule,
          draftLines: lines,
          draftAccruals: accruals,
          draftAccountMaps: accountMaps,
        };
      navigate('/comptabilite/emprunts', {
        replace: true,
        state: navigationState,
      });
      debugLoan('Redirection immédiate vers l’index exécutée', {
        path: '/comptabilite/emprunts',
        savedId,
        mode: isShowMode ? 'show' : 'create',
      });
      window.setTimeout(() => {
        debugLoan('Vérification après redirection', {
          currentPath: window.location.pathname,
          currentSearch: window.location.search,
        });
      }, 0);

      debugLoan('Synchronisation des lignes liées terminée', { savedId });
      return saved;
    } catch (requestError) {
      let message = getLoanErrorMessage(requestError, "Impossible d'enregistrer l'emprunt.");
      debugLoan('Erreur pendant l’enregistrement', {
        message,
        error: requestError,
        response: requestError?.response?.data,
      });
      setFeedback({ type: 'error', message });
      return false;
    } finally {
      setSaving(false);
      saveInFlightRef.current = false;
    }
  };

  const refreshTraceability = async () => {
    if (!isShowMode || !id) return;
    try {
      const response = await axiosInstance.get(API.traceability, {
        params: {
          company: entityId,
          model_name: 'AccountLoan',
          object_id: id,
          page_size: 100,
        },
      });
      setTraceabilityEvents(
        normalizeApiList(response.data).filter((event) => (
          String(event.object_id ?? '') === String(id)
          && String(event.model_name || '').toLowerCase() === 'accountloan'
        )),
      );
    } catch {
      // La traçabilité ne doit jamais bloquer l'action métier principale.
    }
  };

  const updateState = async (state, actionOptions = {}) => {
    if (!isShowMode || saving) return;
    if (state === 'in_progress') {
      const errors = validate({ forConfirmation: true });
      if (errors.length) {
        setValidationErrors(errors);
        return;
      }
    }
    setSaving(true);
    try {
      const endpointByState = {
        in_progress: 'confirm',
        draft: 'draft',
        closed: 'close',
        cancelled: 'cancel',
      };
      const endpoint = endpointByState[state];
      if (!endpoint) throw new Error("Transition d'état inconnue.");
      const actionPayload = state === 'in_progress'
        ? {
          overdue_posting_mode: actionOptions.overduePostingMode || 'original_due_date',
          existing_moves: actionOptions.existingMoves || {},
        }
        : {};
      const response = await axiosInstance.post(`${API.loans}${id}/${endpoint}/`, actionPayload);
      setRecord(response.data);
      setFormData(normalizeLoan(response.data));
      if (state === 'in_progress' || state === 'closed') clearDraftSchedule(id);
      const postedCount = Number(response.data?.due_entries_created || 0);
      const linkedCount = Number(response.data?.due_entries_linked || 0);
      setFeedback({
        type: 'success',
        message: state === 'in_progress'
          ? `Emprunt confirmé. ${postedCount} écriture(s) créée(s) et ${linkedCount} échéance(s) rattachée(s).`
          : `Emprunt ${LOAN_STATES[state].toLowerCase()}.`,
      });
      setHasChanges(false);
      await refreshTraceability();
    } catch (requestError) {
      const apiErrors = flattenApiErrors(requestError?.response?.data || requestError?.data);
      if (state === 'in_progress' && apiErrors.length) {
        setValidationErrors(apiErrors);
      } else {
        setFeedback({
          type: 'error',
          message: apiErrors.join('\n') || getActionErrorMessage(requestError, "Impossible de modifier l'état."),
        });
      }
    } finally {
      setSaving(false);
    }
  };

  const deleteLoan = async () => {
    if (!isShowMode || formData.state !== 'draft') return;
    setSaving(true);
    try {
      await axiosInstance.delete(`${API.loans}${id}/`);
      clearDraftSchedule(id);
      navigate('/comptabilite/emprunts', { replace: true });
    } catch (requestError) {
      setFeedback({ type: 'error', message: getActionErrorMessage(requestError, "Impossible de supprimer l'emprunt.") });
      setSaving(false);
    }
  };

  const duplicateLoan = async () => {
    if (!isShowMode || saving || hasChanges) return;
    setSaving(true);
    try {
      const response = await axiosInstance.post(`${API.loans}${id}/duplicate/`);
      const duplicate = response.data;
      navigate(`/comptabilite/emprunts/${duplicate.id}`, {
        state: { loanRecord: duplicate },
      });
    } catch (requestError) {
      setFeedback({
        type: 'error',
        message: getActionErrorMessage(requestError, "Impossible de dupliquer l'emprunt."),
      });
    } finally {
      setSaving(false);
    }
  };

  const requestStateAction = (state) => {
    const messages = {
      in_progress: dueUnpostedCount > 0
        ? `Confirmer cet emprunt ? ${dueUnpostedCount} échéance(s) déjà arrivée(s) à date seront comptabilisées immédiatement.`
        : "Confirmer cet emprunt ? Les futures échéances seront comptabilisées automatiquement à leur date.",
      draft: "Remettre cet emprunt en brouillon ?",
      closed: "Clôturer cet emprunt ? Toutes les échéances doivent être payées.",
      cancelled: "Annuler cet emprunt ?",
    };
    setPendingAction({
      type: 'state',
      state,
      title: LOAN_STATES[state] || 'Confirmer l’action',
      message: messages[state],
      danger: state === 'cancelled',
      overduePostingMode: state === 'in_progress' ? 'original_due_date' : undefined,
      existingMoves: {},
      dialogError: '',
    });
  };

  const loadExistingMoves = useCallback(async () => {
    if (existingMovesLoaded || existingMovesLoading) return;
    setExistingMovesLoading(true);
    try {
      const response = await axiosInstance.get(`${API.loans}${id}/linkable-moves/`);
      setExistingMoves(normalizeApiList(response.data));
      setExistingMovesLoaded(true);
    } catch (requestError) {
      setPendingAction((current) => current ? {
        ...current,
        dialogError: getActionErrorMessage(
          requestError,
          'Impossible de charger les pièces comptables existantes.',
        ),
      } : current);
    } finally {
      setExistingMovesLoading(false);
    }
  }, [existingMovesLoaded, existingMovesLoading, id]);

  const selectOverduePostingMode = (mode) => {
    setPendingAction((current) => current ? {
      ...current,
      overduePostingMode: mode,
      dialogError: '',
    } : current);
    if (mode === 'existing_moves') loadExistingMoves();
  };

  const selectExistingMove = (lineId, moveId) => {
    setPendingAction((current) => current ? {
      ...current,
      dialogError: '',
      existingMoves: {
        ...(current.existingMoves || {}),
        [String(lineId)]: moveId || '',
      },
    } : current);
  };

  const confirmPendingAction = async () => {
    const actionToRun = pendingAction;
    if (!actionToRun) return;
    if (
      actionToRun.type === 'state'
      && actionToRun.state === 'in_progress'
      && actionToRun.overduePostingMode === 'existing_moves'
    ) {
      const missingLink = dueUnpostedLines.some((line) => (
        !actionToRun.existingMoves?.[String(line.id)]
      ));
      if (missingLink) {
        setPendingAction((current) => ({
          ...current,
          dialogError: 'Sélectionnez une pièce comptable pour chaque échéance passée.',
        }));
        return;
      }
    }
    setPendingAction(null);
    if (actionToRun.type === 'state') await updateState(actionToRun.state, actionToRun);
    if (actionToRun.type === 'duplicate') await duplicateLoan();
    if (actionToRun.type === 'delete') await deleteLoan();
  };

  const scheduleTableWidth = visibleScheduleColumns.reduce(
    (total, column) => total + (scheduleColumnWidths[column.key] || column.width),
    0,
  );
  const scheduleColumnStyle = (column) => ({
    width: `${scheduleColumnWidths[column.key] || column.width}px`,
  });
  const scheduleFooterValue = (columnKey) => ({
    principal_component: financialSummary.principal,
    interest_component: financialSummary.interest,
    taxe_fees_component: financialSummary.tax,
    others_fees_component: financialSummary.otherFees,
    total_payment: financialSummary.payment,
  }[columnKey]);
  const renderScheduleCell = (column, line, index) => {
    const cellClass = 'border border-gray-300 p-1 align-middle';
    switch (column.key) {
      case 'sequence':
        return <td key={column.key} className={cellClass}><div className="flex h-[26px] items-center justify-center px-2 text-xs tabular-nums text-gray-700">{line.sequence || index + 1}</div></td>;
      case 'due_date':
        return <td key={column.key} className={cellClass}><input ref={(node) => { if (node) scheduleFirstInputRefs.current.set(line.id, node); else scheduleFirstInputRefs.current.delete(line.id); }} type="date" value={line.due_date || ''} onChange={(event) => updateRow(setLines, index, 'due_date', event.target.value)} onKeyDown={column.key === lastEditableScheduleColumnKey ? (event) => handleLastScheduleFieldTab(event, index) : undefined} disabled={!editable} className={cellInputClass} /></td>;
      case 'opening_balance':
        return <td key={column.key} className={cellClass}><div className="flex h-[26px] items-center justify-end px-2 text-right text-xs tabular-nums text-gray-700">{formatAmount(line.opening_balance)}</div></td>;
      case 'principal_component':
      case 'interest_component':
      case 'taxe_fees_component':
      case 'others_fees_component':
        return <td key={column.key} className={cellClass}><AmountInput value={lines[index]?.[column.key] ?? ''} onChange={(value) => updateRow(setLines, index, column.key, value)} onKeyDown={column.key === lastEditableScheduleColumnKey ? (event) => handleLastScheduleFieldTab(event, index) : undefined} disabled={!editable} className={cellInputClass} /></td>;
      case 'total_payment':
      case 'remaining_balance':
        return <td key={column.key} className={cellClass}><div className="flex h-[26px] items-center justify-end px-2 text-right text-xs tabular-nums">{formatAmount(line[column.key])}</div></td>;
      case 'state': {
        const state = getAutomaticLineState(line);
        const stateLabel = LINE_STATES.find((option) => option.id === state)?.label || 'À venir';
        const stateClass = state === 'paid'
          ? 'bg-green-50 text-green-700'
          : state === 'due'
            ? 'bg-amber-50 text-amber-700'
            : state === 'cancelled'
              ? 'bg-red-50 text-red-700'
              : 'bg-gray-100 text-gray-600';
        return <td key={column.key} className={cellClass}><div className="flex h-[26px] items-center px-2"><span className={`rounded px-2 py-0.5 text-[11px] font-medium ${stateClass}`}>{stateLabel}</span></div></td>;
      }
      case 'actions':
        return <td key={column.key} className={`${cellClass} text-center`}>{editable && <button type="button" tabIndex={-1} onClick={() => removeRow('lines', lines, setLines, index)} className="flex h-[26px] w-full items-center justify-center text-gray-400 transition-colors hover:text-red-600" title="Supprimer"><FiTrash2 size={13} /></button>}</td>;
      default:
        return null;
    }
  };

  const process = (
    <div className="flex items-center justify-between gap-4 px-4 py-3">
      <div className="flex items-center gap-2">
        {editable && lines.length > 0 && <button type="button" onClick={resetSchedule} disabled={saving} className="h-8 border border-gray-300 px-3 text-xs hover:bg-gray-50 disabled:opacity-50">Réinitialiser</button>}
        {isShowMode && formData.state === 'draft' && <button type="button" onClick={() => requestStateAction('in_progress')} disabled={saving || hasChanges} className="h-8 bg-purple-600 px-3 text-xs font-medium text-white hover:bg-purple-700 disabled:opacity-50">Confirmer</button>}
        {isShowMode && formData.state === 'in_progress' && <button type="button" onClick={() => requestStateAction('closed')} disabled={saving} className="h-8 border border-purple-600 px-3 text-xs font-medium text-purple-700 hover:bg-purple-50 disabled:opacity-50">Clôturer</button>}
        {isShowMode && formData.state === 'cancelled' && <button type="button" onClick={() => requestStateAction('draft')} disabled={saving || hasGeneratedAccountingEntries} className="h-8 border border-gray-300 px-3 text-xs hover:bg-gray-50 disabled:opacity-50">Remettre en brouillon</button>}
      </div>
      <StateProcess state={formData.state || 'draft'} />
    </div>
  );

  const displayedTraceability = useMemo(() => {
    const entries = [...traceabilityEvents];
    const apiActions = new Set(
      entries.map((event) => normalizeLookupText(event.action)),
    );

    if (record?.id && record.created_at && !apiActions.has('creation')) {
      entries.push({
        id: `loan-${record.id}-system-creation`,
        action: 'Création',
        description: `Emprunt « ${record.name || formData.name} » créé en brouillon.`,
        created_at: record.created_at,
        user_name: userLabel(record.created_by_name || record.created_by) || 'Utilisateur',
        _system: true,
      });
    }

    const updatedAtTime = record?.updated_at ? new Date(record.updated_at).getTime() : 0;
    const hasEventAtUpdatedAt = updatedAtTime && entries.some((event) => {
      const eventTime = new Date(event.created_at || 0).getTime();
      return Number.isFinite(eventTime) && Math.abs(eventTime - updatedAtTime) < 2000;
    });
    if (
      record?.id
      && record.updated_at
      && !apiActions.has('modification')
      && !hasEventAtUpdatedAt
    ) {
      entries.push({
        id: `loan-${record.id}-system-update`,
        action: 'Dernière modification',
        description: `Dernière modification enregistrée pour l’emprunt « ${record.name || formData.name} ».`,
        created_at: record.updated_at,
        user_name: userLabel(record.updated_by_name || record.updated_by) || 'Utilisateur',
        _system: true,
      });
    }

    return entries.sort((first, second) => {
      const firstTime = new Date(first.created_at || 0).getTime();
      const secondTime = new Date(second.created_at || 0).getTime();
      return secondTime - firstTime;
    });
  }, [formData.name, record, traceabilityEvents]);

  const traceabilityContent = displayedTraceability.length ? (
    <div className="space-y-2 px-4 py-3 text-xs">
      {displayedTraceability.map((event) => (
        <div key={event.id} className="border border-gray-200 bg-white p-3">
          <div className="font-semibold text-gray-900">{event.action || 'Action'}</div>
          <div className="mt-1 text-gray-600">{event.description || event.object_label || '-'}</div>
          <div className="mt-1 text-gray-500">
            {event.created_at ? new Date(event.created_at).toLocaleString('fr-FR') : '-'}
            {' · '}
            {event.user_name || event.created_by_name || userLabel(event.user) || 'Système'}
          </div>
        </div>
      ))}
    </div>
  ) : (
    <div className="flex min-h-[180px] flex-col items-center justify-center px-6 text-center text-xs text-gray-500">
      <div className="font-medium text-gray-700">Aucune traçabilité disponible</div>
      <div className="mt-1">Les actions sur cet emprunt apparaîtront ici après son enregistrement.</div>
    </div>
  );

  const tabs = [
    ['schedule', 'Tableau d’amortissement'],
    ['loan_settings', 'Écriture comptable'],
    ['advanced', 'Paramètres avancés'],
  ];

  const validationDialog = validationErrors.length > 0 && (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/35 p-4" role="presentation">
      <div role="dialog" aria-modal="true" aria-labelledby="loan-validation-title" className="w-full max-w-lg border border-gray-300 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <div>
            <h2 id="loan-validation-title" className="text-sm font-semibold text-gray-900">Confirmation impossible</h2>
            <p className="mt-1 text-xs text-gray-600">L’emprunt reste en brouillon tant que ces éléments ne sont pas complétés.</p>
          </div>
          <button type="button" onClick={() => setValidationErrors([])} className="p-1 text-gray-400 transition-colors hover:text-gray-700" title="Fermer"><FiX size={18} /></button>
        </div>
        <div className="max-h-72 overflow-y-auto px-5 py-4">
          <ul className="space-y-2 text-xs text-gray-700">
            {validationErrors.map((error, index) => <li key={`${error}-${index}`} className="flex gap-2"><span className="font-semibold text-red-600">•</span><span>{error}</span></li>)}
          </ul>
        </div>
        <div className="flex justify-end gap-2 border-t border-gray-200 px-5 py-3">
          <button type="button" onClick={() => { setActiveTab('schedule'); setValidationErrors([]); }} className="h-8 border border-purple-600 px-3 text-xs font-medium text-purple-700 hover:bg-purple-50">Voir l’échéancier</button>
          <button type="button" onClick={() => setValidationErrors([])} className="h-8 border border-gray-300 px-3 text-xs text-gray-700 hover:bg-gray-50">Fermer</button>
        </div>
      </div>
    </div>
  );

  const actionDialog = pendingAction && (
    <div className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-900/35 p-4" role="presentation">
      <div role="dialog" aria-modal="true" aria-labelledby="loan-action-title" className="w-full max-w-lg border border-gray-300 bg-white shadow-2xl">
        <div className="flex items-start gap-3 border-b border-gray-200 px-5 py-4">
          <FiAlertCircle className={pendingAction.danger ? 'mt-0.5 text-red-600' : 'mt-0.5 text-purple-600'} size={18} />
          <div>
            <h2 id="loan-action-title" className="text-sm font-semibold text-gray-900">{pendingAction.title}</h2>
            <p className="mt-1 text-xs leading-5 text-gray-600">{pendingAction.message}</p>
          </div>
        </div>
        {pendingAction.type === 'state' && pendingAction.state === 'in_progress' && dueUnpostedCount > 0 && (
          <div className="max-h-[55vh] overflow-y-auto border-b border-gray-200 px-5 py-4">
            <div className="mb-3 text-xs font-semibold text-gray-800">
              Traitement des échéances déjà passées
            </div>
            <div className="space-y-2">
              {[
                {
                  id: 'original_due_date',
                  title: "Comptabiliser aux dates d'échéance",
                  description: 'Les écritures reprendront les dates prévues dans le tableau d’amortissement.',
                },
                {
                  id: 'current_date',
                  title: "Comptabiliser à la date du jour",
                  description: "Les dates d'échéance restent visibles dans les références et la traçabilité.",
                },
                {
                  id: 'existing_moves',
                  title: 'Déjà comptabilisées',
                  description: 'Rattacher chaque échéance à une pièce comptable existante, sans en créer une nouvelle.',
                },
              ].map((choice) => (
                <button
                  key={choice.id}
                  type="button"
                  onClick={() => selectOverduePostingMode(choice.id)}
                  className={`w-full border px-3 py-2 text-left transition-colors ${pendingAction.overduePostingMode === choice.id ? 'border-purple-600 bg-purple-50' : 'border-gray-300 bg-white hover:border-purple-400'}`}
                >
                  <span className="flex items-center gap-2 text-xs font-semibold text-gray-900">
                    <span className={`h-3 w-3 rounded-full border ${pendingAction.overduePostingMode === choice.id ? 'border-purple-600 bg-purple-600 ring-2 ring-purple-100' : 'border-gray-400 bg-white'}`} />
                    {choice.title}
                  </span>
                  <span className="mt-1 block pl-5 text-[11px] leading-4 text-gray-500">{choice.description}</span>
                </button>
              ))}
            </div>

            {pendingAction.overduePostingMode === 'existing_moves' && (
              <div className="mt-4 border-t border-gray-200 pt-3">
                {existingMovesLoading ? (
                  <div className="text-xs text-gray-500">Chargement des pièces comptables...</div>
                ) : existingMoves.length === 0 ? (
                  <div className="border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                    Aucune pièce comptabilisée disponible pour ce partenaire.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {dueUnpostedLines.map((line) => (
                      <div key={line.id} className="grid grid-cols-[155px_minmax(0,1fr)] items-center gap-2">
                        <div className="text-[11px] text-gray-700">
                          Échéance {line.sequence} du {formatDate(line.due_date)}
                        </div>
                        <SearchSelect
                          value={pendingAction.existingMoves?.[String(line.id)] || ''}
                          onChange={(moveId) => selectExistingMove(line.id, moveId)}
                          options={existingMoves}
                          getLabel={(move) => [move.name || `Pièce ${move.id}`, formatDate(move.date), move.ref].filter(Boolean).join(' - ')}
                          placeholder="Sélectionner la pièce existante"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {pendingAction.dialogError && (
              <div className="mt-3 border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-700">
                {pendingAction.dialogError}
              </div>
            )}
          </div>
        )}
        <div className="flex justify-end gap-2 px-5 py-4">
          <button type="button" onClick={() => setPendingAction(null)} disabled={saving} className="h-8 border border-gray-300 px-3 text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-50">
            {pendingAction.state === 'in_progress' && dueUnpostedCount > 0 ? 'Rester en brouillon' : 'Fermer'}
          </button>
          <button type="button" onClick={confirmPendingAction} disabled={saving || existingMovesLoading} className={`h-8 px-3 text-xs font-medium text-white disabled:opacity-50 ${pendingAction.danger ? 'bg-red-600 hover:bg-red-700' : 'bg-purple-600 hover:bg-purple-700'}`}>
            {saving ? 'Traitement...' : 'Confirmer'}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <UnifiedFormPage
      title="Emprunts"
      recordLabel={formData.name || 'Nouvel emprunt'}
      pageLabel={isShowMode ? "Détail de l'emprunt" : "Création d'un emprunt"}
      mode={isShowMode ? 'show' : 'create'}
      fallbackPath="/comptabilite/emprunts"
      autoReturnAfterSave={false}
      primaryAction={{ label: 'Nouveau', icon: <FiPlus size={13} />, path: '/comptabilite/emprunts/create' }}
      actionsMenu={(
        <ActionsMenu
          state={formData.state || 'draft'}
          disabled={saving || hasChanges}
          canDuplicate={isShowMode && !hasChanges}
          canResetToDraft={!hasGeneratedAccountingEntries}
          onAction={requestStateAction}
          onDelete={() => setPendingAction({ type: 'delete', title: 'Supprimer l’emprunt', message: 'Supprimer définitivement cet emprunt brouillon ?', danger: true })}
          onDuplicate={() => setPendingAction({ type: 'duplicate', title: 'Dupliquer l’emprunt', message: 'Créer un nouveau brouillon avec les informations, l’échéancier et le paramétrage comptable de cet emprunt ?' })}
          onList={() => navigate('/comptabilite/emprunts')}
          onPrint={() => window.print()}
          traceabilityOpen={traceabilityOpen}
          onToggleTraceability={() => setTraceabilityOpen((current) => !current)}
        />
      )}
      onSave={editable ? save : undefined}
      saveLabel={isShowMode ? 'Enregistrer les modifications' : 'Enregistrer'}
      saving={saving}
      hasUnsavedChanges={hasChanges}
      rememberForm={!isShowMode}
      memoryKey={FORM_MEMORY_KEY}
      memoryState={!isShowMode ? { formData, lines, accruals, accountMaps } : undefined}
      onRestoreMemoryState={!isShowMode ? (memory) => {
        if (memory?.formData) {
          setFormData((previous) => ({ ...previous, ...memory.formData }));
        }
        if (Array.isArray(memory?.lines)) {
          const restoredLines = memory.lines.length ? memory.lines : [emptyLine()];
          setLines(restoredLines);
          scheduleManuallyEditedRef.current = restoredLines.some(hasScheduleValue);
        }
        if (Array.isArray(memory?.accruals)) setAccruals(memory.accruals);
        if (Array.isArray(memory?.accountMaps)) {
          const restoredMaps = normalizeAccountingMaps(memory.accountMaps, formData.start_date);
          setAccountMaps(restoredMaps.length ? restoredMaps : [emptyMap(formData.start_date)]);
        }
        setActiveTab('schedule');
        setHasChanges(true);
      } : undefined}
      feedback={feedback}
      onDismissFeedback={() => setFeedback(null)}
      messageDuration={15000}
      process={process}
      traceability={{
        open: traceabilityOpen,
        onOpen: () => setTraceabilityOpen(true),
        onClose: () => setTraceabilityOpen(false),
        title: 'Traçabilité',
        content: traceabilityContent,
      }}
      noContext={loading ? <div className="p-10 text-center text-sm text-gray-500">Chargement de l’emprunt...</div> : undefined}
    >
      {!loading && (
        <>
        <div>
          <style>{`
            .loan-lines-scroll {
              scrollbar-width: thin;
              scrollbar-color: #e2e8f0 transparent;
            }
            .loan-lines-scroll::-webkit-scrollbar {
              width: 1px;
              height: 1px;
            }
            .loan-lines-scroll::-webkit-scrollbar-track {
              background: transparent;
            }
            .loan-lines-scroll::-webkit-scrollbar-thumb {
              background: #e2e8f0;
              border-radius: 999px;
            }
            .loan-lines-scroll::-webkit-scrollbar-thumb:hover {
              background: #cbd5e1;
            }
          `}</style>

          <div className="border-b border-gray-300 px-4 py-3">
            <div className="mb-3 text-xs font-semibold text-gray-900">Informations principales</div>
            <div className="grid grid-cols-1 gap-x-4 gap-y-2 lg:grid-cols-2">
              <Field label="Nom" required><input value={formData.name} onChange={(event) => setField('name', event.target.value)} disabled={!editable} className={inputClass} placeholder="Ex. Prêt nom de la banque" /></Field>
              <Field label="Montant emprunté" required><AmountInput value={formData.loan_amount} onChange={(value) => setField('loan_amount', value)} disabled={!editable} /></Field>
              <Field label="Date de l'emprunt" required><input type="date" value={formData.start_date} onChange={(event) => handleStartDateChange(event.target.value)} disabled={!editable} className={inputClass} /></Field>
              <Field label="Durée / périodicité" required>
                <div className="grid grid-cols-[110px_minmax(0,1fr)] gap-2">
                  <input type="text" inputMode="numeric" value={durationPeriods} onChange={(event) => handleDurationChange(event.target.value)} disabled={!editable} className={inputClass} placeholder="Durée" title={formData.maturity_date ? `Échéance finale : ${formData.maturity_date}` : ''} />
                  <SearchSelect value={formData.periodicity} onChange={handlePeriodicityChange} options={PERIODICITIES} getLabel={(option) => option.label} placeholder="Périodicité" disabled={!editable} />
                </div>
              </Field>
              <Field label="Journal" required><SearchSelect value={formData.journal_id} onChange={handleJournalChange} options={loanJournals} getLabel={(journal) => optionLabel(journal)} placeholder="Banque ou opérations diverses" disabled={!editable} /></Field>
              <Field label="Devise" required><SearchSelect value={formData.currency_id} onChange={(value) => setField('currency_id', value)} options={options.currencies} getLabel={(currency) => optionLabel(currency)} placeholder="Sélectionner la devise" disabled={!editable} /></Field>
              <Field label="Prêteur" required><SearchSelect value={formData.partner_id} onChange={(value) => setField('partner_id', value)} options={lenderOptions} getLabel={(lender) => lender._label || lender.raison_sociale || lender.nom || lender.name || lender.email || `Prêteur ${lender.id}`} placeholder={lenderPlaceholder} disabled={!editable || !selectedJournalKind || (selectedJournalKind === 'bank' && !bankLenderOptions.length)} /></Field>
              <Field label="Total des intérêts" required><AmountInput value={formData.declared_total_interest} onChange={(value) => setField('declared_total_interest', value)} disabled={!editable} placeholder="Saisir le total prévu" /></Field>
            </div>
          </div>

          <div className="border-b border-gray-300">
            <div className="loan-lines-scroll flex overflow-x-auto px-4">
              {tabs.map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActiveTab(key)}
                  className={`whitespace-nowrap border-b-2 px-4 py-2 text-xs font-medium transition-all ${
                    activeTab === key
                      ? 'border-purple-600 text-purple-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {activeTab === 'schedule' && (
            <div className="px-4 py-3">
              <div className="loan-lines-scroll mb-3 max-h-[52vh] overflow-auto">
                <table className="table-fixed border-collapse text-xs" style={{ minWidth: `${scheduleTableWidth}px` }}>
                  <colgroup>
                    {visibleScheduleColumns.map((column) => <col key={column.key} style={scheduleColumnStyle(column)} />)}
                  </colgroup>
                  <thead className="sticky top-0 z-10"><tr className="bg-gray-100">
                    {visibleScheduleColumns.map((column) => (
                      <th
                        key={column.key}
                        ref={column.key === 'actions' ? scheduleColumnsHeaderRef : undefined}
                        className="relative border border-gray-300 px-2 py-1.5 text-left text-xs font-medium text-gray-700"
                      >
                        {column.key === 'actions' ? (
                          <button
                            ref={scheduleColumnsButtonRef}
                            type="button"
                            onClick={toggleScheduleColumnsMenu}
                            className="w-full text-left text-sm font-bold tracking-widest transition-colors hover:text-purple-600"
                            aria-label="Afficher ou masquer les colonnes"
                            title="Afficher ou masquer les colonnes"
                          >
                            ...
                          </button>
                        ) : column.label}
                        <span role="separator" aria-label={`Redimensionner ${column.label || 'la colonne'}`} onMouseDown={(event) => startScheduleColumnResize(event, column.key)} className="absolute right-0 top-0 z-20 h-full w-1 cursor-col-resize select-none hover:bg-purple-400" />
                      </th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {computedSchedule.map((line) => {
                      const index = line._sourceIndex;
                      return (
                        <tr key={line.id} className="odd:bg-white even:bg-gray-50/60 hover:bg-gray-50">
                          {visibleScheduleColumns.map((column) => renderScheduleCell(column, line, index))}
                        </tr>
                    );})}
                  </tbody>
                  <tfoot className="border-0 bg-transparent">
                    <tr>
                      {visibleScheduleColumns.map((column) => {
                        const footerValue = scheduleFooterValue(column.key);
                        return <td key={column.key} className="whitespace-nowrap px-2 py-2 text-right text-sm font-semibold text-gray-900">{footerValue === undefined ? '' : formatAmount(footerValue)}</td>;
                      })}
                    </tr>
                  </tfoot>
                </table>
              </div>
              {showScheduleColumnsMenu && (
                <div
                  ref={scheduleColumnsPopupRef}
                  className="w-56 border border-gray-300 bg-white p-2 text-xs font-normal text-gray-700 shadow-xl"
                  style={scheduleColumnsMenuStyle}
                >
                  <div className="border-b border-gray-100 px-2 py-1.5 font-semibold text-gray-900">Colonnes à afficher</div>
                  {SCHEDULE_COLUMNS.filter((item) => !item.required).map((item) => (
                    <label key={item.key} className="flex cursor-pointer items-center gap-2 px-2 py-1.5 hover:bg-purple-50">
                      <input
                        type="checkbox"
                        checked={scheduleVisibleColumns[item.key] !== false}
                        onChange={() => toggleScheduleColumn(item.key)}
                        className="h-3.5 w-3.5 accent-purple-600"
                      />
                      <span>{item.label}</span>
                    </label>
                  ))}
                </div>
              )}
              {editable && <button type="button" onClick={() => { scheduleManuallyEditedRef.current = true; setLines((current) => [...current, emptyLine(current.length + 1)]); setHasChanges(true); }} className="flex h-8 items-center gap-1 bg-purple-600 px-3 text-xs text-white transition-all hover:bg-purple-700"><FiPlus size={13} /> Ajouter une échéance</button>}
            </div>
          )}

          {activeTab === 'loan_settings' && (
            <div className="px-4 py-2.5">
              <div className="loan-lines-scroll max-h-[46vh] overflow-auto border border-gray-300">
                <table className="w-full min-w-[480px] table-fixed border-collapse text-xs">
                  <colgroup>
                    <col style={{ width: 'calc((100% - 36px) / 2)' }} />
                    <col style={{ width: 'calc((100% - 36px) / 2)' }} />
                    <col style={{ width: 36 }} />
                  </colgroup>
                  <thead><tr className="bg-gray-100 text-left text-gray-700">
                    {['Type de compte', 'Compte', ''].map((label) => <th key={label} className="border-r border-gray-300 px-2 py-1 last:border-r-0">{label}</th>)}
                  </tr></thead>
                  <tbody>
                    {accountMaps.map((map, index) => (
                      <tr key={map.id} className="border-t border-gray-200 odd:bg-white even:bg-gray-50/60">
                        <td className="border-r border-gray-200 p-0"><SearchSelect value={map.account_type || map.component_type} onChange={(value) => updateMapType(index, value)} options={COMPONENT_TYPES} getLabel={getComponentOptionLabel} bordered={false} disabled={!editable} /></td>
                        <td className="border-r border-gray-200 p-0"><SearchSelect value={map.account_id} onChange={(value) => updateRow(setAccountMaps, index, 'account_id', value)} options={options.accounts} getLabel={getAccountOptionLabel} placeholder={accountsLoading ? 'Chargement...' : 'Sélectionner un compte'} bordered={false} disabled={!editable || accountsLoading} /></td>
                        <td className="w-9 p-0 text-center">{editable && <button type="button" onClick={() => removeRow('maps', accountMaps, setAccountMaps, index)} className="p-1.5 text-gray-400 hover:text-red-600"><FiTrash2 size={12} /></button>}</td>
                      </tr>
                    ))}
                    {!accountMaps.length && <tr><td colSpan="3" className="px-4 py-8 text-center text-gray-500">Aucun paramétrage comptable</td></tr>}
                  </tbody>
                </table>
              </div>
              {editable && <button type="button" onClick={() => { setAccountMaps((current) => [...current, emptyMap(formData.start_date)]); setHasChanges(true); }} className="mt-3 flex h-8 items-center gap-1 bg-purple-600 px-3 text-xs text-white hover:bg-purple-700"><FiPlus size={13} /> Ajouter un paramétrage</button>}
            </div>
          )}

          {activeTab === 'advanced' && (
            <div className="px-4 py-3">
              <div className="grid grid-cols-1 gap-x-4 gap-y-2 lg:grid-cols-2">
                <Field label="Sauter jusqu'au"><input type="date" min={formData.start_date || undefined} value={deferredUntilDate} onChange={(event) => handleDeferredUntilChange(event.target.value)} disabled={!editable} className={inputClass} /></Field>
                <Field label="Taxe par échéance"><AmountInput value={formData.taxe_fees_component} onChange={(value) => setField('taxe_fees_component', value)} disabled={!editable} /></Field>
                <Field label="Autres frais / commissions"><AmountInput value={formData.others_fees_component} onChange={(value) => setField('others_fees_component', value)} disabled={!editable} /></Field>
                <Field label="Paiement première période"><label className="inline-flex h-[26px] items-center gap-2 text-xs text-gray-700"><input type="checkbox" checked={Boolean(formData.payment_on_first_period)} onChange={(event) => {
                  const checked = event.target.checked;
                  setFormData((previous) => ({
                    ...previous,
                    payment_on_first_period: checked,
                    maturity_date: getMaturityDate(
                      previous.start_date,
                      previous.duration_periods,
                      previous.periodicity,
                      checked,
                    ),
                  }));
                  setHasChanges(true);
                  setFeedback(null);
                }} disabled={!editable} className="h-4 w-4 accent-purple-600" /> Dès la date de l'emprunt</label></Field>
              </div>
            </div>
          )}
        </div>
        {validationDialog}
        {actionDialog}
        </>
      )}
    </UnifiedFormPage>
  );
}
