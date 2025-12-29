// components/ComptabiliteHeader.jsx
import { useNavigate, useLocation } from "react-router-dom";
import { useState } from "react";
import { FiChevronDown, FiLogOut, FiUser, FiBell, FiArrowLeft } from "react-icons/fi";

export default function ComptabiliteHeader() {
  const navigate = useNavigate();
  const location = useLocation();
  const [showModuleDropdown, setShowModuleDropdown] = useState(false);
  const [hoveredCategory, setHoveredCategory] = useState(null);

  // Modules ERP SIMPLIFIÉS
  const modules = [
    { id: 'dashboard', name: 'Noyau', path: '/dashboard' },
    { id: 'sales', name: 'Ventes', path: '/sales' },
    { id: 'purchase', name: 'Achats', path: '/achats' },
    { id: 'accounting', name: 'Comptabilité', path: '/comptabilite/standards' },
    { id: 'inventory', name: 'Stock', path: '/inventory' },
    { id: 'hr', name: 'RH', path: '/hr' }
  ];

  // Titres des pages (garder les vôtres)
  const pageTitles = {
    '/comptabilite/dashboard': 'Tableau de Bord',
    '/comptabilite/plan-comptable': 'Plan Comptable',
    '/comptabilite/taux-fiscaux': 'Taux Fiscaux',
    '/comptabilite/positions-fiscales': 'Positions Fiscales',
    '/comptabilite/journaux': 'Journaux',
    '/comptabilite/pieces': 'Pièces',
    '/comptabilite/lignes': 'Lignes',
    '/comptabilite/releves': 'Relevés',
    '/comptabilite/lettrage': 'Lettrage',
    '/comptabilite/grand-livre': 'Grand Livre',
    '/comptabilite/balance': 'Balance',
    '/comptabilite/bilan': 'Bilan',
    '/comptabilite/exercices': 'Exercices',
    '/comptabilite/parametres': 'Paramètres'
  };

  // MODIFICATION : Navigation selon l'image
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

  // Titre actuel
  const currentTitle = pageTitles[location.pathname] || "Comptabilité";

  const isActive = (path) => location.pathname === path;

  // Vérifier si on peut retourner en arrière (pas sur le dashboard)
  const canGoBack = location.pathname !== '/comptabilite/dashboard';

  const handleGoBack = () => {
    navigate(-1); // Retour en arrière
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-200">
      <div className="px-6 py-3">
        {/* Ligne unique */}
        <div className="flex items-center justify-between">
          {/* PARTIE GAUCHE : Module dropdown + Titre */}
          <div className="flex items-center gap-4">
            {/* Dropdown Module */}
            <div className="relative">
              <button
                onClick={() => setShowModuleDropdown(!showModuleDropdown)}
                className="flex items-center gap-2 px-4 py-2 bg-violet-50 hover:bg-violet-100 text-violet-700 rounded-lg font-medium transition-colors border border-violet-200"
              >
                <span>Comptabilité</span>
                <FiChevronDown className={`w-3 h-3 transition-transform ${showModuleDropdown ? 'rotate-180' : ''}`} />
              </button>

              {/* DROPDOWN MODULES */}
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

            {/* Séparateur */}
            <div className="h-6 w-px bg-gray-300"></div>

            {/* Bouton Retour */}
            {canGoBack && (
              <button
                onClick={handleGoBack}
                className="p-1.5 text-gray-600 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-colors"
                title="Retour"
              >
                <FiArrowLeft size={18} />
              </button>
            )}

            {/* Titre de la page */}
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-violet-500"></div>
              <h1 className="text-base font-medium text-gray-800">
                {currentTitle}
              </h1>
            </div>
          </div>

          {/* PARTIE CENTRE : Navigation MODIFIÉE */}
          <nav className="flex items-center gap-6">
            {navigationItems.map((item) => {
              // Tableau de bord - Lien direct
              if (item.isDirectLink) {
                return (
                  <button
                    key={item.name}
                    onClick={() => navigate(item.path)}
                    className={`px-4 py-2 text-sm font-medium transition-colors rounded-lg ${
                      isActive(item.path)
                        ? 'bg-violet-100 text-violet-700'
                        : 'text-gray-700 hover:text-violet-600 hover:bg-gray-100'
                    }`}
                  >
                    {item.name}
                  </button>
                );
              }

              // Catégories avec dropdown
              const hasActiveItem = item.items?.some(sub => isActive(sub.path)) || false;
              
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
                        hasActiveItem
                          ? 'text-violet-700'
                          : 'text-gray-700 hover:text-violet-600'
                      }`}
                    >
                      {item.name}
                      <FiChevronDown className={`w-3 h-3 transition-transform ${
                        hoveredCategory === item.name ? 'rotate-180' : ''
                      }`} />
                    </button>
                  </div>

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

          {/* PARTIE DROITE : Actions (inchangé) */}
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
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-colors border border-gray-300 hover:border-violet-300"
            >
              Déconnexion
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}