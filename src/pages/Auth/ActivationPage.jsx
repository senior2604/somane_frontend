// src/pages/Auth/ActivationPage.jsx
import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { authService } from '../../services/authService';

const ActivationPage = () => {
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [passwordErrors, setPasswordErrors] = useState([]);
  const { uid, token } = useParams();
  const navigate = useNavigate();

  const validatePassword = (password) => {
    const errors = [];
    
    if (password.length < 8) {
      errors.push('Au moins 8 caracteres');
    }
    
    if (!/(?=.*[a-z])/.test(password)) {
      errors.push('Au moins une lettre minuscule');
    }
    
    if (!/(?=.*[A-Z])/.test(password)) {
      errors.push('Au moins une lettre majuscule');
    }
    
    if (!/(?=.*\d)/.test(password)) {
      errors.push('Au moins un chiffre');
    }
    
    if (!/(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?])/.test(password)) {
      errors.push('Au moins un caractere special');
    }
    
    return errors;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });

    if (name === 'password') {
      const errors = validatePassword(value);
      setPasswordErrors(errors);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      setMessage('Les mots de passe ne correspondent pas');
      return;
    }

    const errors = validatePassword(formData.password);
    if (errors.length > 0) {
      setMessage('Le mot de passe ne respecte pas les exigences de securite');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      await authService.activateAccount(uid, token, formData.password);
      setMessage('Compte active avec succes ! Redirection vers la page de connexion...');
      setTimeout(() => navigate('/login'), 2000);
    } catch (error) {
      setMessage(`Erreur: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const isPasswordValid = passwordErrors.length === 0 && formData.password.length > 0;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-800">Activer votre compte</h2>
          <p className="mt-2 text-gray-600">Definissez votre mot de passe securise</p>
        </div>

        {message && (
          <div className={`p-3 rounded mb-4 text-center ${
            message.includes('Erreur') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
          }`}>
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Mot de passe
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Entrez votre mot de passe"
              required
            />
          </div>

          {formData.password && (
            <div className="text-sm">
              <p className="font-medium text-gray-700">Exigences de securite :</p>
              <ul className="mt-1 space-y-1">
                <li className={formData.password.length >= 8 ? 'text-green-600' : 'text-red-600'}>
                  - Au moins 8 caracteres
                </li>
                <li className={/(?=.*[a-z])/.test(formData.password) ? 'text-green-600' : 'text-red-600'}>
                  - Au moins une minuscule
                </li>
                <li className={/(?=.*[A-Z])/.test(formData.password) ? 'text-green-600' : 'text-red-600'}>
                  - Au moins une majuscule
                </li>
                <li className={/(?=.*\d)/.test(formData.password) ? 'text-green-600' : 'text-red-600'}>
                  - Au moins un chiffre
                </li>
                <li className={/(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?])/.test(formData.password) ? 'text-green-600' : 'text-red-600'}>
                  - Au moins un caractere special
                </li>
              </ul>
            </div>
          )}

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
              Confirmer le mot de passe
            </label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Confirmez votre mot de passe"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading || !isPasswordValid || formData.password !== formData.confirmPassword}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {loading ? 'Activation en cours...' : 'Activer le compte'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ActivationPage;