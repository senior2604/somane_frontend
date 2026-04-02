import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import MainLayout from '../../layouts/MainLayout';

const ProtectedLayout = () => {
  const isAuthenticated = () => {
    const token = localStorage.getItem('accessToken');
    console.log('🔐 ProtectedLayout checking token:', token ? 'Present' : 'Missing');
    return !!token;
  };

  const checkEntiteSelection = () => {
    const currentEntite = localStorage.getItem('currentEntite');
    const userEntites = localStorage.getItem('userEntites');
    
    console.log('🏢 Entite check:', {
      currentEntite: currentEntite ? 'Selected' : 'Not selected',
      userEntites: userEntites ? JSON.parse(userEntites).length + ' entites' : 'No entites'
    });

    // Si pas d'entité sélectionnée
    if (!currentEntite) {
      // Vérifier si l'utilisateur a des entités
      if (userEntites) {
        const entites = JSON.parse(userEntites);
        
        if (entites.length === 0) {
          console.log('❌ No entites available, redirecting to /no-entite');
          return { redirect: '/no-entite' };
        } else if (entites.length > 1) {
          console.log('📋 Multiple entites available, redirecting to /select-entite');
          return { redirect: '/select-entite' };
        } else if (entites.length === 1) {
          // Sélection automatique de l'entité unique
          console.log('✅ Single entite found, auto-selecting');
          localStorage.setItem('currentEntite', JSON.stringify(entites[0]));
          localStorage.setItem('entiteActive', entites[0].id.toString());
          return { redirect: null };
        }
      } else {
        // Pas d'entités stockées, besoin de les récupérer
        console.log('🔄 No entites stored, redirecting to /select-entite to fetch');
        return { redirect: '/select-entite' };
      }
    }
    
    // Entité déjà sélectionnée
    console.log('✅ Entite already selected');
    return { redirect: null };
  };

  if (!isAuthenticated()) {
    console.log('❌ No auth token, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  // Vérifier la sélection d'entité
  const entiteCheck = checkEntiteSelection();
  if (entiteCheck.redirect) {
    console.log(`🔄 Redirecting to: ${entiteCheck.redirect}`);
    return <Navigate to={entiteCheck.redirect} replace />;
  }

  console.log('✅ Auth & entite successful, rendering dashboard');
  return (
    <MainLayout>
      <Outlet />
    </MainLayout>
  );
};

export default ProtectedLayout;