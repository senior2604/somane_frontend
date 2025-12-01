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
  FiTrendingUp
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
        { name: "Taux de change", path: "/ExchangeRates", icon: <FiTrendingUp /> },
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
    <aside className="w-64 bg-gradient-to-b from-sky-100 to-sky-50 text-sky-900 flex flex-col border-r border-sky-200">
      {/* Header */}
      <div className="px-6 py-4 text-center font-bold text-xl tracking-tight border-b border-sky-200 shadow-sm bg-gradient-to-r from-sky-500 to-sky-400 text-white">
        SOMANE ERP
      </div>
      
      {/* Tableau de Bord toujours visible */}
      <div className="px-4 py-3 border-b border-sky-200 bg-sky-50/50">
        <Link
          to="/dashboard"
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all duration-200 ${
            location.pathname === "/dashboard"
              ? "bg-sky-500 text-white shadow-md border-l-4 border-sky-300 transform scale-[1.02]"
              : "hover:bg-sky-100 hover:text-sky-700 border-l-4 border-transparent hover:border-sky-300 hover:shadow-sm"
          }`}
        >
          <span className="text-lg"><FiHome /></span>
          <span className="font-medium">Tableau de Bord</span>
        </Link>
      </div>
      
      {/* Navigation avec catégories */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {menuCategories.map((category) => (
          <div key={category.id} className="mb-2">
            {/* En-tête de catégorie */}
            <button
              onClick={() => toggleCategory(category.id)}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-sky-100 hover:text-sky-700 transition-all duration-200 group"
            >
              <div className="flex items-center gap-3">
                <span className="text-lg text-sky-600 group-hover:text-sky-700">{category.icon}</span>
                <span className="font-semibold">{category.name}</span>
              </div>
              <span className="text-sky-500 group-hover:text-sky-600">
                {openCategories[category.id] ? <FiChevronDown /> : <FiChevronRight />}
              </span>
            </button>
            
            {/* Items de la catégorie */}
            {openCategories[category.id] && (
              <div className="ml-8 mt-1 space-y-0.5">
                {category.items.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 ${
                      isItemActive(item.path)
                        ? "bg-sky-500 text-white shadow-sm transform scale-[1.02] font-medium"
                        : "text-sky-600 hover:bg-sky-100 hover:text-sky-700 hover:shadow-sm"
                    }`}
                  >
                    <span className={`text-sm ${isItemActive(item.path) ? 'text-white' : 'text-sky-500'}`}>
                      {item.icon}
                    </span>
                    <span>{item.name}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>
      
      {/* Déconnexion */}
      <div className="p-4 border-t border-sky-200 bg-sky-50/50">
        <button 
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-sky-500 to-sky-400 text-white rounded-lg hover:from-sky-600 hover:to-sky-500 transition-all duration-200 shadow-sm hover:shadow-md font-medium text-sm"
        >
          <FiLogOut size={16} /> Déconnexion
        </button>
      </div>
    </aside>
  );
}