import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function AuthPage({ mode }) {
  const { authAction } = useAuth();
  const navigate = useNavigate();
  const isLogin = mode === 'login';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setError('Некорректный email');
    if (password.length < 6) return setError('Пароль мин. 6 символов');
    setLoading(true);
    try {
      await authAction(isLogin ? '/login' : '/register', email.toLowerCase(), password);
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>{isLogin ? 'Вход в аккаунт' : 'Регистрация'}</h2>
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>Email *</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div className="field">
            <label>Пароль *</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          {error && <div className="auth-error">{error}</div>}
          <button type="submit" className="btn btn-primary full-width" disabled={loading}>
            {loading ? 'Обработка...' : (isLogin ? 'Войти' : 'Создать аккаунт')}
          </button>
        </form>
        <button className="auth-toggle" onClick={() => navigate(isLogin ? '/register' : '/login')}>
          {isLogin ? 'Нет аккаунта? Зарегистрироваться' : 'Уже есть аккаунт? Войти'}
        </button>
      </div>
    </div>
  );
}