import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FiPlus, FiTrash2, FiUser, FiSearch, FiChevronDown, FiX, FiCheck, 
  FiFileText, FiPaperclip, FiFile, FiUpload, FiEye, FiDownload, FiXCircle,
  FiCalendar, FiCreditCard, FiDollarSign, FiMessageSquare, FiHome,
  FiBriefcase, FiGlobe
} from 'react-icons/fi';
import { piecesService, authService } from "../../services";
import ComptabiliteFormContainer from '../../components/ComptabiliteFormContainer';

// Composant réutilisable pour dropdown avec recherche
const SearchableDropdown = ({ 
  label, 
  value, 
  onChange, 
  options, 
  placeholder,
  required = false,
  disabled = false,
  error = null,
  getOptionLabel = (option) => option?.name || option?.nom || String(option),
  getOptionValue = (option) => option?.id || option?.value,
  renderOption = (option) => getOptionLabel(option),
  containerClassName = "",
  dropdownId = ""
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef(null);
  const buttonRef = useRef(null);

  const filteredOptions = options.filter(option =>
    getOptionLabel(option).toLowerCase().includes(searchTerm.toLowerCase()) ||
    (option?.code && option.code.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const selectedOption = options.find(opt => {
    const optValue = getOptionValue(opt);
    if (optValue == null || value == null) return false;
    return String(optValue) === String(value);
  });

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target) &&
          buttonRef.current && !buttonRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleToggle = (e) => {
    e.stopPropagation();
    if (!disabled) {
      setIsOpen(!isOpen);
      setSearchTerm('');
    }
  };

  const handleSelect = (option) => {
    const newValue = getOptionValue(option);
    onChange(newValue);
    setIsOpen(false);
    setSearchTerm('');
  };

  return (
    <div className={`relative ${containerClassName}`} ref={dropdownRef}>
      {label && (
        <label className="block text-xs font-medium text-gray-700 mb-0.5">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      
      <div className="relative">
        <button
          ref={buttonRef}
          type="button"
          onClick={handleToggle}
          disabled={disabled}
          className={`w-full text-left border ${error ? 'border-red-300' : 'border-gray-300'} rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent text-xs transition-all ${
            disabled 
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
              : 'bg-white hover:border-gray-400 cursor-pointer'
          } ${isOpen ? 'ring-1 ring-violet-500 border-violet-500' : ''}`}
          data-dropdown-id={dropdownId}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 truncate">
              {selectedOption ? (
                <span className="text-gray-900 truncate text-xs font-medium">
                  {getOptionLabel(selectedOption)}
                </span>
              ) : (
                <span className="text-gray-500 text-xs">{placeholder || 'Sélectionnez...'}</span>
              )}
            </div>
            <FiChevronDown className={`h-3 w-3 text-gray-400 transition-transform ${isOpen ? 'transform rotate-180' : ''}`} />
          </div>
        </button>

        {isOpen && (
          <div className="absolute z-50 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-xl overflow-hidden">
            <div className="p-2 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
              <div className="relative">
                <FiSearch className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" size={12} />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  placeholder="Rechercher..."
                  className="w-full pl-7 pr-2 py-1.5 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent text-xs bg-white"
                  autoFocus
                />
                {searchTerm && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSearchTerm('');
                    }}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <FiX size={10} />
                  </button>
                )}
              </div>
            </div>
            
            <div className="max-h-48 overflow-y-auto">
              {filteredOptions.length === 0 ? (
                <div className="p-3 text-center">
                  <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-1.5">
                    <FiSearch className="text-gray-400" size={12} />
                  </div>
                  <p className="text-gray-500 text-xs">Aucun résultat trouvé</p>
                  {searchTerm && (
                    <p className="text-gray-400 text-xs mt-0.5">Essayez avec d'autres termes</p>
                  )}
                </div>
              ) : (
                <div className="py-0.5">
                  {filteredOptions.map((option, index) => {
                    const optionValue = getOptionValue(option);
                    const isSelected = optionValue != null && String(optionValue) === String(value);
                    
                    return (
                      <div
                        key={index}
                        className={`px-2 py-1.5 cursor-pointer hover:bg-violet-50 text-xs border-b border-gray-100 last:border-b-0 transition-colors flex items-center justify-between ${
                          isSelected ? 'bg-gradient-to-r from-violet-50 to-violet-100 text-violet-700 font-medium' : 'text-gray-700'
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelect(option);
                        }}
                      >
                        <div className="flex items-center gap-1.5">
                          {renderOption(option)}
                        </div>
                        {isSelected && (
                          <FiCheck className="text-violet-600 flex-shrink-0" size={10} />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {error && (
        <p className="text-xs text-red-600 mt-0.5">{error}</p>
      )}
    </div>
  );
};

export default function Create() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [journals, setJournals] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [partners, setPartners] = useState([]);
  const [devises, setDevises] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [userCompany, setUserCompany] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [dataLoading, setDataLoading] = useState(false);
  
  const [activeTab, setActiveTab] = useState('lignes');
  
  const [formData, setFormData] = useState({
    name: `ECR-${Date.now().toString().slice(-6)}`,
    move_type: 'entry',
    state: 'draft',
    journal_id: '',
    date: new Date().toISOString().split('T')[0],
    ref: '',
    company_id: '',
    currency_id: '',
    invoice_date: '',
    lines: [
      { 
        name: '', 
        account_id: '', 
        partner_id: '', 
        debit: '', 
        credit: '',
        reconciled: false,
        commentaire: ''
      }
    ],
    payment_state: 'not_paid',
    attachments: []
  });

  const [validationErrors, setValidationErrors] = useState({});
  const [attachmentFiles, setAttachmentFiles] = useState([]);

  const MOVE_TYPES = [
    { value: 'entry', label: 'Écriture comptable' },
    { value: 'out_invoice', label: 'Facture client' },
    { value: 'out_refund', label: 'Avoir client' },
    { value: 'in_invoice', label: 'Facture fournisseur' },
    { value: 'in_refund', label: 'Avoir fournisseur' },
    { value: 'out_receipt', label: 'Règlement client' },
    { value: 'in_receipt', label: 'Règlement fournisseur' },
  ];

  const PAYMENT_STATES = [
    { value: 'not_paid', label: 'Non payé' },
    { value: 'in_payment', label: 'En paiement' },
    { value: 'paid', label: 'Payé' },
    { value: 'partial', label: 'Partiellement payé' },
    { value: 'reversed', label: 'Reversé' },
    { value: 'invoicing_legacy', label: 'Ancien système' },
  ];

  useEffect(() => {
    loadOptions();
  }, []);

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    if (formData.move_type.includes('invoice') && !formData.invoice_date) {
      setFormData(prev => ({ ...prev, invoice_date: today }));
    }
  }, [formData.move_type]);

  const loadOptions = async () => {
    setDataLoading(true);
    try {
      const [journalsData, accountsData, partnersData, devisesData, companiesData, userData] = await Promise.all([
        piecesService.getJournals(),
        piecesService.getAccounts(),
        piecesService.getPartners(),
        piecesService.getDevises(),
        piecesService.getCompanies(),
        piecesService.getCurrentUser()
      ]);
      
      const normalizeData = (data) => {
        if (!data) return [];
        if (Array.isArray(data)) return data;
        if (Array.isArray(data.results)) return data.results;
        if (Array.isArray(data.data)) return data.data;
        return [];
      };
      
      const normalizedJournals = normalizeData(journalsData) || [];
      const normalizedAccounts = normalizeData(accountsData) || [];
      const normalizedPartners = normalizeData(partnersData) || [];
      const normalizedDevises = normalizeData(devisesData) || [];
      const normalizedCompanies = normalizeData(companiesData) || [];
      
      let userCompanyData = null;
      if (userData) {
        console.log('👤 Données utilisateur récupérées:', userData);
        
        if (userData.company && typeof userData.company === 'object') {
          userCompanyData = userData.company;
        } else if (userData.entite && typeof userData.entite === 'object') {
          userCompanyData = userData.entite;
        } else if (userData.company_id) {
          userCompanyData = normalizedCompanies.find(c => 
            c.id === userData.company_id || 
            String(c.id) === String(userData.company_id)
          );
        } else if (userData.entite_id) {
          userCompanyData = normalizedCompanies.find(c => 
            c.id === userData.entite_id || 
            String(c.id) === String(userData.entite_id)
          );
        }
      }
      
      setJournals(normalizedJournals);
      setAccounts(normalizedAccounts);
      setPartners(normalizedPartners);
      setDevises(normalizedDevises);
      setCompanies(normalizedCompanies);
      setUserCompany(userCompanyData);
      
      let defaultCompanyId = '';
      let defaultCurrencyId = '';
      let defaultJournalId = '';
      
      if (userCompanyData && userCompanyData.id) {
        defaultCompanyId = userCompanyData.id;
      } else if (normalizedCompanies.length > 0) {
        defaultCompanyId = normalizedCompanies[0].id;
      }
      
      if (normalizedDevises.length > 0) {
        const fcfaDevise = normalizedDevises.find(d => 
          d.code === 'XOF' || 
          d.code === 'FCFA' || 
          (d.nom && (d.nom.toLowerCase().includes('franc cfa') || d.nom.toLowerCase().includes('cfa')))
        );
        defaultCurrencyId = fcfaDevise?.id || normalizedDevises[0].id;
      }
      
      if (normalizedJournals.length > 0) {
        const diversJournal = normalizedJournals.find(j => 
          (j.name && j.name.toLowerCase().includes('divers')) ||
          (j.code && j.code.toLowerCase().includes('od'))
        );
        defaultJournalId = diversJournal?.id || normalizedJournals[0].id;
      }
      
      setFormData(prev => ({
        ...prev,
        company_id: defaultCompanyId || prev.company_id,
        currency_id: defaultCurrencyId || prev.currency_id,
        journal_id: defaultJournalId || prev.journal_id
      }));

    } catch (err) {
      console.error('❌ Erreur chargement options:', err);
      setError('Erreur lors du chargement des données. Veuillez rafraîchir la page.');
    } finally {
      setDataLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ 
      ...prev, 
      [field]: value 
    }));
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
    if (error) setError(null);
    if (success) setSuccess(null);
  };

  const handleLineChange = (index, field, value) => {
    const newLines = [...formData.lines];
    newLines[index] = { ...newLines[index], [field]: value };
    
    if (field === 'debit' && value) {
      newLines[index].credit = '';
    } else if (field === 'credit' && value) {
      newLines[index].debit = '';
    }
    
    if (validationErrors[`lines.${index}.${field}`]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[`lines.${index}.${field}`];
        return newErrors;
      });
    }
    
    // COPIE AUTOMATIQUE DU LIBELLÉ POUR TOUTES LES LIGNES APRÈS LA PREMIÈRE
    // Quand on change le compte ou partenaire sur n'importe quelle ligne après la première,
    // si le libellé est vide, on copie depuis la ligne 1
    if (index > 0 && (field === 'account_id' || field === 'partner_id') && !newLines[index].name?.trim()) {
      const firstLineLabel = formData.lines[0]?.name?.trim();
      if (firstLineLabel) {
        newLines[index].name = firstLineLabel;
      }
    }
    
    setFormData(prev => ({ ...prev, lines: newLines }));
    setError(null);
  };

  const addLine = () => {
    setFormData(prev => {
      const newLine = { 
        name: '', // Vide par défaut
        account_id: '', 
        partner_id: '', 
        debit: '', 
        credit: '',
        reconciled: false,
        commentaire: ''
      };
      
      const newLines = [...prev.lines, newLine];
      const newIndex = newLines.length - 1;
      
      // COPIE AUTOMATIQUE DU LIBELLÉ : Pour toutes les nouvelles lignes après la première
      if (newIndex > 0 && prev.lines[0]?.name?.trim()) {
        newLines[newIndex].name = prev.lines[0].name;
      }
      
      return {
        ...prev,
        lines: newLines
      };
    });
  };

  const removeLine = (index) => {
    if (formData.lines.length <= 1) {
      setError('Une pièce doit avoir au moins une ligne');
      return;
    }
    
    setFormData(prev => {
      const newLines = prev.lines.filter((_, i) => i !== index);
      
      // Si on a supprimé la ligne 1 (index 0) et qu'il reste des lignes,
      // les nouvelles lignes (à partir de l'index 0) prennent le libellé de la nouvelle ligne 1
      if (index === 0 && newLines.length > 0 && newLines[0]?.name?.trim()) {
        const firstLineLabel = newLines[0].name;
        // Copier vers toutes les autres lignes qui n'ont pas de libellé
        for (let i = 1; i < newLines.length; i++) {
          if (!newLines[i].name?.trim()) {
            newLines[i].name = firstLineLabel;
          }
        }
      }
      
      return {
        ...prev,
        lines: newLines
      };
    });
  };

  const calculateAmounts = () => {
    let amount_untaxed = 0;
    
    formData.lines.forEach(line => {
      const debit = parseFloat(line.debit) || 0;
      const credit = parseFloat(line.credit) || 0;
      amount_untaxed += debit + credit;
    });
    
    const amount_total = amount_untaxed;
    
    return {
      amount_untaxed: parseFloat(amount_untaxed.toFixed(2)),
      amount_tax: 0,
      amount_total: parseFloat(amount_total.toFixed(2))
    };
  };

  const calculateTotals = () => {
    const totals = formData.lines.reduce((acc, line) => ({
      debit: acc.debit + (parseFloat(line.debit) || 0),
      credit: acc.credit + (parseFloat(line.credit) || 0)
    }), { debit: 0, credit: 0 });
    
    return {
      ...totals,
      balanced: Math.abs(totals.debit - totals.credit) < 0.01
    };
  };

  const handleAttachmentUpload = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    
    const validFiles = files.filter(file => {
      const isPDF = file.type === 'application/pdf';
      const isSizeValid = file.size <= 10 * 1024 * 1024;
      
      if (!isPDF) {
        setError(`Le fichier "${file.name}" n'est pas un PDF valide`);
        return false;
      }
      if (!isSizeValid) {
        setError(`Le fichier "${file.name}" dépasse la taille maximale de 10MB`);
        return false;
      }
      return true;
    });
    
    if (validFiles.length === 0) return;
    
    const newAttachments = validFiles.map(file => ({
      id: Date.now() + Math.random(),
      file,
      name: file.name,
      size: file.size,
      type: file.type,
      uploadDate: new Date().toISOString(),
      previewUrl: URL.createObjectURL(file)
    }));
    
    setAttachmentFiles(prev => [...prev, ...newAttachments]);
    
    setFormData(prev => ({
      ...prev,
      attachments: [...prev.attachments, ...newAttachments.map(a => a.id)]
    }));
  };

  const removeAttachment = (attachmentId) => {
    setAttachmentFiles(prev => {
      const attachmentToRemove = prev.find(a => a.id === attachmentId);
      if (attachmentToRemove?.previewUrl) {
        URL.revokeObjectURL(attachmentToRemove.previewUrl);
      }
      return prev.filter(a => a.id !== attachmentId);
    });
    
    setFormData(prev => ({
      ...prev,
      attachments: prev.attachments.filter(id => id !== attachmentId)
    }));
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getPartnerDisplay = (partner) => {
    if (!partner) return '';
    
    let name = '';
    if (partner.nom) name = partner.nom;
    else if (partner.name) name = partner.name;
    else if (partner.raison_sociale) name = partner.raison_sociale;
    else if (partner.full_name) name = partner.full_name;
    else if (partner.display_name) name = partner.display_name;
    else if (partner.id) name = `#${partner.id}`;
    else if (partner.email) name = partner.email;
    else name = '';
    
    return name;
  };

  const getSelectedDevise = () => {
    if (!formData.currency_id) return null;
    return devises.find(d => String(d.id) === String(formData.currency_id));
  };

  const getDeviseDisplay = () => {
    const devise = getSelectedDevise();
    if (!devise) return '';
    return devise.symbole || devise.code || '';
  };

  const getCompanyDisplay = (company) => {
    if (!company) return 'Non sélectionné';
    
    return company.raison_sociale || 
           company.name || 
           company.nom || 
           company.display_name || 
           `Entreprise #${company.id}`;
  };

  const getSelectedCompany = () => {
    if (!formData.company_id) return userCompany || null;
    
    const foundCompany = companies.find(c => String(c.id) === String(formData.company_id));
    
    if (!foundCompany && userCompany && String(userCompany.id) === String(formData.company_id)) {
      return userCompany;
    }
    
    return foundCompany || null;
  };

  const validateForm = () => {
    const errors = {};
    
    if (!formData.company_id) errors.company_id = 'L\'entreprise est obligatoire';
    if (!formData.journal_id) errors.journal_id = 'Le journal est obligatoire';
    if (!formData.currency_id) errors.currency_id = 'La devise est obligatoire';
    if (!formData.date) errors.date = 'La date est obligatoire';
    
    if (formData.move_type.includes('invoice') && !formData.invoice_date) {
      errors.invoice_date = 'La date de facture est obligatoire';
    }
    
    formData.lines.forEach((line, index) => {
      if (!line.account_id) errors[`lines.${index}.account_id`] = 'Le compte est obligatoire';
      if (!line.name?.trim()) errors[`lines.${index}.name`] = 'Le libellé est obligatoire';
      if (!line.debit && !line.credit) errors[`lines.${index}.amount`] = 'Saisir un débit ou un crédit';
      if (line.debit && line.credit) errors[`lines.${index}.both`] = 'Saisir uniquement débit OU crédit';
    });
    
    return errors;
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      setLoading(false);
      return;
    }
    
    const totals = calculateTotals();
    const deviseDisplay = getDeviseDisplay();
    if (!totals.balanced) {
      const deviseText = deviseDisplay ? ` ${deviseDisplay}` : '';
      setError(`La pièce n'est pas équilibrée ! Débit: ${totals.debit.toFixed(2)}${deviseText}, Crédit: ${totals.credit.toFixed(2)}${deviseText}`);
      setLoading(false);
      return;
    }

    try {
      const amounts = calculateAmounts();
      
      const formattedData = piecesService.formatPieceForApi(
        {
          ...formData,
          reference: formData.ref,
          journal_id: formData.journal_id,
          partner_id: formData.lines[0]?.partner_id || null
        },
        formData.company_id,
        formData.currency_id
      );
      
      formattedData.invoice_date = formData.invoice_date || null;
      formattedData.amount_total = amounts.amount_total;
      formattedData.amount_untaxed = amounts.amount_untaxed;
      formattedData.amount_tax = 0;
      formattedData.payment_state = formData.payment_state;
      
      const result = await piecesService.create(formattedData);
      
      setSuccess('Pièce comptable créée avec succès !');
      
      setTimeout(() => {
        navigate('/comptabilite/pieces');
      }, 1500);
      
    } catch (err) {
      console.error('Erreur création:', err);
      
      let errorMessage = 'Erreur lors de la création de la pièce';
      if (err.status === 401) {
        errorMessage = 'Vous devez être connecté';
      } else if (err.status === 400) {
        if (err.response?.data) {
          const errors = err.response.data;
          if (typeof errors === 'object') {
            errorMessage = Object.entries(errors)
              .map(([field, messages]) => `${field}: ${Array.isArray(messages) ? messages.join(', ') : messages}`)
              .join('; ');
          }
        }
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const totals = calculateTotals();
  const amounts = calculateAmounts();
  const selectedDevise = getSelectedDevise();
  const selectedCompany = getSelectedCompany();
  const deviseDisplay = getDeviseDisplay();
  const companyDisplay = getCompanyDisplay(selectedCompany);
  
  const isInvoice = formData.move_type.includes('invoice');
  
  const indicators = [
    { 
      label: `${formData.lines.length} ligne${formData.lines.length > 1 ? 's' : ''}`, 
      color: 'bg-gray-100 text-gray-700' 
    },
    { 
      label: `${accounts.length} comptes`, 
      color: accounts.length > 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700' 
    },
    { 
      label: `${partners.length} partenaires`,
      color: partners.length > 0 ? 'bg-blue-50 text-blue-700' : 'bg-red-50 text-red-700' 
    },
    { 
      label: selectedDevise ? `Devise: ${selectedDevise.code}` : 'Devise non sélectionnée', 
      color: selectedDevise ? 'bg-purple-50 text-purple-700' : 'bg-red-50 text-red-700' 
    },
    { 
      label: formData.move_type ? MOVE_TYPES.find(t => t.value === formData.move_type)?.label : 'Type non défini', 
      color: 'bg-indigo-50 text-indigo-700' 
    }
  ];

  if (selectedCompany) {
    indicators.push({
      label: `Entreprise: ${companyDisplay.substring(0, 20)}${companyDisplay.length > 20 ? '...' : ''}`,
      color: 'bg-blue-50 text-blue-700'
    });
  }

  return (
    <ComptabiliteFormContainer
      moduleType="pieces"
      mode="create"
      title="Nouvelle écriture"
      subtitle="Création d'une nouvelle pièce comptable"
      onBack={() => navigate('/comptabilite/pieces')}
      onSubmit={handleSubmit}
      onCancel={() => navigate('/comptabilite/pieces')}
      loading={loading || dataLoading}
      error={error}
      success={success}
      totals={{
        ...totals, 
        devise: deviseDisplay,
        amounts: amounts
      }}
      indicators={indicators}
      isSubmitting={loading}
    >
      <div className="space-y-3 max-w-7xl mx-auto">
        {/* Section Informations Générales */}
        <div className="bg-gradient-to-br from-gray-50 to-white rounded-lg border border-gray-200 p-2 shadow-sm">
          <div className="flex items-center gap-1 mb-1.5">
            <div className="w-1 h-3 bg-gradient-to-b from-violet-600 to-violet-400 rounded"></div>
            <h3 className="text-xs font-semibold text-gray-900 uppercase tracking-wide">INFORMATIONS GÉNÉRALES</h3>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5 mb-1.5">
            <div>
              <SearchableDropdown
                label="Entreprise"
                value={formData.company_id}
                onChange={(value) => handleChange('company_id', value)}
                options={companies}
                placeholder={dataLoading ? "Chargement..." : "Sélectionner entreprise..."}
                required
                disabled={dataLoading || companies.length === 0}
                error={validationErrors.company_id}
                getOptionLabel={(company) => getCompanyDisplay(company)}
                getOptionValue={(company) => company.id}
                renderOption={(company) => (
                  <div className="flex items-center gap-2">
                    <FiBriefcase className="text-gray-400" size={10} />
                    <span className="truncate">{getCompanyDisplay(company)}</span>
                  </div>
                )}
                containerClassName="min-w-40"
                dropdownId="company-dropdown"
              />
              {selectedCompany && (
                <div className="mt-1 flex items-center gap-1 text-xs text-gray-600">
                  <FiBriefcase size={10} />
                  <span className="truncate" title={companyDisplay}>
                    {companyDisplay}
                  </span>
                </div>
              )}
              {companies.length === 0 && !dataLoading && (
                <p className="text-xs text-yellow-600 mt-1">
                  Aucune entreprise disponible. Vérifiez vos permissions.
                </p>
              )}
            </div>

            <div>
              <SearchableDropdown
                label="Type de pièce"
                value={formData.move_type}
                onChange={(value) => handleChange('move_type', value)}
                options={MOVE_TYPES}
                placeholder="Type de pièce..."
                required
                disabled={dataLoading}
                getOptionLabel={(type) => type.label}
                getOptionValue={(type) => type.value}
                dropdownId="move-type-dropdown"
              />
            </div>

            <div>
              <SearchableDropdown
                label="Journal"
                value={formData.journal_id}
                onChange={(value) => handleChange('journal_id', value)}
                options={journals}
                placeholder={dataLoading ? "Chargement..." : "Rechercher journal..."}
                required
                disabled={dataLoading || journals.length === 0}
                error={validationErrors.journal_id}
                getOptionLabel={(journal) => `${journal.code} - ${journal.name}`}
                getOptionValue={(journal) => journal.id}
                dropdownId="journal-dropdown"
              />
              {journals.length === 0 && !dataLoading && (
                <p className="text-xs text-yellow-600 mt-1">
                  Aucun journal disponible
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-0.5">
                Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => handleChange('date', e.target.value)}
                required
                disabled={dataLoading}
                className="w-full border border-gray-300 rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent bg-white text-xs disabled:bg-gray-100"
              />
              {validationErrors.date && (
                <p className="text-xs text-red-600 mt-0.5">{validationErrors.date}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5">
            <div>
              <SearchableDropdown
                label="Devise"
                value={formData.currency_id}
                onChange={(value) => handleChange('currency_id', value)}
                options={devises}
                placeholder={dataLoading ? "Chargement..." : "Rechercher devise..."}
                required
                disabled={dataLoading || devises.length === 0}
                error={validationErrors.currency_id}
                getOptionLabel={(devise) => `${devise.code} ${devise.symbole ? `(${devise.symbole})` : ''}`}
                getOptionValue={(devise) => devise.id}
                renderOption={(devise) => (
                  <div className="flex items-center gap-2">
                    <FiGlobe className="text-gray-400" size={10} />
                    <span>{devise.code} {devise.symbole && `(${devise.symbole})`}</span>
                  </div>
                )}
                dropdownId="currency-dropdown"
              />
              {selectedDevise && (
                <div className="mt-1 flex items-center gap-1 text-xs text-gray-600">
                  <FiGlobe size={10} />
                  <span>{selectedDevise.code} {selectedDevise.symbole && `(${selectedDevise.symbole})`}</span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-0.5">
                Référence
              </label>
              <input
                type="text"
                value={formData.ref}
                onChange={(e) => handleChange('ref', e.target.value)}
                disabled={dataLoading}
                className="w-full border border-gray-300 rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent bg-white text-xs disabled:bg-gray-100"
                placeholder="Ex: FACT-2024-001"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-0.5">
                Numéro pièce
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                disabled={dataLoading}
                className="w-full border border-gray-300 rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent bg-white text-xs font-mono disabled:bg-gray-100"
                placeholder="Ex: ECR-2024001"
              />
            </div>
          </div>

          {isInvoice && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5 mt-1.5">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-0.5">
                  Date de facture <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.invoice_date}
                  onChange={(e) => handleChange('invoice_date', e.target.value)}
                  required
                  disabled={dataLoading}
                  className="w-full border border-gray-300 rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent bg-white text-xs disabled:bg-gray-100"
                />
                {validationErrors.invoice_date && (
                  <p className="text-xs text-red-600 mt-0.5">{validationErrors.invoice_date}</p>
                )}
              </div>

              <div>
                <SearchableDropdown
                  label="État paiement"
                  value={formData.payment_state}
                  onChange={(value) => handleChange('payment_state', value)}
                  options={PAYMENT_STATES}
                  placeholder="État paiement..."
                  disabled={dataLoading}
                  getOptionLabel={(state) => state.label}
                  getOptionValue={(state) => state.value}
                  dropdownId="payment-state-dropdown"
                />
              </div>
            </div>
          )}
        </div>

        {/* Section Principale avec Navigation par Onglets */}
        <div className="bg-gradient-to-br from-gray-50 to-white rounded-lg border border-gray-200 shadow-sm">
          <div className="border-b border-gray-200">
            <div className="flex justify-between items-center px-4 pt-3">
              <div className="flex items-center gap-1">
                <div className="w-1 h-3 bg-gradient-to-b from-violet-600 to-violet-400 rounded"></div>
                <h3 className="text-xs font-semibold text-gray-900 uppercase tracking-wide">DÉTAILS DE LA PIÈCE</h3>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="text-xs text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded border border-gray-300">
                  <span className="font-medium">Devise:</span> {deviseDisplay || 'Non sélectionnée'}
                </div>
                {selectedCompany && (
                  <div className="text-xs text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded border border-gray-300">
                    <span className="font-medium">Entreprise:</span> {companyDisplay.substring(0, 20)}
                    {companyDisplay.length > 20 && '...'}
                  </div>
                )}
              </div>
            </div>
            
            {/* Barre d'onglets principale */}
            <div className="flex mt-2 px-4">
              <button
                type="button"
                onClick={() => setActiveTab('lignes')}
                className={`px-3 py-1.5 text-xs font-medium border-b-2 transition-all duration-200 ${
                  activeTab === 'lignes'
                    ? 'border-violet-600 text-violet-600 bg-gradient-to-b from-violet-50 to-white'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <FiFileText size={12} />
                  <span>Lignes comptables</span>
                  <span className="px-1.5 py-0.5 bg-gray-100 text-gray-700 rounded text-xs font-medium">
                    {formData.lines.length}
                  </span>
                </div>
              </button>
              
              <button
                type="button"
                onClick={() => setActiveTab('commentaires')}
                className={`px-3 py-1.5 text-xs font-medium border-b-2 transition-all duration-200 ${
                  activeTab === 'commentaires'
                    ? 'border-violet-600 text-violet-600 bg-gradient-to-b from-violet-50 to-white'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <FiMessageSquare size={12} />
                  <span>Commentaires</span>
                  {formData.lines.some(line => line.commentaire) && (
                    <span className="px-1.5 py-0.5 bg-violet-100 text-violet-700 rounded text-xs font-medium">
                      {formData.lines.filter(line => line.commentaire).length}
                    </span>
                  )}
                </div>
              </button>
              
              <button
                type="button"
                onClick={() => setActiveTab('pieces-jointes')}
                className={`px-3 py-1.5 text-xs font-medium border-b-2 transition-all duration-200 ${
                  activeTab === 'pieces-jointes'
                    ? 'border-violet-600 text-violet-600 bg-gradient-to-b from-violet-50 to-white'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <FiPaperclip size={12} />
                  <span>Pièces jointes</span>
                  {attachmentFiles.length > 0 && (
                    <span className="px-1.5 py-0.5 bg-violet-100 text-violet-700 rounded text-xs font-medium">
                      {attachmentFiles.length}
                    </span>
                  )}
                </div>
              </button>
            </div>
          </div>
          
          <div className="p-2">
            {activeTab === 'lignes' ? (
              <>
                <div className="flex justify-between items-center mb-2">
                  <div className="text-xs text-gray-600">
                    Ajoutez les lignes comptables. Chaque ligne doit avoir un compte et un montant (débit ou crédit).
                  </div>
                  <button
                    type="button"
                    onClick={addLine}
                    disabled={dataLoading}
                    className="px-2 py-1 bg-gradient-to-r from-violet-600 to-violet-500 text-white rounded hover:from-violet-700 hover:to-violet-600 text-xs font-medium flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <FiPlus size={9} />
                    <span>Ajouter une ligne</span>
                  </button>
                </div>
                
                <div className="relative">
                  <div className="flex border-b border-gray-300 bg-gray-50 min-w-[800px]">
                    <div className="w-40 p-1 border-r border-gray-300">
                      <div className="text-xs font-medium text-gray-500 uppercase">Compte *</div>
                    </div>
                    <div className="w-40 p-1 border-r border-gray-300">
                      <div className="text-xs font-medium text-gray-500 uppercase">Partenaire</div>
                    </div>
                    <div className="flex-1 p-1 border-r border-gray-300 min-w-32">
                      <div className="text-xs font-medium text-gray-500 uppercase">Libellé *</div>
                    </div>
                    <div className="w-28 p-1 border-r border-gray-300">
                      <div className="text-xs font-medium text-green-600 uppercase">Débit</div>
                    </div>
                    <div className="w-28 p-1 border-r border-gray-300">
                      <div className="text-xs font-medium text-red-600 uppercase">Crédit</div>
                    </div>
                    <div className="w-8 p-1">
                      <div className="text-xs font-medium text-gray-500 uppercase"></div>
                    </div>
                  </div>
                  
                  <div className="min-w-[800px]">
                    {formData.lines.map((line, index) => (
                      <div key={index} className="flex border-b border-gray-100 hover:bg-gray-50 group">
                        <div className="w-40 p-1 border-r border-gray-200 relative">
                          <SearchableDropdown
                            key={`account-${index}-${line.account_id}`}
                            value={line.account_id}
                            onChange={(value) => handleLineChange(index, 'account_id', value)}
                            options={accounts}
                            placeholder="Compte..."
                            required
                            disabled={dataLoading}
                            error={
                              validationErrors[`lines.${index}.account_id`] || 
                              validationErrors[`lines.${index}.amount`] ||
                              validationErrors[`lines.${index}.both`]
                            }
                            getOptionLabel={(account) => `${account.code} - ${account.name}`}
                            getOptionValue={(account) => account.id}
                            containerClassName="relative"
                            dropdownId={`account-dropdown-${index}`}
                          />
                        </div>
                        
                        <div className="w-40 p-1 border-r border-gray-200 relative">
                          <SearchableDropdown
                            key={`partner-${index}-${line.partner_id}`}
                            value={line.partner_id}
                            onChange={(value) => handleLineChange(index, 'partner_id', value)}
                            options={partners}
                            placeholder="Partenaire..."
                            disabled={dataLoading}
                            getOptionLabel={(partner) => getPartnerDisplay(partner)}
                            getOptionValue={(partner) => partner.id}
                            containerClassName="relative"
                            dropdownId={`partner-dropdown-${index}`}
                          />
                        </div>
                        
                        <div className="flex-1 p-1 border-r border-gray-200 min-w-32">
                          <div className="flex items-center">
                            <input
                              type="text"
                              value={line.name}
                              onChange={(e) => handleLineChange(index, 'name', e.target.value)}
                              required
                              disabled={dataLoading}
                              className="w-full px-1.5 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent text-xs disabled:bg-gray-100"
                              placeholder="Description de la ligne..."
                            />
                          </div>
                          {validationErrors[`lines.${index}.name`] && (
                            <p className="text-xs text-red-600 mt-0.5">{validationErrors[`lines.${index}.name`]}</p>
                          )}
                        </div>
                        
                        <div className="w-28 p-1 border-r border-gray-200">
                          <div className="relative">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={line.debit}
                              onChange={(e) => handleLineChange(index, 'debit', e.target.value)}
                              disabled={dataLoading}
                              className="w-full px-1.5 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent text-xs text-green-700 disabled:bg-gray-100"
                              placeholder="0,00"
                            />
                            {deviseDisplay && (
                              <span className="absolute right-1.5 top-1/2 transform -translate-y-1/2 text-xs text-gray-400">
                                {deviseDisplay}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <div className="w-28 p-1 border-r border-gray-200">
                          <div className="relative">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={line.credit}
                              onChange={(e) => handleLineChange(index, 'credit', e.target.value)}
                              disabled={dataLoading}
                              className="w-full px-1.5 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent text-xs text-red-700 disabled:bg-gray-100"
                              placeholder="0,00"
                            />
                            {deviseDisplay && (
                              <span className="absolute right-1.5 top-1/2 transform -translate-y-1/2 text-xs text-gray-400">
                                {deviseDisplay}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <div className="w-8 p-1 flex items-center justify-center">
                          <button
                            type="button"
                            onClick={() => removeLine(index)}
                            disabled={formData.lines.length <= 1 || dataLoading}
                            className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors group-hover:opacity-100 opacity-70"
                            title="Supprimer cette ligne"
                          >
                            <FiTrash2 size={11} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="mt-2 pt-2 border-t border-gray-300">
                  <div className="flex justify-between items-center">
                    <div className="text-xs text-gray-600">
                      Lignes: <span className="font-medium">{formData.lines.length}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-xs">
                        <span className="text-green-700 font-medium">Débit: </span>
                        <span className="font-bold">{totals.debit.toFixed(2)} {deviseDisplay}</span>
                      </div>
                      <div className="text-xs">
                        <span className="text-red-700 font-medium">Crédit: </span>
                        <span className="font-bold">{totals.credit.toFixed(2)} {deviseDisplay}</span>
                      </div>
                      <div className={`px-2 py-1 rounded text-xs font-medium ${totals.balanced ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {totals.balanced ? '✓ Équilibre' : '✗ Déséquilibre'}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : activeTab === 'commentaires' ? (
              <div className="p-3">
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">
                    Commentaires par ligne
                  </h4>
                  <p className="text-xs text-gray-500 mb-3">
                    Ajoutez des commentaires spécifiques pour chaque ligne comptable.
                    Ces commentaires seront enregistrés avec les lignes pour référence future.
                  </p>
                </div>
                
                <div className="space-y-3">
                  {formData.lines.map((line, index) => (
                    <div key={index} className="bg-gray-50 rounded-lg border border-gray-200 p-3">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="text-xs font-medium text-gray-700">
                            Ligne {index + 1} 
                            {line.account_id && (
                              <span className="ml-2 text-violet-600">
                                {accounts.find(a => String(a.id) === String(line.account_id))?.code || 'Compte non sélectionné'}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500 truncate max-w-md">
                            {line.name || 'Sans libellé'}
                          </div>
                        </div>
                        <div className="text-xs">
                          <span className={`px-1.5 py-0.5 rounded ${line.debit ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {line.debit ? `Débit: ${line.debit}` : `Crédit: ${line.credit || '0,00'}`} {deviseDisplay}
                          </span>
                        </div>
                      </div>
                      
                      <div className="mt-2">
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Commentaire pour cette ligne
                        </label>
                        <textarea
                          value={line.commentaire}
                          onChange={(e) => handleLineChange(index, 'commentaire', e.target.value)}
                          rows={2}
                          disabled={dataLoading}
                          className="w-full border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent text-xs disabled:bg-gray-100"
                          placeholder="Ajoutez un commentaire pour cette ligne (optionnel)..."
                        />
                        <div className="flex justify-between mt-1 text-xs text-gray-500">
                          <div>
                            {line.commentaire.length > 0 ? (
                              <span className={line.commentaire.length > 500 ? 'text-red-600' : 'text-violet-600'}>
                                {line.commentaire.length} caractère(s)
                              </span>
                            ) : (
                              'Aucun commentaire'
                            )}
                          </div>
                          <div>Max: 500 caractères</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-start gap-2">
                    <FiMessageSquare className="text-blue-600 mt-0.5" size={14} />
                    <div>
                      <h5 className="text-xs font-medium text-blue-900 mb-1">
                        Astuce pour les commentaires
                      </h5>
                      <p className="text-xs text-blue-700">
                        Utilisez les commentaires pour documenter le contexte spécifique de chaque ligne,
                        comme les références de facture, les numéros de contrat, ou toute information
                        supplémentaire utile pour la compréhension future de cette écriture.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-3">
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">
                    Pièces jointes (PDF uniquement)
                  </h4>
                  <p className="text-xs text-gray-500 mb-3">
                    Joignez des documents complémentaires tels que factures, contrats, justificatifs...
                    Ces fichiers seront associés à la pièce comptable pour référence future.
                  </p>
                  
                  <div className="relative group">
                    <input
                      type="file"
                      id="attachments"
                      accept=".pdf,application/pdf"
                      multiple
                      onChange={handleAttachmentUpload}
                      className="hidden"
                      disabled={dataLoading}
                    />
                    <label
                      htmlFor="attachments"
                      className={`inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-50 to-violet-100 text-violet-700 rounded-lg hover:from-violet-100 hover:to-violet-200 transition-all duration-200 font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${dataLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <FiUpload size={14} />
                      <span>Télécharger des fichiers</span>
                    </label>
                    <p className="text-xs text-gray-500 mt-1">
                      Formats acceptés: PDF • Max: 10MB par fichier
                    </p>
                  </div>
                </div>
                
                {attachmentFiles.length > 0 ? (
                  <div className="space-y-2">
                    <div className="text-xs font-medium text-gray-700">
                      Fichiers joints ({attachmentFiles.length})
                    </div>
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      {attachmentFiles.map((file) => (
                        <div
                          key={file.id}
                          className="flex items-center justify-between p-3 border-b border-gray-100 last:border-b-0 hover:bg-gray-50"
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-red-50 rounded">
                              <FiFile className="w-4 h-4 text-red-600" />
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900 truncate max-w-xs">
                                {file.name}
                              </div>
                              <div className="text-xs text-gray-500">
                                {formatFileSize(file.size)} • PDF
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => window.open(file.previewUrl, '_blank')}
                              className="p-1.5 text-gray-600 hover:text-violet-600 hover:bg-violet-50 rounded transition-colors"
                              title="Aperçu"
                            >
                              <FiEye size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const link = document.createElement('a');
                                link.href = file.previewUrl;
                                link.download = file.name;
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                              }}
                              className="p-1.5 text-gray-600 hover:text-violet-600 hover:bg-violet-50 rounded transition-colors"
                              title="Télécharger"
                            >
                              <FiDownload size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => removeAttachment(file.id)}
                              className="p-1.5 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                              title="Supprimer"
                            >
                              <FiXCircle size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                    <FiPaperclip className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                    <h4 className="text-sm font-medium text-gray-900 mb-1">
                      Aucun fichier joint
                    </h4>
                    <p className="text-xs text-gray-500 mb-3">
                      Ajoutez des documents complémentaires à votre pièce comptable
                    </p>
                    <label
                      htmlFor="attachments"
                      className={`inline-flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-violet-600 to-violet-500 text-white rounded hover:from-violet-700 hover:to-violet-600 text-xs font-medium cursor-pointer ${dataLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <FiPlus size={10} />
                      <span>Ajouter des fichiers</span>
                    </label>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </ComptabiliteFormContainer>
  );
}