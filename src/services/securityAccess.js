// src\services\securityAccess.js

import { apiClient } from './apiClient';

export const securityService = {
  async fetchMe() {
    return await apiClient.get('security/me/');
  },
};

export function normalizeAction(action) {
  const map = {
    read: 'read',
    list: 'read',
    retrieve: 'read',
    create: 'create',
    write: 'write',
    update: 'write',
    edit: 'write',
    delete: 'delete',
    unlink: 'delete',
    destroy: 'delete',
  };

  return map[action] || action;
}

export function can(security, model, action = 'read') {
  if (!security) return false;
  if (security.user?.is_superuser) return true;

  const normalized = normalizeAction(action);
  return Boolean(security.permissions?.[model]?.[normalized]);
}

export function canAny(security, checks = []) {
  return checks.some(({ model, action }) => can(security, model, action));
}

export function getAllowedMenus(security) {
  return security?.menus || [];
}