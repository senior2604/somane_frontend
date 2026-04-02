// src/features/financial-reports/layouts/FinancialReportsLayout.jsx
import { Outlet } from "react-router-dom";
import Header from "../../../components/Header"; // ← chemin relatif vers ton header unifié

export default function FinancialReportsLayout() {
  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <Header />
      <main className="flex-1 overflow-auto p-6">
        <Outlet />
      </main>
    </div>
  );
}