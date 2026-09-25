import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  FiAlertCircle,
  FiBarChart2,
  FiBriefcase,
  FiCreditCard,
  FiDatabase,
  FiDollarSign,
  FiFileText,
  FiGrid,
  FiPackage,
  FiRefreshCw,
  FiSearch,
  FiSettings,
  FiShoppingCart,
  FiTrendingUp,
  FiUsers,
  FiZap,
} from "react-icons/fi";

import { useUi } from "../../context/UiContext";


const COLOR_SCHEMES = [
  "from-blue-500 to-blue-600",
  "from-emerald-500 to-emerald-600",
  "from-violet-500 to-violet-600",
  "from-amber-500 to-amber-600",
  "from-rose-500 to-rose-600",
  "from-cyan-500 to-cyan-600",
  "from-indigo-500 to-indigo-600",
  "from-orange-500 to-orange-600",
  "from-purple-500 to-purple-600",
  "from-teal-500 to-teal-600",
  "from-pink-500 to-pink-600",
  "from-green-500 to-green-600",
  "from-red-500 to-red-600",
  "from-sky-500 to-sky-600",
  "from-lime-500 to-lime-600",
];


/*
 * Applications qui utilisent encore leurs routes React.
 * Elles resteront affichées pendant leur migration vers
 * IrUiMenu, IrAction et IrUiView.
 */
const LEGACY_APPLICATIONS = [
  {
    id: "legacy-accounting",
    name: "Comptabilité",
    path: "/comptabilite/dashboard",
    Icon: FiDollarSign,
    color: "from-blue-500 to-blue-600",
  },
  {
    id: "legacy-financial-reports",
    name: "États financiers",
    path: "/financial-reports/dashboard",
    Icon: FiBarChart2,
    color: "from-emerald-500 to-emerald-600",
  },
];


const ICON_RULES = [
  {
    keywords: [
      "client",
      "partenaire",
      "partner",
      "utilisateur",
      "user",
      "rh",
    ],
    Icon: FiUsers,
  },
  {
    keywords: [
      "vente",
      "sales",
      "crm",
    ],
    Icon: FiTrendingUp,
  },
  {
    keywords: [
      "achat",
      "purchase",
    ],
    Icon: FiShoppingCart,
  },
  {
    keywords: [
      "stock",
      "inventaire",
      "inventory",
      "produit",
      "catalogue",
    ],
    Icon: FiPackage,
  },
  {
    keywords: [
      "comptabilité",
      "comptabilite",
      "accounting",
      "finance",
      "reporting",
    ],
    Icon: FiBarChart2,
  },
  {
    keywords: [
      "banque",
      "bancaire",
      "bank",
    ],
    Icon: FiCreditCard,
  },
  {
    keywords: [
      "document",
      "fichier",
    ],
    Icon: FiFileText,
  },
  {
    keywords: [
      "paramètre",
      "parametre",
      "configuration",
      "administration",
      "admin",
      "setting",
    ],
    Icon: FiSettings,
  },
  {
    keywords: [
      "entité",
      "entite",
      "organisation",
      "société",
      "societe",
      "company",
    ],
    Icon: FiBriefcase,
  },
  {
    keywords: [
      "base de données",
      "database",
    ],
    Icon: FiDatabase,
  },
];


/*
 * Recherche la première action disponible dans un menu
 * ou dans l'un de ses sous-menus.
 */
function findFirstActionId(menu) {
  if (menu?.action_id) {
    return menu.action_id;
  }

  for (const child of menu?.children || []) {
    const actionId = findFirstActionId(child);

    if (actionId) {
      return actionId;
    }
  }

  return null;
}


/*
 * Choisit une icône React selon le nom du menu
 * ou son icône technique.
 */
function getMenuIcon(menu) {
  const source = `
    ${menu?.name || ""}
    ${menu?.icon || ""}
  `.toLocaleLowerCase("fr");

  const rule = ICON_RULES.find((item) =>
    item.keywords.some((keyword) =>
      source.includes(keyword)
    )
  );

  return rule?.Icon || FiGrid;
}


function normalizeName(value) {
  return String(value || "")
    .trim()
    .toLocaleLowerCase("fr");
}


export default function DashboardPage() {
  const navigate = useNavigate();

  const {
    configuration,
    loading,
    error,
    reload,
  } = useUi();

  const [search, setSearch] = useState("");


  /*
   * Fusion :
   * - anciennes applications React ;
   * - applications dynamiques venant de IrUiMenu.
   */
  const applications = useMemo(() => {
    const normalizedSearch =
      normalizeName(search);

    const dynamicApplications =
      (configuration?.menus || [])
        .map((menu, index) => ({
          ...menu,

          actionId:
            findFirstActionId(menu),

          Icon:
            getMenuIcon(menu),

          color:
            COLOR_SCHEMES[
              (
                index +
                LEGACY_APPLICATIONS.length
              ) %
              COLOR_SCHEMES.length
            ],
        }))
        .filter((application) =>
          Boolean(application.actionId)
        );


    /*
     * Évite les doublons lorsqu'une application
     * historique est ensuite convertie en IrUiMenu.
     */
    const dynamicNames = new Set(
      dynamicApplications.map(
        (application) =>
          normalizeName(application.name)
      )
    );


    const legacyApplications =
      LEGACY_APPLICATIONS.filter(
        (application) =>
          !dynamicNames.has(
            normalizeName(application.name)
          )
      );


    return [
      ...legacyApplications,
      ...dynamicApplications,
    ].filter((application) => {
      if (!normalizedSearch) {
        return true;
      }

      return normalizeName(
        application.name
      ).includes(normalizedSearch);
    });
  }, [
    configuration?.menus,
    search,
  ]);


  const openApplication = (application) => {
    /*
     * Application utilisant encore une route React.
     */
    if (application.path) {
      navigate(application.path);
      return;
    }


    /*
     * Application utilisant IrUiMenu et IrAction.
     */
    if (application.actionId) {
      navigate(
        `/ui/action/${application.actionId}`
      );
    }
  };


  return (
    <div className="min-h-full bg-gradient-to-br from-gray-50 to-white px-6 py-8">

      {/* En-tête */}

      <div className="mb-8 text-center">

        <div className="mb-3 inline-flex items-center gap-3">

          <div className="rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 p-3 shadow-md">

            <FiZap className="text-2xl text-white" />

          </div>

          <h1 className="text-3xl font-bold text-gray-800">
            Modules ERP
          </h1>

        </div>

        <p className="text-gray-500">
          Accédez aux applications autorisées de votre système
        </p>

      </div>


      {/* Recherche et actualisation */}

      <div className="mx-auto mb-10 flex max-w-xl items-center gap-2">

        <label className="flex flex-1 items-center rounded-xl border border-gray-200 bg-white px-3 shadow-sm transition focus-within:border-violet-400 focus-within:ring-2 focus-within:ring-violet-100">

          <FiSearch className="shrink-0 text-gray-400" />

          <input
            type="search"
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            placeholder="Rechercher une application…"
            className="w-full bg-transparent px-3 py-2.5 text-sm text-gray-700 outline-none placeholder:text-gray-400"
          />

        </label>


        <button
          type="button"
          onClick={reload}
          title="Actualiser les applications"
          className="rounded-xl border border-gray-200 bg-white p-3 text-violet-600 shadow-sm transition hover:bg-violet-50"
        >

          <FiRefreshCw
            className={
              loading
                ? "animate-spin"
                : ""
            }
          />

        </button>

      </div>


      {/* Erreur du bootstrap UI */}

      {error && (
        <div className="mx-auto mb-8 flex max-w-3xl items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">

          <FiAlertCircle className="shrink-0" />

          <span>
            {error}
          </span>

        </div>
      )}


      {/* Liste des applications */}

      <div className="mx-auto max-w-7xl">

        {loading && !configuration ? (

          <div className="py-20 text-center text-sm text-gray-500">
            Chargement des applications…
          </div>

        ) : applications.length > 0 ? (

          <div className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">

            {applications.map((application) => {
              const Icon = application.Icon;

              return (
                <button
                  type="button"
                  key={application.id}
                  onClick={() =>
                    openApplication(application)
                  }
                  className="group flex min-w-0 flex-col items-center rounded-2xl p-3 text-center transition duration-200 hover:bg-white hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-violet-300"
                >

                  {/* Icône d'application */}

                  <div
                    className={`
                      relative
                      flex h-24 w-24
                      items-center justify-center
                      overflow-hidden
                      rounded-2xl
                      bg-gradient-to-br
                      ${application.color}
                      shadow-lg
                      transition duration-300
                      group-hover:-translate-y-1
                      group-hover:scale-105
                      group-hover:shadow-xl
                    `}
                  >

                    <div className="absolute inset-0 bg-gradient-to-t from-white/5 to-white/25" />

                    <div className="absolute -right-5 -top-5 h-16 w-16 rounded-full bg-white/10" />

                    <Icon className="relative text-4xl text-white drop-shadow" />

                  </div>


                  {/* Nom */}

                  <span className="mt-3 w-full truncate text-sm font-semibold text-gray-700 transition group-hover:text-violet-700">
                    {application.name}
                  </span>


                  {/* Indication au survol */}

                  <span className="mt-1 text-xs text-gray-400 opacity-0 transition group-hover:opacity-100">
                    Ouvrir
                  </span>

                </button>
              );
            })}

          </div>

        ) : (

          <div className="rounded-2xl border border-gray-200 bg-white px-6 py-16 text-center shadow-sm">

            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100">

              <FiGrid className="text-3xl text-gray-300" />

            </div>

            <h2 className="font-semibold text-gray-700">
              Aucune application disponible
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm text-gray-400">
              Aucun menu autorisé ne correspond à votre recherche,
              à votre entité active ou à vos permissions.
            </p>

          </div>

        )}

      </div>


      {/* Pied de page */}

      <div className="mt-16 text-center">

        <div className="inline-flex items-center gap-4 text-sm text-gray-400">

          <span>
            {applications.length} application(s) disponible(s)
          </span>

          <span className="h-1 w-1 rounded-full bg-gray-300" />

          <span>
            SOMANE ERP
          </span>

        </div>

      </div>

    </div>
  );
}