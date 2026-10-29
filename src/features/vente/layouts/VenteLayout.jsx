// src/features/vente/layouts/VenteLayout.jsx
import { Outlet } from 'react-router-dom';
import Header from "../../../components/Header"; // ← UN SEUL import
import ApplicationLayout from "../../../components/ApplicationLayout";

export default function VenteLayout() {
  return (
    <ApplicationLayout header={<Header />} contentClassName="somane-app-shell__main--padded">
      <Outlet />
    </ApplicationLayout>
  );
}
