// src/components/UnifiedHeader.jsx
import { useNavigate, useLocation } from "react-router-dom";
import { useState, useMemo, useEffect } from "react";
import {
  FiBell,
  FiChevronDown,
  FiUser,
  FiPower,
  FiGrid,
  FiPlus,
  FiBriefcase
} from "react-icons/fi";
import { useEntity } from '../context/EntityContext';
import { apiClient } from '../services/apiClient';

// ===== CONFIGURATION CENTRALISÉE DES MODULES =====
const MODULES_CONFIG = [
  {
    id: "dashboard",
    name: "Accueil", // ← MODIFIÉ : "Noyau" → "Accueil"
    path: "/dashboard",
    color: "gray",
    navigation: [] // ← NAVIGATION VIDÉE POUR ACCUEIL
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
          { label: "Commandes Client", path: "/vente/commandes-client" },
          { label: "Lignes Commande", path: "/vente/lignes-commande-client" }
        ]
      },
      {
        name: "Analyse",
        items: [
          { label: "Reporting Ventes", path: "/vente/reporting-ventes" }
        ]
      },
      {
        name: "Équipes",
        items: [
          { label: "Équipes Commerciales", path: "/vente/equipes-commerciales" }
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
        name: "Références",
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
        name: "Structure",
        items: [
          { label: "Partenaires", path: "/comptabilite/partenaires" },
          { label: "Plans comptables", path: "/comptabilite/plan-comptable" },
          { label: "Journaux", path: "/comptabilite/journaux" },
          { label: "Devises", path: "/comptabilite/devises" },
          { label: "Taxes", path: "/comptabilite/taux-fiscaux" },
          { label: "Positions fiscales", path: "/comptabilite/positions-fiscales" },
          { label: "Réimputations", path: "/comptabilite/reimputations" },
          { label: "Vétrouillage des journaux", path: "/comptabilite/vetrouillage" },
          { label: "Relèves bancaires", path: "/comptabilite/releves-bancaires" },
          { label: "Exercices", path: "/comptabilite/exercices" }
        ]
      },
      
    {
      name: "Plans comptable",
      items: [

        { label: "parametrage", path: "/comptabilite/parametrage/longueur-compte" },
        { label: "plans comptable", path: "/comptabilite/accounts/new" },
        { label: "compte ", path: "/comptabilite/accounts/" },
        { label: "framework ", path: "/comptabilite/frameworks/" },
        { label: "groupe ", path: "/comptabilite/groups/" },
        { label: "types ", path: "/comptabilite/types/" },
        { label: "Plans comptable", path: "/comptabilite/plans" }, // ← NOUVEAU LIEN VERS TA PAGE
      ]
    },


      {
        name: "Traitements",
        items: [
          { label: "Pièces comptables", path: "/comptabilite/pieces" },
          { label: "Lettrage des comptes", path: "/comptabilite/lettrage" },
          { label: "Immobilisation", path: "/comptabilite/immobilisation" },
          { label: "Emprunts", path: "/comptabilite/emprunts" },
          { label: "Etat de rapprochement", path: "/comptabilite/rapprochement" }
        ]
      },
      {
        name: "Analyse & Etat",
        items: [
          { label: "Grand-Livre", path: "/comptabilite/grand-livre" },
          { label: "Grand-Livre partenaires", path: "/comptabilite/grand-livre-partenaires" },
          { label: "Balance générale", path: "/comptabilite/balance" },
          { label: "Balance des partenaires", path: "/comptabilite/balance-partenaires" },
          { label: "Balance agée", path: "/comptabilite/balance-agee" },
          { label: "Analyse des emprunts", path: "/comptabilite/analyse-emprunts" },
          { label: "Analyse déclaration TVA", path: "/comptabilite/analyse-tva" },
          { label: "Tableaux des amortissements", path: "/comptabilite/amortissements" },
          { label: "Bilan", path: "/comptabilite/bilan" },
          { label: "Compte de résultat", path: "/comptabilite/compte-resultat" },
          { label: "Flux de trésorerie", path: "/comptabilite/flux-tresorerie" }
        ]
      },
      {
        name: "Paramètres",
        items: [
          { label: "Paramètres généraux", path: "/comptabilite/parametres" },
          { label: "Configuration", path: "/comptabilite/configuration" }
        ]
      }
    ]
  },
  {
    id: "financial-reports",
    name: "États Financiers",
    path: "/financial-reports",
    color: "indigo",
    navigation: [
            {
        name: "dashboard",
        items: [
          { label: "dashboard", path: "/financial-reports/dashboard" },
        ]
      },
      {
        name: "Rapports",
        items: [
          { label: "Tous les rapports", path: "/financial-reports" },
          { label: "Créer un rapport", path: "/financial-reports/new" },
        ]
      },
      {
        name: "Périodes",
        items: [
          { label: "Gérer les périodes", path: "/financial-reports/periods" },
        ]
      },
      {
        name: "Import",
        items: [
          { label: "Importer des données", path: "/financial-reports/import" },
        ]
      },
      {
        name: "Paramètres",
        items: [
          { label: "Configuration", path: "/financial-reports/settings" },
        ]
      }
    ]
  },
  {
    id: "inventory",
    name: "Stock",
    path: "/inventory",
    color: "amber",
    navigation: [] // ← NAVIGATION VIDÉE POUR STOCK
  },
  {
    id: "hr",
    name: "RH",
    path: "/hr",
    color: "rose",
    navigation: [] // ← NAVIGATION VIDÉE POUR RH
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

export default function UnifiedHeader() {
  const navigate = useNavigate();
  const location = useLocation();
  const [showModules, setShowModules] = useState(false);
  const [hoveredCategory, setHoveredCategory] = useState(null);
  const [showEntityMenu, setShowEntityMenu] = useState(false);
  const [userEntities, setUserEntities] = useState([]);
  const [loadingEntities, setLoadingEntities] = useState(true);

  const { activeEntity, selectEntity } = useEntity();

  // === VÉRIFICATION DE L'EXISTENCE DE L'ENTITÉ ACTIVE ===
  useEffect(() => {
    const validateCurrentEntity = async () => {
      if (activeEntity?.id) {
        try {
          await apiClient.get(`/entites/${activeEntity.id}/`);
        } catch (error) {
          if (error.response?.status === 404) {
            // Entité supprimée, nettoyer localStorage
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

  // === DÉTECTION DU MODULE COURANT ===
  const currentModule = useMemo(() => {
    const matched = MODULES_CONFIG.find((mod) =>
      location.pathname.startsWith(mod.path)
    );
    return matched || MODULES_CONFIG[0];
  }, [location.pathname]);

  const { id, color, navigation } = currentModule;

  // === PAGE DE SÉLECTION D'ENTITÉ ===
  const isOnEntitySelectionPage = location.pathname === '/select-entite';

  // === CHARGER LES ENTITÉS ===
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
        console.error('Erreur chargement entités:', err);
        setUserEntities([]);
      } finally {
        setLoadingEntities(false);
      }
    };

    loadUserEntities();
  }, []);

  // === DÉCONNEXION ===
  const handleLogout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("user");
    localStorage.removeItem("currentEntite");
    localStorage.removeItem("entiteActive");
    localStorage.removeItem("entiteSelectedAt");
    navigate("/login", { replace: true });
  };

  // === CHANGEMENT D'ENTITÉ ===
  const handleSelectEntity = (entity) => {
    selectEntity(entity);
    setShowEntityMenu(false);
    navigate('/dashboard', { replace: true });
  };

  // === CLASSES DE STYLE ===
  const textClass = getColorClasses(color, "text");
  const bgClass = getColorClasses(color, "bg");
  const activeBgClass = getColorClasses(color, "activeBg");
  const lightBgClass = getColorClasses(color, "lightBg");
  const lightTextClass = getColorClasses(color, "lightText");
  const dotClass = getColorClasses(color, "dot");

  // === UTILITAIRES ===
  const isActive = (path) => location.pathname === path;

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
      <div className="px-6 py-3">
        <div className="flex items-center justify-between">
          {/* GAUCHE - SIMPLIFIÉE : Seulement icône menu */}
          <div className="flex items-center">
            {/* Menu des modules */}
            <div className="relative">
              <button
                onClick={() => !isOnEntitySelectionPage && setShowModules(!showModules)}
                className={`p-2 rounded-lg transition-colors ${
                  isOnEntitySelectionPage
                    ? "text-gray-400 opacity-50 cursor-not-allowed"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                }`}
                title={isOnEntitySelectionPage ? "Navigation désactivée sur cette page" : "Changer de module"}
                disabled={isOnEntitySelectionPage}
              >
                <FiGrid size={18} />
              </button>

              {showModules && !isOnEntitySelectionPage && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setShowModules(false)} />
                  <div className="absolute top-full left-0 mt-1 w-44 bg-white rounded-lg shadow-lg border border-gray-200 z-40">
                    <div className="px-4 py-2 border-b border-gray-100">
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
                </>
              )}
            </div>
          </div>

          {/* CENTRE : Navigation spécifique au module - UNIQUEMENT SI ELLE EXISTE */}
          {!isOnEntitySelectionPage && navigation.length > 0 && (
            <nav className="flex items-center gap-6">
              {navigation.map((item) => {
                const hasActiveItem = item.items?.some((sub) => location.pathname === sub.path) || false;

                return (
                  <div
                    key={item.name}
                    className="relative"
                    onMouseEnter={() => setHoveredCategory(item.name)}
                    onMouseLeave={() => setHoveredCategory(null)}
                  >
                    <div className="py-2 px-1 -mx-1">
                      <button
                        className={`flex items-center gap-1 text-sm font-medium transition-colors ${
                          hasActiveItem ? textClass : "text-gray-700 hover:text-gray-900"
                        }`}
                      >
                        {item.name}
                        <FiChevronDown
                          className={`w-3 h-3 transition-transform ${hoveredCategory === item.name ? "rotate-180" : ""}`}
                        />
                      </button>
                    </div>

                    {hoveredCategory === item.name && (
                      <div
                        className="absolute top-full left-0 mt-0 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50 max-h-[400px] overflow-y-auto"
                        onMouseEnter={() => setHoveredCategory(item.name)}
                        onMouseLeave={() => setHoveredCategory(null)}
                      >
                        {item.items.map((subItem) => (
                          <button
                            key={subItem.path}
                            onClick={() => navigate(subItem.path)}
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
            {/* Menu des entités */}
            <div className="relative">
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
                  {activeEntity ? activeEntity.raison_sociale : "Sélectionner une entité"}
                </span>
                <FiChevronDown size={14} className={`transition-transform ${showEntityMenu ? 'rotate-180' : ''}`} />
              </button>

              {showEntityMenu && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setShowEntityMenu(false)} />
                  <div className="absolute top-full right-0 mt-1 w-60 bg-white rounded-lg shadow-lg border border-gray-200 z-40">
                    <div className="px-4 py-2 border-b border-gray-100">
                      <p className="text-xs text-gray-500 font-medium">
                        {activeEntity ? "Changer d'entité" : "Sélectionner une entité"}
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
                        <div className="px-4 py-2 text-sm text-gray-500">Aucune entité active</div>
                      )}
                      <div className="border-t border-gray-100 mt-1 pt-1">
                        <button
                          onClick={() => {
                            setShowEntityMenu(false);
                            navigate('/entities');
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-violet-600 hover:bg-violet-50 font-medium flex items-center gap-2"
                        >
                          <FiPlus size={14} />
                          Créer une nouvelle entité
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Icônes actions */}
            <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors relative">
              <FiBell size={18} />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>
            <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
              <FiUser size={20} />
            </button>
            <button
              onClick={handleLogout}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              title="Déconnexion"
            >
              <FiPower size={18} />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}