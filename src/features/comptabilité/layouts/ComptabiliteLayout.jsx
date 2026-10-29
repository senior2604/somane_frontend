// src/features/comptabilité/layouts/ComptabiliteLayout.jsx
import { Outlet } from 'react-router-dom';
import Header from "../../../components/Header";
import ApplicationLayout from "../../../components/ApplicationLayout";
import { UiProvider } from "../../../context/UiContext";

export default function ComptabiliteLayout() {
  return (
    <UiProvider>
      <ApplicationLayout header={<Header />} contentClassName="somane-app-shell__main--padded">
        <Outlet />
      </ApplicationLayout>
    </UiProvider>
  );
}
