import React from 'react';
import { Outlet } from 'react-router-dom';
import StockHeader from '../components/StockHeader';

const StockLayout = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <StockHeader />
      <main className="container mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
};

export default StockLayout;
