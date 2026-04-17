// src/features/comptabilité/pages/PiecesComptables/Show.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  FiTrash2, FiCheck, FiX, FiRefreshCw,
  FiPrinter, FiCopy, FiAlertCircle,
  FiRotateCcw, FiPlus, FiUploadCloud, FiSettings,
  FiBriefcase, FiPaperclip, FiInfo
} from 'react-icons/fi';
import { useEntity } from '../../../../context/EntityContext';
import { piecesService } from "../../services";

// ==========================================
// COMPOSANT TOOLTIP
// ==========================================
const Tooltip = ({ children, text, position = 'top' }) => {
  const [show, setShow] = useState(false);
  
  return (
    <div className="relative inline-block">
      <div
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
      >
        {children}
      </div>
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
// COMPOSANT AUTOCOMPLETE
// ==========================================
const AutocompleteInput = ({
  value,
  selectedId,
  onChange,
  onSelect,
  options,
  getOptionLabel,
  placeholder = "",
  className = "",
  disabled = false,
  required = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value || '');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);
  const [dropdownStyle, setDropdownStyle] = useState({});

  useEffect(() => {
    if (value !== undefined) {
      setInputValue(value);
    }
  }, [value]);

  const filteredOptions = options.filter(option => {
    const label = getOptionLabel(option).toLowerCase();
    const search = inputValue.toLowerCase();
    return label.includes(search);
  });

  const updateDropdownPosition = () => {
    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      setDropdownStyle({
        position: 'fixed',
        top: `${rect.bottom}px`,
        left: `${rect.left}px`,
        width: `${rect.width}px`,
        zIndex: 9999,
        maxHeight: '200px',
        overflowY: 'auto'
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
      return () => {
        window.removeEventListener('scroll', handleScroll, true);
        window.removeEventListener('resize', handleResize);
      };
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        inputRef.current &&
        !inputRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    setIsOpen(true);
    setHighlightedIndex(0);
    onChange(newValue);
    if (selectedId) {
      onSelect(null, '');
    }
  };

  const handleSelectOption = (option) => {
    const label = getOptionLabel(option);
    const id = option.id;
    setInputValue(label);
    setIsOpen(false);
    onSelect(id, label);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setIsOpen(true);
      setHighlightedIndex(prev =>
        prev < filteredOptions.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => prev > 0 ? prev - 1 : 0);
    } else if (e.key === 'Enter' && isOpen && filteredOptions.length > 0) {
      e.preventDefault();
      handleSelectOption(filteredOptions[highlightedIndex]);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div className="relative w-full">
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          setIsOpen(true);
          updateDropdownPosition();
        }}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        className={`w-full px-2 py-1 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none ${className}`}
        style={{ height: '26px', border: 'none', backgroundColor: 'transparent' }}
        autoComplete="off"
      />
      {isOpen && filteredOptions.length > 0 && (
        <div
          ref={dropdownRef}
          className="bg-white border border-gray-300 shadow-lg rounded z-50"
          style={dropdownStyle}
        >
          {filteredOptions.map((option, index) => (
            <div
              key={option.id}
              className={`px-2 py-1 text-xs cursor-pointer ${
                index === highlightedIndex
                  ? 'bg-blue-100 text-blue-700'
                  : 'hover:bg-blue-50'
              } ${option.id === selectedId ? 'bg-blue-50' : ''}`}
              onClick={() => handleSelectOption(option)}
              onMouseEnter={() => setHighlightedIndex(index)}
            >
              {getOptionLabel(option)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ==========================================
// COMPOSANT CELL
// ==========================================
const Cell = ({ children, className = "", align = "left" }) => {
  const alignClass = align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left";
  
  if (!children || children === '—' || children === '') {
    return (
      <div className={`px-2 py-1 text-xs text-gray-400 text-center w-full ${className}`}>
        —
      </div>
    );
  }
  
  return (
    <div className={`px-2 py-1 text-xs ${alignClass} ${className}`}>
      {children}
    </div>
  );
};

// ==========================================
// FONCTION D'EXTRACTION DE TAXE
// ==========================================
const extractTax = (line, tMap) => {
  if (!line) return { id: '', label: '' };
  
  if (line.tax_ids && Array.isArray(line.tax_ids) && line.tax_ids.length > 0) {
    const tax = line.tax_ids[0];
    if (typeof tax === 'object' && tax !== null) {
      if (tax.name) {
        return { id: tax.id || '', label: `${tax.name} (${tax.amount}%)` };
      }
      if (tax.id && tMap && tMap[tax.id]) {
        const t = tMap[tax.id];
        return { id: t.id, label: `${t.name} (${t.amount}%)` };
      }
    }
    if (typeof tax === 'number' && tMap && tMap[tax]) {
      const t = tMap[tax];
      return { id: t.id, label: `${t.name} (${t.amount}%)` };
    }
  }
  
  if (line.tax_line) {
    if (typeof line.tax_line === 'object' && line.tax_line !== null) {
      if (line.tax_line.name) {
        return { id: line.tax_line.id || '', label: `${line.tax_line.name} (${line.tax_line.amount}%)` };
      }
      if (line.tax_line.id && tMap && tMap[line.tax_line.id]) {
        const t = tMap[line.tax_line.id];
        return { id: t.id, label: `${t.name} (${t.amount}%)` };
      }
    }
    if (typeof line.tax_line === 'number' && tMap && tMap[line.tax_line]) {
      const t = tMap[line.tax_line];
      return { id: t.id, label: `${t.name} (${t.amount}%)` };
    }
  }
  
  if (line.tax_id) {
    if (typeof line.tax_id === 'object' && line.tax_id !== null) {
      if (line.tax_id.name) {
        return { id: line.tax_id.id || '', label: `${line.tax_id.name} (${line.tax_id.amount}%)` };
      }
      if (line.tax_id.id && tMap && tMap[line.tax_id.id]) {
        const t = tMap[line.tax_id.id];
        return { id: t.id, label: `${t.name} (${t.amount}%)` };
      }
    }
    if (typeof line.tax_id === 'number' && tMap && tMap[line.tax_id]) {
      const t = tMap[line.tax_id];
      return { id: t.id, label: `${t.name} (${t.amount}%)` };
    }
  }
  
  return { id: '', label: '' };
};

const getTaxDisplay = (line, taxesMap, taxesMapRef) => {
  let result = extractTax(line, taxesMap);
  if (result.label) return result.label;
  
  result = extractTax(line, taxesMapRef?.current);
  if (result.label) return result.label;
  
  return null;
};

// ✅ Fonction pour formater les montants sans décimales avec séparateur d'espace
const formatAmount = (value) => {
  if (!value && value !== 0) return null;
  const num = parseFloat(value);
  if (isNaN(num)) return null;
  return Math.round(num).toLocaleString('fr-FR');
};

export default function Show() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { activeEntity } = useEntity();
  
  const [piece, setPiece] = useState(null);
  const [formData, setFormData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [activeTab, setActiveTab] = useState('ecritures');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [actionInProgress, setActionInProgress] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [validationSuccess, setValidationSuccess] = useState(null);
  const [debugInfo, setDebugInfo] = useState(null);
  const [isLoadingReferentials, setIsLoadingReferentials] = useState(false);
  
  const [journals, setJournals] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [partners, setPartners] = useState([]);
  const [devises, setDevises] = useState([]);
  const [taxes, setTaxes] = useState([]);
  const [fiscalPositions, setFiscalPositions] = useState([]);
  
  const [journalsMap, setJournalsMap] = useState({});
  const [accountsMap, setAccountsMap] = useState({});
  const [partnersMap, setPartnersMap] = useState({});
  const [devisesMap, setDevisesMap] = useState({});
  const [taxesMap, setTaxesMap] = useState({});
  const [fiscalPositionsMap, setFiscalPositionsMap] = useState({});

  const taxesMapRef = useRef({});
  const actionsMenuRef = useRef(null);

  const getJournalLabel = (journal) => {
    if (!journal) return '—';
    if (typeof journal === 'object') {
      const code = journal.code || '';
      const name = journal.name || '';
      return code && name ? `${code} - ${name}` : (code || name || '—');
    }
    const journalObj = journalsMap[journal];
    return journalObj ? `${journalObj.code || ''} - ${journalObj.name || ''}` : `ID: ${journal}`;
  };

  const getPartnerName = (partner) => {
    if (!partner) return '—';
    if (typeof partner === 'object') {
      return partner.raison_sociale || partner.nom || partner.name || '—';
    }
    const partnerObj = partnersMap[partner];
    return partnerObj?.displayName || `ID: ${partner}`;
  };

  const getDeviseLabel = (devise) => {
    if (!devise) return '—';
    if (typeof devise === 'object') {
      const code = devise.code || '';
      const symbole = devise.symbole || '';
      return symbole ? `${code} (${symbole})` : code;
    }
    const deviseObj = devisesMap[devise];
    if (deviseObj) {
      return deviseObj.symbole ? `${deviseObj.code} (${deviseObj.symbole})` : deviseObj.code || '—';
    }
    return '—';
  };

  const getAccountLabel = (account) => {
    if (!account) return null;
    if (typeof account === 'object' && account.code !== undefined) {
      return { code: account.code || '', name: account.name || '' };
    }
    const accountId = typeof account === 'number' ? account : parseInt(account, 10);
    if (!isNaN(accountId)) {
      const accountObj = accountsMap[accountId];
      if (accountObj) {
        return { code: accountObj.code || '', name: accountObj.name || '' };
      }
    }
    return null;
  };

  const getFiscalPositionLabel = (position) => {
    if (!position) return '—';
    if (typeof position === 'object') {
      return position.name || '—';
    }
    const positionObj = fiscalPositionsMap[position];
    return positionObj?.name || '—';
  };

  const emptyLine = () => ({
    name: '',
    account_id: '',
    account_label: '',
    partner_id: '',
    partner_label: '',
    debit: '',
    credit: '',
    tax_id: '',
    tax_label: '',
    tax_base_amount: '',
    date_maturity: '',
    discount_amount_currency: '',
    discount_percentage: '',
    discount_date: '',
  });

  const addLine = () => {
    setFormData(prev => ({
      ...prev,
      lines: [...prev.lines, emptyLine()]
    }));
    markAsModified();
  };

  const removeLine = (index) => {
    if (formData.lines.length <= 1) {
      setError('Une pièce doit avoir au moins une ligne');
      return;
    }
    setFormData(prev => ({
      ...prev,
      lines: prev.lines.filter((_, i) => i !== index)
    }));
    markAsModified();
  };

  const handleTabOnLastLine = (e, lineIndex, isLastColumn = false) => {
    const isLastLine = lineIndex === (formData?.lines?.length || 0) - 1;
    if (e.key === 'Tab' && !e.shiftKey && isLastLine && isLastColumn) {
      e.preventDefault();
      addLine();
      setTimeout(() => {
        const newLineIndex = lineIndex + 1;
        const firstInput = document.querySelector(
          `tr:nth-child(${newLineIndex + 1}) td:first-child input`
        );
        if (firstInput) firstInput.focus();
      }, 50);
    }
  };

  useEffect(() => {
    if (!activeEntity) {
      setError('Veuillez sélectionner une entité pour voir la pièce comptable');
      setLoading(false);
    }
  }, [activeEntity]);

  useEffect(() => {
    if (id && activeEntity) {
      loadReferentials();
    }
  }, [id, activeEntity]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (actionsMenuRef.current && !actionsMenuRef.current.contains(e.target)) {
        setShowActionsMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto-clear validation success message after 5 seconds
  useEffect(() => {
    if (validationSuccess) {
      const timer = setTimeout(() => {
        setValidationSuccess(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [validationSuccess]);

  const loadReferentials = async () => {
    // ✅ Empêcher les appels multiples
    if (isLoadingReferentials) {
      console.log('⏭️ Chargement référentiels déjà en cours, ignoré');
      return;
    }
    
    try {
      setIsLoadingReferentials(true);
      setLoading(true);
      setError(null);
      
      console.log('🔍 [DEBUG] Chargement des référentiels...');
      
      const [
        journalsData,
        accountsData,
        partnersData,
        devisesData,
        taxesData,
        fiscalPositionsData
      ] = await Promise.all([
        piecesService.getJournals(activeEntity.id),
        piecesService.getAccounts(activeEntity.id),
        piecesService.getPartners(activeEntity.id),
        piecesService.getDevises(activeEntity.id),
        piecesService.getTaxes?.(activeEntity.id) || Promise.resolve([]),
        piecesService.getFiscalPositions?.(activeEntity.id) || Promise.resolve([]),
      ]);

      const normalizeData = (data) => {
        if (!data) return [];
        if (Array.isArray(data)) return data;
        if (Array.isArray(data.results)) return data.results;
        if (Array.isArray(data.data)) return data.data;
        return [];
      };

      const normalizedJournals = normalizeData(journalsData);
      const normalizedAccounts = normalizeData(accountsData);
      const normalizedPartners = normalizeData(partnersData);
      const normalizedDevises = normalizeData(devisesData);
      const normalizedTaxes = normalizeData(taxesData);
      const normalizedFiscalPositions = normalizeData(fiscalPositionsData);

      setJournals(normalizedJournals);
      setAccounts(normalizedAccounts);
      setPartners(normalizedPartners);
      setDevises(normalizedDevises);
      setTaxes(normalizedTaxes);
      setFiscalPositions(normalizedFiscalPositions);

      const journalsObj = {};
      normalizedJournals.forEach(j => { journalsObj[j.id] = j; });
      setJournalsMap(journalsObj);

      const accountsObj = {};
      normalizedAccounts.forEach(a => { accountsObj[a.id] = a; });
      setAccountsMap(accountsObj);

      const partnersObj = {};
      normalizedPartners.forEach(p => {
        partnersObj[p.id] = {
          ...p,
          displayName: p.raison_sociale || 
                      (p.nom && p.prenom ? `${p.prenom} ${p.nom}` : p.nom) ||
                      p.name ||
                      'Partenaire sans nom'
        };
      });
      setPartnersMap(partnersObj);

      const devisesObj = {};
      normalizedDevises.forEach(d => { devisesObj[d.id] = d; });
      setDevisesMap(devisesObj);

      const taxesObj = {};
      normalizedTaxes.forEach(t => { taxesObj[t.id] = t; });
      setTaxesMap(taxesObj);
      taxesMapRef.current = taxesObj;

      const fiscalPositionsObj = {};
      normalizedFiscalPositions.forEach(f => { fiscalPositionsObj[f.id] = f; });
      setFiscalPositionsMap(fiscalPositionsObj);

      console.log('✅ [DEBUG] Référentiels chargés:', {
        journaux: normalizedJournals.length,
        comptes: normalizedAccounts.length,
        partenaires: normalizedPartners.length,
        taxes: normalizedTaxes.length
      });

      await loadPiece({
        taxesMap: taxesObj,
        accountsMap: accountsObj,
        partnersMap: partnersObj,
      });
      
    } catch (err) {
      console.error('❌ [DEBUG] Erreur chargement référentiels:', err);
      setError('Erreur lors du chargement des données');
    } finally {
      setIsLoadingReferentials(false);
      setLoading(false);
    }
  };

  const loadPiece = async (resolvedMaps = {}) => {
    try {
      console.log('🔍 [DEBUG] Chargement de la pièce ID:', id);
      const data = await piecesService.getById(id, activeEntity.id);
      console.log('📋 [DEBUG] Pièce chargée:', {
        id: data.id,
        name: data.name,
        state: data.state,
        journal: data.journal?.id,
        journal_code: data.journal?.code,
        journal_sequence_id: data.journal?.sequence_id,
        move_type: data.move_type,
        lines: data.lines?.length
      });
      
      setPiece(data);
      
      const tMap = resolvedMaps.taxesMap || taxesMapRef.current;
      const aMap = resolvedMaps.accountsMap || accountsMap;
      const pMap = resolvedMaps.partnersMap || partnersMap;
      
      setFormData({
        date: data.date || '',
        ref: data.ref || '',
        journal_id: data.journal?.id || data.journal || '',
        journal_label: data.journal ? getJournalLabel(data.journal) : '',
        partner_id: data.partner?.id || data.partner || '',
        partner_label: data.partner ? getPartnerName(data.partner) : '',
        currency_id: data.currency?.id || data.currency || '',
        currency_label: data.currency ? getDeviseLabel(data.currency) : '',
        fiscal_position_id: data.fiscal_position?.id || data.fiscal_position || '',
        fiscal_position_label: data.fiscal_position ? getFiscalPositionLabel(data.fiscal_position) : '',
        notes: data.notes || '',
        lines: data.lines?.map((line) => {
          let accountId = '';
          let accountLabel = '';
          if (line.account) {
            if (typeof line.account === 'object' && line.account.id) {
              accountId = line.account.id;
              accountLabel = `${line.account.code || ''} - ${line.account.name || ''}`;
            } else if (typeof line.account === 'number') {
              accountId = line.account;
              const accountObj = aMap[line.account];
              accountLabel = accountObj ? `${accountObj.code || ''} - ${accountObj.name || ''}` : '';
            }
          }
          
          let partnerId = '';
          let partnerLabel = '';
          if (line.partner) {
            if (typeof line.partner === 'object' && line.partner.id) {
              partnerId = line.partner.id;
              partnerLabel = getPartnerName(line.partner);
            } else if (typeof line.partner === 'number') {
              partnerId = line.partner;
              const partnerObj = pMap[line.partner];
              partnerLabel = partnerObj?.displayName || '';
            }
          }
          
          const { id: taxId, label: taxLabel } = extractTax(line, tMap);
          
          return {
            name: line.name || '',
            account_id: accountId,
            account_label: accountLabel,
            partner_id: partnerId,
            partner_label: partnerLabel,
            debit: line.debit || '',
            credit: line.credit || '',
            tax_id: taxId,
            tax_label: taxLabel,
            tax_base_amount: line.tax_base_amount || '',
            date_maturity: line.date_maturity || '',
            discount_amount_currency: line.discount_amount_currency || '',
            discount_percentage: line.discount_percentage || '',
            discount_date: line.discount_date || '',
          };
        }) || []
      });
      
    } catch (err) {
      console.error('❌ [DEBUG] Erreur chargement pièce:', err);
      if (err.status === 404) {
        setError('Pièce comptable non trouvée');
      } else {
        setError(`Erreur: ${err.message || 'Inconnue'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const markAsModified = () => {
    if (!hasUnsavedChanges) setHasUnsavedChanges(true);
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    markAsModified();
  };

  const handleLineChange = (index, field, value) => {
    setFormData(prev => {
      const newLines = [...prev.lines];
      newLines[index] = { ...newLines[index], [field]: value };
      return { ...prev, lines: newLines };
    });
    markAsModified();
  };

  const handleLineMultiChange = (index, fields) => {
    setFormData(prev => {
      const newLines = [...prev.lines];
      newLines[index] = { ...newLines[index], ...fields };
      return { ...prev, lines: newLines };
    });
    markAsModified();
  };

  const canSaveDraft = () => {
    if (!formData?.journal_id) return false;
    return !formData?.lines?.some(l => !l.account_id);
  };

  const prepareDataForApi = useCallback(() => {
    const toNumber = (value) => {
      if (!value || value === '') return 0;
      return parseFloat(value) || 0;
    };

    const toNumberOrNull = (value) => {
      if (!value || value === '') return null;
      return parseInt(value, 10) || null;
    };

    const mainPartner = formData?.partner_id ||
      formData?.lines?.find(l => l.partner_id)?.partner_id ||
      null;

    const linesWrite = (formData?.lines || []).map((line) => {
      let taxId = null;
      if (line.tax_id && line.tax_id !== '') {
        taxId = typeof line.tax_id === 'number' ? line.tax_id : parseInt(line.tax_id, 10);
      }
      const taxIdsValue = taxId ? [taxId] : [];
      
      return {
        name: line.name?.trim() || 'Ligne',
        date: formData?.date || piece?.date,
        account_id: toNumberOrNull(line.account_id),
        partner_id: toNumberOrNull(line.partner_id || mainPartner),
        journal_id: toNumberOrNull(formData?.journal_id || piece?.journal?.id),
        company_id: activeEntity?.id || null,
        currency_id: toNumberOrNull(formData?.currency_id || piece?.currency?.id),
        tax_ids: taxIdsValue,
        tax_base_amount: toNumber(line.tax_base_amount),
        debit: toNumber(line.debit),
        credit: toNumber(line.credit),
        date_maturity: line.date_maturity || null,
        discount_amount_currency: toNumber(line.discount_amount_currency),
        discount_percentage: toNumber(line.discount_percentage) || null,
        discount_date: line.discount_date || null,
      };
    });

    // ✅ Récupérer l'ID de la séquence
    const sequenceId = piece?.journal?.sequence?.id || 
                       piece?.journal?.sequence_id || 
                       null;

    console.log('🔑 [DEBUG] Séquence ID envoyée:', sequenceId);

    return {
      name: piece?.name || `BROUILLON-${Date.now()}`,
      move_type: 'entry',
      state: piece?.state || 'draft',
      journal_id: toNumberOrNull(formData?.journal_id),
      date: formData?.date || piece?.date,
      ref: formData?.ref || '',
      partner_id: mainPartner,
      company_id: activeEntity?.id || null,
      currency_id: toNumberOrNull(formData?.currency_id),
      invoice_date: piece?.invoice_date || piece?.date,
      invoice_date_due: piece?.invoice_date_due || null,
      invoice_user_id: piece?.invoice_user?.id || null,
      invoice_origin: piece?.invoice_origin || '',
      fiscal_position_id: toNumberOrNull(formData?.fiscal_position_id),
      payment_reference: piece?.payment_reference || '',
      notes: formData?.notes || '',
      lines_write: linesWrite,
      // ✅ AJOUT IMPORTANT: Envoyer l'ID de la séquence
      sequence_id: sequenceId,
    };
  }, [formData, piece, activeEntity]);

  const handleSave = async (silent = false) => {
    if (!activeEntity || !piece) { 
      setError('Erreur: données manquantes'); 
      return false; 
    }

    if (!canSaveDraft()) {
      setError('Journal et compte sur chaque ligne requis pour sauvegarder.');
      return false;
    }

    setActionInProgress(true);
    if (!silent) setError(null);
    
    try {
      const apiData = prepareDataForApi();
      const result = await piecesService.update(piece.id, apiData, activeEntity.id);
      
      if (result) {
        setPiece(result);
        await loadPiece();
      }

      if (!silent) {
        setError(null);
      }
      setHasUnsavedChanges(false);
      return true;
      
    } catch (err) {
      console.error('Erreur enregistrement:', err);
      const errorMessage = err.response?.data || err.data || err.message || 'Erreur inconnue';
      setError(`Échec de l'enregistrement : ${JSON.stringify(errorMessage)}`);
      return false;
    } finally {
      setActionInProgress(false);
    }
  };

  const handleDelete = () => {
    setShowConfirmDialog(true);
    setDeleting(true);
  };

  const confirmDelete = async () => {
    setDeleting(true);
    setShowConfirmDialog(false);
    try {
      await piecesService.delete(id, activeEntity.id);
      navigate('/comptabilite/pieces');
    } catch (err) {
      setError('Erreur lors de la suppression: ' + (err.message || 'Inconnue'));
    } finally {
      setDeleting(false);
    }
  };

  const handleValidate = async () => {
    if (!piece) return;
    
    // ✅ VÉRIFICATION DE LA SÉQUENCE AVANT L'APPEL
    const journalHasSequence = piece.journal?.sequence || piece.journal?.sequence_id;
    
    if (!journalHasSequence) {
      console.warn('⚠️ [DEBUG] Le journal n\'a pas de séquence');
      setError('❌ Ce journal n\'a pas de séquence configurée. Impossible de générer le numéro.');
      setDebugInfo({
        type: 'error',
        message: 'Le journal ne peut pas générer de numéro automatique',
        suggestion: 'Allez dans Comptabilité → Journaux → Modifier ce journal → Onglet "Numérotation" pour configurer une séquence'
      });
      return;
    }
    
    console.log('🚀 [DEBUG] === COMPTABILISATION DÉMARRÉE ===');
    console.log('📋 [DEBUG] Pièce avant validation:', {
      id: piece.id,
      name: piece.name,
      state: piece.state,
      journal_id: piece.journal?.id,
      journal_code: piece.journal?.code,
      journal_sequence: piece.journal?.sequence,
      journal_sequence_id: piece.journal?.sequence_id
    });
    
    setActionInProgress(true);
    setError(null);
    setValidationSuccess(null);
    setDebugInfo(null);
    
    try {
      // 🔍 Vérifier si le journal a une séquence
      if (piece.journal) {
        const journalId = piece.journal.id || piece.journal;
        console.log(`🔍 [DEBUG] Journal ID: ${journalId}`);
        
        // Récupérer les détails du journal pour voir les séquences
        try {
          const journalDetails = await piecesService.getJournals(activeEntity.id);
          const currentJournal = journalDetails.find(j => j.id === journalId);
          if (currentJournal) {
            console.log('📊 [DEBUG] Détails du journal:', {
              code: currentJournal.code,
              name: currentJournal.name,
              sequence_id: currentJournal.sequence?.id || currentJournal.sequence_id,
              sequence_details: currentJournal.sequence,
              refund_sequence_id: currentJournal.refund_sequence?.id || currentJournal.refund_sequence_id,
              has_sequence: !!(currentJournal.sequence?.id || currentJournal.sequence_id)
            });
            
            if (!currentJournal.sequence && !currentJournal.sequence_id) {
              setDebugInfo({
                type: 'warning',
                message: '⚠️ Ce journal n\'a pas de séquence configurée. Le numéro ne pourra pas être généré automatiquement.',
                suggestion: 'Allez dans Comptabilité → Journaux → Modifier ce journal → Onglet "Numérotation" → Sélectionnez une séquence'
              });
            }
          }
        } catch (err) {
          console.warn('⚠️ [DEBUG] Impossible de récupérer les détails du journal:', err);
        }
      }
      
      console.log('📤 [DEBUG] Appel API POST /post/...');
      const result = await piecesService.validate(id, activeEntity.id);
      
      console.log('✅ [DEBUG] Réponse API:', {
        status: result?.status || 'success',
        id: result?.id,
        name: result?.name,
        state: result?.state,
        full_response: result
      });
      
      if (result) {
        setPiece(prev => ({ ...prev, ...result }));
        
        if (result.name && !result.name.startsWith('BROUILLON-')) {
          setValidationSuccess(`✅ Pièce comptabilisée avec succès ! Numéro généré : ${result.name}`);
          console.log('🎉 [DEBUG] SUCCÈS - Nouveau numéro généré:', result.name);
        } else if (result.name && result.name.startsWith('BROUILLON-')) {
          setValidationSuccess(`⚠️ Pièce comptabilisée mais le numéro n'a PAS été généré (reste: ${result.name})`);
          console.warn('⚠️ [DEBUG] Le numéro n\'a pas été généré - vérifiez que le journal a une séquence');
          setDebugInfo({
            type: 'error',
            message: '❌ Le numéro n\'a pas été généré automatiquement.',
            suggestion: 'Vérifiez que le journal utilisé a bien une séquence configurée dans l\'onglet "Numérotation"'
          });
        } else {
          setValidationSuccess('Pièce comptabilisée avec succès !');
        }
      }
      
      await loadPiece();
      setHasUnsavedChanges(false);
      
    } catch (err) {
      console.error('❌ [DEBUG] Erreur lors de la validation:', err);
      console.error('📄 [DEBUG] Détails erreur:', {
        status: err.response?.status,
        statusText: err.response?.statusText,
        data: err.response?.data,
        message: err.message
      });
      
      const errorMessage = err.response?.data?.detail || err.response?.data?.message || err.message || 'Erreur inconnue';
      setError(`Erreur lors de la validation : ${errorMessage}`);
      
      setDebugInfo({
        type: 'error',
        message: `Erreur API: ${errorMessage}`,
        suggestion: 'Vérifiez la console réseau (F12) pour plus de détails'
      });
    } finally {
      setActionInProgress(false);
    }
  };

  const handleDraft = async () => {
    if (!piece) return;
    setActionInProgress(true);
    try {
      await piecesService.draft(id, activeEntity.id);
      await loadPiece();
      setHasUnsavedChanges(false);
    } catch (err) {
      setError('Erreur lors du passage en brouillon: ' + err.message);
    } finally {
      setActionInProgress(false);
    }
  };

  const handleReverse = async () => {
    if (!piece) return;
    setActionInProgress(true);
    try {
      const newPiece = await piecesService.reverse(id, activeEntity.id);
      navigate(`/comptabilite/pieces/${newPiece.id}`);
    } catch (err) {
      setError('Erreur lors de l\'extourne: ' + err.message);
    } finally {
      setActionInProgress(false);
    }
  };

  const handleDuplicate = async () => {
    if (!piece) return;
    setActionInProgress(true);
    try {
      const newPiece = await piecesService.duplicate(id, activeEntity.id);
      navigate(`/comptabilite/pieces/${newPiece.id}`);
    } catch (err) {
      setError('Erreur lors de la duplication: ' + err.message);
    } finally {
      setActionInProgress(false);
    }
  };

  const handleDiscardChanges = () => {
    if (!isDraft) return;
    setShowConfirmDialog(true);
    setDeleting(false);
  };
  
  const confirmDiscardChanges = () => {
    loadPiece();
    setHasUnsavedChanges(false);
    setShowConfirmDialog(false);
    setError(null);
  };

  const handleNewPiece = () => {
    if (hasUnsavedChanges && isDraft) {
      setShowConfirmDialog(true);
      setDeleting(false);
    } else {
      navigate('/comptabilite/pieces/create');
    }
  };

  const handleGoToList = () => {
    if (hasUnsavedChanges && isDraft) {
      setShowConfirmDialog(true);
      setDeleting(false);
    } else {
      navigate('/comptabilite/pieces');
    }
  };

  const formatDateForDisplay = (dateString) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric', month: 'long', year: 'numeric'
    });
  };

  const formatDateTimeForDisplay = (dateString) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleString('fr-FR');
  };

  if (!activeEntity) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-7xl mx-auto bg-white border border-gray-300">
          <div className="border-b border-gray-300 px-4 py-3">
            <div className="text-lg font-bold text-gray-900">Détail de la pièce comptable</div>
          </div>
          <div className="p-8">
            <div className="bg-yellow-50 border border-yellow-200 rounded p-6 text-center">
              <FiAlertCircle className="text-yellow-600 mx-auto mb-3" size={32} />
              <p className="text-yellow-800 font-medium text-lg mb-3">Aucune entité sélectionnée</p>
              <p className="text-sm text-gray-600 mb-4">
                Vous devez sélectionner une entité pour voir la pièce comptable.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-7xl mx-auto bg-white border border-gray-300">
          <div className="border-b border-gray-300 px-4 py-3">
            <div className="text-lg font-bold text-gray-900">Détail de la pièce comptable</div>
          </div>
          <div className="p-8 flex items-center justify-center">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="mt-4 text-gray-600 text-sm">Chargement de la pièce...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !piece) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-7xl mx-auto bg-white border border-gray-300">
          <div className="border-b border-gray-300 px-4 py-3">
            <div className="text-lg font-bold text-gray-900">Détail de la pièce comptable</div>
          </div>
          <div className="p-8">
            <div className="bg-red-50 border border-red-200 rounded p-6 text-center">
              <FiX className="text-red-600 mx-auto mb-3" size={32} />
              <p className="text-red-800 font-medium text-lg mb-2">Erreur</p>
              <p className="text-sm text-gray-600 mb-4">{error || 'Pièce non trouvée'}</p>
              <div className="flex justify-center gap-3">
                <button onClick={loadReferentials} className="h-8 px-3 border border-gray-300 text-gray-700 text-xs hover:bg-gray-50">Réessayer</button>
                <Link to="/comptabilite/pieces" className="h-8 px-3 bg-purple-600 text-white text-xs hover:bg-purple-700 flex items-center">Retour à la liste</Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const isDraft = (piece.state || piece.status) === 'draft';
  const isCancelled = (piece.state || piece.status) === 'cancel' || (piece.state || piece.status) === 'canceled';
  const isPosted = (piece.state || piece.status) === 'posted';
  
  const totals = piece?.lines?.reduce((acc, line) => ({
    debit: acc.debit + (parseFloat(line.debit) || 0),
    credit: acc.credit + (parseFloat(line.credit) || 0)
  }), { debit: 0, credit: 0 }) || { debit: 0, credit: 0 };
  
  const difference = Math.abs(totals.debit - totals.credit).toFixed(2);
  const isBalanced = difference === '0.00' || difference === '0';

  // Vérifier si le journal a une séquence pour afficher un avertissement
  const journalHasSequence = piece.journal?.sequence || piece.journal?.sequence_id;
  const journalCode = piece.journal?.code || piece.journal;

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto bg-white border border-gray-300">
        {/* En-tête */}
        <div className="border-b border-gray-300 px-4 py-3">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-start gap-3">
              <Tooltip text="Créer une nouvelle pièce">
                <button onClick={handleNewPiece} className="h-12 px-4 bg-purple-600 text-white text-sm hover:bg-purple-700 flex items-center justify-center font-medium border-0">
                  <FiPlus size={16} className="mr-1" /><span>Nouveau</span>
                </button>
              </Tooltip>
              <div className="flex flex-col h-12 justify-center">
                <div className="text-lg font-bold text-gray-900 cursor-pointer hover:text-purple-600" onClick={handleGoToList}>Pièces comptables</div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-gray-600 font-medium">N° {piece.name || `Pièce #${piece.id}`}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative" ref={actionsMenuRef}>
                <Tooltip text="Menu des actions">
                  <button onClick={() => setShowActionsMenu(!showActionsMenu)} className="h-8 px-3 border border-gray-300 text-gray-700 text-xs hover:bg-gray-50 flex items-center gap-1">
                    <FiSettings size={12} /><span>Actions</span>
                  </button>
                </Tooltip>
                {showActionsMenu && (
                  <div className="absolute right-0 mt-1 w-48 bg-white border border-gray-300 shadow-lg rounded-sm z-50">
                    <button onClick={() => { loadReferentials(); setShowActionsMenu(false); }} className="w-full px-3 py-2 text-xs text-left hover:bg-gray-50 flex items-center gap-2 border-b border-gray-100"><FiRefreshCw size={12} /><span>Actualiser</span></button>
                    <button onClick={() => { handleDuplicate(); setShowActionsMenu(false); }} className="w-full px-3 py-2 text-xs text-left hover:bg-gray-50 flex items-center gap-2 border-b border-gray-100"><FiCopy size={12} /><span>Dupliquer</span></button>
                    {isPosted && <button onClick={() => { handleReverse(); setShowActionsMenu(false); }} className="w-full px-3 py-2 text-xs text-left hover:bg-gray-50 flex items-center gap-2 border-b border-gray-100"><FiRotateCcw size={12} /><span>Extourner</span></button>}
                    <button onClick={() => window.print()} className="w-full px-3 py-2 text-xs text-left hover:bg-gray-50 flex items-center gap-2 border-b border-gray-100"><FiPrinter size={12} /><span>Imprimer</span></button>
                    <button onClick={() => { handleDelete(); setShowActionsMenu(false); }} className="w-full px-3 py-2 text-xs text-left hover:bg-red-50 flex items-center gap-2 text-red-600"><FiTrash2 size={12} /><span>Supprimer</span></button>
                  </div>
                )}
              </div>
              <Tooltip text={!isDraft ? "Impossible de modifier" : "Enregistrer"}>
                <button onClick={() => handleSave()} disabled={actionInProgress || !isDraft} className={`w-8 h-8 rounded-full flex items-center justify-center shadow-sm ${!isDraft ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-purple-600 text-white hover:bg-purple-700 hover:scale-110'}`}><FiUploadCloud size={16} /></button>
              </Tooltip>
              <Tooltip text={!isDraft ? "Impossible d'annuler" : "Annuler"}>
                <button onClick={handleDiscardChanges} disabled={actionInProgress || !isDraft} className={`w-8 h-8 rounded-full flex items-center justify-center ${!isDraft ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-black text-white hover:bg-gray-800 hover:scale-110'}`}><FiX size={16} /></button>
              </Tooltip>
            </div>
          </div>
        </div>

        {/* État */}
        <div className="border-b border-gray-300 px-4 py-3">
          <div className="flex flex-col">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {isDraft ? (
                  <Tooltip text="Valider la pièce">
                    <button
                      onClick={handleValidate}
                      disabled={actionInProgress}
                      className="h-8 px-4 bg-purple-600 text-white text-xs font-medium hover:bg-purple-700 hover:scale-105 hover:shadow-md active:scale-95 transition-all duration-200 flex items-center justify-center border-0"
                    >
                      Comptabiliser
                    </button>
                  </Tooltip>
                ) : (
                  <div className="flex items-center gap-2">
                    <Tooltip text="Remettre en brouillon">
                      <button
                        onClick={handleDraft}
                        disabled={actionInProgress}
                        className="h-8 px-3 text-xs font-medium border border-amber-300 bg-amber-100 text-amber-700 hover:bg-amber-200 hover:scale-105 hover:shadow-md active:scale-95 transition-all duration-200 flex items-center justify-center"
                      >
                        REMETTRE EN BROUILLON
                      </button>
                    </Tooltip>
                  </div>
                )}
                {error && <div className="flex items-center gap-1 text-xs text-red-600"><FiAlertCircle size={14} /><span>{error}</span></div>}
                {validationSuccess && (
                  <div className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded border border-green-200">
                    <FiCheck size={14} />
                    <span>{validationSuccess}</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <div className={`h-8 px-3 text-xs font-medium border flex items-center ${isDraft ? 'bg-yellow-100 text-yellow-700 border-yellow-300' : 'bg-gray-100 text-gray-500 border-gray-300'}`}>Brouillon</div>
                <div className={`h-8 px-3 text-xs font-medium border flex items-center ${isPosted ? 'bg-green-100 text-green-700 border-green-300' : 'bg-gray-100 text-gray-500 border-gray-300'}`}>Comptabilisé</div>
                {isCancelled && <div className="h-8 px-3 text-xs font-medium border bg-red-100 text-red-700 border-red-300 flex items-center">Annulé</div>}
              </div>
            </div>
            {hasUnsavedChanges && isDraft && <div className="mt-2 flex items-center gap-2 text-xs text-amber-600"><FiInfo size={14} /><span>Modifications non sauvegardées</span></div>}
            
            {/* 🔍 Avertissement si le journal n'a pas de séquence */}
            {isDraft && piece.journal && !journalHasSequence && (
              <div className="mt-2 flex items-center gap-2 text-xs text-orange-600 bg-orange-50 p-2 rounded border border-orange-200">
                <FiAlertCircle size={14} />
                <span>⚠️ Le journal "{journalCode}" n'a pas de séquence configurée. Le numéro ne sera pas généré automatiquement à la comptabilisation.</span>
                <button 
                  onClick={() => navigate(`/comptabilite/journaux/${piece.journal.id}/edit`)}
                  className="ml-auto text-purple-600 hover:text-purple-700 underline"
                >
                  Configurer
                </button>
              </div>
            )}
            
            {/* 🔍 Message de debug */}
            {debugInfo && (
              <div className={`mt-2 flex items-center gap-2 text-xs p-2 rounded border ${debugInfo.type === 'error' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200'}`}>
                <FiAlertCircle size={14} />
                <span>{debugInfo.message}</span>
                {debugInfo.suggestion && (
                  <span className="ml-2 text-gray-500">💡 {debugInfo.suggestion}</span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Infos pièce */}
        <div className="px-4 py-3 border-b border-gray-300">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center" style={{ height: '26px' }}>
                <label className="text-xs text-gray-700 min-w-[140px] font-medium">Date comptable</label>
                {isDraft ? <input type="date" value={formData?.date || ''} onChange={(e) => handleChange('date', e.target.value)} className="flex-1 px-2 py-1 border border-gray-300 text-xs ml-2" style={{ height: '26px' }} />
                  : <div className="flex-1 px-2 py-1 border border-gray-300 bg-gray-50 text-xs text-gray-900 ml-2 flex items-center" style={{ height: '26px' }}>{formatDateForDisplay(piece.date) || '—'}</div>}
              </div>
              <div className="flex items-center" style={{ height: '26px' }}>
                <label className="text-xs text-gray-700 min-w-[140px] font-medium">Référence</label>
                {isDraft ? <input type="text" value={formData?.ref || ''} onChange={(e) => handleChange('ref', e.target.value)} className="flex-1 px-2 py-1 border border-gray-300 text-xs ml-2" style={{ height: '26px' }} placeholder="SCMI/002/2026" />
                  : <div className="flex-1 px-2 py-1 border border-gray-300 bg-gray-50 text-xs text-gray-900 ml-2 flex items-center" style={{ height: '26px' }}>{piece.ref || '—'}</div>}
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center" style={{ height: '26px' }}>
                <label className="text-xs text-gray-700 min-w-[140px] font-medium">Date enregistrement</label>
                <div className="flex-1 px-2 py-1 border border-gray-300 bg-gray-50 text-xs text-gray-900 ml-2 flex items-center" style={{ height: '26px' }}>{formatDateForDisplay(piece.create_date || piece.date) || '—'}</div>
              </div>
              <div className="flex items-center" style={{ height: '26px' }}>
                <label className="text-xs text-gray-700 min-w-[140px] font-medium">Journal</label>
                {isDraft ? (
                  <div className="flex-1 ml-2">
                    <AutocompleteInput 
                      value={formData?.journal_label || ''} 
                      selectedId={formData?.journal_id || ''} 
                      onChange={(text) => handleChange('journal_label', text)} 
                      onSelect={(id, label) => { handleChange('journal_id', id); handleChange('journal_label', label); }} 
                      options={journals} 
                      getOptionLabel={(o) => `${o.code} - ${o.name}`} 
                      placeholder="Sélectionner un journal" 
                      required={true} 
                    />
                  </div>
                ) : <div className="flex-1 px-2 py-1 border border-gray-300 bg-gray-50 text-xs text-gray-900 ml-2 flex items-center" style={{ height: '26px' }}>{getJournalLabel(piece.journal)}</div>}
              </div>
            </div>
          </div>
        </div>

        {/* Onglets */}
        <div className="border-b border-gray-300">
          <div className="px-4 flex">
            <button onClick={() => setActiveTab('ecritures')} className={`px-4 py-2 text-xs font-medium border-b-2 transition-all duration-200 ${activeTab === 'ecritures' ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>Écritures comptables</button>
            <button onClick={() => setActiveTab('notes')} className={`px-4 py-2 text-xs font-medium border-b-2 transition-all duration-200 ${activeTab === 'notes' ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>Notes</button>
            <button onClick={() => setActiveTab('pieces-jointes')} className={`px-4 py-2 text-xs font-medium border-b-2 transition-all duration-200 ${activeTab === 'pieces-jointes' ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>Pièces jointes</button>
          </div>
        </div>

        {/* Contenu onglet Écritures */}
        <div className="p-4">
          {activeTab === 'ecritures' && (
            <>
              <div className="border border-gray-300 mb-3 overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-300 px-2 py-1.5 text-xs font-medium text-gray-700 text-left">Compte</th>
                      <th className="border border-gray-300 px-2 py-1.5 text-xs font-medium text-gray-700 text-left">Partenaire</th>
                      <th className="border border-gray-300 px-2 py-1.5 text-xs font-medium text-gray-700 text-left">Libellé</th>
                      <th className="border border-gray-300 px-2 py-1.5 text-xs font-medium text-gray-700 text-left">Taxe</th>
                      <th className="border border-gray-300 px-2 py-1.5 text-xs font-medium text-gray-700 text-right">Débit</th>
                      <th className="border border-gray-300 px-2 py-1.5 text-xs font-medium text-gray-700 text-right">Crédit</th>
                      <th className="border border-gray-300 px-2 py-1.5 text-xs font-medium text-gray-700 text-left">Date échéance</th>
                      <th className="border border-gray-300 px-2 py-1.5 text-xs font-medium text-gray-700 text-right">Montant remise</th>
                      <th className="border border-gray-300 px-2 py-1.5 text-xs font-medium text-gray-700 text-right">% remise</th>
                      <th className="border border-gray-300 px-2 py-1.5 text-xs font-medium text-gray-700 text-left">Date remise</th>
                      <th className="border border-gray-300 px-2 py-1.5 text-xs font-medium text-gray-700 text-center">•••</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(isDraft ? formData?.lines : piece?.lines)?.map((line, lineIndex) => {
                      if (isDraft) {
                        return (
                          <tr key={lineIndex} className="hover:bg-gray-50">
                            <td className="border border-gray-300 p-1" style={{ minWidth: '150px' }}>
                              <AutocompleteInput 
                                value={line.account_label} 
                                selectedId={line.account_id} 
                                onChange={(text) => handleLineChange(lineIndex, 'account_label', text)} 
                                onSelect={(id, label) => handleLineMultiChange(lineIndex, { account_id: id, account_label: label })} 
                                options={accounts} 
                                getOptionLabel={(o) => `${o.code} - ${o.name}`} 
                                placeholder="Compte" 
                                required={true} 
                              />
                            </td>
                            <td className="border border-gray-300 p-1" style={{ minWidth: '120px' }}>
                              <AutocompleteInput 
                                value={line.partner_label} 
                                selectedId={line.partner_id} 
                                onChange={(text) => handleLineChange(lineIndex, 'partner_label', text)} 
                                onSelect={(id, label) => handleLineMultiChange(lineIndex, { partner_id: id, partner_label: label })} 
                                options={partners} 
                                getOptionLabel={(o) => o.nom || o.name || o.raison_sociale || ''} 
                                placeholder="Partenaire" 
                              />
                            </td>
                            <td className="border border-gray-300 p-1" style={{ minWidth: '150px' }}>
                              <input 
                                type="text" 
                                value={line.name}
                                onChange={(e) => handleLineChange(lineIndex, 'name', e.target.value)}
                                onKeyDown={(e) => handleTabOnLastLine(e, lineIndex, false)}
                                className="w-full px-2 py-1 border-0 text-xs focus:ring-1 focus:ring-blue-500"
                                style={{ height: '26px' }} 
                                placeholder="Libellé"
                              />
                            </td>
                            <td className="border border-gray-300 p-1" style={{ minWidth: '100px' }}>
                              <AutocompleteInput 
                                value={line.tax_label} 
                                selectedId={line.tax_id} 
                                onChange={(text) => handleLineChange(lineIndex, 'tax_label', text)}
                                onSelect={(id, label) => {
                                  handleLineMultiChange(lineIndex, { 
                                    tax_id: id, 
                                    tax_label: label 
                                  });
                                }}
                                options={taxes} 
                                getOptionLabel={(t) => `${t.name} (${t.amount}%)`} 
                                placeholder="TVA..." 
                              />
                            </td>
                            <td className="border border-gray-300 p-1" style={{ minWidth: '100px' }}>
                              <input 
                                type="number" 
                                step="1" 
                                min="0" 
                                value={Math.round(parseFloat(line.debit) || 0)}
                                onChange={(e) => handleLineChange(lineIndex, 'debit', e.target.value)}
                                onKeyDown={(e) => handleTabOnLastLine(e, lineIndex, false)}
                                className="w-full px-2 py-1 border-0 text-xs text-right focus:ring-1 focus:ring-blue-500"
                                style={{ height: '26px' }} 
                                placeholder="0" 
                              />
                            </td>
                            <td className="border border-gray-300 p-1" style={{ minWidth: '100px' }}>
                              <input 
                                type="number" 
                                step="1" 
                                min="0" 
                                value={Math.round(parseFloat(line.credit) || 0)}
                                onChange={(e) => handleLineChange(lineIndex, 'credit', e.target.value)}
                                onKeyDown={(e) => handleTabOnLastLine(e, lineIndex, false)}
                                className="w-full px-2 py-1 border-0 text-xs text-right focus:ring-1 focus:ring-blue-500"
                                style={{ height: '26px' }} 
                                placeholder="0" 
                              />
                            </td>
                            <td className="border border-gray-300 p-1" style={{ minWidth: '120px' }}>
                              <input 
                                type="date" 
                                value={line.date_maturity || ''}
                                onChange={(e) => handleLineChange(lineIndex, 'date_maturity', e.target.value)}
                                onKeyDown={(e) => handleTabOnLastLine(e, lineIndex, false)}
                                className="w-full px-2 py-1 border-0 text-xs focus:ring-1 focus:ring-blue-500"
                                style={{ height: '26px' }} 
                              />
                            </td>
                            <td className="border border-gray-300 p-1" style={{ minWidth: '100px' }}>
                              <input 
                                type="number" 
                                step="1" 
                                min="0" 
                                value={Math.round(parseFloat(line.discount_amount_currency) || 0)}
                                onChange={(e) => handleLineChange(lineIndex, 'discount_amount_currency', e.target.value)}
                                onKeyDown={(e) => handleTabOnLastLine(e, lineIndex, false)}
                                className="w-full px-2 py-1 border-0 text-xs text-right focus:ring-1 focus:ring-blue-500"
                                style={{ height: '26px' }} 
                                placeholder="0" 
                              />
                            </td>
                            <td className="border border-gray-300 p-1" style={{ minWidth: '80px' }}>
                              <input 
                                type="number" 
                                step="0.01" 
                                min="0" 
                                max="100" 
                                value={line.discount_percentage || ''}
                                onChange={(e) => handleLineChange(lineIndex, 'discount_percentage', e.target.value)}
                                onKeyDown={(e) => handleTabOnLastLine(e, lineIndex, false)}
                                className="w-full px-2 py-1 border-0 text-xs text-right focus:ring-1 focus:ring-blue-500"
                                style={{ height: '26px' }} 
                                placeholder="0" 
                              />
                            </td>
                            <td className="border border-gray-300 p-1" style={{ minWidth: '120px' }}>
                              <input 
                                type="date" 
                                value={line.discount_date || ''}
                                onChange={(e) => handleLineChange(lineIndex, 'discount_date', e.target.value)}
                                onKeyDown={(e) => handleTabOnLastLine(e, lineIndex, true)}
                                className="w-full px-2 py-1 border-0 text-xs focus:ring-1 focus:ring-blue-500"
                                style={{ height: '26px' }} 
                              />
                            </td>
                            <td className="border border-gray-300 p-1 w-[40px]">
                              <button 
                                onClick={() => removeLine(lineIndex)} 
                                tabIndex="0"
                                className="w-full flex items-center justify-center p-1 text-gray-400 hover:text-red-600 transition-colors"
                                style={{ height: '26px' }} 
                                title="Supprimer"
                              >
                                <FiTrash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        );
                      } else {
                        const account = getAccountLabel(line.account);
                        const linePartner = line.partner ? getPartnerName(line.partner) : null;
                        const lineTax = getTaxDisplay(line, taxesMap, taxesMapRef);
                        
                        return (
                          <tr key={line.id || lineIndex} className="hover:bg-gray-50">
                            <td className="border border-gray-300 p-1">{account ? <div className="px-2 py-1 text-xs"><span className="font-medium">{account.code}</span>{account.name && <span className="text-gray-500 ml-1">({account.name})</span>}</div> : <Cell>—</Cell>}</td>
                            <td className="border border-gray-300 p-1"><Cell>{linePartner}</Cell></td>
                            <td className="border border-gray-300 p-1"><Cell>{line.name}</Cell></td>
                            <td className="border border-gray-300 p-1"><Cell>{lineTax}</Cell></td>
                            <td className="border border-gray-300 p-1"><Cell align="right">{formatAmount(line.debit)}</Cell></td>
                            <td className="border border-gray-300 p-1"><Cell align="right">{formatAmount(line.credit)}</Cell></td>
                            <td className="border border-gray-300 p-1"><Cell>{line.date_maturity ? formatDateForDisplay(line.date_maturity) : null}</Cell></td>
                            <td className="border border-gray-300 p-1"><Cell align="right">{formatAmount(line.discount_amount_currency)}</Cell></td>
                            <td className="border border-gray-300 p-1"><Cell align="right">{line.discount_percentage ? parseFloat(line.discount_percentage).toFixed(2) + '%' : null}</Cell></td>
                            <td className="border border-gray-300 p-1"><Cell>{line.discount_date ? formatDateForDisplay(line.discount_date) : null}</Cell></td>
                            <td className="border border-gray-300 p-1 w-[40px]"></td>
                          </tr>
                        );
                      }
                    })}
                  </tbody>
                </table>
              </div>

              {isDraft && (
                <div className="mb-3 flex items-center gap-4">
                  <button onClick={addLine} className="h-8 px-3 bg-purple-600 text-white text-xs hover:bg-purple-700 flex items-center gap-1"><FiPlus size={12} /><span>Ajouter une ligne</span></button>
                  {!isBalanced && totals.debit > 0 && (
                    <div className="text-xs text-yellow-700 bg-yellow-50 px-3 py-1 rounded flex items-center gap-1 border border-yellow-200">
                      <FiAlertCircle size={12} />
                      ⚠ Différence de {formatAmount(difference)} XOF
                    </div>
                  )}
                  {isBalanced && totals.debit > 0 && (
                    <div className="text-xs text-green-700 bg-green-50 px-3 py-1 rounded flex items-center gap-1 border border-green-200">
                      <FiCheck size={12} />
                      ✓ Écriture équilibrée
                    </div>
                  )}
                </div>
              )}

              {!isDraft && (
                <div className="mb-3 flex items-center gap-4">
                  {!isBalanced && totals.debit > 0 && (
                    <div className="text-xs text-yellow-700 bg-yellow-50 px-3 py-1 rounded flex items-center gap-1 border border-yellow-200">
                      <FiAlertCircle size={12} />
                      ⚠ Différence de {formatAmount(difference)} XOF
                    </div>
                  )}
                  {isBalanced && totals.debit > 0 && (
                    <div className="text-xs text-green-700 bg-green-50 px-3 py-1 rounded flex items-center gap-1 border border-green-200">
                      <FiCheck size={12} />
                      ✓ Écriture équilibrée
                    </div>
                  )}
                </div>
              )}

              <div className="bg-green-50 border border-green-200 px-4 py-2 flex justify-end gap-8">
                <div className="text-sm font-bold text-gray-900">{formatAmount(totals.debit)} XOF</div>
                <div className="text-sm font-bold text-gray-900">{formatAmount(totals.credit)} XOF</div>
              </div>
            </>
          )}

          {activeTab === 'notes' && (
            <div className="border border-gray-300">
              <div className="grid grid-cols-3 bg-gray-100 border-b border-gray-300">
                <div className="border-r border-gray-300 px-2 py-1.5 text-xs font-medium text-gray-700">Devise</div>
                <div className="border-r border-gray-300 px-2 py-1.5 text-xs font-medium text-gray-700">Position fiscale</div>
                <div className="px-2 py-1.5 text-xs font-medium text-gray-700">Entité</div>
              </div>
              <div className="grid grid-cols-3 border-b border-gray-300">
                <div className="border-r border-gray-300 p-1">
                  {isDraft ? (
                    <AutocompleteInput 
                      value={formData?.currency_label || ''} 
                      selectedId={formData?.currency_id || ''} 
                      onChange={(text) => handleChange('currency_label', text)} 
                      onSelect={(id, label) => { handleChange('currency_id', id); handleChange('currency_label', label); }} 
                      options={devises} 
                      getOptionLabel={(o) => `${o.code}${o.symbole ? ` (${o.symbole})` : ''}`} 
                      placeholder="Sélectionner une devise" 
                    />
                  ) : (
                    <div className="w-full px-2 py-1 text-xs text-gray-700 bg-gray-50 flex items-center" style={{ height: '26px' }}>
                      {getDeviseLabel(piece.currency)}
                    </div>
                  )}
                </div>
                <div className="border-r border-gray-300 p-1">
                  {isDraft ? (
                    <AutocompleteInput 
                      value={formData?.fiscal_position_label || ''} 
                      selectedId={formData?.fiscal_position_id || ''} 
                      onChange={(text) => handleChange('fiscal_position_label', text)} 
                      onSelect={(id, label) => { handleChange('fiscal_position_id', id); handleChange('fiscal_position_label', label); }} 
                      options={fiscalPositions} 
                      getOptionLabel={(f) => f.name} 
                      placeholder="Sélectionner une position" 
                    />
                  ) : (
                    <div className="w-full px-2 py-1 text-xs text-gray-700 bg-gray-50 flex items-center" style={{ height: '26px' }}>
                      {getFiscalPositionLabel(piece.fiscal_position)}
                    </div>
                  )}
                </div>
                <div className="p-1">
                  <div className="w-full px-2 py-1 text-xs text-gray-700 bg-gray-50 flex items-center" style={{ height: '26px' }}>
                    <FiBriefcase className="mr-1 text-purple-600 flex-shrink-0" size={12} />
                    <span className="truncate">{activeEntity?.nom || activeEntity?.name || activeEntity?.raison_sociale || 'Entité sélectionnée'}</span>
                  </div>
                </div>
              </div>
              {isDraft ? (
                <textarea 
                  value={formData?.notes || ''}
                  onChange={(e) => handleChange('notes', e.target.value)}
                  className="w-full h-48 px-3 py-2 border-0 text-xs focus:ring-2 focus:ring-blue-500"
                  placeholder="Ajouter des notes complémentaires..." 
                />
              ) : (
                <textarea 
                  value={piece.notes || ''}
                  readOnly
                  className="w-full h-48 px-3 py-2 border-0 text-xs bg-gray-50 cursor-default resize-none"
                  placeholder="Aucune note"
                />
              )}
            </div>
          )}

          {activeTab === 'pieces-jointes' && (
            <div className="border border-gray-300 p-6">
              <div className="text-center py-8">
                <FiPaperclip className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                <div className="text-gray-500 text-xs mb-4">Aucune pièce jointe</div>
                <p className="text-xs text-gray-400">Cette pièce comptable n'a pas de documents joints</p>
              </div>
            </div>
          )}
        </div>

        {/* Pied de page */}
        <div className="border-t border-gray-300 px-4 py-2 bg-gray-50 text-xs text-gray-500 flex justify-between">
          <div>Créé le {piece.create_date ? formatDateTimeForDisplay(piece.create_date) : '—'}{piece.create_uid && ` par ${typeof piece.create_uid === 'object' ? piece.create_uid.username || piece.create_uid : piece.create_uid}`}</div>
          <div>Modifié le {piece.write_date ? formatDateTimeForDisplay(piece.write_date) : '—'}{piece.write_uid && ` par ${typeof piece.write_uid === 'object' ? piece.write_uid.username || piece.write_uid : piece.write_uid}`}</div>
        </div>
      </div>

      {/* Dialogue confirmation */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-gray-900 mb-3">{deleting ? 'Confirmer la suppression' : 'Modifications non sauvegardées'}</h3>
            <p className="text-sm text-gray-600 mb-6">{deleting ? `Êtes-vous sûr de vouloir supprimer la pièce "${piece.name || piece.id}" ? Cette action est irréversible.` : 'Voulez-vous enregistrer les modifications avant de quitter ?'}</p>
            <div className="flex justify-end gap-3">
              {deleting ? (
                <>
                  <button onClick={() => setShowConfirmDialog(false)} className="px-4 py-2 border border-gray-300 text-gray-700 text-sm hover:bg-gray-50 rounded">Annuler</button>
                  <button onClick={confirmDelete} disabled={deleting} className="px-4 py-2 bg-red-600 text-white text-sm hover:bg-red-700 rounded disabled:opacity-50">Supprimer</button>
                </>
              ) : (
                <>
                  <button onClick={async () => { setShowConfirmDialog(false); const saved = await handleSave(true); if (saved) navigate('/comptabilite/pieces'); }} className="px-4 py-2 bg-purple-600 text-white text-sm hover:bg-purple-700 rounded">Enregistrer</button>
                  <button onClick={() => { confirmDiscardChanges(); navigate('/comptabilite/pieces'); }} className="px-4 py-2 bg-red-600 text-white text-sm hover:bg-red-700 rounded">Ne pas enregistrer</button>
                  <button onClick={() => setShowConfirmDialog(false)} className="px-4 py-2 border border-gray-300 text-gray-700 text-sm hover:bg-gray-50 rounded">Annuler</button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}