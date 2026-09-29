/**
 * ==============================================================================
 * File: frontend/src/context/AuthContext.jsx
 * Description: React Authentication Context & Provider
 * Purpose: Manages global authentication state, token persistence, and login/logout methods.
 *
 * Why this file exists:
 * - Avoids prop-drilling by providing user profile and auth state to any component in the app.
 * - Restores user session automatically from localStorage on browser page refresh.
 * ==============================================================================
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('token') || null);
  const [loading, setLoading] = useState(true);

  // Verify session on initial app load
  useEffect(() => {
    async function verifySession() {
      const storedToken = localStorage.getItem('token');
      if (storedToken) {
        try {
          const data = await authService.getMe();
          if (data && data.user) {
            setUser(data.user);
            localStorage.setItem('user', JSON.stringify(data.user));
          }
        } catch (error) {
          console.warn('[AuthContext] Session expired or invalid. Logging out.');
          logout();
        }
      }
      setLoading(false);
    }

    verifySession();
  }, []);

  const login = async (email, password) => {
    const data = await authService.login(email, password);
    if (data.token && data.user) {
      setToken(data.token);
      setUser(data.user);
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
    }
    return data;
  };

  const register = async (name, email, password, role = 'customer') => {
    const data = await authService.register(name, email, password, role);
    if (data.token && data.user) {
      setToken(data.token);
      setUser(data.user);
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
    }
    return data;
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  const value = {
    user,
    token,
    isAuthenticated: !!user && !!token,
    isAdmin: user?.role === 'admin',
    loading,
    login,
    register,
    logout
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
