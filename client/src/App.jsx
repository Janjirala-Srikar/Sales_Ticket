import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import './App.css';
import LandingPage from './LandingPage';
import AuthPage from './components/LoginRegister/AuthPage';
import Dashboard from './components/dashboard/Dashboard';
import { AuthProvider, useAuth } from './context/AuthContext';

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<AuthPage defaultMode="login" />} />
      <Route path="/register" element={<AuthPage defaultMode="register" />} />
      <Route
        path="/dashboard/*"
        element={(
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        )}
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
