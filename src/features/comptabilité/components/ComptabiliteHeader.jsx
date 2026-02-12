// C:\python\django\somane_frontend\src\features\comptabilité\components\ComptabiliteHeader.jsx
import { useNavigate, useLocation } from "react-router-dom";
import { useState } from "react";
import { FiChevronDown, FiPower, FiUser, FiBell, FiArrowLeft, FiGrid } from "react-icons/fi";

export default function ComptabiliteHeader() {
  const navigate = useNavigate();
  const location = useLocation();
  const [showModuleDropdown, setShowModuleDropdown] = useState(false);
  const [hoveredCategory, setHoveredCategory] = useState(null);

  // Modules ERP SIMPLIFIÉS
  const modules = [
    { id: 'dashboard', name: 'Noyau', path: '/dashboard' },
    { id: 'sales', name: 'Ventes', path: '/sales' },
    { id: 'achats', name: 'Achats', path: '/achats' },
    { id: 'accounting', name: 'Comptabilité', path: '/comptabilite/dashboard' },
    { id: 'inventory', name: 'Stock', path: '/inventory' },
    { id: 'hr', name: 'RH', path: '/hr' }
  ];

  // Navigation modifiée (inchangée)
  const navigationItems = [
    {
      name: "Tableau de bord",
      path: "/comptabilite/dashboard",
      isDirectLink: true
    },
    {
      name: "Structure",
      items: [
        { label: "Partenaires", path: "/comptabilite/partenaires" },
        { label: "Plans comptable", path: "/comptabilite/plans-comptable" }, // ← NOUVEAU LIEN VERS TA PAGE
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
        { label: "compte ", path: "/comptabilite/accounts/" },
        { label: "plans comptable", path: "/comptabilite/accounts/new" },
        { label: "compte ", path: "/comptabilite/accounts/" },
        { label: "framework ", path: "/comptabilite/frameworks/" },
        { label: "groupe ", path: "/comptabilite/groups/" },

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
  ];

  const isActive = (path) => location.pathname === path;
  const canGoBack = location.pathname !== '/comptabilite/dashboard';

  const handleGoBack = () => {
    navigate(-1);
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-200">
      <div className="px-6 py-3">
        <div className="flex items-center justify-between">
          {/* PARTIE GAUCHE : Icône grille + Nom module + Navigation */}
          <div className="flex items-center gap-4">
            {/* 🔹 Icône grille pour changer de module */}
            <div className="relative">
              <button
                onClick={() => setShowModuleDropdown(!showModuleDropdown)}
                className="p-2 text-gray-600 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-colors"
                title="Changer de module"
              >
                <FiGrid size={18} />
              </button>

              {showModuleDropdown && (
                <>
                  <div 
                    className="fixed inset-0 z-30"
                    onClick={() => setShowModuleDropdown(false)}
                  />
                  <div className="absolute top-full left-0 mt-1 w-44 bg-white rounded-lg shadow-lg border border-gray-200 z-40">
                    <div className="px-4 py-2 border-b border-gray-100">
                      <p className="text-xs text-gray-500 font-medium">Modules ERP</p>
                    </div>
                    <div className="py-1">
                      {modules.map((module) => (
                        <button
                          key={module.id}
                          onClick={() => {
                            navigate(module.path);
                            setShowModuleDropdown(false);
                          }}
                          className={`w-full text-left px-4 py-2 text-sm transition-colors hover:bg-gray-50 ${
                            module.id === 'accounting'
                              ? 'text-violet-600 font-medium'
                              : 'text-gray-700'
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

            {/* 🔹 Nom du module */}
            <span className="text-lg font-semibold text-violet-700">
              Comptabilité
            </span>

            {/* 🔹 Navigation par onglets */}
            <nav className="flex items-center gap-1 ml-2">
              {navigationItems.map((item) => {
                if (item.isDirectLink) {
                  return (
                    <button
                      key={item.name}
                      onClick={() => navigate(item.path)}
                      className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
                        isActive(item.path)
                          ? 'bg-violet-100 text-violet-700 border border-violet-200'
                          : 'text-gray-600 hover:text-violet-700 hover:bg-gray-100'
                      }`}
                    >
                      {item.name}
                    </button>
                  );
                }

                const hasActiveItem = item.items?.some(sub => isActive(sub.path)) || false;

                return (
                  <div
                    key={item.name}
                    className="relative"
                    onMouseEnter={() => setHoveredCategory(item.name)}
                    onMouseLeave={() => setHoveredCategory(null)}
                  >
                    <button
                      className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors whitespace-nowrap flex items-center gap-1 ${
                        hasActiveItem
                          ? 'text-violet-700'
                          : 'text-gray-600 hover:text-violet-700'
                      }`}
                    >
                      {item.name}
                      <FiChevronDown className={`w-3 h-3 transition-transform ${
                        hoveredCategory === item.name ? 'rotate-180' : ''
                      }`} />
                    </button>

                    {hoveredCategory === item.name && (
                      <div 
                        className="absolute top-full left-0 mt-0 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50 min-w-[220px] max-h-[400px] overflow-y-auto"
                        onMouseEnter={() => setHoveredCategory(item.name)}
                        onMouseLeave={() => setHoveredCategory(null)}
                      >
                        {item.items.map((subItem) => (
                          <button
                            key={subItem.path}
                            onClick={() => navigate(subItem.path)}
                            className={`w-full px-4 py-2.5 text-sm text-left transition-colors flex items-center ${
                              isActive(subItem.path)
                                ? 'bg-violet-50 text-violet-700 font-medium'
                                : 'text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            <div className={`w-1 h-4 mr-3 ${
                              isActive(subItem.path) ? 'bg-violet-600' : 'bg-gray-300'
                            }`} />
                            {subItem.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>
          </div>

          {/* PARTIE DROITE : Actions */}
          <div className="flex items-center gap-3">
            <button className="p-2 text-gray-600 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-colors relative">
              <FiBell size={18} />
              <div className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full"></div>
            </button>
            
            <button className="p-2 text-gray-600 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-colors">
              <FiUser size={20} />
            </button>
            
            <button
              onClick={() => {
                localStorage.removeItem("authToken");
                localStorage.removeItem("user");
                navigate("/login");
              }}
              className="p-2 text-gray-600 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-colors"
              title="Déconnexion"
            >
              <FiPower size={18} /> {/* 🔹 Remplacé FiLogOut par FiPower */}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}