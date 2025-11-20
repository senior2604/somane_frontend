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
  FiGrid,
  FiChevronDown,
  FiChevronRight,
  FiMap,
  FiFlag,
  FiCreditCard,
  FiLink,
  FiTrendingUp  // ← AJOUTÉ ICI
} from "react-icons/fi";
import { useState } from "react";

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [openCategories, setOpenCategories] = useState({
    organisation: true,
    securite: false,
    geographie: false,
    banques: false,
    systeme: false
  });

  const toggleCategory = (category) => {
    setOpenCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  const menuCategories = [
    {
      id: "organisation",
      name: "Organisation",
      icon: <FiBriefcase />,
      items: [
        { name: "Entités", path: "/entities", icon: <FiBriefcase /> },
        { name: "Partenaires", path: "/partners", icon: <FiUserPlus /> },
        { name: "Utilisateurs", path: "/users", icon: <FiUsers /> },
        { name: "Utilisateurs × Entités", path: "/userentities", icon: <FiLink /> },
      ]
    },
    {
      id: "securite",
      name: "Sécurité",
      icon: <FiShield />,
      items: [
        { name: "Groupes", path: "/groupes", icon: <FiShield /> },
        { name: "Permissions", path: "/permissions", icon: <FiList /> },
      ]
    },
    {
      id: "geographie",
      name: "Géographie",
      icon: <FiGlobe />,
      items: [
        { name: "Pays", path: "/countries", icon: <FiGlobe /> },
        { name: "États/Provinces", path: "/states", icon: <FiMap /> },
        { name: "Devises", path: "/currencies", icon: <FiDollarSign /> },
        { name: "Taux de change", path: "/ExchangeRates", icon: <FiTrendingUp /> },  // ← CORRIGÉ
        { name: "Langues", path: "/languages", icon: <FiFlag /> },
      ]
    },
    {
      id: "banques",
      name: "Banques",
      icon: <FiCreditCard />,
      items: [
        { name: "Banques", path: "/banks", icon: <FiCreditCard /> },
        { name: "Comptes Partenaires", path: "/PartnerBanks", icon: <FiList /> },
      ]
    },
    {
      id: "systeme",
      name: "Système",
      icon: <FiSettings />,
      items: [
        { name: "Paramètres", path: "/settings", icon: <FiSettings /> },
        { name: "Modules", path: "/modules", icon: <FiGrid /> },
        { name: "Journal", path: "/journal", icon: <FiBook /> },
        { name: "Tâches Auto", path: "/tasks", icon: <FiClock /> },
        { name: "Infos Système", path: "/system", icon: <FiInfo /> },
      ]
    }
  ];

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("user");
    navigate("/login");
  };

  // Vérifier si un item est actif
  const isItemActive = (path) => location.pathname === path;

  return (
    <aside className="w-64 bg-gradient-to-b from-indigo-700 to-indigo-900 text-white flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 text-center font-bold text-xl tracking-tight border-b border-indigo-600 shadow-sm">
        SOMANE ERP
      </div>
      
      {/* Tableau de Bord toujours visible */}
      <div className="px-4 py-3 border-b border-indigo-600">
        <Link
          to="/dashboard"
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition ${
            location.pathname === "/dashboard"
              ? "bg-indigo-600 shadow border-l-4 border-white"
              : "hover:bg-indigo-700/60 border-l-4 border-transparent"
          }`}
        >
          <span className="text-lg"><FiHome /></span>
          <span>Tableau de Bord</span>
        </Link>
      </div>
      
      {/* Navigation avec catégories */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {menuCategories.map((category) => (
          <div key={category.id} className="mb-2">
            {/* En-tête de catégorie */}
            <button
              onClick={() => toggleCategory(category.id)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700/40 transition"
            >
              <div className="flex items-center gap-3">
                <span className="text-lg">{category.icon}</span>
                <span>{category.name}</span>
              </div>
              <span className="text-xs">
                {openCategories[category.id] ? <FiChevronDown /> : <FiChevronRight />}
              </span>
            </button>
            
            {/* Items de la catégorie */}
            {openCategories[category.id] && (
              <div className="ml-4 mt-1 space-y-1">
                {category.items.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-3 px-3 py-2 rounded text-sm transition ${
                      isItemActive(item.path)
                        ? "bg-indigo-600 text-white shadow"
                        : "text-indigo-100 hover:bg-indigo-700/40 hover:text-white"
                    }`}
                  >
                    <span className="text-sm">{item.icon}</span>
                    <span>{item.name}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>
      
      {/* Déconnexion */}
      <div className="p-3 border-t border-indigo-600">
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