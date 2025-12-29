// features/achats/layouts/AchatLayout.jsx
import { Outlet } from "react-router-dom";
import { useState } from "react";
import AchatHeader from "../components/AchatHeader";
import AchatSidebar from "../components/AchatSidebar";

export default function AchatLayout() {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <AchatSidebar 
        onMobileToggle={setIsMobileSidebarOpen}
        isMobileOpen={isMobileSidebarOpen}
      />
      
      {/* Contenu principal */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <AchatHeader />
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}