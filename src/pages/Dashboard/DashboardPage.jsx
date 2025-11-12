import DashboardCards from "../../components/DashboardCards";

export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6 text-gray-800">
        Tableau de bord
      </h1>

      <DashboardCards />

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h2 className="text-lg font-semibold mb-4">Dernières activités</h2>
          <ul className="text-sm text-gray-600 space-y-2">
            <li>• Admin a créé un nouvel utilisateur</li>
            <li>• Entité “SOMANE SARL” mise à jour</li>
            <li>• Nouveau module “Comptabilité” activé</li>
            <li>• Tâche automatique exécutée avec succès</li>
          </ul>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h2 className="text-lg font-semibold mb-4">Notifications</h2>
          <ul className="text-sm text-gray-600 space-y-2">
            <li>• Mot de passe expiré pour 2 utilisateurs</li>
            <li>• Mise à jour disponible du module Paie</li>
            <li>• Sauvegarde automatique effectuée</li>
          </ul>
        </div>
      </section>
    </div>
  );
}
