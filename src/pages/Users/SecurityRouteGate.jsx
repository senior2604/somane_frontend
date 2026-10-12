import React from 'react';
import { useLocation, useParams } from 'react-router-dom';
import PermissionGate from '../../components/PermissionGate';

const RESOURCE_MODELS = {
  users: 'core.Utilisateur',
  groups: 'core.Groupe',
  permissions: 'core.Permission',
};

export default function SecurityRouteGate({ children, mode }) {
  const location = useLocation();
  const params = useParams();
  const query = new URLSearchParams(location.search);
  const type = query.get('type') || params.type || 'users';
  const model = RESOURCE_MODELS[type];

  if (!model) {
    return (
      <div className="m-4 border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Type de ressource invalide.
      </div>
    );
  }

  const action = mode === 'create'
    ? 'create'
    : mode === 'detail' && query.get('edit') === '1'
      ? 'write'
      : 'read';

  return <PermissionGate model={model} action={action}>{children}</PermissionGate>;
}
