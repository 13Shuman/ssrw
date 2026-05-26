import { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchAPI } from '../api/client';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const checkSession = async () => {
      try {
        await fetchAPI('/snippets?page=1&limit=1');
        const savedEmail = localStorage.getItem('user_email');
        if (savedEmail) setUser({ email: savedEmail });
      } catch {
        localStorage.removeItem('user_email');
        setUser(null);
      } finally { setLoading(false); }
    };
    checkSession();
  }, []);

  const authAction = async (endpoint, email, password) => {
    const res = await fetchAPI(endpoint, {
      method: 'POST',
      body: JSON.stringify({ email: email.toLowerCase(), password })
    });
    localStorage.setItem('user_email', res.email || email);
    setUser({ email: res.email || email });
    navigate('/', { replace: true });
  };

  const logout = async () => {
    try { await fetchAPI('/logout', { method: 'POST' }); } catch {}
    localStorage.removeItem('user_email');
    setUser(null);
    navigate('/login', { replace: true });
  };

  if (loading) return <div className="loader">Загрузка...</div>;

  return (
    <AuthContext.Provider value={{ user, authAction, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);