import { Link, useLocation, useNavigate } from "react-router-dom";
import { 
  FiHome, 
  FiUsers, 
  FiSettings, 
  FiLogOut, 
  FiBriefcase, 
  FiUserPlus,
  FiShield,
  FiList,
  FiGlobe,
  FiDollarSign,
  FiBook,
  FiClock,
  FiInfo,
  FiGrid
} from "react-icons/fi";

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();

  const menu = [
    { name: "Tableau de Bord", path: "/dashboard", icon: <FiHome /> },
    { name: "Entités", path: "/entities", icon: <FiBriefcase /> },
    { name: "Partenaires", path: "/partners", icon: <FiUserPlus /> },
    { name: "Utilisateurs", path: "/users", icon: <FiUsers /> },
    { name: "Groupes", path: "/groups", icon: <FiShield /> },
    { name: "Permissions", path: "/permissions", icon: <FiList /> },
    { name: "Paramètres", path: "/settings", icon: <FiSettings /> },
    { name: "Journal", path: "/journal", icon: <FiBook /> },
    { name: "Modules", path: "/modules", icon: <FiGrid /> },
    { name: "Pays & Régions", path: "/countries", icon: <FiGlobe /> },
    { name: "Devises", path: "/currencies", icon: <FiDollarSign /> },
    { name: "Banques", path: "/banks", icon: <FiList /> },
    { name: "Tâches Auto", path: "/tasks", icon: <FiClock /> },
    { name: "Système", path: "/system", icon: <FiInfo /> },
  ];

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("user");
    navigate("/login");
  };

  return (
    <aside className="w-64 bg-gradient-to-b from-indigo-700 to-indigo-900 text-white flex flex-col">
      {/* Même hauteur que le Header : px-6 py-4 */}
      <div className="px-6 py-4 text-center font-bold text-xl tracking-tight border-b border-gray-200 shadow-sm">
        SOMANE ERP
      </div>
      
      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
        {menu.map((item) => (
          <Link
            key={item.name}
            to={item.path}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition ${
              location.pathname === item.path
                ? "bg-indigo-600 shadow border-l-4 border-white"
                : "hover:bg-indigo-700/60 border-l-4 border-transparent"
            }`}
          >
            <span className="text-lg">{item.icon}</span>
            <span>{item.name}</span>
          </Link>
        ))}
      </nav>
      
      <div className="p-3 border-t border-indigo-700">
        <button 
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 py-2 bg-indigo-800 rounded-lg hover:bg-indigo-700 transition text-xs font-medium"
        >
          <FiLogOut size={14} /> Déconnexion
        </button>
      </div>
    </aside>
  );
}