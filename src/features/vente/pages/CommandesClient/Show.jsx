// src/features/vente/pages/CommandesClient/Show.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  FiEdit2, FiTrash2, FiCheck, FiX, FiAlertCircle, FiInfo, 
  FiSettings, FiUploadCloud, FiPaperclip, FiCopy, FiRotateCcw,
  FiPlus, FiArrowLeft, FiPrinter, FiDownload, FiSend
} from 'react-icons/fi';
import { useEntity } from '../../../../context/EntityContext';
import { commandesService, referentielsService, formatAmount } from '../../services';

// ==========================================
// TOOLTIP (Identique à Comptabilité)
// ==========================================
const Tooltip = ({ children, text, position = 'top' }) => {
  const [show, setShow] = useState(false);
  return (
    <div className="relative inline-block">
      <div onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>{children}</div>
      {show && (
        <div className={`absolute z-50 px-2 py-1 text-xs text-white bg-gray-800 rounded whitespace-nowrap ${
          position === 'top' ? 'bottom-full left-1/2 -translate-x-1/2 mb-1' :
          position === 'bottom' ? 'top-full left-1/2 -translate-x-1/2 mt-1' :
          position === 'left' ? 'right-full top/2 -translate-y-1/2 mr-1' :
          'left-full top-1/2 -translate-y-1/2 ml-1'
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
// AUTOCOMPLETE (Optimisé)
// ==========================================
const AutocompleteInput = ({
  value, selectedId, onChange, onSelect, options, getOptionLabel,
  placeholder = "", className = "", disabled = false, required = false, onKeyDown
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value || '');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);
  const [dropdownStyle, setDropdownStyle] = useState({});

  useEffect(() => { if (value !== undefined) setInputValue(value); }, [value]);

  const filtered = options.filter(opt => 
    getOptionLabel(opt).toLowerCase().includes(inputValue.toLowerCase())
  );

  const updatePos = () => {
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
      updatePos();
      const hS = () => updatePos(), hR = () => updatePos();
      window.addEventListener('scroll', hS, true);
      window.addEventListener('resize', hR);
      return () => { window.removeEventListener('scroll', hS, true); window.removeEventListener('resize', hR); };
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target) &&
          inputRef.current && !inputRef.current.contains(e.target)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleSelect = (opt) => {
    setInputValue(getOptionLabel(opt));
    setIsOpen(false);
    onSelect(opt.id, getOptionLabel(opt));
  };

  const handleKeyDown = (e) => {
    onKeyDown?.(e);
    if (e.key === 'ArrowDown') { e.preventDefault(); setIsOpen(true); setHighlightedIndex(p => Math.min(p + 1, filtered.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlightedIndex(p => Math.max(p - 1, 0)); }
    else if (e.key === 'Enter' && isOpen && filtered.length > 0) { e.preventDefault(); handleSelect(filtered[highlightedIndex]); }
    else if (e.key === 'Escape') setIsOpen(false);
  };

  useEffect(() => {
    if (isOpen && dropdownRef.current) {
      dropdownRef.current.children[highlightedIndex]?.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightedIndex, isOpen]);

  return (
    <>
      <input ref={inputRef} type="text" value={inputValue}
        onChange={(e) => { setInputValue(e.target.value); setIsOpen(true); setHighlightedIndex(0); onChange(e.target.value); }}
        onKeyDown={handleKeyDown} onFocus={() => { setIsOpen(true); updatePos(); }}
        placeholder={placeholder} disabled={disabled} required={required}
        className={`w-full px-2 py-1 text-xs focus:ring-1 focus:ring-violet-500 focus:outline-none ${className}`}
        style={{ height: '26px', border: 'none', backgroundColor: 'transparent' }} autoComplete="off"
      />
      {isOpen && filtered.length > 0 && (
        <div ref={dropdownRef} className="bg-white border border-gray-300 shadow-lg" style={dropdownStyle}>
          {filtered.map((opt, idx) => (
            <div key={opt.id}
              className={`px-2 py-1 text-xs cursor-pointer ${idx === highlightedIndex ? 'bg-violet-100 text-violet-700' : 'hover:bg-violet-50'} ${opt.id === selectedId ? 'bg-violet-50' : ''}`}
              onClick={() => handleSelect(opt)} onMouseEnter={() => setHighlightedIndex(idx)}
            >
              {getOptionLabel(opt)}
            </div>
          ))}
        </div>
      )}
    </>
  );
};

// ==========================================
// AMOUNT INPUT (Séparateur d'espaces)
// ==========================================
const AmountInput = ({ value, onChange, placeholder = "0", className = "", disabled = false, onKeyDown }) => {
  const [display, setDisplay] = useState('');
  const inputRef = useRef(null);
  const format = (n) => n === '' || n == null ? '' : Math.round(parseFloat(n)).toLocaleString('fr-FR');
  
  useEffect(() => setDisplay(value != null && value !== '' ? format(value) : ''), [value]);

  const handleChange = (e) => {
    if (disabled) return;
    let raw = e.target.value.replace(/\s/g, '').replace(/[^\d,.-]/g, '').replace(',', '.');
    const m = raw.match(/[\d.-]+/);
    if (m) {
      const num = parseFloat(m[0]);
      if (!isNaN(num)) { setDisplay(format(num)); onChange(num); return; }
    }
    setDisplay(''); onChange('');
  };

  const handleBlur = () => { if (value != null && value !== '') setDisplay(format(value)); };
  const handleFocus = (e) => { if (value != null && value !== '') e.target.value = value.toString(); };

  return (
    <input ref={inputRef} type="text" value={display} onChange={handleChange} onBlur={handleBlur} onFocus={handleFocus}
      onKeyDown={onKeyDown} disabled={disabled}
      className={`w-full px-2 py-1 border-0 text-xs text-right focus:ring-1 focus:ring-violet-500 ${disabled ? 'bg-gray-50 text-gray-500' : ''} ${className}`}
      style={{ height: '26px' }} placeholder={placeholder}
    />
  );
};

// ==========================================
// BADGES D'ÉTAT (Réutilisables)
// ==========================================
const StateBadge = ({ state }) => {
  const config = {
    draft: { label: 'Devis', cls: 'bg-amber-100 text-amber-700' },
    sent: { label: 'Envoyé', cls: 'bg-blue-100 text-blue-700' },
    sale: { label: 'Confirmé', cls: 'bg-emerald-100 text-emerald-700' },
    done: { label: 'Terminé', cls: 'bg-gray-100 text-gray-700' },
    cancel: { label: 'Annulé', cls: 'bg-red-100 text-red-700' }
  }[state] || { label: state || 'Inconnu', cls: 'bg-gray-100 text-gray-700' };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${config.cls}`}>{config.label}</span>;
};

const InvoiceStatusBadge = ({ status }) => {
  const config = {
    no: { label: 'Non facturé', cls: 'bg-gray-100 text-gray-700' },
    to_invoice: { label: 'À facturer', cls: 'bg-yellow-100 text-yellow-700' },
    invoiced: { label: 'Facturé', cls: 'bg-green-100 text-green-700' }
  }[status] || { label: status || '—', cls: 'bg-gray-100 text-gray-700' };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${config.cls}`}>{config.label}</span>;
};

const DeliveryStatusBadge = ({ status }) => {
  const config = {
    no: { label: 'Non livré', cls: 'bg-gray-100 text-gray-700' },
    partial: { label: 'Partiel', cls: 'bg-yellow-100 text-yellow-700' },
    full: { label: 'Livré', cls: 'bg-green-100 text-green-700' }
  }[status] || { label: status || '—', cls: 'bg-gray-100 text-gray-700' };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${config.cls}`}>{config.label}</span>;
};

// ==========================================
// COMPOSANT PRINCIPAL (Show/Edit unifié)
// ==========================================
export default function Show() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { activeEntity } = useEntity();

  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [order, setOrder] = useState(null);
  const [products, setProducts] = useState([]);
  const [partners, setPartners] = useState([]);
  const [teams, setTeams] = useState([]);
  const [currencies, setCurrencies] = useState([]);
  const [taxes, setTaxes] = useState([]);
  const [pricelists, setPricelists] = useState([]);
  const [uoms, setUoms] = useState([]);
  const [fiscalPositions, setFiscalPositions] = useState([]);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [activeTab, setActiveTab] = useState('lignes');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  const today = new Date().toISOString().split('T')[0];
  const tableContainerRef = useRef(null);

  // ✅ DEBUG TAXES
  useEffect(() => {
    if (!activeEntity) return;
    console.group('🔍 DEBUG TAXES - Show.jsx');
    referentielsService.getTaxes(activeEntity.id)
      .then(res => {
        console.log('✅ Taxes API:', Array.isArray(res) ? `${res.length} items` : 'objet paginé');
        if (Array.isArray(res) && res.length > 0) {
          console.log('📋 Première taxe:', { id: res[0].id, name: res[0].name, amount: res[0].amount });
        }
        setTaxes(Array.isArray(res) ? res : res.results || []);
      })
      .catch(err => console.error('❌ Erreur taxes:', err))
      .finally(() => console.groupEnd());
  }, [activeEntity]);

  // Charger la commande + référentiels
  useEffect(() => {
    if (!id || !activeEntity) return;
    const loadData = async () => {
      try {
        setLoading(true);
        const [orderData, p, part, t, c, pl, u, fp] = await Promise.all([
          commandesService.getById(id, activeEntity.id),
          referentielsService.getProducts?.() || Promise.resolve([]),
          referentielsService.getPartners(activeEntity.id),
          referentielsService.getTeams?.() || Promise.resolve([]),
          referentielsService.getCurrencies?.() || Promise.resolve([]),
          referentielsService.getPricelists?.(activeEntity.id) || Promise.resolve([]),
          referentielsService.getUoms?.() || Promise.resolve([]),
          referentielsService.getFiscalPositions?.(activeEntity.id) || Promise.resolve([]),
        ]);
        const norm = (d) => Array.isArray(d) ? d : d.results || d.data || [];
        setOrder(orderData);
        setProducts(norm(p)); setPartners(norm(part)); setTeams(norm(t));
        setCurrencies(norm(c)); setPricelists(norm(pl)); setUoms(norm(u)); setFiscalPositions(norm(fp));
      } catch (err) {
        console.error('❌ Erreur chargement:', err);
        setError('Impossible de charger la commande');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [id, activeEntity]);

  const mark = () => { if (!hasUnsavedChanges) setHasUnsavedChanges(true); };
  
  const handleChange = (field, value) => {
    setOrder(prev => prev ? ({ ...prev, [field]: value }) : prev);
    mark();
  };

  const handleLineChange = (index, field, value) => {
    setOrder(prev => {
      if (!prev) return prev;
      const newLines = [...(prev.order_line || [])];
      newLines[index] = { ...newLines[index], [field]: value };
      return { ...prev, order_line: newLines };
    });
    mark();
  };

  const handleLineMulti = (index, fields) => {
    setOrder(prev => {
      if (!prev) return prev;
      const newLines = [...(prev.order_line || [])];
      newLines[index] = { ...newLines[index], ...fields };
      // Auto-fill libellé si produit changé
      if (fields.product_id) {
        const prod = products.find(p => p.id === fields.product_id);
        if (prod) newLines[index] = { ...newLines[index], name: prod.name || newLines[index].name };
      }
      return { ...prev, order_line: newLines };
    });
    mark();
  };

  const handleAmountChange = (index, field, value) => {
    const nv = value === '' ? '' : parseFloat(value);
    setOrder(prev => {
      if (!prev) return prev;
      const newLines = [...(prev.order_line || [])];
      newLines[index] = { ...newLines[index], [field]: nv };
      // Recalcul totaux ligne
      const l = newLines[index];
      const qty = parseFloat(l.product_uom_qty) || 0, price = parseFloat(l.price_unit) || 0, disc = parseFloat(l.discount) || 0;
      const taxRate = 0.18; // Placeholder: sera dynamique via tax_id
      const sub = qty * price * (1 - disc / 100), tax = sub * taxRate, tot = sub + tax;
      newLines[index] = { ...l, price_subtotal: +sub.toFixed(2), price_tax: +tax.toFixed(2), price_total: +tot.toFixed(2) };
      return { ...prev, order_line: newLines };
    });
    mark();
  };

  const addLine = () => {
    const empty = { product_id: '', product_label: '', name: '', product_uom: '', product_uom_label: '', product_uom_qty: 1, price_unit: 0, discount: 0, tax_id: '', tax_label: '', price_subtotal: 0, price_tax: 0, price_total: 0, display_type: 'product' };
    setOrder(prev => prev ? ({ ...prev, order_line: [...(prev.order_line || []), empty] }) : prev);
    mark();
    setTimeout(() => tableContainerRef.current?.scrollTo({ top: tableContainerRef.current.scrollHeight, behavior: 'smooth' }), 10);
  };

  const removeLine = (index) => {
    if (!order || (order.order_line?.length || 0) <= 1) return setError('Au moins une ligne requise');
    setOrder(prev => prev ? ({ ...prev, order_line: prev.order_line.filter((_, i) => i !== index) }) : prev);
    mark();
  };

  // ✅ TABULATION → NOUVELLE LIGNE
  const handleLastFieldTab = (e, lineIndex) => {
    if (e.key === 'Tab' && !e.shiftKey) {
      const isLast = lineIndex === (order?.order_line?.length || 0) - 1;
      if (isLast) {
        e.preventDefault();
        addLine();
        setTimeout(() => {
          const firstInput = document.querySelector(`tbody tr:last-child input[type="text"]`);
          firstInput?.focus();
        }, 50);
      }
    }
  };

  const totals = (order?.order_line || []).reduce((a, l) => ({
    untaxed: a.untaxed + (parseFloat(l.price_subtotal) || 0),
    tax: a.tax + (parseFloat(l.price_tax) || 0),
    total: a.total + (parseFloat(l.price_total) || 0)
  }), { untaxed: 0, tax: 0, total: 0 });

  const prepareData = useCallback(() => {
    if (!order) return null;
    const toId = v => (v === '' || v == null ? null : parseInt(v));
    const toNum = v => (v === '' || v == null ? 0 : parseFloat(v));
    return {
      name: order.name || undefined, client_order_ref: order.client_order_ref, origin: order.origin,
      partner_id: toId(order.partner_id), partner_invoice_id: toId(order.partner_invoice_id) || toId(order.partner_id),
      partner_shipping_id: toId(order.partner_shipping_id) || toId(order.partner_id),
      user_id: toId(order.user_id), team_id: toId(order.team_id), stage_id: toId(order.stage_id),
      date_order: order.date_order, validity_date: order.validity_date || null, commitment_date: order.commitment_date || null,
      pricelist_id: toId(order.pricelist_id), payment_term_id: toId(order.payment_term_id),
      fiscal_position_id: toId(order.fiscal_position_id), analytic_account_id: toId(order.analytic_account_id),
      company_id: activeEntity?.id, currency_id: toId(order.currency_id),
      note: order.note, require_signature: order.require_signature, require_payment: order.require_payment, picking_policy: order.picking_policy,
      state: order.state, invoice_status: order.invoice_status, delivery_status: order.delivery_status,
      order_line: (order.order_line || []).map((l, i) => ({
        product_id: toId(l.product_id), name: l.name?.trim() || l.product_label || `Ligne ${i+1}`,
        product_uom_qty: toNum(l.product_uom_qty), product_uom: toId(l.product_uom),
        price_unit: toNum(l.price_unit), discount: toNum(l.discount),
        tax_id: l.tax_id ? [parseInt(l.tax_id)] : [],
        display_type: l.display_type || 'product', customer_lead: toNum(l.customer_lead)
      }))
    };
  }, [order, activeEntity]);

  const handleSave = async () => {
    if (!order || !activeEntity) return;
    setLoading(true); setError(null);
    try {
      await commandesService.update(order.id, prepareData(), activeEntity.id);
      setSuccess('Commande mise à jour !');
      setTimeout(() => setSuccess(null), 3000);
      setHasUnsavedChanges(false);
      setIsEditing(false);
    } catch (err) {
      setError(`Échec : ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!order || !activeEntity) return;
    setLoading(true);
    try {
      await commandesService.confirm(order.id, activeEntity.id);
      setOrder(prev => prev ? ({ ...prev, state: 'sale' }) : prev);
      setSuccess('Commande confirmée !');
      setHasUnsavedChanges(false);
    } catch (err) {
      setError(`Erreur : ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!order || !activeEntity) return;
    if (!window.confirm('Annuler cette commande ?')) return;
    setLoading(true);
    try {
      await commandesService.cancel(order.id, activeEntity.id);
      setOrder(prev => prev ? ({ ...prev, state: 'cancel' }) : prev);
      setSuccess('Commande annulée');
      setHasUnsavedChanges(false);
    } catch (err) {
      setError(`Erreur : ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateInvoice = async () => {
    if (!order || !activeEntity) return;
    setLoading(true);
    try {
      await commandesService.generateInvoice(order.id, activeEntity.id);
      setSuccess('Facture générée !');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(`Erreur : ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDiscard = () => {
    if (hasUnsavedChanges) setShowConfirmDialog(true);
    else { setIsEditing(false); setError(null); setSuccess(null); }
  };

  const confirmDiscard = () => {
    setHasUnsavedChanges(false);
    setIsEditing(false);
    setShowConfirmDialog(false);
    setError(null); setSuccess(null);
  };

  const handleGoBack = () => {
    if (hasUnsavedChanges) setShowConfirmDialog(true);
    else navigate('/vente/commandes');
  };

  // Prévention perte de données
  useEffect(() => {
    const h = (e) => { if (hasUnsavedChanges) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [hasUnsavedChanges]);

  const isDraft = order?.state === 'draft';
  const canEdit = isDraft;
  const canConfirm = isDraft && order?.partner_id && (order.order_line || []).some(l => l.product_id);

  if (loading && !order) return (
    <div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600"></div>
    </div>
  );

  if (error && !order) return (
    <div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
      <div className="bg-red-50 border border-red-200 p-4 rounded text-red-700 text-sm flex items-center gap-2">
        <FiAlertCircle size={16} />{error}
      </div>
    </div>
  );

  if (!order) return null;

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto bg-white border border-gray-300">
        
        {/* Header ligne 1 */}
        <div className="border-b border-gray-300 px-4 py-3">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-start gap-3">
              <Tooltip text="Retour à la liste">
                <button onClick={handleGoBack} className="h-12 px-4 border border-gray-300 text-gray-700 text-sm hover:bg-gray-50 hover:scale-105 transition-all duration-200 flex items-center gap-1">
                  <FiArrowLeft size={16} /><span>Retour</span>
                </button>
              </Tooltip>
              <div className="flex flex-col h-12 justify-center">
                <div className="text-lg font-bold text-gray-900">Commande #{order.name || order.id}</div>
                <div className="flex items-center gap-2 mt-0.5">
                  <StateBadge state={order.state} />
                  <InvoiceStatusBadge status={order.invoice_status} />
                  <DeliveryStatusBadge status={order.delivery_status} />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Boutons d'action selon état */}
              {isEditing ? (
                <>
                  <Tooltip text="Enregistrer les modifications">
                    <button onClick={handleSave} disabled={loading} className="w-8 h-8 rounded-full bg-violet-600 text-white flex items-center justify-center hover:bg-violet-700 disabled:opacity-50">
                      <FiUploadCloud size={16} />
                    </button>
                  </Tooltip>
                  <Tooltip text="Annuler les modifications">
                    <button onClick={handleDiscard} className="w-8 h-8 rounded-full bg-gray-800 text-white flex items-center justify-center hover:bg-black">
                      <FiX size={16} />
                    </button>
                  </Tooltip>
                </>
              ) : (
                <>
                  {canEdit && (
                    <Tooltip text="Modifier la commande">
                      <button onClick={() => setIsEditing(true)} className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700">
                        <FiEdit2 size={16} />
                      </button>
                    </Tooltip>
                  )}
                  <Tooltip text="Imprimer">
                    <button className="w-8 h-8 rounded-full border border-gray-300 text-gray-700 flex items-center justify-center hover:bg-gray-50">
                      <FiPrinter size={16} />
                    </button>
                  </Tooltip>
                  <Tooltip text="Envoyer par email">
                    <button className="w-8 h-8 rounded-full border border-gray-300 text-gray-700 flex items-center justify-center hover:bg-gray-50">
                      <FiSend size={16} />
                    </button>
                  </Tooltip>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Header ligne 2 - Actions métier */}
        <div className="border-b border-gray-300 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isDraft && !isEditing && (
                <>
                  <Tooltip text={!canConfirm ? "Remplissez client et produit" : "Confirmer la commande"}>
                    <button onClick={handleConfirm} disabled={!canConfirm || loading}
                      className={`h-8 px-3 text-xs font-medium border rounded ${canConfirm ? 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700' : 'bg-gray-100 text-gray-400 border-gray-300 cursor-not-allowed'}`}>
                      Confirmer
                    </button>
                  </Tooltip>
                  <Tooltip text="Générer une facture">
                    <button onClick={handleGenerateInvoice} disabled={loading} className="h-8 px-3 text-xs font-medium border border-gray-300 text-gray-700 rounded hover:bg-gray-50">
                      Facturer
                    </button>
                  </Tooltip>
                  <Tooltip text="Annuler la commande">
                    <button onClick={handleCancel} disabled={loading} className="h-8 px-3 text-xs font-medium border border-red-300 text-red-700 rounded hover:bg-red-50">
                      Annuler
                    </button>
                  </Tooltip>
                </>
              )}
              {error && <div className="flex items-center gap-1 text-xs text-red-600"><FiAlertCircle size={12}/><span>{error}</span></div>}
            </div>
            {success && <div className="flex items-center gap-1 text-xs text-green-600"><FiCheck size={12}/><span>{success}</span></div>}
          </div>
        </div>

        {hasUnsavedChanges && <div className="px-4 py-1 bg-blue-50 text-blue-700 text-xs border-b border-blue-200">Modifications non sauvegardées</div>}

        {/* Informations commande */}
        <div className="px-4 py-3 border-b border-gray-300">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center" style={{ height: '26px' }}>
                <label className="text-xs text-gray-700 min-w-[140px] font-medium">Client</label>
                {isEditing ? (
                  <div className="flex-1 ml-2">
                    <AutocompleteInput value={order.partner_label || ''} selectedId={order.partner_id}
                      onChange={t => handleChange('partner_label', t)}
                      onSelect={(id, l) => { handleChange('partner_id', id); handleChange('partner_label', l); }}
                      options={partners} getOptionLabel={p => p.raison_sociale || p.nom || ''} placeholder="Sélectionner" />
                  </div>
                ) : (
                  <div className="flex-1 px-2 py-1 border border-gray-300 bg-gray-50 text-xs text-gray-900 ml-2 flex items-center" style={{ height: '26px' }}>
                    {order.partner_label || order.partner_name || '—'}
                  </div>
                )}
              </div>
              <div className="flex items-center" style={{ height: '26px' }}>
                <label className="text-xs text-gray-700 min-w-[140px] font-medium">Date commande</label>
                {isEditing ? (
                  <input type="date" value={order.date_order?.split('T')[0] || ''} onChange={e => handleChange('date_order', e.target.value)}
                    className="flex-1 px-2 py-1 border border-gray-300 text-xs ml-2" style={{ height: '26px' }} />
                ) : (
                  <div className="flex-1 px-2 py-1 border border-gray-300 bg-gray-50 text-xs text-gray-900 ml-2 flex items-center" style={{ height: '26px' }}>
                    {order.date_order ? new Date(order.date_order).toLocaleDateString('fr-FR') : '—'}
                  </div>
                )}
              </div>
              <div className="flex items-center" style={{ height: '26px' }}>
                <label className="text-xs text-gray-700 min-w-[140px] font-medium">Validité devis</label>
                {isEditing ? (
                  <input type="date" value={order.validity_date?.split('T')[0] || ''} onChange={e => handleChange('validity_date', e.target.value)}
                    className="flex-1 px-2 py-1 border border-gray-300 text-xs ml-2" style={{ height: '26px' }} />
                ) : (
                  <div className="flex-1 px-2 py-1 border border-gray-300 bg-gray-50 text-xs text-gray-900 ml-2 flex items-center" style={{ height: '26px' }}>
                    {order.validity_date ? new Date(order.validity_date).toLocaleDateString('fr-FR') : '—'}
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center" style={{ height: '26px' }}>
                <label className="text-xs text-gray-700 min-w-[140px] font-medium">Réf. Client</label>
                {isEditing ? (
                  <input type="text" value={order.client_order_ref || ''} onChange={e => handleChange('client_order_ref', e.target.value)}
                    className="flex-1 px-2 py-1 border border-gray-300 text-xs ml-2" style={{ height: '26px' }} placeholder="PO-2024-001" />
                ) : (
                  <div className="flex-1 px-2 py-1 border border-gray-300 bg-gray-50 text-xs text-gray-900 ml-2 flex items-center" style={{ height: '26px' }}>
                    {order.client_order_ref || '—'}
                  </div>
                )}
              </div>
              <div className="flex items-center" style={{ height: '26px' }}>
                <label className="text-xs text-gray-700 min-w-[140px] font-medium">Équipe</label>
                {isEditing ? (
                  <div className="flex-1 ml-2">
                    <AutocompleteInput value={order.team_label || ''} selectedId={order.team_id}
                      onChange={t => handleChange('team_label', t)}
                      onSelect={(id, l) => { handleChange('team_id', id); handleChange('team_label', l); }}
                      options={teams} getOptionLabel={t => t.name} placeholder="Sélectionner" />
                  </div>
                ) : (
                  <div className="flex-1 px-2 py-1 border border-gray-300 bg-gray-50 text-xs text-gray-900 ml-2 flex items-center" style={{ height: '26px' }}>
                    {order.team_label || order.team_name || '—'}
                  </div>
                )}
              </div>
              <div className="flex items-center" style={{ height: '26px' }}>
                <label className="text-xs text-gray-700 min-w-[140px] font-medium">Devise</label>
                <div className="flex-1 px-2 py-1 border border-gray-300 bg-gray-50 text-xs text-gray-900 ml-2 flex items-center" style={{ height: '26px' }}>
                  {order.currency_label || order.currency_name || 'XOF'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Onglets */}
        <div className="border-b border-gray-300">
          <div className="px-4 flex">
            {['lignes', 'notes', 'options'].map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-xs font-medium border-b-2 transition-all duration-200 ${
                  activeTab === tab ? 'border-violet-600 text-violet-600 hover:text-violet-800' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab === 'lignes' ? 'Lignes de commande' : tab === 'notes' ? 'Notes' : 'Options'}
              </button>
            ))}
          </div>
        </div>

        {/* Contenu onglets */}
        <div className="p-4">
          {activeTab === 'lignes' ? (
            <>
              <div className="border border-gray-300 mb-3 overflow-x-auto" ref={tableContainerRef}>
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-300 px-2 py-1.5 text-xs font-medium text-gray-700 text-left">Produit</th>
                      <th className="border border-gray-300 px-2 py-1.5 text-xs font-medium text-gray-700 text-left">Libellé</th>
                      <th className="border border-gray-300 px-2 py-1.5 text-xs font-medium text-gray-700 text-right">Qté</th>
                      <th className="border border-gray-300 px-2 py-1.5 text-xs font-medium text-gray-700 text-left">UoM</th>
                      <th className="border border-gray-300 px-2 py-1.5 text-xs font-medium text-gray-700 text-right">Prix unit.</th>
                      <th className="border border-gray-300 px-2 py-1.5 text-xs font-medium text-gray-700 text-right">Remise %</th>
                      <th className="border border-gray-300 px-2 py-1.5 text-xs font-medium text-gray-700 text-left">Taxe</th>
                      <th className="border border-gray-300 px-2 py-1.5 text-xs font-medium text-gray-700 text-right">Total HT</th>
                      <th className="border border-gray-300 px-2 py-1.5 text-xs font-medium text-gray-700 text-right">Total TTC</th>
                      <th className="border border-gray-300 px-2 py-1.5 text-xs font-medium text-gray-700 text-center w-8">{isEditing && '•'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(order.order_line || []).map((l, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="border border-gray-300 p-1 min-w-[180px]">
                          {isEditing ? (
                            <AutocompleteInput value={l.product_label || ''} selectedId={l.product_id}
                              onChange={t => handleLineChange(i, 'product_label', t)}
                              onSelect={(id, lb) => handleLineMulti(i, { product_id: id, product_label: lb })}
                              options={products} getOptionLabel={p => `${p.code ? `[${p.code}] ` : ''}${p.name}`} placeholder="Produit" />
                          ) : (
                            <div className="text-xs text-gray-900">{l.product_label || l.product_name || '—'}</div>
                          )}
                        </td>
                        <td className="border border-gray-300 p-1 min-w-[150px]">
                          {isEditing ? (
                            <input type="text" value={l.name || ''} onChange={e => handleLineChange(i, 'name', e.target.value)}
                              className="w-full px-2 py-1 border-0 text-xs focus:ring-1 focus:ring-violet-500" style={{ height: '26px' }} placeholder="Libellé" />
                          ) : (
                            <div className="text-xs text-gray-900">{l.name || '—'}</div>
                          )}
                        </td>
                        <td className="border border-gray-300 p-1 min-w-[70px]">
                          {isEditing ? (
                            <input type="number" min="0" step="0.01" value={l.product_uom_qty || ''} onChange={e => handleAmountChange(i, 'product_uom_qty', e.target.value)}
                              className="w-full px-2 py-1 border-0 text-xs text-right focus:ring-1 focus:ring-violet-500" style={{ height: '26px' }} placeholder="1" />
                          ) : (
                            <div className="text-xs text-right text-gray-900">{l.product_uom_qty || 0}</div>
                          )}
                        </td>
                        <td className="border border-gray-300 p-1 min-w-[80px]">
                          <div className="text-xs text-gray-900">{l.product_uom_label || l.product_uom_name || '—'}</div>
                        </td>
                        <td className="border border-gray-300 p-1 min-w-[90px]">
                          {isEditing ? (
                            <AmountInput value={l.price_unit} onChange={v => handleAmountChange(i, 'price_unit', v)} placeholder="0" disabled={!isEditing} />
                          ) : (
                            <div className="text-xs text-right text-gray-900">{formatAmount(l.price_unit)}</div>
                          )}
                        </td>
                        <td className="border border-gray-300 p-1 min-w-[70px]">
                          {isEditing ? (
                            <input type="number" min="0" max="100" step="0.01" value={l.discount || ''} onChange={e => handleAmountChange(i, 'discount', e.target.value)}
                              className="w-full px-2 py-1 border-0 text-xs text-right focus:ring-1 focus:ring-violet-500" style={{ height: '26px' }} placeholder="0" />
                          ) : (
                            <div className="text-xs text-right text-gray-900">{l.discount || 0}%</div>
                          )}
                        </td>
                        
                        {/* ✅ CHAMP TAXE VISIBLE & SÉLECTIONNABLE + TAB */}
                        <td className="border border-gray-300 p-1 min-w-[120px]">
                          {isEditing ? (
                            <AutocompleteInput 
                              value={l.tax_label || ''} selectedId={l.tax_id} 
                              onChange={t => handleLineChange(i, 'tax_label', t)} 
                              onSelect={(id, lb) => handleLineMulti(i, { tax_id: id, tax_label: lb })} 
                              options={taxes} 
                              getOptionLabel={t => `${t.name || 'TVA'} (${t.amount || 0}%)`} 
                              placeholder="Sélectionner taxe"
                              onKeyDown={(e) => handleLastFieldTab(e, i)}
                            />
                          ) : (
                            <div className="text-xs text-gray-900">{l.tax_label || (Array.isArray(l.tax_id) && l.tax_id.length > 0 ? 'TVA' : '—')}</div>
                          )}
                        </td>
                        
                        <td className="border border-gray-300 p-1 text-right text-xs">{formatAmount(l.price_subtotal)}</td>
                        <td className="border border-gray-300 p-1 text-right text-xs font-medium text-violet-600">{formatAmount(l.price_total)}</td>
                        <td className="border border-gray-300 p-1 text-center w-[40px]">
                          {isEditing && (
                            <button onClick={() => removeLine(i)} tabIndex="-1"
                              className="w-full flex items-center justify-center p-1 text-gray-400 hover:text-red-600 hover:scale-110 active:scale-90 transition-all duration-200" style={{ height: '26px' }} title="Supprimer">
                              <FiTrash2 size={14} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {isEditing && (
                <div className="mb-3 flex items-center gap-4">
                  <Tooltip text="Ajouter une ligne">
                    <button onClick={addLine}
                      className="h-8 px-3 bg-violet-600 text-white text-xs hover:bg-violet-700 hover:scale-105 hover:shadow-md active:scale-95 transition-all duration-200 flex items-center gap-1">
                      <FiPlus size={12} /><span>Ajouter une ligne</span>
                    </button>
                  </Tooltip>
                  <div className="text-xs text-gray-600">{(order.order_line || []).length} ligne(s)</div>
                </div>
              )}

              <div className="bg-violet-50 border border-violet-200 px-4 py-2 flex justify-end gap-8 text-sm font-bold">
                <span>Total HT: {formatAmount(totals.untaxed)} XOF</span>
                <span>TVA: {formatAmount(totals.tax)} XOF</span>
                <span className="text-violet-700">Total TTC: {formatAmount(totals.total)} XOF</span>
              </div>
            </>
          ) : activeTab === 'notes' ? (
            isEditing ? (
              <textarea value={order.note || ''} onChange={e => handleChange('note', e.target.value)}
                className="w-full h-48 px-3 py-2 border border-gray-300 text-xs focus:ring-2 focus:ring-violet-500"
                placeholder="Termes et conditions, remarques internes..." />
            ) : (
              <div className="p-4 border border-gray-300 rounded text-xs text-gray-700 whitespace-pre-wrap min-h-[120px]">
                {order.note || 'Aucune note'}
              </div>
            )
          ) : (
            <div className="text-center py-8 text-gray-500 text-xs border border-gray-300 rounded">
              <FiInfo className="mx-auto mb-2" size={24}/>Gestion des options à implémenter (OrderOption)
            </div>
          )}
        </div>
      </div>

      {/* Dialogue confirmation */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow-lg max-w-md w-full">
            <h3 className="text-lg font-bold mb-3">Modifications non sauvegardées</h3>
            <p className="text-sm text-gray-600 mb-4">Voulez-vous enregistrer avant de quitter ?</p>
            <div className="flex justify-end gap-3">
              <button onClick={async () => { setShowConfirmDialog(false); await handleSave(); }} className="px-4 py-2 bg-violet-600 text-white text-sm rounded hover:bg-violet-700">Enregistrer</button>
              <button onClick={confirmDiscard} className="px-4 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700">Ne pas enregistrer</button>
              <button onClick={() => setShowConfirmDialog(false)} className="px-4 py-2 border text-gray-700 text-sm rounded hover:bg-gray-50">Annuler</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}