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
  const [zendeskContext, setZendeskContext] = useState(() => {
    const stored = localStorage.getItem('ts_zendesk_context');
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

  useEffect(() => {
    if (zendeskContext) {
      localStorage.setItem('ts_zendesk_context', JSON.stringify(zendeskContext));
    } else {
      localStorage.removeItem('ts_zendesk_context');
    }
  }, [zendeskContext]);

  const logout = () => {
    setToken('');
    setUser(null);
    setZendeskContext(null);
  };

  const login = (nextToken, profile) => {
    setToken(nextToken);
    setUser(profile);
  };

  const updateUser = (updates) => {
    setUser((current) => (current ? { ...current, ...updates } : current));
  };

  const initializeZendeskContext = async (nextToken = token) => {
    if (!nextToken) {
      setZendeskContext(null);
      return null;
    }

    try {
      const response = await axios.get(`${API_BASE}/users/zendesk-context`, {
        headers: { Authorization: `Bearer ${nextToken}` },
      });

      const nextContext = response.data?.zendesk_context || null;
      setZendeskContext(nextContext);
      return nextContext;
    } catch (error) {
      if (error?.response?.status === 404) {
        const fallbackContext = {
          ready: true,
          audio_proxy_base: '/api/audio-tickets',
          initialized_at: new Date().toISOString(),
          fallback: true,
        };
        setZendeskContext(fallbackContext);
        return fallbackContext;
      }

      const fallbackContext = {
        ready: false,
        audio_proxy_base: '/api/audio-tickets',
        initialized_at: new Date().toISOString(),
        fallback: true,
        error: error?.response?.data?.message || error.message,
      };
      setZendeskContext(fallbackContext);
      return fallbackContext;
    }
  };

  useEffect(() => {
    if (!token) return;

    initializeZendeskContext(token).catch((error) => {
      setZendeskContext(null);
    });
  }, [token]);

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
      updateUser,
      logout,
      zendeskContext,
      initializeZendeskContext,
      authAxios,
      API_BASE,
    }),
    [token, user, zendeskContext, authAxios]
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
