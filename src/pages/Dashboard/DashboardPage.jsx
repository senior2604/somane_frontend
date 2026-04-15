import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import {
  FiDollarSign,
  FiTrendingUp,
  FiShoppingCart,
  FiPackage,
  FiUsers,
  FiBriefcase,
  FiClipboard,
  FiUser,
  FiBarChart2,
  FiSettings,
  FiShoppingBag,
  FiFileText,
  FiTool,
  FiDatabase,
  FiCreditCard,
  FiZap
} from "react-icons/fi";

export default function DashboardPage() {
  const navigate = useNavigate();
  const [hoveredModule, setHoveredModule] = useState(null);

  // Couleurs dynamiques pour chaque module
  const colorSchemes = [
    'from-blue-500 to-blue-600',
    'from-emerald-500 to-emerald-600',
    'from-violet-500 to-violet-600',
    'from-amber-500 to-amber-600',
    'from-rose-500 to-rose-600',
    'from-cyan-500 to-cyan-600',
    'from-indigo-500 to-indigo-600',
    'from-orange-500 to-orange-600',
    'from-purple-500 to-purple-600',
    'from-teal-500 to-teal-600',
    'from-pink-500 to-pink-600',
    'from-green-500 to-green-600',
    'from-red-500 to-red-600',
    'from-sky-500 to-sky-600',
    'from-lime-500 to-lime-600'
  ];

  const modules = [
    { id: 'accounting', name: 'Comptabilité', icon: <FiDollarSign /> },
    { id: 'sales', name: 'Ventes', icon: <FiTrendingUp /> },
    { id: 'achats', name: 'Achats', icon: <FiShoppingCart /> },
    { id: 'inventory', name: 'Stock', icon: <FiPackage /> },
    { id: 'hr', name: 'RH', icon: <FiUsers /> },
    { id: 'manufacturing', name: 'Production', icon: <FiBriefcase /> },
    { id: 'projects', name: 'Projets', icon: <FiClipboard /> },
    { id: 'crm', name: 'CRM', icon: <FiUser /> },
    { id: 'reports', name: 'Reporting', icon: <FiBarChart2 /> },
    { id: 'catalogue', name: 'Catalogue', icon: <FiShoppingBag /> },
    { id: 'documents', name: 'Documents', icon: <FiFileText /> },
    { id: 'administration', name: 'Admin', icon: <FiSettings /> },
    { id: 'maintenance', name: 'Maintenance', icon: <FiTool /> },
    { id: 'database', name: 'Base de données', icon: <FiDatabase /> },
    { id: 'bank', name: 'Bancaire', icon: <FiCreditCard /> }
  ];

  // Chemins correspondants (tu peux adapter selon ta structure)
  const getModulePath = (id) => {
    const paths = {
      accounting: '/comptabilite/Dashboard',
      sales: '/sales',
      achats: '/achats',
      inventory: '/inventory',
      hr: '/hr',
      manufacturing: '/manufacturing',
      projects: '/projects',
      crm: '/crm',
      reports: '/financial-reports',
      catalogue: '/catalogue',
      documents: '/documents',
      administration: '/admin',
      maintenance: '/maintenance',
      database: '/database',
      bank: '/bank'
    };
    return paths[id] || '/';
  };

  // Animation d'entrée progressive
  useEffect(() => {
    const timer = setTimeout(() => {
      document.querySelectorAll('.module-card').forEach((card, index) => {
        card.style.animationDelay = `${index * 0.05}s`;
        card.classList.add('animate-fade-in-up');
      });
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  const handleModuleClick = (id) => {
    navigate(getModulePath(id));
  };

  return (
    <div className="min-h-screen p-6 bg-gradient-to-br from-gray-50 to-white">
      {/* Header simple */}
      <div className="mb-10 text-center">
        <div className="inline-flex items-center gap-3 mb-3">
          <div className="p-3 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600">
            <FiZap className="text-2xl text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-800">Modules ERP</h1>
        </div>
        <p className="text-gray-500">
          Accédez à tous les modules de votre système
        </p>
      </div>

      {/* Grille de modules */}
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
          {modules.map((module, index) => {
            const colorIndex = index % colorSchemes.length;
            const isHovered = hoveredModule === module.id;
            
            return (
              <button
                key={module.id}
                onClick={() => handleModuleClick(module.id)}
                onMouseEnter={() => setHoveredModule(module.id)}
                onMouseLeave={() => setHoveredModule(null)}
                className="module-card opacity-0 relative group"
              >
                {/* Carte principale */}
                <div className={`
                  relative h-48 rounded-2xl border-2 border-white
                  bg-gradient-to-br ${colorSchemes[colorIndex]}
                  shadow-lg hover:shadow-2xl
                  transform transition-all duration-300
                  ${isHovered ? 'scale-105 -translate-y-2' : 'scale-100'}
                  overflow-hidden
                `}>
                  
                  {/* Effet de brillance au hover */}
                  <div className={`
                    absolute inset-0 bg-gradient-to-t from-white/20 to-transparent
                    transition-opacity duration-300
                    ${isHovered ? 'opacity-100' : 'opacity-0'}
                  `} />
                  
                  {/* Contenu */}
                  <div className="relative h-full flex flex-col items-center justify-center p-4 text-white">
                    <div className={`
                      p-4 rounded-2xl bg-white/20 backdrop-blur-sm mb-4
                      transform transition-transform duration-300
                      ${isHovered ? 'scale-110 rotate-3' : 'scale-100'}
                    `}>
                      <div className="text-2xl">
                        {module.icon}
                      </div>
                    </div>
                    
                    <h3 className="text-lg font-semibold text-center mb-2">
                      {module.name}
                    </h3>
                    
                    {/* Indicateur de clic */}
                    <div className={`
                      flex items-center gap-1 text-sm font-medium text-white/80
                      transition-all duration-300
                      ${isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}
                    `}>
                      <span>Cliquer pour ouvrir</span>
                      <svg 
                        className={`w-4 h-4 transition-transform duration-300 ${isHovered ? 'translate-x-1' : ''}`}
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </div>
                
                {/* Ombre portée dynamique */}
                <div className={`
                  absolute inset-0 rounded-2xl bg-gradient-to-br ${colorSchemes[colorIndex].replace('500', '700').replace('600', '800')}
                  blur-xl opacity-0 group-hover:opacity-50
                  transition-opacity duration-500
                  -z-10
                `} />
              </button>
            );
          })}
        </div>
      </div>

      {/* Footer minimal */}
      <div className="mt-16 text-center">
        <div className="inline-flex items-center gap-4 text-sm text-gray-400">
          <span>{modules.length} modules disponibles</span>
          <span className="w-1 h-1 rounded-full bg-gray-300"></span>
          <span>Système ERP</span>
        </div>
      </div>

      {/* Styles d'animation */}
      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in-up {
          animation: fadeInUp 0.5s ease-out forwards;
        }
      `}</style>
    </div>
  );
}