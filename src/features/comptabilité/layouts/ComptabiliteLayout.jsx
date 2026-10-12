// src/features/comptabilité/layouts/ComptabiliteLayout.jsx
import { Outlet } from "react-router-dom";
import Header from "../../../components/Header";
import { UiProvider } from "../../../context/UiContext";

export default function ComptabiliteLayout() {
  return (
    <UiProvider>
      <div className="flex flex-col h-screen bg-gray-50">
        <Header />
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </UiProvider>
  );
}
