import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "../pages/Login/LoginPage";
import DashboardPage from "../pages/Dashboard/DashboardPage";
import UsersPage from "../pages/Users/UsersPage";
import EntitiesPage from "../pages/Entities/EntitiesPage";
import PartnersPage from "../pages/Partners/PartnersPage";
import GroupesPage from "../pages/Groupes/GroupesPage";
import PermissionsPage from "../pages/Permissions/PermissionsPage";
import SettingsPage from "../pages/Settings/SettingsPage";
import JournalPage from "../pages/Journal/JournalPage";
import ModulesPage from "../pages/Modules/ModulesPage";
import CountriesPage from "../pages/Countries/CountriesPage";
import CurrenciesPage from "../pages/Currencies/CurrenciesPage";
import BanksPage from "../pages/Banks/BanksPage";
import TasksPage from "../pages/Tasks/TasksPage";
import SystemPage from "../pages/System/SystemPage";
import PartnerBanksPage from "../pages/PartnerBanks/PartnerBanksPage";
import ExchangeRatesPage from "../pages/ExchangeRates/ExchangeRatesPages";
import LanguagesPage from "../pages/Languages/LanguagesPage";
import UserEntitiesPage from "../pages/UserEntities/UserEntitiesPage";
import StatesPage from "../pages/States/StatesPage";
import ActivationPage from "../pages/Auth/ActivationPage";
import ResetPasswordPage from "../pages/Auth/ResetPasswordPage";
import ConfirmResetPage from "../pages/Auth/ConfirmResetPage";
import ProtectedLayout from "../components/Layout/ProtectedLayout";

// IMPORTS DU MODULE COMPTABILITÉ
import ComptabiliteLayout from "../features/comptabilité/layouts/ComptabiliteLayout";
import DashboardComptabilitePage from "../features/comptabilité/pages/DashboardPage";
import PlanComptablePage from "../features/comptabilité/pages/PlanComptablePage";
import PositionsFiscalesPage from "../features/comptabilité/pages/PositionsFiscalesPage";

// IMPORTS DES PAGES JOURNAUX
import JournauxIndex from "../features/comptabilité/pages/Journaux/Index.jsx";
import JournauxCreate from "../features/comptabilité/pages/Journaux/Create.jsx";
import JournauxShow from "../features/comptabilité/pages/Journaux/Show.jsx";
import JournauxEdit from "../features/comptabilité/pages/Journaux/Edit.jsx";

// IMPORTS DES PAGES PIÈCES COMPTABLES
import PiecesComptablesList from "../features/comptabilité/pages/PiecesComptables/List.jsx";
import PiecesComptablesCreate from "../features/comptabilité/pages/PiecesComptables/Create.jsx";
import PiecesComptablesShow from "../features/comptabilité/pages/PiecesComptables/Show.jsx";
import PiecesComptablesEdit from "../features/comptabilité/pages/PiecesComptables/Edit.jsx";

// IMPORTS DU MODULE ACHATS
import AchatLayout from "../features/achat/layouts/AchatLayout";
import AchatDashboard from "../features/achat/pages/AchatDashboard";
import DemandesAchatPage from "../features/achat/pages/DemandesAchatPage";
import LignesDemandeAchatPage from "../features/achat/pages/LignesDemandeAchatPage";
import BonsCommandePage from "../features/achat/pages/BonsCommandePage";
import LignesBonCommandePage from "../features/achat/pages/LignesBonCommandePage";
import PrixFournisseursPage from "../features/achat/pages/PrixFournisseursPage";

// COMPOSANT DE CHARGEMENT POUR SUSPENSE
const LoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600 mx-auto mb-4"></div>
      <p className="text-gray-600">Chargement...</p>
    </div>
  </div>
);

// SOLUTION POUR TAUX FISCAUX : Import dynamique avec gestion d'erreur
const TauxFiscauxPage = React.lazy(() => 
  import("../features/comptabilité/pages/TauxFiscauxPage")
    .then(module => {
      console.log("✅ TauxFiscauxPage chargé avec succès");
      
      // Vérifier que le module a un export par défaut
      if (module && module.default && typeof module.default === 'function') {
        return { default: module.default };
      }
      
      // Si pas d'export par défaut, chercher un export nommé
      const exportNames = Object.keys(module).filter(key => typeof module[key] === 'function');
      if (exportNames.length > 0) {
        console.log(`✅ Utilisation de l'export: ${exportNames[0]}`);
        return { default: module[exportNames[0]] };
      }
      
      throw new Error("Aucun composant trouvé dans TauxFiscauxPage");
    })
    .catch(error => {
      console.error("❌ Erreur chargement TauxFiscauxPage:", error);
      
      // Retourner un composant de secours
      return { 
        default: () => (
          <div className="p-8 bg-gradient-to-br from-gray-50 to-white min-h-screen">
            <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg p-8">
              <div className="text-center">
                <div className="w-20 h-20 bg-gradient-to-r from-red-100 to-red-200 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.282 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-3">Erreur de chargement</h2>
                <p className="text-gray-600 mb-4">
                  Impossible de charger la page "Taux Fiscaux".
                </p>
                <div className="bg-gray-50 rounded-lg p-4 text-left mb-6">
                  <p className="text-sm font-medium text-gray-800 mb-1">Détails :</p>
                  <p className="text-sm text-gray-600">{error.message}</p>
                  <p className="text-sm text-gray-600 mt-2">
                    Fichier: <code className="bg-gray-100 px-2 py-1 rounded">TauxFiscauxPage.jsx</code>
                  </p>
                </div>
                <div className="flex gap-3 justify-center">
                  <button 
                    onClick={() => window.location.reload()}
                    className="px-5 py-2.5 bg-gradient-to-r from-violet-600 to-violet-500 text-white rounded-lg hover:from-violet-700 hover:to-violet-600 transition-all duration-200 font-medium shadow hover:shadow-md"
                  >
                    Recharger la page
                  </button>
                  <a 
                    href="/comptabilite/dashboard"
                    className="px-5 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-all duration-200 font-medium"
                  >
                    Retour au tableau de bord
                  </a>
                </div>
              </div>
            </div>
          </div>
        )
      };
    })
);

// Créer un composant de secours pour SomaneAIPage
const SomaneAIPage = () => (
  <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="bg-white rounded-xl shadow-lg p-8">
        <div className="text-center">
          <div className="w-24 h-24 bg-gradient-to-r from-purple-100 to-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-12 h-12 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-3">Somane AI</h1>
          <p className="text-gray-600 mb-6">
            Intelligence Artificielle pour la gestion d'entreprise
          </p>
          <div className="bg-gray-50 rounded-lg p-6 mb-8">
            <p className="text-gray-700">
              Cette fonctionnalité est actuellement en cours de développement.
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
);

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ROUTES PUBLIQUES */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/auth/activate/:uid/:token" element={<ActivationPage />} />
        <Route path="/auth/password/reset/:uid/:token" element={<ResetPasswordPage />} />
        <Route path="/auth/reset-confirm/success" element={<ConfirmResetPage />} />
        
        {/* ROUTES PROTÉGÉES PRINCIPALES */}
        <Route element={<ProtectedLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/entities" element={<EntitiesPage />} />
          <Route path="/partners" element={<PartnersPage />} />
          <Route path="/users" element={<UsersPage />} />
          <Route path="/userentities" element={<UserEntitiesPage />} />
          <Route path="/groupes" element={<GroupesPage />} />
          <Route path="/permissions" element={<PermissionsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/journal" element={<JournalPage />} />
          <Route path="/modules" element={<ModulesPage />} />
          <Route path="/countries" element={<CountriesPage />} />
          <Route path="/currencies" element={<CurrenciesPage />} />
          <Route path="/banks" element={<BanksPage />} />
          <Route path="/PartnerBanks" element={<PartnerBanksPage />} />
          <Route path="/somane-ai" element={<SomaneAIPage />} />
          <Route path="/ExchangeRates" element={<ExchangeRatesPage />} />
          <Route path="/Languages" element={<LanguagesPage />} />
          <Route path="/States" element={<StatesPage />} />
          <Route path="/tasks" element={<TasksPage />} />
          <Route path="/system" element={<SystemPage />} />
        </Route>

        {/* ROUTES COMPTABILITÉ */}
        <Route 
          path="/comptabilite" 
          element={
            <Suspense fallback={<LoadingFallback />}>
              <ComptabiliteLayout />
            </Suspense>
          }
        >
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<DashboardComptabilitePage />} />
          <Route path="plan-comptable" element={<PlanComptablePage />} />
          <Route path="positions-fiscales" element={<PositionsFiscalesPage />} />
          
          {/* ROUTES PIÈCES COMPTABLES */}
          <Route path="pieces">
            <Route index element={<PiecesComptablesList />} />
            <Route path="create" element={<PiecesComptablesCreate />} />
            <Route path=":id" element={<PiecesComptablesShow />} />
            <Route path=":id/edit" element={<PiecesComptablesEdit />} />
          </Route>
          
          {/* ROUTES JOURNAUX */}
          <Route path="journaux">
            <Route index element={<JournauxIndex />} />
            <Route path="create" element={<JournauxCreate />} />
            <Route path=":id" element={<JournauxShow />} />
            <Route path=":id/edit" element={<JournauxEdit />} />
          </Route>
          
          {/* ROUTE TAUX FISCAUX */}
          <Route 
            path="taux-fiscaux" 
            element={
              <Suspense fallback={<LoadingFallback />}>
                <TauxFiscauxPage />
              </Suspense>
            } 
          />
        </Route>

        {/* ROUTES ACHATS */}
        <Route path="/achats" element={<AchatLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<AchatDashboard />} />
          <Route path="bons-commande" element={<BonsCommandePage />} />
          <Route path="lignes-bon-commande" element={<LignesBonCommandePage />} />
          <Route path="demandes-achat" element={<DemandesAchatPage />} />
          <Route path="lignes-demande-achat" element={<LignesDemandeAchatPage />} />
          <Route path="prix-fournisseurs" element={<PrixFournisseursPage />} />
        </Route>

        {/* REDIRECTIONS */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        
        {/* 404 */}
        <Route path="*" element={
          <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-800 mb-4">404 - Page non trouvée</h1>
              <p className="text-gray-600 mb-6">La page que vous recherchez n'existe pas.</p>
              <a href="/dashboard" className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors">
                Retour au tableau de bord
              </a>
            </div>
          </div>
        } />
      </Routes>
    </BrowserRouter>
  );
}