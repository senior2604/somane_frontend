import { Outlet, Navigate } from "react-router-dom";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";

export default function ProtectedLayout() {
  const token = localStorage.getItem("token");
  if (!token) return <Navigate to="/login" />;

  return (
    <div className="flex min-h-screen bg-gray-100">
      <Sidebar />
      <div className="flex flex-col flex-1">
        <Navbar />
        <main className="p-4">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
