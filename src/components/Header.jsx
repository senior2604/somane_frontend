// src/components/UnifiedHeader.jsx
import { useNavigate, useLocation } from "react-router-dom";
import { useState, useMemo, useEffect, useRef } from "react";
import {
  FiBell,
  FiChevronDown,
  FiUser,
  FiPower,
  FiGrid,
  FiPlus,
  FiBriefcase,
  FiHelpCircle,
  FiSettings,
  FiWifi
} from "react-icons/fi";
import { useEntity } from '../context/EntityContext';
import { apiClient } from '../services/apiClient';

// ===== CONFIGURATION CENTRALISEE DES MODULES =====
const MODULES_CONFIG = [
  {
    id: "dashboard",
    name: "Accueil",
    path: "/dashboard",
    color: "gray",
    navigation: []
  },
  {
    id: "sales",
    name: "Ventes",
    path: "/vente",
    color: "blue",
    navigation: [
      {
        name: "Commandes",
        items: [
          { label: "Tableau de bord", path: "/vente/dashboard" },
          { label: "Commandes Client", path: "/vente/commandes" },
          { label: "Lignes de Commande", path: "/vente/lignes-commandes" }
        ]
      },
      {
        name: "Configuration",
        items: [
          { label: "Produits", path: "/vente/produits" },
          { label: "Listes de prix", path: "/vente/pricelists" },
          { label: "Options", path: "/vente/options" }
        ]
      },
      {
        name: "Organisation",
        items: [
          { label: "Equipes Commerciales", path: "/vente/equipes" }
        ]
      },
      {
        name: "Suivi",
        items: [
          { label: "Reporting", path: "/vente/reporting" },
          { label: "Historique Facturation", path: "/vente/facturation" }
        ]
      }
    ]
  },
  {
    id: "achats",
    name: "Achats",
    path: "/achats",
    color: "violet",
    navigation: [
      {
        name: "Commandes",
        items: [
          { label: "Bons de Commande", path: "/achats/bons-commande" },
          { label: "Lignes Bon Commande", path: "/achats/lignes-bon-commande" }
        ]
      },
      {
        name: "Demandes",
        items: [
          { label: "Demandes d'Achat", path: "/achats/demandes-achat" },
          { label: "Lignes Demande Achat", path: "/achats/lignes-demande-achat" }
        ]
      },
      {
        name: "References",
        items: [
          { label: "Prix Fournisseurs", path: "/achats/prix-fournisseurs" }
        ]
      }
    ]
  },
  {
    id: "accounting",
    name: "Comptabilité",
    path: "/comptabilite",
    color: "emerald",
    navigation: [
      {
        name: "Tableau de bord",
        path: "/comptabilite/dashboard",
        items: []
      },
      {
        name: "Configuration",
        items: [
          { label: "Partenaires", path: "/partners" },
          { label: "Plans comptables", path: "/comptabilite/plans" },
          { label: "Référentiels comptables", path: "/comptabilite/frameworks" },
          { label: "Classes / Groupes", path: "/comptabilite/groups" },
          { label: "Types / Natures de comptes", path: "/comptabilite/types" },
          { label: "Comptes comptables", path: "/comptabilite/accounts" },
          { label: "Import comptes", path: "/comptabilite/accounts/import" },
          { label: "Journaux", path: "/comptabilite/journaux" },
          { label: "Taxes", path: "/comptabilite/taux-fiscaux" },
          { label: "Groupes de taxes", path: "/comptabilite/tax-groups" },
          { label: "Retenues à la source", path: "/comptabilite/withholding-taxes" },
          { label: "Positions fiscales", path: "/comptabilite/positions-fiscales" },
          { label: "Séquences", path: "/comptabilite/sequences" },
          { label: "Catégories d'immobilisations", path: "/comptabilite/categories-immobilisations" },
          { label: "Longueur des comptes", path: "/comptabilite/parametrage/longueur-compte" },
          { label: "Réimputations", path: "/comptabilite/reimputations" },
          { label: "Relevés bancaires", path: "/comptabilite/releves-bancaires" }
        ]
      },
      {
        name: "Traitements",
        items: [
          { label: "Pièces comptables", path: "/comptabilite/pieces" },
          { label: "Écritures comptables", path: "/comptabilite/ecritures" },
          { label: "Paiements", path: "/comptabilite/paiements" },
          { label: "Conditions de paiement", path: "/comptabilite/conditions-paiement" },
          { label: "Modes de paiement", path: "/comptabilite/methodes-paiement" },
          { label: "Lettrage des comptes", path: "/comptabilite/lettrage" },
          { label: "Immobilisations", path: "/comptabilite/immobilisations" },
          { label: "Emprunts", path: "/comptabilite/emprunts" },
          { label: "Rapprochement", path: "/comptabilite/rapprochement" }
        ]
      },
      {
        name: "Analyse & État",
        items: [
          { label: "Grand-Livre", path: "/comptabilite/grand-livre" },
          { label: "Grand-Livre partenaires", path: "/comptabilite/grand-livre-partenaires" },
          { label: "Balance générale", path: "/comptabilite/balance" },
          { label: "Balance des partenaires", path: "/comptabilite/balance-partenaires" },
          { label: "Balance âgée", path: "/comptabilite/balance-agee" },
          { label: "Analyse des emprunts", path: "/comptabilite/analyse-emprunts" },
          { label: "Analyse déclaration TVA", path: "/comptabilite/analyse-tva" },
          { label: "Analyse déclaration sécurité sociale", path: "/comptabilite/analyse-securite-sociale" },
          { label: "Tableaux des amortissements", path: "/comptabilite/tableaux-amortissements" },
          { label: "Bilan", path: "/comptabilite/bilan" },
          { label: "Compte de résultat", path: "/comptabilite/compte-resultat" },
          { label: "Flux de trésorerie", path: "/comptabilite/flux-tresorerie" }
        ]
      }
    ]
  },
  {
    id: "financial-reports",
    name: "Etats Financiers",
    path: "/financial-reports",
    color: "indigo",
    navigation: [
      {
        name: "Dashboard",
        items: [
          { label: "Vue d'ensemble", path: "/financial-reports/dashboard" },
        ]
      },
      {
        name: "Rapports",
        items: [
          { label: "Tous les rapports", path: "/financial-reports" },
          { label: "Creer un rapport", path: "/financial-reports/new" },
        ]
      },
      {
        name: "Periodes",
        items: [
          { label: "Gerer les periodes", path: "/financial-reports/periods" },
        ]
      },
      {
        name: "Import",
        items: [
          { label: "Importer des donnees", path: "/financial-reports/import" },
        ]
      },
      {
        name: "Parametres",
        items: [
          { label: "Configuration", path: "/financial-reports/settings" },
          { label: "Etat financier", path: "/financial-reports/config" },
        ]
      }
    ]
  },
  {
    id: "inventory",
    name: "Stock",
    path: "/inventory",
    color: "amber",
    navigation: []
  },
  {
    id: "hr",
    name: "RH",
    path: "/hr",
    color: "rose",
    navigation: []
  }
];

// ===== UTILITAIRES DE COULEUR =====
const getColorClasses = (color, type) => {
  const classes = {
    violet: {
      text: "text-violet-700",
      bg: "bg-violet-50",
      hoverBg: "hover:bg-violet-100",
      border: "border-violet-200",
      activeBg: "bg-violet-100",
      dot: "bg-violet-600",
      lightBg: "bg-violet-50",
      lightText: "text-violet-600"
    },
    blue: {
      text: "text-blue-700",
      bg: "bg-blue-50",
      hoverBg: "hover:bg-blue-100",
      border: "border-blue-200",
      activeBg: "bg-blue-100",
      dot: "bg-blue-600",
      lightBg: "bg-blue-50",
      lightText: "text-blue-600"
    },
    emerald: {
      text: "text-emerald-700",
      bg: "bg-emerald-50",
      hoverBg: "hover:bg-emerald-100",
      border: "border-emerald-200",
      activeBg: "bg-emerald-100",
      dot: "bg-emerald-600",
      lightBg: "bg-emerald-50",
      lightText: "text-emerald-600"
    },
    amber: {
      text: "text-amber-700",
      bg: "bg-amber-50",
      hoverBg: "hover:bg-amber-100",
      border: "border-amber-200",
      activeBg: "bg-amber-100",
      dot: "bg-amber-600",
      lightBg: "bg-amber-50",
      lightText: "text-amber-600"
    },
    rose: {
      text: "text-rose-700",
      bg: "bg-rose-50",
      hoverBg: "hover:bg-rose-100",
      border: "border-rose-200",
      activeBg: "bg-rose-100",
      dot: "bg-rose-600",
      lightBg: "bg-rose-50",
      lightText: "text-rose-600"
    },
    indigo: {
      text: "text-indigo-700",
      bg: "bg-indigo-50",
      hoverBg: "hover:bg-indigo-100",
      border: "border-indigo-200",
      activeBg: "bg-indigo-100",
      dot: "bg-indigo-600",
      lightBg: "bg-indigo-50",
      lightText: "text-indigo-600"
    },
    gray: {
      text: "text-gray-700",
      bg: "bg-gray-50",
      hoverBg: "hover:bg-gray-100",
      border: "border-gray-200",
      activeBg: "bg-gray-100",
      dot: "bg-gray-600",
      lightBg: "bg-gray-50",
      lightText: "text-gray-600"
    },
  };
  return classes[color]?.[type] || classes.gray[type];
};

const decodeJwtPayload = (token) => {
  if (!token || typeof token !== "string" || !token.includes(".")) return null;
  try {
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    return JSON.parse(decodeURIComponent(escape(window.atob(padded))));
  } catch {
    try {
      const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
      const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
      return JSON.parse(window.atob(padded));
    } catch {
      return null;
    }
  }
};

const extractUserName = (value) => {
  if (!value) return "";
  if (typeof value === "string") return value.trim();

  const directName = (
    value.full_name ||
    value.fullName ||
    value.name ||
    value.nom_complet ||
    value.nomComplet ||
    value.display_name ||
    value.displayName ||
    value.username ||
    value.email ||
    ""
  );
  if (directName) return String(directName).trim();

  const firstLast = [
    value.first_name || value.firstName || value.prenom,
    value.last_name || value.lastName || value.nom,
  ].filter(Boolean).join(" ").trim();
  if (firstLast) return firstLast;

  const nestedKeys = ["user", "utilisateur", "profile", "profil", "data", "payload"];
  for (const key of nestedKeys) {
    const nestedName = extractUserName(value[key]);
    if (nestedName) return nestedName;
  }

  return "";
};

const getCurrentUserName = () => {
  const storageKeys = [
    "user_data",
    "user",
    "currentUser",
    "auth_user",
    "authUser",
    "utilisateur",
    "profile",
  ];

  for (const key of storageKeys) {
    const raw = localStorage.getItem(key);
    if (!raw) continue;
    try {
      const parsed = JSON.parse(raw);
      const name = extractUserName(parsed);
      if (name) return name;
    } catch {
      const name = extractUserName(raw);
      if (name) return name;
    }
  }

  const tokenKeys = ["access_token", "accessToken", "authToken", "token"];
  for (const key of tokenKeys) {
    const payload = decodeJwtPayload(localStorage.getItem(key));
    const name = extractUserName(payload);
    if (name) return name;
  }

  return "Utilisateur";
};

export default function UnifiedHeader() {
  const navigate = useNavigate();
  const location = useLocation();
  const [showModules, setShowModules] = useState(false);
  const [hoveredCategory, setHoveredCategory] = useState(null);
  const [showEntityMenu, setShowEntityMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [userEntities, setUserEntities] = useState([]);
  const [loadingEntities, setLoadingEntities] = useState(true);
  const [currentUserName, setCurrentUserName] = useState(getCurrentUserName);
  const modulesMenuRef = useRef(null);
  const navMenuRef = useRef(null);
  const entityMenuRef = useRef(null);
  const userMenuRef = useRef(null);

  const { activeEntity, selectEntity } = useEntity();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modulesMenuRef.current && !modulesMenuRef.current.contains(event.target)) {
        setShowModules(false);
      }
      if (navMenuRef.current && !navMenuRef.current.contains(event.target)) {
        setHoveredCategory(null);
      }
      if (entityMenuRef.current && !entityMenuRef.current.contains(event.target)) {
        setShowEntityMenu(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // === VERIFICATION DE L'EXISTENCE DE L'ENTITE ACTIVE ===
  useEffect(() => {
    const validateCurrentEntity = async () => {
      if (activeEntity?.id) {
        try {
          await apiClient.get(`/entites/${activeEntity.id}/`);
        } catch (error) {
          if (error.response?.status === 404) {
            localStorage.removeItem('currentEntite');
            localStorage.removeItem('entiteActive');
            localStorage.removeItem('entiteSelectedAt');
            selectEntity(null);
            window.location.reload();
          }
        }
      }
    };

    validateCurrentEntity();
  }, [activeEntity?.id, selectEntity]);

  // === DETECTION DU MODULE COURANT ===
  const currentModule = useMemo(() => {
    const isPathInModuleNavigation = (module) => module.navigation?.some((group) => (
      (group.path && location.pathname.startsWith(group.path)) ||
      group.items?.some((item) => location.pathname.startsWith(item.path))
    ));

    const matched = MODULES_CONFIG.find((mod) => (
      location.pathname.startsWith(mod.path) ||
      isPathInModuleNavigation(mod)
    ));
    return matched || MODULES_CONFIG[0];
  }, [location.pathname]);

  const { color, navigation } = currentModule;

  // === PAGE DE SELECTION D'ENTITE ===
  const isOnEntitySelectionPage = location.pathname === '/select-entite';

  // === CHARGER LES ENTITES ===
  useEffect(() => {
    const loadUserEntities = async () => {
      try {
        setLoadingEntities(true);
        const response = await apiClient.get('/entites/');
        const entities = Array.isArray(response)
          ? response
          : response?.results || response?.data || [];
        const activeEntities = entities.filter(e => e.statut);
        setUserEntities(activeEntities);
      } catch (err) {
        console.error('Erreur chargement entites:', err);
        setUserEntities([]);
      } finally {
        setLoadingEntities(false);
      }
    };

    loadUserEntities();
  }, []);

  // === CHARGER LE VRAI UTILISATEUR CONNECTE ===
  useEffect(() => {
    const loadCurrentUser = async () => {
      const localName = getCurrentUserName();
      if (localName && localName !== "Utilisateur") {
        setCurrentUserName(localName);
      }

      try {
        const response = await apiClient.get('/auth/users/me/');
        const apiName = extractUserName(response?.data ?? response);
        if (apiName) {
          setCurrentUserName(apiName);
          localStorage.setItem('user_data', JSON.stringify(response?.data ?? response));
        }
      } catch {
        const fallbackName = getCurrentUserName();
        setCurrentUserName(fallbackName || "Utilisateur");
      }
    };

    loadCurrentUser();
  }, []);

  // === DECONNEXION ===
  const handleLogout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("user");
    localStorage.removeItem("currentEntite");
    localStorage.removeItem("entiteActive");
    localStorage.removeItem("entiteSelectedAt");
    navigate("/login", { replace: true });
  };

  // === CHANGEMENT D'ENTITE ===
  const handleSelectEntity = (entity) => {
    selectEntity(entity);
    setShowEntityMenu(false);
    navigate('/dashboard', { replace: true });
  };

  // === CLASSES DE STYLE ===
  const textClass = getColorClasses(color, "text");
  const bgClass = getColorClasses(color, "bg");
  const lightBgClass = getColorClasses(color, "lightBg");
  const lightTextClass = getColorClasses(color, "lightText");
  const dotClass = getColorClasses(color, "dot");

  // === UTILITAIRES ===
  const isActive = (path) => location.pathname === path;

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
      <div className="px-6 py-3">
        <div className="flex items-center justify-between">
          {/* GAUCHE - SIMPLIFIEE : Seulement icone menu */}
          <div className="flex items-center">
            {/* Menu des modules */}
            <div className="relative" ref={modulesMenuRef}>
              <button
                onClick={() => !isOnEntitySelectionPage && setShowModules(!showModules)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                  isOnEntitySelectionPage
                    ? "text-gray-400 opacity-50 cursor-not-allowed"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                }`}
                title={isOnEntitySelectionPage ? "Navigation desactivee sur cette page" : "Changer de module"}
                disabled={isOnEntitySelectionPage}
              >
                <FiGrid size={18} />
                <span className="text-sm font-medium">{currentModule.name}</span>
                <FiChevronDown size={14} className={`transition-transform ${showModules ? "rotate-180" : ""}`} />
              </button>

              {showModules && !isOnEntitySelectionPage && (
                  <div
                    onMouseLeave={() => setShowModules(false)}
                    className="absolute top-full left-0 mt-1 w-44 bg-white border border-gray-300 shadow-lg rounded z-50"
                  >
                    <div className="px-4 py-2 border-b border-gray-200">
                      <p className="text-xs text-gray-500 font-medium">Modules ERP</p>
                    </div>
                    <div className="py-1">
                      {MODULES_CONFIG.map((module) => (
                        <button
                          key={module.id}
                          onClick={() => {
                            navigate(module.path + (module.path === "/dashboard" ? "" : "/dashboard"));
                            setShowModules(false);
                          }}
                          className={`w-full text-left px-4 py-2 text-sm transition-colors hover:bg-gray-50 ${
                            module.id === currentModule.id ? `${getColorClasses(module.color, "text")} font-medium` : "text-gray-700"
                          }`}
                        >
                          {module.name}
                        </button>
                      ))}
                    </div>
                  </div>
              )}
            </div>
          </div>

          {/* CENTRE : Navigation specifique au module - UNIQUEMENT SI ELLE EXISTE */}
          {!isOnEntitySelectionPage && navigation.length > 0 && (
            <nav className="flex items-center gap-6" ref={navMenuRef}>
              {navigation.map((item) => {
                const hasItems = item.items?.length > 0;
                const hasActiveItem = (item.path && location.pathname === item.path) || item.items?.some((sub) => location.pathname === sub.path) || false;

                return (
                  <div
                    key={item.name}
                    className="relative"
                  >
                    <div className="py-2 px-1 -mx-1">
                      <button
                        onClick={() => {
                          if (hasItems) {
                            setHoveredCategory((current) => current === item.name ? null : item.name);
                          } else if (item.path) {
                            setHoveredCategory(null);
                            navigate(item.path);
                          }
                        }}
                        className={`flex items-center gap-1 text-sm font-medium transition-colors ${
                          hasActiveItem ? textClass : "text-gray-700 hover:text-gray-900"
                        }`}
                      >
                        {item.name}
                        {hasItems && (
                          <FiChevronDown
                            className={`w-3 h-3 transition-transform ${hoveredCategory === item.name ? "rotate-180" : ""}`}
                          />
                        )}
                      </button>
                    </div>

                    {hasItems && hoveredCategory === item.name && (
                      <div
                        className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-300 shadow-lg rounded py-2 z-50 max-h-[400px] overflow-y-auto"
                        onMouseLeave={() => setHoveredCategory(null)}
                      >
                        {item.items.map((subItem) => (
                          <button
                            key={subItem.path}
                            onClick={() => {
                              setHoveredCategory(null);
                              navigate(subItem.path);
                            }}
                            className={`w-full px-4 py-2.5 text-sm text-left transition-colors flex items-center ${
                              location.pathname === subItem.path
                                ? `${bgClass} ${textClass} font-medium`
                                : "text-gray-700 hover:bg-gray-50"
                            }`}
                          >
                            <div className={`w-1 h-4 mr-3 ${location.pathname === subItem.path ? dotClass : "bg-gray-300"}`} />
                            {subItem.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>
          )}

          {/* DROITE : Actions utilisateur */}
          <div className="flex items-center gap-3">
            {/* Menu des entites */}
            <div className="relative" ref={entityMenuRef}>
              <button
                onClick={() => setShowEntityMenu(!showEntityMenu)}
                className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                  activeEntity
                    ? "text-gray-700 bg-gray-100 hover:bg-gray-200"
                    : `${lightTextClass} ${lightBgClass} hover:${getColorClasses(color, "hoverBg")}`
                }`}
              >
                <FiBriefcase size={16} />
                <span className="max-w-[140px] truncate">
                  {activeEntity ? activeEntity.raison_sociale : "Selectionner une entite"}
                </span>
                <FiChevronDown size={14} className={`transition-transform ${showEntityMenu ? 'rotate-180' : ''}`} />
              </button>

              {showEntityMenu && (
                  <div
                    onMouseLeave={() => setShowEntityMenu(false)}
                    className="absolute top-full right-0 mt-1 w-60 bg-white border border-gray-300 shadow-lg rounded z-50"
                  >
                    <div className="px-4 py-2 border-b border-gray-200">
                      <p className="text-xs text-gray-500 font-medium">
                        {activeEntity ? "Changer d'entite" : "Selectionner une entite"}
                      </p>
                    </div>
                    <div className="py-1 max-h-60 overflow-y-auto">
                      {loadingEntities ? (
                        <div className="px-4 py-2 text-sm text-gray-500">Chargement...</div>
                      ) : userEntities.length > 0 ? (
                        userEntities.map((entity) => (
                          <button
                            key={entity.id}
                            onClick={() => handleSelectEntity(entity)}
                            className={`w-full text-left px-4 py-2 text-sm transition-colors flex items-center gap-2 ${
                              activeEntity?.id === entity.id
                                ? `${lightBgClass} ${lightTextClass} font-medium`
                                : "text-gray-700 hover:bg-gray-50"
                            }`}
                          >
                            <FiBriefcase size={14} />
                            <span>{entity.raison_sociale}</span>
                            {!entity.statut && (
                              <span className="ml-auto text-xs text-red-500">(Inactif)</span>
                            )}
                          </button>
                        ))
                      ) : (
                        <div className="px-4 py-2 text-sm text-gray-500">Aucune entite active</div>
                      )}
                      <div className="border-t border-gray-200 mt-1 pt-1">
                        <button
                          onClick={() => {
                            setShowEntityMenu(false);
                            navigate('/entities');
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-purple-600 hover:bg-gray-50 font-medium flex items-center gap-2"
                        >
                          <FiPlus size={14} />
                          Creer une nouvelle entite
                        </button>
                      </div>
                    </div>
                  </div>
              )}
            </div>

            {/* Icones actions */}
            <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors relative">
              <FiBell size={18} />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                title="Menu utilisateur"
              >
                <FiUser size={20} />
              </button>


              {showUserMenu && (
                  <div
                    onMouseLeave={() => setShowUserMenu(false)}
                    className="absolute top-full right-0 mt-1 w-72 bg-white border border-gray-300 shadow-lg rounded z-50"
                  >
                    <div className="px-4 py-2 border-b border-gray-200">
                      <p className="truncate text-sm font-semibold text-gray-800">{currentUserName}</p>
                    </div>
                    <div className="py-1">
                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          navigate('/aide');
                        }}
                        className="flex w-full items-center gap-2 px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-50"
                        title="Lien vers notre site web"
                      >
                        <FiHelpCircle size={14} />
                        Aide
                      </button>
                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          navigate('/profile');
                        }}
                        className="flex w-full items-center gap-2 px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-50"
                        title="Langue, fuseau horaire, etc"
                      >
                        <FiSettings size={14} />
                        Mes préférences
                      </button>
                      <div className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700" title="En ligne, Absent, Ne pas déranger">
                        <FiWifi size={14} />
                        État de connexion
                      </div>
                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          handleLogout();
                        }}
                        className="flex w-full items-center gap-2 px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-50"
                      >
                        <FiPower size={14} />
                        Se déconnecter
                      </button>
                    </div>
                  </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
