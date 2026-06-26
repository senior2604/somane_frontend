// src/features/comptabilite/pages/payement/PaymentDetail.jsx

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  FiAlertCircle,
  FiCheck,
  FiClock,
  FiFileText,
  FiPlus,
  FiRefreshCw,
  FiSettings,
  FiUploadCloud,
  FiX,
} from 'react-icons/fi';
import axiosInstance from '../../../../config/axiosInstance';

const API = {
  payments: 'compta/payments/',
  journals: 'compta/journals/',
  partners: 'partenaires/',
  currencies: 'devises/',
  paymentMethodLines: 'compta/payment-method-lines/',
  traceability: 'compta/module-traceability/',
};

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
  { id: 'transfer', label: 'Transfert compte à compte' },
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

const Tooltip = ({ children, text }) => {
  const [show, setShow] = useState(false);

  return (
    <div className="relative inline-block" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      {children}
      {show && (
        <div className="absolute bottom-full left-1/2 z-50 mb-1 -translate-x-1/2 whitespace-nowrap rounded bg-gray-800 px-2 py-1 text-xs text-white">
          {text}
        </div>
      )}
    </div>
  );
};

const SearchSelect = ({ value, onChange, options, getLabel, placeholder, disabled }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const selected = options.find((option) => String(option.id) === String(value));
  const visibleOptions = options
    .filter((option) => getLabel(option).toLowerCase().includes(query.toLowerCase()))
    .slice(0, 40);

  return (
    <div className="relative h-[26px]">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
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

const Field = ({ label, required, children }) => (
  <div className="flex items-center" style={{ minHeight: 26 }}>
    <label className="min-w-[150px] text-xs font-medium text-gray-700">{label}{required ? ' *' : ''}</label>
    <div className="ml-2 flex-1">{children}</div>
  </div>
);

const StateBadge = ({ state }) => {
  const normalized = state || 'draft';
  const labels = {
    draft: 'Brouillon',
    posted: 'Validé',
    cancel: 'Annulé',
    cancelled: 'Annulé',
  };
  const color = normalized === 'posted'
    ? 'border-green-300 bg-green-100 text-green-700'
    : ['cancel', 'cancelled'].includes(normalized)
      ? 'border-red-300 bg-red-100 text-red-700'
      : 'border-gray-300 bg-gray-100 text-gray-700';

  return <div className={`flex h-8 items-center border px-3 text-xs font-medium ${color}`}>{labels[normalized] || normalized}</div>;
};

export default function PaymentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const activeEntity = getActiveEntity();
  const actionsMenuRef = useRef(null);
  const isInvalidDetailId = !id || ['create', 'new', 'undefined', 'null'].includes(String(id).toLowerCase());

  const [formData, setFormData] = useState(null);
  const [options, setOptions] = useState({ journals: [], partners: [], currencies: [], methodLines: [] });
  const [traceability, setTraceability] = useState([]);
  const [showTraceabilityPanel, setShowTraceabilityPanel] = useState(true);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [activeTab, setActiveTab] = useState('parametres');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const treasuryJournals = useMemo(() => (
    options.journals.filter((journal) => journal.is_bank_or_cash_flag || ['bank', 'cash'].includes(journal.type_code || journal.journal_type || journal.type))
  ), [options.journals]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (actionsMenuRef.current && !actionsMenuRef.current.contains(event.target)) {
        setShowActionsMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadTraceability = useCallback(async () => {
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
      setTraceability(normalizeApiList(response.data));
    } catch (err) {
      setTraceability([]);
      console.error('Erreur chargement traçabilité paiement', err);
    }
  }, [activeEntity?.id, id]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const entityId = activeEntity?.id;
      const [payment, journals, partners, currencies, methodLines] = await Promise.all([
        axiosInstance.get(`${API.payments}${id}/`),
        axiosInstance.get(API.journals, { params: { company: entityId, company_id: entityId, page_size: 500 } }).catch(() => ({ data: [] })),
        axiosInstance.get(API.partners, { params: { page_size: 500 } }).catch(() => ({ data: [] })),
        axiosInstance.get(API.currencies, { params: { page_size: 200 } }).catch(() => ({ data: [] })),
        axiosInstance.get(API.paymentMethodLines, { params: { company: entityId, company_id: entityId, page_size: 500 } }).catch(() => ({ data: [] })),
      ]);

      const data = payment.data || {};
      setFormData({
        ...data,
        narration: data.narration || data.memo || '',
        payment_date: toDateInput(data.payment_date || data.date),
        partner_id: data.partner_id || data.partner?.id || data.partner || '',
        journal_id: data.journal_id || data.journal?.id || data.journal || '',
        currency_id: data.currency_id || data.currency?.id || data.currency || '',
        transfer_journal_id: data.transfer_journal_id || data.transfer_journal?.id || data.destination_journal_id || data.destination_journal?.id || '',
        payment_method_id: data.payment_method_id || '',
        payment_method_id_label: data.payment_method_id_label || '',
        payment_method_line_id: data.payment_method_line_id || '',
        payment_method_line_id_label: data.payment_method_line_id_label || '',
        payment_method_code: data.payment_method_code || '',
        payment_method_name: data.payment_method_name || '',
      });
      setOptions({
        journals: normalizeApiList(journals.data),
        partners: normalizeApiList(partners.data),
        currencies: normalizeApiList(currencies.data),
        methodLines: normalizeApiList(methodLines.data),
      });
      setHasChanges(false);
    } catch (err) {
      setError(`Impossible de charger le paiement : ${getActionErrorMessage(err, 'Paiement introuvable.')}`);
      console.error('Erreur chargement détail paiement', err);
    } finally {
      setLoading(false);
    }
  }, [activeEntity?.id, id]);

  useEffect(() => {
    if (isInvalidDetailId) {
      navigate('/comptabilite/paiements/create', { replace: true });
      return;
    }
    loadData();
    loadTraceability();
  }, [isInvalidDetailId, loadData, loadTraceability, navigate]);

  const setField = (field, value) => {
    setFormData((previous) => ({ ...previous, [field]: value }));
    setHasChanges(true);
    setSuccess('');
    setError('');
  };

  const handlePartnerSelection = (value, partner) => {
    const partnerType = getPartnerTypeFromPartner(partner);
    setFormData((previous) => ({
      ...previous,
      partner_id: value || '',
      ...(partnerType ? { partner_type: partnerType } : {}),
    }));
    setHasChanges(true);
    setSuccess('');
    setError('');
  };

  const handlePaymentMethodSelection = (value, line) => {
    const methodValues = getPaymentMethodValues(line);
    setFormData((previous) => ({
      ...previous,
      payment_method_line_id: value || '',
      ...methodValues,
    }));
    setHasChanges(true);
    setSuccess('');
    setError('');
  };

  const validate = () => {
    const errors = [];
    if (!formData?.amount || Number(formData.amount) <= 0) errors.push('Le montant doit être supérieur à 0.');
    if (!formData?.currency_id) errors.push('La devise est obligatoire.');
    if (!formData?.journal_id) errors.push('Le journal est obligatoire.');
    if (!formData?.payment_date) errors.push('La date du paiement est obligatoire.');
    if (formData?.payment_type === 'transfer' && !formData?.transfer_journal_id) errors.push('Le journal de destination est obligatoire.');
    return errors;
  };

  const buildPayload = () => ({
    name: formData.name || '/',
    payment_type: formData.payment_type || 'inbound',
    partner_type: formData.partner_type || '',
    state: formData.state || 'draft',
    payment_date: formData.payment_date,
    reference: formData.reference || '',
    narration: formData.narration || '',
    company_id: formData.company_id || formData.company?.id || activeEntity?.id,
    amount: Number(formData.amount || 0),
    partner_id: formData.partner_id || null,
    currency_id: formData.currency_id || null,
    journal_id: formData.journal_id || null,
    transfer_journal_id: formData.payment_type === 'transfer' ? String(formData.transfer_journal_id || '') : null,
    payment_method_id: formData.payment_method_id || '',
    payment_method_id_label: formData.payment_method_id_label || '',
    payment_method_line_id: formData.payment_method_line_id || '',
    payment_method_line_id_label: formData.payment_method_line_id_label || '',
    payment_method_code: formData.payment_method_code || '',
    payment_method_name: formData.payment_method_name || '',
  });

  const handleSave = async () => {
    const errors = validate();
    if (errors.length) {
      setError(errors.join('\n'));
      return false;
    }

    setSaving(true);
    setError('');
    try {
      const response = await axiosInstance.patch(`${API.payments}${id}/`, buildPayload());
      const data = response.data || {};
      setFormData((previous) => ({
        ...previous,
        ...data,
        narration: data.narration || data.memo || previous.narration || '',
        payment_date: toDateInput(data.payment_date || previous.payment_date),
      }));
      setHasChanges(false);
      setSuccess('Paiement enregistré.');
      await loadTraceability();
      return true;
    } catch (err) {
      setError(`Échec enregistrement : ${getActionErrorMessage(err, 'Échec enregistrement du paiement.')}`);
      console.error('Erreur sauvegarde paiement', err);
      return false;
    } finally {
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

  const handleClose = () => {
    if (hasChanges) setShowConfirmDialog(true);
    else navigate('/comptabilite/paiements');
  };

  if (isInvalidDetailId) {
    return null;
  }

  if (loading) {
    return <div className="min-h-screen bg-gray-50 p-8 text-center text-sm text-gray-500">Chargement du paiement...</div>;
  }

  if (!formData) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="mx-auto max-w-2xl border border-red-200 bg-white p-6 text-sm text-red-600">
          {error || 'Paiement introuvable.'}
          <div className="mt-4">
            <button onClick={() => navigate('/comptabilite/paiements')} className="bg-black px-4 py-2 text-xs text-white hover:bg-gray-800">
              Retour à la liste
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isDraft = !formData.state || formData.state === 'draft';
  const isPosted = formData.state === 'posted';
  const isCancelled = formData.state === 'cancel' || formData.state === 'cancelled';
  const isFormValid = validate().length === 0;
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

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="mx-auto max-w-7xl border border-gray-300 bg-white">
        <div className={`grid gap-0 ${showTraceabilityPanel ? 'md:grid-cols-[minmax(0,1fr)_320px]' : 'grid-cols-1'}`}>
          <div className="min-w-0">
            <div className="border-b border-gray-300 px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <button onClick={() => navigate('/comptabilite/paiements/create')} className="flex h-12 items-center gap-1 bg-purple-600 px-4 text-sm font-medium text-white hover:bg-purple-700">
                    <FiPlus size={16} /><span>Nouveau</span>
                  </button>
                  <div className="flex h-12 flex-col justify-center">
                    <button type="button" onClick={handleClose} className="text-left text-lg font-bold text-gray-900 hover:text-purple-600">Paiements</button>
                    <div className="mt-0.5 text-xs text-gray-600">{formData.name || 'N° Sera généré lors de la validation'}</div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-end gap-2">
                  <div className="relative" ref={actionsMenuRef}>
                    <button onClick={() => setShowActionsMenu((value) => !value)} className="flex h-8 items-center gap-1 border border-gray-300 px-3 text-xs text-gray-700 hover:bg-gray-50">
                      <FiSettings size={12} /><span>Actions</span>
                    </button>
                    {showActionsMenu && (
                      <div className="absolute right-0 z-50 mt-1 w-56 rounded-sm border border-gray-300 bg-white shadow-lg">
                        <button onClick={() => { setShowActionsMenu(false); setShowTraceabilityPanel((value) => !value); }} className="w-full px-3 py-2 text-left text-xs hover:bg-gray-50">
                          {showTraceabilityPanel ? 'Masquer la traçabilité' : 'Afficher la traçabilité'}
                        </button>
                        <button onClick={() => navigate('/comptabilite/conditions-paiement')} className="w-full px-3 py-2 text-left text-xs hover:bg-gray-50">Conditions de paiement</button>
                        <button onClick={() => navigate('/comptabilite/methodes-paiement')} className="w-full px-3 py-2 text-left text-xs hover:bg-gray-50">Méthodes de paiement</button>
                        <button onClick={() => navigate('/comptabilite/paiements')} className="w-full px-3 py-2 text-left text-xs hover:bg-gray-50">Retour à la liste</button>
                      </div>
                    )}
                  </div>

                  {hasChanges && (
                    <Tooltip text="Enregistrer">
                      <button onClick={handleSave} disabled={saving || !isFormValid} className={`flex h-8 w-8 items-center justify-center rounded-full text-white ${isFormValid && !saving ? 'bg-purple-600 hover:bg-purple-700' : 'cursor-not-allowed bg-gray-300'}`}>
                        <FiUploadCloud size={16} />
                      </button>
                    </Tooltip>
                  )}

                  <Tooltip text="Fermer">
                    <button onClick={handleClose} className="flex h-8 w-8 items-center justify-center rounded-full bg-black text-white hover:bg-gray-800"><FiX size={16} /></button>
                  </Tooltip>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between border-b border-gray-300 px-4 py-2">
              <div className="flex items-center gap-2">
                {error ? (
                  <div className="flex items-center gap-1 text-xs text-red-600"><FiAlertCircle size={14} />{error}</div>
                ) : success ? (
                  <div className="flex items-center gap-1 text-xs text-green-600"><FiCheck size={14} />{success}</div>
                ) : (
                  <div className="text-xs text-gray-500">Détail du paiement</div>
                )}
              </div>
              <div className="flex items-center gap-2">
                {isDraft && <button onClick={() => runAction('validate', { state: 'posted' })} disabled={saving || hasChanges} className="h-8 bg-purple-600 px-3 text-xs font-medium text-white hover:bg-purple-700 disabled:opacity-50">Valider</button>}
                {isPosted && <button onClick={() => runAction('cancel', { state: 'cancel' })} disabled={saving} className="h-8 border border-red-300 bg-red-50 px-3 text-xs font-medium text-red-700 hover:bg-red-100">Annuler</button>}
                {isCancelled && <button onClick={() => runAction('draft', { state: 'draft' })} disabled={saving} className="h-8 border border-gray-300 px-3 text-xs font-medium text-gray-700 hover:bg-gray-50"><FiRefreshCw size={12} className="mr-1 inline" />Brouillon</button>}
                <StateBadge state={formData.state} />
              </div>
            </div>

            <div className="border-b border-gray-300 px-4 py-3">
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div className="space-y-2">
                  <Field label="Type de paiement" required>
                    <SearchSelect value={formData.payment_type || 'inbound'} onChange={(value) => setField('payment_type', value)} disabled={!isDraft} options={PAYMENT_TYPE_OPTIONS} getLabel={(item) => item.label} placeholder="Type de paiement" />
                  </Field>
                  <Field label="Partenaire">
                    <SearchSelect value={formData.partner_id} onChange={handlePartnerSelection} disabled={!isDraft} options={options.partners} getLabel={(partner) => partner.nom || partner.name || partner.email || `Partenaire ${partner.id}`} placeholder="Sélectionner un partenaire" />
                  </Field>
                  <Field label="Type partenaire">
                    <SearchSelect value={formData.partner_type || ''} onChange={(value) => setField('partner_type', value)} disabled={!isDraft} options={PARTNER_TYPE_OPTIONS} getLabel={(item) => item.label} placeholder="Type partenaire" />
                  </Field>
                  <Field label="Montant" required>
                    <input type="number" min="0" step="0.01" value={formData.amount || ''} onChange={(event) => setField('amount', event.target.value)} disabled={!isDraft} className="h-[26px] w-full border border-gray-300 px-2 text-left text-xs hover:border-purple-400 focus:border-purple-600 disabled:bg-gray-100" />
                  </Field>
                </div>

                <div className="space-y-2">
                  <Field label="Devise" required><SearchSelect value={formData.currency_id} onChange={(value) => setField('currency_id', value)} disabled={!isDraft} options={options.currencies} getLabel={(currency) => [currency.code, currency.name || currency.nom].filter(Boolean).join(' - ')} placeholder="Devise" /></Field>
                  <Field label="Date paiement" required><input type="date" value={formData.payment_date || today()} onChange={(event) => setField('payment_date', event.target.value)} disabled={!isDraft} className="h-[26px] w-full border border-gray-300 px-2 text-xs hover:border-purple-400 focus:border-purple-600 disabled:bg-gray-100" /></Field>
                  <Field label="Journal" required><SearchSelect value={formData.journal_id} onChange={(value) => setField('journal_id', value)} disabled={!isDraft} options={treasuryJournals.length ? treasuryJournals : options.journals} getLabel={(journal) => optionLabel(journal)} placeholder="Journal de trésorerie" /></Field>
                  {formData.payment_type === 'transfer' && <Field label="Journal destination" required><SearchSelect value={formData.transfer_journal_id} onChange={(value) => setField('transfer_journal_id', value)} disabled={!isDraft} options={treasuryJournals.length ? treasuryJournals : options.journals} getLabel={(journal) => optionLabel(journal)} placeholder="Journal destination" /></Field>}
                  <Field label="Méthode"><SearchSelect value={formData.payment_method_line_id} onChange={handlePaymentMethodSelection} disabled={!isDraft} options={options.methodLines} getLabel={(line) => line.name || line.display_name || line.payment_method_id_label || line.code || `Méthode ${line.id}`} placeholder="Méthode de paiement" /></Field>
                  <Field label="Référence"><input value={formData.reference || ''} onChange={(event) => setField('reference', event.target.value)} disabled={!isDraft} className="h-[26px] w-full border border-gray-300 px-2 text-xs hover:border-purple-400 focus:border-purple-600 disabled:bg-gray-100" /></Field>
                </div>
              </div>
            </div>

            <div className="border-b border-gray-300 px-4">
              {[
                ['parametres', 'Paramètres', FiSettings],
                ['notes', 'Notes', FiFileText],
              ].map(([key, label, Icon]) => (
                <button key={key} onClick={() => setActiveTab(key)} className={`border-b-2 px-4 py-2 text-xs font-medium ${activeTab === key ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                  <Icon size={12} className="mr-1 inline" />{label}
                </button>
              ))}
            </div>

            <div className="p-4">
              {activeTab === 'parametres' && (
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <Field label="Compte lié"><div className="text-xs text-gray-600">{formData.account_move_name || formData.account_move_id || formData.account_move || '-'}</div></Field>
                  <Field label="État interne"><div className="text-xs text-gray-600">{formData.state || 'draft'}</div></Field>
                </div>
              )}
              {activeTab === 'notes' && (
                <textarea value={formData.narration || ''} onChange={(event) => setField('narration', event.target.value)} disabled={!isDraft} rows={6} className="w-full border border-gray-300 px-3 py-2 text-xs outline-none focus:border-purple-600 disabled:bg-gray-100" placeholder="Notes / libellé du paiement..." />
              )}
            </div>
          </div>

          {showTraceabilityPanel && (
            <aside className="border-l border-gray-300 bg-gray-50">
              <div className="flex items-center justify-between border-b border-gray-300 px-3 py-2">
                <div>
                  <div className="text-sm font-semibold text-gray-900">Traçabilité</div>
                  <div className="text-xs text-gray-500">Activité liée au paiement</div>
                  <div className="text-xs text-gray-500">{displayedTraceability.length} événement(s)</div>
                </div>
                <button onClick={() => setShowTraceabilityPanel(false)} className="rounded p-1 hover:bg-gray-200"><FiX size={14} /></button>
              </div>
              <div className="max-h-[720px] space-y-2 overflow-auto p-3">
                {displayedTraceability.length === 0 ? (
                  <div className="rounded border border-gray-200 bg-white p-3 text-xs text-gray-500">Aucune activité enregistrée.</div>
                ) : displayedTraceability.map((event) => (
                  <div key={event.id} className="rounded border border-gray-200 bg-white p-3">
                    <div className="flex items-start gap-2">
                      <FiClock className="mt-0.5 text-purple-600" size={14} />
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-gray-900">{event.action || 'Action'}</div>
                        <div className="text-xs text-gray-600">{event.description || event.object_label || '-'}</div>
                        <div className="mt-1 text-[11px] text-gray-400">Par {event.user_label || event.create_uid_label || event.user_name || 'Utilisateur'} - {formatDateTime(event.created_at || event.create_date)}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </aside>
          )}
        </div>
      </div>

      {showConfirmDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="w-full max-w-md rounded-sm bg-white p-6 shadow-lg">
            <h3 className="mb-2 text-lg font-semibold">Modifications non enregistrées</h3>
            <p className="mb-4 text-sm text-gray-600">Voulez-vous quitter sans enregistrer le paiement ?</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowConfirmDialog(false)} className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Rester</button>
              <button onClick={() => navigate('/comptabilite/paiements')} className="bg-black px-4 py-2 text-sm text-white hover:bg-gray-800">Quitter</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
