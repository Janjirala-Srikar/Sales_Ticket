import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useMutation } from '@tanstack/react-query';
import './AuthPage.css';
import { useAuth } from '../../context/AuthContext';

export default function AuthPage({ defaultMode = 'login' }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { API_BASE, login } = useAuth();

  const [mode, setMode] = useState(defaultMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setMode(defaultMode);
  }, [defaultMode]);

  useEffect(() => {
    if (location.state?.prefillEmail) {
      setEmail(location.state.prefillEmail);
      setMode('register');
    }
  }, [location.state]);

  const headline = useMemo(
    () => (mode === 'login' ? 'Welcome back' : 'Create your account'),
    [mode]
  );

  const loginMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await axios.post(`${API_BASE}/users/login`, payload);
      return res.data;
    },
    onSuccess: (data) => {
      const token = data?.token;
      const profile = data?.user || {};
      const profileName = profile.name || profile.username || name;
      const profileEmail = profile.email || email;
      if (!token) {
        setError('Token missing from response');
        return;
      }
      login(token, { ...profile, name: profileName, email: profileEmail, username: profileName });
      navigate('/dashboard', { replace: true });
    },
    onError: (err) => {
      const apiMessage = err.response?.data?.message;
      setError(apiMessage || err.message || 'Something went wrong');
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await axios.post(`${API_BASE}/users/register`, payload);
      return res.data;
    },
    onSuccess: () => {
      setMessage('Account created. Signing you in...');
      loginMutation.mutate({ email, password });
    },
    onError: (err) => {
      const apiMessage = err.response?.data?.message;
      setError(apiMessage || err.message || 'Something went wrong');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (mode === 'register') {
      registerMutation.mutate({ name, email, password });
    } else {
      loginMutation.mutate({ email, password });
    }
  };

  const loading = loginMutation.isPending || registerMutation.isPending;

  const switchMode = (nextMode) => {
    setMode(nextMode);
    setError('');
    setMessage('');
  };

  return (
    <div className="auth-shell">
      <Link to="/" className="auth-logo">TicketSignal</Link>

      <div className="auth-card">
        <div className="auth-tabs">
          <button
            type="button"
            onClick={() => switchMode('login')}
            className={mode === 'login' ? 'active' : ''}
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => switchMode('register')}
            className={mode === 'register' ? 'active' : ''}
          >
            Register
          </button>
        </div>

        <div className="auth-header">
          <h2>{headline}</h2>
          <p>{mode === 'login' ? 'Sign in to view your dashboard.' : 'Start routing revenue signals to your team.'}</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {mode === 'register' && (
            <div className="field">
              <label htmlFor="name">Full name</label>
              <input
                id="name"
                name="name"
                type="text"
                placeholder="Priya Sharma"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required={mode === 'register'}
              />
            </div>
          )}

          <div className="field">
            <label htmlFor="email">Work email</label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              required
            />
          </div>

          {error && <div className="auth-alert error">{error}</div>}
          {message && <div className="auth-alert success">{message}</div>}

          <button type="submit" className="auth-submit" disabled={loading}>
            {loading ? 'Working...' : mode === 'login' ? 'Login' : 'Register & Sign in'}
          </button>

          <div className="auth-switch">
            {mode === 'login' ? (
              <>
                Need an account?{' '}
                <button type="button" onClick={() => switchMode('register')} className="linkish">
                  Register
                </button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <button type="button" onClick={() => switchMode('login')} className="linkish">
                  Login
                </button>
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
