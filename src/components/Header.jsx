// features/layout/components/Header.jsx
import { useNavigate, useLocation } from "react-router-dom";
import { useState, useMemo } from "react";
import { FiBell, FiPower, FiChevronDown, FiUser, FiGrid } from "react-icons/fi";

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

  // 🔹 Sections spécifiques au module "Comptabilité"
  const accountingSections = [
    { label: 'Tableau de bord', path: '/comptabilite/Dashboard' },
    { label: 'Structure', path: '/comptabilite/structure' },
    { label: 'Traitements', path: '/comptabilite/traitements' },
    { label: 'Analyse & État', path: '/comptabilite/analyses' },
    { label: 'Paramètres', path: '/comptabilite/parametres' }
  ];

  // 🔹 Autres modules : pas de sections (ou à adapter plus tard)
  const moduleSections = useMemo(() => {
    if (currentModule.id === 'accounting') {
      return accountingSections;
    }
    return [];
  }, [currentModule.id]);

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("user");
    navigate("/login");
  };

  return (
    <header className="flex items-center justify-between px-6 py-3 bg-white border-b border-gray-200">
      {/* Module + Navigation */}
      <div className="flex items-center gap-4">
        {/* 🔹 Icône grille + dropdown modules */}
        <div className="relative">
          <button
            onClick={() => setShowModules(!showModules)}
            className="p-1.5 text-gray-600 hover:text-violet-700 hover:bg-violet-50 rounded-md transition-colors"
            title="Changer de module"
          >
            <FiGrid size={18} />
          </button>

          {showModules && (
            <>
              <div 
                className="fixed inset-0 z-40"
                onClick={() => setShowModules(false)}
              />
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

        {/* 🔹 Nom du module actuel */}
        <span className="text-lg font-semibold text-violet-700">
          {currentModule.name}
        </span>

        {/* 🔹 Onglets de navigation (uniquement si sections existent) */}
        {moduleSections.length > 0 && (
          <div className="flex items-center gap-1 ml-2">
            {moduleSections.map((section) => (
              <button
                key={section.label}
                onClick={() => navigate(section.path)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
                  location.pathname === section.path
                    ? 'bg-violet-100 text-violet-700 border border-violet-200'
                    : 'text-gray-600 hover:text-violet-700 hover:bg-gray-100'
                }`}
              >
                {section.label}
              </button>
            ))}
          </div>
        )}
      </div>
      
      {/* Actions droite */}
      <div className="flex items-center gap-2">
        <button className="relative p-1.5 text-gray-600 hover:text-violet-700 hover:bg-violet-50 rounded-md transition-colors">
          <FiBell size={18} />
          <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-red-500 rounded-full"></span>
        </button>
        
        <button className="p-1.5 text-gray-600 hover:text-violet-700 hover:bg-violet-50 rounded-md transition-colors">
          <FiUser size={20} />
        </button>
        
        <button
          onClick={handleLogout}
          className="p-1.5 text-gray-600 hover:text-violet-700 hover:bg-violet-50 rounded-md transition-colors"
          title="Déconnexion"
        >
          <FiPower size={17} /> {/* 🔹 Remplacé FiLogOut par FiPower */}
        </button>
      </div>
    </header>
  );
}