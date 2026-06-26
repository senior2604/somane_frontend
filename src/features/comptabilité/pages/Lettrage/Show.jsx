// C:\Users\IBM\Documents\somane_frontend\src\features\comptabilité\pages\Lettrage\Show.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  FiArrowLeft, FiEdit2, FiSave, FiTrash2, FiCheck, FiAlertCircle, FiX,
  FiSettings,FiInfo
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
// COMPOSANT AMOUNT INPUT (LOCAL)
// ==========================================
const AmountInput = ({ value, onChange, placeholder = "0", className = "" }) => {
  const [displayValue, setDisplayValue] = useState('');
  const formatNumberWithSpace = (num) => {
    if (num === '' || num === null || num === undefined) return '';
    const number = typeof num === 'string' ? parseFloat(num.replace(/\s/g, '')) : num;
    if (isNaN(number)) return '';
    return Math.round(number).toLocaleString('fr-FR');
  };
  useEffect(() => { if (value !== '' && value !== null && value !== undefined) setDisplayValue(formatNumberWithSpace(value)); else setDisplayValue(''); }, [value]);
  const handleChange = (e) => {
    let rawValue = e.target.value;
    let cleanValue = rawValue.replace(/\s/g, '').replace(/[^\d,.-]/g, '').replace(',', '.');
    const numberMatch = cleanValue.match(/[\d.-]+/);
    if (numberMatch) { const number = parseFloat(numberMatch[0]); if (!isNaN(number)) { setDisplayValue(formatNumberWithSpace(number)); onChange(number); return; } }
    setDisplayValue(''); onChange('');
  };
  const handleBlur = () => { if (value !== '' && value !== null && value !== undefined) setDisplayValue(formatNumberWithSpace(value)); };
  const handleFocus = (e) => { if (value !== '' && value !== null && value !== undefined) e.target.value = value.toString(); };
  return (<input type="text" value={displayValue} onChange={handleChange} onBlur={handleBlur} onFocus={handleFocus} className={`w-full px-2 py-1 border-0 text-xs text-right focus:ring-1 focus:ring-purple-500 ${className}`} style={{ height: '26px' }} placeholder={placeholder} />);
};

// ==========================================
// COMPOSANT PRINCIPAL
// ==========================================
export default function LettrageShow() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { activeEntity } = useEntity();

  const [reconciliation, setReconciliation] = useState(null);
  const [lines, setLines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editComment, setEditComment] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const loadReconciliation = useCallback(async () => {
    if (!activeEntity?.id || !id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await lettrageService.getById(id, activeEntity.id);
      setReconciliation(data);
      setEditComment(data.comment || '');
      setEditAmount(data.amount || data.total_amount || '');
      if (data.lines) setLines(data.lines);
      else if (data.move_lines) setLines(data.move_lines);
      else setLines([]);
    } catch (err) { setError('Impossible de charger les détails du lettrage.'); }
    finally { setLoading(false); }
  }, [activeEntity, id]);

  useEffect(() => { if (activeEntity?.id && id) loadReconciliation(); }, [activeEntity, id, loadReconciliation]);

  const handleEditToggle = () => {
    if (isEditing) { setEditComment(reconciliation.comment || ''); setEditAmount(reconciliation.amount || reconciliation.total_amount || ''); setIsEditing(false); }
    else setIsEditing(true);
  };

  const handleSaveChanges = async () => {
    if (!reconciliation) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await lettrageService.update(reconciliation.id, { comment: editComment, amount: editAmount ? parseFloat(editAmount) : undefined }, activeEntity.id);
      setSuccess('Modifications enregistrées.');
      setIsEditing(false);
      loadReconciliation();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) { setError(`Erreur sauvegarde : ${err?.response?.data?.detail || err.message}`); }
    finally { setIsSubmitting(false); }
  };

  const handleDeleteConfirm = async () => {
    if (!reconciliation) return;
    setIsSubmitting(true);
    try {
      await lettrageService.delete(reconciliation.id, activeEntity.id);
      setSuccess('Lettrage annulé avec succès.');
      setShowDeleteModal(false);
      setTimeout(() => navigate('/comptabilite/lettrage'), 1500);
    } catch (err) { setError(`Erreur annulation : ${err?.response?.data?.detail || err.message}`); }
    finally { setIsSubmitting(false); }
  };

  const formatAmount = (amount) => {
    if (amount === null || amount === undefined || amount === '') return '0,00';
    return Math.abs(parseFloat(amount)).toLocaleString('fr-FR', { minimumFractionDigits: 2 });
  };

  const getBadgeClass = (type) => {
    if (type === 'full') return 'bg-green-100 text-green-800';
    if (type === 'partial') return 'bg-amber-100 text-amber-800';
    return 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (<div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="text-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div><p className="mt-4 text-gray-600">Chargement...</p></div></div>);
  }

  if (!reconciliation) {
    return (<div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="bg-red-50 border border-red-200 p-6 rounded text-center max-w-md"><FiAlertCircle className="text-red-600 mx-auto mb-3" size={32} /><p className="text-red-800 font-medium">Lettrage introuvable</p><button onClick={() => navigate('/comptabilite/lettrage')} className="mt-4 text-sm text-red-600 hover:underline">Retour à la liste</button></div></div>);
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto bg-white border border-gray-300">

        {/* En-tête */}
        <div className="border-b border-gray-300 px-4 py-3">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-start gap-3">
              <Tooltip text="Retour à la liste">
                <button onClick={() => navigate('/comptabilite/lettrage')} className="h-12 px-4 bg-gray-600 text-white text-sm hover:bg-gray-700 hover:scale-105 hover:shadow-md active:scale-95 transition-all duration-200 flex items-center justify-center font-medium border-0" style={{ minWidth: '100px' }}>
                  <FiArrowLeft size={16} className="mr-1" /><span>Retour</span>
                </button>
              </Tooltip>
              <div className="flex flex-col h-12 justify-center">
                <div className="text-lg font-bold text-gray-900">Détails du lettrage</div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`px-2 py-0.5 text-xs font-medium rounded ${getBadgeClass(reconciliation.reconcile_type || reconciliation.type)}`}>{reconciliation.reconcile_type === 'full' ? 'Lettrage Total' : reconciliation.reconcile_type === 'partial' ? 'Lettrage Partiel' : 'Lettrage'}</span>
                  <span className="text-xs text-gray-500">ID: #{reconciliation.id}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isEditing ? (
                <>
                  <Tooltip text="Annuler les modifications"><button onClick={() => setIsEditing(false)} disabled={isSubmitting} className="w-8 h-8 rounded-full bg-black text-white hover:bg-gray-800 transition-all flex items-center justify-center"><FiX size={16} /></button></Tooltip>
                  <Tooltip text="Enregistrer"><button onClick={handleSaveChanges} disabled={isSubmitting} className="w-8 h-8 rounded-full bg-green-600 text-white hover:bg-green-700 transition-all flex items-center justify-center">{isSubmitting ? <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"/> : <FiSave size={16} />}</button></Tooltip>
                </>
              ) : (
                <>
                  <Tooltip text="Modifier"><button onClick={handleEditToggle} className="w-8 h-8 rounded-full bg-blue-600 text-white hover:bg-blue-700 transition-all flex items-center justify-center"><FiEdit2 size={16} /></button></Tooltip>
                  <div className="relative group">
                    <Tooltip text="Autres actions"><button className="w-8 h-8 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all flex items-center justify-center"><FiSettings size={14} /></button></Tooltip>
                    <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 shadow-lg rounded-sm z-20 hidden group-hover:block">
                      <button onClick={() => setShowDeleteModal(true)} className="w-full px-3 py-2 text-xs text-left text-red-600 hover:bg-red-50 flex items-center gap-2"><FiTrash2 size={12} /> Annuler le lettrage</button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Messages */}
        {(error || success) && (<div className={`px-4 py-2 text-xs border-b ${error ? 'bg-red-50 text-red-700 border-red-200' : 'bg-green-50 text-green-700 border-green-200'}`}><div className="flex items-center gap-2">{error ? <FiAlertCircle size={12} /> : <FiCheck size={12} />}<span>{error || success}</span></div></div>)}

        {/* Contenu */}
        <div className="p-4">
          {/* Infos générales */}
          <div className="bg-gray-50 border border-gray-200 rounded p-4 mb-4">
            <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2"><FiInfo size={14} /> Informations</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div><span className="text-gray-500 text-xs block mb-1">Date</span><span className="font-medium text-gray-900">{reconciliation.date ? new Date(reconciliation.date).toLocaleDateString('fr-FR') : '—'}</span></div>
              <div><span className="text-gray-500 text-xs block mb-1">Type</span><span className="font-medium text-gray-900 uppercase">{reconciliation.reconcile_type || reconciliation.type || 'Standard'}</span></div>
              <div><span className="text-gray-500 text-xs block mb-1">Montant</span><span className="font-bold text-gray-900 text-lg">{formatAmount(reconciliation.amount || reconciliation.total_amount)} {reconciliation.currency_code || 'XOF'}</span></div>
              <div className="md:col-span-3">
                <span className="text-gray-500 text-xs block mb-1">Commentaire</span>
                {isEditing ? (<input type="text" value={editComment} onChange={(e) => setEditComment(e.target.value)} className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-purple-500 focus:outline-none" placeholder="Ex: Lettrage automatique..." />) : (<p className="text-gray-900 bg-white px-2 py-1 border border-transparent rounded min-h-[30px]">{reconciliation.comment || <span className="text-gray-400 italic">Aucun commentaire</span>}</p>)}
              </div>
              {(reconciliation.reconcile_type === 'partial' || reconciliation.type === 'partial') && isEditing && (
                <div className="md:col-span-3">
                  <span className="text-gray-500 text-xs block mb-1">Montant ajusté (Partiel)</span>
                  <AmountInput value={editAmount} onChange={setEditAmount} className="w-full bg-white" />
                  <p className="text-xs text-orange-600 mt-1">⚠️ Attention : modifier le montant peut affecter les soldes.</p>
                </div>
              )}
            </div>
          </div>

          {/* Lignes lettrées */}
          <div className="border border-gray-300 rounded overflow-hidden">
            <div className="bg-gray-100 px-3 py-2 border-b border-gray-300"><h3 className="text-sm font-bold text-gray-800">Lignes associées ({lines.length})</h3></div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-200">
                  <tr>
                    <th className="px-3 py-2">Date</th><th className="px-3 py-2">Compte</th><th className="px-3 py-2">Partenaire</th><th className="px-3 py-2">Libellé</th><th className="px-3 py-2 text-right">Débit</th><th className="px-3 py-2 text-right">Crédit</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.length > 0 ? lines.map((line, idx) => {
                    const lineBalance = line.balance || (line.debit - line.credit);
                    const isDebit = lineBalance >= 0;
                    return (<tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-3 py-2 text-gray-700">{line.date}</td>
                      <td className="px-3 py-2 font-mono text-gray-900">{line.account_code || line.account?.code}</td>
                      <td className="px-3 py-2 text-gray-700 truncate max-w-[120px]">{line.partner_name || '—'}</td>
                      <td className="px-3 py-2 text-gray-700 truncate max-w-[180px]">{line.name}</td>
                      <td className="px-3 py-2 text-right text-green-700">{isDebit ? formatAmount(lineBalance) : ''}</td>
                      <td className="px-3 py-2 text-right text-red-700">{!isDebit ? formatAmount(lineBalance) : ''}</td>
                    </tr>);
                  }) : (<tr><td colSpan="6" className="px-3 py-6 text-center text-gray-500 italic">Aucune ligne détaillée disponible.</td></tr>)}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Modal suppression */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-sm shadow-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-red-700 mb-2 flex items-center gap-2"><FiAlertCircle /> Annuler le lettrage ?</h3>
            <p className="text-sm text-gray-600 mb-4">Cette action va <b>défaire</b> le lettrage actuel. Les {lines.length} lignes redeviendront "Non lettrées".</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowDeleteModal(false)} className="px-4 py-2 border border-gray-300 text-gray-700 text-sm rounded hover:bg-gray-50 transition-all">Annuler</button>
              <button onClick={handleDeleteConfirm} disabled={isSubmitting} className="px-4 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-all disabled:opacity-50 flex items-center gap-2">{isSubmitting ? 'Traitement...' : <><FiTrash2 size={14}/> Confirmer</>}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}