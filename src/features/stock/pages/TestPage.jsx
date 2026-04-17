import React from 'react';

const TestPage = () => {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <h1 className="text-3xl font-bold text-violet-700 mb-4">Module Stock - Test Page</h1>
      <p className="text-gray-600">Si vous voyez cette page, le routing fonctionne correctement !</p>
      <div className="mt-8 p-4 bg-violet-100 rounded-lg">
        <h2 className="text-xl font-semibold text-violet-800 mb-2">Composants chargés :</h2>
        <ul className="list-disc list-inside text-violet-700">
          <li>StockLayout.jsx</li>
          <li>StockHeader.jsx</li>
          <li>DashboardPage.jsx</li>
          <li>Locations/List.jsx</li>
          <li>StockPickings/List.jsx</li>
        </ul>
      </div>
    </div>
  );
};

export default TestPage;
