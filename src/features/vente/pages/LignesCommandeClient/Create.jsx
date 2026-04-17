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
// COMPOSANT PRINCIPAL - LIGNES COMMANDE CLIENT
// ==========================================
export default function LignesCommandeClientCreate() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [commandesClient, setCommandesClient] = useState([]);
  const [produits, setProduits] = useState([]);
  const [devises, setDevises] = useState([]);
  const [journaux, setJournaux] = useState([]);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [activeTab, setActiveTab] = useState('ligne');
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [ligneId, setLigneId] = useState(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  
  const today = new Date().toISOString().split('T')[0];
  const dateFacturation = "6 janvier 2026";
  const echeance = "6 janvier 2026";
  const devise = "XOF (F CFA)";
  const journal = "OD";
  
  const initialFormData = {
    name: `VTE/26/0001`, // Fixé comme sur la photo
    state: 'brouillon',
    client_id: '',
    client_label: '',
    commande_client_id: '',
    commande_client_label: '',
    lines: [
      { 
        id: 1,
        produit_id: '', 
        produit_label: '',
        compte: '',
        quantite: '1',
        prix: '0',
        remise_percent: '',
        remise_value: '',
        taxe: '',
        montant: '0',
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
      const [commandesData, produitsData] = await Promise.all([
        apiClient.get('/ventes/commandes-client/'),
        apiClient.get('/produits/')
      ]);
      
      const normalizeData = (response) => {
        if (!response) return [];
        if (Array.isArray(response.data)) return response.data;
        if (Array.isArray(response)) return response;
        return [];
      };
      
      const normalizedCommandes = normalizeData(commandesData) || [];
      const normalizedProduits = normalizeData(produitsData) || [];
      
      setCommandesClient(normalizedCommandes);
      setProduits(normalizedProduits);

    } catch (err) {
      console.error('Erreur chargement options:', err);
      setError('Erreur lors du chargement des données.');
    }
  };

  // Calcul du montant d'une ligne
  const calculerMontantLigne = (quantite, prix, remisePercent, remiseValue) => {
    const qty = parseFloat(quantite) || 0;
    const p = parseFloat(prix) || 0;
    const remiseP = parseFloat(remisePercent) || 0;
    const remiseV = parseFloat(remiseValue) || 0;
    
    let montant = qty * p;
    
    // Appliquer la remise en pourcentage d'abord
    if (remiseP > 0) {
      montant = montant * (1 - remiseP / 100);
    }
    
    // Puis la remise en valeur
    if (remiseV > 0) {
      montant = montant - remiseV;
    }
    
    return montant > 0 ? montant : 0;
  };

  // Calcul des totaux
  const calculateTotals = () => {
    let ht = 0;
    let taxe = 0;

    formData.lines.forEach(ligne => {
      const quantite = parseFloat(ligne.quantite) || 0;
      const prix = parseFloat(ligne.prix) || 0;
      const remisePercent = parseFloat(ligne.remise_percent) || 0;
      const remiseValue = parseFloat(ligne.remise_value) || 0;
      const tauxTaxe = parseFloat(ligne.taxe) || 0;
      
      let montantHT = quantite * prix;
      
      // Appliquer les remises
      if (remisePercent > 0) {
        montantHT = montantHT * (1 - remisePercent / 100);
      }
      if (remiseValue > 0) {
        montantHT = montantHT - remiseValue;
      }
      montantHT = montantHT > 0 ? montantHT : 0;
      
      const montantTaxe = (montantHT * tauxTaxe) / 100;
      
      ht += montantHT;
      taxe += montantTaxe;
    });

    const ttc = ht + taxe;
    
    return { totalHT: ht, totalTaxe: taxe, totalTTC: ttc };
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
        client_id: formData.client_id,
        commande_client_id: formData.commande_client_id,
        lines: formData.lines.map(line => ({
          produit_id: line.produit_id,
          compte: line.compte,
          quantite: parseFloat(line.quantite) || 0,
          prix: parseFloat(line.prix) || 0,
          remise_percent: parseFloat(line.remise_percent) || 0,
          remise_value: parseFloat(line.remise_value) || 0,
          taxe: line.taxe,
          montant: parseFloat(line.montant) || 0
        }))
      };
      
      let result;
      if (ligneId) {
        result = await apiClient.put(`/ventes/lignes-commande-client/${ligneId}/`, apiData);
      } else {
        result = await apiClient.post('/ventes/lignes-commande-client/', apiData);
        if (result.data && result.data.id) {
          setLigneId(result.data.id);
        }
      }
      
      console.log('Sauvegarde automatique réussie');
      setHasUnsavedChanges(false);
      
    } catch (err) {
      console.error('Erreur sauvegarde automatique:', err);
    } finally {
      setIsAutoSaving(false);
    }
  }, [formData, hasUnsavedChanges, isAutoSaving, ligneId]);

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
    
    // Recalculer le montant si nécessaire
    if (field === 'quantite' || field === 'prix' || field === 'remise_percent' || field === 'remise_value') {
      const quantite = parseFloat(newLines[index].quantite) || 0;
      const prix = parseFloat(newLines[index].prix) || 0;
      const remisePercent = parseFloat(newLines[index].remise_percent) || 0;
      const remiseValue = parseFloat(newLines[index].remise_value) || 0;
      
      const montant = calculerMontantLigne(quantite, prix, remisePercent, remiseValue);
      newLines[index].montant = montant.toFixed(2);
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
        produit_id: '', 
        produit_label: '',
        compte: '',
        quantite: '1',
        prix: '0',
        remise_percent: '',
        remise_value: '',
        taxe: '',
        montant: '0',
      }]
    }));
    markAsModified();
  };

  const removeLine = (index) => {
    if (formData.lines.length <= 1) {
      setError('Une ligne de commande doit avoir au moins une ligne');
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      lines: prev.lines.filter((_, i) => i !== index)
    }));
    markAsModified();
  };

  // Gestion du Tab pour créer une nouvelle ligne
  const handleLastFieldTab = (e, lineIndex) => {
    if (e.key === 'Tab' && !e.shiftKey) {
      const isLastLine = lineIndex === formData.lines.length - 1;
      const isLastField = e.target.name === 'montant' || e.target.id?.includes('montant');
      
      if (isLastLine && isLastField) {
        e.preventDefault();
        addLine();
        
        setTimeout(() => {
          const newLineIndex = formData.lines.length;
          const newRowInputs = document.querySelectorAll(
            `tbody tr:last-child td:first-child input`
          );
          if (newRowInputs.length > 0) {
            newRowInputs[0].focus();
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
        client_id: formData.client_id,
        commande_client_id: formData.commande_client_id,
        lines: formData.lines.map(line => ({
          produit_id: line.produit_id,
          compte: line.compte,
          quantite: parseFloat(line.quantite) || 0,
          prix: parseFloat(line.prix) || 0,
          remise_percent: parseFloat(line.remise_percent) || 0,
          remise_value: parseFloat(line.remise_value) || 0,
          taxe: line.taxe,
          montant: parseFloat(line.montant) || 0
        }))
      };
      
      let result;
      if (ligneId) {
        result = await apiClient.put(`/ventes/lignes-commande-client/${ligneId}/`, apiData);
      } else {
        result = await apiClient.post('/ventes/lignes-commande-client/', apiData);
        if (result.data && result.data.id) {
          setLigneId(result.data.id);
        }
      }
      
      setSuccess('Ligne de commande enregistrée comme brouillon avec succès !');
      setHasUnsavedChanges(false);
      
    } catch (err) {
      console.error('Erreur enregistrement brouillon:', err);
      setError(err.response?.data?.message || 'Erreur lors de l\'enregistrement.');
    } finally {
      setLoading(false);
    }
  };

  // Fonction pour confirmer ou annuler
  const handleToggleState = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      const newState = formData.state === 'brouillon' ? 'confirme' : 'brouillon';
      const apiData = {
        name: formData.name,
        state: newState,
        client_id: formData.client_id,
        commande_client_id: formData.commande_client_id,
        lines: formData.lines.map(line => ({
          produit_id: line.produit_id,
          compte: line.compte,
          quantite: parseFloat(line.quantite) || 0,
          prix: parseFloat(line.prix) || 0,
          remise_percent: parseFloat(line.remise_percent) || 0,
          remise_value: parseFloat(line.remise_value) || 0,
          taxe: line.taxe,
          montant: parseFloat(line.montant) || 0
        }))
      };
      
      let result;
      if (ligneId) {
        result = await apiClient.put(`/ventes/lignes-commande-client/${ligneId}/`, apiData);
      } else {
        result = await apiClient.post('/ventes/lignes-commande-client/', apiData);
        if (result.data && result.data.id) {
          setLigneId(result.data.id);
        }
      }
      
      setFormData(prev => ({ ...prev, state: newState }));
      
      if (newState === 'confirme') {
        setSuccess('Ligne de commande confirmée avec succès !');
      } else {
        setSuccess('Ligne de commande annulée !');
      }
      
      setHasUnsavedChanges(false);
      
    } catch (err) {
      console.error('Erreur changement état:', err);
      setError(err.response?.data?.message || 'Erreur lors du changement d\'état.');
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
    setLigneId(null);
    setHasUnsavedChanges(false);
    setShowConfirmDialog(false);
    setSuccess('Modifications annulées.');
  };

  // Fonction pour créer une nouvelle ligne
  const handleNewLine = () => {
    if (hasUnsavedChanges) {
      saveAutoDraft();
    }
    navigate('/ventes/lignes-commande-client/create');
  };

  // Fonction pour aller à la liste
  const handleGoToList = () => {
    if (hasUnsavedChanges) {
      saveAutoDraft();
    }
    navigate('/ventes/lignes-commande-client');
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
                onClick={handleNewLine}
                className="px-3 py-1.5 border border-gray-300 text-gray-700 text-xs hover:bg-gray-50 flex items-center gap-1"
              >
                <FiPlus size={12} />
                <span>Nouveau</span>
              </button>
              
              <div className="text-lg font-bold text-gray-900 cursor-pointer hover:text-purple-600" 
                   onClick={handleGoToList}>
                Lignes Commande Client
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
          
          {/* Deuxième ligne : État et N° pièce */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-700 font-medium">Etat:</span>
              <span className={`px-2 py-0.5 text-xs font-medium ${
                isDraft ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
              }`}>
                {isDraft ? 'Brouillon' : 'Confirmé'}
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-700 font-medium">N° pièce:</span>
              <span className="text-sm font-mono text-purple-600">{formData.name}</span>
            </div>
          </div>
        </div>

        {/* Nouvelle ligne de boutons - Ligne 2 */}
        <div className="border-b border-gray-300 px-4 py-3 flex items-center justify-between">
          {/* Partie gauche : Boutons Confirmer/Annuler */}
          <div className="flex items-center gap-2">
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
              <span>Confirmer</span>
            </button>
            
            <button
              onClick={handleToggleState}
              disabled={loading}
              className="px-4 py-2 font-medium text-xs border border-gray-300 text-gray-700 hover:bg-gray-50 flex items-center gap-1"
            >
              <FiX size={12} />
              <span>Annuler</span>
            </button>
          </div>
          
          {/* Partie droite : Nouveaux badges */}
          <div className="flex items-center gap-2">
            <div className="px-3 py-1.5 text-xs font-medium border bg-gray-100 text-gray-700 border-gray-300">
              Commande clients
            </div>
            
            <div className="px-3 py-1.5 text-xs font-medium border bg-gray-100 text-gray-700 border-gray-300">
              Proforma
            </div>
            
            <div className="px-3 py-1.5 text-xs font-medium border bg-gray-100 text-gray-700 border-gray-300">
              Condition de paiement
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

        {/* ========================================== */}
        {/* INFORMATIONS DE LA LIGNE - COMME SUR LA PHOTO */}
        {/* ========================================== */}
        <div className="px-4 py-3 border-b border-gray-300">
          <div className="flex justify-between items-start">
            {/* VTE/26/0001 à gauche */}
            <div className="text-lg font-bold text-gray-900">
              {formData.name}
            </div>
            
            {/* Informations alignées à droite */}
            <div className="space-y-1 text-right">
              <div className="text-sm text-gray-700">
                <span className="font-medium">Date de facturation</span> 6 janvier 2026
              </div>
              <div className="text-sm text-gray-700">
                <span className="font-medium">Échéance</span> 6 janvier 2026
              </div>
              <div className="text-sm text-gray-700">
                <span className="font-medium">Devise</span> XOF (F CFA)
              </div>
              <div className="text-sm text-gray-700">
                <span className="font-medium">Journal</span> OD
              </div>
            </div>
          </div>
          
          {/* Client et Commande Client (inputs) */}
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div className="flex items-center" style={{ height: '26px' }}>
              <label className="text-xs text-gray-700 min-w-[100px] font-medium">Client</label>
              <div className="flex-1">
                <AutocompleteInput
                  value={formData.client_label}
                  selectedId={formData.client_id}
                  onChange={(text) => handleChange('client_label', text)}
                  onSelect={(id, label) => {
                    handleChange('client_id', id);
                    handleChange('client_label', label);
                  }}
                  options={commandesClient}
                  getOptionLabel={(option) => option.nom || option.name || option.raison_sociale || ''}
                  placeholder="Sélectionner un client"
                  className="border border-gray-300"
                />
              </div>
            </div>
            
            <div className="flex items-center" style={{ height: '26px' }}>
              <label className="text-xs text-gray-700 min-w-[100px] font-medium">Commande Client</label>
              <div className="flex-1">
                <AutocompleteInput
                  value={formData.commande_client_label}
                  selectedId={formData.commande_client_id}
                  onChange={(text) => handleChange('commande_client_label', text)}
                  onSelect={(id, label) => {
                    handleChange('commande_client_id', id);
                    handleChange('commande_client_label', label);
                  }}
                  options={commandesClient}
                  getOptionLabel={(option) => `${option.numero || option.name} - ${option.client_nom || ''}`}
                  placeholder="Sélectionner une commande"
                  className="border border-gray-300"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Onglets */}
        <div className="border-b border-gray-300">
          <div className="px-4 flex">
            <button
              onClick={() => setActiveTab('ligne')}
              className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors ${
                activeTab === 'ligne' 
                  ? 'border-purple-600 text-purple-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Ligne de facture
            </button>
            <button
              onClick={() => setActiveTab('ecritures')}
              className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors ${
                activeTab === 'ecritures' 
                  ? 'border-purple-600 text-purple-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Écritures comptables
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
          </div>
        </div>

        {/* Contenu des onglets */}
        <div className="p-4">
          {activeTab === 'ligne' ? (
            <>
              <div className="border border-gray-300 mb-3 overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-300 px-2 py-1.5 text-xs font-medium text-gray-700 text-left min-w-[120px]">
                        Produits
                      </th>
                      <th className="border border-gray-300 px-2 py-1.5 text-xs font-medium text-gray-700 text-left min-w-[100px]">
                        Compte
                      </th>
                      <th className="border border-gray-300 px-2 py-1.5 text-xs font-medium text-gray-700 text-right min-w-[80px]">
                        Quantité
                      </th>
                      <th className="border border-gray-300 px-2 py-1.5 text-xs font-medium text-gray-700 text-right min-w-[80px]">
                        Prix
                      </th>
                      <th className="border border-gray-300 px-2 py-1.5 text-xs font-medium text-gray-700 text-right min-w-[80px]">
                        Remise %
                      </th>
                      <th className="border border-gray-300 px-2 py-1.5 text-xs font-medium text-gray-700 text-right min-w-[100px]">
                        Remise valeur
                      </th>
                      <th className="border border-gray-300 px-2 py-1.5 text-xs font-medium text-gray-700 text-left min-w-[80px]">
                        Taxe
                      </th>
                      <th className="border border-gray-300 px-2 py-1.5 text-xs font-medium text-gray-700 text-right min-w-[100px]">
                        Montant
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
                            value={line.produit_label}
                            selectedId={line.produit_id}
                            onChange={(text) => handleLineChange(lineIndex, 'produit_label', text)}
                            onSelect={(id, label) => {
                              handleLineChange(lineIndex, 'produit_id', id);
                              handleLineChange(lineIndex, 'produit_label', label);
                              
                              // Si le produit a un prix par défaut
                              const produit = produits.find(p => p.id === id);
                              if (produit && produit.prix_vente) {
                                handleLineChange(lineIndex, 'prix', produit.prix_vente.toString());
                              }
                            }}
                            options={produits}
                            getOptionLabel={(option) => `${option.code || ''} - ${option.name || option.libelle || ''}`}
                            placeholder="Sélectionner..."
                          />
                        </td>
                        
                        <td className="border border-gray-300 p-1">
                          <input
                            type="text"
                            name="compte"
                            value={line.compte}
                            onChange={(e) => handleLineChange(lineIndex, 'compte', e.target.value)}
                            className="w-full px-2 py-1 border-0 text-xs focus:ring-1 focus:ring-blue-500"
                            style={{ height: '26px' }}
                            placeholder="Ex: 701000"
                          />
                        </td>
                        
                        <td className="border border-gray-300 p-1">
                          <input
                            type="text"
                            name="quantite"
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
                            name="prix"
                            value={line.prix}
                            onChange={(e) => {
                              const value = e.target.value.replace(/[^\d.]/g, '');
                              handleLineChange(lineIndex, 'prix', value);
                            }}
                            className="w-full px-2 py-1 border-0 text-xs text-right focus:ring-1 focus:ring-blue-500"
                            style={{ height: '26px' }}
                          />
                        </td>
                        
                        <td className="border border-gray-300 p-1">
                          <input
                            type="text"
                            name="remise_percent"
                            value={line.remise_percent}
                            onChange={(e) => {
                              const value = e.target.value.replace(/[^\d.]/g, '');
                              handleLineChange(lineIndex, 'remise_percent', value);
                            }}
                            className="w-full px-2 py-1 border-0 text-xs text-right focus:ring-1 focus:ring-blue-500"
                            style={{ height: '26px' }}
                          />
                        </td>
                        
                        <td className="border border-gray-300 p-1">
                          <input
                            type="text"
                            name="remise_value"
                            value={line.remise_value}
                            onChange={(e) => {
                              const value = e.target.value.replace(/[^\d.]/g, '');
                              handleLineChange(lineIndex, 'remise_value', value);
                            }}
                            className="w-full px-2 py-1 border-0 text-xs text-right focus:ring-1 focus:ring-blue-500"
                            style={{ height: '26px' }}
                          />
                        </td>
                        
                        <td className="border border-gray-300 p-1">
                          <select
                            name="taxe"
                            value={line.taxe}
                            onChange={(e) => handleLineChange(lineIndex, 'taxe', e.target.value)}
                            className="w-full px-2 py-1 border-0 text-xs focus:ring-1 focus:ring-blue-500 bg-transparent"
                            style={{ height: '26px' }}
                          >
                            <option value="">0%</option>
                            <option value="18">18%</option>
                            <option value="20">20%</option>
                          </select>
                        </td>
                        
                        <td className="border border-gray-300 p-1">
                          <input
                            type="text"
                            name="montant"
                            id={`montant-${line.id}`}
                            value={line.montant}
                            readOnly
                            onKeyDown={(e) => handleLastFieldTab(e, lineIndex)}
                            className="w-full px-2 py-1 border-0 text-xs text-right bg-gray-50"
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
              
              <div className="mb-3 flex items-center gap-2">
                <button
                  onClick={addLine}
                  className="px-3 py-1 bg-purple-600 text-white text-xs flex items-center gap-1 hover:bg-purple-700 transition-colors"
                  style={{ height: '26px' }}
                >
                  <FiPlus size={10} />
                  <span>Ajouter une ligne</span>
                </button>
                
                <button className="px-3 py-1 border border-gray-300 text-gray-700 text-xs flex items-center gap-1 hover:bg-gray-50"
                  style={{ height: '26px' }}>
                  <FiPlus size={10} />
                  <span>Ajouter une section</span>
                </button>
                
                <button className="px-3 py-1 border border-gray-300 text-gray-700 text-xs flex items-center gap-1 hover:bg-gray-50"
                  style={{ height: '26px' }}>
                  <FiPlus size={10} />
                  <span>Ajouter une note</span>
                </button>
                
                <button className="px-3 py-1 border border-gray-300 text-gray-700 text-xs flex items-center gap-1 hover:bg-gray-50"
                  style={{ height: '26px' }}>
                  <FiPlus size={10} />
                  <span>Catalogue</span>
                </button>
              </div>
              
              <div className="bg-green-50 border border-green-200 px-4 py-2 flex justify-end gap-8">
                <div className="text-sm text-gray-600">
                  Montant HT: <span className="font-bold text-gray-900">{totals.totalHT.toFixed(2)} XOF</span>
                </div>
                <div className="text-sm text-gray-600">
                  Taxe: <span className="font-bold text-gray-900">{totals.totalTaxe.toFixed(2)} XOF</span>
                </div>
                <div className="text-sm font-bold text-gray-900 bg-green-100 px-3 py-1 rounded">
                  Montant TTC: {totals.totalTTC.toFixed(2)} XOF
                </div>
              </div>
            </>
          ) : activeTab === 'ecritures' ? (
            <div className="border border-gray-300 p-6 text-center text-gray-500 text-sm">
              Écritures comptables - À implémenter
            </div>
          ) : (
            <div className="border border-gray-300 p-6">
              <textarea
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                className="w-full h-48 px-3 py-2 border-0 text-xs focus:ring-2 focus:ring-blue-500"
                placeholder="Ajouter des notes..."
              />
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