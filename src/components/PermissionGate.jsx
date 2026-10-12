import React from 'react';
import { Link } from 'react-router-dom';
import { useUi } from '../context/UiContext';
import { can, canAny } from '../services/securityAccess';

export default function PermissionGate({ model, action = 'read', checks, children }) {
  const { security, loading, error } = useUi();

  if (loading) {
    return (
      <div className="p-8 text-center text-sm text-gray-500">
        Chargement des permissions...
      </div>
    );
  }

  if (error && !security) {
    return (
      <div className="m-4 border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Impossible de vérifier vos permissions : {error}
      </div>
    );
  }

  const isAllowed = checks ? canAny(security, checks) : can(security, model, action);
  if (!isAllowed) {
    return (
      <div className="m-4 border border-gray-300 bg-white p-6">
        <h1 className="text-lg font-semibold text-gray-900">Accès refusé</h1>
        <p className="mt-2 text-sm text-gray-600">
          Votre compte ne dispose pas du droit nécessaire pour accéder à cette page.
        </p>
        <Link to="/dashboard" className="mt-4 inline-block text-sm text-purple-700 hover:underline">
          Retour au tableau de bord
        </Link>
      </div>
    );
  }

  return children;
}
