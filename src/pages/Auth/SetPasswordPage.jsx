// src/pages/Auth/SetPasswordPage.jsx
import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { authService } from '../../services/authService';

const SetPasswordPage = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const location = useLocation();
  const navigate = useNavigate();
  const { uid, token, userEmail } = location.state || {};

  // Vérification des paramètres requis
  if (!uid || !token) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-md text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">❌</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Lien invalide</h2>
          <p className="text-gray-600 mb-6">Le lien de définition de mot de passe est invalide ou a expiré.</p>
          <button
            onClick={() => navigate('/login')}
            className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700"
          >
            Retour à la connexion
          </button>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    // Validation
    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }

    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères');
      return;
    }

    // Si email manquant, utiliser celui du state ou demander
    const userEmailToUse = userEmail || email;
    if (!userEmailToUse) {
      setError('Veuillez saisir votre adresse email');
      return;
    }

    setLoading(true);
    try {
      console.log('🔍 Définition du mot de passe pour:', userEmailToUse);
      
      // 1. Définir le mot de passe
      await authService.setPassword(uid, token, password);
      console.log('✅ Mot de passe défini avec succès');
      
      // 2. ⭐⭐ CONNEXION AUTOMATIQUE ⭐⭐
      try {
        console.log('🔄 Tentative de connexion automatique...');
        const loginResponse = await authService.login({
          email: userEmailToUse,
          password: password
        });
        
        console.log('✅ Connexion automatique réussie:', loginResponse);
        
        // 3. Redirection vers le dashboard
        navigate('/dashboard', { 
          replace: true, // ⭐⭐ IMPORTANT: replace pour éviter l'historique
          state: { 
            message: 'Bienvenue ! Votre compte a été activé avec succès.' 
          }
        });
        
      } catch (loginError) {
        console.log('⚠️ Connexion auto échouée, redirection vers login:', loginError);
        
        // Fallback: Redirection vers la page de connexion
        navigate('/login', { 
          state: { 
            message: 'Mot de passe défini ! Connectez-vous avec vos identifiants.',
            prefilledEmail: userEmailToUse
          }
        });
      }
      
    } catch (err) {
      console.error('❌ Erreur définition mot de passe:', err);
      setError(err.message || 'Erreur lors de la définition du mot de passe. Vérifiez que le lien est encore valide.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-md">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Définir votre mot de passe
          </h2>
          <p className="text-gray-600 text-sm">
            Finalisez l'activation de votre compte
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Champ email seulement si non fourni */}
          {!userEmail && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Votre email *
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="votre@email.com"
                required
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nouveau mot de passe *
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Minimum 8 caractères"
              required
              minLength={8}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Confirmer le mot de passe *
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Retapez votre mot de passe"
              required
            />
          </div>

          {userEmail && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-blue-800 text-sm">
                <strong>Email:</strong> {userEmail}
              </p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-red-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <span className="text-red-800 text-sm">{error}</span>
              </div>
            </div>
          )}
          
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Activation en cours...
              </>
            ) : (
              'Activer mon compte et me connecter'
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-500 text-xs">
            Après activation, vous serez automatiquement connecté et redirigé vers votre tableau de bord.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SetPasswordPage;