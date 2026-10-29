import { Link, useLocation, useNavigate } from "react-router-dom";
import { 
  FiHome, 
  FiUsers, 
  FiSettings, 
  FiLogOut, 
  FiBriefcase, 
  FiUserPlus,
  FiList,
  FiGlobe,
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
  FiMenu,
  FiX,
  FiChevronLeft,
  FiChevronRight as FiChevronRightIcon,
  FiZap,
  FiActivity,
  FiCode,
  FiEye,
  FiLayers
} from "react-icons/fi";
import { useState, useEffect, useRef } from "react";
import { useUi } from "../context/UiContext";
import { can } from "../services/securityAccess";
import { useLanguage } from "../context/LanguageContext";

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

const MENU_ICON_RULES = [
  [['home', 'dashboard', 'accueil'], FiHome],
  [['zap', 'ai', 'intelligence'], FiZap],
  [['briefcase', 'entity', 'entité', 'company', 'organisation'], FiBriefcase],
  [['user', 'partner', 'partenaire'], FiUsers],
  [['globe', 'langue', 'translation', 'traduction', 'pays'], FiGlobe],
  [['flag'], FiFlag],
  [['map'], FiMap],
  [['credit-card', 'bank', 'banque'], FiCreditCard],
  [['link'], FiLink],
  [['trend', 'change'], FiTrendingUp],
  [['setting', 'paramètre', 'system'], FiSettings],
  [['book', 'journal'], FiBook],
  [['clock', 'task'], FiClock],
  [['info'], FiInfo],
  [['activity'], FiActivity],
  [['layer'], FiLayers],
  [['code', 'qweb', 'field', 'champ'], FiCode],
  [['eye', 'preview', 'aperçu'], FiEye],
  [['list'], FiList],
];

function getMenuDestination(menu) {
  if (menu?.path) return menu.path;
  return menu?.action_id ? `/ui/action/${menu.action_id}` : '';
}

function menuContainsPath(menu, pathname) {
  const destination = getMenuDestination(menu);
  if (destination && matchesDestination(destination, pathname)) return true;
  return (menu?.children || []).some((child) => menuContainsPath(child, pathname));
}

function matchesDestination(destination, pathname) {
  const basePath = String(destination || '').split(/[?#]/, 1)[0].replace(/\/$/, '');
  return Boolean(basePath) && (pathname === basePath || pathname.startsWith(`${basePath}/`));
}

function getMenuIcon(menu, depth = 0) {
  const searchable = `${menu?.icon || ''} ${menu?.name || ''}`.toLocaleLowerCase('fr');
  const rule = MENU_ICON_RULES.find(([keywords]) => keywords.some((keyword) => searchable.includes(keyword)));
  const Icon = rule?.[1] || (depth === 0 ? FiGrid : FiList);
  return <Icon />;
}

function DynamicMenuEntry({ menu, depth, location, isCollapsed, isMobile, openCategories, onToggle, onNavigate, t }) {
  const children = Array.isArray(menu.children) ? menu.children : [];
  const destination = getMenuDestination(menu);
  const nodeKey = `dynamic-${menu.id}`;
  const active = matchesDestination(destination, location.pathname);
  const childActive = children.some((child) => menuContainsPath(child, location.pathname));
  const expanded = Boolean(openCategories[nodeKey] || childActive);
  const linkClass = `flex min-w-0 flex-1 items-center rounded-lg px-2.5 py-2 text-sm transition-colors ${active ? 'bg-violet-50 text-violet-700 font-medium' : 'text-gray-700 hover:bg-gray-50 hover:text-violet-600'} ${isCollapsed && !isMobile ? 'justify-center' : ''}`;
  const label = (!isCollapsed || isMobile) && <TruncatedTextWithTooltip text={t(menu.name)} className="font-medium" maxWidth={depth === 0 ? '145px' : '125px'} />;
  const icon = <span className={`shrink-0 text-violet-600 ${(!isCollapsed || isMobile) ? 'mr-2.5' : ''}`}>{getMenuIcon(menu, depth)}</span>;

  if (!children.length && destination) {
    return <Link to={destination} onClick={onNavigate} className={linkClass} title={t(menu.name)}>{icon}{label}</Link>;
  }

  return (
    <div className="min-w-0">
      <div className="flex min-w-0 items-center gap-0.5">
        {destination ? (
          <Link to={destination} onClick={onNavigate} className={linkClass} title={t(menu.name)}>{icon}{label}</Link>
        ) : (
          <button type="button" onClick={() => onToggle(nodeKey)} aria-expanded={expanded} className={`${linkClass} text-left`} title={t(menu.name)}>
            {icon}{label}
          </button>
        )}
        {children.length > 0 && (!isCollapsed || isMobile) && <button type="button" onClick={() => onToggle(nodeKey)} aria-label={`${expanded ? t('Réduire') : t('Développer')} ${t(menu.name)}`} aria-expanded={expanded} className="rounded p-2 text-violet-500 hover:bg-gray-100">{expanded ? <FiChevronDown size={14} /> : <FiChevronRight size={14} />}</button>}
      </div>
      {children.length > 0 && expanded && (!isCollapsed || isMobile) && (
        <div className="ml-4 mt-0.5 space-y-0.5 border-l border-gray-100 pl-2">
          {children.map((child) => <DynamicMenuEntry key={child.id} menu={child} depth={depth + 1} location={location} isCollapsed={isCollapsed} isMobile={isMobile} openCategories={openCategories} onToggle={onToggle} onNavigate={onNavigate} t={t} />)}
        </div>
      )}
    </div>
  );
}

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { configuration, security, loading: uiLoading } = useUi();
  const { t } = useLanguage();
  
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
        { name: "Langues", path: "/Languages", model: "core.Langue", icon: <FiGlobe /> },
        { name: "Traductions", path: "/translations", model: "core.IrTranslation", icon: <FiGlobe /> },
        { name: "Modules", path: "/modules", model: "core.Module", icon: <FiGrid /> },
        { name: "Journal", path: "/journal", model: "core.Journal", icon: <FiBook /> },
        { name: "Tâches Auto", path: "/tasks", model: "core.TacheAutomatique", icon: <FiClock /> },
        { name: "Infos Système", path: "/system", model: "core.InformationSysteme", icon: <FiInfo /> },
        { name: "Modèles", path: "/models", model: "core.IrModel", icon: <FiGrid /> },
        { name: "Bilan de dynamisation", path: "/metadata-overview", model: "core.IrModelFields", icon: <FiActivity /> },
        { name: "Rendus groupés", path: "/field-displays", model: "core.IrModelFields", icon: <FiLayers /> },
        { name: "Vues QWeb", path: "/qweb-views", model: "core.IrUiView", icon: <FiCode /> },
        { name: "Champs des modèles", path: "/model-fields", model: "core.IrModelFields", icon: <FiCode /> },
        { name: "Structure des champs", path: "/model-fields/schema", model: "core.IrModelFields", icon: <FiCode /> },
        { name: "Aperçu des champs", path: "/field-preview", model: "core.IrModelFields", icon: <FiEye /> },
        { name: "Menus d’interface", path: "/ui-menus", model: "core.IrUiMenu", icon: <FiGrid /> },
      ]
    }
  ];

  const dynamicMenuCategories = (configuration?.menus || []).flatMap((menu) => {
    const visibleNodes = menu.application_root && (menu.children || []).length
      ? menu.children
      : [menu];
    return visibleNodes.map((node) => ({ ...node, dynamic: true }));
  });

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

  const menuCategories = configuration ? dynamicMenuCategories : visibleStaticMenuCategories;

  useEffect(() => {
    if (!configuration?.menus) return;
    const activeAncestors = {};
    const visit = (menu) => {
      let containsActive = false;
      const destination = getMenuDestination(menu);
      if (destination && matchesDestination(destination, location.pathname)) containsActive = true;
      for (const child of menu.children || []) {
        if (visit(child)) containsActive = true;
      }
      if (containsActive && (menu.children || []).length) activeAncestors[`dynamic-${menu.id}`] = true;
      return containsActive;
    };
    configuration.menus.forEach(visit);
    setOpenCategories((current) => ({ ...current, ...activeAncestors }));
  }, [configuration?.menus, location.pathname]);

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
              {category.dynamic ? (
                <DynamicMenuEntry
                  menu={category}
                  depth={0}
                  location={location}
                  isCollapsed={isCollapsed}
                  isMobile={isMobile}
                  openCategories={openCategories}
                  onToggle={toggleCategory}
                  onNavigate={() => isMobile && setIsMobileOpen(false)}
                  t={t}
                />
              ) : category.isSimpleLink ? (
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
                      text={t(category.name)}
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
                              text={t(item.name)}
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
                text={t("Déconnexion")}
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
