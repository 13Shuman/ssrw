import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastContainer, useToast } from './components/Toast';
import Header from './components/Header';
import AuthPage from './pages/AuthPage';
import HomePage from './pages/HomePage';
import DetailPage from './pages/DetailPage';
import FormPage from './pages/FormPage';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

export default function App() {
  const { toasts, addToast } = useToast();
  return (
    <ThemeProvider>
      <AuthProvider>
        <div className="app">
          <Header />
          <Routes>
            <Route path="/login" element={<AuthPage mode="login" />} />
            <Route path="/register" element={<AuthPage mode="register" />} />
            <Route path="/" element={<ProtectedRoute><HomePage addToast={addToast} /></ProtectedRoute>} />
            <Route path="/snippet/:username/:id" element={<DetailPage addToast={addToast} />} />
            <Route path="/snippet/:username/:id/edit" element={<ProtectedRoute><FormPage /></ProtectedRoute>} />
            <Route path="/new" element={<ProtectedRoute><FormPage /></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <ToastContainer toasts={toasts} />
        </div>
      </AuthProvider>
    </ThemeProvider>
  );
}