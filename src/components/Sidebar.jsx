import { useState } from "react";
import { FiHome, FiUsers, FiSettings, FiLogOut } from "react-icons/fi";

export default function Sidebar() {
  const [active, setActive] = useState("Dashboard");

  const menu = [
    { name: "Dashboard", icon: <FiHome /> },
    { name: "Utilisateurs", icon: <FiUsers /> },
    { name: "Entités", icon: <FiUsers /> },
    { name: "Modules", icon: <FiSettings /> },
    { name: "Paramètres", icon: <FiSettings /> },
  ];

  return (
    <aside className="w-64 bg-gradient-to-b from-indigo-700 to-indigo-900 text-white flex flex-col">
      <div className="p-6 text-center font-bold text-xl tracking-tight border-b border-indigo-600">
        SOMANE ERP
      </div>
      <nav className="flex-1 px-4 py-6 space-y-2">
        {menu.map((item) => (
          <button
            key={item.name}
            onClick={() => setActive(item.name)}
            className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm transition ${
              active === item.name
                ? "bg-indigo-600 shadow"
                : "hover:bg-indigo-700/60"
            }`}
          >
            <span className="text-lg">{item.icon}</span>
            <span>{item.name}</span>
          </button>
        ))}
      </nav>
      <div className="p-4 border-t border-indigo-700">
        <button className="w-full flex items-center justify-center gap-2 py-2 bg-indigo-800 rounded-lg hover:bg-indigo-700 transition text-sm">
          <FiLogOut /> Déconnexion
        </button>
      </div>
    </aside>
  );
}
