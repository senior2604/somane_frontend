// features/comptabilité/layouts/ComptabiliteLayout.jsx
import { useState } from 'react';

import ComptabiliteSidebar from '../components/ComptabiliteSidebar';
import ComptabiliteHeader from '../components/ComptabiliteHeader'; 

export default function ComptabiliteLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar SPÉCIFIQUE comptabilité */}
      <ComptabiliteSidebar 
        onMobileToggle={() => setSidebarOpen(!sidebarOpen)}
        isMobileOpen={sidebarOpen}
      />
      
      {/* Contenu principal */}
      <div className="flex-1 flex flex-col md:ml-64">
        {/* Header GÉNÉRAL - VOTRE composant Header */}
        <Header />
        
        {/* Pages enfants */}
        <main className="flex-1 overflow-y-auto p-4">
          {children}
        </main>
      </div>
    </div>
  );
}