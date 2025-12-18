// features/comptabilite/layouts/ComptabiliteLayout.jsx
import { Outlet } from "react-router-dom";
import ComptabiliteSidebar from "../components/ComptabiliteSidebar";
import Header from "../../../components/Header";

export default function ComptabiliteLayout() {
  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <ComptabiliteSidebar />
      
      {/* Contenu principal */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="h-16 flex-shrink-0">
          <Header />
        </div>
        
        {/* Page content via Outlet */}
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}