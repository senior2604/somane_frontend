// C:\python\django\somane_fronten\somane_frontend\src\App.js
import AppRouter from "./routes/AppRouter";
import { EntityProvider } from './context/EntityContext'; 

export default function App() {
  return (
    <EntityProvider>        
      <AppRouter />
    </EntityProvider>
  );
}