// features/comptabilite/pages/DashboardPage.jsx
import React from 'react';

export default function DashboardPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6 text-gray-900">Tableaud de bord</h1>
      
      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <h3 className="font-semibold text-gray-700">Transactions</h3>
          <p className="text-3xl font-bold mt-2 text-violet-600">128</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <h3 className="font-semibold text-gray-700">Comptes</h3>
          <p className="text-3xl font-bold mt-2 text-violet-600">24</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <h3 className="font-semibold text-gray-700">Soldes</h3>
          <p className="text-3xl font-bold mt-2 text-green-600">€45,230</p>
        </div>
      </div>

      {/* Tableau des transactions */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <h2 className="font-semibold text-gray-800">Dernières Transactions</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr className="text-left">
                <th className="px-4 py-3 text-sm font-semibold text-gray-700">Date</th>
                <th className="px-4 py-3 text-sm font-semibold text-gray-700">Description</th>
                <th className="px-4 py-3 text-sm font-semibold text-gray-700">Montant</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3 text-sm text-gray-600">2024-01-15</td>
                <td className="px-4 py-3 text-sm text-gray-800">Salaire</td>
                <td className="px-4 py-3 text-sm font-medium text-green-600">+€3,200</td>
              </tr>
              <tr className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3 text-sm text-gray-600">2024-01-16</td>
                <td className="px-4 py-3 text-sm text-gray-800">Loyer</td>
                <td className="px-4 py-3 text-sm font-medium text-red-600">-€1,200</td>
              </tr>
              <tr className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm text-gray-600">2024-01-17</td>
                <td className="px-4 py-3 text-sm text-gray-800">Vente</td>
                <td className="px-4 py-3 text-sm font-medium text-green-600">+€5,400</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Actions rapides */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <h3 className="font-semibold text-gray-800 mb-3">Actions rapides</h3>
        <div className="flex flex-wrap gap-2">
          <button className="px-4 py-2 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-700 transition-colors">
            Nouvelle transaction
          </button>
          <button className="px-4 py-2 bg-white text-gray-700 text-sm font-medium rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors">
            Générer rapport
          </button>
          <button className="px-4 py-2 bg-white text-gray-700 text-sm font-medium rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors">
            Exporter données
          </button>
        </div>
      </div>
    </div>
  );
}