import { useCallback, useEffect, useRef, useState } from 'react';
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
  HeaderIconButton,
  SearchSelect,
  StatusSwitch,
  Tooltip,
  getActionErrorMessage,
  getActiveEntityId,
  normalizeApiList,
} from './paymentShared.jsx';

const API = {
  terms: 'compta/payment-terms/',
  termLines: 'compta/payment-term-lines/',
};

const TERM_LINE_VALUE_OPTIONS = [
  { id: 'percent', label: 'Pourcentage' },
  { id: 'fixed', label: 'Montant fixe' },
  { id: 'balance', label: 'Solde' },
];

const TERM_LINE_TAB_FIELDS = [
  'value',
  'value_amount',
  'months',
  'days',
  'days_after',
  'end_month',
  'discount_percentage',
  'discount_days',
];

const emptyTerm = () => ({
  id: null,
  name: '',
  sequence: 10,
  active: true,
  display_on_invoice: false,
  note: '',
  example_amount: '',
  example_date: '',
  example_preview: '',
});

const emptyLine = () => ({
  id: `tmp-${Date.now()}-${Math.random()}`,
  value: 'percent',
  value_amount: 100,
  days: 0,
  days_after: 0,
  months: 0,
  end_month: false,
  discount_percentage: '',
  discount_days: 0,
});

export default function PaymentTermForm({ mode = 'create' }) {
  const navigate = useNavigate();
  const { id } = useParams();
  const actionsMenuRef = useRef(null);
  const isDetail = mode === 'detail';
  const [formData, setFormData] = useState(emptyTerm());
  const [lineDrafts, setLineDrafts] = useState([emptyLine()]);
  const [lines, setLines] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const [activeTab, setActiveTab] = useState('echeances');
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [linesResponse, termResponse] = await Promise.all([
        axiosInstance.get(API.termLines, { params: { page_size: 1000 } }).catch(() => ({ data: [] })),
        isDetail ? axiosInstance.get(`${API.terms}${id}/`) : Promise.resolve({ data: null }),
      ]);
      const nextLines = normalizeApiList(linesResponse.data);
      setLines(nextLines);

      if (termResponse.data) {
        const term = termResponse.data;
        setFormData({
          id: term.id,
          name: term.name || '',
          sequence: term.sequence ?? 10,
          active: term.active !== false,
          display_on_invoice: !!term.display_on_invoice,
          note: term.note || '',
          example_amount: term.example_amount || '',
          example_date: term.example_date || '',
          example_preview: term.example_preview || '',
        });
        const existingLines = nextLines.filter((line) => String(line.payment) === String(term.id) || String(line.payment_id) === String(term.id));
        setLineDrafts(existingLines.length ? existingLines.map((line) => ({ ...line })) : [emptyLine()]);
      }
      setHasChanges(false);
    } catch (err) {
      setError(isDetail ? 'Impossible de charger la condition.' : 'Impossible de préparer la création.');
      console.error('Erreur chargement condition paiement', err);
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

  const focusLineCell = (lineId, field) => {
    window.setTimeout(() => {
      const cell = document.querySelector(`[data-term-line-id="${lineId}"] [data-term-field="${field}"]`);
      const focusable = cell?.querySelector('button, input, select, textarea, [tabindex]:not([tabindex="-1"])');
      focusable?.focus();
    }, 0);
  };

  const handleLineTab = (event, index, field) => {
    if (event.key !== 'Tab' || event.shiftKey) return;
    event.preventDefault();

    const fieldIndex = TERM_LINE_TAB_FIELDS.indexOf(field);
    const currentLine = lineDrafts[index];
    const nextField = TERM_LINE_TAB_FIELDS[fieldIndex + 1];

    if (nextField) {
      focusLineCell(currentLine.id, nextField);
      return;
    }

    const nextLine = lineDrafts[index + 1];
    if (nextLine) {
      focusLineCell(nextLine.id, TERM_LINE_TAB_FIELDS[0]);
      return;
    }

    const newLine = emptyLine();
    setLineDrafts((previous) => [...previous, newLine]);
    markAsChanged();
    focusLineCell(newLine.id, TERM_LINE_TAB_FIELDS[0]);
  };

  const saveLines = async (termId) => {
    const existingIds = lines
      .filter((line) => String(line.payment) === String(termId) || String(line.payment_id) === String(termId))
      .map((line) => line.id);

    await Promise.all(lineDrafts.map((line) => {
      const payload = {
        payment: termId,
        value: line.value || 'percent',
        value_amount: line.value_amount === '' ? null : Number(line.value_amount || 0),
        days: Number(line.days || 0),
        days_after: Number(line.days_after || 0),
        months: Number(line.months || 0),
        end_month: !!line.end_month,
        discount_percentage: line.discount_percentage === '' ? null : Number(line.discount_percentage || 0),
        discount_days: Number(line.discount_days || 0),
      };
      if (typeof line.id === 'number') return axiosInstance.patch(`${API.termLines}${line.id}/`, payload);
      return axiosInstance.post(API.termLines, payload);
    }));

    const keptIds = lineDrafts.filter((line) => typeof line.id === 'number').map((line) => line.id);
    await Promise.all(existingIds.filter((lineId) => !keptIds.includes(lineId)).map((lineId) => axiosInstance.delete(`${API.termLines}${lineId}/`).catch(() => null)));
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      setError('Le nom de la condition est obligatoire.');
      return false;
    }
    setSaving(true);
    setError('');
    try {
      const entityId = getActiveEntityId();
      const payload = {
        name: formData.name,
        sequence: Number(formData.sequence || 10),
        active: !!formData.active,
        display_on_invoice: !!formData.display_on_invoice,
        note: formData.note || '',
        example_amount: formData.example_amount || null,
        example_date: formData.example_date || null,
        example_preview: formData.example_preview || '',
        company: entityId || null,
      };
      const response = isDetail
        ? await axiosInstance.patch(`${API.terms}${id}/`, payload)
        : await axiosInstance.post(API.terms, payload);
      await saveLines(response.data.id);
      setSuccess('Condition de paiement enregistrée.');
      setHasChanges(false);
      if (!isDetail) navigate('/comptabilite/conditions-paiement');
      else await loadData();
      return true;
    } catch (err) {
      setError(`Échec enregistrement : ${getActionErrorMessage(err, 'Échec enregistrement de la condition.')}`);
      console.error('Erreur sauvegarde condition paiement', err);
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
      await axiosInstance.delete(`${API.terms}${id}/`);
      navigate('/comptabilite/conditions-paiement');
    } catch (err) {
      setError(`Échec suppression : ${getActionErrorMessage(err, 'Impossible de supprimer cette condition.')}`);
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (hasChanges) setShowConfirmDialog(true);
    else navigate('/comptabilite/conditions-paiement');
  };

  const discardChanges = () => {
    setShowConfirmDialog(false);
    navigate('/comptabilite/conditions-paiement');
  };

  const title = isDetail ? 'Conditions de paiement' : 'Nouvelle condition';
  const subtitle = formData.name || (isDetail ? `Condition #${id}` : 'Condition de paiement');

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="mx-auto max-w-7xl border border-gray-300 bg-white">
        <div className="border-b border-gray-300 px-4 py-2">
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-shrink-0 items-center gap-3">
              <Tooltip text="Nouvelle condition">
                <button onClick={() => navigate('/comptabilite/conditions-paiement/create')} className="flex h-8 items-center gap-1 rounded bg-purple-600 px-3 text-xs font-medium text-white transition-all duration-200 hover:scale-105 hover:bg-purple-700">
                  <FiPlus size={12} />Nouveau
                </button>
              </Tooltip>
              <div className="leading-tight">
                <h1 onClick={() => navigate('/comptabilite/conditions-paiement')} className="cursor-pointer text-lg font-bold text-gray-900 hover:text-purple-600">{title}</h1>
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
                    <button onClick={() => navigate('/comptabilite/conditions-paiement')} className="w-full px-3 py-2 text-left text-xs hover:bg-gray-50">Liste des conditions</button>
                    <button onClick={() => navigate('/comptabilite/methodes-paiement')} className="w-full px-3 py-2 text-left text-xs hover:bg-gray-50">Méthodes de paiement</button>
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
                <div className="grid grid-cols-1 gap-3 p-3 md:grid-cols-2 lg:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700">Nom <span className="text-red-500">*</span></label>
                    <input value={formData.name} onChange={(event) => setField('name', event.target.value)} className="h-[30px] w-full border border-gray-300 px-2 text-xs outline-none focus:ring-1 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700">Séquence</label>
                    <input type="number" value={formData.sequence} onChange={(event) => setField('sequence', event.target.value)} className="h-[30px] w-full border border-gray-300 px-2 text-xs outline-none focus:ring-1 focus:ring-blue-500" />
                  </div>
                  <div className="flex items-end gap-6 pb-1">
                    <label className="flex items-center gap-2 text-xs text-gray-700">
                      <StatusSwitch checked={formData.active} onChange={(value) => setField('active', value)} />
                      Actif
                    </label>
                    <label className="flex items-center gap-2 text-xs text-gray-700">
                      <StatusSwitch checked={formData.display_on_invoice} onChange={(value) => setField('display_on_invoice', value)} />
                      Afficher sur facture
                    </label>
                  </div>
                </div>
              </section>

              <section className="border border-gray-300">
                <div className="border-b border-gray-300 bg-gray-100 px-3 py-2 text-xs font-semibold text-gray-700">Exemple</div>
                <div className="grid grid-cols-1 gap-3 p-3 md:grid-cols-2 lg:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700">Montant exemple</label>
                    <input type="number" value={formData.example_amount || ''} onChange={(event) => setField('example_amount', event.target.value)} className="h-[30px] w-full border border-gray-300 px-2 text-xs outline-none focus:ring-1 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700">Date exemple</label>
                    <input type="date" value={formData.example_date || ''} onChange={(event) => setField('example_date', event.target.value)} className="h-[30px] w-full border border-gray-300 px-2 text-xs outline-none focus:ring-1 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700">Aperçu</label>
                    <input value={formData.example_preview || ''} onChange={(event) => setField('example_preview', event.target.value)} className="h-[30px] w-full border border-gray-300 px-2 text-xs outline-none focus:ring-1 focus:ring-blue-500" />
                  </div>
                </div>
              </section>

              <section>
                <div className="border-b border-gray-300">
                  <div className="flex px-4">
                    {[
                      { key: 'echeances', label: 'Échéances' },
                      { key: 'notes', label: 'Notes' },
                    ].map((tab) => (
                      <button
                        key={tab.key}
                        type="button"
                        onClick={() => setActiveTab(tab.key)}
                        className={`border-b-2 px-4 py-2 text-xs font-medium transition-all ${
                          activeTab === tab.key
                            ? 'border-purple-600 text-purple-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                {activeTab === 'echeances' && (
                  <div className="p-4">
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[980px] border-collapse">
                        <thead>
                          <tr className="bg-gray-100">
                            <th className="w-[150px] border border-gray-300 px-2 py-1.5 text-left text-xs">Type</th>
                            <th className="w-[110px] border border-gray-300 px-2 py-1.5 text-right text-xs">Valeur</th>
                            <th className="w-[90px] border border-gray-300 px-2 py-1.5 text-right text-xs">Mois</th>
                            <th className="w-[90px] border border-gray-300 px-2 py-1.5 text-right text-xs">Jours</th>
                            <th className="w-[110px] border border-gray-300 px-2 py-1.5 text-right text-xs">Jours après</th>
                            <th className="w-[90px] border border-gray-300 px-2 py-1.5 text-center text-xs">Fin mois</th>
                            <th className="w-[110px] border border-gray-300 px-2 py-1.5 text-right text-xs">% remise</th>
                            <th className="w-[110px] border border-gray-300 px-2 py-1.5 text-right text-xs">Jours remise</th>
                            <th className="w-[42px] border border-gray-300 px-2 py-1.5 text-center text-xs"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {lineDrafts.map((line, index) => (
                            <tr key={line.id} data-term-line-id={line.id}>
                              <td data-term-field="value" onKeyDown={(event) => handleLineTab(event, index, 'value')} className="border border-gray-300 p-1">
                                <SearchSelect bordered={false} value={line.value || 'percent'} onChange={(value) => updateLine(index, 'value', value)} options={TERM_LINE_VALUE_OPTIONS} getLabel={(option) => option.label} placeholder="Type" />
                              </td>
                              <td data-term-field="value_amount" onKeyDown={(event) => handleLineTab(event, index, 'value_amount')} className="border border-gray-300 p-1">
                                <input type="number" value={line.value_amount ?? ''} onChange={(event) => updateLine(index, 'value_amount', event.target.value)} className="h-[26px] w-full border-0 bg-transparent text-right text-xs outline-none" />
                              </td>
                              <td data-term-field="months" onKeyDown={(event) => handleLineTab(event, index, 'months')} className="border border-gray-300 p-1">
                                <input type="number" value={line.months || 0} onChange={(event) => updateLine(index, 'months', event.target.value)} className="h-[26px] w-full border-0 bg-transparent text-right text-xs outline-none" />
                              </td>
                              <td data-term-field="days" onKeyDown={(event) => handleLineTab(event, index, 'days')} className="border border-gray-300 p-1">
                                <input type="number" value={line.days || 0} onChange={(event) => updateLine(index, 'days', event.target.value)} className="h-[26px] w-full border-0 bg-transparent text-right text-xs outline-none" />
                              </td>
                              <td data-term-field="days_after" onKeyDown={(event) => handleLineTab(event, index, 'days_after')} className="border border-gray-300 p-1">
                                <input type="number" value={line.days_after || 0} onChange={(event) => updateLine(index, 'days_after', event.target.value)} className="h-[26px] w-full border-0 bg-transparent text-right text-xs outline-none" />
                              </td>
                              <td data-term-field="end_month" onKeyDown={(event) => handleLineTab(event, index, 'end_month')} className="border border-gray-300 p-1 text-center">
                                <input type="checkbox" checked={!!line.end_month} onChange={(event) => updateLine(index, 'end_month', event.target.checked)} />
                              </td>
                              <td data-term-field="discount_percentage" onKeyDown={(event) => handleLineTab(event, index, 'discount_percentage')} className="border border-gray-300 p-1">
                                <input type="number" value={line.discount_percentage ?? ''} onChange={(event) => updateLine(index, 'discount_percentage', event.target.value)} className="h-[26px] w-full border-0 bg-transparent text-right text-xs outline-none" />
                              </td>
                              <td data-term-field="discount_days" onKeyDown={(event) => handleLineTab(event, index, 'discount_days')} className="border border-gray-300 p-1">
                                <input type="number" value={line.discount_days || 0} onChange={(event) => updateLine(index, 'discount_days', event.target.value)} className="h-[26px] w-full border-0 bg-transparent text-right text-xs outline-none" />
                              </td>
                              <td className="border border-gray-300 p-1 text-center">
                                <button type="button" onClick={() => { setLineDrafts((previous) => previous.filter((_, lineIndex) => lineIndex !== index)); markAsChanged(); }} className="rounded p-1 text-red-600 hover:bg-red-50">
                                  <FiTrash2 size={13} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setLineDrafts((previous) => [...previous, emptyLine()]); markAsChanged(); }}
                      className="mt-3 flex h-7 items-center gap-1 bg-purple-600 px-3 text-xs text-white hover:bg-purple-700"
                    >
                      <FiPlus size={12} />Ajouter une ligne
                    </button>
                  </div>
                )}

                {activeTab === 'notes' && (
                  <div className="p-4">
                    <textarea value={formData.note || ''} onChange={(event) => setField('note', event.target.value)} rows={7} className="w-full border border-gray-300 px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-500" placeholder="Notes..." />
                  </div>
                )}
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
              <button onClick={async () => { setShowConfirmDialog(false); const ok = await handleSave(); if (ok) navigate('/comptabilite/conditions-paiement'); }} className="bg-purple-600 px-4 py-2 text-sm text-white hover:bg-purple-700">Enregistrer</button>
              <button onClick={discardChanges} className="bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700">Ne pas enregistrer</button>
              <button onClick={() => setShowConfirmDialog(false)} className="border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Annuler</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
