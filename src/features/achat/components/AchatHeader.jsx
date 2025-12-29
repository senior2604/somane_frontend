// features/achats/components/AchatHeader.jsx
import { useNavigate, useLocation } from "react-router-dom";
import { useState } from "react";
import { FiChevronDown, FiLogOut, FiUser, FiBell, FiArrowLeft } from "react-icons/fi";
import { FiXCircle } from "react-icons/fi"; // <-- IMPORT MANQUANT

export default function AchatHeader() {
  const navigate = useNavigate();
  const location = useLocation();
  const [showModuleDropdown, setShowModuleDropdown] = useState(false);
  const [hoveredCategory, setHoveredCategory] = useState(null);

  // Modules ERP SIMPLIFIÉS
  const modules = [
    { id: 'dashboard', name: 'Noyau', path: '/dashboard' },
    { id: 'sales', name: 'Ventes', path: '/sales' },
    { id: 'achats', name: 'Achats', path: '/achats/dashboard' },
    { id: 'accounting', name: 'Comptabilité', path: '/comptabilite/dashboard' },
    { id: 'inventory', name: 'Stock', path: '/inventory' },
    { id: 'hr', name: 'RH', path: '/hr' }
  ];

  // Titres des pages ACHAT
  const pageTitles = {
    '/achats/dashboard': 'Tableau de Bord',
    '/achats/bons-commande': 'Bons de Commande',
    '/achats/lignes-bon-commande': 'Lignes Bon Commande',
    '/achats/demandes-achat': 'Demandes d\'Achat',
    '/achats/lignes-demande-achat': 'Lignes Demande Achat',
    '/achats/prix-fournisseurs': 'Prix Fournisseurs'
  };

  // Navigation ACHAT - SANS PARAMÈTRES
  const navigationItems = [
    {
      name: "Tableau de Bord",
      path: "/achats/dashboard",
      isDirectLink: true
    },
    {
      name: "Commandes",
      items: [
        { label: "Bons de Commande", path: "/achats/bons-commande" },
        { label: "Lignes Bon Commande", path: "/achats/lignes-bon-commande" }
      ]
    },
    {
      name: "Demandes",
      items: [
        { label: "Demandes d'Achat", path: "/achats/demandes-achat" },
        { label: "Lignes Demande Achat", path: "/achats/lignes-demande-achat" }
      ]
    },
    {
      name: "Références",
      items: [
        { label: "Prix Fournisseurs", path: "/achats/prix-fournisseurs" }
      ]
    }
  ];

  // Titre actuel
  const currentTitle = pageTitles[location.pathname] || "Achats";

  const isActive = (path) => location.pathname === path;

  // Vérifier si on peut retourner en arrière (pas sur le dashboard)
  const canGoBack = location.pathname !== '/achats/dashboard';

  const handleGoBack = () => {
    navigate(-1);
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-200">
      <div className="px-6 py-3">
        {/* Ligne unique */}
        <div className="flex items-center justify-between">
          {/* PARTIE GAUCHE : Module dropdown + Titre */}
          <div className="flex items-center gap-4">
            {/* Dropdown Module */}
            <div className="relative">
              <button
                onClick={() => setShowModuleDropdown(!showModuleDropdown)}
                className="flex items-center gap-2 px-4 py-2 bg-violet-50 hover:bg-violet-100 text-violet-700 rounded-lg font-medium transition-colors border border-violet-200"
              >
                <span>Achats</span>
                <FiChevronDown className={`w-3 h-3 transition-transform ${showModuleDropdown ? 'rotate-180' : ''}`} />
              </button>

              {/* DROPDOWN MODULES */}
              {showModuleDropdown && (
                <>
                  <div 
                    className="fixed inset-0 z-30"
                    onClick={() => setShowModuleDropdown(false)}
                  />
                  <div className="absolute top-full left-0 mt-1 w-44 bg-white rounded-lg shadow-lg border border-gray-200 z-40">
                    <div className="px-4 py-2 border-b border-gray-100">
                      <p className="text-xs text-gray-500 font-medium">Modules ERP</p>
                    </div>
                    
                    <div className="py-1">
                      {modules.map((module) => (
                        <button
                          key={module.id}
                          onClick={() => {
                            navigate(module.path);
                            setShowModuleDropdown(false);
                          }}
                          className={`w-full text-left px-4 py-2 text-sm transition-colors hover:bg-gray-50 ${
                            module.id === 'achats'
                              ? 'text-violet-600 font-medium'
                              : 'text-gray-700'
                          }`}
                        >
                          {module.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Séparateur */}
            <div className="h-6 w-px bg-gray-300"></div>

            {/* Bouton Retour */}
            {canGoBack && (
              <button
                onClick={handleGoBack}
                className="p-1.5 text-gray-600 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-colors"
                title="Retour"
              >
                <FiArrowLeft size={18} />
              </button>
            )}

            {/* Titre de la page */}
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-violet-500"></div>
              <h1 className="text-base font-medium text-gray-800">
                {currentTitle}
              </h1>
            </div>
          </div>

          {/* PARTIE CENTRE : Navigation */}
          <nav className="flex items-center gap-6">
            {navigationItems.map((item) => {
              // Tableau de Bord - Lien direct
              if (item.isDirectLink) {
                return (
                  <button
                    key={item.name}
                    onClick={() => navigate(item.path)}
                    className={`px-4 py-2 text-sm font-medium transition-colors rounded-lg ${
                      isActive(item.path)
                        ? 'bg-violet-100 text-violet-700'
                        : 'text-gray-700 hover:text-violet-600 hover:bg-gray-100'
                    }`}
                  >
                    {item.name}
                  </button>
                );
              }

              // Catégories avec dropdown
              const hasActiveItem = item.items.some(sub => isActive(sub.path));
              
              return (
                <div
                  key={item.name}
                  className="relative"
                  onMouseEnter={() => setHoveredCategory(item.name)}
                  onMouseLeave={() => setHoveredCategory(null)}
                >
                  <div className="py-2 px-1 -mx-1">
                    <button 
                      className={`flex items-center gap-1 text-sm font-medium transition-colors ${
                        hasActiveItem
                          ? 'text-violet-700'
                          : 'text-gray-700 hover:text-violet-600'
                      }`}
                    >
                      {item.name}
                      <FiChevronDown className={`w-3 h-3 transition-transform ${
                        hoveredCategory === item.name ? 'rotate-180' : ''
                      }`} />
                    </button>
                  </div>

                  {hoveredCategory === item.name && (
                    <div 
                      className="absolute top-full left-0 mt-0 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50"
                      onMouseEnter={() => setHoveredCategory(item.name)}
                      onMouseLeave={() => setHoveredCategory(null)}
                    >
                      {item.items.map((subItem) => (
                        <button
                          key={subItem.path}
                          onClick={() => navigate(subItem.path)}
                          className={`w-full px-4 py-2.5 text-sm text-left transition-colors flex items-center ${
                            isActive(subItem.path)
                              ? 'bg-violet-50 text-violet-700 font-medium'
                              : 'text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          <div className={`w-1 h-4 mr-3 ${
                            isActive(subItem.path) ? 'bg-violet-600' : 'bg-gray-300'
                          }`} />
                          {subItem.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          {/* PARTIE DROITE : Actions */}
          <div className="flex items-center gap-3">
            <button className="p-2 text-gray-600 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-colors relative">
              <FiBell size={18} />
              <div className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full"></div>
            </button>
            
            <button className="p-2 text-gray-600 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-colors">
              <FiUser size={20} />
            </button>
            
            <button
              onClick={() => {
                localStorage.removeItem("authToken");
                localStorage.removeItem("user");
                navigate("/login");
              }}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-colors border border-gray-300 hover:border-violet-300"
            >
              Déconnexion
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}