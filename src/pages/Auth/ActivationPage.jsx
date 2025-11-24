// src/pages/Auth/ActivationPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { authService } from '../../services/authService';

const ActivationPage = () => {
  const [statut, setStatut] = useState('loading');
  const [message, setMessage] = useState('');
  const { uid, token } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    const activerCompte = async () => {
      try {
        await authService.activateAccount(uid, token);
        setStatut('success');
        setMessage('Votre compte a été activé avec succès !');
      } catch (error) {
        setStatut('error');
        setMessage('Lien d\'activation invalide ou expiré.');
      }
    };

    activerCompte();
  }, [uid, token]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-md">
        {statut === 'loading' && (
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Activation en cours...</p>
          </div>
        )}

        {statut === 'success' && (
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">✅</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Compte Activé !</h2>
            <p className="text-gray-600 mb-6">{message}</p>
            <button
              onClick={() => navigate('/login')}
              className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700"
            >
              Se connecter
            </button>
          </div>
        )}

        {statut === 'error' && (
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">❌</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Erreur d'activation</h2>
            <p className="text-gray-600 mb-6">{message}</p>
            <button
              onClick={() => navigate('/register')}
              className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700"
            >
              Créer un nouveau compte
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ActivationPage;