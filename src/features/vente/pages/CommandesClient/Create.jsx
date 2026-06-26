// src/features/vente/pages/CommandesClient/Create.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  FiPlus, FiTrash2, FiCheck, FiX, FiAlertCircle, FiInfo, 
  FiSettings, FiUploadCloud, FiPaperclip, FiCopy, FiRotateCcw
} from 'react-icons/fi';
import { useEntity } from '../../../../context/EntityContext';
import { commandesService, referentielsService, formatAmount } from '../../services';

// ==========================================
// TOOLTIP (Strictement identique à Comptabilité)
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
// AUTOCOMPLETE (Optimisé & Strict)
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
const AmountInput = ({ value, onChange, placeholder = "0", className = "", onKeyDown }) => {
  const [display, setDisplay] = useState('');
  const inputRef = useRef(null);
  const format = (n) => n === '' || n == null ? '' : Math.round(parseFloat(n)).toLocaleString('fr-FR');
  
  useEffect(() => setDisplay(value != null && value !== '' ? format(value) : ''), [value]);

  const handleChange = (e) => {
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
      onKeyDown={onKeyDown} className={`w-full px-2 py-1 border-0 text-xs text-right focus:ring-1 focus:ring-violet-500 ${className}`}
      style={{ height: '26px' }} placeholder={placeholder}
    />
  );
};

// ==========================================
// COMPOSANT PRINCIPAL (Strictement conforme Excel + Style Compta)
// ==========================================
export default function Create() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { activeEntity } = useEntity();

  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState([]); // ProductTemplate
  const [partners, setPartners] = useState([]);
  const [teams, setTeams] = useState([]);
  const [currencies, setCurrencies] = useState([]);
  const [taxes, setTaxes] = useState([]); // Taxes du module Compta
  const [pricelists, setPricelists] = useState([]);
  const [uoms, setUoms] = useState([]);
  const [fiscalPositions, setFiscalPositions] = useState([]);
  const [paymentTerms, setPaymentTerms] = useState([]); // Conditions de paiement
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [activeTab, setActiveTab] = useState('lignes');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [orderId, setOrderId] = useState(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  const today = new Date().toISOString().split('T')[0];
  const tableContainerRef = useRef(null);

  // ✅ CHARGEMENT DES RÉFÉRENTIELS
  useEffect(() => {
    if (!activeEntity) return;
    
    // 1. Charger les Taxes (Module Compta)
    referentielsService.getTaxes(activeEntity.id)
      .then(res => {
        const normalize = (d) => Array.isArray(d) ? d : d.results || d.data || [];
        setTaxes(normalize(res));
      })
      .catch(err => console.error('❌ Erreur fetch taxes:', err));

    // 2. Charger les Produits (Module Produits - ProductTemplate)
    referentielsService.getProducts()
      .then(res => {
        const normalize = (d) => Array.isArray(d) ? d : d.results || d.data || [];
        setProducts(normalize(res));
      })
      .catch(err => console.error('❌ Erreur fetch produits:', err));

    // 3. Charger les autres référentiels
    const loadOthers = async () => {
      try {
        const [part, t, c, pl, u, fp, pt] = await Promise.all([
          referentielsService.getPartners(activeEntity.id),
          referentielsService.getTeams?.() || Promise.resolve([]),
          referentielsService.getCurrencies?.() || Promise.resolve([]),
          referentielsService.getPricelists?.(activeEntity.id) || Promise.resolve([]),
          referentielsService.getUoms?.() || Promise.resolve([]),
          referentielsService.getFiscalPositions?.(activeEntity.id) || Promise.resolve([]),
          // Note: Ajoute getPaymentTerms dans ton services.js si tu veux charger les conditions
          // Pour l'instant, on met une liste vide si la fonction n'existe pas
          referentielsService.getPaymentTerms?.() || Promise.resolve([]), 
        ]);
        const norm = (d) => Array.isArray(d) ? d : d.results || d.data || [];
        setPartners(norm(part)); setTeams(norm(t));
        setCurrencies(norm(c)); setPricelists(norm(pl)); setUoms(norm(u)); setFiscalPositions(norm(fp));
        setPaymentTerms(norm(pt));

        const defCur = norm(c).find(c => c.code === 'XOF') || norm(c)[0];
        const defPl = norm(pl)[0];
        setFormData(prev => ({
          ...prev, currency_id: defCur?.id || '', currency_label: defCur?.code || '',
          pricelist_id: defPl?.id || '', pricelist_label: defPl?.name || '', company_id: activeEntity.id
        }));
      } catch (err) { setError('Erreur chargement référentiels'); } finally { setLoading(false); }
    };
    loadOthers();

  }, [activeEntity]);

  // États stricts selon Excel
  const emptyLine = () => ({
    product_id: '', product_label: '',
    name: '', product_uom: '', product_uom_label: '',
    product_uom_qty: 1, qty_delivered: 0, qty_invoiced: 0,
    price_unit: 0, discount: 0,
    tax_id: '', tax_label: '',
    price_subtotal: 0, price_tax: 0, price_total: 0,
    customer_lead: 0, display_type: 'product', invoice_status: 'no', state: 'draft'
  });

  const initialFormData = {
    name: '', client_order_ref: '', origin: '',
    partner_id: '', partner_label: '',
    partner_invoice_id: '', partner_invoice_label: '',
    partner_shipping_id: '', partner_shipping_label: '',
    user_id: '', user_label: '', team_id: '', team_label: '',
    date_order: today, validity_date: '', commitment_date: '',
    pricelist_id: '', pricelist_label: '',
    payment_term_id: '', payment_term_label: '', // ✅ AJOUTÉ
    fiscal_position_id: '', fiscal_position_label: '',
    analytic_account_id: '', analytic_account_label: '',
    company_id: activeEntity?.id || '',
    currency_id: '', currency_label: '',
    stage_id: '', stage_label: '',
    note: '', require_signature: false, require_payment: false, picking_policy: 'direct',
    state: 'draft', invoice_status: 'no', delivery_status: 'no',
    lines: [emptyLine()]
  };

  const [formData, setFormData] = useState(initialFormData);

  const mark = () => { if (!hasUnsavedChanges) setHasUnsavedChanges(true); };
  const handleChange = (f, v) => { setFormData(p => ({ ...p, [f]: v })); mark(); };
  const handleLineChange = (i, f, v) => { setFormData(p => { const n = [...p.lines]; n[i] = { ...n[i], [f]: v }; return { ...p, lines: n }; }); mark(); };
  
  const handleLineMulti = (i, fields) => {
    setFormData(p => {
      const n = [...p.lines]; 
      n[i] = { ...n[i], ...fields };
      
      // ✅ AUTO-FILL depuis ProductTemplate
      if (fields.product_id) {
        const prod = products.find(pr => pr.id === fields.product_id);
        if (prod) {
          n[i] = { 
            ...n[i], 
            name: prod.name || n[i].name, 
            product_uom: prod.uom_id || '', 
            product_uom_label: prod.uom_name || '', 
            price_unit: prod.list_price || 0 
          };
        }
      }
      return { ...p, lines: n };
    }); mark();
  };

  const handleAmountChange = (i, f, v) => {
    const nv = v === '' ? '' : parseFloat(v);
    setFormData(p => {
      const n = [...p.lines]; n[i] = { ...n[i], [f]: nv };
      const l = n[i];
      const qty = parseFloat(l.product_uom_qty) || 0, price = parseFloat(l.price_unit) || 0, disc = parseFloat(l.discount) || 0;
      const taxRate = 0.18; // Placeholder: sera dynamique via tax_id
      const sub = qty * price * (1 - disc / 100), tax = sub * taxRate, tot = sub + tax;
      n[i] = { ...l, price_subtotal: +sub.toFixed(2), price_tax: +tax.toFixed(2), price_total: +tot.toFixed(2) };
      return { ...p, lines: n };
    }); mark();
  };

  const addLine = () => {
    setFormData(p => ({ ...p, lines: [...p.lines, emptyLine()] })); mark();
    setTimeout(() => tableContainerRef.current?.scrollTo({ top: tableContainerRef.current.scrollHeight, behavior: 'smooth' }), 10);
  };

  const removeLine = (i) => {
    if (formData.lines.length <= 1) return setError('Au moins une ligne requise');
    setFormData(p => ({ ...p, lines: p.lines.filter((_, idx) => idx !== i) })); mark();
  };

  // ✅ TABULATION → NOUVELLE LIGNE (Sur le dernier champ saisissable : Taxe)
  const handleLastFieldTab = (e, lineIndex) => {
    if (e.key === 'Tab' && !e.shiftKey) {
      const isLast = lineIndex === formData.lines.length - 1;
      if (isLast) {
        e.preventDefault();
        addLine();
        setTimeout(() => {
          // Focus sur le premier champ (Produit) de la nouvelle ligne
          const inputs = document.querySelectorAll(`tbody tr:last-child input[type="text"]`);
          if (inputs[0]) inputs[0].focus();
        }, 50);
      }
    }
  };

  const totals = formData.lines.reduce((a, l) => ({
    untaxed: a.untaxed + (parseFloat(l.price_subtotal) || 0),
    tax: a.tax + (parseFloat(l.price_tax) || 0),
    total: a.total + (parseFloat(l.price_total) || 0)
  }), { untaxed: 0, tax: 0, total: 0 });

  const prepareData = useCallback(() => {
    const toId = v => (v === '' || v == null ? null : parseInt(v));
    const toNum = v => (v === '' || v == null ? 0 : parseFloat(v));
    
    const paymentTermId = toId(formData.payment_term_id);

    return {
      name: formData.name || undefined, 
      client_order_ref: formData.client_order_ref, 
      origin: formData.origin,
      partner_id: toId(formData.partner_id), 
      partner_invoice_id: toId(formData.partner_invoice_id) || toId(formData.partner_id),
      partner_shipping_id: toId(formData.partner_shipping_id) || toId(formData.partner_id),
      user_id: toId(formData.user_id), 
      team_id: toId(formData.team_id), 
      stage_id: toId(formData.stage_id),
      date_order: formData.date_order, 
      validity_date: formData.validity_date || null, 
      commitment_date: formData.commitment_date || null,
      pricelist_id: toId(formData.pricelist_id), 
      
      // ✅ Envoi conditionnel pour éviter l'erreur 400 si vide
      ...(paymentTermId ? { payment_term_id: paymentTermId } : {}),

      fiscal_position_id: toId(formData.fiscal_position_id), 
      analytic_account_id: toId(formData.analytic_account_id),
      company_id: activeEntity?.id, 
      currency_id: toId(formData.currency_id),
      note: formData.note, 
      require_signature: formData.require_signature, 
      require_payment: formData.require_payment, 
      picking_policy: formData.picking_policy,
      state: formData.state, 
      invoice_status: formData.invoice_status, 
      delivery_status: formData.delivery_status,
      order_line: formData.lines.map((l, i) => ({
        product_id: toId(l.product_id), 
        name: l.name?.trim() || l.product_label || `Ligne ${i+1}`,
        product_uom_qty: toNum(l.product_uom_qty), 
        product_uom: toId(l.product_uom),
        price_unit: toNum(l.price_unit), 
        discount: toNum(l.discount),
        tax_id: l.tax_id ? [parseInt(l.tax_id)] : [],
        display_type: l.display_type || 'product', 
        customer_lead: toNum(l.customer_lead)
      }))
    };
  }, [formData, activeEntity]);

  const handleSave = async (silent = false) => {
    if (!activeEntity || !formData.partner_id || formData.lines.some(l => !l.product_id)) {
      setError('Client et au moins un produit sont obligatoires'); return false;
    }
    setLoading(true); if (!silent) setError(null);
    try {
      const res = orderId 
        ? await commandesService.update(orderId, prepareData(), activeEntity.id)
        : await commandesService.create(prepareData(), activeEntity.id);
      if (res?.id) { setOrderId(res.id); if (res.name) setFormData(p => ({ ...p, name: res.name })); }
      if (!silent) { setSuccess('Commande enregistrée !'); setTimeout(() => setSuccess(null), 3000); }
      setHasUnsavedChanges(false); return true;
    } catch (e) { 
      // Affiche l'erreur détaillée du backend
      const msg = e.response?.data?.payment_term_id ? "Condition de paiement requise." : e.message;
      setError(`Échec : ${msg}`); 
      return false; 
    } finally { setLoading(false); }
  };

  const handleConfirm = async () => {
    if (!orderId) { if (!await handleSave(true)) return; }
    setLoading(true);
    try { await commandesService.confirm(orderId, activeEntity.id); setFormData(p => ({ ...p, state: 'sale' })); setSuccess('Commande confirmée !'); setHasUnsavedChanges(false); }
    catch (e) { setError(`Erreur : ${e.message}`); } finally { setLoading(false); }
  };

  const handleDiscard = () => { if (hasUnsavedChanges) setShowConfirmDialog(true); else { setFormData(initialFormData); setOrderId(null); setHasUnsavedChanges(false); } };
  const confirmDiscard = () => { setFormData(initialFormData); setOrderId(null); setHasUnsavedChanges(false); setShowConfirmDialog(false); navigate('/vente/commandes'); };
  const handleGoToList = () => { if (hasUnsavedChanges) setShowConfirmDialog(true); else navigate('/vente/commandes'); };

  useEffect(() => {
    const h = (e) => { if (hasUnsavedChanges) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', h); return () => window.removeEventListener('beforeunload', h);
  }, [hasUnsavedChanges]);

  const isDraft = formData.state === 'draft';
  const canConfirm = isDraft && formData.partner_id && formData.lines.some(l => l.product_id);

  if (!activeEntity) return (
    <div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
      <div className="bg-white border border-gray-300 p-6 rounded max-w-md text-center">
        <FiAlertCircle className="text-amber-600 mx-auto mb-3" size={32} />
        <h2 className="text-lg font-bold mb-2">Entité requise</h2>
        <button onClick={() => navigate('/select-entite')} className="px-4 py-2 bg-violet-600 text-white rounded hover:bg-violet-700">Sélectionner une entité</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto bg-white border border-gray-300">
        {/* En-tête ligne 1 */}
        <div className="border-b border-gray-300 px-4 py-3">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-start gap-3">
              <Tooltip text="Nouvelle commande">
                <button onClick={handleDiscard}
                  className="h-12 px-4 bg-violet-600 text-white text-sm hover:bg-violet-700 hover:scale-105 hover:shadow-md active:scale-95 transition-all duration-200 flex items-center justify-center font-medium border-0"
                  style={{ minWidth: '100px' }}
                >
                  <FiPlus size={16} className="mr-1" /><span>Nouveau</span>
                </button>
              </Tooltip>
              <div className="flex flex-col h-12 justify-center">
                <div className="text-lg font-bold text-gray-900 cursor-pointer hover:text-violet-600 hover:scale-105 transition-all duration-200"
                  onClick={handleGoToList}>
                  Commandes Client
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`px-2 py-0.5 text-xs font-medium ${
                    isDraft ? 'bg-amber-100 text-amber-700' :
                    formData.state === 'sale' ? 'bg-emerald-100 text-emerald-700' :
                    formData.state === 'cancel' ? 'bg-red-100 text-red-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {isDraft ? 'Devis' : formData.state === 'sale' ? 'Confirmé' : formData.state === 'cancel' ? 'Annulé' : formData.state}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Tooltip text="Actions">
                  <button className="h-8 px-3 border border-gray-300 text-gray-700 text-xs hover:bg-gray-50 hover:scale-105 transition-all duration-200 flex items-center gap-1">
                    <FiSettings size={12} /><span>Actions</span>
                  </button>
                </Tooltip>
              </div>
              <Tooltip text="Enregistrer">
                <button onClick={() => handleSave().then(ok => ok && navigate('/vente/commandes'))} disabled={loading}
                  className="w-8 h-8 rounded-full bg-violet-600 text-white hover:bg-violet-700 hover:scale-110 hover:shadow-lg active:scale-90 disabled:opacity-50 transition-all duration-200 flex items-center justify-center shadow-sm">
                  <FiUploadCloud size={16} />
                </button>
              </Tooltip>
              <Tooltip text="Annuler les modifications">
                <button onClick={handleDiscard}
                  className="w-8 h-8 rounded-full bg-black text-white hover:bg-gray-800 hover:scale-110 hover:shadow-lg active:scale-90 transition-all duration-200 flex items-center justify-center">
                  <FiX size={16} />
                </button>
              </Tooltip>
            </div>
          </div>
        </div>

        {/* En-tête ligne 2 */}
        <div className="border-b border-gray-300 px-4 py-3">
          <div className="flex flex-col">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Tooltip text={!canConfirm && isDraft ? "Remplissez client, produit et prix" : (isDraft ? "Confirmer la commande" : "Déjà confirmé")}>
                  <button type="button" onClick={handleConfirm}
                    disabled={loading || !isDraft || !canConfirm}
                    className={`h-8 px-3 text-xs font-medium border transition-all duration-200 flex items-center justify-center ${
                      isDraft && canConfirm
                        ? 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700 hover:scale-105 hover:shadow-md active:scale-95 cursor-pointer' 
                        : 'bg-gray-100 text-gray-500 border-gray-300 cursor-not-allowed'
                    }`}
                  >
                    Confirmer
                  </button>
                </Tooltip>
                {error ? (
                  <div className="flex items-center gap-1 text-xs text-red-600">
                    <FiAlertCircle size={14} /><span>{error}</span>
                  </div>
                ) : !canConfirm && isDraft ? (
                  <div className="flex items-center gap-1 text-xs text-amber-600">
                    <FiInfo size={14} /><span>Remplissez client, produit et prix</span>
                  </div>
                ) : null}
              </div>
              <div className="flex items-center gap-2">
                <div className={`h-8 px-3 text-xs font-medium border ${isDraft ? 'bg-amber-100 text-amber-700 border-amber-300' : 'bg-gray-100 text-gray-500 border-gray-300'}`}>Devis</div>
                <div className={`h-8 px-3 text-xs font-medium border ${formData.state === 'sale' ? 'bg-emerald-100 text-emerald-700 border-emerald-300' : 'bg-gray-100 text-gray-500 border-gray-300'}`}>Confirmé</div>
              </div>
            </div>
            <div className="mt-2 ml-1">
              <span className="text-xs text-gray-600">N° {formData.name && formData.name !== `CMD-${Date.now()}` ? formData.name : 'Génération après confirmation'}</span>
            </div>
          </div>
        </div>

        {hasUnsavedChanges && <div className="px-4 py-1 bg-blue-50 text-blue-700 text-xs border-b border-blue-200">Modifications non sauvegardées</div>}

        {/* Informations commande */}
        <div className="px-4 py-3 border-b border-gray-300">
          <div className="grid grid-cols-2 gap-4">
            {/* Colonne Gauche */}
            <div className="space-y-2">
              <div className="flex items-center" style={{ height: '26px' }}>
                <label className="text-xs text-gray-700 min-w-[140px] font-medium">Client *</label>
                <div className="flex-1 ml-2">
                  <AutocompleteInput value={formData.partner_label} selectedId={formData.partner_id}
                    onChange={t => handleChange('partner_label', t)}
                    onSelect={(id, l) => { setFormData(p => ({ ...p, partner_id: id, partner_label: l })); mark(); }}
                    options={partners} getOptionLabel={p => p.raison_sociale || p.nom || p.name || ''} placeholder="Sélectionner un client" required />
                </div>
              </div>
              <div className="flex items-center" style={{ height: '26px' }}>
                <label className="text-xs text-gray-700 min-w-[140px] font-medium">Adresse facturation</label>
                <div className="flex-1 ml-2">
                  <AutocompleteInput value={formData.partner_invoice_label} selectedId={formData.partner_invoice_id}
                    onChange={t => handleChange('partner_invoice_label', t)}
                    onSelect={(id, l) => { setFormData(p => ({ ...p, partner_invoice_id: id, partner_invoice_label: l })); mark(); }}
                    options={partners} getOptionLabel={p => p.raison_sociale || p.nom || ''} placeholder="Par défaut client" />
                </div>
              </div>
              <div className="flex items-center" style={{ height: '26px' }}>
                <label className="text-xs text-gray-700 min-w-[140px] font-medium">Date commande</label>
                <input type="date" value={formData.date_order} onChange={e => handleChange('date_order', e.target.value)}
                  className="flex-1 px-2 py-1 border border-gray-300 text-xs ml-2" style={{ height: '26px' }} />
              </div>
              <div className="flex items-center" style={{ height: '26px' }}>
                <label className="text-xs text-gray-700 min-w-[140px] font-medium">Validité devis</label>
                <input type="date" value={formData.validity_date} onChange={e => handleChange('validity_date', e.target.value)}
                  className="flex-1 px-2 py-1 border border-gray-300 text-xs ml-2" style={{ height: '26px' }} />
              </div>
              <div className="flex items-center" style={{ height: '26px' }}>
                <label className="text-xs text-gray-700 min-w-[140px] font-medium">Liste de prix</label>
                <div className="flex-1 ml-2">
                  <AutocompleteInput value={formData.pricelist_label} selectedId={formData.pricelist_id}
                    onChange={t => handleChange('pricelist_label', t)}
                    onSelect={(id, l) => { setFormData(p => ({ ...p, pricelist_id: id, pricelist_label: l })); mark(); }}
                    options={pricelists} getOptionLabel={p => p.name} placeholder="Standard" />
                </div>
              </div>
            </div>

            {/* Colonne Droite */}
            <div className="space-y-2">
              <div className="flex items-center" style={{ height: '26px' }}>
                <label className="text-xs text-gray-700 min-w-[140px] font-medium">Réf. Client</label>
                <input type="text" value={formData.client_order_ref} onChange={e => handleChange('client_order_ref', e.target.value)}
                  className="flex-1 px-2 py-1 border border-gray-300 text-xs ml-2" style={{ height: '26px' }} placeholder="PO-2024-001" />
              </div>
              <div className="flex items-center" style={{ height: '26px' }}>
                <label className="text-xs text-gray-700 min-w-[140px] font-medium">Adresse livraison</label>
                <div className="flex-1 ml-2">
                  <AutocompleteInput value={formData.partner_shipping_label} selectedId={formData.partner_shipping_id}
                    onChange={t => handleChange('partner_shipping_label', t)}
                    onSelect={(id, l) => { setFormData(p => ({ ...p, partner_shipping_id: id, partner_shipping_label: l })); mark(); }}
                    options={partners} getOptionLabel={p => p.raison_sociale || p.nom || ''} placeholder="Par défaut client" />
                </div>
              </div>
              <div className="flex items-center" style={{ height: '26px' }}>
                <label className="text-xs text-gray-700 min-w-[140px] font-medium">Équipe</label>
                <div className="flex-1 ml-2">
                  <AutocompleteInput value={formData.team_label} selectedId={formData.team_id}
                    onChange={t => handleChange('team_label', t)}
                    onSelect={(id, l) => { setFormData(p => ({ ...p, team_id: id, team_label: l })); mark(); }}
                    options={teams} getOptionLabel={t => t.name} placeholder="Sélectionner" />
                </div>
              </div>
              <div className="flex items-center" style={{ height: '26px' }}>
                <label className="text-xs text-gray-700 min-w-[140px] font-medium">Commercial</label>
                <input type="text" value={formData.user_label} onChange={e => handleChange('user_label', e.target.value)}
                  className="flex-1 px-2 py-1 border border-gray-300 text-xs ml-2" style={{ height: '26px' }} placeholder="Nom du commercial" />
              </div>
              
              {/* ✅ CHAMP CONDITION DE PAIEMENT */}
              <div className="flex items-center" style={{ height: '26px' }}>
                <label className="text-xs text-gray-700 min-w-[140px] font-medium">Condition de paiement</label>
                <div className="flex-1 ml-2">
                  <AutocompleteInput 
                    value={formData.payment_term_label} 
                    selectedId={formData.payment_term_id}
                    onChange={t => handleChange('payment_term_label', t)}
                    onSelect={(id, l) => { setFormData(p => ({ ...p, payment_term_id: id, payment_term_label: l })); mark(); }}
                    options={paymentTerms} 
                    getOptionLabel={pt => pt.name || pt.code || ''} 
                    placeholder="Sélectionner (ex: 30 jours)" 
                  />
                </div>
              </div>

              <div className="flex items-center" style={{ height: '26px' }}>
                <label className="text-xs text-gray-700 min-w-[140px] font-medium">Devise</label>
                <div className="flex-1 ml-2">
                  <AutocompleteInput value={formData.currency_label} selectedId={formData.currency_id}
                    onChange={t => handleChange('currency_label', t)}
                    onSelect={(id, l) => { setFormData(p => ({ ...p, currency_id: id, currency_label: l })); mark(); }}
                    options={currencies} getOptionLabel={c => `${c.code} (${c.symbole || ''})`} placeholder="XOF" />
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
                      <th className="border border-gray-300 px-2 py-1.5 text-xs font-medium text-gray-700 text-left">Produit *</th>
                      <th className="border border-gray-300 px-2 py-1.5 text-xs font-medium text-gray-700 text-left">Libellé</th>
                      <th className="border border-gray-300 px-2 py-1.5 text-xs font-medium text-gray-700 text-right">Qté</th>
                      <th className="border border-gray-300 px-2 py-1.5 text-xs font-medium text-gray-700 text-left">UoM</th>
                      <th className="border border-gray-300 px-2 py-1.5 text-xs font-medium text-gray-700 text-right">Prix unit.</th>
                      <th className="border border-gray-300 px-2 py-1.5 text-xs font-medium text-gray-700 text-right">Remise %</th>
                      <th className="border border-gray-300 px-2 py-1.5 text-xs font-medium text-gray-700 text-left">Taxe</th>
                      <th className="border border-gray-300 px-2 py-1.5 text-xs font-medium text-gray-700 text-right">Total HT</th>
                      <th className="border border-gray-300 px-2 py-1.5 text-xs font-medium text-gray-700 text-right">Total TTC</th>
                      <th className="border border-gray-300 px-2 py-1.5 text-xs font-medium text-gray-700 text-center">•••</th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData.lines.map((l, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="border border-gray-300 p-1" style={{ minWidth: '180px' }}>
                          <AutocompleteInput value={l.product_label} selectedId={l.product_id}
                            onChange={t => handleLineChange(i, 'product_label', t)}
                            onSelect={(id, lb) => handleLineMulti(i, { product_id: id, product_label: lb })}
                            options={products} 
                            getOptionLabel={p => `${p.default_code ? `[${p.default_code}] ` : ''}${p.name}`} 
                            placeholder="Rechercher un produit" required />
                        </td>
                        <td className="border border-gray-300 p-1" style={{ minWidth: '150px' }}>
                          <input type="text" value={l.name} onChange={e => handleLineChange(i, 'name', e.target.value)}
                            className="w-full px-2 py-1 border-0 text-xs focus:ring-1 focus:ring-violet-500" style={{ height: '26px' }} placeholder="Libellé" />
                        </td>
                        <td className="border border-gray-300 p-1" style={{ minWidth: '70px' }}>
                          <input type="number" min="0" step="0.01" value={l.product_uom_qty} onChange={e => handleAmountChange(i, 'product_uom_qty', e.target.value)}
                            className="w-full px-2 py-1 border-0 text-xs text-right focus:ring-1 focus:ring-violet-500" style={{ height: '26px' }} placeholder="1" />
                        </td>
                        <td className="border border-gray-300 p-1" style={{ minWidth: '80px' }}>
                          <AutocompleteInput value={l.product_uom_label} selectedId={l.product_uom}
                            onChange={t => handleLineChange(i, 'product_uom_label', t)}
                            onSelect={(id, lb) => handleLineMulti(i, { product_uom: id, product_uom_label: lb })}
                            options={uoms} getOptionLabel={u => u.name || u.code || ''} placeholder="Unité" />
                        </td>
                        <td className="border border-gray-300 p-1" style={{ minWidth: '90px' }}>
                          <AmountInput value={l.price_unit} onChange={v => handleAmountChange(i, 'price_unit', v)} placeholder="0" />
                        </td>
                        <td className="border border-gray-300 p-1" style={{ minWidth: '70px' }}>
                          <input type="number" min="0" max="100" step="0.01" value={l.discount} onChange={e => handleAmountChange(i, 'discount', e.target.value)}
                            className="w-full px-2 py-1 border-0 text-xs text-right focus:ring-1 focus:ring-violet-500" style={{ height: '26px' }} placeholder="0" />
                        </td>
                        
                        {/* ✅ CHAMP TAXE VISIBLE & SÉLECTIONNABLE + TAB */}
                        <td className="border border-gray-300 p-1" style={{ minWidth: '120px' }}>
                          <AutocompleteInput 
                            value={l.tax_label} selectedId={l.tax_id} 
                            onChange={t => handleLineChange(i, 'tax_label', t)} 
                            onSelect={(id, lb) => handleLineMulti(i, { tax_id: id, tax_label: lb })} 
                            options={taxes} 
                            getOptionLabel={t => {
                              const name = t.name || t.tax_name || t.display_name || t.code || 'Sans nom';
                              const amount = t.amount ?? t.rate ?? t.percent ?? t.value ?? 0;
                              return `${name} (${amount}%)`;
                            }} 
                            placeholder="Sélectionner taxe"
                            onKeyDown={(e) => handleLastFieldTab(e, i)}
                          />
                        </td>
                        
                        <td className="border border-gray-300 p-1 text-right text-xs">{formatAmount(l.price_subtotal)}</td>
                        <td className="border border-gray-300 p-1 text-right text-xs font-medium text-violet-600">{formatAmount(l.price_total)}</td>
                        <td className="border border-gray-300 p-1 w-[40px]">
                          <button onClick={() => removeLine(i)} tabIndex="-1"
                            className="w-full flex items-center justify-center p-1 text-gray-400 hover:text-red-600 hover:scale-110 active:scale-90 transition-all duration-200" style={{ height: '26px' }} title="Supprimer">
                            <FiTrash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mb-3 flex items-center gap-4">
                <Tooltip text="Ajouter une ligne">
                  <button onClick={addLine}
                    className="h-8 px-3 bg-violet-600 text-white text-xs hover:bg-violet-700 hover:scale-105 hover:shadow-md active:scale-95 transition-all duration-200 flex items-center gap-1">
                    <FiPlus size={12} /><span>Ajouter une ligne</span>
                  </button>
                </Tooltip>
                <div className="text-xs text-gray-600">{formData.lines.length} ligne(s)</div>
              </div>

              <div className="bg-violet-50 border border-violet-200 px-4 py-2 flex justify-end gap-8 text-sm font-bold">
                <span>Total HT: {formatAmount(totals.untaxed)} XOF</span>
                <span>TVA: {formatAmount(totals.tax)} XOF</span>
                <span className="text-violet-700">Total TTC: {formatAmount(totals.total)} XOF</span>
              </div>
            </>
          ) : activeTab === 'notes' ? (
            <textarea value={formData.note} onChange={e => handleChange('note', e.target.value)}
              className="w-full h-48 px-3 py-2 border border-gray-300 text-xs focus:ring-2 focus:ring-violet-500"
              placeholder="Termes et conditions, remarques internes..." />
          ) : (
            <div className="text-center py-8 text-gray-500 text-xs border border-gray-300 rounded">
              <FiInfo className="mx-auto mb-2" size={24}/>Gestion des options à implémenter (OrderOption)
            </div>
          )}
        </div>

        {success && <div className="px-4 py-3 bg-green-50 text-green-700 text-sm border-t border-green-200 flex items-center gap-2"><FiCheck size={14}/>{success}</div>}
      </div>

      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow-lg max-w-md w-full">
            <h3 className="text-lg font-bold mb-3">Modifications non sauvegardées</h3>
            <p className="text-sm text-gray-600 mb-4">Voulez-vous enregistrer avant de quitter ?</p>
            <div className="flex justify-end gap-3">
              <button onClick={async () => { setShowConfirmDialog(false); const ok = await handleSave(true); if (ok) navigate('/vente/commandes'); }} className="px-4 py-2 bg-violet-600 text-white text-sm rounded hover:bg-violet-700">Enregistrer</button>
              <button onClick={confirmDiscard} className="px-4 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700">Ne pas enregistrer</button>
              <button onClick={() => setShowConfirmDialog(false)} className="px-4 py-2 border text-gray-700 text-sm rounded hover:bg-gray-50">Annuler</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}