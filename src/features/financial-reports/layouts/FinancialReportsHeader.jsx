// C:\python\django\somane_frontend\src\features\financial-reports\layouts\FinancialReportsHeader.jsx
import { useState } from "react";
import { FiArrowLeft, FiBell, FiChevronDown, FiUser } from "react-icons/fi";
import { Outlet, useLocation, useNavigate } from "react-router-dom"; // ← AJOUTE Outlet ici

export default function FinancialReportsHeader() {
  const navigate = useNavigate();
  const location = useLocation();
  const [showModuleDropdown, setShowModuleDropdown] = useState(false);
  const [hoveredCategory, setHoveredCategory] = useState(null);

  const modules = [
    { id: 'dashboard', name: 'Noyau', path: '/dashboard' },
    { id: 'sales', name: 'Ventes', path: '/sales' },
    { id: 'achats', name: 'Achats', path: '/achats' },
    { id: 'accounting', name: 'Comptabilité', path: '/comptabilite/dashboard' },
    { id: 'financial-reports', name: 'États Financiers', path: '/financial-reports' },
    { id: 'inventory', name: 'Stock', path: '/inventory' },
    { id: 'hr', name: 'RH', path: '/hr' }
  ];

  const pageTitles = {
    '/financial-reports': 'Liste des États Financiers',
    '/financial-reports/new': 'Nouveau Rapport',
    '/financial-reports/[id]': 'Détail du Rapport',
  };

 const navigationItems = [
  { name: "Tableau de bord", path: "/financial-reports/dashboard", isDirectLink: true },
  {
    name: "Rapports",
    items: [
      { label: "Tous les rapports", path: "/financial-reports" },
      { label: "Créer un rapport", path: "/financial-reports/new" },
    ]
  },
  {
    name: "Périodes",
    items: [
      { label: "Gérer les périodes", path: "/financial-reports/periods" },
    ]
  },
  {
    name: "Import",
    items: [
      { label: "Importer des données", path: "/financial-reports/import" },
    ]
  },
  {
    name: "Paramètres",
    items: [
      { label: "Configuration", path: "/financial-reports/settings" },
    ]
  }
];

  let currentTitle = pageTitles[location.pathname] || "États Financiers";

  if (location.pathname.startsWith('/financial-reports/') && !location.pathname.includes('new')) {
    currentTitle = "Détail du Rapport";
  }

  const isActive = (path) => location.pathname === path;
  const canGoBack = location.pathname !== '/financial-reports';

  const handleGoBack = () => navigate(-1);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* HEADER */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-200">
        <div className="px-6 py-3">
          <div className="flex items-center justify-between">
            {/* GAUCHE */}
            <div className="flex items-center gap-4">
              <div className="relative">
                <button
                  onClick={() => setShowModuleDropdown(!showModuleDropdown)}
                  className="flex items-center gap-2 px-4 py-2 bg-violet-50 hover:bg-violet-100 text-violet-700 rounded-lg font-medium transition-colors border border-violet-200"
                >
                  <span>États Financiers</span>
                  <FiChevronDown className={`w-3 h-3 transition-transform ${showModuleDropdown ? 'rotate-180' : ''}`} />
                </button>

                {showModuleDropdown && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setShowModuleDropdown(false)} />
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
                              module.id === 'reports' ? 'text-violet-600 font-medium' : 'text-gray-700'
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

              <div className="h-6 w-px bg-gray-300"></div>

              {canGoBack && (
                <button
                  onClick={handleGoBack}
                  className="p-1.5 text-gray-600 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-colors"
                  title="Retour"
                >
                  <FiArrowLeft size={18} />
                </button>
              )}

              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-violet-500"></div>
                <h1 className="text-base font-medium text-gray-800">
                  {currentTitle}
                </h1>
              </div>
            </div>

            {/* NAVIGATION CENTRALE */}
            <nav className="flex items-center gap-6">
              {navigationItems.map((item) => {
                if (item.isDirectLink) {
                  return (
                    <button
                      key={item.name}
                      onClick={() => navigate(item.path)}
                      className={`px-4 py-2 text-sm font-medium transition-colors rounded-lg ${
                        isActive(item.path) ? 'bg-violet-100 text-violet-700' : 'text-gray-700 hover:text-violet-600 hover:bg-gray-100'
                      }`}
                    >
                      {item.name}
                    </button>
                  );
                }

                const hasActiveItem = item.items?.some(sub => isActive(sub.path)) || false;

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
                          hasActiveItem ? 'text-violet-700' : 'text-gray-700 hover:text-violet-600'
                        }`}
                      >
                        {item.name}
                        <FiChevronDown className={`w-3 h-3 transition-transform ${hoveredCategory === item.name ? 'rotate-180' : ''}`} />
                      </button>
                    </div>

                    {hoveredCategory === item.name && (
                      <div
                        className="absolute top-full left-0 mt-0 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50 min-w-[220px] max-h-[400px] overflow-y-auto"
                        onMouseEnter={() => setHoveredCategory(item.name)}
                        onMouseLeave={() => setHoveredCategory(null)}
                      >
                        {item.items.map((subItem) => (
                          <button
                            key={subItem.path}
                            onClick={() => navigate(subItem.path)}
                            className={`w-full px-4 py-2.5 text-sm text-left transition-colors flex items-center ${
                              isActive(subItem.path) ? 'bg-violet-50 text-violet-700 font-medium' : 'text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            <div className={`w-1 h-4 mr-3 ${isActive(subItem.path) ? 'bg-violet-600' : 'bg-gray-300'}`} />
                            {subItem.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>

            {/* DROITE */}
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

      {/* C’EST ICI QUE LE CONTENU DES PAGES APPARAÎT */}
      <main className="flex-1 p-6">
        <Outlet />
      </main>
    </div>
  );
}