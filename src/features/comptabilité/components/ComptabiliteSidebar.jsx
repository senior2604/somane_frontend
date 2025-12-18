import { Link, useLocation, useNavigate } from "react-router-dom";
import { 
  FiHome, 
  FiPieChart,
  FiBook,
  FiEdit2,
  FiCreditCard,
  FiGrid,
  FiPercent,
  FiFileText,
  FiBookOpen,
  FiFile,
  FiList,
  FiDownload,
  FiLink,
  FiCheckSquare,
  FiTrendingUp,
  FiCalendar,
  FiSettings,
  FiUsers,
  FiLock,
  FiArchive,
  FiClipboard,
  FiBarChart2,
  FiLogOut,
  FiChevronDown,
  FiChevronRight,
  FiMenu,
  FiX,
  FiChevronLeft,
  FiChevronRight as FiChevronRightIcon,
  FiDatabase
} from "react-icons/fi";
import { useState, useEffect } from "react";

export default function ComptabiliteSidebar({ onMobileToggle, isMobileOpen }) {
  const location = useLocation();
  const navigate = useNavigate();
  
  const [openCategories, setOpenCategories] = useState({
    dashboard: true,
    referentiels: true,
    operations: false,
    tresorerie: false,
    etats: false,
    administration: false
  });

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Vérifier la taille de l'écran
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) {
        if (typeof onMobileToggle === 'function') {
          onMobileToggle(false);
        }
      }
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, [onMobileToggle]);

  const toggleCategory = (category) => {
    setOpenCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  // Gestion du clic sur mobile
  const handleMobileClick = () => {
    if (isMobile && typeof onMobileToggle === 'function') {
      onMobileToggle(false);
    }
  };

  const handleMainMenuClick = (e) => {
    e.preventDefault();
    console.log("🔄 Navigation vers le menu principal...");
    
    // OPTION 1: Utiliser window.location.href pour FORCER le rechargement
    window.location.href = "/dashboard"; // Changez "/" si nécessaire
    
    // OPTION 2: Si /dashboard ne fonctionne pas, essayez /
    // window.location.href = "/";
    
    // OPTION 3: Naviguer + recharger après un délai
    // navigate("/dashboard");
    // setTimeout(() => window.location.reload(), 100);
    
    handleMobileClick();
  };

  const handleLogout = () => {
    if (window.confirm("Êtes-vous sûr de vouloir vous déconnecter ?")) {
      localStorage.removeItem("authToken");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
  };

  const menuCategories = [
    {
      id: "dashboard",
      name: "Tableau de Bord",
      icon: <FiPieChart />,
      path: "/comptabilite/dashboard",
      isSimpleLink: true
    },
    {
      id: "referentiels",
      name: "Référentiels",
      icon: <FiBook />,
      items: [
        { 
          name: "Plan comptable", 
          path: "/comptabilite/plan-comptable", 
          icon: <FiGrid />
        },
        { 
          name: "Taux fiscaux", 
          path: "/comptabilite/taux-fiscaux", 
          icon: <FiPercent />
        },
        { 
          name: "Positions fiscales", 
          path: "/comptabilite/positions-fiscales", 
          icon: <FiFileText />
        }
      ]
    },
    {
      id: "operations",
      name: "Opérations",
      icon: <FiEdit2 />,
      items: [
        { 
          name: "Journaux comptables", 
          path: "/comptabilite/journaux", 
          icon: <FiBookOpen />
        },
        { 
          name: "Pièces comptables", 
          path: "/comptabilite/pieces", 
          icon: <FiFile />
        },
        { 
          name: "Lignes comptables", 
          path: "/comptabilite/lignes", 
          icon: <FiList />
        }
      ]
    },
    {
      id: "tresorerie",
      name: "Trésorerie",
      icon: <FiCreditCard />,
      items: [
        { 
          name: "Relevés bancaires", 
          path: "/comptabilite/releves", 
          icon: <FiDownload />
        },
        { 
          name: "Lettrage automatique", 
          path: "/comptabilite/lettrage", 
          icon: <FiLink />
        }
      ]
    },
    {
      id: "etats",
      name: "États & Rapports",
      icon: <FiBarChart2 />,
      items: [
        { 
          name: "Grand Livre", 
          path: "/comptabilite/grand-livre", 
          icon: <FiBookOpen />
        },
        { 
          name: "Balance", 
          path: "/comptabilite/balance", 
          icon: <FiClipboard />
        },
        { 
          name: "Bilan", 
          path: "/comptabilite/bilan", 
          icon: <FiTrendingUp />
        }
      ]
    },
    {
      id: "administration",
      name: "Administration",
      icon: <FiSettings />,
      items: [
        { 
          name: "Exercices fiscaux", 
          path: "/comptabilite/exercices", 
          icon: <FiCalendar />
        },
        { 
          name: "Paramètres comptables", 
          path: "/comptabilite/parametres", 
          icon: <FiSettings />
        }
      ]
    }
  ];

  const isActive = (path) => location.pathname.startsWith(path);

  const sidebarWidth = isCollapsed ? "w-14" : "w-56";
  const sidebarClasses = `
    ${isMobile ? "fixed" : "relative"}
    inset-y-0 left-0 z-50
    ${sidebarWidth}
    bg-white text-gray-800 flex flex-col border-r border-gray-200 h-screen
    transition-all duration-300 ease-in-out
    ${isMobile ? (isMobileOpen ? "translate-x-0" : "-translate-x-full") : "translate-x-0"}
    ${isMobileOpen ? "shadow-2xl" : ""}
  `;

  return (
    <>
      {/* Bouton toggle pour mobile */}
      {isMobile && (
        <button
          onClick={() => typeof onMobileToggle === 'function' && onMobileToggle(!isMobileOpen)}
          className="fixed top-4 left-4 z-40 p-2 bg-violet-600 text-white rounded-lg shadow-lg md:hidden"
        >
          {isMobileOpen ? <FiX size={20} /> : <FiMenu size={20} />}
        </button>
      )}

      {/* Overlay pour mobile */}
      {isMobile && isMobileOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={() => typeof onMobileToggle === 'function' && onMobileToggle(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={sidebarClasses}>
        {/* En-tête avec bouton de réduction */}
        <div className="px-3 py-4 flex items-center justify-between border-b border-gray-200">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-violet-700 rounded-lg flex items-center justify-center">
              <FiDatabase className="text-white" size={16} />
            </div>
            {!isCollapsed && (
              <span className="font-bold text-lg tracking-tight text-violet-700 whitespace-nowrap">
                Comptabilité
              </span>
            )}
          </div>
          
          {/* Boutons de contrôle */}
          <div className="flex items-center gap-1">
            {!isMobile && (
              <button
                onClick={toggleCollapse}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                title={isCollapsed ? "Développer" : "Réduire"}
              >
                {isCollapsed ? (
                  <FiChevronRightIcon className="text-violet-600" size={16} />
                ) : (
                  <FiChevronLeft className="text-violet-600" size={16} />
                )}
              </button>
            )}
            
            {isMobile && (
              <button
                onClick={() => typeof onMobileToggle === 'function' && onMobileToggle(false)}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <FiX className="text-violet-600" size={20} />
              </button>
            )}
          </div>
        </div>

        {/* Menu principal */}
        <nav className="flex-1 px-1.5 py-2 overflow-y-auto">
          <div className="space-y-1">
            {menuCategories.map((category) => (
              <div key={category.id} className="mb-0.5">
                {category.isSimpleLink ? (
                  <Link
                    to={category.path}
                    onClick={handleMobileClick}
                    className={`flex items-center px-2.5 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      isActive(category.path)
                        ? "bg-violet-50 text-violet-700"
                        : "text-gray-700 hover:bg-gray-50 hover:text-violet-600"
                    } ${isCollapsed ? "justify-center" : ""}`}
                  >
                    <span className={`text-base ${isActive(category.path) ? "text-violet-600" : "text-gray-500"} ${isCollapsed ? "" : "mr-2.5"}`}>
                      {category.icon}
                    </span>
                    {!isCollapsed && (
                      <span className="font-semibold text-sm whitespace-nowrap">
                        {category.name}
                      </span>
                    )}
                  </Link>
                ) : (
                  <>
                    <button
                      onClick={() => toggleCategory(category.id)}
                      className={`w-full flex items-center ${isCollapsed ? "justify-center" : "justify-between"} px-2.5 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                        openCategories[category.id] || isActive(`/comptabilite/${category.id}`)
                          ? "text-violet-700"
                          : "text-gray-700 hover:text-violet-600 hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className={`text-base ${
                          openCategories[category.id] || isActive(`/comptabilite/${category.id}`)
                            ? "text-violet-600"
                            : "text-gray-500"
                        }`}>
                          {category.icon}
                        </span>
                        {!isCollapsed && (
                          <span className="font-semibold text-sm whitespace-nowrap">
                            {category.name}
                          </span>
                        )}
                      </div>
                      
                      {!isCollapsed && (
                        <span className="text-violet-500 text-xs flex-shrink-0">
                          {openCategories[category.id] ? <FiChevronDown /> : <FiChevronRight />}
                        </span>
                      )}
                    </button>

                    {!isCollapsed && openCategories[category.id] && (
                      <div className="ml-8 mt-0.5 space-y-0.5">
                        {category.items.map((item) => (
                          <Link
                            key={item.path}
                            to={item.path}
                            onClick={handleMobileClick}
                            className={`flex items-center px-2.5 py-1.5 rounded-lg text-sm transition-all duration-200 ${
                              isActive(item.path)
                                ? "bg-violet-50 text-violet-700 font-medium"
                                : "text-gray-600 hover:bg-gray-50 hover:text-violet-600"
                            }`}
                          >
                            <span className={`${isActive(item.path) ? "text-violet-600" : "text-gray-500"} mr-2.5`}>
                              {item.icon}
                            </span>
                            <span className="font-medium text-sm whitespace-nowrap">
                              {item.name}
                            </span>
                          </Link>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        </nav>

        {/* Pied de page */}
        <div className="p-2 border-t border-gray-200">
          {/* Retour au menu principal - VERSION CORRIGÉE */}
          <button
            onClick={handleMainMenuClick}
            className={`w-full flex items-center ${isCollapsed ? "justify-center" : "justify-center gap-2.5"} mb-2 px-2.5 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-all text-gray-700 hover:text-violet-700 text-sm font-medium`}
          >
            <FiHome className="text-gray-500 text-base" />
            {!isCollapsed && (
              <span className="whitespace-nowrap">Menu Principal</span>
            )}
          </button>
          
          {/* Déconnexion */}
          <button
            onClick={handleLogout}
            className={`w-full flex items-center ${isCollapsed ? "justify-center" : "justify-center gap-2.5"} py-2 bg-violet-50 text-violet-700 rounded-lg hover:bg-violet-100 transition-all duration-200 font-medium text-sm`}
          >
            <FiLogOut className="text-violet-600 text-base" />
            {!isCollapsed && (
              <span className="whitespace-nowrap">Déconnexion</span>
            )}
          </button>
        </div>
      </aside>
    </>
  );
}