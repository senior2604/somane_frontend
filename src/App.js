// C:\python\django\somane_fronten\somane_frontend\src\App.js
import AppRouter from "./routes/AppRouter";
import { EntityProvider } from './context/EntityContext';
import { AppearancePreferencesProvider } from './context/AppearancePreferencesContext';
import GlobalTooltipLayer from './components/GlobalTooltipLayer';
import { NotificationProvider } from './context/NotificationContext';
import { LanguageProvider } from './context/LanguageContext';

export default function App() {
  return (
    <LanguageProvider>
      <AppearancePreferencesProvider>
        <NotificationProvider>
          <GlobalTooltipLayer />
          <EntityProvider>
            <AppRouter />
          </EntityProvider>
        </NotificationProvider>
      </AppearancePreferencesProvider>
    </LanguageProvider>
  );
}
