import React from "react";
import { Home, Users, Settings, LogOut, Database, Layers } from "lucide-react";

const Sidebar: React.FC = () => {
  const menu = [
    { name: "Dashboard", icon: <Home size={18} />, path: "/" },
    { name: "Utilisateurs", icon: <Users size={18} />, path: "/users" },
    { name: "Entités", icon: <Database size={18} />, path: "/entities" },
    { name: "Modules", icon: <Layers size={18} />, path: "/modules" },
    { name: "Paramètres", icon: <Settings size={18} />, path: "/settings" },
  ];

  return (
    <aside className="w-64 bg-white border-r flex flex-col justify-between">
      <div>
        <div className="p-4 text-xl font-bold text-red-600">SOMANE ERP</div>
        <nav className="mt-4 space-y-1">
          {menu.map((item) => (
            <a
              key={item.name}
              href={item.path}
              className="flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-red-100 hover:text-red-700"
            >
              {item.icon}
              <span>{item.name}</span>
            </a>
          ))}
        </nav>
      </div>

      <div className="p-4 border-t">
        <button className="flex items-center gap-2 text-gray-700 hover:text-red-600">
          <LogOut size={18} />
          Déconnexion
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
