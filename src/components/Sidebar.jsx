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
  FiGlobe as FiRegion,
  FiMenu,
  FiX,
  FiChevronLeft,
  FiChevronRight as FiChevronRightIcon,
  FiShoppingCart,
  FiZap,
  FiCode
} from "react-icons/fi";
import { useState, useEffect, useRef } from "react";
import { useUi } from "../context/UiContext";
import { can } from "../services/securityAccess";

// Composant pour texte avec tooltip automatique
const TruncatedTextWithTooltip = ({ text, className = "", maxWidth = "none" }) => {
  const textRef = useRef(null);
  const [isTruncated, setIsTruncated] = useState(false);

  // Vérifier si le texte est tronqué
  useEffect(() => {
    const checkTruncation = () => {
      if (textRef.current) {
        const element = textRef.current;
        const isTruncatedNow = element.scrollWidth > element.clientWidth;
        setIsTruncated(isTruncatedNow);
      }
    };

    checkTruncation();
    window.addEventListener('resize', checkTruncation);
    return () => window.removeEventListener('resize', checkTruncation);
  }, [text]);

  return (
    <div className="relative">
      <div
        ref={textRef}
        className={`truncate ${className}`}
        style={{ maxWidth }}
        data-tooltip={isTruncated ? text : undefined}
        tabIndex={isTruncated ? 0 : undefined}
      >
        {text}
      </div>
    </div>
  );
};

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { configuration, security, loading: uiLoading } = useUi();
  
  const [openCategories, setOpenCategories] = useState({
    organisation: true,
    securite: false,
    geographie: false,
    banques: false,
    achats: false,
    systeme: false
  });

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) {
        setIsMobileOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const toggleCategory = (category) => {
    setOpenCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  const toggleSidebar = () => {
    if (isMobile) {
      setIsMobileOpen(!isMobileOpen);
    } else {
      setIsCollapsed(!isCollapsed);
    }
  };

  const staticMenuCategories = [
    {
      id: "dashboard",
      name: "Tableau de Bord",
      icon: <FiHome />,
      path: "/dashboard",
      isSimpleLink: true
    },
    {
      id: "somane-ai",
      name: "SomaneAI",
      icon: <FiZap />,
      path: "/somane-ai",
      isSimpleLink: true
    },
    {
      id: "organisation",
      name: "Organisation",
      icon: <FiBriefcase />,
      items: [
        { name: "Entités", path: "/entities", model: "core.Entite", icon: <FiBriefcase /> },
        { name: "Partenaires", path: "/partners", model: "core.Partenaire", icon: <FiUserPlus /> },
        { 
          name: "Gestion des utilisateurs", 
          path: "/UsersGestions", 
          anyModels: ["core.Utilisateur", "core.Groupe", "core.Permission"],
          icon: <FiUsers />,
        },
        { name: "Utilisateurs & Entités", path: "/userentities", model: "core.UtilisateurEntite", icon: <FiLink /> },
      ]
    },
    {
      id: "geographie",
      name: "Géographie",
      icon: <FiGlobe />,
      items: [
        { name: "Taux de change", path: "/ExchangeRates", model: "core.HistoriqueTauxChange", icon: <FiTrendingUp /> },
      ]
    },
    {
      id: "banques",
      name: "Banques",
      icon: <FiCreditCard />,
      items: [
        { name: "Banques", path: "/banks", model: "core.Banque", icon: <FiCreditCard /> },
        { name: "Comptes Partenaires", path: "/PartnerBanks", model: "core.BanquePartenaire", icon: <FiList /> },
      ]
    },

    

    {
      id: "systeme",
      name: "Système",
      icon: <FiSettings />,
      items: [
        { name: "Paramètres", path: "/settings", model: "core.ParametreGeneral", icon: <FiSettings /> },
        { name: "Modules", path: "/modules", model: "core.Module", icon: <FiGrid /> },
        { name: "Journal", path: "/journal", model: "core.Journal", icon: <FiBook /> },
        { name: "Tâches Auto", path: "/tasks", model: "core.TacheAutomatique", icon: <FiClock /> },
        { name: "Infos Système", path: "/system", model: "core.InformationSysteme", icon: <FiInfo /> },
        { name: "Modèles", path: "/models", model: "core.IrModel", icon: <FiGrid /> },
        { name: "Champs des modèles", path: "/model-fields", model: "core.IrModelFields", icon: <FiCode /> },
      ]
    }
  ];

  const dynamicMenuCategories = (configuration?.menus || []).map((menu) => ({
    id: `dynamic-${menu.id}`,
    name: menu.name,
    icon: <FiGrid />,
    path: menu.action_id ? `/ui/action/${menu.action_id}` : undefined,
    isSimpleLink: Boolean(menu.action_id) && !(menu.children || []).length,
    items: (menu.children || [])
      .filter((child) => child.action_id)
      .map((child) => ({
        name: child.name,
        path: `/ui/action/${child.action_id}`,
        icon: <FiList />,
      })),
  })).filter((menu) => menu.isSimpleLink || menu.items.length);

  const visibleStaticMenuCategories = staticMenuCategories
    .map((category) => {
      if (!category.items) return category;
      const items = category.items.filter((item) => {
        // Keep navigation visible while access data is unavailable. Protected
        // routes and backend APIs still enforce the actual permissions.
        if (uiLoading || !security) return true;
        const models = item.models || (item.model ? [item.model] : []);
        if (item.anyModels) return item.anyModels.some((model) => can(security, model, 'read'));
        return models.length === 0 || models.every((model) => can(security, model, 'read'));
      });
      return { ...category, items };
    })
    .filter((category) => !category.items || category.items.length > 0);

  const menuCategories = [...visibleStaticMenuCategories, ...dynamicMenuCategories];

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("user");
    navigate("/login");
  };

  const isActive = (path) => location.pathname === path;

  // Dimensions réduites :
  // - Normal : 220px (au lieu de 256px)
  // - Réduit : 56px (au lieu de 80px)
  const sidebarWidth = isCollapsed && !isMobile ? "w-14" : "w-56";
  const sidebarClasses = `somane-sidebar ${isCollapsed && !isMobile ? 'somane-sidebar--collapsed' : ''}
    ${isMobile ? (isMobileOpen ? "translate-x-0" : "-translate-x-full") : ""}
    ${isMobile ? "fixed inset-y-0 left-0 z-50" : "relative"}
    ${sidebarWidth}
    bg-white text-gray-800 flex flex-col border-r border-gray-200 h-screen
    transition-all duration-300 ease-in-out
    ${isMobileOpen ? "shadow-2xl" : ""}
  `;

  return (
    <>
      {/* Bouton toggle pour mobile */}
      {isMobile && (
        <button
          onClick={toggleSidebar}
          className="fixed top-4 left-4 z-40 p-2 bg-violet-600 text-white rounded-lg shadow-lg md:hidden"
        >
          {isMobileOpen ? <FiX size={20} /> : <FiMenu size={20} />}
        </button>
      )}

      {/* Overlay pour mobile */}
      {isMobile && isMobileOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={sidebarClasses}>
        {/* Logo et bouton toggle */}
        <div className="px-3 py-4 flex items-center justify-between border-b border-gray-200">
          {!isCollapsed || isMobile ? (
            <TruncatedTextWithTooltip 
              text="SOMANE ERP" 
              className="font-bold text-lg tracking-tight text-violet-700"
              maxWidth="120px"
            />
          ) : (
            <div className="w-7 h-7 bg-violet-700 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xs">S</span>
            </div>
          )}
          
          {/* Bouton toggle pour desktop */}
          {!isMobile && (
            <button
              onClick={toggleSidebar}
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
        </div>

        {/* Menu principal */}
        <nav className="somane-sidebar__nav flex-1 px-1.5 py-2 overflow-y-auto">
          {menuCategories.map((category) => (
            <div key={category.id} className="mb-0.5">
              {category.isSimpleLink ? (
                /* Lien simple : Tableau de Bord */
                <Link
                  to={category.path}
                  className={`somane-sidebar__link flex items-center px-2.5 py-2 rounded-lg text-sm font-medium transition-all duration-200 group ${
                    isActive(category.path)
                      ? "is-active bg-violet-50 text-violet-700"
                      : "text-gray-700 hover:bg-gray-50 hover:text-violet-600"
                  } ${isCollapsed && !isMobile ? "justify-center" : ""}`}
                >
                  <span className={`text-base text-violet-600 ${isCollapsed && !isMobile ? "" : "mr-2.5"}`}>
                    {category.icon}
                  </span>
                  {(!isCollapsed || isMobile) && (
                    <TruncatedTextWithTooltip 
                      text={category.name}
                      className="font-semibold text-sm"
                      maxWidth={isCollapsed ? "110px" : "150px"}
                    />
                  )}
                </Link>
              ) : (
                /* Catégorie avec sous-menu */
                <>
                  {/* En-tête de catégorie */}
                  <button
                    onClick={() => toggleCategory(category.id)}
                    className={`somane-sidebar__category w-full flex items-center ${isCollapsed && !isMobile ? "justify-center" : "justify-between"} px-2.5 py-2 rounded-lg text-sm font-medium transition-all duration-200 group ${
                      openCategories[category.id]
                        ? "text-violet-700"
                        : "text-gray-700 hover:text-violet-600 hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-base text-violet-600">
                        {category.icon}
                      </span>
                      {(!isCollapsed || isMobile) && (
                        <TruncatedTextWithTooltip 
                          text={category.name}
                          className="font-semibold text-sm"
                          maxWidth={isCollapsed ? "90px" : "120px"}
                        />
                      )}
                    </div>
                    
                    {/* Flèche pour les sous-menus (seulement quand déplié) */}
                    {(!isCollapsed || isMobile) && (
                      <span className="text-violet-500 text-xs flex-shrink-0">
                        {openCategories[category.id] ? <FiChevronDown /> : <FiChevronRight />}
                      </span>
                    )}
                  </button>

                  {/* Sous-items (seulement quand déplié) */}
                  {(!isCollapsed || isMobile) && openCategories[category.id] && (
                    <div className={`${isCollapsed && !isMobile ? "ml-0" : "ml-8"} mt-0.5 space-y-0.5`}>
                      {category.items.map((item) => (
                        <Link
                          key={item.path}
                          to={item.path}
                          className={`somane-sidebar__link somane-sidebar__link--nested flex items-center px-2.5 py-1.5 rounded-lg text-sm transition-all duration-200 group ${
                            isActive(item.path)
                              ? "is-active bg-violet-50 text-violet-700 font-medium"
                              : "text-gray-600 hover:bg-gray-50 hover:text-violet-600"
                          }`}
                        >
                          <span className={`text-violet-600 ${isCollapsed && !isMobile ? "" : "mr-2.5"}`}>
                            {item.icon}
                          </span>
                          {(!isCollapsed || isMobile) && (
                            <TruncatedTextWithTooltip 
                              text={item.name}
                              className="font-medium text-sm"
                              maxWidth={isCollapsed ? "110px" : "130px"}
                            />
                          )}
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
        <div className="p-2 border-t border-gray-200">
          <button
            onClick={handleLogout}
            className={`w-full flex items-center ${isCollapsed && !isMobile ? "justify-center" : "justify-center gap-2.5"} py-2 bg-violet-50 text-violet-700 rounded-lg hover:bg-violet-100 transition-all duration-200 font-medium text-sm`}
          >
            <FiLogOut className="text-violet-600 text-base" />
            {(!isCollapsed || isMobile) && (
              <TruncatedTextWithTooltip 
                text="Déconnexion"
                className="text-sm"
                maxWidth="70px"
              />
            )}
          </button>
        </div>
      </aside>

      {/* Espace réservé pour le contenu principal */}
      {isMobileOpen && isMobile && (
        <div className="md:hidden" style={{ height: '100vh' }} />
      )}
    </>
  );
}
