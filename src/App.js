// C:\python\django\somane_fronten\somane_frontend\src\App.js
import AppRouter from "./routes/AppRouter";
import { EntityProvider } from './context/EntityContext';
import { AppearancePreferencesProvider } from './context/AppearancePreferencesContext';
import GlobalTooltipLayer from './components/GlobalTooltipLayer';
import { NotificationProvider } from './context/NotificationContext';

export default function App() {
  return (
    <AppearancePreferencesProvider>
      <NotificationProvider>
        <GlobalTooltipLayer />
        <EntityProvider>
          <AppRouter />
        </EntityProvider>
      </NotificationProvider>
    </AppearancePreferencesProvider>
  );
}
