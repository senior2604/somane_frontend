// src/features/comptabilité/pages/Sequences/Show.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  FiSave, 
  FiX, 
  FiAlertCircle,
  FiCheck,
  FiHash,
  FiArrowRight,
  FiLoader,
  FiEdit,
  FiTrash2,
  FiCopy,
  FiSettings,
  FiInfo,
  FiPlus,
  FiBriefcase
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

export default function SequencesShow() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { activeEntity } = useEntity();
  
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const actionsMenuRef = useRef(null);
  
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

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (actionsMenuRef.current && !actionsMenuRef.current.contains(e.target)) {
        setShowActionsMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const loadSequence = async () => {
      if (!activeEntity || !id) return;
      
      setLoading(true);
      setError(null);
      
      try {
        const data = await sequencesService.getById(id, activeEntity.id);
        setFormData({
          name: data.name || '',
          code: data.code || '',
          prefix: data.prefix || '',
          suffix: data.suffix || '',
          padding: data.padding || 5,
          current_number: data.current_number || 0,
          number_increment: data.number_increment || 1,
          active: data.active !== undefined ? data.active : true
        });
      } catch (err) {
        console.error('Erreur chargement séquence:', err);
        setError('Impossible de charger la séquence');
      } finally {
        setLoading(false);
      }
    };
    
    loadSequence();
  }, [id, activeEntity]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
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
      await sequencesService.update(id, formData, activeEntity.id);
      setSuccess('Séquence modifiée avec succès !');
      setIsEditing(false);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Erreur:', err);
      setError(err.response?.data?.detail || err.message || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setSaving(true);
    try {
      await sequencesService.delete(id, activeEntity.id);
      setSuccess('Séquence supprimée avec succès !');
      setTimeout(() => {
        navigate('/comptabilite/sequences');
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Erreur lors de la suppression');
      setShowDeleteConfirm(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDuplicate = async () => {
    setSaving(true);
    try {
      const newSequence = {
        ...formData,
        id: undefined,
        name: `${formData.name} (copie)`,
        code: `${formData.code}_COPY`,
        current_number: 0
      };
      await sequencesService.create(newSequence, activeEntity.id);
      setSuccess('Séquence dupliquée avec succès !');
      setTimeout(() => {
        navigate('/comptabilite/sequences');
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Erreur lors de la duplication');
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
            <div className="text-lg font-bold text-gray-900">Séquence</div>
          </div>
          <div className="p-8">
            <div className="bg-yellow-50 border border-yellow-200 rounded p-6 text-center">
              <FiAlertCircle className="text-yellow-600 mx-auto mb-3" size={32} />
              <p className="text-yellow-800 font-medium text-lg mb-3">Aucune entité sélectionnée</p>
              <p className="text-sm text-gray-600 mb-4">
                Veuillez sélectionner une entité pour gérer les séquences.
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
            <div className="text-lg font-bold text-gray-900">Séquence</div>
          </div>
          <div className="p-8 flex items-center justify-center">
            <div className="text-center">
              <FiLoader className="animate-spin text-purple-600 mx-auto" size={32} />
              <p className="mt-4 text-gray-600 text-sm">Chargement...</p>
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
                  <span className={`px-2 py-0.5 text-xs font-medium ${formData.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                    {formData.active ? 'Actif' : 'Inactif'}
                  </span>
                  <span className="text-xs text-gray-500 font-mono">{formData.code}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative" ref={actionsMenuRef}>
                <Tooltip text="Menu des actions">
                  <button 
                    onClick={() => setShowActionsMenu(!showActionsMenu)}
                    className="h-8 px-3 border border-gray-300 text-gray-700 text-xs hover:bg-gray-50 hover:scale-105 hover:shadow-md active:scale-95 transition-all duration-200 flex items-center gap-1"
                  >
                    <FiSettings size={12} /><span>Actions</span>
                  </button>
                </Tooltip>
                {showActionsMenu && (
                  <div className="absolute right-0 mt-1 w-48 bg-white border border-gray-300 shadow-lg rounded-sm z-50">
                    <button onClick={handleDuplicate} className="w-full px-3 py-2 text-xs text-left hover:bg-gray-50 hover:pl-4 transition-all duration-200 flex items-center gap-2 border-b border-gray-100">
                      <FiCopy size={12} /> Dupliquer
                    </button>
                    <button onClick={() => setShowDeleteConfirm(true)} className="w-full px-3 py-2 text-xs text-left hover:bg-red-50 hover:text-red-600 hover:pl-4 transition-all duration-200 flex items-center gap-2">
                      <FiTrash2 size={12} /> Supprimer
                    </button>
                  </div>
                )}
              </div>
              {!isEditing ? (
                <Tooltip text="Modifier la séquence">
                  <button 
                    onClick={() => setIsEditing(true)}
                    className="w-8 h-8 rounded-full bg-blue-600 text-white hover:bg-blue-700 hover:scale-110 hover:shadow-lg active:scale-90 transition-all duration-200 flex items-center justify-center shadow-sm"
                  >
                    <FiEdit size={16} />
                  </button>
                </Tooltip>
              ) : (
                <>
                  <Tooltip text="Annuler">
                    <button 
                      onClick={() => {
                        setIsEditing(false);
                        setError(null);
                        // Recharger les données originales
                        sequencesService.getById(id, activeEntity.id).then(data => {
                          setFormData({
                            name: data.name || '',
                            code: data.code || '',
                            prefix: data.prefix || '',
                            suffix: data.suffix || '',
                            padding: data.padding || 5,
                            current_number: data.current_number || 0,
                            number_increment: data.number_increment || 1,
                            active: data.active !== undefined ? data.active : true
                          });
                        });
                      }}
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
                </>
              )}
            </div>
          </div>
        </div>

        {/* En-tête ligne 2 - Statut */}
        <div className="border-b border-gray-300 px-4 py-3">
          <div className="flex flex-col">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {isEditing && (
                  <div className="flex items-center gap-1 text-xs text-amber-600">
                    <FiInfo size={14} />
                    <span>Mode édition - Modifiez les champs ci-dessous</span>
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
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    className="flex-1 px-2 py-1 border border-gray-300 text-xs ml-2"
                    style={{ height: '26px' }}
                    placeholder="Factures clients"
                  />
                ) : (
                  <div className="flex-1 px-2 py-1 border border-gray-300 bg-gray-50 text-xs text-gray-900 ml-2 flex items-center" style={{ height: '26px' }}>
                    {formData.name || '—'}
                  </div>
                )}
              </div>
              <div className="flex items-center" style={{ height: '26px' }}>
                <label className="text-xs text-gray-700 min-w-[140px] font-medium">Code *</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => handleChange('code', e.target.value.toUpperCase())}
                    className="flex-1 px-2 py-1 border border-gray-300 text-xs font-mono ml-2"
                    style={{ height: '26px' }}
                    placeholder="FACT_CLIENT"
                    maxLength={32}
                  />
                ) : (
                  <div className="flex-1 px-2 py-1 border border-gray-300 bg-gray-50 text-xs font-mono text-gray-900 ml-2 flex items-center" style={{ height: '26px' }}>
                    {formData.code || '—'}
                  </div>
                )}
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
                {isEditing ? (
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
                ) : (
                  <div className="flex-1 ml-2">
                    {formData.active ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Actif
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                        Inactif
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Onglets */}
        <div className="border-b border-gray-300">
          <div className="px-4 flex">
            {['general', 'apercu'].map(tab => (
              <button 
                key={tab} 
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-xs font-medium border-b-2 transition-all duration-200 ${
                  activeTab === tab 
                    ? 'border-purple-600 text-purple-600 hover:text-purple-800' 
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab === 'general' ? 'Paramètres généraux' : 'Aperçu du format'}
              </button>
            ))}
          </div>
        </div>

        {/* Contenu onglets */}
        <div className="p-4">
          {activeTab === 'general' ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center" style={{ height: '26px' }}>
                  <label className="text-xs text-gray-700 min-w-[140px] font-medium">Préfixe</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.prefix}
                      onChange={(e) => handleChange('prefix', e.target.value)}
                      className="flex-1 px-2 py-1 border border-gray-300 text-xs font-mono ml-2"
                      style={{ height: '26px' }}
                      placeholder="FACT-"
                    />
                  ) : (
                    <div className="flex-1 px-2 py-1 border border-gray-300 bg-gray-50 text-xs font-mono text-gray-900 ml-2 flex items-center" style={{ height: '26px' }}>
                      {formData.prefix || '—'}
                    </div>
                  )}
                </div>
                <div className="flex items-center" style={{ height: '26px' }}>
                  <label className="text-xs text-gray-700 min-w-[140px] font-medium">Suffixe</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.suffix}
                      onChange={(e) => handleChange('suffix', e.target.value)}
                      className="flex-1 px-2 py-1 border border-gray-300 text-xs font-mono ml-2"
                      style={{ height: '26px' }}
                      placeholder="-2025"
                    />
                  ) : (
                    <div className="flex-1 px-2 py-1 border border-gray-300 bg-gray-50 text-xs font-mono text-gray-900 ml-2 flex items-center" style={{ height: '26px' }}>
                      {formData.suffix || '—'}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center" style={{ height: '26px' }}>
                  <label className="text-xs text-gray-700 min-w-[140px] font-medium">Nombre de chiffres</label>
                  {isEditing ? (
                    <input
                      type="number"
                      value={formData.padding}
                      onChange={(e) => handleChange('padding', parseInt(e.target.value) || 5)}
                      className="flex-1 px-2 py-1 border border-gray-300 text-xs ml-2"
                      style={{ height: '26px' }}
                      min={1}
                      max={10}
                    />
                  ) : (
                    <div className="flex-1 px-2 py-1 border border-gray-300 bg-gray-50 text-xs text-gray-900 ml-2 flex items-center" style={{ height: '26px' }}>
                      {formData.padding}
                    </div>
                  )}
                </div>
                <div className="flex items-center" style={{ height: '26px' }}>
                  <label className="text-xs text-gray-700 min-w-[140px] font-medium">Incrément</label>
                  {isEditing ? (
                    <input
                      type="number"
                      value={formData.number_increment}
                      onChange={(e) => handleChange('number_increment', parseInt(e.target.value) || 1)}
                      className="flex-1 px-2 py-1 border border-gray-300 text-xs ml-2"
                      style={{ height: '26px' }}
                      min={1}
                    />
                  ) : (
                    <div className="flex-1 px-2 py-1 border border-gray-300 bg-gray-50 text-xs text-gray-900 ml-2 flex items-center" style={{ height: '26px' }}>
                      +{formData.number_increment}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center" style={{ height: '26px' }}>
                  <label className="text-xs text-gray-700 min-w-[140px] font-medium">Numéro courant</label>
                  {isEditing ? (
                    <input
                      type="number"
                      value={formData.current_number}
                      onChange={(e) => handleChange('current_number', parseInt(e.target.value) || 0)}
                      className="flex-1 px-2 py-1 border border-gray-300 text-xs ml-2"
                      style={{ height: '26px' }}
                      min={0}
                    />
                  ) : (
                    <div className="flex-1 px-2 py-1 border border-gray-300 bg-gray-50 text-xs text-gray-900 ml-2 flex items-center" style={{ height: '26px' }}>
                      {formData.current_number}
                    </div>
                  )}
                </div>
                <div className="flex items-center" style={{ height: '26px' }}>
                </div>
              </div>

              {!isEditing && (
                <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded">
                  <p className="text-xs text-gray-500 flex items-center gap-2">
                    <FiInfo size={12} />
                    Cliquez sur le bouton Modifier pour modifier cette séquence
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
              <h3 className="text-sm font-medium text-gray-700 mb-4 flex items-center gap-2">
                <FiArrowRight size={14} />
                Aperçu du format de numérotation
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-lg p-4 border border-gray-200 text-center">
                  <p className="text-xs text-gray-500 mb-2">📐 Modèle</p>
                  <p className="text-xl font-mono text-purple-600 bg-purple-50 px-3 py-2 rounded inline-block">
                    {formatPattern()}
                  </p>
                </div>
                <div className="bg-white rounded-lg p-4 border border-gray-200 text-center">
                  <p className="text-xs text-gray-500 mb-2">🔢 Numéro actuel</p>
                  <p className="text-xl font-mono text-gray-900 bg-gray-50 px-3 py-2 rounded inline-block">
                    {formatCurrentNumber()}
                  </p>
                </div>
                <div className="bg-white rounded-lg p-4 border border-gray-200 text-center">
                  <p className="text-xs text-gray-500 mb-2">⏩ Prochain numéro</p>
                  <p className="text-xl font-mono text-green-600 bg-green-50 px-3 py-2 rounded inline-block">
                    {formatNextNumber()}
                  </p>
                </div>
              </div>
              <div className="mt-4 text-center text-xs text-gray-400">
                Exemple de rendu : {formatCurrentNumber()} sera le prochain numéro utilisé
              </div>
            </div>
          )}
        </div>

        {/* Pied de page */}
        {!isEditing && (
          <div className="border-t border-gray-300 px-4 py-2 bg-gray-50 text-xs text-gray-500 flex justify-between">
            <div>Créé le {new Date().toLocaleDateString('fr-FR')}</div>
            <div>Dernière modification : {new Date().toLocaleDateString('fr-FR')}</div>
          </div>
        )}
      </div>

      {/* Modal confirmation suppression */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 rounded-full">
                <FiTrash2 className="text-red-600" size={20} />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Confirmer la suppression</h3>
            </div>
            <p className="text-gray-600 mb-6">
              Êtes-vous sûr de vouloir supprimer la séquence <span className="font-medium">"{formData.name}"</span> ?
              Cette action est irréversible.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleDelete}
                disabled={saving}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {saving ? 'Suppression...' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}