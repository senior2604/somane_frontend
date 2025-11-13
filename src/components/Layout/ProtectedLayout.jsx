import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import MainLayout from '../../layouts/MainLayout';

const ProtectedLayout = () => {
  const isAuthenticated = () => {
    const token = localStorage.getItem('authToken');
    return !!token;
  };

  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  return (
    <MainLayout>
      <Outlet /> {/* Ceci affiche les pages enfants */}
    </MainLayout>
  );
};

export default ProtectedLayout;