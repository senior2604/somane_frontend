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
  FiTrendingUp,
  FiGlobe as FiRegion
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
      id: "dashboard",
      name: "Tableau de Bord",
      icon: <FiHome />,
      path: "/dashboard",
      isSimpleLink: true
    },
    {
      id: "organisation",
      name: "Organisation",
      icon: <FiBriefcase />,
      items: [
        { name: "Entités", path: "/entities", icon: <FiBriefcase /> },
        { name: "Partenaires", path: "/partners", icon: <FiUserPlus /> },
        { 
          name: "Gestion des utilisateurs", 
          path: "/users", 
          icon: <FiUsers />,
        },
        { name: "Utilisateurs & Entités", path: "/userentities", icon: <FiLink /> },
      ]
    },
    
    {
      id: "geographie",
      name: "Géographie",
      icon: <FiGlobe />,
      items: [
        ,        
        { name: "Taux de change", path: "/ExchangeRates", icon: <FiTrendingUp /> },
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

  const isActive = (path) => location.pathname === path;

  return (
    <aside className="w-64 bg-white text-gray-800 flex flex-col border-r border-gray-200 h-screen">
      {/* Logo */}
      <div className="px-6 py-6 text-center">
        <h1 className="font-bold text-2xl tracking-tight text-violet-700">
          SOMANE ERP
        </h1>
      </div>

      {/* Menu principal */}
      <nav className="flex-1 px-3 py-2 overflow-y-auto">
        {menuCategories.map((category) => (
          <div key={category.id} className="mb-1">
            {category.isSimpleLink ? (
              /* Lien simple : Tableau de Bord */
              <Link
                to={category.path}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive(category.path)
                    ? "bg-violet-50 text-violet-700"
                    : "text-gray-700 hover:bg-gray-50 hover:text-violet-600"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg text-violet-600">{category.icon}</span>
                  <span className="font-semibold">{category.name}</span>
                </div>
              </Link>
            ) : (
              /* Catégorie avec sous-menu */
              <>
                {/* En-tête de catégorie */}
                <button
                  onClick={() => toggleCategory(category.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                    openCategories[category.id]
                      ? "text-violet-700"
                      : "text-gray-700 hover:text-violet-600 hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg text-violet-600">{category.icon}</span>
                    <span className="font-semibold">{category.name}</span>
                  </div>
                  <span className="text-violet-500 text-xs">
                    {openCategories[category.id] ? <FiChevronDown /> : <FiChevronRight />}
                  </span>
                </button>

                {/* Sous-items */}
                {openCategories[category.id] && (
                  <div className="ml-10 mt-1 space-y-0.5">
                    {category.items.map((item) => (
                      <Link
                        key={item.path}
                        to={item.path}
                        className={`flex flex-col px-3 py-2 rounded-lg text-sm transition-all duration-200 group ${
                          isActive(item.path)
                            ? "bg-violet-50 text-violet-700 font-medium"
                            : "text-gray-600 hover:bg-gray-50 hover:text-violet-600"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-violet-600">{item.icon}</span>
                          <span className="font-medium">{item.name}</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        ))}
      </nav>

      {/* Déconnexion */}
      <div className="p-4 border-t border-gray-200">
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-3 py-3 bg-violet-50 text-violet-700 rounded-lg hover:bg-violet-100 transition-all duration-200 font-medium text-sm"
        >
          <FiLogOut className="text-violet-600" />
          Déconnexion
        </button>
      </div>
    </aside>
  );
}