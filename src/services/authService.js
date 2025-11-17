// src/services/authService.js
import { API_CONFIG, ENDPOINTS } from '../config/api';

class AuthService {
  constructor() {
    this.baseURL = API_CONFIG.BASE_URL;
  }

  async login(credentials) {
    try {
      const response = await fetch(`${this.baseURL}${ENDPOINTS.AUTH.LOGIN}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        throw new Error('Échec de la connexion');
      }

      const data = await response.json();
      
      // ⚠️ CORRECTION : Stocker les tokens JWT comme dans LoginPage
      if (data.access) { // ← CHANGEMENT: data.access au lieu de data.token
        localStorage.setItem('accessToken', data.access); // ← CHANGEMENT: accessToken au lieu de authToken
        if (data.refresh) {
          localStorage.setItem('refreshToken', data.refresh);
        }
        if (data.user) {
          localStorage.setItem('user', JSON.stringify(data.user));
          localStorage.setItem('entiteActive', data.user.entite_active || '');
        }
      }

      return data;
    } catch (error) {
      console.error('Erreur de connexion:', error);
      throw error;
    }
  }

  async logout() {
    try {
      const token = this.getToken();
      if (token) {
        await fetch(`${this.baseURL}${ENDPOINTS.AUTH.LOGOUT}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`, // ← CHANGEMENT: Bearer au lieu de Token
            'Content-Type': 'application/json',
          },
        });
      }
    } catch (error) {
      console.error('Erreur de déconnexion:', error);
    } finally {
      // ⚠️ CORRECTION : Nettoyer tous les items comme dans LoginPage
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      localStorage.removeItem('entiteActive');
    }
  }

  getToken() {
    return localStorage.getItem('accessToken'); // ← CHANGEMENT: accessToken au lieu de authToken
  }

  getUser() {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  }

  isAuthenticated() {
    return !!this.getToken();
  }
}

export const authService = new AuthService();