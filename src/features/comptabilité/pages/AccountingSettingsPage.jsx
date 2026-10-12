import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  FiBook,
  FiCreditCard,
  FiDollarSign,
  FiHash,
  FiLayers,
  FiSettings,
  FiUsers,
} from "react-icons/fi";
import { useEntity } from "../../../context/EntityContext";
import { useUi } from "../../../context/UiContext";
import { can } from "../../../services/securityAccess";

const SETTINGS_SECTIONS = [
  {
    title: "Données de base et comptes",
    description: "Préparez les référentiels et les comptes utilisés par les écritures.",
    icon: FiBook,
    entries: [
      { keys: ["partenaires"], description: "Clients, fournisseurs et autres partenaires." },
      { keys: ["plans comptables", "plan comptable"], description: "Consultez et gérez les plans comptables." },
      { keys: ["referentiels comptables"], description: "Choisissez les référentiels comptables disponibles." },
      { keys: ["classes groupes"], description: "Organisez les comptes en classes et groupes." },
      { keys: ["types natures de comptes"], description: "Définissez la nature et le comportement des comptes." },
      { keys: ["comptes comptables"], description: "Gérez les comptes comptables de l’entité." },
      { keys: ["import comptes"], description: "Importez un plan comptable." },
      { keys: ["longueur des comptes"], description: "Paramétrez la génération des comptes de l’entité." },
    ],
  },
  {
    title: "Fiscalité",
    description: "Configurez les taxes et les règles fiscales appliquées aux opérations.",
    icon: FiDollarSign,
    entries: [
      { keys: ["taxes"], description: "Gérez les taux et règles de calcul des taxes." },
      { keys: ["groupes de taxes"], description: "Regroupez les taxes utilisées pour le suivi fiscal." },
      { keys: ["retenues a la source"], description: "Configurez les retenues et leurs comptes associés." },
      { keys: ["positions fiscales"], description: "Adaptez les taxes et comptes selon le partenaire ou l’opération." },
    ],
  },
  {
    title: "Journaux et numérotation",
    description: "Définissez les journaux et les séquences des pièces comptables.",
    icon: FiHash,
    entries: [
      { keys: ["journaux"], description: "Configurez les journaux et leurs comptes par défaut." },
      { keys: ["sequences"], description: "Gérez la numérotation des documents comptables." },
    ],
  },
  {
    title: "Paiements",
    description: "Réutilisez les conditions et moyens de paiement dans les opérations.",
    icon: FiCreditCard,
    entries: [
      { keys: ["conditions de paiement"], description: "Définissez les échéances et délais de règlement." },
      { keys: ["modes de paiement", "methodes de paiement"], description: "Gérez les moyens de règlement proposés." },
    ],
  },
  {
    title: "Immobilisations",
    description: "Préparez les catégories utilisées pour le suivi et l’amortissement des actifs.",
    icon: FiLayers,
    entries: [
      { keys: ["categories d immobilisations"], description: "Associez les comptes et règles d’amortissement aux catégories." },
    ],
  },
];

function normalizeLabel(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function getAccountingMenuItems(configuration) {
  const roots = configuration?.header_navigation?.accounting;
  if (!Array.isArray(roots)) return [];

  return roots.flatMap((root) => (Array.isArray(root.children) ? root.children : []));
}

export default function AccountingSettingsPage() {
  const { activeEntity } = useEntity();
  const { configuration, security } = useUi();
  const menuItems = useMemo(() => getAccountingMenuItems(configuration), [configuration]);
  const menuByLabel = useMemo(
    () => new Map(menuItems.map((item) => [normalizeLabel(item.name), item])),
    [menuItems]
  );

  const sections = useMemo(
    () =>
      SETTINGS_SECTIONS.map((section) => ({
        ...section,
        links: section.entries
          .map((entry) => {
            const item = entry.keys
              .map((key) => menuByLabel.get(normalizeLabel(key)))
              .find((candidate) => candidate?.path?.startsWith("/comptabilite/"));

            return item ? { ...entry, name: item.name, path: item.path } : null;
          })
          .filter(Boolean),
      })).filter((section) => section.links.length > 0),
    [menuByLabel]
  );

  const canViewCoreSettings = can(security, "core.ParametreGeneral", "read");
  const entityName = activeEntity?.raison_sociale || activeEntity?.nom || activeEntity?.code;
  const linkCount = sections.reduce((total, section) => total + section.links.length, 0);

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <section className="mb-6 overflow-hidden rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-slate-50 p-6 text-slate-900 shadow-sm sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-800">
              <FiSettings aria-hidden="true" />
              Configuration comptable
            </div>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Paramètres comptables</h1>
            <p className="mt-2 text-sm leading-6 text-slate-600 sm:text-base">
              Retrouvez les réglages comptables par rubrique. Chaque lien ouvre l’écran existant du module.
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white/80 px-4 py-3 shadow-sm sm:min-w-52">
            <p className="text-xs uppercase tracking-wide text-slate-500">Entité active</p>
            <p className="mt-1 truncate text-sm font-semibold text-slate-900">
              {entityName || "Aucune entité sélectionnée"}
            </p>
          </div>
        </div>
        <div className="mt-6 flex flex-wrap gap-2 text-xs text-slate-700">
          <span className="rounded-full border border-slate-200 bg-white/80 px-3 py-1.5">{sections.length} rubriques disponibles</span>
          <span className="rounded-full border border-slate-200 bg-white/80 px-3 py-1.5">{linkCount} écrans de configuration</span>
        </div>
      </section>

      {canViewCoreSettings && (
        <Link
          to="/comptabilite/parametres/generaux"
          className="mb-6 flex items-center justify-between gap-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 transition hover:border-emerald-300 hover:bg-emerald-100 sm:p-5"
        >
          <div className="flex items-start gap-3">
            <span className="rounded-lg bg-white p-2 text-emerald-800 shadow-sm">
              <FiUsers aria-hidden="true" className="h-5 w-5" />
            </span>
            <div>
              <p className="font-semibold text-slate-900">Paramètres généraux de Core</p>
              <p className="mt-1 text-sm text-slate-600">
                Ouvrir le registre partagé des paramètres, intégré au même module Comptabilité.
              </p>
            </div>
          </div>
          <span className="shrink-0 text-sm font-semibold text-emerald-800">Ouvrir</span>
        </Link>
      )}

      {sections.length > 0 ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {sections.map((section) => {
            const SectionIcon = section.icon;
            return (
              <section key={section.title} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <div className="flex items-start gap-3">
                  <span className="rounded-lg bg-slate-100 p-2.5 text-emerald-800">
                    <SectionIcon aria-hidden="true" className="h-5 w-5" />
                  </span>
                  <div>
                    <h2 className="font-semibold text-slate-900">{section.title}</h2>
                    <p className="mt-1 text-sm leading-5 text-slate-500">{section.description}</p>
                  </div>
                </div>
                <div className="mt-4 divide-y divide-slate-100">
                  {section.links.map((link) => (
                    <Link
                      key={`${section.title}-${link.path}`}
                      to={link.path}
                      className="group flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
                    >
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-slate-800 group-hover:text-emerald-800">
                          {link.name}
                        </span>
                        <span className="mt-0.5 block text-xs leading-5 text-slate-500">{link.description}</span>
                      </span>
                      <span className="shrink-0 text-xs font-semibold text-emerald-800">Ouvrir</span>
                    </Link>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        <section className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
          <div className="flex items-start gap-3">
            <FiSettings aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0" />
            <p>
              Les menus de configuration comptable ne sont pas disponibles pour cette entité ou cet utilisateur.
              Vérifiez la navigation du module et les droits de lecture.
            </p>
          </div>
        </section>
      )}

      <p className="mt-6 text-xs leading-5 text-slate-500">
        Les valeurs et fiches se modifient dans leurs écrans dédiés ; cette page regroupe les accès sans dupliquer leur logique.
      </p>
    </main>
  );
}
