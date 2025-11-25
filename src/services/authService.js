// 📁 src/services/authService.js
import { API_CONFIG, ENDPOINTS } from '../config/api';

class AuthService {
  constructor() {
    this.baseURL = API_CONFIG.BASE_URL;
  }

  async handleResponse(response) {
    const contentType = response.headers.get('content-type');
    
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      throw new Error(`Reponse non-JSON du serveur: ${text.substring(0, 100)}`);
    }

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.detail || data.message || 'Erreur serveur');
    }

    return data;
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

      const data = await this.handleResponse(response);
      
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

  async activateAccount(uid, token, password) {
    try {
      const response = await fetch(`${this.baseURL}${ENDPOINTS.AUTH.ACTIVATION}${uid}/${token}/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });

      return await this.handleResponse(response);
    } catch (error) {
      console.error('Erreur d activation:', error);
      throw error;
    }
  }

  async resetPasswordConfirm(uid, token, new_password) {
    try {
      const response = await fetch(`${this.baseURL}${ENDPOINTS.AUTH.PASSWORD_RESET_CONFIRM}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ uid, token, new_password }),
      });

      return await this.handleResponse(response);
    } catch (error) {
      console.error('Erreur de reinitialisation:', error);
      throw error;
    }
  }

  async requestPasswordReset(email) {
    try {
      const response = await fetch(`${this.baseURL}${ENDPOINTS.AUTH.PASSWORD_RESET}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      return await this.handleResponse(response);
    } catch (error) {
      console.error('Erreur de demande de reinitialisation:', error);
      throw error;
    }
  }

  async register(userData) {
    try {
      const response = await fetch(`${this.baseURL}${ENDPOINTS.AUTH.REGISTER}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      return await this.handleResponse(response);
    } catch (error) {
      console.error('Erreur d inscription:', error);
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
      console.error('Erreur de deconnexion:', error);
    } finally {
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

  async refreshToken() {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        throw new Error('Aucun token de rafraichissement');
      }

      const response = await fetch(`${this.baseURL}${ENDPOINTS.AUTH.REFRESH}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh: refreshToken }),
      });

      const data = await this.handleResponse(response);
      localStorage.setItem('accessToken', data.access);
      
      return data;
    } catch (error) {
      console.error('Erreur de rafraichissement:', error);
      this.logout();
      throw error;
    }
  }
}

export const authService = new AuthService();