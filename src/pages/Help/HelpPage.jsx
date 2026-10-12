import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FiArrowRight,
  FiBriefcase,
  FiCheckCircle,
  FiFileText,
  FiHelpCircle,
  FiSearch,
  FiSettings,
  FiShield,
  FiUsers,
} from 'react-icons/fi';

const guides = [
  {
    title: 'Bien démarrer',
    description: 'Choisir votre société, vous repérer dans les modules et retrouver vos pages.',
    icon: FiBriefcase,
    keywords: 'connexion société entité module navigation menu tableau de bord',
    steps: [
      'Connectez-vous avec votre compte. Si plusieurs sociétés vous sont accessibles, sélectionnez la bonne entité dans le bandeau supérieur.',
      'Ouvrez le sélecteur de module en haut à gauche, puis choisissez l’espace de travail voulu.',
      'Utilisez le tableau de bord du module pour commencer, puis les menus du bandeau pour ouvrir une liste ou un réglage.',
    ],
    links: [
      { label: 'Tableau de bord général', path: '/dashboard' },
      { label: 'Tableau de bord comptable', path: '/comptabilite/dashboard' },
    ],
  },
  {
    title: 'Configurer la comptabilité',
    description: 'Préparer les réglages et les référentiels avant de saisir les opérations.',
    icon: FiSettings,
    keywords: 'configuration paramètres partenaire plan comptable journal taxe devise',
    steps: [
      'Ouvrez Comptabilité > Configuration > Paramètres pour vérifier les options de la société.',
      'Ajoutez ou vérifiez les partenaires utilisés dans les opérations.',
      'Contrôlez le plan comptable et les journaux avant de créer les premières pièces.',
    ],
    links: [
      { label: 'Paramètres', path: '/comptabilite/parametres' },
      { label: 'Partenaires', path: '/comptabilite/partenaires' },
      { label: 'Plan comptable', path: '/comptabilite/plan-comptable' },
      { label: 'Journaux', path: '/comptabilite/journaux' },
    ],
  },
  {
    title: 'Saisir et suivre une pièce',
    description: 'Créer une pièce, vérifier ses lignes, puis suivre son état.',
    icon: FiFileText,
    keywords: 'nouveau pièce écriture brouillon validation comptabiliser traçabilité enregistrer',
    steps: [
      'Dans Pièces comptables, cliquez sur Nouveau et renseignez les informations demandées.',
      'Vérifiez les dates, le journal, les comptes, les montants et l’équilibre débit/crédit avant de valider.',
      'Enregistrez votre travail. Le bandeau indique l’état de la pièce; la traçabilité affiche les événements disponibles.',
    ],
    links: [
      { label: 'Pièces comptables', path: '/comptabilite/pieces' },
      { label: 'Écritures comptables', path: '/comptabilite/ecritures' },
      { label: 'Paiements', path: '/comptabilite/paiements' },
    ],
  },
  {
    title: 'Utiliser les listes et les actions',
    description: 'Retrouver rapidement une ligne et comprendre les commandes de chaque page.',
    icon: FiSearch,
    keywords: 'liste recherche filtre colonnes afficher lignes actions nouveau sélectionner',
    steps: [
      'Saisissez un mot dans la recherche ou ouvrez le filtre pour réduire la liste.',
      'Utilisez le sélecteur Afficher pour choisir le nombre de lignes visibles.',
      'Ouvrez une ligne pour consulter sa fiche. Le menu Actions propose les commandes disponibles pour la page ou la sélection.',
    ],
    links: [
      { label: 'Partenaires', path: '/comptabilite/partenaires' },
      { label: 'Pièces comptables', path: '/comptabilite/pieces' },
    ],
  },
  {
    title: 'Ventes et achats',
    description: 'Accéder aux espaces commerciaux et retrouver leurs principaux documents.',
    icon: FiBriefcase,
    keywords: 'vente ventes achat achats commandes produits fournisseurs demande bon commande',
    steps: [
      'Ouvrez le module Ventes pour consulter les commandes, produits et rapports commerciaux.',
      'Ouvrez le module Achats pour consulter les demandes, bons de commande et prix fournisseurs.',
      'Les menus visibles et les actions disponibles dépendent des droits accordés à votre compte.',
    ],
    links: [
      { label: 'Ventes', path: '/vente/dashboard' },
      { label: 'Achats', path: '/achats/dashboard' },
    ],
  },
  {
    title: 'Consulter les états financiers',
    description: 'Ouvrir les rapports et vérifier la période avant d’interpréter les résultats.',
    icon: FiFileText,
    keywords: 'rapport état financier bilan compte résultat import période analyse',
    steps: [
      'Ouvrez États financiers depuis le sélecteur de modules.',
      'Choisissez le rapport et la période correspondant à votre besoin.',
      'Vérifiez les données de la période et les paramètres du rapport avant de partager les résultats.',
    ],
    links: [
      { label: 'États financiers', path: '/financial-reports' },
    ],
  },
  {
    title: 'Utilisateurs et permissions',
    description: 'Comprendre pourquoi certaines pages ou actions peuvent ne pas apparaître.',
    icon: FiShield,
    keywords: 'utilisateur groupe permission droit accès sécurité créer modifier lire administrateur',
    steps: [
      'Les groupes et les permissions définissent les pages et actions accessibles à chaque utilisateur.',
      'Si Nouveau, un menu ou une action manque, votre compte n’a peut-être pas le droit correspondant.',
      'Demandez à un administrateur de vérifier vos droits plutôt que d’utiliser le compte d’une autre personne.',
    ],
    links: [
      { label: 'Gestion des utilisateurs', path: '/UsersGestions?tab=users' },
      { label: 'Groupes', path: '/UsersGestions?tab=groups' },
      { label: 'Permissions', path: '/UsersGestions?tab=permissions' },
    ],
  },
];

const normalize = (value) => String(value || '').trim().toLocaleLowerCase('fr');

function GuideCard({ guide }) {
  const Icon = guide.icon;
  return (
    <article className="flex h-full flex-col rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-purple-50 text-purple-700">
          <Icon size={19} />
        </span>
        <div>
          <h2 className="text-base font-semibold text-gray-900">{guide.title}</h2>
          <p className="mt-1 text-sm leading-5 text-gray-600">{guide.description}</p>
        </div>
      </div>
      <ol className="mb-4 space-y-2 pl-5 text-sm leading-5 text-gray-700">
        {guide.steps.map((step, index) => (
          <li key={step} className="pl-1">
            <span className="font-medium text-gray-900">{index + 1}. </span>{step}
          </li>
        ))}
      </ol>
      <div className="mt-auto flex flex-wrap gap-2 border-t border-gray-100 pt-3">
        {guide.links.map((link) => (
          <Link
            key={link.path}
            to={link.path}
            className="inline-flex items-center gap-1 rounded border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-purple-700 transition-colors hover:border-purple-300 hover:bg-purple-50"
          >
            {link.label}<FiArrowRight size={12} />
          </Link>
        ))}
      </div>
    </article>
  );
}

export default function HelpPage() {
  const [query, setQuery] = useState('');
  const visibleGuides = useMemo(() => {
    const needle = normalize(query);
    if (!needle) return guides;
    return guides.filter((guide) => normalize([
      guide.title,
      guide.description,
      guide.keywords,
      ...guide.steps,
      ...guide.links.map((link) => link.label),
    ].join(' ')).includes(needle));
  }, [query]);

  return (
    <div className="min-h-full bg-gray-50 px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <section className="rounded-xl bg-gradient-to-r from-purple-700 to-indigo-700 px-6 py-7 text-white shadow-sm sm:px-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="max-w-2xl">
              <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-purple-100">
                <FiHelpCircle size={15} /> Centre d’aide
              </p>
              <h1 className="text-2xl font-bold sm:text-3xl">Bienvenue dans SOMANE</h1>
              <p className="mt-2 text-sm leading-6 text-purple-50 sm:text-base">
                Des repères simples pour prendre en main l’application, réaliser vos opérations et comprendre vos accès.
              </p>
            </div>
            <label className="flex h-11 w-full max-w-md items-center gap-3 rounded-lg bg-white px-3 text-gray-600 shadow-sm">
              <FiSearch size={17} className="shrink-0" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Rechercher un sujet..."
                aria-label="Rechercher dans l’aide"
                className="min-w-0 flex-1 bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400"
              />
            </label>
          </div>
        </section>

        <section className="mt-5 rounded-lg border border-purple-100 bg-purple-50 p-4">
          <h2 className="text-sm font-semibold text-purple-900">Pour commencer</h2>
          <p className="mt-1 text-sm leading-5 text-purple-800">
            Sélectionnez la bonne société, ouvrez le module voulu, puis suivez le guide correspondant ci-dessous.
            Les menus et boutons affichés varient selon les droits de votre compte.
          </p>
        </section>

        <section className="mt-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-gray-900">Guides pratiques</h2>
            <span className="text-xs text-gray-500">{visibleGuides.length} guide(s)</span>
          </div>
          {visibleGuides.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              {visibleGuides.map((guide) => <GuideCard key={guide.title} guide={guide} />)}
            </div>
          ) : (
            <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
              <FiSearch size={22} className="mx-auto text-gray-400" />
              <p className="mt-2 text-sm font-medium text-gray-800">Aucun guide ne correspond à cette recherche.</p>
              <button type="button" onClick={() => setQuery('')} className="mt-3 text-sm font-medium text-purple-700 hover:underline">
                Effacer la recherche
              </button>
            </div>
          )}
        </section>

        <section className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-gray-200 bg-white p-5">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
              <FiCheckCircle className="text-emerald-600" size={17} /> Repères dans les pages
            </h2>
            <ul className="mt-3 space-y-2 text-sm leading-5 text-gray-600">
              <li><strong className="text-gray-800">Nouveau</strong> ouvre la création d’un élément.</li>
              <li><strong className="text-gray-800">Actions</strong> affiche les opérations disponibles sur la page ou la sélection.</li>
              <li><strong className="text-gray-800">Enregistrer</strong> conserve les changements; <strong className="text-gray-800">Fermer</strong> quitte la fiche et signale les changements non enregistrés.</li>
              <li><strong className="text-gray-800">Traçabilité</strong> présente les événements liés à l’élément lorsqu’ils sont disponibles.</li>
            </ul>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-5">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
              <FiUsers className="text-blue-600" size={17} /> Besoin d’un accès ?
            </h2>
            <p className="mt-3 text-sm leading-5 text-gray-600">
              Si une page ou un bouton est absent, demandez à votre administrateur de vérifier vos droits et le module attribué à votre compte.
              Pour une question métier, indiquez le nom de la page et l’action que vous essayez de réaliser.
            </p>
            <Link to="/profile" className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-purple-700 hover:underline">
              Ouvrir mes préférences<FiArrowRight size={14} />
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}