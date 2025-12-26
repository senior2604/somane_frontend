// Create.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import JournalForm from './components/JournalForm';
import { apiClient, authService } from './services';

export default function Create() {
  const navigate = useNavigate();
  
  // États pour le formulaire
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // États pour les données
  const [dataLoading, setDataLoading] = useState(true);
  const [companies, setCompanies] = useState([]);
  const [journalTypes, setJournalTypes] = useState([]);
  const [comptes, setComptes] = useState([]);
  const [banques, setBanques] = useState([]);
  
  // État pour l'authentification
  const [authStatus, setAuthStatus] = useState({
    isAuthenticated: false,
    hasCompaniesAccess: false,
    showLoginPrompt: false
  });

  // Fonction pour extraire les données
  const extractData = (response) => {
    if (!response) return [];
    if (Array.isArray(response)) return response;
    if (response.data && Array.isArray(response.data)) return response.data;
    if (response.results && Array.isArray(response.results)) return response.results;
    return [];
  };

  // Charger les données nécessaires
  useEffect(() => {
    const fetchData = async () => {
      try {
        setDataLoading(true);
        
        // Vérifier l'authentification
        const isAuthenticated = authService.isAuthenticated();
        
        // Charger les données de base
        const [typesRes, comptesRes, banquesRes] = await Promise.all([
          apiClient.get('/compta/journal-types/').catch(() => ({ data: [] })),
          apiClient.get('/compta/accounts/').catch(() => ({ data: [] })),
          apiClient.get('/compta/banques/').catch(() => ({ data: [] }))
        ]);

        setJournalTypes(extractData(typesRes));
        setComptes(extractData(comptesRes));
        setBanques(extractData(banquesRes));

        // Charger les entreprises si authentifié
        if (isAuthenticated) {
          try {
            const companiesRes = await apiClient.get('/entites/');
            const companiesData = extractData(companiesRes);
            setCompanies(companiesData);
            
            setAuthStatus({
              isAuthenticated: true,
              hasCompaniesAccess: companiesData.length > 0,
              showLoginPrompt: false
            });
          } catch (companyError) {
            console.warn('Erreur chargement entreprises:', companyError);
            setCompanies([]);
            setAuthStatus({
              isAuthenticated: true,
              hasCompaniesAccess: false,
              showLoginPrompt: false
            });
          }
        } else {
          setCompanies([]);
          setAuthStatus({
            isAuthenticated: false,
            hasCompaniesAccess: false,
            showLoginPrompt: true
          });
        }

      } catch (err) {
        console.error('Erreur chargement données formulaire:', err);
        setError('Erreur de connexion au serveur');
      } finally {
        setDataLoading(false);
      }
    };

    fetchData();
  }, []);

  // Soumettre le formulaire
  const handleSubmit = async (formData) => {
    setLoading(true);
    setError(null);
    
    try {
      // Préparer les données
      const submitData = { ...formData };
      
      // Si entreprise manuelle
      if (!submitData.company && formData.company_name) {
        submitData.company_name = formData.company_name;
      }

      // Envoyer à l'API
      const response = await apiClient.post('/compta/journals/', submitData);
      
      // Rediriger vers la liste
      navigate('/comptabilite/journaux');
      
    } catch (err) {
      console.error('Erreur création journal:', err);
      setError(err.message || 'Erreur lors de la création du journal');
      setLoading(false);
    }
  };

  // Gérer la connexion
  const handleLogin = () => {
    navigate('/login', { 
      state: { 
        redirect: '/comptabilite/journaux/create' 
      } 
    });
  };

  // Pendant le chargement des données
  if (dataLoading) {
    return (
      <div className="p-4 bg-gray-50 min-h-screen">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Chargement des données...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        {/* En-tête minimaliste - SANS bouton retour, MOINS d'espace */}
        <div className="mb-2"> {/* Réduit de mb-6 à mb-2 */}
                    
          {/* Message d'erreur global */}
          {error && (
            <div className="mt-2 mb-2 bg-red-50 border-l-3 border-red-500 p-2"> /* Plus compact */
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
                  <p className="text-red-800 text-xs">{error}</p>
                </div>
                <button
                  onClick={() => setError(null)}
                  className="ml-2 px-1.5 py-0.5 bg-red-600 text-white rounded text-xs hover:bg-red-700"
                >
                  Fermer
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Formulaire */}
        <JournalForm
          onSubmit={handleSubmit}
          loading={loading}
          error={null}
          setError={setError}
          onCancel={() => navigate('/comptabilite/journaux')} // Gardé le bouton Annuler
          onLogin={handleLogin}
          
          // Données nécessaires
          companies={companies}
          journalTypes={journalTypes}
          comptes={comptes}
          banques={banques}
          authStatus={authStatus}
        />
      </div>
    </div>
  );
}