import { BrowserRouter, Routes, Route } from "react-router-dom";
import LoginPage from "../pages/Login/LoginPage";
import DashboardPage from "../pages/Dashboard/DashboardPage";
import EntitiesPage from "../pages/Entities/EntitiesPage";
import UsersPage from "../pages/Users/UsersPage";
import RolesPage from "../pages/Roles/RolesPage";
import SettingsPage from "../pages/Settings/SettingsPage";
import LogsPage from "../pages/Logs/LogsPage";
import TasksPage from "../pages/Tasks/TasksPage";
import ModulesPage from "../pages/Modules/ModulesPage";
import ProfilePage from "../pages/Profile/ProfilePage";
import ProtectedLayout from "../components/Layout/ProtectedLayout";

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/entities" element={<EntitiesPage />} />
          <Route path="/users" element={<UsersPage />} />
          <Route path="/roles" element={<RolesPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/logs" element={<LogsPage />} />
          <Route path="/tasks" element={<TasksPage />} />
          <Route path="/modules" element={<ModulesPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
