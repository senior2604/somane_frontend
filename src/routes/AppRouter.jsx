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

// 🆕 IMPORT DES NOUVELLES PAGES D'AUTH
import ActivationPage from "../pages/Auth/ActivationPage";
import ResetPasswordPage from "../pages/Auth/ResetPasswordPage";
import ConfirmResetPage from "../pages/Auth/ConfirmResetPage";

import ProtectedLayout from "../components/Layout/ProtectedLayout";

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {/* 🆕 ROUTES PUBLIQUES D'AUTHENTIFICATION */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/auth/activate/:uid/:token" element={<ActivationPage />} />
        <Route path="/auth/password/reset/:uid/:token" element={<ResetPasswordPage />} />
        <Route path="/auth/reset-confirm/success" element={<ConfirmResetPage />} />
        
        {/* Routes protégées */}
        <Route element={<ProtectedLayout />}>
          {/* Pages principales */}
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/entities" element={<EntitiesPage />} />
          <Route path="/partners" element={<PartnersPage />} />
          <Route path="/users" element={<UsersPage />} />
          <Route path="/userentities" element={<UserEntitiesPage />} />
          
          {/* Gestion des accès */}
          <Route path="/groupes" element={<GroupesPage />} />
          <Route path="/permissions" element={<PermissionsPage />} />
          
          {/* Configuration */}
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/journal" element={<JournalPage />} />
          <Route path="/modules" element={<ModulesPage />} />
          
          {/* Référentiels */}
          <Route path="/countries" element={<CountriesPage />} />
          <Route path="/currencies" element={<CurrenciesPage />} />
          <Route path="/banks" element={<BanksPage />} />
          <Route path="/PartnerBanks" element={<PartnerBanksPage />} />
          <Route path="/ExchangeRates" element={<ExchangeRatesPage/>}/>
          <Route path="/Languages" element={<LanguagesPage/>}/>
          
          {/* Administration système */}
          <Route path="/tasks" element={<TasksPage />} />
          <Route path="/system" element={<SystemPage />} />
        </Route>

        {/* Redirection par défaut */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        
        {/* Page 404 */}
        <Route path="*" element={<div className="p-8 text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Page non trouvée</h1>
          <p className="text-gray-600">La page que vous recherchez n'existe pas.</p>
        </div>} />
      </Routes>
    </BrowserRouter>
  );
}