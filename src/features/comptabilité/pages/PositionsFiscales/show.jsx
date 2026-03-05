import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  FiEdit, FiTrash2, FiCheck, FiX, FiFileText,
  FiRefreshCw, FiPrinter, FiCopy, FiMoreVertical,
  FiAlertCircle, FiRotateCcw, FiPlus, FiShield,
  FiToggleRight, FiPercent, FiGlobe, FiBriefcase,
  FiInfo, FiSettings, FiUploadCloud
} from 'react-icons/fi';
import { apiClient } from '../../../../services/apiClient';
import { authService } from '../../../../services/authService';
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

// ==========================================
// NORMALISATION DES DONNÉES API
// ==========================================
const normalizeApiResponse = (data) => {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (data.data && Array.isArray(data.data)) return data.data;
  if (data.results && Array.isArray(data.results)) return data.results;
  if (data.items && Array.isArray(data.items)) return data.items;
  console.warn('⚠️ Format de réponse non reconnu:', data);
  return [];
};

export default function ShowPositionFiscale() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { activeEntity } = useEntity();
  
  const [position, setPosition] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [actionInProgress, setActionInProgress] = useState(false);
  const [activeTab, setActiveTab] = useState('configuration'); // 'configuration', 'notes'
  
  // États pour les référentiels
  const [paysMap, setPaysMap] = useState({});
  const [companiesMap, setCompaniesMap] = useState({});

  useEffect(() => {
    if (id) {
      loadReferentials();
    }
  }, [id]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (showActionsMenu) {
        const menu = document.getElementById('actions-menu');
        if (menu && !menu.contains(e.target)) {
          setShowActionsMenu(false);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showActionsMenu]);

  // Charger les référentiels d'abord
  const loadReferentials = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('📥 Chargement des référentiels...');
      
      const [paysRes] = await Promise.all([
        apiClient.get('/pays/').catch(() => ({ data: [] }))
      ]);

      const paysData = normalizeApiResponse(paysRes);

      // Créer les maps
      const paysObj = {};
      paysData.forEach(p => {
        paysObj[p.id] = {
          ...p,
          displayName: p.nom_fr || p.nom || p.name || 'Pays'
        };
      });
      setPaysMap(paysObj);

      // Charger les entreprises si authentifié
      if (authService.isAuthenticated()) {
        const companiesRes = await apiClient.get('/entites/').catch(() => ({ data: [] }));
        const companiesData = normalizeApiResponse(companiesRes);
        const companiesObj = {};
        companiesData.forEach(c => {
          companiesObj[c.id] = {
            ...c,
            displayName: c.raison_sociale || c.nom || c.name || 'Entreprise'
          };
        });
        setCompaniesMap(companiesObj);
      }

      // Maintenant charger la position
      await loadPosition();
      
    } catch (err) {
      console.error('❌ Erreur chargement référentiels:', err);
      setError('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const loadPosition = async () => {
    try {
      console.log('📥 Chargement position:', id);
      const response = await apiClient.get(`/compta/fiscal-positions/${id}/`);
      const data = response.data || response;
      console.log('✅ Position chargée:', data);
      setPosition(data);
    } catch (err) {
      console.error('❌ Erreur chargement position:', err);
      if (err.status === 404) {
        setError('Position fiscale non trouvée');
      } else {
        setError(`Erreur: ${err.message || 'Inconnue'}`);
      }
    }
  };

  const handleDelete = async () => {
    if (!position) return;
    setShowConfirmDialog(true);
  };

  const confirmDelete = async () => {
    setDeleting(true);
    setShowConfirmDialog(false);
    try {
      await apiClient.delete(`/compta/fiscal-positions/${id}/`);
      navigate('/comptabilite/positions-fiscales');
    } catch (err) {
      setError('Erreur lors de la suppression: ' + (err.message || 'Inconnue'));
    } finally {
      setDeleting(false);
    }
  };

  const handleToggleActive = async () => {
    if (!position) return;
    setActionInProgress(true);
    try {
      await apiClient.patch(`/compta/fiscal-positions/${id}/`, {
        active: !position.active
      });
      await loadPosition();
    } catch (err) {
      setError('Erreur lors du changement de statut: ' + err.message);
    } finally {
      setActionInProgress(false);
    }
  };

  const handleDuplicate = async () => {
    if (!position) return;
    setActionInProgress(true);
    try {
      const { id: _, created_at, updated_at, created_by, updated_by, ...data } = position;
      data.name = `${data.name} (Copie)`;
      const result = await apiClient.post('/compta/fiscal-positions/', data);
      navigate(`/comptabilite/positions-fiscales/${result.id}`);
    } catch (err) {
      setError('Erreur lors de la duplication: ' + err.message);
    } finally {
      setActionInProgress(false);
    }
  };

  const handleNewPosition = () => {
    navigate('/comptabilite/positions-fiscales/create');
  };

  const handleGoToList = () => {
    navigate('/comptabilite/positions-fiscales');
  };

  const formatDateForDisplay = (dateString) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  const getStatusConfig = (active) => {
    if (active === false) {
      return { text: 'Inactive', cls: 'bg-gray-100 text-gray-800 border-gray-200' };
    }
    return { text: 'Active', cls: 'bg-green-100 text-green-800 border-green-200' };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-7xl mx-auto bg-white border border-gray-300">
          <div className="border-b border-gray-300 px-4 py-3">
            <div className="text-lg font-bold text-gray-900">Détail de la position fiscale</div>
          </div>
          <div className="p-8 flex items-center justify-center">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="mt-4 text-gray-600 text-sm">Chargement de la position...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !position) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-7xl mx-auto bg-white border border-gray-300">
          <div className="border-b border-gray-300 px-4 py-3">
            <div className="text-lg font-bold text-gray-900">Détail de la position fiscale</div>
          </div>
          <div className="p-8">
            <div className="bg-red-50 border border-red-200 rounded p-6 text-center">
              <FiAlertCircle className="text-red-600 mx-auto mb-3" size={32} />
              <p className="text-red-800 font-medium text-lg mb-2">Erreur</p>
              <p className="text-sm text-gray-600 mb-4">{error || 'Position non trouvée'}</p>
              <div className="flex justify-center gap-3">
                <button
                  onClick={loadReferentials}
                  className="px-4 py-2 border border-gray-300 text-gray-700 text-sm hover:bg-gray-50"
                >
                  <FiRefreshCw size={12} className="inline mr-1" />
                  Réessayer
                </button>
                <Link
                  to="/comptabilite/positions-fiscales"
                  className="px-4 py-2 bg-purple-600 text-white text-sm hover:bg-purple-700 flex items-center gap-1"
                >
                  <FiX size={12} />
                  Retour à la liste
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const statusConfig = getStatusConfig(position.active);
  
  // Enrichir les données avec les maps
  const pays = position.country ? paysMap[position.country] || paysMap[position.country?.id] : null;
  const company = position.company ? companiesMap[position.company] || companiesMap[position.company?.id] : null;

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto bg-white border border-gray-300">

        {/* ── En-tête ligne 1 ── */}
        <div className="border-b border-gray-300 px-4 py-3">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-start gap-3">
              <Tooltip text="Créer une nouvelle position fiscale">
                <button
                  onClick={handleNewPosition}
                  className="h-8 px-3 border border-gray-300 text-gray-700 text-xs hover:bg-gray-50 hover:scale-105 hover:shadow-md active:scale-95 transition-all duration-200 flex items-center gap-1"
                >
                  <FiPlus size={12} /><span>Nouveau</span>
                </button>
              </Tooltip>
              <div className="flex flex-col">
                <div
                  onClick={handleGoToList}
                  className="text-lg font-bold text-gray-900 cursor-pointer hover:text-purple-600 hover:scale-105 transition-all duration-200"
                >
                  Positions Fiscales
                </div>
                <div className="flex items-center gap-2 mt-1">
                  
                  <span className="text-sm text-gray-700 font-medium ml-2">Nom :</span>
                  <span className="text-sm text-gray-900 font-medium">{position.name}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Tooltip text="Actualiser les données">
                <button
                  onClick={loadReferentials}
                  disabled={loading}
                  className="h-8 px-3 border border-gray-300 text-gray-700 text-xs hover:bg-gray-50 hover:scale-105 hover:shadow-md active:scale-95 transition-all duration-200 flex items-center gap-1 disabled:opacity-50"
                >
                  <FiRefreshCw size={12} className={loading ? 'animate-spin' : ''} />
                  <span>Actualiser</span>
                </button>
              </Tooltip>
              
              <div className="relative">
                <Tooltip text="Menu des actions">
                  <button
                    onClick={() => setShowActionsMenu(!showActionsMenu)}
                    className="h-8 px-3 border border-gray-300 text-gray-700 text-xs hover:bg-gray-50 hover:scale-105 hover:shadow-md active:scale-95 transition-all duration-200 flex items-center gap-1"
                  >
                    <FiMoreVertical size={12} />
                    <span>Actions</span>
                  </button>
                </Tooltip>
                
                {showActionsMenu && (
                  <div id="actions-menu" className="absolute right-0 mt-1 w-48 bg-white border border-gray-300 shadow-lg z-50">
                    <button
                      onClick={() => { handleDuplicate(); setShowActionsMenu(false); }}
                      disabled={actionInProgress}
                      className="w-full px-3 py-2 text-xs text-left hover:bg-gray-50 hover:pl-4 transition-all duration-200 flex items-center gap-2 border-b border-gray-100 disabled:opacity-50"
                    >
                      <FiCopy size={12} />
                      <span>Dupliquer</span>
                    </button>
                    
                    <button
                      onClick={() => window.print()}
                      className="w-full px-3 py-2 text-xs text-left hover:bg-gray-50 hover:pl-4 transition-all duration-200 flex items-center gap-2 border-b border-gray-100"
                    >
                      <FiPrinter size={12} />
                      <span>Imprimer</span>
                    </button>
                    
                    <button
                      onClick={() => { handleDelete(); setShowActionsMenu(false); }}
                      disabled={deleting}
                      className="w-full px-3 py-2 text-xs text-left hover:bg-red-50 hover:pl-4 transition-all duration-200 flex items-center gap-2 text-red-600 disabled:opacity-50"
                    >
                      <FiTrash2 size={12} />
                      <span>Supprimer</span>
                    </button>
                  </div>
                )}
              </div>

              <Tooltip text="Modifier la position fiscale">
                <Link
                  to={`/comptabilite/positions-fiscales/${id}/edit`}
                  className="h-8 px-3 bg-purple-600 text-white text-xs flex items-center gap-1 hover:bg-purple-700 hover:scale-105 hover:shadow-md active:scale-95 transition-all duration-200"
                >
                  <FiEdit size={12} />
                  <span>Modifier</span>
                </Link>
              </Tooltip>
            </div>
          </div>
        </div>

        {/* ── En-tête ligne 2 (Toggle Switch avec badges Actif/Inactif) ── */}
        <div className="border-b border-gray-300 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Tooltip text={position.active ? "Désactiver la position" : "Activer la position"}>
              <button
                type="button"
                onClick={handleToggleActive}
                disabled={actionInProgress}
                className={`
                  relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent 
                  transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2
                  ${position.active ? 'bg-purple-600' : 'bg-gray-200'}
                  ${actionInProgress ? 'opacity-50 cursor-not-allowed' : ''}
                `}
                role="switch"
                aria-checked={position.active}
              >
                <span
                  aria-hidden="true"
                  className={`
                    pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 
                    transition duration-200 ease-in-out
                    ${position.active ? 'translate-x-5' : 'translate-x-0'}
                  `}
                />
              </button>
            </Tooltip>
            <span className={`text-sm font-medium ${position.active ? 'text-green-600' : 'text-gray-500'}`}>
              {position.active ? 'Activé' : 'Désactivé'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`h-8 px-3 text-xs font-medium border transition-all duration-200 flex items-center ${
              position.active 
                ? 'bg-green-100 text-green-700 border-green-300' 
                : 'bg-gray-100 text-gray-500 border-gray-300'
            }`}>
              Actif
            </div>
            <div className={`h-8 px-3 text-xs font-medium border transition-all duration-200 flex items-center ${
              !position.active 
                ? 'bg-red-100 text-red-700 border-red-300' 
                : 'bg-gray-100 text-gray-500 border-gray-300'
            }`}>
              Inactif
            </div>
          </div>
        </div>

        {/* ── Erreur ── */}
        {error && (
          <div className="px-4 py-2 bg-red-50 text-red-700 text-xs border-b border-red-200 flex items-center gap-1">
            <FiAlertCircle size={12} />
            <span>{error}</span>
          </div>
        )}

        {/* ── INFORMATIONS DE BASE (comme dans Create) ── */}
        <div className="px-4 py-3 border-b border-gray-300">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center" style={{ height: '26px' }}>
              <label className="text-xs text-gray-700 w-24 font-medium">Nom</label>
              <div className="flex-1 px-2 py-1 border border-gray-300 bg-gray-50 text-xs text-gray-900 ml-2 flex items-center" style={{ height: '26px' }}>
                {position.name}
              </div>
            </div>
            <div className="flex items-center" style={{ height: '26px' }}>
              <label className="text-xs text-gray-700 w-24 font-medium">Priorité</label>
              <div className="flex-1 px-2 py-1 border border-gray-300 bg-gray-50 text-xs text-gray-900 ml-2 flex items-center" style={{ height: '26px' }}>
                {position.sequence || 10}
              </div>
              <span className="text-xs text-gray-500 ml-2 whitespace-nowrap">Plus petit = plus prioritaire</span>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mt-2">
            <div className="flex items-center" style={{ height: '26px' }}>
              <label className="text-xs text-gray-700 w-24 font-medium">Pays</label>
              <div className="flex-1 px-2 py-1 border border-gray-300 bg-gray-50 text-xs text-gray-900 ml-2 flex items-center gap-1" style={{ height: '26px' }}>
                {pays ? (
                  <>
                    <FiGlobe size={12} className="text-purple-600" />
                    <span>{pays.emoji} {pays.displayName}</span>
                  </>
                ) : (
                  <span className="text-gray-500">—</span>
                )}
              </div>
            </div>
            <div className="flex items-center" style={{ height: '26px' }}>
              <label className="text-xs text-gray-700 w-24 font-medium">Société</label>
              <div className="flex-1 px-2 py-1 border border-gray-300 bg-gray-50 text-xs text-gray-900 ml-2 flex items-center gap-1" style={{ height: '26px' }}>
                {company ? (
                  <>
                    <FiBriefcase size={12} className="text-purple-600" />
                    <span>{company.displayName}</span>
                  </>
                ) : (
                  <span className="text-gray-500">—</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Onglets (comme dans Create) ── */}
        <div className="border-b border-gray-300">
          <div className="px-4 flex">
            <button 
              onClick={() => setActiveTab('configuration')}
              className={`px-4 py-2 text-xs font-medium border-b-2 transition-all duration-200 ${
                activeTab === 'configuration' 
                  ? 'border-purple-600 text-purple-600 hover:text-purple-800' 
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Configuration fiscale
            </button>
            <button 
              onClick={() => setActiveTab('notes')}
              className={`px-4 py-2 text-xs font-medium border-b-2 transition-all duration-200 ${
                activeTab === 'notes' 
                  ? 'border-purple-600 text-purple-600 hover:text-purple-800' 
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Notes
            </button>
          </div>
        </div>

        {/* ── Contenu des onglets ── */}
        <div className="p-4">
          {/* ONGLET 1: CONFIGURATION FISCALE */}
          {activeTab === 'configuration' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2 p-2 border border-gray-200">
                  <div className={`w-4 h-4 rounded ${position.auto_apply ? 'bg-purple-600' : 'bg-gray-200'}`}>
                    {position.auto_apply && <FiCheck size={16} className="text-white" />}
                  </div>
                  <span className="text-sm text-gray-700 flex items-center gap-1">
                    <FiToggleRight size={16} className={position.auto_apply ? 'text-purple-600' : 'text-gray-400'} />
                    Auto-application
                  </span>
                  <Tooltip text="Applique automatiquement cette position fiscale quand les conditions sont remplies">
                    <FiInfo size={12} className="text-gray-400 cursor-help" />
                  </Tooltip>
                  <span className={`ml-auto text-xs font-medium ${position.auto_apply ? 'text-green-600' : 'text-gray-400'}`}>
                    {position.auto_apply ? 'Oui' : 'Non'}
                  </span>
                </div>
                
                <div className="flex items-center gap-2 p-2 border border-gray-200">
                  <div className={`w-4 h-4 rounded ${position.vat_required ? 'bg-purple-600' : 'bg-gray-200'}`}>
                    {position.vat_required && <FiCheck size={16} className="text-white" />}
                  </div>
                  <span className="text-sm text-gray-700 flex items-center gap-1">
                    <FiPercent size={16} className={position.vat_required ? 'text-purple-600' : 'text-gray-400'} />
                    TVA requise
                  </span>
                  <Tooltip text="La TVA est obligatoire pour cette position fiscale">
                    <FiInfo size={12} className="text-gray-400 cursor-help" />
                  </Tooltip>
                  <span className={`ml-auto text-xs font-medium ${position.vat_required ? 'text-green-600' : 'text-gray-400'}`}>
                    {position.vat_required ? 'Oui' : 'Non'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ONGLET 2: NOTES */}
          {activeTab === 'notes' && (
            <div className="border border-gray-300 bg-gray-50 p-3 min-h-[200px]">
              {position.note ? (
                <p className="text-xs text-gray-700 whitespace-pre-wrap">{position.note}</p>
              ) : (
                <p className="text-xs text-gray-400 italic text-center">Aucune note</p>
              )}
            </div>
          )}
        </div>

        {/* ── Pied de page avec métadonnées ── */}
        <div className="border-t border-gray-300 px-4 py-2 bg-gray-50 text-xs text-gray-500 flex justify-between">
          <div className="flex items-center gap-1">
            <FiInfo size={12} />
            <span>Créé le {formatDateForDisplay(position.created_at)}</span>
            {position.created_by && (
              <span>par {position.created_by?.username || position.created_by || '—'}</span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <FiRefreshCw size={12} />
            <span>Modifié le {formatDateForDisplay(position.updated_at)}</span>
            {position.updated_by && (
              <span>par {position.updated_by?.username || position.updated_by || '—'}</span>
            )}
          </div>
        </div>
      </div>

      {/* ── Dialogue confirmation suppression ── */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-sm shadow-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-gray-900 mb-3">Confirmer la suppression</h3>
            <p className="text-sm text-gray-600 mb-6">
              Êtes-vous sûr de vouloir supprimer la position <span className="font-semibold">"{position.name}"</span> ? 
              Cette action est irréversible.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowConfirmDialog(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 text-sm hover:bg-gray-50 hover:scale-105 active:scale-95 transition-all duration-200"
              >
                Annuler
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleting}
                className="px-4 py-2 bg-red-600 text-white text-sm hover:bg-red-700 hover:scale-105 active:scale-95 transition-all duration-200 disabled:opacity-50 flex items-center gap-1"
              >
                {deleting ? (
                  <>
                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Suppression...</span>
                  </>
                ) : (
                  <>
                    <FiTrash2 size={12} />
                    <span>Supprimer</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}