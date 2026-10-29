// src/features/achat/layouts/AchatLayout.jsx
import { Outlet } from 'react-router-dom';
import Header from "../../../components/Header"; // ← chemin relatif, PAS @/
import ApplicationLayout from "../../../components/ApplicationLayout";

export default function AchatLayout() {
  return (
    <ApplicationLayout header={<Header />} contentClassName="somane-app-shell__main--padded">
      <Outlet />
    </ApplicationLayout>
  );
}
