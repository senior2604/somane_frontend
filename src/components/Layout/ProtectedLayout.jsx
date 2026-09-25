import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import MainLayout from '../../layouts/MainLayout';
import { UiProvider } from '../../context/UiContext';

const ProtectedLayout = () => {
  const isAuthenticated = () => {
    const token = localStorage.getItem('accessToken');
    return Boolean(token);
  };

  const checkEntiteSelection = () => {
    const currentEntite = localStorage.getItem('currentEntite');
    const userEntites = localStorage.getItem('userEntites');

    if (!currentEntite) {
      if (userEntites) {
        const entites = JSON.parse(userEntites);

        if (entites.length === 0) {
          return { redirect: '/no-entite' };
        }

        if (entites.length > 1) {
          return { redirect: '/select-entite' };
        }

        if (entites.length === 1) {
          localStorage.setItem(
            'currentEntite',
            JSON.stringify(entites[0])
          );

          localStorage.setItem(
            'entiteActive',
            String(entites[0].id)
          );

          return { redirect: null };
        }
      }

      return { redirect: '/select-entite' };
    }

    return { redirect: null };
  };

  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  const entiteCheck = checkEntiteSelection();

  if (entiteCheck.redirect) {
    return (
      <Navigate
        to={entiteCheck.redirect}
        replace
      />
    );
  }

  return (
    <UiProvider>
      <MainLayout>
        <Outlet />
      </MainLayout>
    </UiProvider>
  );
};

export default ProtectedLayout;