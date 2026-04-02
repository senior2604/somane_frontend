// src/features/achat/layouts/AchatLayout.jsx
import { Outlet } from "react-router-dom";
import Header from "../../../components/Header"; // ← chemin relatif, PAS @/

export default function AchatLayout() {
  return (
    <div className="flex h-screen bg-gray-50">
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}