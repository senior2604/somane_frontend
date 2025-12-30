// features/achats/layouts/AchatLayout.jsx
import { Outlet } from "react-router-dom";
import { useState } from "react";
import AchatHeader from "../components/AchatHeader";

export default function AchatLayout() {
  return (
    <div className="flex h-screen bg-gray-50">
      {/* Contenu principal - pleine largeur sans sidebar */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <AchatHeader />
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}