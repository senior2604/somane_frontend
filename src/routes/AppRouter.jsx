import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "../pages/Login/LoginPage";
import DashboardPage from "../pages/Dashboard/DashboardPage";
import UsersPage from "../pages/Users/UsersPage";
import EntitiesPage from "../pages/Entities/EntitiesPage";
import PartnersPage from "../pages/Partners/PartnersPage";
import GroupsPage from "../pages/Groups/GroupsPage";
import PermissionsPage from "../pages/Permissions/PermissionsPage";
import SettingsPage from "../pages/Settings/SettingsPage";
import JournalPage from "../pages/Journal/JournalPage";
import ModulesPage from "../pages/Modules/ModulesPage";
import CountriesPage from "../pages/Countries/CountriesPage";
import CurrenciesPage from "../pages/Currencies/CurrenciesPage";
import BanksPage from "../pages/Banks/BanksPage";
import TasksPage from "../pages/Tasks/TasksPage";
import SystemPage from "../pages/System/SystemPage";
import ProtectedLayout from "../components/Layout/ProtectedLayout";

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Route publique */}
        <Route path="/login" element={<LoginPage />} />
        
        {/* Routes protégées */}
        <Route element={<ProtectedLayout />}>
          {/* Pages principales */}
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/entities" element={<EntitiesPage />} />
          <Route path="/partners" element={<PartnersPage />} />
          <Route path="/users" element={<UsersPage />} />
          
          {/* Gestion des accès */}
          <Route path="/groups" element={<GroupsPage />} />
          <Route path="/permissions" element={<PermissionsPage />} />
          
          {/* Configuration */}
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/journal" element={<JournalPage />} />
          <Route path="/modules" element={<ModulesPage />} />
          
          {/* Référentiels */}
          <Route path="/countries" element={<CountriesPage />} />
          <Route path="/currencies" element={<CurrenciesPage />} />
          <Route path="/banks" element={<BanksPage />} />
          
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