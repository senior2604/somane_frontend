// src/pages/Auth/ConfirmResetPage.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
// SUPPRIME CETTE LIGNE - pas besoin de authService ici
// import { authService } from '../../services/authService';

const ConfirmResetPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-md text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl">✅</span>
        </div>
        
        <h2 className="text-2xl font-bold text-gray-800 mb-4">
          Mot de passe modifié !
        </h2>
        
        <p className="text-gray-600 mb-6">
          Votre mot de passe a été réinitialisé avec succès.
        </p>
        
        <button
          onClick={() => navigate('/login')}
          className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700"
        >
          Se connecter
        </button>
      </div>
    </div>
  );
};

export default ConfirmResetPage;