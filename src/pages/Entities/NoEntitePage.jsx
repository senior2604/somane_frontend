// src/pages/Entities/NoEntitePage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiHome, FiPlus, FiArrowLeft, FiInfo } from 'react-icons/fi';
import { apiClient } from '../../services/apiClient';
import Header from '../../components/Header';
import EntityFormModal from '../../components/EntityFormModal';

// ===== CONSTANTES =====
const DEFAULT_LANGUAGES = [
  { id: 1, nom: 'Français', code: 'fr' },
  { id: 2, nom: 'English', code: 'en' },
  { id: 3, nom: 'Español', code: 'es' },
  { id: 4, nom: 'Deutsch', code: 'de' },
  { id: 5, nom: 'Italiano', code: 'it' },
];

// ===== UTILITAIRES =====
const extractData = (response) => {
  if (Array.isArray(response)) return response;
  if (response?.results && Array.isArray(response.results)) return response.results;
  if (response?.data && Array.isArray(response.data)) return response.data;
  return [];
};

// ===== COMPOSANT PRINCIPAL =====
export default function NoEntitePage() {
  const navigate = useNavigate();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [pays, setPays] = useState([]);
  const [devises, setDevises] = useState([]);
  const [langues, setLangues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ===== CHARGEMENT DES DONNÉES NÉCESSAIRES POUR LE FORMULAIRE =====
  useEffect(() => {
    const loadFormData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const [paysRes, devisesRes, languesRes] = await Promise.all([
          apiClient.get('/pays/'),
          apiClient.get('/devises/'),
          apiClient.get('/langues/'),
        ]);

        setPays(extractData(paysRes));
        setDevises(extractData(devisesRes));

        const languesData = extractData(languesRes);
        setLangues(languesData.length > 0 ? languesData : DEFAULT_LANGUAGES);
      } catch (err) {
        console.error('Erreur chargement données formulaire:', err);
        setError('Impossible de charger les données nécessaires à la création.');
        
        // En cas d'erreur, on utilise les données par défaut
        setPays([]);
        setDevises([]);
        setLangues(DEFAULT_LANGUAGES);
      } finally {
        setLoading(false);
      }
    };

    loadFormData();
  }, []);

  // ===== DÉCONNEXION PROPRE =====
  const handleLogout = () => {
    localStorage.clear();
    navigate('/login', { replace: true });
  };

  // ===== CALLBACK APRÈS CRÉATION RÉUSSIE =====
  const handleCreateSuccess = () => {
    setShowCreateForm(false);
    // Rediriger vers la page de sélection des entités
    navigate('/select-entite');
  };

  // ===== OUVERTURE DU FORMULAIRE =====
  const handleOpenForm = () => {
    if (!loading) {
      setShowCreateForm(true);
    }
  };

  return (
    <div className="px-4 pt-0 pb-4 bg-gradient-to-br from-gray-50 to-white min-h-screen">
      <Header />
      
      {/* ===== MODAL DE CRÉATION D'ENTITÉ ===== */}
      {showCreateForm && (
        <EntityFormModal
          entity={null}
          users={[]}
          pays={pays}
          devises={devises}
          langues={langues}
          onClose={() => setShowCreateForm(false)}
          onSuccess={handleCreateSuccess}
        />
      )}
      
      <div className="max-w-4xl mx-auto mt-6">
        {/* ===== EN-TÊTE ===== */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-violet-100 to-violet-200 rounded-full mb-6">
            <FiHome className="w-12 h-12 text-violet-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-3">
            Bienvenue dans votre espace !
          </h1>
          <p className="text-gray-600 text-lg mb-2">
            Vous n'avez pas encore d'entité configurée.
          </p>
          <p className="text-gray-500 max-w-2xl mx-auto">
            Pour commencer à utiliser l'application, vous devez créer votre première entité.
            Cela prendra seulement quelques minutes.
          </p>
        </div>

        {/* ===== MESSAGE D'ERREUR ===== */}
        {error && (
          <div className="max-w-2xl mx-auto mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* ===== CARD PRINCIPALE ===== */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-8 max-w-2xl mx-auto">
          <div className="bg-gradient-to-r from-violet-600 to-violet-500 text-white p-8">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                <FiPlus className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Prêt à commencer ?</h2>
                <p className="text-violet-100">
                  {loading ? 'Chargement...' : 'Créez votre première entité en 3 étapes simples'}
                </p>
              </div>
            </div>
          </div>
          
          <div className="p-8">
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={handleLogout}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all duration-300 font-medium flex items-center justify-center gap-2"
              >
                <FiArrowLeft size={18} />
                Retour à la connexion
              </button>
              
              <button
                onClick={handleOpenForm}
                disabled={loading}
                className={`px-8 py-3 bg-gradient-to-r from-violet-600 to-violet-500 text-white rounded-xl hover:from-violet-700 hover:to-violet-600 transition-all duration-300 font-bold flex items-center justify-center gap-2 shadow-lg hover:shadow-xl ${
                  loading ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                <FiPlus size={18} />
                {loading ? 'Chargement...' : 'Créer ma première entité'}
              </button>
            </div>
          </div>
        </div>

        {/* ===== INFORMATIONS COMPLÉMENTAIRES ===== */}
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 border border-gray-200 max-w-2xl mx-auto">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-white rounded-lg shadow-sm">
              <FiInfo className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <h4 className="font-medium text-gray-900 text-sm mb-1">
                Qu'est-ce qu'une entité ?
              </h4>
              <p className="text-xs text-gray-600">
                Une entité représente une société, une organisation ou une unité opérationnelle 
                dans SOMANEERP. Elle permet de séparer les données et les configurations 
                entre différentes organisations.
              </p>
            </div>
          </div>
        </div>

        {/* ===== LIEN RAPIDE VERS LA LISTE (OPTIONNEL) ===== */}
        <div className="text-center mt-6">
          <button
            onClick={() => navigate('/entities')}
            className="text-sm text-violet-600 hover:text-violet-700 hover:underline"
          >
            Accéder à la gestion des entités →
          </button>
        </div>
      </div>
    </div>
  );
}