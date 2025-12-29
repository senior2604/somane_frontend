import React from 'react';
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
import SomaneAIPage from "../pages/SomaneAI/SomaneAIPage";
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
import PiecesComptablesPage from '../features/comptabilité/pages/PiecesComptablesPage';
import JournauxIndex from "../features/comptabilité/pages/Journaux/Index.jsx";
import JournauxCreate from "../features/comptabilité/pages/Journaux/Create.jsx";
import JournauxShow from "../features/comptabilité/pages/Journaux/Show.jsx";
import JournauxEdit from "../features/comptabilité/pages/Journaux/Edit.jsx";

// IMPORTS DU MODULE ACHATS
import AchatLayout from "../features/achat/layouts/AchatLayout";
import AchatDashboard from "../features/achat/pages/AchatDashboard";
import DemandesAchatPage from "../features/achat/pages/DemandesAchatPage";
import LignesDemandeAchatPage from "../features/achat/pages/LignesDemandeAchatPage";
import BonsCommandePage from "../features/achat/pages/BonsCommandePage";
import LignesBonCommandePage from "../features/achat/pages/LignesBonCommandePage";
import PrixFournisseursPage from "../features/achat/pages/PrixFournisseursPage";

// COMPOSANTS TEMPORAIRES (pour les pages non encore créées)
//const BonsCommandePage = () => (
  //<div>
    //<h2 className="text-xl font-semibold mb-4">Bons de Commande</h2>
    //<p className="text-gray-600">Page en cours de développement.</p>
  //</div>
//);

//const LignesBonCommandePage = () => (
  //<div>
    //<h2 className="text-xl font-semibold mb-4">Lignes Bon Commande</h2>
    //<p className="text-gray-600">Page en cours de développement.</p>
  //</div>
//);

//const PrixFournisseursPage = () => (
  //<div>
    //<h2 className="text-xl font-semibold mb-4">Prix Fournisseurs</h2>
    //<p className="text-gray-600">Page en cours de développement.</p>
  //</div>
//);


// TAUX FISCAUX SIMPLIFIÉ
const TauxFiscauxPage = () => <div className="p-8">Taux Fiscaux</div>;

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
          <Route path="/ExchangeRates" element={<ExchangeRatesPage/>}/>
          <Route path="/Languages" element={<LanguagesPage/>}/>
          <Route path="/States" element={<StatesPage/>}/>
          <Route path="/tasks" element={<TasksPage />} />
          <Route path="/system" element={<SystemPage />} />
        </Route>

        {/* ROUTES COMPTABILITÉ */}
        <Route path="/comptabilite" element={<ComptabiliteLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<DashboardComptabilitePage />} />
          <Route path="plan-comptable" element={<PlanComptablePage />} />
          <Route path="positions-fiscales" element={<PositionsFiscalesPage />} />
          <Route path="pieces" element={<PiecesComptablesPage />} />
          <Route path="journaux">
            <Route index element={<JournauxIndex />} />
            <Route path="create" element={<JournauxCreate />} />
            <Route path=":id" element={<JournauxShow />} />
            <Route path=":id/edit" element={<JournauxEdit />} />
          </Route>
          <Route path="taux-fiscaux" element={<TauxFiscauxPage />} />
        </Route>

        {/* ROUTES ACHATS (NOUVELLE STRUCTURE) */}
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
              <a href="/dashboard" className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700">
                Retour au tableau de bord
              </a>
            </div>
          </div>
        } />
      </Routes>
    </BrowserRouter>
  );
}