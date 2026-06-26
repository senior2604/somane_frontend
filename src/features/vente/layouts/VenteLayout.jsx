// src/features/vente/layouts/VenteLayout.jsx
import { Outlet } from "react-router-dom";
import Header from "../../../components/Header"; // ← UN SEUL import

export default function VenteLayout() {
  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <Header />
      <main className="flex-1 overflow-auto p-6">
        <Outlet />
      </main>
    </div>
  );
}