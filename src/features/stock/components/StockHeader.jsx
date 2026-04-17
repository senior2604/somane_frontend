import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const StockHeader = () => {
  const location = useLocation();

  const isActive = (path) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <h1 className="text-2xl font-bold text-gray-900">Gestion des Stocks</h1>
          </div>
          
          <nav className="flex space-x-4">
            <Link
              to="/stock/dashboard"
              className={`px-3 py-2 rounded-md text-sm font-medium ${
                isActive('/stock/dashboard')
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              Tableau de bord
            </Link>
            <Link
              to="/stock/locations"
              className={`px-3 py-2 rounded-md text-sm font-medium ${
                isActive('/stock/locations')
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              Emplacements
            </Link>
            <Link
              to="/stock/pickings"
              className={`px-3 py-2 rounded-md text-sm font-medium ${
                isActive('/stock/pickings')
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              Mouvements
            </Link>
            <Link
              to="/stock/returns"
              className={`px-3 py-2 rounded-md text-sm font-medium ${
                isActive('/stock/returns')
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              Retours
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
};

export default StockHeader;
