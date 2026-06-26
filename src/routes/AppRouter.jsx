// src/routes/AppRouter.jsx
import React, { Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import ProtectedLayout from "../components/Layout/ProtectedLayout";
import ActivationPage from "../pages/Auth/ActivationPage";
import ConfirmResetPage from "../pages/Auth/ConfirmResetPage";
import ResetPasswordPage from "../pages/Auth/ResetPasswordPage";
import BanksPage from "../pages/Banks/BanksPage";
import CountriesPage from "../pages/Countries/CountriesPage";
import CurrenciesPage from "../pages/Currencies/CurrenciesPage";
import DashboardPage from "../pages/Dashboard/DashboardPage";
// import EntitiesPage from "../pages/Entities/EntitiesPage";
import EntitiesCreate  from "../pages/Entities/Create.jsx";
import EntitiesShow  from "../pages/Entities/Show.jsx";
import EntitiesList   from "../pages/Entities/List.jsx";

import ExchangeRatesPage from "../pages/ExchangeRates/ExchangeRatesPages";
import GroupesPage from "../pages/Groupes/GroupesPage";
import JournalPage from "../pages/Journal/JournalPage";
import LanguagesPage from "../pages/Languages/LanguagesPage";
import LoginPage from "../pages/Login/LoginPage";
import ModulesPage from "../pages/Modules/ModulesPage";
import PartnerBanksPage from "../pages/PartnerBanks/PartnerBanksPage";
import PartnersPage from "../pages/Partners/PartnersPage";
import PartnersCreate from "../pages/Partners/Create.jsx";
import PartnersShow from "../pages/Partners/Show.jsx";
import PartnersList from "../pages/Partners/List.jsx";

import PermissionsPage from "../pages/Permissions/PermissionsPage";
import SettingsPage from "../pages/Settings/SettingsPage";
import StatesPage from "../pages/States/StatesPage";
import SystemPage from "../pages/System/SystemPage";
import TasksPage from "../pages/Tasks/TasksPage";
import UserEntitiesPage from "../pages/UserEntities/UserEntitiesPage";
// import UsersPage from "../pages/Users/UsersPage";
// Imports
import SecurityList from "../pages/Users/List.jsx";
import SecurityCreate from "../pages/Users/Create.jsx";
import SecurityShow from "../pages/Users/Show.jsx";



// NOUVELLES PAGES D'ENTITÉ
import NoEntitePage from "../pages/Entities/NoEntitePage";
import SelectEntitePage from "../pages/Entities/SelectEntitePage";

// IMPORTS DU MODULE COMPTABILITÉ
import ComptabiliteLayout from "../features/comptabilité/layouts/ComptabiliteLayout";
import DashboardComptabilitePage from "../features/comptabilité/pages/DashboardPage";
import PlanComptablePage from "../features/comptabilité/pages/PlanComptablePage";

// IMPORTS DES PAGES POSITIONS FISCALES
import PositionsFiscalesIndex from "../features/comptabilité/pages/PositionsFiscales/index.jsx";
import PositionsFiscalesCreate from "../features/comptabilité/pages/PositionsFiscales/create.jsx";
import PositionsFiscalesShow from "../features/comptabilité/pages/PositionsFiscales/show.jsx";
import PositionsFiscalesEdit from "../features/comptabilité/pages/PositionsFiscales/edit.jsx";

// Frameworks / Groups / Types / Accounts
import FrameworkDetail from "../features/comptabilité/pages/frameworks/FrameworkDetail.jsx";
import FrameworkForm from "../features/comptabilité/pages/frameworks/FrameworkForm.jsx";
import FrameworkList from "../features/comptabilité/pages/frameworks/FrameworkList.jsx";
import GroupCreate from "../features/comptabilité/pages/groups/GroupCreate.jsx";
import GroupDetail from "../features/comptabilité/pages/groups/GroupDetail.jsx";
import GroupEdit from "../features/comptabilité/pages/groups/GroupEdit.jsx";
import GroupList from "../features/comptabilité/pages/groups/GroupList.jsx";
import TypeList from "../features/comptabilité/pages/types/TypeList.jsx";
import TypeCreate from "../features/comptabilité/pages/types/TypeCreate.jsx";
import TypeEdit from "../features/comptabilité/pages/types/TypeEdit.jsx";
import TypeDetail from "../features/comptabilité/pages/types/TypeDetail.jsx";
import AccountList from "../features/comptabilité/pages/accounts/AccountList.jsx";
import AccountCreate from "../features/comptabilité/pages/accounts/AccountCreate.jsx";
import AccountEdit from "../features/comptabilité/pages/accounts/AccountEdit.jsx";
import AccountDetail from "../features/comptabilité/pages/accounts/AccountDetail.jsx";
import AccountImport from "../features/comptabilité/pages/accounts/AccountImport.jsx";

// Journaux / Pieces / Taux / Sequences / Lettrage
import JournauxCreate from "../features/comptabilité/pages/Journaux/Create.jsx";
import JournauxEdit from "../features/comptabilité/pages/Journaux/Edit.jsx";
import JournauxIndex from "../features/comptabilité/pages/Journaux/Index.jsx";
import JournauxShow from "../features/comptabilité/pages/Journaux/Show.jsx";
import AccountCompanyConfigWizard from "../features/comptabilité/pages/parametrage/Accountcompanyconfigwizard.jsx";
import PiecesComptablesCreate from "../features/comptabilité/pages/PiecesComptables/Create.jsx";
import PiecesComptablesEdit from "../features/comptabilité/pages/PiecesComptables/Edit.jsx";
import PiecesComptablesList from "../features/comptabilité/pages/PiecesComptables/List.jsx";
import PiecesComptablesShow from "../features/comptabilité/pages/PiecesComptables/Show.jsx";
import PlanList from '../features/comptabilité/pages/plans-comptables/PlanList.jsx';
import TauxFiscauxIndex from "../features/comptabilité/pages/TauxFiscaux/Index.jsx";
import TauxFiscauxCreate from "../features/comptabilité/pages/TauxFiscaux/Create.jsx";
import TauxFiscauxShow from "../features/comptabilité/pages/TauxFiscaux/Show.jsx";
import TauxFiscauxEdit from "../features/comptabilité/pages/TauxFiscaux/Edit.jsx";

// Groupes de taxes
import TaxGroupsIndex from "../features/comptabilité/pages/TaxGroups/Index.jsx";
import TaxGroupsCreate from "../features/comptabilité/pages/TaxGroups/Create.jsx";
import TaxGroupsShow from "../features/comptabilité/pages/TaxGroups/Show.jsx";

// Retenues a la Source
import WithholdingTaxesIndex from "../features/comptabilité/pages/WithholdingTaxes/Index.jsx";
import WithholdingTaxesCreate from "../features/comptabilité/pages/WithholdingTaxes/Create.jsx";
import WithholdingTaxesShow from "../features/comptabilité/pages/WithholdingTaxes/Show.jsx";
import BalanceGenerale from "../features/comptabilité/pages/Balance/Index.jsx";
import SequencesList from "../features/comptabilité/pages/Sequences/List.jsx";
import SequencesCreate from "../features/comptabilité/pages/Sequences/Create.jsx";
import SequencesShow from "../features/comptabilité/pages/Sequences/Show.jsx";
import LettrageCreate from "../features/comptabilité/pages/Lettrage/Create.jsx";
import LettrageShow from "../features/comptabilité/pages/Lettrage/Show.jsx";
import LettrageIndex from "../features/comptabilité/pages/Lettrage/Index.jsx";

// Paiements
import PaymentList from "../features/comptabilité/pages/payement/PaymentList.jsx";
import PaymentCreate from "../features/comptabilité/pages/payement/PaymentCreate.jsx";
import PaymentDetail from "../features/comptabilité/pages/payement/PaymentDetail.jsx";
import PaymentTerms from "../features/comptabilité/pages/payement/PaymentTerms.jsx";
import PaymentTermCreate from "../features/comptabilité/pages/payement/PaymentTermCreate.jsx";
import PaymentTermDetail from "../features/comptabilité/pages/payement/PaymentTermDetail.jsx";
import PaymentMethods from "../features/comptabilité/pages/payement/PaymentMethods.jsx";
import PaymentMethodCreate from "../features/comptabilité/pages/payement/PaymentMethodCreate.jsx";
import PaymentMethodDetail from "../features/comptabilité/pages/payement/PaymentMethodDetail.jsx";

// ========== MODULE VENTES ==========
import VenteLayout from "../features/vente/layouts/VenteLayout.jsx";
import VenteDashboard from "../features/vente/pages/VenteDashboard.jsx";

// Commandes Client
import CommandesClientList from "../features/vente/pages/CommandesClient/List.jsx";
import CommandesClientCreate from "../features/vente/pages/CommandesClient/Create.jsx";
import CommandesClientShow from "../features/vente/pages/CommandesClient/Show.jsx";
import CommandesClientEdit from "../features/vente/pages/CommandesClient/Edit.jsx";

// Lignes de Commande
import LignesCommandeClientList from "../features/vente/pages/LignesCommandeClient/List.jsx";
import LignesCommandeClientCreate from "../features/vente/pages/LignesCommandeClient/Create.jsx";
import LignesCommandeClientShow from "../features/vente/pages/LignesCommandeClient/Show.jsx";
import LignesCommandeClientEdit from "../features/vente/pages/LignesCommandeClient/Edit.jsx";

// Equipes Commerciales
import EquipesCommercialesList from "../features/vente/pages/EquipesCommerciales/List.jsx";
import EquipesCommercialesCreate from "../features/vente/pages/EquipesCommerciales/Create.jsx";
import EquipesCommercialesShow from "../features/vente/pages/EquipesCommerciales/Show.jsx";
import EquipesCommercialesEdit from "../features/vente/pages/EquipesCommerciales/Edit.jsx";

// Produits & Pricelists
import ProduitsList from "../features/vente/pages/Produits/List.jsx";
import ProduitsCreate from "../features/vente/pages/Produits/Create.jsx";
import ProduitsShow from "../features/vente/pages/Produits/Show.jsx";
import PricelistsList from "../features/vente/pages/Pricelists/List.jsx";
import PricelistsCreate from "../features/vente/pages/Pricelists/Create.jsx";
import PricelistsShow from "../features/vente/pages/Pricelists/Show.jsx";

// Reporting
import ReportingVentesList from "../features/vente/pages/ReportingVentes/List.jsx";

// ========== MODULE ACHATS ==========
import AchatLayout from "../features/achat/layouts/AchatLayout.jsx";
import AchatDashboard from "../features/achat/pages/AchatDashboard.jsx";
import BonsCommandePage from "../features/achat/pages/BonsCommandePage.jsx";
import DemandesAchatPage from "../features/achat/pages/DemandesAchatPage.jsx";
import LignesBonCommandePage from "../features/achat/pages/LignesBonCommandePage.jsx";
import LignesDemandeAchatPage from "../features/achat/pages/LignesDemandeAchatPage.jsx";
import PrixFournisseursPage from "../features/achat/pages/PrixFournisseursPage.jsx";

// ========== MODULE FINANCIAL REPORTS ==========
import PeriodSelectorPage from "../features/financial-reports/components/PeriodSelector.jsx";
import FinancialReportsLayout from "../features/financial-reports/layouts/FinancialReportsLayout.jsx";
import Indexpages from "../features/financial-reports/pages/[id]/lines/index.jsx";
import ReportDetail from "../features/financial-reports/pages/[id]/page.jsx";
import FinancialReportsDashboard from "../features/financial-reports/pages/dashboard.jsx";
import ImportDetailPage from "../features/financial-reports/pages/import/[id].jsx";
import StatementsDetailPage from "../features/financial-reports/pages/statements/[id].jsx";
import StatementsSyscohadaPage from "../features/financial-reports/pages/statements-syscohada/[id].jsx";
import ImportPage from "../features/financial-reports/pages/ImportData.jsx";
import FinancialReportsList from "../features/financial-reports/pages/index.jsx";
import NewReportPage from "../features/financial-reports/pages/new/page.jsx";
import SettingPage from "../features/financial-reports/pages/SettingsPage.jsx";
import FinancialReportConfig from "../features/financial-reports/pages/FinancialReportConfig.jsx";

// ========== COMPOSANTS UTILITAIRES ==========
const LoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600 mx-auto mb-4"></div>
      <p className="text-gray-600">Chargement...</p>
    </div>
  </div>
);

const SomaneAIPage = () => (
  <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="bg-white rounded-xl shadow-lg p-8">
        <div className="text-center">
          <div className="w-24 h-24 bg-gradient-to-r from-purple-100 to-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-12 h-12 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-3">Somane AI</h1>
          <p className="text-gray-600 mb-6">Intelligence Artificielle pour la gestion d'entreprise</p>
          <div className="bg-gray-50 rounded-lg p-6 mb-8">
            <p className="text-gray-700">Cette fonctionnalite est actuellement en cours de developpement.</p>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const isValidRouteComponent = (value) => (
  typeof value === 'function'
  || typeof value === 'string'
  || Boolean(value && typeof value === 'object' && value.$$typeof)
);

const resolveRouteComponent = (componentLike) => {
  if (isValidRouteComponent(componentLike)) return componentLike;

  if (componentLike && typeof componentLike === 'object') {
    if (isValidRouteComponent(componentLike.default)) return componentLike.default;

    const namedExport = Object.values(componentLike).find(isValidRouteComponent);
    if (namedExport) return namedExport;
  }

  return null;
};

const InvalidRouteComponent = ({ name }) => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="max-w-lg rounded-lg border border-red-200 bg-white p-6 text-center shadow-sm">
      <h1 className="mb-2 text-lg font-semibold text-red-700">Page invalide</h1>
      <p className="text-sm text-gray-600">
        Le composant de route {name ? `"${name}"` : ''} n'est pas exporte comme composant React.
      </p>
    </div>
  </div>
);

const RoutePage = ({ component, name }) => {
  const Component = resolveRouteComponent(component);
  return Component ? <Component /> : <InvalidRouteComponent name={name} />;
};

// ========== ROUTER PRINCIPAL ==========
export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ROUTES PUBLIQUES */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/auth/activate/:uid/:token" element={<ActivationPage />} />
        <Route path="/auth/password/reset/:uid/:token" element={<ResetPasswordPage />} />
        <Route path="/auth/reset-confirm/success" element={<ConfirmResetPage />} />

        {/* SELECTION D'ENTITE */}
        <Route path="/select-entite" element={<SelectEntitePage />} />
        <Route path="/no-entite" element={<NoEntitePage />} />

        {/* ROUTES PROTEGEES PRINCIPALES */}
        <Route element={<ProtectedLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          {/* <Route path="/entities" element={<EntitiesPage />} /> */}
          <Route path="/entities/create" element={<EntitiesCreate />} />
          <Route path="/entities" element={<EntitiesList />} />
          <Route path="/entities/:id" element={<EntitiesShow />} />
          <Route path="/partner" element={<PartnersPage />} />
          <Route path="/partners/create" element={<PartnersCreate />} />
          <Route path="/partners" element={<PartnersList />} />
          <Route path="/partners/:id" element={<PartnersShow />} />


          {/* <Route path="/user" element={<UsersPage />} /> */}
          // Routes
          <Route path="/UsersGestions" element={<SecurityList />} />
          <Route path="/security/create" element={<SecurityCreate />} />
          <Route path="/security/:type/:id" element={<SecurityShow />} />

          <Route path="/userentities" element={<UserEntitiesPage />} />
          <Route path="/groupes" element={<GroupesPage />} />
          <Route path="/permissions" element={<PermissionsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/journal" element={<JournalPage />} />
          <Route path="/modules" element={<ModulesPage />} />
          <Route path="/countries" element={<CountriesPage />} />
          <Route path="/currencies" element={<CurrenciesPage />} />
          <Route path="/banks" element={<BanksPage />} />
          <Route path="/PartnerBanks" element={<PartnerBanksPage />} />
          <Route path="/somane-ai" element={<SomaneAIPage />} />
          <Route path="/ExchangeRates" element={<ExchangeRatesPage />} />
          <Route path="/Languages" element={<LanguagesPage />} />
          <Route path="/States" element={<StatesPage />} />
          <Route path="/tasks" element={<TasksPage />} />
          <Route path="/system" element={<SystemPage />} />
        </Route>

        {/* COMPTABILITE */}
        <Route path="/comptabilite" element={
          <Suspense fallback={<LoadingFallback />}>
            <ComptabiliteLayout />
          </Suspense>
        }>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<DashboardComptabilitePage />} />
          <Route path="plan-comptable" element={<PlanComptablePage />} />

          <Route path="positions-fiscales">
            <Route index element={<PositionsFiscalesIndex />} />
            <Route path="create" element={<PositionsFiscalesCreate />} />
            <Route path=":id" element={<PositionsFiscalesShow />} />
            <Route path=":id/edit" element={<PositionsFiscalesEdit />} />
          </Route>

          <Route path="plans">
            <Route index element={<PlanList />} />
            <Route path="new" element={<FrameworkForm />} />
            <Route path=":id" element={<FrameworkDetail />} />
            <Route path=":id/edit" element={<FrameworkForm />} />
          </Route>

          <Route path="pieces">
            <Route index element={<PiecesComptablesList />} />
            <Route path="create" element={<PiecesComptablesCreate />} />
            <Route path=":id" element={<PiecesComptablesShow />} />
            <Route path=":id/edit" element={<PiecesComptablesEdit />} />
          </Route>

          <Route path="frameworks">
            <Route index element={<FrameworkList />} />
            <Route path="new" element={<FrameworkForm />} />
            <Route path=":id" element={<FrameworkDetail />} />
            <Route path=":id/edit" element={<FrameworkForm />} />
          </Route>

          <Route path="groups">
            <Route index element={<GroupList />} />
            <Route path="new" element={<GroupCreate />} />
            <Route path=":id" element={<GroupDetail />} />
            <Route path=":id/edit" element={<GroupEdit />} />
          </Route>

          <Route path="types">
            <Route index element={<TypeList />} />
            <Route path="new" element={<TypeCreate />} />
            <Route path=":id" element={<TypeDetail />} />
            <Route path=":id/edit" element={<TypeEdit />} />
          </Route>

          <Route path="accounts">
            <Route index element={<AccountList />} />
            <Route path="new" element={<AccountCreate />} />
            <Route path="import" element={<AccountImport />} />
            <Route path=":id" element={<AccountDetail />} />
            <Route path=":id/edit" element={<AccountEdit />} />
          </Route>

          <Route path="journaux">
            <Route index element={<JournauxIndex />} />
            <Route path="create" element={<JournauxCreate />} />
            <Route path=":id" element={<JournauxShow />} />
            <Route path=":id/edit" element={<JournauxEdit />} />
          </Route>

          <Route path="parametrage">
            <Route path="longueur-compte" element={<AccountCompanyConfigWizard />} />
          </Route>

          <Route path="taux-fiscaux">
            <Route index element={<TauxFiscauxIndex />} />
            <Route path="create" element={<TauxFiscauxCreate />} />
            <Route path=":id" element={<TauxFiscauxShow />} />
            <Route path=":id/edit" element={<TauxFiscauxEdit />} />
          </Route>

          <Route path="withholding-taxes">
            <Route index element={<WithholdingTaxesIndex />} />
            <Route path="create" element={<WithholdingTaxesCreate />} />
            <Route path=":id" element={<WithholdingTaxesShow />} />
          </Route>

          <Route path="tax-groups">
            <Route index element={<TaxGroupsIndex />} />
            <Route path="create" element={<TaxGroupsCreate />} />
            <Route path=":id" element={<TaxGroupsShow />} />
          </Route>

          <Route path="paiements">
            <Route index element={<PaymentList />} />
            <Route path="create" element={<PaymentCreate />} />
            <Route path="new" element={<PaymentCreate />} />
            <Route path=":id" element={<PaymentDetail />} />
          </Route>

          <Route path="conditions-paiement">
            <Route index element={<PaymentTerms />} />
            <Route path="create" element={<PaymentTermCreate />} />
            <Route path="new" element={<PaymentTermCreate />} />
            <Route path=":id" element={<PaymentTermDetail />} />
          </Route>

          <Route path="methodes-paiement">
            <Route index element={<PaymentMethods />} />
            <Route path="create" element={<PaymentMethodCreate />} />
            <Route path="new" element={<PaymentMethodCreate />} />
            <Route path=":id" element={<PaymentMethodDetail />} />
          </Route>

          <Route path="lettrage">
            <Route index element={<LettrageIndex />} />
            <Route path="create" element={<LettrageCreate />} />
            <Route path=":id" element={<LettrageShow />} />
          </Route>

          <Route path="balance" element={<BalanceGenerale />} />

          <Route path="sequences">
            <Route index element={<SequencesList />} />
            <Route path="create" element={<SequencesCreate />} />
            <Route path=":id" element={<SequencesShow />} />
          </Route>
        </Route>

        {/* VENTES */}
        <Route path="/vente" element={
          <Suspense fallback={<LoadingFallback />}>
            <VenteLayout />
          </Suspense>
        }>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<RoutePage component={VenteDashboard} name="VenteDashboard" />} />

          <Route path="commandes">
            <Route index element={<RoutePage component={CommandesClientList} name="CommandesClientList" />} />
            <Route path="create" element={<RoutePage component={CommandesClientCreate} name="CommandesClientCreate" />} />
            <Route path=":id" element={<RoutePage component={CommandesClientShow} name="CommandesClientShow" />} />
            <Route path=":id/edit" element={<RoutePage component={CommandesClientEdit} name="CommandesClientEdit" />} />
          </Route>

          <Route path="lignes-commandes">
            <Route index element={<RoutePage component={LignesCommandeClientList} name="LignesCommandeClientList" />} />
            <Route path="create" element={<RoutePage component={LignesCommandeClientCreate} name="LignesCommandeClientCreate" />} />
            <Route path=":id" element={<RoutePage component={LignesCommandeClientShow} name="LignesCommandeClientShow" />} />
            <Route path=":id/edit" element={<RoutePage component={LignesCommandeClientEdit} name="LignesCommandeClientEdit" />} />
          </Route>

          <Route path="equipes">
            <Route index element={<RoutePage component={EquipesCommercialesList} name="EquipesCommercialesList" />} />
            <Route path="create" element={<RoutePage component={EquipesCommercialesCreate} name="EquipesCommercialesCreate" />} />
            <Route path=":id" element={<RoutePage component={EquipesCommercialesShow} name="EquipesCommercialesShow" />} />
            <Route path=":id/edit" element={<RoutePage component={EquipesCommercialesEdit} name="EquipesCommercialesEdit" />} />
          </Route>

          <Route path="produits">
            <Route index element={<RoutePage component={ProduitsList} name="ProduitsList" />} />
            <Route path="create" element={<RoutePage component={ProduitsCreate} name="ProduitsCreate" />} />
            <Route path=":id" element={<RoutePage component={ProduitsShow} name="ProduitsShow" />} />
          </Route>

          <Route path="pricelists">
            <Route index element={<RoutePage component={PricelistsList} name="PricelistsList" />} />
            <Route path="create" element={<RoutePage component={PricelistsCreate} name="PricelistsCreate" />} />
            <Route path=":id" element={<RoutePage component={PricelistsShow} name="PricelistsShow" />} />
          </Route>

          <Route path="reporting" element={<RoutePage component={ReportingVentesList} name="ReportingVentesList" />} />
        </Route>

        {/* ACHATS */}
        <Route path="/achats" element={<AchatLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<AchatDashboard />} />
          <Route path="bons-commande" element={<BonsCommandePage />} />
          <Route path="lignes-bon-commande" element={<LignesBonCommandePage />} />
          <Route path="demandes-achat" element={<DemandesAchatPage />} />
          <Route path="lignes-demande-achat" element={<LignesDemandeAchatPage />} />
          <Route path="prix-fournisseurs" element={<PrixFournisseursPage />} />
        </Route>

        {/* ETATS FINANCIERS */}
        <Route element={<FinancialReportsLayout />}>
          <Route path="/financial-reports" element={<FinancialReportsList />} />
          <Route path="/financial-reports/:id" element={<ReportDetail />} />
          <Route path="/financial-reports/dashboard" element={<FinancialReportsDashboard />} />
          <Route path="/financial-reports/new" element={<NewReportPage />} />
          <Route path="/financial-reports/import" element={<ImportPage />} />
          <Route path="/financial-reports/import/:id" element={<ImportDetailPage />} />
          <Route path="/financial-reports/statements/:id" element={<StatementsDetailPage />} />
          <Route path="/financial-reports/statements-syscohada/:id" element={<StatementsSyscohadaPage />} />
          <Route path="/financial-reports/settings" element={<SettingPage />} />
          <Route path="/financial-reports/Periods" element={<PeriodSelectorPage />} />
          <Route path="/financial-reports/lignes" element={<Indexpages />} /> 
          <Route path="/financial-reports/config" element={<FinancialReportConfig />} />
        </Route>

        {/* REDIRECTIONS & 404 */}
        <Route path="/" element={<Navigate to="/login" replace />} />

        <Route path="*" element={
          <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-800 mb-4">404 - Page non trouvee</h1>
              <p className="text-gray-600 mb-6">La page que vous recherchez n'existe pas.</p>
              <a href="/dashboard" className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors">
                Retour au tableau de bord
              </a>
            </div>
          </div>
        } />
      </Routes>
    </BrowserRouter>
  );
}