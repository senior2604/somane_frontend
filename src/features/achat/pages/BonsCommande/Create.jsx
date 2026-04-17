import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiPlus, FiTrash2, FiCheck, FiPaperclip, FiUpload, FiCopy, FiRotateCcw, FiMoreVertical, FiSave, FiX } from 'react-icons/fi';
import { apiClient } from '../../../../services/apiClient';

// ==========================================
// COMPOSANT AUTOCOMPLETE RÉUTILISABLE
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
  disabled = false
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

  useEffect(() => {
    if (isOpen && dropdownRef.current && filteredOptions.length > 0) {
      const highlightedElement = dropdownRef.current.children[highlightedIndex];
      if (highlightedElement) {
        highlightedElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex, isOpen, filteredOptions.length]);

  return (
    <>
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
        className={`w-full px-2 py-1 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none ${className}`}
        style={{ height: '26px', border: 'none', backgroundColor: 'transparent' }}
        autoComplete="off"
      />
      
      {isOpen && filteredOptions.length > 0 && (
        <div 
          ref={dropdownRef}
          className="bg-white border border-gray-300 shadow-lg"
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
    </>
  );
};

// ==========================================
// COMPOSANT PRINCIPAL - BON DE COMMANDE
// ==========================================
export default function BonsCommandeCreate() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [fournisseurs, setFournisseurs] = useState([]);
  const [devises, setDevises] = useState([]);
  const [societes, setSocietes] = useState([]);
  const [utilisateurs, setUtilisateurs] = useState([]);
  const [articles, setArticles] = useState([]);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [activeTab, setActiveTab] = useState('lignes');
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [bonId, setBonId] = useState(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  
  const today = new Date().toISOString().split('T')[0];
  
  const initialFormData = {
    name: `ACH/26/${String(Date.now()).slice(-4)}`,
    state: 'brouillon',
    date_order: today,
    registration_date: today,
    ref: 'SGMT/002/2026',
    currency_id: '',
    currency_label: '',
    partner_id: '', // fournisseur
    partner_label: '',
    company_id: '', // société
    company_label: '',
    user_id: '', // acheteur
    user_label: '',
    lines: [
      { 
        id: 1,
        article_id: '', 
        article_label: '',
        description: '',
        quantite: '1',
        prix_unitaire: '0',
        taxes: '18',
        tva: '0',
        date_livraison: '',
      }
    ],
    notes: '',
    attachments: []
  };
  
  const [formData, setFormData] = useState(initialFormData);

  // Chargement des données API
  useEffect(() => {
    loadOptions();
  }, []);

  const loadOptions = async () => {
    setError(null);
    try {
      const [fournisseursData, devisesData, societesData, utilisateursData, articlesData] = await Promise.all([
        apiClient.get('/fournisseurs/'),
        apiClient.get('/devises/'),
        apiClient.get('/societes/'),
        apiClient.get('/utilisateurs/'),
        apiClient.get('/articles/')
      ]);
      
      const normalizeData = (response) => {
        if (!response) return [];
        if (Array.isArray(response.data)) return response.data;
        if (Array.isArray(response)) return response;
        return [];
      };
      
      const normalizedFournisseurs = normalizeData(fournisseursData) || [];
      const normalizedDevises = normalizeData(devisesData) || [];
      const normalizedSocietes = normalizeData(societesData) || [];
      const normalizedUtilisateurs = normalizeData(utilisateursData) || [];
      const normalizedArticles = normalizeData(articlesData) || [];
      
      setFournisseurs(normalizedFournisseurs);
      setDevises(normalizedDevises);
      setSocietes(normalizedSocietes);
      setUtilisateurs(normalizedUtilisateurs);
      setArticles(normalizedArticles);
      
      let defaultCurrencyId = '';
      let defaultCurrencyLabel = '';
      let defaultCompanyId = '';
      let defaultCompanyLabel = '';
      
      if (normalizedDevises.length > 0) {
        const fcfaDevise = normalizedDevises.find(d => 
          d.code === 'XOF' || d.code === 'FCFA'
        );
        const defaultCurrency = fcfaDevise || normalizedDevises[0];
        defaultCurrencyId = defaultCurrency.id;
        defaultCurrencyLabel = `${defaultCurrency.code} ${defaultCurrency.symbole ? `(${defaultCurrency.symbole})` : ''}`;
      }
      
      if (normalizedSocietes.length > 0) {
        defaultCompanyId = normalizedSocietes[0].id;
        defaultCompanyLabel = normalizedSocietes[0].name;
      }
      
      setFormData(prev => ({
        ...prev,
        currency_id: defaultCurrencyId,
        currency_label: defaultCurrencyLabel,
        company_id: defaultCompanyId,
        company_label: defaultCompanyLabel
      }));

    } catch (err) {
      console.error('Erreur chargement options:', err);
      setError('Erreur lors du chargement des données.');
    }
  };

  // Calcul des totaux
  const calculateTotals = () => {
    let ht = 0;
    let tva = 0;

    formData.lines.forEach(ligne => {
      const quantite = parseFloat(ligne.quantite) || 0;
      const prix = parseFloat(ligne.prix_unitaire) || 0;
      const tauxTVA = parseFloat(ligne.taxes) || 0;
      
      const montantHT = quantite * prix;
      const montantTVA = (montantHT * tauxTVA) / 100;
      
      ht += montantHT;
      tva += montantTVA;
    });

    const ttc = ht + tva;
    
    return { totalHT: ht, totalTVA: tva, totalTTC: ttc };
  };

  // Marquer qu'il y a des modifications non sauvegardées
  const markAsModified = () => {
    if (!hasUnsavedChanges) {
      setHasUnsavedChanges(true);
    }
  };

  // Fonction de sauvegarde automatique
  const saveAutoDraft = useCallback(async () => {
    if (!hasUnsavedChanges || isAutoSaving) return;
    
    setIsAutoSaving(true);
    try {
      const apiData = {
        name: formData.name,
        state: formData.state,
        date_order: formData.date_order,
        ref: formData.ref,
        partner_id: formData.partner_id,
        currency_id: formData.currency_id,
        company_id: formData.company_id,
        user_id: formData.user_id,
        lines: formData.lines.map(line => ({
          article_id: line.article_id,
          description: line.description,
          quantite: parseFloat(line.quantite) || 0,
          prix_unitaire: parseFloat(line.prix_unitaire) || 0,
          taxes: line.taxes,
          tva: parseFloat(line.tva) || 0,
          date_livraison: line.date_livraison || null
        }))
      };
      
      let result;
      if (bonId) {
        result = await apiClient.put(`/achats/bons-commande/${bonId}/`, apiData);
      } else {
        result = await apiClient.post('/achats/bons-commande/', apiData);
        if (result.data && result.data.id) {
          setBonId(result.data.id);
        }
      }
      
      console.log('Sauvegarde automatique réussie');
      setHasUnsavedChanges(false);
      
    } catch (err) {
      console.error('Erreur sauvegarde automatique:', err);
    } finally {
      setIsAutoSaving(false);
    }
  }, [formData, hasUnsavedChanges, isAutoSaving, bonId]);

  // Gestion de la navigation/quitter la page
  useEffect(() => {
    let isUnmounting = false;
    
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges && !isUnmounting) {
        saveAutoDraft();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      isUnmounting = true;
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasUnsavedChanges, saveAutoDraft]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    markAsModified();
  };

  const handleLineChange = (index, field, value) => {
    const newLines = [...formData.lines];
    newLines[index] = { ...newLines[index], [field]: value };
    
    // Recalculer la TVA si quantité, prix ou taxes changent
    if (field === 'quantite' || field === 'prix_unitaire' || field === 'taxes') {
      const quantite = parseFloat(newLines[index].quantite) || 0;
      const prix = parseFloat(newLines[index].prix_unitaire) || 0;
      const tauxTVA = parseFloat(newLines[index].taxes) || 0;
      const montantHT = quantite * prix;
      const montantTVA = (montantHT * tauxTVA) / 100;
      newLines[index].tva = montantTVA.toFixed(2);
    }
    
    setFormData(prev => ({ ...prev, lines: newLines }));
    markAsModified();
  };

  const addLine = () => {
    const newId = formData.lines.length > 0 
      ? Math.max(...formData.lines.map(l => l.id)) + 1 
      : 1;
    
    setFormData(prev => ({
      ...prev,
      lines: [...prev.lines, { 
        id: newId,
        article_id: '', 
        article_label: '',
        description: '',
        quantite: '1',
        prix_unitaire: '0',
        taxes: '18',
        tva: '0',
        date_livraison: '',
      }]
    }));
    markAsModified();
  };

  const removeLine = (index) => {
    if (formData.lines.length <= 1) {
      setError('Un bon de commande doit avoir au moins une ligne');
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      lines: prev.lines.filter((_, i) => i !== index)
    }));
    markAsModified();
  };

  const formatDateForDisplay = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  // Gestion du Tab uniquement pour le dernier champ
  const handleLastFieldTab = (e, lineIndex) => {
    if (e.key === 'Tab' && !e.shiftKey) {
      const isLastLine = lineIndex === formData.lines.length - 1;
      
      if (isLastLine) {
        e.preventDefault();
        addLine();
        
        setTimeout(() => {
          const newLineIndex = formData.lines.length;
          const inputsInNewRow = document.querySelectorAll(
            `tr:nth-child(${newLineIndex + 2}) td:first-child input`
          );
          if (inputsInNewRow.length > 0) {
            inputsInNewRow[0].focus();
          }
        }, 10);
      }
    }
  };

  const totals = calculateTotals();

  // Fonction pour enregistrer comme brouillon (MANUEL)
  const handleSaveDraft = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      const apiData = {
        name: formData.name,
        state: formData.state,
        date_order: formData.date_order,
        ref: formData.ref,
        partner_id: formData.partner_id,
        currency_id: formData.currency_id,
        company_id: formData.company_id,
        user_id: formData.user_id,
        lines: formData.lines.map(line => ({
          article_id: line.article_id,
          description: line.description,
          quantite: parseFloat(line.quantite) || 0,
          prix_unitaire: parseFloat(line.prix_unitaire) || 0,
          taxes: line.taxes,
          tva: parseFloat(line.tva) || 0,
          date_livraison: line.date_livraison || null
        }))
      };
      
      let result;
      if (bonId) {
        result = await apiClient.put(`/achats/bons-commande/${bonId}/`, apiData);
      } else {
        result = await apiClient.post('/achats/bons-commande/', apiData);
        if (result.data && result.data.id) {
          setBonId(result.data.id);
        }
      }
      
      setSuccess('Bon de commande enregistré comme brouillon avec succès !');
      setHasUnsavedChanges(false);
      
    } catch (err) {
      console.error('Erreur enregistrement brouillon:', err);
      setError(err.response?.data?.message || 'Erreur lors de l\'enregistrement du bon de commande.');
    } finally {
      setLoading(false);
    }
  };

  // Fonction pour valider ou remettre en brouillon (MANUEL)
  const handleToggleState = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      const newState = formData.state === 'brouillon' ? 'confirmer' : 'brouillon';
      const apiData = {
        name: formData.name,
        state: newState,
        date_order: formData.date_order,
        ref: formData.ref,
        partner_id: formData.partner_id,
        currency_id: formData.currency_id,
        company_id: formData.company_id,
        user_id: formData.user_id,
        lines: formData.lines.map(line => ({
          article_id: line.article_id,
          description: line.description,
          quantite: parseFloat(line.quantite) || 0,
          prix_unitaire: parseFloat(line.prix_unitaire) || 0,
          taxes: line.taxes,
          tva: parseFloat(line.tva) || 0,
          date_livraison: line.date_livraison || null
        }))
      };
      
      let result;
      if (bonId) {
        result = await apiClient.put(`/achats/bons-commande/${bonId}/`, apiData);
      } else {
        result = await apiClient.post('/achats/bons-commande/', apiData);
        if (result.data && result.data.id) {
          setBonId(result.data.id);
        }
      }
      
      setFormData(prev => ({ ...prev, state: newState }));
      
      if (newState === 'confirmer') {
        setSuccess('Bon de commande validé avec succès !');
      } else {
        setSuccess('Bon de commande remis en brouillon avec succès !');
      }
      
      setHasUnsavedChanges(false);
      
    } catch (err) {
      console.error('Erreur changement état:', err);
      setError(err.response?.data?.message || 'Erreur lors du changement d\'état du bon de commande.');
    } finally {
      setLoading(false);
    }
  };

  // Fonction pour ignorer les modifications
  const handleDiscardChanges = () => {
    setShowConfirmDialog(true);
  };

  const confirmDiscardChanges = () => {
    setFormData(initialFormData);
    setBonId(null);
    setHasUnsavedChanges(false);
    setShowConfirmDialog(false);
    setSuccess('Modifications annulées.');
  };

  // Fonction pour créer un nouveau bon
  const handleNewBon = () => {
    if (hasUnsavedChanges) {
      saveAutoDraft();
    }
    navigate('/achats/bons-commande/create');
  };

  // Fonction pour aller à la liste des bons
  const handleGoToList = () => {
    if (hasUnsavedChanges) {
      saveAutoDraft();
    }
    navigate('/achats/bons-commande');
  };

  // Actions menu
  const actionsMenuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (actionsMenuRef.current && !actionsMenuRef.current.contains(event.target)) {
        setShowActionsMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleDuplicate = () => {
    setSuccess('Fonctionnalité de duplication à implémenter');
    setShowActionsMenu(false);
  };

  const handleDelete = () => {
    setSuccess('Fonctionnalité de suppression à implémenter');
    setShowActionsMenu(false);
  };

  const handleExtourner = () => {
    setSuccess('Fonctionnalité d\'extourne à implémenter');
    setShowActionsMenu(false);
  };

  const isDraft = formData.state === 'brouillon';

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto bg-white border border-gray-300">
        
        {/* Barre d'en-tête - Ligne 1 */}
        <div className="border-b border-gray-300 px-4 py-3">
          {/* Première ligne : Titre et boutons */}
          <div className="flex items-center justify-between mb-2">
            {/* Partie gauche */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleNewBon}
                className="px-3 py-1.5 border border-gray-300 text-gray-700 text-xs hover:bg-gray-50 flex items-center gap-1"
              >
                <FiPlus size={12} />
                <span>Nouveau</span>
              </button>
              
              <div className="text-lg font-bold text-gray-900 cursor-pointer hover:text-purple-600" 
                   onClick={handleGoToList}>
                Bon Commande
              </div>
            </div>
            
            {/* Partie droite */}
            <div className="flex items-center gap-2">
              {/* Menu Actions */}
              <div className="relative" ref={actionsMenuRef}>
                <button
                  onClick={() => setShowActionsMenu(!showActionsMenu)}
                  className="px-3 py-1.5 border border-gray-300 text-gray-700 text-xs hover:bg-gray-50 flex items-center gap-1"
                >
                  <FiMoreVertical size={12} />
                  <span>Actions</span>
                </button>
                
                {showActionsMenu && (
                  <div className="absolute right-0 mt-1 w-48 bg-white border border-gray-300 shadow-lg rounded-sm z-50">
                    <button
                      onClick={handleDuplicate}
                      className="w-full px-3 py-2 text-xs text-left hover:bg-gray-50 flex items-center gap-2 border-b border-gray-100"
                    >
                      <FiCopy size={12} />
                      <span>Dupliquer</span>
                    </button>
                    <button
                      onClick={handleDelete}
                      className="w-full px-3 py-2 text-xs text-left hover:bg-gray-50 flex items-center gap-2 border-b border-gray-100"
                    >
                      <FiTrash2 size={12} />
                      <span>Supprimer</span>
                    </button>
                    <button
                      onClick={handleExtourner}
                      className="w-full px-3 py-2 text-xs text-left hover:bg-gray-50 flex items-center gap-2"
                    >
                      <FiRotateCcw size={12} />
                      <span>Extourné</span>
                    </button>
                  </div>
                )}
              </div>
              
              <button
                onClick={handleDiscardChanges}
                className="px-3 py-1.5 border border-gray-300 text-gray-700 text-xs hover:bg-gray-50 flex items-center gap-1"
              >
                <FiX size={12} />
                <span>Ignorer les modifications</span>
              </button>
              
              <button
                onClick={handleSaveDraft}
                disabled={loading}
                className="px-3 py-1.5 bg-purple-600 text-white text-xs flex items-center gap-1 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FiSave size={12} />
                <span>Enregistrer</span>
              </button>
            </div>
          </div>
          
          {/* Deuxième ligne : État et N° bon */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-700 font-medium">Etat:</span>
              <span className={`px-2 py-0.5 text-xs font-medium ${
                isDraft ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
              }`}>
                {isDraft ? 'Brouillon' : 'Validé'}
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-700 font-medium">N° bon:</span>
              <span className="text-sm font-mono text-purple-600">{formData.name}</span>
            </div>
          </div>
        </div>

        {/* Nouvelle ligne de boutons - Ligne 2 */}
        <div className="border-b border-gray-300 px-4 py-3 flex items-center justify-between">
          {/* Partie gauche : Bouton Valider/Remettre en brouillon */}
          <div>
            <button
              onClick={handleToggleState}
              disabled={loading}
              className={`px-4 py-2 font-medium text-xs flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed ${
                isDraft 
                  ? 'bg-purple-600 text-white hover:bg-purple-700' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              <FiCheck size={12} />
              <span>{isDraft ? 'Valider' : 'Remettre en brouillon'}</span>
            </button>
          </div>
          
          {/* Partie droite : Badges d'état (non cliquables) */}
          <div className="flex items-center gap-2">
            <div className={`px-3 py-1.5 text-xs font-medium border ${
              isDraft 
                ? 'bg-purple-100 text-purple-700 border-purple-300' 
                : 'bg-gray-100 text-gray-500 border-gray-300'
            }`}>
              Brouillon
            </div>
            
            <div className={`px-3 py-1.5 text-xs font-medium border ${
              !isDraft 
                ? 'bg-purple-100 text-purple-700 border-purple-300' 
                : 'bg-gray-100 text-gray-500 border-gray-300'
            }`}>
              Validé
            </div>
          </div>
        </div>

        {/* Indicateur de sauvegarde automatique */}
        {hasUnsavedChanges && (
          <div className="px-4 py-1 bg-blue-50 text-blue-700 text-xs border-b border-blue-200">
            <div className="flex items-center justify-between">
              <span>Modifications non sauvegardées</span>
              {isAutoSaving && <span className="animate-pulse">Sauvegarde en cours...</span>}
            </div>
          </div>
        )}

        {/* Informations du bon de commande */}
        <div className="px-4 py-3 border-b border-gray-300">
          <div className="text-lg font-bold text-gray-900 mb-3">{formData.name}</div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center" style={{ height: '26px' }}>
                <label className="text-xs text-gray-700 min-w-[140px] font-medium">Date commande</label>
                <input
                  type="date"
                  value={formData.date_order}
                  onChange={(e) => handleChange('date_order', e.target.value)}
                  className="flex-1 px-2 py-1 border border-gray-300 text-xs ml-2"
                  style={{ height: '26px' }}
                />
              </div>
              
              <div className="flex items-center" style={{ height: '26px' }}>
                <label className="text-xs text-gray-700 min-w-[140px] font-medium">Référence</label>
                <input
                  type="text"
                  value={formData.ref}
                  onChange={(e) => handleChange('ref', e.target.value)}
                  className="flex-1 px-2 py-1 border border-gray-300 text-xs ml-2"
                  style={{ height: '26px' }}
                  placeholder="SGMT/002/2026"
                />
              </div>

              <div className="flex items-center" style={{ height: '26px' }}>
                <label className="text-xs text-gray-700 min-w-[140px] font-medium">Société</label>
                <div className="flex-1 ml-2">
                  <AutocompleteInput
                    value={formData.company_label}
                    selectedId={formData.company_id}
                    onChange={(text) => handleChange('company_label', text)}
                    onSelect={(id, label) => {
                      handleChange('company_id', id);
                      handleChange('company_label', label);
                    }}
                    options={societes}
                    getOptionLabel={(option) => option.name || ''}
                    placeholder="Sélectionner une société"
                    className="border border-gray-300"
                  />
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center" style={{ height: '26px' }}>
                <label className="text-xs text-gray-700 min-w-[140px] font-medium">Date enregistrement</label>
                <div className="flex-1 px-2 py-1 border border-gray-300 bg-gray-50 text-xs text-gray-900 ml-2 flex items-center"
                     style={{ height: '26px' }}>
                  {formatDateForDisplay(formData.registration_date)}
                </div>
              </div>
              
              <div className="flex items-center" style={{ height: '26px' }}>
                <label className="text-xs text-gray-700 min-w-[140px] font-medium">Devise</label>
                <div className="flex-1 ml-2">
                  <AutocompleteInput
                    value={formData.currency_label}
                    selectedId={formData.currency_id}
                    onChange={(text) => handleChange('currency_label', text)}
                    onSelect={(id, label) => {
                      handleChange('currency_id', id);
                      handleChange('currency_label', label);
                    }}
                    options={devises}
                    getOptionLabel={(option) => `${option.code} ${option.symbole ? `(${option.symbole})` : ''}`}
                    placeholder="Sélectionner une devise"
                    className="border border-gray-300"
                  />
                </div>
              </div>
              
              <div className="flex items-center" style={{ height: '26px' }}>
                <label className="text-xs text-gray-700 min-w-[140px] font-medium">Fournisseur</label>
                <div className="flex-1 ml-2">
                  <AutocompleteInput
                    value={formData.partner_label}
                    selectedId={formData.partner_id}
                    onChange={(text) => handleChange('partner_label', text)}
                    onSelect={(id, label) => {
                      handleChange('partner_id', id);
                      handleChange('partner_label', label);
                    }}
                    options={fournisseurs}
                    getOptionLabel={(option) => option.name || option.nom || ''}
                    placeholder="Sélectionner un fournisseur"
                    className="border border-gray-300"
                  />
                </div>
              </div>

              <div className="flex items-center" style={{ height: '26px' }}>
                <label className="text-xs text-gray-700 min-w-[140px] font-medium">Acheteur</label>
                <div className="flex-1 ml-2">
                  <AutocompleteInput
                    value={formData.user_label}
                    selectedId={formData.user_id}
                    onChange={(text) => handleChange('user_label', text)}
                    onSelect={(id, label) => {
                      handleChange('user_id', id);
                      handleChange('user_label', label);
                    }}
                    options={utilisateurs}
                    getOptionLabel={(option) => option.name || option.nom || ''}
                    placeholder="Sélectionner un acheteur"
                    className="border border-gray-300"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Onglets */}
        <div className="border-b border-gray-300">
          <div className="px-4 flex">
            <button
              onClick={() => setActiveTab('lignes')}
              className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors ${
                activeTab === 'lignes' 
                  ? 'border-purple-600 text-purple-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Lignes de commande
            </button>
            <button
              onClick={() => setActiveTab('notes')}
              className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors ${
                activeTab === 'notes' 
                  ? 'border-purple-600 text-purple-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Notes
            </button>
            <button
              onClick={() => setActiveTab('pieces-jointes')}
              className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors ${
                activeTab === 'pieces-jointes' 
                  ? 'border-purple-600 text-purple-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Pièces jointes
            </button>
          </div>
        </div>

        {/* Contenu des onglets */}
        <div className="p-4">
          {activeTab === 'lignes' ? (
            <>
              <div className="border border-gray-300 mb-3 overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-300 px-2 py-1.5 text-xs font-medium text-gray-700 text-left min-w-[120px]">
                        Article
                      </th>
                      <th className="border border-gray-300 px-2 py-1.5 text-xs font-medium text-gray-700 text-left min-w-[150px]">
                        Description
                      </th>
                      <th className="border border-gray-300 px-2 py-1.5 text-xs font-medium text-gray-700 text-right min-w-[80px]">
                        Quantité
                      </th>
                      <th className="border border-gray-300 px-2 py-1.5 text-xs font-medium text-gray-700 text-right min-w-[100px]">
                        Prix Unitaire
                      </th>
                      <th className="border border-gray-300 px-2 py-1.5 text-xs font-medium text-gray-700 text-left min-w-[80px]">
                        Taxes %
                      </th>
                      <th className="border border-gray-300 px-2 py-1.5 text-xs font-medium text-gray-700 text-right min-w-[100px]">
                        Montant TVA
                      </th>
                      <th className="border border-gray-300 px-2 py-1.5 text-xs font-medium text-gray-700 text-left min-w-[120px]">
                        Date Livraison
                      </th>
                      <th className="border border-gray-300 px-2 py-1.5 text-xs font-medium text-gray-700 w-[40px]">
                        •••
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData.lines.map((line, lineIndex) => (
                      <tr key={line.id} className="hover:bg-gray-50">
                        <td className="border border-gray-300 p-1">
                          <AutocompleteInput
                            value={line.article_label}
                            selectedId={line.article_id}
                            onChange={(text) => handleLineChange(lineIndex, 'article_label', text)}
                            onSelect={(id, label) => {
                              handleLineChange(lineIndex, 'article_id', id);
                              handleLineChange(lineIndex, 'article_label', label);
                              
                              // Si l'article a un prix par défaut, on peut le remplir
                              const article = articles.find(a => a.id === id);
                              if (article && article.prix_vente) {
                                handleLineChange(lineIndex, 'prix_unitaire', article.prix_vente.toString());
                              }
                            }}
                            options={articles}
                            getOptionLabel={(option) => `${option.code || ''} - ${option.name || option.libelle || ''}`}
                            placeholder="Sélectionner..."
                          />
                        </td>
                        
                        <td className="border border-gray-300 p-1">
                          <input
                            type="text"
                            value={line.description}
                            onChange={(e) => handleLineChange(lineIndex, 'description', e.target.value)}
                            className="w-full px-2 py-1 border-0 text-xs focus:ring-1 focus:ring-blue-500"
                            style={{ height: '26px' }}
                            placeholder="Description"
                          />
                        </td>
                        
                        <td className="border border-gray-300 p-1">
                          <input
                            type="text"
                            value={line.quantite}
                            onChange={(e) => {
                              const value = e.target.value.replace(/[^\d.]/g, '');
                              handleLineChange(lineIndex, 'quantite', value);
                            }}
                            className="w-full px-2 py-1 border-0 text-xs text-right focus:ring-1 focus:ring-blue-500"
                            style={{ height: '26px' }}
                          />
                        </td>
                        
                        <td className="border border-gray-300 p-1">
                          <input
                            type="text"
                            value={line.prix_unitaire}
                            onChange={(e) => {
                              const value = e.target.value.replace(/[^\d.]/g, '');
                              handleLineChange(lineIndex, 'prix_unitaire', value);
                            }}
                            className="w-full px-2 py-1 border-0 text-xs text-right focus:ring-1 focus:ring-blue-500"
                            style={{ height: '26px' }}
                          />
                        </td>
                        
                        <td className="border border-gray-300 p-1">
                          <select
                            value={line.taxes}
                            onChange={(e) => handleLineChange(lineIndex, 'taxes', e.target.value)}
                            className="w-full px-2 py-1 border-0 text-xs focus:ring-1 focus:ring-blue-500 bg-transparent"
                            style={{ height: '26px' }}
                          >
                            <option value="0">0%</option>
                            <option value="18">18%</option>
                            <option value="20">20%</option>
                          </select>
                        </td>
                        
                        <td className="border border-gray-300 p-1">
                          <input
                            type="text"
                            value={line.tva}
                            readOnly
                            className="w-full px-2 py-1 border-0 text-xs text-right bg-gray-50"
                            style={{ height: '26px' }}
                          />
                        </td>
                        
                        <td className="border border-gray-300 p-1">
                          <input
                            type="date"
                            value={line.date_livraison}
                            onChange={(e) => handleLineChange(lineIndex, 'date_livraison', e.target.value)}
                            onKeyDown={(e) => handleLastFieldTab(e, lineIndex)}
                            className="w-full px-2 py-1 border-0 text-xs focus:ring-1 focus:ring-blue-500"
                            style={{ height: '26px' }}
                          />
                        </td>
                        
                        <td className="border border-gray-300 p-1">
                          <button
                            onClick={() => removeLine(lineIndex)}
                            className="w-full flex items-center justify-center p-1 text-gray-400 hover:text-red-600 transition-colors"
                            style={{ height: '26px' }}
                            title="Supprimer cette ligne"
                            tabIndex="-1"
                          >
                            <FiTrash2 size={12} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              <div className="mb-3">
                <button
                  onClick={addLine}
                  className="px-3 py-1 bg-purple-600 text-white text-xs flex items-center gap-1 hover:bg-purple-700 transition-colors"
                  style={{ height: '26px' }}
                >
                  <FiPlus size={10} />
                  <span>Ajouter une ligne</span>
                </button>
              </div>
              
              <div className="bg-green-50 border border-green-200 px-4 py-2 flex justify-end gap-8">
                <div className="text-sm text-gray-600">
                  HT: <span className="font-bold text-gray-900">{totals.totalHT.toFixed(2)} XOF</span>
                </div>
                <div className="text-sm text-gray-600">
                  TVA: <span className="font-bold text-gray-900">{totals.totalTVA.toFixed(2)} XOF</span>
                </div>
                <div className="text-sm font-bold text-gray-900 bg-green-100 px-3 py-1 rounded">
                  Total: {totals.totalTTC.toFixed(2)} XOF
                </div>
              </div>
            </>
          ) : activeTab === 'notes' ? (
            <div className="border border-gray-300">
              <textarea
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                className="w-full h-48 px-3 py-2 border-0 text-xs focus:ring-2 focus:ring-blue-500"
                placeholder="Ajouter des notes..."
              />
            </div>
          ) : (
            <div className="border border-gray-300 p-6">
              <div className="text-center py-8">
                <FiPaperclip className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                <div className="text-gray-500 text-xs mb-4">Aucune pièce jointe</div>
                <input
                  type="file"
                  id="attachments"
                  className="hidden"
                  multiple
                  onChange={(e) => {
                    const files = Array.from(e.target.files);
                    handleChange('attachments', files);
                  }}
                />
                <label
                  htmlFor="attachments"
                  className="inline-flex items-center gap-2 px-3 py-1 bg-purple-600 text-white text-xs cursor-pointer hover:bg-purple-700 transition-colors"
                  style={{ height: '26px' }}
                >
                  <FiUpload size={12} />
                  <span>Télécharger des fichiers</span>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Messages d'erreur/succès */}
        {(error || success) && (
          <div className={`px-4 py-3 text-sm border-t border-gray-300 ${
            error ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
          }`}>
            {error || success}
          </div>
        )}
      </div>

      {/* Dialogue de confirmation pour ignorer les modifications */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-sm shadow-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-gray-900 mb-3">Ignorer les modifications ?</h3>
            <p className="text-sm text-gray-600 mb-6">
              Êtes-vous sûr de vouloir annuler toutes les modifications ? Cette action ne peut pas être annulée.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowConfirmDialog(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 text-sm hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                onClick={confirmDiscardChanges}
                className="px-4 py-2 bg-red-600 text-white text-sm hover:bg-red-700"
              >
                Ignorer les modifications
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}