// src/components/Layout/ProtectedLayout.jsx
import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import MainLayout from '../../layouts/MainLayout';
import { authService } from '../../services/authService';

const ProtectedLayout = () => {
  const isAuthenticated = authService.isAuthenticated();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <MainLayout onLogout={authService.logout}>
      <Outlet />
    </MainLayout>
  );
};

export default ProtectedLayout;