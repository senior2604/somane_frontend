import { FiBell, FiLogOut } from "react-icons/fi";
import { useNavigate, useLocation } from "react-router-dom";

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();

  const getPageTitle = () => {
    const routes = {
      '/dashboard': 'Tableau de Bord',
      '/users': 'Utilisateurs',
      '/entities': 'Entités',
      '/partners': 'Partenaires',
      '/groups': 'Groupes',
      '/settings': 'Paramètres',
      '/modules': 'Modules',
      '/journal': 'Journal',
      '/permissions': 'Permissions',
      '/currencies': 'Devises',
      '/countries': 'Pays'
    };
    return routes[location.pathname] || 'SOMANE ERP';
  };

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("user");
    navigate("/login");
  };

  return (
    <header className="flex items-center justify-between px-6 py-4 bg-white shadow-sm">
      {/* Titre de la page à GAUCHE */}
      <h1 className="text-xl font-semibold text-gray-800">
        {getPageTitle()}
      </h1>
      
      {/* Icônes et profil à DROITE */}
      <div className="flex items-center gap-5">
        <button 
          className="relative text-gray-600 hover:text-indigo-600 transition-colors"
          title="Notifications"
        >
          <FiBell size={20} />
          <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></span>
        </button>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 cursor-pointer group">
            <div className="w-8 h-8 rounded-full bg-indigo-200 flex items-center justify-center text-indigo-700 font-bold">
              A
            </div>
            <span className="text-sm font-medium text-gray-700">Admin</span>
          </div>
          
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Déconnexion"
          >
            <FiLogOut size={16} />
          </button>
        </div>
      </div>
    </header>
  );
}