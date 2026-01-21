import { Outlet } from "react-router-dom";
import VenteHeader from "../components/VenteHeader";

export default function VenteLayout() {
  return (
    <div className="flex h-screen bg-gray-50">
      {/* Contenu principal - pleine largeur sans sidebar */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <VenteHeader />
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}