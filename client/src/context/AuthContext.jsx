import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('ts_token') || '');
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('ts_user');
    return stored ? JSON.parse(stored) : null;
  });

  useEffect(() => {
    if (token) {
      localStorage.setItem('ts_token', token);
    } else {
      localStorage.removeItem('ts_token');
    }
  }, [token]);

  useEffect(() => {
    if (user) {
      localStorage.setItem('ts_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('ts_user');
    }
  }, [user]);

  const logout = () => {
    setToken('');
    setUser(null);
  };

  const login = (nextToken, profile) => {
    setToken(nextToken);
    setUser(profile);
  };

  const authAxios = useMemo(() => {
    const instance = axios.create({
      baseURL: API_BASE,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    return instance;
  }, [token]);

  const value = useMemo(
    () => ({
      token,
      user,
      isAuthenticated: Boolean(token),
      login,
      logout,
      authAxios,
      API_BASE,
    }),
    [token, user, authAxios]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
