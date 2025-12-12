import { FiBell, FiLogOut, FiUser } from "react-icons/fi";
import { useNavigate, useLocation } from "react-router-dom";

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();

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
    return routes[location.pathname] || 'SOMANE ERP';
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
      {/* Titre avec icône discrète */}
      <div className="flex items-center gap-2">
        <div className="p-1.5 bg-gray-50 rounded-lg">
          <FiUser className="text-violet-500" size={16} />
        </div>
        <h1 className="text-base font-semibold text-violet-700">
          {getPageTitle()}
        </h1>
      </div>
      
      {/* Actions droite */}
      <div className="flex items-center gap-3">
        {/* Notifications */}
        <button className="relative p-1.5 hover:bg-gray-50 rounded-lg transition-colors">
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
          className="p-1.5 hover:bg-gray-50 rounded-lg transition-colors"
          title="Déconnexion"
        >
          <FiLogOut size={16} className="text-gray-500 hover:text-violet-600" />
        </button>
      </div>
    </header>
  );
}