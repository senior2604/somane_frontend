import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import ApplicationLayout from '../components/ApplicationLayout';


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
      contentClassName="somane-app-shell__main--flush"
    >
      {children}
    </ApplicationLayout>
  );
}
