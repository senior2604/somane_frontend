import { apiClient } from './apiClient';

export const uiService = {
  loadBootstrap() {
    return apiClient.get('ui/bootstrap/');
  },
};
