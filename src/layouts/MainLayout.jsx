import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import ApplicationLayout from '../components/ApplicationLayout';
import { isCorePage } from '../services/pageModule';

export default function MainLayout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <ApplicationLayout
      header={<Header onLogout={handleLogout} />}
      sidebar={<Sidebar currentPath={location.pathname} />}
      contentClassName={
        isCorePage(location.pathname)
          ? 'core-module-main'
          : 'somane-app-shell__main--flush'
      }
    >
      {children}
    </ApplicationLayout>
  );
}
