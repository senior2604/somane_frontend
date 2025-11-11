import React from "react";

const DashboardPage = () => {
  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">Tableau de bord</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-6 bg-white shadow rounded-lg">
          <h3 className="text-lg font-semibold mb-2">Statistiques 1</h3>
          <p className="text-gray-600">Contenu ici</p>
        </div>
        <div className="p-6 bg-white shadow rounded-lg">
          <h3 className="text-lg font-semibold mb-2">Statistiques 2</h3>
          <p className="text-gray-600">Contenu ici</p>
        </div>
        <div className="p-6 bg-white shadow rounded-lg">
          <h3 className="text-lg font-semibold mb-2">Utilisateurs</h3>
          <p className="text-gray-600">Contenu ici</p>
        </div>
        <div className="p-6 bg-white shadow rounded-lg">
          <h3 className="text-lg font-semibold mb-2">Modules</h3>
          <p className="text-gray-600">Contenu ici</p>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;