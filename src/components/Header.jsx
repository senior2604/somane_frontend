import { useNavigate, useLocation } from "react-router-dom";
import { useState } from "react";
import { FiBell, FiLogOut, FiChevronDown, FiUser } from "react-icons/fi";

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const [showModules, setShowModules] = useState(false);

  const modules = [
    { id: 'dashboard', name: 'Noyau', path: '/dashboard' },
    { id: 'sales', name: 'Ventes', path: '/sales' },



    { id: 'achats', name: 'Achats', path: '/achats' },

    { id: 'accounting', name: 'Comptabilité', path: '/comptabilite/Dashboard' },
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

  return (
    <header className="flex items-center justify-between px-6 py-3 bg-white border-b border-gray-200">
      {/* Module + Titre */}
      <div className="flex items-center gap-3">
        {/* Sélecteur de module */}
        <div className="relative">
          <button
            onClick={() => setShowModules(!showModules)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-50 hover:bg-violet-100 text-violet-700 rounded-md font-medium text-sm transition-colors border border-violet-200"
          >
            {currentModule.name}
            <FiChevronDown className={`w-3.5 h-3.5 transition-transform ${showModules ? 'rotate-180' : ''}`} />
          </button>

          {showModules && (
            <>
              <div 
                className="fixed inset-0 z-40"
                onClick={() => setShowModules(false)}
              />
              {/* Dropdown plus doux et arrondi (style card premium) */}
              <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-xl shadow-md border border-gray-100 z-50 overflow-hidden">
                {modules.map((module) => (
                  <button
                    key={module.id}
                    onClick={() => {
                      navigate(module.path);
                      setShowModules(false);
                    }}
                    className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors ${
                      currentModule.id === module.id 
                        ? 'bg-violet-50 text-violet-700' 
                        : 'text-gray-700 hover:bg-gray-50'
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
        <div className="text-gray-300">/</div>

        {/* Titre de la page */}
        <h1 className="text-lg font-semibold text-violet-700">
          {getPageTitle()}
        </h1>
      </div>
      
      {/* Actions droite */}
      <div className="flex items-center gap-2">
        {/* Notifications */}
        <button className="relative p-1.5 text-gray-600 hover:text-violet-700 hover:bg-violet-50 rounded-md transition-colors">
          <FiBell size={18} />
          <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-red-500 rounded-full"></span>
        </button>
        
        {/* Icône utilisateur à la place des initiales */}
        <button className="p-1.5 text-gray-600 hover:text-violet-700 hover:bg-violet-50 rounded-md transition-colors">
          <FiUser size={20} />
        </button>
        
        {/* Déconnexion */}
        <button
          onClick={handleLogout}
          className="p-1.5 text-gray-600 hover:text-violet-700 hover:bg-violet-50 rounded-md transition-colors"
          title="Déconnexion"
        >
          <FiLogOut size={17} />
        </button>
      </div>
    </header>
  );
}