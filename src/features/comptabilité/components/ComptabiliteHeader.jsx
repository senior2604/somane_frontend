import { useNavigate, useLocation } from "react-router-dom";
import { useState } from "react";
import { FiBell, FiLogOut, FiChevronDown } from "react-icons/fi";

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const [showModules, setShowModules] = useState(false);

  const modules = [
    { id: 'dashboard', name: 'Noyau', path: '/dashboard' },
    { id: 'sales', name: 'Ventes', path: '/sales' },
    { id: 'purchase', name: 'Achats', path: '/purchase' },
    { id: 'accounting', name: 'Comptabilité', path: '/comptabilite/standards' },
    { id: 'inventory', name: 'Stock', path: '/inventory' },
    { id: 'hr', name: 'RH', path: '/hr' },
    { id: 'manufacturing', name: 'Production', path: '/manufacturing' },
    { id: 'projects', name: 'Projets', path: '/projects' },
    { id: 'crm', name: 'CRM', path: '/crm' },
    { id: 'administration', name: 'Admin', path: '/admin' }
  ];

  const getCurrentModule = () => {
    const current = modules.find(module => 
      location.pathname.startsWith(module.path)
    );
    return current || modules[0];
  };

  const currentModule = getCurrentModule();

  const getPageTitle = () => {
    const routes = {
      '/dashboard': 'Tableau de Bord',
      '/users': 'Utilisateurs-Groupes-Permissions',
      '/entities': 'Entités',
      '/partners': 'Partenaires',
      '/groupes': 'Groupes',
      '/settings': 'Paramètres',
      '/modules': 'Modules',
      '/journal': 'Journal',
      '/permissions': 'Permissions',
      '/currencies': 'Devises',
      '/countries': 'Pays',
      '/states': 'États/Provinces',
      '/languages': 'Langues',
      '/banks': 'Banques',
      '/PartnerBanks': 'Comptes Partenaires',
      '/ExchangeRates': 'Taux de change',
      '/userentities': 'Utilisateurs-Entités',
      '/tasks': 'Tâches Automatiques',
      '/system': 'Informations Système'
    };
    return routes[location.pathname] || currentModule.name;
  };

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("user");
    navigate("/login");
  };

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const userInitial = user.first_name?.charAt(0) || user.email?.charAt(0) || "U";

  return (
    <header className="flex items-center justify-between px-6 py-3.5 bg-white border-b border-gray-200">
      {/* Module + Titre */}
      <div className="flex items-center gap-3">
        {/* Sélecteur de module */}
        <div className="relative">
          <button
            onClick={() => setShowModules(!showModules)}
            className="flex items-center gap-2 px-3 py-2 bg-violet-50 hover:bg-violet-100 rounded-lg font-medium text-violet-700 text-sm transition-colors border border-violet-200"
          >
            <span className="font-semibold">{currentModule.name}</span>
            <FiChevronDown className={`text-violet-500 text-xs ${showModules ? 'rotate-180' : ''}`} />
          </button>

          {showModules && (
            <>
              <div 
                className="fixed inset-0 z-40"
                onClick={() => setShowModules(false)}
              />
              <div className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-lg border border-violet-100 z-50 min-w-[180px] py-2">
                {modules.map((module) => (
                  <button
                    key={module.id}
                    onClick={() => {
                      navigate(module.path);
                      setShowModules(false);
                    }}
                    className={`w-full text-left px-4 py-2.5 hover:bg-violet-50 text-sm ${
                      currentModule.id === module.id 
                        ? 'bg-violet-50 text-violet-700 font-medium' 
                        : 'text-gray-700'
                    }`}
                  >
                    {module.name}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Séparateur */}
        <div className="text-violet-300">/</div>

        {/* Titre de la page */}
        <h1 className="text-base font-semibold text-violet-700">
          {getPageTitle()}
        </h1>
      </div>
      
      {/* Actions droite - EXACTEMENT les mêmes dimensions */}
      <div className="flex items-center gap-3">
        {/* Notifications */}
        <button className="relative p-1.5 hover:bg-violet-50 rounded-lg transition-colors">
          <FiBell size={18} className="text-gray-500 hover:text-violet-600" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
        </button>
        
        {/* Avatar */}
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-400 to-violet-500 flex items-center justify-center text-white font-medium shadow-sm">
          {userInitial}
        </div>
        
        {/* Déconnexion */}
        <button
          onClick={handleLogout}
          className="p-1.5 hover:bg-violet-50 rounded-lg transition-colors"
          title="Déconnexion"
        >
          <FiLogOut size={16} className="text-gray-500 hover:text-violet-600" />
        </button>
      </div>
    </header>
  );
}