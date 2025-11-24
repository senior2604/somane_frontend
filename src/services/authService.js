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
      
      // Stocker les tokens JWT
      if (data.access) {
        localStorage.setItem('accessToken', data.access);
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

  // 🆕 FONCTION D'ACTIVATION DU COMPTE
  async activateAccount(uid, token) {
    try {
      const response = await fetch(`${this.baseURL}${ENDPOINTS.AUTH.ACTIVATION}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ uid, token }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Échec de l\'activation du compte');
      }

      return await response.json();
    } catch (error) {
      console.error('Erreur d\'activation:', error);
      throw error;
    }
  }

  // 🆕 RÉINITIALISATION DU MOT DE PASSE
  async resetPasswordConfirm(uid, token, new_password) {
    try {
      const response = await fetch(`${this.baseURL}${ENDPOINTS.AUTH.PASSWORD_RESET_CONFIRM}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ uid, token, new_password }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Échec de la réinitialisation');
      }

      return await response.json();
    } catch (error) {
      console.error('Erreur de réinitialisation:', error);
      throw error;
    }
  }

  // 🆕 DEMANDE DE RÉINITIALISATION (mot de passe oublié)
  async requestPasswordReset(email) {
    try {
      const response = await fetch(`${this.baseURL}${ENDPOINTS.AUTH.PASSWORD_RESET}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la demande de réinitialisation');
      }

      return await response.json();
    } catch (error) {
      console.error('Erreur de demande de réinitialisation:', error);
      throw error;
    }
  }

  // 🆕 INSCRIPTION UTILISATEUR
  async register(userData) {
    try {
      const response = await fetch(`${this.baseURL}${ENDPOINTS.AUTH.REGISTER}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Échec de l\'inscription');
      }

      return await response.json();
    } catch (error) {
      console.error('Erreur d\'inscription:', error);
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
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
      }
    } catch (error) {
      console.error('Erreur de déconnexion:', error);
    } finally {
      // Nettoyer le localStorage
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      localStorage.removeItem('entiteActive');
    }
  }

  getToken() {
    return localStorage.getItem('accessToken');
  }

  getUser() {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  }

  isAuthenticated() {
    return !!this.getToken();
  }

  // 🆕 RAFRAÎCHIR LE TOKEN
  async refreshToken() {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        throw new Error('Aucun token de rafraîchissement');
      }

      const response = await fetch(`${this.baseURL}${ENDPOINTS.AUTH.REFRESH}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh: refreshToken }),
      });

      if (!response.ok) {
        throw new Error('Échec du rafraîchissement du token');
      }

      const data = await response.json();
      localStorage.setItem('accessToken', data.access);
      
      return data;
    } catch (error) {
      console.error('Erreur de rafraîchissement:', error);
      this.logout();
      throw error;
    }
  }
}

export const authService = new AuthService();