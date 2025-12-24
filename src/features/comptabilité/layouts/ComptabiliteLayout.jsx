// features/comptabilité/layouts/ComptabiliteLayout.jsx
import { Outlet } from "react-router-dom";
import ComptabiliteHeader from "../components/ComptabiliteHeader";  // ← 2 points seulement

export default function ComptabiliteLayout() {
  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <ComptabiliteHeader />
      <main className="flex-1 overflow-auto p-6">
        <Outlet />
      </main>
    </div>
  );
}