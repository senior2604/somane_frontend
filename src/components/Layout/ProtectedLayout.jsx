import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import MainLayout from '../../layouts/MainLayout';

const ProtectedLayout = () => {
  const isAuthenticated = () => {
    const token = localStorage.getItem('accessToken'); // ← CHANGEMENT ICI
    console.log('🔐 ProtectedLayout checking token:', token); // ← DEBUG
    return !!token;
  };

  if (!isAuthenticated()) {
    console.log('❌ No auth token, redirecting to login'); // ← DEBUG
    return <Navigate to="/login" replace />;
  }

  console.log('✅ Auth successful, rendering dashboard'); // ← DEBUG
  return (
    <MainLayout>
      <Outlet />
    </MainLayout>
  );
};

export default ProtectedLayout;