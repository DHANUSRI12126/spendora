import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check if token exists on load and verify with backend
  useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem('spendora_token');
      if (token) {
        try {
          const response = await api.get('/auth/me');
          setUser(response.data.user);
        } catch (error) {
          console.error("Token verification failed:", error);
          localStorage.removeItem('spendora_token');
          localStorage.removeItem('spendora_user');
          setUser(null);
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, []);

  const login = async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      const { token, user: loggedUser } = response.data;
      
      localStorage.setItem('spendora_token', token);
      localStorage.setItem('spendora_user', JSON.stringify(loggedUser));
      setUser(loggedUser);
      return loggedUser;
    } catch (error) {
      if (!error.response) {
        throw "Cannot connect to backend server. Please make sure the backend is running on port 5000.";
      }
      throw error.response?.data?.message || "Login failed. Please check your credentials.";
    }
  };

  const register = async (fullName, email, password, confirmPassword) => {
    try {
      const response = await api.post('/auth/register', {
        full_name: fullName,
        email,
        password,
        confirm_password: confirmPassword
      });
      return response.data;
    } catch (error) {
      if (!error.response) {
        throw "Cannot connect to backend server. Please make sure the backend is running on port 5000.";
      }
      throw error.response?.data?.message || "Registration failed. Try again.";
    }
  };

  const logout = async () => {
    try {
      // Best effort notify backend
      await api.post('/auth/logout');
    } catch (e) {
      console.warn("Logout endpoint notification error:", e);
    } finally {
      localStorage.removeItem('spendora_token');
      localStorage.removeItem('spendora_user');
      setUser(null);
    }
  };

  const updateProfile = async (fullName, password) => {
    try {
      const payload = { full_name: fullName };
      if (password) payload.password = password;
      
      await api.put('/auth/profile', payload);
      
      // Update local state details
      const updatedUser = { ...user, full_name: fullName };
      localStorage.setItem('spendora_user', JSON.stringify(updatedUser));
      setUser(updatedUser);
    } catch (error) {
      throw error.response?.data?.message || "Profile update failed.";
    }
  };

  const value = {
    user,
    isAuthenticated: !!user,
    loading,
    login,
    register,
    logout,
    updateProfile
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
