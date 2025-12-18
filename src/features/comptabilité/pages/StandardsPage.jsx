// features/comptabilité/layouts/ComptabiliteLayout.jsx
import { useState } from 'react';
import { FiMenu } from 'react-icons/fi';
import ComptabiliteSidebar from '../components/ComptabiliteSidebar';

// Header simple et efficace
function ComptabiliteHeader({ onMenuClick }) {
  return (
    <header className="sticky top-0 z-30 bg-white border-b border-gray-200 px-6 py-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* Bouton menu pour mobile */}
          <button
            onClick={onMenuClick}
            className="md:hidden p-2 hover:bg-violet-50 rounded-lg transition-colors"
            aria-label="Ouvrir/fermer le menu"
          >
            <FiMenu className="w-5 h-5 text-violet-600" />
          </button>
          
          {/* Titre */}
          <div>
            <h1 className="text-lg font-semibold text-violet-700">Comptabilité</h1>
            <p className="text-sm text-gray-500">Module de gestion comptable</p>
          </div>
        </div>
        
        {/* Options droite (optionnel) */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center">
            <span className="text-violet-700 font-medium text-sm">U</span>
          </div>
        </div>
      </div>
    </header>
  );
}

export default function ComptabiliteLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <ComptabiliteSidebar 
        onMobileToggle={() => setSidebarOpen(!sidebarOpen)}
        isMobileOpen={sidebarOpen}
      />
      
      {/* Contenu principal */}
      <div className="flex-1 flex flex-col md:ml-64">
        {/* Header */}
        <ComptabiliteHeader 
          onMenuClick={() => setSidebarOpen(!sidebarOpen)}
        />
        
        {/* Contenu des pages */}
        <main className="flex-1 overflow-y-auto p-4">
          {children}
        </main>
      </div>
    </div>
  );
}