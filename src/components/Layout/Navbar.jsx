import React from "react";
import { Bell, User } from "lucide-react";

const Navbar: React.FC = () => {
  return (
    <header className="flex items-center justify-between bg-white border-b px-6 py-3">
      <h1 className="text-lg font-semibold">Tableau de bord</h1>
      <div className="flex items-center gap-4">
        <button className="relative">
          <Bell size={20} />
          <span className="absolute top-0 right-0 h-2 w-2 bg-red-500 rounded-full"></span>
        </button>
        <div className="flex items-center gap-2">
          <User size={20} />
          <span className="text-sm font-medium">Admin</span>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
