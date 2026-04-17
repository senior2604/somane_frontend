// src/features/comptabilité/pages/Sequences/Create.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FiSave, 
  FiX, 
  FiAlertCircle,
  FiCheck,
  FiHash,
  FiArrowRight,
  FiLoader,
  FiInfo,
  FiBriefcase,
  FiPlus
} from 'react-icons/fi';
import { sequencesService } from "../../services";
import { useEntity } from '../../../../context/EntityContext';

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

export default function SequencesCreate() {
  const navigate = useNavigate();
  const { activeEntity } = useEntity();
  
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    prefix: '',
    suffix: '',
    padding: 5,
    current_number: 0,
    number_increment: 1,
    active: true
  });

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasUnsavedChanges(true);
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      setError('Le nom est obligatoire');
      return false;
    }
    if (!formData.code.trim()) {
      setError('Le code est obligatoire');
      return false;
    }
    if (formData.code.length > 32) {
      setError('Le code ne doit pas dépasser 32 caractères');
      return false;
    }
    if (formData.padding < 1 || formData.padding > 10) {
      setError('Le nombre de chiffres doit être entre 1 et 10');
      return false;
    }
    if (formData.current_number < 0) {
      setError('Le numéro courant ne peut pas être négatif');
      return false;
    }
    if (formData.number_increment < 1) {
      setError("L'incrément doit être au moins 1");
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    
    setSaving(true);
    setError(null);
    
    try {
      await sequencesService.create(formData, activeEntity.id);
      setSuccess('Séquence créée avec succès !');
      setHasUnsavedChanges(false);
      setTimeout(() => {
        navigate('/comptabilite/sequences');
      }, 1500);
    } catch (err) {
      console.error('Erreur:', err);
      setError(err.response?.data?.detail || err.message || 'Erreur lors de la création');
    } finally {
      setSaving(false);
    }
  };

  const formatPattern = () => {
    const prefix = formData.prefix || '';
    const suffix = formData.suffix || '';
    const padding = formData.padding || 5;
    const zeros = '0'.repeat(padding);
    return `${prefix}${zeros}${suffix}`;
  };

  const formatCurrentNumber = () => {
    const prefix = formData.prefix || '';
    const suffix = formData.suffix || '';
    const padding = formData.padding || 5;
    const num = String(formData.current_number || 0).padStart(padding, '0');
    return `${prefix}${num}${suffix}`;
  };

  const formatNextNumber = () => {
    const prefix = formData.prefix || '';
    const suffix = formData.suffix || '';
    const padding = formData.padding || 5;
    const next = (formData.current_number || 0) + (formData.number_increment || 1);
    const num = String(next).padStart(padding, '0');
    return `${prefix}${num}${suffix}`;
  };

  if (!activeEntity) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-7xl mx-auto bg-white border border-gray-300">
          <div className="border-b border-gray-300 px-4 py-3">
            <div className="text-lg font-bold text-gray-900">Créer une séquence</div>
          </div>
          <div className="p-8">
            <div className="bg-yellow-50 border border-yellow-200 rounded p-6 text-center">
              <FiAlertCircle className="text-yellow-600 mx-auto mb-3" size={32} />
              <p className="text-yellow-800 font-medium text-lg mb-3">Aucune entité sélectionnée</p>
              <p className="text-sm text-gray-600 mb-4">
                Veuillez sélectionner une entité pour créer une séquence.
              </p>
            </div>
          </div>
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
              <Tooltip text="Nouvelle séquence">
                <button 
                  onClick={() => navigate('/comptabilite/sequences/create')}
                  className="h-12 px-4 bg-purple-600 text-white text-sm hover:bg-purple-700 hover:scale-105 hover:shadow-md active:scale-95 transition-all duration-200 flex items-center justify-center font-medium border-0"
                >
                  <FiPlus size={16} className="mr-1" />
                  <span>Nouveau</span>
                </button>
              </Tooltip>
              <div className="flex flex-col h-12 justify-center">
                <div 
                  className="text-lg font-bold text-gray-900 cursor-pointer hover:text-purple-600 hover:scale-105 transition-all duration-200"
                  onClick={() => navigate('/comptabilite/sequences')}
                >
                  Séquences
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="px-2 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-800">
                    Création
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Tooltip text="Annuler">
                <button 
                  onClick={() => navigate('/comptabilite/sequences')}
                  className="w-8 h-8 rounded-full bg-black text-white hover:bg-gray-800 hover:scale-110 hover:shadow-lg active:scale-90 transition-all duration-200 flex items-center justify-center"
                >
                  <FiX size={16} />
                </button>
              </Tooltip>
              <Tooltip text="Sauvegarder">
                <button 
                  onClick={handleSave}
                  disabled={saving}
                  className="w-8 h-8 rounded-full bg-purple-600 text-white hover:bg-purple-700 hover:scale-110 hover:shadow-lg active:scale-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center shadow-sm"
                >
                  <FiSave size={16} />
                </button>
              </Tooltip>
            </div>
          </div>
        </div>

        {/* En-tête ligne 2 - Statut */}
        <div className="border-b border-gray-300 px-4 py-3">
          <div className="flex flex-col">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {hasUnsavedChanges && (
                  <div className="flex items-center gap-1 text-xs text-amber-600">
                    <FiInfo size={14} />
                    <span>Modifications non sauvegardées</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <div className={`h-8 px-3 text-xs font-medium border transition-all duration-200 flex items-center ${
                  formData.active 
                    ? 'bg-green-100 text-green-700 border-green-300' 
                    : 'bg-gray-100 text-gray-500 border-gray-300'
                }`}>
                  Actif
                </div>
                <div className={`h-8 px-3 text-xs font-medium border transition-all duration-200 flex items-center ${
                  !formData.active 
                    ? 'bg-red-100 text-red-700 border-red-300' 
                    : 'bg-gray-100 text-gray-500 border-gray-300'
                }`}>
                  Inactif
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="m-4 p-3 bg-red-50 border border-red-200 rounded flex items-center gap-2 text-red-700">
            <FiAlertCircle size={16} />
            <span className="text-sm">{error}</span>
          </div>
        )}
        {success && (
          <div className="m-4 p-3 bg-green-50 border border-green-200 rounded flex items-center gap-2 text-green-700">
            <FiCheck size={16} />
            <span className="text-sm">{success}</span>
          </div>
        )}

        {/* Informations séquence */}
        <div className="px-4 py-3 border-b border-gray-300">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center" style={{ height: '26px' }}>
                <label className="text-xs text-gray-700 min-w-[140px] font-medium">Nom *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  className="flex-1 px-2 py-1 border border-gray-300 text-xs ml-2"
                  style={{ height: '26px' }}
                  placeholder="Factures clients"
                />
              </div>
              <div className="flex items-center" style={{ height: '26px' }}>
                <label className="text-xs text-gray-700 min-w-[140px] font-medium">Code *</label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => handleChange('code', e.target.value.toUpperCase())}
                  className="flex-1 px-2 py-1 border border-gray-300 text-xs font-mono ml-2"
                  style={{ height: '26px' }}
                  placeholder="FACT_CLIENT"
                  maxLength={32}
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center" style={{ height: '26px' }}>
                <label className="text-xs text-gray-700 min-w-[140px] font-medium">Entité</label>
                <div className="flex-1 px-2 py-1 border border-gray-300 bg-gray-50 text-xs text-gray-900 ml-2 flex items-center gap-2" style={{ height: '26px' }}>
                  <FiBriefcase className="text-purple-600" size={12} />
                  {activeEntity?.raison_sociale || activeEntity?.nom || '—'}
                </div>
              </div>
              <div className="flex items-center" style={{ height: '26px' }}>
                <label className="text-xs text-gray-700 min-w-[140px] font-medium">Statut</label>
                <div className="flex-1 ml-2 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleChange('active', !formData.active)}
                    className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      formData.active ? 'bg-green-600' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        formData.active ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                  <span className="text-xs text-gray-500">
                    {formData.active ? 'Actif' : 'Inactif'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section des paramètres */}
        <div className="p-4">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center" style={{ height: '26px' }}>
                <label className="text-xs text-gray-700 min-w-[140px] font-medium">Préfixe</label>
                <input
                  type="text"
                  value={formData.prefix}
                  onChange={(e) => handleChange('prefix', e.target.value)}
                  className="flex-1 px-2 py-1 border border-gray-300 text-xs font-mono ml-2"
                  style={{ height: '26px' }}
                  placeholder="FACT-"
                />
              </div>
              <div className="flex items-center" style={{ height: '26px' }}>
                <label className="text-xs text-gray-700 min-w-[140px] font-medium">Suffixe</label>
                <input
                  type="text"
                  value={formData.suffix}
                  onChange={(e) => handleChange('suffix', e.target.value)}
                  className="flex-1 px-2 py-1 border border-gray-300 text-xs font-mono ml-2"
                  style={{ height: '26px' }}
                  placeholder="-2025"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center" style={{ height: '26px' }}>
                <label className="text-xs text-gray-700 min-w-[140px] font-medium">Nombre de chiffres</label>
                <input
                  type="number"
                  value={formData.padding}
                  onChange={(e) => handleChange('padding', parseInt(e.target.value) || 5)}
                  className="flex-1 px-2 py-1 border border-gray-300 text-xs ml-2"
                  style={{ height: '26px' }}
                  min={1}
                  max={10}
                />
              </div>
              <div className="flex items-center" style={{ height: '26px' }}>
                <label className="text-xs text-gray-700 min-w-[140px] font-medium">Incrément</label>
                <input
                  type="number"
                  value={formData.number_increment}
                  onChange={(e) => handleChange('number_increment', parseInt(e.target.value) || 1)}
                  className="flex-1 px-2 py-1 border border-gray-300 text-xs ml-2"
                  style={{ height: '26px' }}
                  min={1}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center" style={{ height: '26px' }}>
                <label className="text-xs text-gray-700 min-w-[140px] font-medium">Numéro courant</label>
                <input
                  type="number"
                  value={formData.current_number}
                  onChange={(e) => handleChange('current_number', parseInt(e.target.value) || 0)}
                  className="flex-1 px-2 py-1 border border-gray-300 text-xs ml-2"
                  style={{ height: '26px' }}
                  min={0}
                />
              </div>
              <div className="flex items-center" style={{ height: '26px' }}>
              </div>
            </div>
          </div>

          {/* Aperçu */}
          <div className="mt-6 bg-gray-50 rounded-lg p-4 border border-gray-200">
            <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
              <FiArrowRight size={14} />
              Aperçu du format
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-gray-500 mb-1">Modèle</p>
                <p className="text-lg font-mono text-purple-600 bg-white px-3 py-2 rounded border border-gray-200">
                  {formatPattern()}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Numéro actuel</p>
                <p className="text-lg font-mono text-gray-900 bg-white px-3 py-2 rounded border border-gray-200">
                  {formatCurrentNumber()}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Prochain numéro</p>
                <p className="text-lg font-mono text-green-600 bg-white px-3 py-2 rounded border border-gray-200">
                  {formatNextNumber()}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}