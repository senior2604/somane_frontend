// C:\Users\IBM\Documents\somane_frontend\src\features\comptabilité\pages\Lettrage\Create.jsx
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FiPlus, FiCheck, FiX, FiAlertCircle, FiBriefcase,
  FiUploadCloud, FiSettings
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
// COMPOSANT AUTOCOMPLETE (LOCAL)
// ==========================================
const AutocompleteInput = ({
  value, selectedId, onChange, onSelect, options = [], getOptionLabel,
  placeholder = "", className = "", disabled = false, required = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value || '');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);
  const [dropdownStyle, setDropdownStyle] = useState({});

  useEffect(() => { if (value !== undefined) setInputValue(value); }, [value]);

  const filteredOptions = options.filter(option => getOptionLabel(option).toLowerCase().includes(inputValue.toLowerCase()));

  const updateDropdownPosition = () => {
    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      setDropdownStyle({
        position: 'fixed', top: `${rect.bottom}px`, left: `${rect.left}px`,
        width: `${rect.width}px`, zIndex: 9999, maxHeight: '200px', overflowY: 'auto'
      });
    }
  };

  useEffect(() => {
    if (isOpen) {
      updateDropdownPosition();
      const handleScroll = () => updateDropdownPosition();
      const handleResize = () => updateDropdownPosition();
      window.addEventListener('scroll', handleScroll, true);
      window.addEventListener('resize', handleResize);
      return () => { window.removeEventListener('scroll', handleScroll, true); window.removeEventListener('resize', handleResize); };
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target) && inputRef.current && !inputRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e) => {
    setInputValue(e.target.value);
    setIsOpen(true);
    setHighlightedIndex(0);
    onChange(e.target.value);
    if (selectedId) onSelect(null, '');
  };

  const handleSelectOption = (option) => {
    const label = getOptionLabel(option);
    setInputValue(label);
    setIsOpen(false);
    onSelect(option.id, label);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setIsOpen(true); setHighlightedIndex(prev => prev < filteredOptions.length - 1 ? prev + 1 : prev); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlightedIndex(prev => prev > 0 ? prev - 1 : 0); }
    else if (e.key === 'Enter' && isOpen && filteredOptions.length > 0) { e.preventDefault(); handleSelectOption(filteredOptions[highlightedIndex]); }
    else if (e.key === 'Escape') setIsOpen(false);
  };

  useEffect(() => {
    if (isOpen && dropdownRef.current && filteredOptions.length > 0) {
      const el = dropdownRef.current.children[highlightedIndex];
      if (el) el.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightedIndex, isOpen, filteredOptions.length]);

  return (
    <>
      <input ref={inputRef} type="text" value={inputValue} onChange={handleInputChange} onKeyDown={handleKeyDown}
        onFocus={() => { setIsOpen(true); updateDropdownPosition(); }} placeholder={placeholder} disabled={disabled} required={required}
        className={`w-full px-2 py-1 text-xs focus:ring-1 focus:ring-purple-500 focus:outline-none ${className}`}
        style={{ height: '26px', border: 'none', backgroundColor: 'transparent' }} autoComplete="off" />
      {isOpen && filteredOptions.length > 0 && (
        <div ref={dropdownRef} className="bg-white border border-gray-300 shadow-lg" style={dropdownStyle}>
          {filteredOptions.map((option, index) => (
            <div key={option.id} className={`px-2 py-1 text-xs cursor-pointer ${index === highlightedIndex ? 'bg-purple-100 text-purple-700' : 'hover:bg-purple-50'} ${option.id === selectedId ? 'bg-purple-50' : ''}`}
              onClick={() => handleSelectOption(option)} onMouseEnter={() => setHighlightedIndex(index)}>
              {getOptionLabel(option)}
            </div>
          ))}
        </div>
      )}
    </>
  );
};

// ==========================================
// COMPOSANT PRINCIPAL
// ==========================================
export default function LettrageCreate() {
  const navigate = useNavigate();
  const { activeEntity } = useEntity();

  const [lines, setLines] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [filters, setFilters] = useState({ partner_id: '', partner_label: '', date_from: '', date_to: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [reconcileType, setReconcileType] = useState('partial');
  const [comment, setComment] = useState('');
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [partners, setPartners] = useState([]);

  const actionsMenuRef = useRef(null);

  // Chargement des partenaires
  useEffect(() => {
    if (!activeEntity) return;
    const loadPartners = async () => {
      try {
        const res = await lettrageService.getPartners?.(activeEntity.id) || [];
        setPartners(Array.isArray(res) ? res : res.results || []);
      } catch (err) { console.error('Erreur chargement partenaires:', err); }
    };
    loadPartners();
  }, [activeEntity]);

  // Chargement des lignes à lettrer
  const loadLines = useCallback(async () => {
    if (!activeEntity?.id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await lettrageService.getUnreconciledLines(activeEntity.id, filters);
      setLines(res);
      setSelectedIds(new Set());
    } catch (err) {
      setError('Erreur lors du chargement des lignes à lettrer');
    } finally { setLoading(false); }
  }, [activeEntity, filters]);

  useEffect(() => { if (activeEntity?.id) loadLines(); }, [activeEntity, filters, loadLines]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (actionsMenuRef.current && !actionsMenuRef.current.contains(e.target)) setShowActionsMenu(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectionSummary = useMemo(() => {
    const selectedLines = lines.filter(l => selectedIds.has(l.id));
    const debit = selectedLines.filter(l => l.balance > 0).reduce((s, l) => s + l.balance, 0);
    const credit = selectedLines.filter(l => l.balance < 0).reduce((s, l) => s + Math.abs(l.balance), 0);
    return {
      count: selectedLines.length, debit, credit,
      difference: Math.abs(debit - credit),
      isBalanced: Math.abs(debit - credit) < 0.01
    };
  }, [lines, selectedIds]);

  const markAsModified = useCallback(() => { if (!hasUnsavedChanges) setHasUnsavedChanges(true); }, [hasUnsavedChanges]);
  const toggleSelect = useCallback((id) => { setSelectedIds(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; }); markAsModified(); }, [markAsModified]);
  const selectAll = useCallback(() => { setSelectedIds(new Set(lines.map(l => l.id))); markAsModified(); }, [lines, markAsModified]);
  const clearSelection = useCallback(() => { setSelectedIds(new Set()); markAsModified(); }, [markAsModified]);

  const canReconcile = useMemo(() => {
    if (selectionSummary.count < 2) return false;
    return reconcileType === 'full' ? selectionSummary.isBalanced : true;
  }, [selectionSummary, reconcileType]);

  const handleConfirmReconcile = async () => {
    setLoading(true);
    setError(null);
    try {
      await lettrageService.create({
        company_id: activeEntity.id,
        line_ids: Array.from(selectedIds),
        reconcile_type: reconcileType,
        comment: comment.trim() || '',
        amount: reconcileType === 'partial' ? selectionSummary.difference : undefined
      });
      setSuccess('Lettrage effectué avec succès !');
      clearSelection();
      setComment('');
      setShowModal(false);
      setHasUnsavedChanges(false);
      setTimeout(() => setSuccess(null), 3000);
      loadLines();
    } catch (err) {
      setError(`Échec : ${err?.response?.data?.detail || err.message || 'Erreur inconnue'}`);
    } finally { setLoading(false); }
  };

  const formatAmount = (amount) => {
    if (!amount && amount !== 0) return '0';
    return Math.abs(amount).toLocaleString('fr-FR', { minimumFractionDigits: 2 });
  };

  if (!activeEntity) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-yellow-50 border border-yellow-200 p-6 rounded text-center max-w-md">
          <FiBriefcase className="text-yellow-600 mx-auto mb-3" size={32} />
          <p className="text-yellow-800 font-medium">Aucune entité sélectionnée</p>
          <p className="text-sm text-gray-600 mt-2">Veuillez choisir une entité depuis le menu principal.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto bg-white border border-gray-300">

        {/* En-tête ligne 1 */}
        <div className="border-b border-gray-300 px-4 py-3">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-start gap-3">
              <Tooltip text="Nouveau lettrage">
                <button onClick={() => navigate('/comptabilite/lettrage/create')} className="h-12 px-4 bg-purple-600 text-white text-sm hover:bg-purple-700 hover:scale-105 hover:shadow-md active:scale-95 transition-all duration-200 flex items-center justify-center font-medium border-0" style={{ minWidth: '100px' }}>
                  <FiPlus size={16} className="mr-1" /><span>Nouveau</span>
                </button>
              </Tooltip>
              <div className="flex flex-col h-12 justify-center">
                <div className="text-lg font-bold text-gray-900">Lettrage des comptes</div>
                <div className="flex items-center gap-2 mt-0.5"><span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800">Création</span></div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative" ref={actionsMenuRef}>
                <Tooltip text="Menu des actions">
                  <button onClick={() => setShowActionsMenu(!showActionsMenu)} className="h-8 px-3 border border-gray-300 text-gray-700 text-xs hover:bg-gray-50 hover:scale-105 hover:shadow-md active:scale-95 transition-all duration-200 flex items-center gap-1">
                    <FiSettings size={12} /><span>Actions</span>
                  </button>
                </Tooltip>
                {showActionsMenu && (
                  <div className="absolute right-0 mt-1 w-48 bg-white border border-gray-300 shadow-lg rounded-sm z-50">
                    <button onClick={clearSelection} className="w-full px-3 py-2 text-xs text-left hover:bg-gray-50 hover:pl-4 transition-all duration-200 flex items-center gap-2 border-b border-gray-100">Effacer sélection</button>
                  </div>
                )}
              </div>
              <Tooltip text="Valider le lettrage">
                <button onClick={() => setShowModal(true)} disabled={!canReconcile || loading} className={`w-8 h-8 rounded-full ${canReconcile ? 'bg-purple-600 hover:bg-purple-700' : 'bg-gray-300'} text-white hover:scale-110 hover:shadow-lg active:scale-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center shadow-sm`}>
                  <FiUploadCloud size={16} />
                </button>
              </Tooltip>
              <Tooltip text="Annuler">
                <button onClick={() => navigate('/comptabilite/lettrage')} className="w-8 h-8 rounded-full bg-black text-white hover:bg-gray-800 hover:scale-110 hover:shadow-lg active:scale-90 transition-all duration-200 flex items-center justify-center">
                  <FiX size={16} />
                </button>
              </Tooltip>
            </div>
          </div>
        </div>

        {/* En-tête ligne 2 */}
        <div className="border-b border-gray-300 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Tooltip text={!canReconcile ? 'Sélectionnez au moins 2 lignes équilibrées' : 'Valider le lettrage'}>
                <button onClick={() => setShowModal(true)} disabled={!canReconcile || loading} className={`h-8 px-3 text-xs font-medium border transition-all duration-200 flex items-center justify-center ${canReconcile ? 'bg-purple-600 text-white border-purple-600 hover:bg-purple-700 cursor-pointer' : 'bg-gray-100 text-gray-500 border-gray-300 cursor-not-allowed'}`}>
                  Valider
                </button>
              </Tooltip>
              {error && (<div className="flex items-center gap-1 text-xs text-red-600"><FiAlertCircle size={14} /><span>{error}</span></div>)}
            </div>
            <div className="flex items-center gap-2"><div className="h-8 px-3 text-xs font-medium border bg-blue-100 text-blue-700 border-blue-300">En cours</div></div>
          </div>
        </div>

        {hasUnsavedChanges && (<div className="px-4 py-1 bg-blue-50 text-blue-700 text-xs border-b border-blue-200"><span>Modifications non sauvegardées</span></div>)}

        {/* Filtres */}
        <div className="px-4 py-3 border-b border-gray-300 bg-gray-50">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <AutocompleteInput value={filters.partner_label} selectedId={filters.partner_id} onChange={(text) => setFilters(prev => ({...prev, partner_label: text}))} onSelect={(id, label) => { setFilters(prev => ({...prev, partner_id: id, partner_label: label})); loadLines(); }} options={partners} getOptionLabel={p => `${p.nom || p.raison_sociale} (${p.code})`} placeholder="Filtrer par partenaire" className="h-[26px]" />
            <input type="date" value={filters.date_from} onChange={e => { setFilters(p => ({...p, date_from: e.target.value})); loadLines(); }} className="px-2 py-1 border border-gray-300 text-xs h-[26px] rounded focus:ring-1 focus:ring-purple-500" placeholder="Date début" />
            <input type="date" value={filters.date_to} onChange={e => { setFilters(p => ({...p, date_to: e.target.value})); loadLines(); }} className="px-2 py-1 border border-gray-300 text-xs h-[26px] rounded focus:ring-1 focus:ring-purple-500" placeholder="Date fin" />
          </div>
        </div>

        {(success) && (<div className="px-4 py-2 text-xs border-b bg-green-50 text-green-700 border-green-200"><div className="flex items-center gap-2"><FiCheck size={12} /><span>{success}</span></div></div>)}

        {/* Tableau */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead className="bg-gray-100 text-gray-700">
              <tr>
                <th className="border border-gray-300 px-2 py-1.5 text-left w-10"><input type="checkbox" onChange={e => e.target.checked ? selectAll() : clearSelection()} checked={selectedIds.size === lines.length && lines.length > 0} /></th>
                <th className="border border-gray-300 px-2 py-1.5 text-left">Date</th>
                <th className="border border-gray-300 px-2 py-1.5 text-left">Compte</th>
                <th className="border border-gray-300 px-2 py-1.5 text-left">Partenaire</th>
                <th className="border border-gray-300 px-2 py-1.5 text-left">Libellé</th>
                <th className="border border-gray-300 px-2 py-1.5 text-right">Débit</th>
                <th className="border border-gray-300 px-2 py-1.5 text-right">Crédit</th>
                <th className="border border-gray-300 px-2 py-1.5 text-left">Réf</th>
                <th className="border border-gray-300 px-2 py-1.5 text-left w-24">État</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (<tr><td colSpan="9" className="text-center py-6 text-gray-500">Chargement...</td></tr>) : lines.length === 0 ? (<tr><td colSpan="9" className="text-center py-6 text-gray-500">Aucune ligne à lettrer avec les filtres actuels</td></tr>) : (
                lines.map(line => (
                  <tr key={line.id} className={`hover:bg-gray-50 ${selectedIds.has(line.id) ? 'bg-purple-50' : ''}`}>
                    <td className="border border-gray-300 px-2 py-1.5"><input type="checkbox" checked={selectedIds.has(line.id)} onChange={() => toggleSelect(line.id)} /></td>
                    <td className="border border-gray-300 px-2 py-1.5 text-gray-700">{line.date}</td>
                    <td className="border border-gray-300 px-2 py-1.5 font-mono text-gray-900">{line.account_code}</td>
                    <td className="border border-gray-300 px-2 py-1.5 text-gray-700 truncate max-w-[150px]">{line.partner_name || '—'}</td>
                    <td className="border border-gray-300 px-2 py-1.5 text-gray-700 truncate max-w-[200px]">{line.name}</td>
                    <td className="border border-gray-300 px-2 py-1.5 text-right text-green-700">{line.balance > 0 ? formatAmount(line.balance) : ''}</td>
                    <td className="border border-gray-300 px-2 py-1.5 text-right text-red-700">{line.balance < 0 ? formatAmount(line.balance) : ''}</td>
                    <td className="border border-gray-300 px-2 py-1.5 text-gray-500">{line.ref || line.move_name || '—'}</td>
                    <td className="border border-gray-300 px-2 py-1.5"><span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded ${line.is_reconciled ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{line.is_reconciled ? 'Lettré' : 'En cours'}</span></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Barre de résumé */}
        {selectionSummary.count > 0 && (
          <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
            <div className="text-xs text-gray-600">{selectionSummary.count} ligne(s) sélectionnée(s) • Débit: <b>{formatAmount(selectionSummary.debit)}</b> • Crédit: <b>{formatAmount(selectionSummary.credit)}</b>{selectionSummary.difference > 0.01 && (<span className="ml-2 text-amber-600">⚠ Écart: {formatAmount(selectionSummary.difference)}</span>)}</div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1 text-xs cursor-pointer"><input type="radio" name="type" value="partial" checked={reconcileType === 'partial'} onChange={() => setReconcileType('partial')} />Partiel</label>
              <label className="flex items-center gap-1 text-xs cursor-pointer"><input type="radio" name="type" value="full" checked={reconcileType === 'full'} onChange={() => setReconcileType('full')} disabled={!selectionSummary.isBalanced} />Total {reconcileType === 'full' && !selectionSummary.isBalanced && <span className="text-red-500 ml-1">(déséquilibré)</span>}</label>
              <button onClick={clearSelection} className="text-xs text-gray-500 hover:text-gray-700">Effacer</button>
            </div>
          </div>
        )}

        {/* Boutons d'action */}
        <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 flex justify-end gap-2">
          <button onClick={() => navigate('/comptabilite/lettrage')} className="px-4 py-2 text-xs border border-gray-300 text-gray-700 rounded hover:bg-gray-100 transition-all">Annuler</button>
          <button onClick={() => setShowModal(true)} disabled={!canReconcile || loading} className={`px-4 py-2 text-xs font-medium rounded transition-all ${canReconcile ? 'bg-purple-600 text-white hover:bg-purple-700' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}>{loading ? 'En cours...' : 'Valider le lettrage'}</button>
        </div>
      </div>

      {/* Modal confirmation */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-sm shadow-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Confirmer le lettrage</h3>
            <p className="text-sm text-gray-600 mb-4">Vous êtes sur le point de lettrer <b>{selectionSummary.count} ligne(s)</b> en mode <b>{reconcileType === 'full' ? 'total' : 'partiel'}</b>.</p>
            <textarea value={comment} onChange={e => setComment(e.target.value)} className="w-full border border-gray-300 text-xs p-2 mb-4 rounded h-20 focus:ring-1 focus:ring-purple-500" placeholder="Commentaire optionnel..." />
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowModal(false)} className="px-3 py-1.5 text-xs border border-gray-300 rounded hover:bg-gray-50">Annuler</button>
              <button onClick={handleConfirmReconcile} disabled={loading || !canReconcile} className="px-3 py-1.5 text-xs bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50">{loading ? 'En cours...' : 'Valider'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}