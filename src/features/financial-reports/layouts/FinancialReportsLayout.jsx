// src/features/financial-reports/layouts/FinancialReportsLayout.jsx
import { Outlet } from 'react-router-dom';
import Header from "../../../components/Header"; // ← chemin relatif vers ton header unifié
import ApplicationLayout from "../../../components/ApplicationLayout";

export default function FinancialReportsLayout() {
  return (
    <ApplicationLayout header={<Header />} contentClassName="somane-app-shell__main--padded">
      <Outlet />
    </ApplicationLayout>
  );
}
