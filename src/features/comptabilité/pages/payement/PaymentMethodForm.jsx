import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  FiAlertCircle,
  FiCheck,
  FiPlus,
  FiSettings,
  FiTrash2,
  FiUploadCloud,
  FiX,
} from 'react-icons/fi';
import axiosInstance from '../../../../config/axiosInstance';
import {
  Field,
  HeaderIconButton,
  SearchSelect,
  StatusSwitch,
  Tooltip,
  getActionErrorMessage,
  getActiveEntityId,
  normalizeApiList,
  optionLabel,
} from './paymentShared.jsx';

const API = {
  methods: 'compta/payment-methods/',
  methodLines: 'compta/payment-method-lines/',
  accounts: 'compta/accounts/',
  journals: 'compta/journals/',
};

const METHOD_DIRECTION_OPTIONS = [
  { id: 'both', label: 'Les deux' },
  { id: 'inbound', label: 'Encaissement seulement' },
  { id: 'outbound', label: 'Décaissement seulement' },
];

const LINE_PAYMENT_TYPE_OPTIONS = [
  { id: 'inbound', label: 'Entrant' },
  { id: 'outbound', label: 'Sortant' },
];

const LINE_TAB_FIELDS = ['name', 'journal', 'payment_type', 'payment_account', 'sequence'];

const emptyMethod = () => ({
  id: null,
  name: '',
  code: '',
  payment_type: 'both',
  active: true,
  outstanding_receipts_account_id: '',
  outstanding_payments_account_id: '',
});

const emptyLine = () => ({
  id: `tmp-${Date.now()}-${Math.random()}`,
  name: '',
  code: '',
  journal: '',
  payment_account: '',
  payment_type: 'inbound',
  sequence: 10,
  payment_provider_id: '',
  payment_provider_state: '',
});

export default function PaymentMethodForm({ mode = 'create' }) {
  const navigate = useNavigate();
  const { id } = useParams();
  const actionsMenuRef = useRef(null);
  const isDetail = mode === 'detail';
  const [formData, setFormData] = useState(emptyMethod());
  const [lineDrafts, setLineDrafts] = useState([emptyLine()]);
  const [accounts, setAccounts] = useState([]);
  const [journals, setJournals] = useState([]);
  const [methodLines, setMethodLines] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const treasuryJournals = useMemo(() => journals.filter((journal) => {
    const typeText = [journal.type_code, journal.journal_type, journal.type, journal.type_name, journal.code, journal.name].filter(Boolean).join(' ').toLowerCase();
    return journal.is_bank_or_cash_flag || typeText.includes('ban') || typeText.includes('bank') || typeText.includes('cai') || typeText.includes('cash') || typeText.includes('caisse');
  }), [journals]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const entityId = getActiveEntityId();
      const [accountsResponse, journalsResponse, linesResponse, methodResponse] = await Promise.all([
        axiosInstance.get(API.accounts, { params: { company: entityId || undefined, exclude_roots: true, page_size: 1000 } }).catch(() => ({ data: [] })),
        axiosInstance.get(API.journals, { params: { company: entityId || undefined, page_size: 500 } }).catch(() => ({ data: [] })),
        axiosInstance.get(API.methodLines, { params: { company: entityId || undefined, page_size: 1000 } }).catch(() => ({ data: [] })),
        isDetail ? axiosInstance.get(`${API.methods}${id}/`) : Promise.resolve({ data: null }),
      ]);

      const nextLines = normalizeApiList(linesResponse.data);
      setAccounts(normalizeApiList(accountsResponse.data));
      setJournals(normalizeApiList(journalsResponse.data));
      setMethodLines(nextLines);

      if (methodResponse.data) {
        const method = methodResponse.data;
        setFormData({
          id: method.id,
          name: method.name || '',
          code: method.code || '',
          payment_type: method.payment_type || 'both',
          active: method.active !== false,
          outstanding_receipts_account_id: method.outstanding_receipts_account_id || method.outstanding_receipts_account?.id || '',
          outstanding_payments_account_id: method.outstanding_payments_account_id || method.outstanding_payments_account?.id || '',
        });
        const existingLines = nextLines.filter((line) => String(line.payment_method) === String(method.id) || String(line.payment_method_id) === String(method.id));
        setLineDrafts(existingLines.length ? existingLines.map((line) => ({
          ...line,
          journal: line.journal || line.journal_id || '',
          payment_account: line.payment_account || line.payment_account_id || '',
        })) : [emptyLine()]);
      }
      setHasChanges(false);
    } catch (err) {
      setError(isDetail ? 'Impossible de charger la méthode.' : 'Impossible de préparer la création.');
      console.error('Erreur chargement méthode paiement', err);
    } finally {
      setLoading(false);
    }
  }, [id, isDetail]);

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

  const markAsChanged = () => {
    setHasChanges(true);
    setSuccess('');
    setError('');
  };

  const setField = (field, value) => {
    setFormData((previous) => ({ ...previous, [field]: value }));
    markAsChanged();
  };

  const updateLine = (index, field, value) => {
    setLineDrafts((previous) => previous.map((line, lineIndex) => lineIndex === index ? { ...line, [field]: value } : line));
    markAsChanged();
  };

  const focusLineCell = useCallback((lineId, field) => {
    setTimeout(() => {
      const selector = `tr[data-method-line-id="${lineId}"] td[data-method-field="${field}"] input:not([disabled])`;
      document.querySelector(selector)?.focus();
    }, 40);
  }, []);

  const handleLineTab = useCallback((event, lineIndex, field) => {
    if (event.key !== 'Tab' || event.shiftKey) return;
    const fieldIndex = LINE_TAB_FIELDS.indexOf(field);
    if (fieldIndex === -1) return;

    event.preventDefault();
    const nextField = LINE_TAB_FIELDS[fieldIndex + 1];
    const currentLine = lineDrafts[lineIndex];

    if (nextField && currentLine) {
      focusLineCell(currentLine.id, nextField);
      return;
    }

    const nextLine = lineDrafts[lineIndex + 1];
    if (nextLine) {
      focusLineCell(nextLine.id, LINE_TAB_FIELDS[0]);
      return;
    }

    const newLine = emptyLine();
    setLineDrafts((previous) => [...previous, newLine]);
    markAsChanged();
    focusLineCell(newLine.id, LINE_TAB_FIELDS[0]);
  }, [focusLineCell, lineDrafts]);

  const saveLines = async (methodId) => {
    const entityId = getActiveEntityId();
    const existingIds = methodLines
      .filter((line) => String(line.payment_method) === String(methodId) || String(line.payment_method_id) === String(methodId))
      .map((line) => line.id);

    await Promise.all(lineDrafts.map((line) => {
      const payload = {
        company: entityId || null,
        payment_method: methodId,
        name: line.name || '',
        code: line.code || '',
        journal: line.journal || null,
        payment_account: line.payment_account || null,
        payment_type: line.payment_type || 'inbound',
        sequence: Number(line.sequence || 10),
        payment_provider_id: line.payment_provider_id || '',
        payment_provider_state: line.payment_provider_state || '',
      };
      if (typeof line.id === 'number') return axiosInstance.patch(`${API.methodLines}${line.id}/`, payload);
      return axiosInstance.post(API.methodLines, payload);
    }));

    const keptIds = lineDrafts.filter((line) => typeof line.id === 'number').map((line) => line.id);
    await Promise.all(existingIds.filter((lineId) => !keptIds.includes(lineId)).map((lineId) => axiosInstance.delete(`${API.methodLines}${lineId}/`).catch(() => null)));
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      setError('Le nom de la méthode est obligatoire.');
      return false;
    }
    setSaving(true);
    setError('');
    try {
      const entityId = getActiveEntityId();
      const payload = {
        name: formData.name,
        code: formData.code || '',
        payment_type: formData.payment_type || 'both',
        active: !!formData.active,
        company_id: entityId || null,
        outstanding_receipts_account_id: formData.outstanding_receipts_account_id || null,
        outstanding_payments_account_id: formData.outstanding_payments_account_id || null,
      };
      const response = isDetail
        ? await axiosInstance.patch(`${API.methods}${id}/`, payload)
        : await axiosInstance.post(API.methods, payload);
      await saveLines(response.data.id);
      setSuccess('Méthode de paiement enregistrée.');
      setHasChanges(false);
      if (!isDetail) navigate('/comptabilite/methodes-paiement');
      else await loadData();
      return true;
    } catch (err) {
      setError(`Échec enregistrement : ${getActionErrorMessage(err, 'Échec enregistrement de la méthode.')}`);
      console.error('Erreur sauvegarde méthode paiement', err);
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!isDetail || !id) return;
    setSaving(true);
    setError('');
    try {
      await axiosInstance.delete(`${API.methods}${id}/`);
      navigate('/comptabilite/methodes-paiement');
    } catch (err) {
      setError(`Échec suppression : ${getActionErrorMessage(err, 'Impossible de supprimer cette méthode.')}`);
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (hasChanges) setShowConfirmDialog(true);
    else navigate('/comptabilite/methodes-paiement');
  };

  const discardChanges = () => {
    setShowConfirmDialog(false);
    navigate('/comptabilite/methodes-paiement');
  };

  const title = isDetail ? 'Méthodes de paiement' : 'Nouvelle méthode';
  const subtitle = formData.name || (isDetail ? `Méthode #${id}` : 'Méthode de paiement');

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="mx-auto max-w-7xl border border-gray-300 bg-white">
        <div className="border-b border-gray-300 px-4 py-2">
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-shrink-0 items-center gap-3">
              <Tooltip text="Nouvelle méthode">
                <button onClick={() => navigate('/comptabilite/methodes-paiement/create')} className="flex h-8 items-center gap-1 rounded bg-purple-600 px-3 text-xs font-medium text-white transition-all duration-200 hover:scale-105 hover:bg-purple-700">
                  <FiPlus size={12} />Nouveau
                </button>
              </Tooltip>
              <div className="leading-tight">
                <h1 onClick={() => navigate('/comptabilite/methodes-paiement')} className="cursor-pointer text-lg font-bold text-gray-900 hover:text-purple-600">{title}</h1>
                <span className="text-xs text-gray-600">{subtitle}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative" ref={actionsMenuRef}>
                <Tooltip text="Menu des actions">
                  <button onClick={() => setShowActionsMenu((previous) => !previous)} className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-300 text-gray-700 transition-all duration-200 hover:scale-110 hover:bg-gray-50 hover:shadow-md active:scale-90">
                    <FiSettings size={14} />
                  </button>
                </Tooltip>
                {showActionsMenu && (
                  <div className="absolute right-0 z-50 mt-1 w-56 rounded-sm border border-gray-300 bg-white shadow-lg">
                    <button onClick={() => navigate('/comptabilite/methodes-paiement')} className="w-full px-3 py-2 text-left text-xs hover:bg-gray-50">Liste des méthodes</button>
                    <button onClick={() => navigate('/comptabilite/conditions-paiement')} className="w-full px-3 py-2 text-left text-xs hover:bg-gray-50">Conditions de paiement</button>
                    <button onClick={() => navigate('/comptabilite/paiements')} className="w-full px-3 py-2 text-left text-xs hover:bg-gray-50">Paiements</button>
                  </div>
                )}
              </div>
              {isDetail && (
                <HeaderIconButton tooltip="Supprimer" onClick={handleDelete} disabled={saving} className="border border-red-200 bg-red-50 text-red-700 hover:bg-red-100">
                  <FiTrash2 size={15} />
                </HeaderIconButton>
              )}
              <HeaderIconButton tooltip="Enregistrer" onClick={handleSave} disabled={saving || !hasChanges} className="bg-purple-600 text-white hover:bg-purple-700">
                <FiUploadCloud size={16} />
              </HeaderIconButton>
              <HeaderIconButton tooltip="Fermer" onClick={handleClose} className="bg-black text-white hover:bg-gray-800">
                <FiX size={16} />
              </HeaderIconButton>
            </div>
          </div>
        </div>

        {(error || success) && (
          <div className={`border-b border-gray-300 px-4 py-2 text-xs ${error ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
            <div className="flex items-start gap-2">{error ? <FiAlertCircle size={14} /> : <FiCheck size={14} />}{error || success}</div>
          </div>
        )}

        {loading ? (
          <div className="p-8 text-center text-sm text-gray-500">Chargement...</div>
        ) : (
          <>
            <div className="space-y-4 p-4">
              <section className="border border-gray-300">
                <div className="border-b border-gray-300 bg-gray-100 px-3 py-2 text-xs font-semibold text-gray-700">Informations</div>
                <div className="grid grid-cols-1 gap-3 p-3 lg:grid-cols-2">
                  <Field label="Nom" required>
                    <input value={formData.name} onChange={(event) => setField('name', event.target.value)} className="h-[26px] w-full border border-gray-300 bg-white px-2 text-xs outline-none focus:ring-1 focus:ring-blue-500" />
                  </Field>
                  <Field label="Code">
                    <input value={formData.code} onChange={(event) => setField('code', event.target.value)} className="h-[26px] w-full border border-gray-300 bg-white px-2 text-xs outline-none focus:ring-1 focus:ring-blue-500" />
                  </Field>
                  <Field label="Direction">
                    <SearchSelect value={formData.payment_type} onChange={(value) => setField('payment_type', value)} options={METHOD_DIRECTION_OPTIONS} getLabel={(option) => option.label} placeholder="Direction" />
                  </Field>
                  <Field label="Actif">
                    <StatusSwitch checked={formData.active} onChange={(value) => setField('active', value)} />
                  </Field>
                </div>
              </section>

              <section className="border border-gray-300">
                  <div className="border-b border-gray-300 bg-gray-100 px-3 py-2 text-xs font-semibold text-gray-700">Comptes d'attente</div>
                  <div className="grid grid-cols-1 gap-3 p-3 md:grid-cols-2">
                    <Field label="Compte attente encaissements">
                      <SearchSelect value={formData.outstanding_receipts_account_id} onChange={(value) => setField('outstanding_receipts_account_id', value)} options={accounts} getLabel={(account) => optionLabel(account)} placeholder="Compte" />
                    </Field>
                    <Field label="Compte attente décaissements">
                      <SearchSelect value={formData.outstanding_payments_account_id} onChange={(value) => setField('outstanding_payments_account_id', value)} options={accounts} getLabel={(account) => optionLabel(account)} placeholder="Compte" />
                    </Field>
                  </div>
              </section>

              <section className="border border-gray-300">
                  <div className="flex items-center justify-between border-b border-gray-300 bg-gray-100 px-3 py-2">
                    <div className="text-xs font-semibold text-gray-700">Lignes par journal</div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="border border-gray-300 px-2 py-1.5 text-left text-xs font-medium text-gray-700" style={{ minWidth: '150px' }}>Nom</th>
                          <th className="border border-gray-300 px-2 py-1.5 text-left text-xs font-medium text-gray-700" style={{ minWidth: '170px' }}>Journal</th>
                          <th className="border border-gray-300 px-2 py-1.5 text-left text-xs font-medium text-gray-700" style={{ minWidth: '130px' }}>Type</th>
                          <th className="border border-gray-300 px-2 py-1.5 text-left text-xs font-medium text-gray-700" style={{ minWidth: '190px' }}>Compte</th>
                          <th className="border border-gray-300 px-2 py-1.5 text-left text-xs font-medium text-gray-700" style={{ minWidth: '80px' }}>Seq.</th>
                          <th className="border border-gray-300 px-2 py-1.5 text-center text-xs font-medium text-gray-700" style={{ width: '40px' }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {lineDrafts.map((line, index) => (
                          <tr key={line.id} data-method-line-id={line.id}>
                            <td data-method-field="name" onKeyDown={(event) => handleLineTab(event, index, 'name')} className="border border-gray-300 p-1" style={{ minWidth: '150px' }}><input value={line.name || ''} onChange={(event) => updateLine(index, 'name', event.target.value)} className="h-[26px] w-full border-0 px-2 text-xs outline-none focus:ring-1 focus:ring-blue-500" /></td>
                            <td data-method-field="journal" onKeyDown={(event) => handleLineTab(event, index, 'journal')} className="border border-gray-300 p-1" style={{ minWidth: '170px' }}><SearchSelect bordered={false} value={line.journal} onChange={(value) => updateLine(index, 'journal', value)} options={treasuryJournals.length ? treasuryJournals : journals} getLabel={(journal) => optionLabel(journal)} placeholder="Journal" /></td>
                            <td data-method-field="payment_type" onKeyDown={(event) => handleLineTab(event, index, 'payment_type')} className="border border-gray-300 p-1" style={{ minWidth: '130px' }}><SearchSelect bordered={false} value={line.payment_type || 'inbound'} onChange={(value) => updateLine(index, 'payment_type', value)} options={LINE_PAYMENT_TYPE_OPTIONS} getLabel={(option) => option.label} placeholder="Type" /></td>
                            <td data-method-field="payment_account" onKeyDown={(event) => handleLineTab(event, index, 'payment_account')} className="border border-gray-300 p-1" style={{ minWidth: '190px' }}><SearchSelect bordered={false} value={line.payment_account} onChange={(value) => updateLine(index, 'payment_account', value)} options={accounts} getLabel={(account) => optionLabel(account)} placeholder="Compte" /></td>
                            <td data-method-field="sequence" onKeyDown={(event) => handleLineTab(event, index, 'sequence')} className="border border-gray-300 p-1" style={{ minWidth: '80px' }}><input type="number" value={line.sequence || 10} onChange={(event) => updateLine(index, 'sequence', event.target.value)} className="h-[26px] w-full border-0 px-2 text-right text-xs outline-none focus:ring-1 focus:ring-blue-500" /></td>
                            <td className="border border-gray-300 p-1 text-center" style={{ width: '40px' }}><button onClick={() => { setLineDrafts((previous) => previous.filter((_, lineIndex) => lineIndex !== index)); markAsChanged(); }} className="flex h-[26px] w-full items-center justify-center text-gray-400 transition-colors hover:text-red-600"><FiTrash2 size={14} /></button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex items-center gap-4 px-3 py-3">
                    <Tooltip text="Ajouter une ligne de journal">
                      <button onClick={() => { setLineDrafts((previous) => [...previous, emptyLine()]); markAsChanged(); }} className="flex h-8 items-center gap-1 bg-purple-600 px-3 text-xs text-white transition-all hover:bg-purple-700">
                        <FiPlus size={12} /><span>Ajouter une ligne</span>
                      </button>
                    </Tooltip>
                  </div>
              </section>
            </div>
          </>
        )}
      </div>

      {showConfirmDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="mx-4 w-full max-w-md rounded-sm bg-white p-6 shadow-lg">
            <h3 className="mb-3 text-lg font-bold text-gray-900">Modifications non sauvegardées</h3>
            <p className="mb-6 text-sm text-gray-600">Voulez-vous enregistrer les modifications avant de quitter ?</p>
            <div className="flex justify-end gap-3">
              <button onClick={async () => { setShowConfirmDialog(false); const ok = await handleSave(); if (ok) navigate('/comptabilite/methodes-paiement'); }} className="bg-purple-600 px-4 py-2 text-sm text-white hover:bg-purple-700">Enregistrer</button>
              <button onClick={discardChanges} className="bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700">Ne pas enregistrer</button>
              <button onClick={() => setShowConfirmDialog(false)} className="border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Annuler</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
