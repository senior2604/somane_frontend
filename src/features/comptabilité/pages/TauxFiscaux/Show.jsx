import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  FiPlus, 
  FiTrash2, 
  FiCheck, 
  FiCopy, 
  FiRotateCcw, 
  FiMoreVertical, 
  FiSave, 
  FiX, 
  FiAlertCircle, 
  FiBriefcase,
  FiPercent,
  FiGlobe,
  FiCreditCard,
  FiEdit2,
  FiEye,
  FiCalendar,
  FiClock
} from 'react-icons/fi';
import { useEntity } from '../../../../context/EntityContext';
import { apiClient } from '../../../../services/apiClient';

// ==========================================
// COMPOSANT PRINCIPAL - TAUX FISCAUX (visualisation)
// ==========================================
export default function TauxFiscauxShow() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { activeEntity } = useEntity();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tax, setTax] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [pays, setPays] = useState([]);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [activeTab, setActiveTab] = useState('informations');

  const actionsMenuRef = useRef(null);

  useEffect(() => {
    if (activeEntity) {
      loadData();
    }
  }, [id, activeEntity]);

  // Fermer le menu des actions au clic extérieur
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (actionsMenuRef.current && !actionsMenuRef.current.contains(e.target)) {
        setShowActionsMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Charger le taux et les données associées
      const [taxRes, accountsRes, paysRes] = await Promise.all([
        apiClient.get(`/compta/taxes/${id}/`),
        apiClient.get('/compta/accounts/').catch(() => ({ data: [] })),
        apiClient.get('/pays/').catch(() => ({ data: [] }))
      ]);

      setTax(extractData(taxRes));
      setAccounts(extractData(accountsRes));
      setPays(extractData(paysRes));
    } catch (err) {
      console.error('❌ Erreur chargement taux:', err);
      setError('Impossible de charger les détails du taux fiscal');
    } finally {
      setLoading(false);
    }
  };

  const extractData = (response) => {
    if (!response) return [];
    if (Array.isArray(response)) return response;
    if (response.data && Array.isArray(response.data)) return response.data;
    if (response.results && Array.isArray(response.results)) return response.results;
    return response; // Pour l'objet unique
  };

  const handleDelete = async () => {
    if (!window.confirm(`Supprimer le taux "${tax.name}" ?`)) return;
    
    try {
      await apiClient.delete(`/compta/taxes/${id}/`);
      navigate('/comptabilite/taux-fiscaux');
    } catch (err) {
      alert('Erreur suppression: ' + (err.message || 'Erreur inconnue'));
    }
    setShowActionsMenu(false);
  };

  const handleDuplicate = async () => {
    try {
      const response = await apiClient.post('/compta/taxes/', {
        name: `${tax.name} (copie)`,
        amount: tax.amount,
        amount_type: tax.amount_type,
        type_tax_use: tax.type_tax_use,
        account: tax.account?.id || tax.account,
        refund_account: tax.refund_account?.id || tax.refund_account,
        country: tax.country?.id || tax.country,
        company: tax.company?.id || tax.company,
        notes: tax.notes
      });
      setShowActionsMenu(false);
      navigate(`/comptabilite/taux-fiscaux/${response.data.id}`);
    } catch (err) {
      alert('Erreur duplication: ' + (err.message || 'Erreur inconnue'));
    }
  };

  const handleExtourner = () => {
    alert("Fonctionnalité d'extourne à implémenter");
    setShowActionsMenu(false);
  };

  const handleGoToList = () => {
    navigate('/comptabilite/taux-fiscaux');
  };

  const handleNewTax = () => {
    navigate('/comptabilite/taux-fiscaux/create');
  };

  const handleEdit = () => {
    navigate(`/comptabilite/taux-fiscaux/${id}/edit`);
  };

  const getAccountDisplay = (accountId) => {
    if (!accountId) return 'Non défini';
    const account = accounts.find(a => a.id === accountId) || { code: accountId, name: '' };
    return `${account.code} - ${account.name}`;
  };

  const getCountryDisplay = (countryId) => {
    if (!countryId) return 'Non défini';
    const country = pays.find(p => p.id === countryId) || { emoji: '🌍', nom_fr: '' };
    return `${country.emoji || '🌍'} ${country.nom_fr || country.nom || ''}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isDraft = tax?.state === 'draft';

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-7xl mx-auto bg-white border border-gray-300 p-8">
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          </div>
        </div>
      </div>
    );
  }

  // Rendu : pas d'entité
  if (!activeEntity) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-7xl mx-auto bg-white border border-gray-300">
          <div className="border-b border-gray-300 px-4 py-3">
            <div className="text-lg font-bold text-gray-900">Détails du taux fiscal</div>
          </div>
          <div className="p-8">
            <div className="bg-yellow-50 border border-yellow-200 rounded p-6 text-center">
              <FiAlertCircle className="text-yellow-600 mx-auto mb-3" size={32} />
              <p className="text-yellow-800 font-medium text-lg mb-3">Aucune entité sélectionnée</p>
              <p className="text-sm text-gray-600 mb-4">
                Vous devez sélectionner une entité pour voir les détails d'un taux fiscal.
              </p>
              <p className="text-xs text-gray-500">
                Cliquez sur l'icône <FiBriefcase className="inline text-purple-600 mx-1" size={14} />
                en haut à droite pour choisir une entité.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !tax) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-7xl mx-auto bg-white border border-gray-300">
          <div className="border-b border-gray-300 px-4 py-3">
            <div className="text-lg font-bold text-gray-900">Détails du taux fiscal</div>
          </div>
          <div className="p-8">
            <div className="bg-red-50 border border-red-200 rounded p-6 text-center">
              <FiAlertCircle className="text-red-600 mx-auto mb-3" size={32} />
              <p className="text-red-800 font-medium text-lg mb-3">Erreur</p>
              <p className="text-sm text-gray-600 mb-4">
                {error || 'Le taux fiscal demandé n\'existe pas'}
              </p>
              <button
                onClick={handleGoToList}
                className="px-4 py-2 bg-purple-600 text-white text-sm hover:bg-purple-700"
              >
                Retour à la liste
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto bg-white border border-gray-300">

        {/* ── En-tête ligne 1 (exactement comme le modèle) ── */}
        <div className="border-b border-gray-300 px-4 py-3">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-start gap-3">
              <button 
                onClick={handleNewTax}
                className="px-3 py-1.5 border border-gray-300 text-gray-700 text-xs hover:bg-gray-50 flex items-center gap-1"
              >
                <FiPlus size={12} /><span>Nouveau</span>
              </button>
              <div className="flex flex-col">
                <div 
                  className="text-lg font-bold text-gray-900 cursor-pointer hover:text-purple-600"
                  onClick={handleGoToList}
                >
                  Taux fiscaux
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm text-gray-700 font-medium">État :</span>
                  <span className={`px-2 py-0.5 text-xs font-medium ${isDraft ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                    {isDraft ? 'Brouillon' : 'Comptabilisé'}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative" ref={actionsMenuRef}>
                <button 
                  onClick={() => setShowActionsMenu(!showActionsMenu)}
                  className="px-3 py-1.5 border border-gray-300 text-gray-700 text-xs hover:bg-gray-50 flex items-center gap-1"
                >
                  <FiMoreVertical size={12} /><span>Actions</span>
                </button>
                {showActionsMenu && (
                  <div className="absolute right-0 mt-1 w-48 bg-white border border-gray-300 shadow-lg rounded-sm z-50">
                    <button 
                      onClick={handleEdit}
                      className="w-full px-3 py-2 text-xs text-left hover:bg-gray-50 flex items-center gap-2 border-b border-gray-100"
                    >
                      <FiEdit2 size={12} /><span>Modifier</span>
                    </button>
                    <button 
                      onClick={handleDuplicate}
                      className="w-full px-3 py-2 text-xs text-left hover:bg-gray-50 flex items-center gap-2 border-b border-gray-100"
                    >
                      <FiCopy size={12} /><span>Dupliquer</span>
                    </button>
                    <button 
                      onClick={handleDelete}
                      className="w-full px-3 py-2 text-xs text-left hover:bg-gray-50 flex items-center gap-2 border-b border-gray-100"
                    >
                      <FiTrash2 size={12} /><span>Supprimer</span>
                    </button>
                    <button 
                      onClick={handleExtourner}
                      className="w-full px-3 py-2 text-xs text-left hover:bg-gray-50 flex items-center gap-2"
                    >
                      <FiRotateCcw size={12} /><span>Extourné</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── En-tête ligne 2 (exactement comme le modèle) ── */}
        <div className="border-b border-gray-300 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`px-3 py-1.5 text-xs font-medium border ${isDraft ? 'bg-purple-100 text-purple-700 border-purple-300' : 'bg-gray-100 text-gray-500 border-gray-300'}`}>
              Brouillon
            </div>
            <div className={`px-3 py-1.5 text-xs font-medium border ${!isDraft ? 'bg-purple-100 text-purple-700 border-purple-300' : 'bg-gray-100 text-gray-500 border-gray-300'}`}>
              Comptabilisé
            </div>
          </div>
          <div className="text-xs text-gray-500">
            #{tax.id} • {tax.name}
          </div>
        </div>

        {/* ── Onglets (exactement comme le modèle) ── */}
        <div className="border-b border-gray-300">
          <div className="px-4 flex">
            {['informations', 'comptable', 'localisation', 'notes'].map(tab => (
              <button 
                key={tab} 
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors ${
                  activeTab === tab ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab === 'informations' ? 'Informations' : 
                 tab === 'comptable' ? 'Configuration comptable' : 
                 tab === 'localisation' ? 'Localisation' : 'Notes'}
              </button>
            ))}
          </div>
        </div>

        {/* ── Contenu de la vue ── */}
        <div className="p-4">
          {activeTab === 'informations' && (
            <div className="space-y-4">
              {/* Carte d'en-tête avec icône */}
              <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-gray-50 to-white border border-gray-300">
                <div className="w-16 h-16 bg-purple-100 rounded flex items-center justify-center">
                  <FiPercent className="w-8 h-8 text-purple-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{tax.name}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`px-2 py-0.5 text-xs font-medium ${
                      tax.type_tax_use === 'sale' 
                        ? 'bg-green-100 text-green-700'
                        : tax.type_tax_use === 'purchase'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {tax.type_tax_use === 'sale' ? 'Vente' : tax.type_tax_use === 'purchase' ? 'Achat' : 'Divers'}
                    </span>
                    <span className={`px-2 py-0.5 text-xs font-medium ${
                      tax.amount_type === 'percent'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-green-100 text-green-700'
                    }`}>
                      {tax.amount_type === 'percent' ? `${tax.amount}%` : `${tax.amount} FCFA`}
                    </span>
                  </div>
                </div>
              </div>

              {/* Grille d'informations */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Entreprise */}
                <div className="border border-gray-300">
                  <div className="bg-gray-100 px-3 py-1.5 border-b border-gray-300">
                    <h3 className="text-xs font-semibold text-gray-700">Entreprise</h3>
                  </div>
                  <div className="p-3">
                    <div className="flex items-center gap-2">
                      <FiBriefcase className="text-gray-400" size={16} />
                      <span className="text-sm text-gray-900">
                        {tax.company?.raison_sociale || tax.company?.nom || tax.company?.name || 'Non spécifiée'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Valeur */}
                <div className="border border-gray-300">
                  <div className="bg-gray-100 px-3 py-1.5 border-b border-gray-300">
                    <h3 className="text-xs font-semibold text-gray-700">Valeur</h3>
                  </div>
                  <div className="p-3">
                    <div className="flex items-center gap-2">
                      <FiPercent className="text-gray-400" size={16} />
                      <span className="text-sm text-gray-900 font-bold">
                        {tax.amount_type === 'percent' ? `${tax.amount}%` : `${tax.amount} FCFA`}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'comptable' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Compte de taxe */}
                <div className="border border-gray-300">
                  <div className="bg-gray-100 px-3 py-1.5 border-b border-gray-300">
                    <h3 className="text-xs font-semibold text-gray-700">Compte de taxe</h3>
                  </div>
                  <div className="p-3">
                    <div className="flex items-center gap-2">
                      <FiCreditCard className="text-gray-400" size={16} />
                      <span className="text-sm text-gray-900">
                        {tax.account ? getAccountDisplay(tax.account.id || tax.account) : 'Non défini'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Compte de remboursement */}
                <div className="border border-gray-300">
                  <div className="bg-gray-100 px-3 py-1.5 border-b border-gray-300">
                    <h3 className="text-xs font-semibold text-gray-700">Compte de remboursement</h3>
                  </div>
                  <div className="p-3">
                    <div className="flex items-center gap-2">
                      <FiCreditCard className="text-gray-400" size={16} />
                      <span className="text-sm text-gray-900">
                        {tax.refund_account ? getAccountDisplay(tax.refund_account.id || tax.refund_account) : 'Non défini'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'localisation' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Pays */}
                <div className="border border-gray-300">
                  <div className="bg-gray-100 px-3 py-1.5 border-b border-gray-300">
                    <h3 className="text-xs font-semibold text-gray-700">Pays</h3>
                  </div>
                  <div className="p-3">
                    <div className="flex items-center gap-2">
                      <FiGlobe className="text-gray-400" size={16} />
                      <span className="text-sm text-gray-900">
                        {tax.country ? getCountryDisplay(tax.country.id || tax.country) : 'Non spécifié'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'notes' && (
            <div className="border border-gray-300">
              <div className="bg-gray-100 px-3 py-1.5 border-b border-gray-300">
                <h3 className="text-xs font-semibold text-gray-700">Notes</h3>
              </div>
              <div className="p-4">
                <p className="text-sm text-gray-700 whitespace-pre-wrap">
                  {tax.notes || 'Aucune note'}
                </p>
              </div>
            </div>
          )}

          {/* Métadonnées (toujours affichées en bas) */}
          <div className="mt-6 border border-gray-300">
            <div className="bg-gray-100 px-3 py-1.5 border-b border-gray-300">
              <h3 className="text-xs font-semibold text-gray-700">Métadonnées</h3>
            </div>
            <div className="p-3 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-2">
                <FiCalendar className="text-gray-400" size={14} />
                <div>
                  <p className="text-xs text-gray-500">Créé le</p>
                  <p className="text-sm text-gray-900">
                    {tax.create_date ? formatDate(tax.create_date) : '-'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <FiClock className="text-gray-400" size={14} />
                <div>
                  <p className="text-xs text-gray-500">Modifié le</p>
                  <p className="text-sm text-gray-900">
                    {tax.write_date ? formatDate(tax.write_date) : '-'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <FiEye className="text-gray-400" size={14} />
                <div>
                  <p className="text-xs text-gray-500">Statut</p>
                  <p className={`text-sm ${tax.active === false ? 'text-red-600' : 'text-green-600'}`}>
                    {tax.active === false ? 'Inactif' : 'Actif'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}