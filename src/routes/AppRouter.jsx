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
import AchatPage from "../features/achat/AchatPage";
import ActivationPage from "../pages/Auth/ActivationPage";
import ResetPasswordPage from "../pages/Auth/ResetPasswordPage";
import ConfirmResetPage from "../pages/Auth/ConfirmResetPage";
import ProtectedLayout from "../components/Layout/ProtectedLayout";

// CORRIGEZ LES IMPORTS - TOUS AVEC LE MÊME NOM
// OPTION 1 : Si votre dossier s'appelle "comptabilité" (avec accent)
import ComptabiliteLayout from "../features/comptabilité/layouts/ComptabiliteLayout";
import StandardsPage from "../features/comptabilité/pages/DashboardPage";

// OPTION 2 : Si vous renommez en "comptabilite" (sans accent)
// import ComptabiliteLayout from "../features/comptabilite/layouts/ComptabiliteLayout";
// import StandardsPage from "../features/comptabilite/pages/StandardsPage";

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
          <Route path="/ExchangeRates" element={<ExchangeRatesPage/>}/>
          <Route path="/Languages" element={<LanguagesPage/>}/>
          <Route path="/States" element={<StatesPage/>}/>
          <Route path="/achats" element={<AchatPage />} />
          <Route path="/tasks" element={<TasksPage />} />
          <Route path="/system" element={<SystemPage />} />
        </Route>

        {/* ROUTES COMPTABILITÉ AVEC SON PROPRE LAYOUT */}
        <Route path="/comptabilite" element={<ComptabiliteLayout />}>
          <Route index element={<Navigate to="Dashboard" replace />} />
          <Route path="Dashboard" element={<StandardsPage />} />
          {/* Ajoutez d'autres routes comptabilité ici plus tard */}
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