// C:\python\django\somane_frontend\src\config\axiosInstance.js

import axios from 'axios';
import { API_CONFIG } from './api';

// ✅ Instance Axios configurée une seule fois
const axiosInstance = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ✅ Intercepteur pour ajouter automatiquement le token JWT
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // ✅ Ajouter l'entité active si elle existe (pour vos endpoints comptables)
    const entiteActive = localStorage.getItem('entiteActive');
    if (entiteActive) {
      config.headers['X-Entity-ID'] = entiteActive;
    }
    
    return config;
  },
  (error) => Promise.reject(error)
);

// ✅ Intercepteur pour gérer le refresh token automatiquement
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // Si erreur 401 et qu'on n'a pas déjà tenté de refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          const response = await axios.post(
            `${API_CONFIG.BASE_URL}auth/jwt/refresh/`,
            { refresh: refreshToken }
          );
          
          localStorage.setItem('accessToken', response.data.access);
          axiosInstance.defaults.headers.Authorization = `Bearer ${response.data.access}`;
          originalRequest.headers.Authorization = `Bearer ${response.data.access}`;
          
          return axiosInstance(originalRequest);
        }
      } catch (refreshError) {
        // Refresh token invalide ou expiré → déconnexion
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

export default axiosInstance;