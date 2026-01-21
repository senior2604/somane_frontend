import { useNavigate, useLocation } from "react-router-dom";
import { useState } from "react";
import { FiChevronDown, FiBell, FiArrowLeft } from "react-icons/fi";
// Supprimez FiLogOut et FiXCircle car ils ne sont pas utilisés

export default function VenteHeader() {
  const navigate = useNavigate();
  const location = useLocation();
  const [showModuleDropdown, setShowModuleDropdown] = useState(false);
  const [hoveredCategory, setHoveredCategory] = useState(null);

  // Modules ERP
  const modules = [
    { id: 'dashboard', name: 'Noyau', path: '/dashboard' },
    { id: 'sales', name: 'Ventes', path: '/sales/dashboard' },
    { id: 'achats', name: 'Achats', path: '/achats/dashboard' },
    { id: 'accounting', name: 'Comptabilité', path: '/comptabilite/dashboard' },
    { id: 'inventory', name: 'Stock', path: '/inventory' },
    { id: 'hr', name: 'RH', path: '/hr' }
  ];

  // Titres des pages VENTE
  const pageTitles = {
    '/vente/dashboard': 'Tableau de Bord Ventes',
    '/vente/commandes-client': 'Commandes Client',
    '/vente/lignes-commande-client': 'Lignes Commande Client',
    '/vente/reporting-ventes': 'Reporting des Ventes',
    '/vente/equipes-commerciales': 'Équipes Commerciales'
  };

  // Navigation VENTE
  const navigationItems = [
    {
      name: "Tableau de Bord",
      path: "/vente/dashboard",
      isDirectLink: true
    },
    {
      name: "Commandes",
      items: [
        { label: "Commandes Client", path: "/vente/commandes-client" },
        { label: "Lignes Commande", path: "/vente/lignes-commande-client" }
      ]
    },
    {
      name: "Analyse",
      items: [
        { label: "Reporting Ventes", path: "/vente/reporting-ventes" }
      ]
    },
    {
      name: "Équipes",
      items: [
        { label: "Équipes Commerciales", path: "/vente/equipes-commerciales" }
      ]
    }
  ];

  // Titre actuel
  const currentTitle = pageTitles[location.pathname] || "Ventes";

  const isActive = (path) => location.pathname === path;

  // Vérifier si on peut retourner en arrière
  const canGoBack = location.pathname !== '/vente/dashboard';

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
                className="flex items-center gap-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg font-medium transition-colors border border-blue-200"
              >
                <span>Ventes</span>
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
                            module.id === 'sales'
                              ? 'text-blue-600 font-medium'
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
                className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                title="Retour"
              >
                <FiArrowLeft size={18} />
              </button>
            )}

            {/* Titre de la page */}
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
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
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-700 hover:text-blue-600 hover:bg-gray-100'
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
                          ? 'text-blue-700'
                          : 'text-gray-700 hover:text-blue-600'
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
                              ? 'bg-blue-50 text-blue-700 font-medium'
                              : 'text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          <div className={`w-1 h-4 mr-3 ${
                            isActive(subItem.path) ? 'bg-blue-600' : 'bg-gray-300'
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
            <button className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors relative">
              <FiBell size={18} />
              <div className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full"></div>
            </button>
            
            <button className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
              {/* Ajoutez une icône utilisateur si nécessaire */}
              <span className="text-sm font-medium">Profil</span>
            </button>
            
            <button
              onClick={() => {
                localStorage.removeItem("authToken");
                localStorage.removeItem("user");
                navigate("/login");
              }}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-gray-300 hover:border-blue-300"
            >
              Déconnexion
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}